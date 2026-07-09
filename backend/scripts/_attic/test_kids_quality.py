"""Banco de calidad - kids, VIEJO vs NUEVO con manzanas de calidad (no de cartón).
coach = Gemini (modelo real de prod) corriendo el prompt del motor (viejo o nuevo)
alumno = modelo grande de Ollama (independiente: ni Claude ni Gemini)
juez   = Claude (especialista SLA)
Mismo tópico en los dos motores (puente legacy_topic_id). Promedia N corridas.

Uso: python scripts/test_kids_quality.py
"""
from __future__ import annotations
import asyncio
import json
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
import httpx  # noqa: E402
from services import motor_engine, motor_protocol as mp  # noqa: E402
from services.super_prompt import build_super_prompt  # noqa: E402

_KEY = open(os.path.join(os.path.dirname(__file__), "..", ".ollama_key")).read().strip()
STUDENT_MODELS = ["gpt-oss:120b"]   # alumno de calidad, independiente (se pueden sumar más)
BAND_TO_AGEGROUP = {"early_child": "mini", "child": "junior", "teen": "tween"}
EXCHANGES = 3
RUNS = 2

PROFILES = [
    {"band": "early_child", "level": "A1", "match": "familia",
     "who": "un nene de 5 años, principiante (A1), casi todo en español, dice 1-2 palabras en inglés con esfuerzo, a veces se distrae"},
    {"band": "child", "level": "A2", "match": "escuela",
     "who": "un nene de 8 años (A2): frases cortas, entusiasta, mezcla español si se traba, con errores reales de su nivel"},
]
_RUBRIC = ("SOS ESPECIALISTA SLA. Evalua NATURALIDAD/magia, filtro afectivo, i+1, reciclado, recast. "
           "NO penalices cobertura de vocab.")


async def _ollama(prompt: str, model: str, tries: int = 3) -> str:
    body = {"model": model, "messages": [{"role": "user", "content": prompt}], "stream": False}
    for _ in range(tries):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                r = await c.post("https://ollama.com/api/chat",
                                 headers={"Authorization": f"Bearer {_KEY}"}, json=body)
                d = r.json()
                if "message" in d:
                    return d["message"]["content"]
        except Exception:
            pass
        await asyncio.sleep(5)
    return "(sin respuesta)"


async def _coach_turn(engine_prompt, history):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (engine_prompt + "\n\n--- CONVERSACIÓN HASTA AHORA ---\n" + (convo or "(vacía, empezás vos)")
         + "\n\nRespondé SOLO tu próximo turno como EL PROFE (breve, 1-3 oraciones, sin acotaciones):")
    return ((await mp._gemini(p)) or "(sin respuesta)").strip().replace("\n", " ")[:400]


async def _student_turn(who, theme, history, model):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (f"Sos {who}. Estás en una clase de inglés sobre '{theme}'. Respondé como ese alumno REAL, "
         "con los errores de tu nivel, sin hacer de profe, NUNCA te corrijas.\n\n--- CONVERSACIÓN ---\n"
         + convo + "\n\nRespondé SOLO tu próximo turno como EL ALUMNO (1-2 oraciones cortas):")
    return (await _ollama(p, model)).strip().replace("\n", " ")[:300]


async def _one_class(engine_prompt, who, theme, model):
    h = [("Profe", await _coach_turn(engine_prompt, []))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _student_turn(who, theme, h, model)))
        h.append(("Profe", await _coach_turn(engine_prompt, h)))
    return [{"who": w, "text": t} for w, t in h]


async def _judge(level, title, conv):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    raw = await mp._claude_headless(f"{_RUBRIC}\nClase ({level}) sobre '{title}'.\n{convo}\n\n"
                                    'Devolve SOLO JSON: {"score":1-10,"verdict":"1-2 frases"}')
    return mp._parse_json(raw or "") or {"score": None}


def _jload(v):
    if isinstance(v, (list, dict)):
        return v
    try:
        return json.loads(v) if v else v
    except Exception:
        return v


def _composer_prompt(db, age_group, cefr, legacy_topic_id):
    """Prompt del motor VIEJO (composer_proto), in-process."""
    t = db.q1("SELECT id, title, keywords, pinned_vocabulary, generated_vocab FROM topics WHERE id=%s", (legacy_topic_id,))
    if not t:
        return None
    topic = SimpleNamespace(id=t["id"], title=t["title"], keywords=_jload(t["keywords"]),
                            pinned_vocabulary=_jload(t["pinned_vocabulary"]), generated_vocab=_jload(t["generated_vocab"]))
    std = db.q1("SELECT * FROM student_types WHERE slug=%s AND active=1", (age_group,))
    lv = db.q1("SELECT * FROM levels WHERE code=%s", (cefr,))
    if not std or not lv:
        return None
    user = SimpleNamespace(nombre="Test", cefr_level=cefr, age_group=age_group, base_language="es", target_language="en")
    try:
        return build_super_prompt(user=user, topic=topic, student_type_data=std, level_data=lv, app_config=None, learner_state=None)
    except Exception:
        return None


def _avg(items):
    ss = [x.get("score") for x in items if isinstance(x.get("score"), (int, float))]
    return round(sum(ss) / len(ss), 1) if ss else None


async def main():
    db = motor_engine._connect()
    results = []
    for pr in PROFILES:
        ag = BAND_TO_AGEGROUP[pr["band"]]
        trow = db.q1("""SELECT t.topic_id, t.title, t.legacy_topic_id FROM topic t
                        JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id JOIN age_band ab ON ab.band_id=tsb.band_id
                        WHERE ab.code=%s AND t.origin='kids_personal' AND t.title LIKE %s LIMIT 1""",
                     (pr["band"], f"%{pr['match']}%"))
        v3_tid, title, legacy = trow["topic_id"], trow["title"], trow["legacy_topic_id"]
        new_prompt = (await motor_engine.resolve(pr["band"], pr["level"], v3_tid, None, None))["prompt"]
        old_prompt = _composer_prompt(db, ag, pr["level"], legacy)

        for model in STUDENT_MODELS:
            print(f"\n=== {pr['band']} {pr['level']} · {title} · alumno={model} ===")
            new_evals, old_evals = [], []
            for _ in range(RUNS):
                new_evals.append(await _judge(pr["level"], title, await _one_class(new_prompt, pr["who"], title, model)))
                if old_prompt:
                    old_evals.append(await _judge(pr["level"], title, await _one_class(old_prompt, pr["who"], title, model)))
            an, ao = _avg(new_evals), _avg(old_evals)
            print(f"  NUEVO={an}   VIEJO={ao}")
            results.append({"band": pr["band"], "level": pr["level"], "title": title, "student": model,
                            "new": an, "old": ao, "new_evals": new_evals, "old_evals": old_evals})

    with db.conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS kids_quality_result (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            data LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
        cur.execute("INSERT INTO kids_quality_result (data) VALUES (%s)", (json.dumps({"results": results}, ensure_ascii=False),))
    db.conn.commit()
    print("\n-------- RESUMEN (coach Gemini · alumno Ollama · juez Claude) --------")
    for r in results:
        print(f"  {r['band']:>11} {r['level']} · {r['title'][:18]:<18} [{r['student']}]  NUEVO={r['new']}  VIEJO={r['old']}")
    db.conn.close()


if __name__ == "__main__":
    asyncio.run(main())

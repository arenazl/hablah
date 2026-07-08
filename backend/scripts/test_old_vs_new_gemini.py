"""1 clase: VIEJO vs NUEVO, los dos con el cocinero REAL (Gemini de coach).
alumno = Ollama (gpt-oss:120b) · juez = Claude · 1 clase c/u (sin evolución).
Coach con contrato forzado {tts} (texto hablado limpio). Mismo tópico (legacy_topic_id).
Transcripciones a docs/multi-llm-v3/_VIEJO_vs_NUEVO_gemini.md

Uso: GEMINI_API_KEY=... python scripts/test_old_vs_new_gemini.py
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

_OKEY = open(os.path.join(os.path.dirname(__file__), "..", ".ollama_key")).read().strip()
_GKEY = os.environ.get("GEMINI_API_KEY", "")
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "multi-llm-v3"))
os.makedirs(OUT, exist_ok=True)
MODEL = "gpt-oss:120b"
EXCHANGES = 3
WHO = "un nene de 5 años (A1), casi todo en español, dice 1-2 palabras en inglés con esfuerzo, a veces se distrae"
_SCHEMA = {"type": "object", "properties": {"tts": {"type": "string"}}, "required": ["tts"]}
_RUBRIC = ("SOS ESPECIALISTA SLA. Evalua SOLO lo que el nene OYE (la voz del profe). Naturalidad, filtro afectivo, "
           "i+1, reciclado, recast, anti-TPR-robótico.")


async def _coach(engine_prompt, history):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (engine_prompt + "\n\n--- CONVERSACIÓN ---\n" + (convo or "(vacía, empezás vos)")
         + "\n\nDevolvé `tts`: SOLO lo que el PROFE dice en voz (limpio, sin emojis), 1-3 oraciones, tu próximo turno:")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={_GKEY}"
    body = {"contents": [{"parts": [{"text": p}]}],
            "generationConfig": {"responseMimeType": "application/json", "responseSchema": _SCHEMA}}
    for _ in range(3):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                d = (await c.post(url, json=body)).json()
            return json.loads(d["candidates"][0]["content"]["parts"][0]["text"])["tts"].strip()[:400]
        except Exception:
            await asyncio.sleep(4)
    return "(sin respuesta)"


async def _student(history, theme):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (f"Sos {WHO}. Clase de inglés sobre '{theme}'. Respondé como ese alumno REAL con tus errores, NUNCA te corrijas."
         f"\n\n--- CONVERSACIÓN ---\n{convo}\n\nSOLO tu próximo turno como ALUMNO (1-2 oraciones):")
    body = {"model": MODEL, "messages": [{"role": "user", "content": p}], "stream": False}
    for _ in range(3):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                d = (await c.post("https://ollama.com/api/chat", headers={"Authorization": f"Bearer {_OKEY}"}, json=body)).json()
            return d["message"]["content"].strip().replace("\n", " ")[:300]
        except Exception:
            await asyncio.sleep(4)
    return "(sin respuesta)"


async def _one_class(prompt, theme):
    h = [("Profe", await _coach(prompt, []))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _student(h, theme)))
        h.append(("Profe", await _coach(prompt, h)))
    return [{"who": w, "text": t} for w, t in h]


async def _judge(title, conv):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    raw = await mp._claude_headless(f"{_RUBRIC}\nClase early_child A1 sobre '{title}'.\n{convo}\n\n"
                                    'SOLO JSON: {"score":1-10,"verdict":"1-2 frases"}')
    return mp._parse_json(raw or "") or {"score": None, "verdict": "(no eval)"}


def _jload(v):
    try:
        return json.loads(v) if isinstance(v, str) and v.strip() else v
    except Exception:
        return v


def _old_prompt(db, legacy_id):
    t = db.q1("SELECT id, title, keywords, pinned_vocabulary, generated_vocab FROM topics WHERE id=%s", (legacy_id,))
    topic = SimpleNamespace(id=t["id"], title=t["title"], keywords=_jload(t["keywords"]),
                            pinned_vocabulary=_jload(t["pinned_vocabulary"]), generated_vocab=_jload(t["generated_vocab"]))
    std = db.q1("SELECT * FROM student_types WHERE slug='mini' AND active=1")
    lv = db.q1("SELECT * FROM levels WHERE code='A1'")
    user = SimpleNamespace(nombre="Test", cefr_level="A1", age_group="mini", base_language="es", target_language="en")
    return build_super_prompt(user=user, topic=topic, student_type_data=std, level_data=lv, app_config=None, learner_state=None)


def _md(title, ev_new, conv_new, ev_old, conv_old):
    def block(name, ev, conv):
        out = [f"## {name} — score {ev.get('score')}"]
        for t in conv:
            out.append(f"- **{t['who']}**: {t['text']}" if t["who"] == "Profe" else f"- {t['who']}: {t['text']}")
        out.append(f"\n> juez: {ev.get('verdict','')}\n")
        return out
    L = [f"# VIEJO vs NUEVO · early_child A1 · {title}", "coach = Gemini (real) · alumno = gpt-oss:120b · juez = Claude", ""]
    L += block("NUEVO (motor_v3)", ev_new, conv_new) + block("VIEJO (composer_proto)", ev_old, conv_old)
    with open(os.path.join(OUT, "_VIEJO_vs_NUEVO_gemini.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))


async def main():
    db = motor_engine._connect()
    tr = db.q1("SELECT topic_id, title, legacy_topic_id FROM topic WHERE origin='kids_personal' AND title LIKE %s LIMIT 1", ("%familia%",))
    v3_tid, title, legacy = tr["topic_id"], tr["title"], tr["legacy_topic_id"]
    new_prompt = (await motor_engine.resolve("early_child", "A1", v3_tid, None, None))["prompt"]
    old_prompt = _old_prompt(db, legacy)
    db.conn.close()

    print(f"1 clase c/u · {title} · coach=Gemini · alumno={MODEL}")
    conv_new = await _one_class(new_prompt, title)
    ev_new = await _judge(title, conv_new)
    conv_old = await _one_class(old_prompt, title)
    ev_old = await _judge(title, conv_old)
    _md(title, ev_new, conv_new, ev_old, conv_old)
    print(f"  NUEVO (motor_v3)     score = {ev_new.get('score')}  — {(ev_new.get('verdict') or '')[:120]}")
    print(f"  VIEJO (composer_proto) score = {ev_old.get('score')}  — {(ev_old.get('verdict') or '')[:120]}")
    print("transcripción en docs/multi-llm-v3/_VIEJO_vs_NUEVO_gemini.md")


if __name__ == "__main__":
    asyncio.run(main())

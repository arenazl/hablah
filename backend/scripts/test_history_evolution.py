"""Muestra de EVOLUCION del learned_state: por perfil, 4 clases con historia creciente
(h0 -> h1 -> h2 -> h3). Entre clases corre el post-clase (derive_outcomes + train_apply)
que sube la escalera SRS del alumno; la clase siguiente LA LEE (resolve con student_id).
Asi vemos si la clase evoluciona con la historia.

Coach = Gemini Flash-lite (REAL, contrato {tts}) · alumno = Ollama gpt-oss · juez = Claude.
Alumno = fila real en student (motor_v3), reseteada a historia=0 al arrancar (reversible).

Uso: GEMINI_API_KEY=... python scripts/test_history_evolution.py
"""
from __future__ import annotations
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
import httpx  # noqa: E402
from services import motor_engine, motor_protocol as mp  # noqa: E402

_OKEY = open(os.path.join(os.path.dirname(__file__), "..", ".ollama_key")).read().strip()
_GKEY = os.environ.get("GEMINI_API_KEY", "")
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "multi-llm-v3"))
MODEL_COACH = "gemini-3.1-flash-lite-preview"
MODEL_STUDENT = "gpt-oss:120b"
CLASSES = 4          # historia 0,1,2,3
EXCHANGES = 3
CONCURRENCY = 4
_SCHEMA = {"type": "object", "properties": {"tts": {"type": "string"}}, "required": ["tts"]}

# (band, level, theme, who) — un perfil por banda
PROFILES = [
    ("early_child", "A1", "familia", "un nene de 5 (A1), casi todo en espanol, 1-2 palabras en ingles"),
    ("child",       "A2", "casa",    "un nene de 9 (A2), frases cortas, mezcla espanol, con errores"),
    ("teen",        "B1", "viajes",  "un chico de 13 (B1), frases mas largas, errores de gramatica"),
    ("adult",       "B1", "trabajo", "un adulto (B1) que mejora ingles para el trabajo, errores y dudas"),
]


async def _coach(prompt, history):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (prompt + "\n\n--- CONVERSACION ---\n" + (convo or "(vacia, empezas vos)")
         + "\n\nDevolve `tts`: SOLO lo que el PROFE dice en voz (limpio, sin emojis), 1-3 oraciones, tu proximo turno:")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_COACH}:generateContent?key={_GKEY}"
    body = {"contents": [{"parts": [{"text": p}]}],
            "generationConfig": {"responseMimeType": "application/json", "responseSchema": _SCHEMA}}
    for _ in range(4):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                d = (await c.post(url, json=body)).json()
            return json.loads(d["candidates"][0]["content"]["parts"][0]["text"])["tts"].strip()[:400]
        except Exception:
            await asyncio.sleep(5)
    return "(sin respuesta)"


async def _student(history, theme, who):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (f"Sos {who}. Clase de ingles sobre '{theme}'. Responde como ese alumno REAL con tus errores, NUNCA te corrijas."
         f"\n\n--- CONVERSACION ---\n{convo}\n\nSOLO tu proximo turno como ALUMNO (1-2 oraciones):")
    body = {"model": MODEL_STUDENT, "messages": [{"role": "user", "content": p}], "stream": False}
    for _ in range(4):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                d = (await c.post("https://ollama.com/api/chat", headers={"Authorization": f"Bearer {_OKEY}"}, json=body)).json()
            return d["message"]["content"].strip().replace("\n", " ")[:300]
        except Exception:
            await asyncio.sleep(5)
    return "(sin respuesta)"


async def _one_class(prompt, theme, who):
    h = [("Profe", await _coach(prompt, []))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _student(h, theme, who)))
        h.append(("Profe", await _coach(prompt, h)))
    return [{"who": w, "text": t} for w, t in h]


async def _judge(band, level, title, conv, hist_n):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    prompt = (
        "SOS ESPECIALISTA SLA. Evalua SOLO lo que el alumno OYE (naturalidad, filtro afectivo, i+1, reciclado, recast). "
        f"Esta es la clase nro {hist_n + 1} del alumno (tiene {hist_n} clases de historia previa en su learned_state).\n"
        f"Clase {band} {level} sobre '{title}'.\n{convo}\n\n"
        'SOLO JSON: {"score":1-10,"verdict":"1-2 frases","continuity":"si el profe retoma/recicla algo de clases previas o trata al alumno como conocido: si/no + como"}')
    return mp._parse_json((await mp._claude_headless(prompt, timeout=90)) or "") or {"score": None}


async def _derive_outcomes(db, level, conv):
    objs = db.q("SELECT objective_id, code, description FROM language_objective WHERE cefr_level=%s ORDER BY sort_order", (level,))
    if not objs:
        return {"objectives": [], "items": []}
    listado = "\n".join(f'{o["objective_id"]}\t{o["code"]}\t{o["description"]}' for o in objs)
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    prompt = (
        "Sos evaluador SLA. De la TRANSCRIPCION, deci QUE objetivos de la lista se practicaron y con que desempenio "
        "(good/partial/fail). Ignora los que no aparecieron.\n"
        f"OBJETIVOS (id, code, desc):\n{listado}\n\nTRANSCRIPCION:\n{convo}\n\n"
        'SOLO JSON: {"objectives":[{"id":12,"score":"good"}],"items":[{"type":"word","value":"although","score":"partial"}],"errors":["..."]}')
    parsed = mp._parse_json((await mp._claude_headless(prompt, timeout=90)) or "") or {}
    valid = {o["objective_id"] for o in objs}
    objectives = [(int(o["id"]), o["score"]) for o in parsed.get("objectives", [])
                  if o.get("id") in valid and o.get("score") in ("good", "partial", "fail")]
    ALLOWED = {"word", "phrase", "error"}
    items = []
    for it in parsed.get("items", []):
        if not it.get("value"):
            continue
        typ = it.get("type") if it.get("type") in ALLOWED else "word"
        sc = it.get("score") if it.get("score") in ("good", "partial", "fail") else "partial"
        items.append((typ, str(it["value"])[:110], sc))
    items += [("error", str(e)[:110], "fail") for e in parsed.get("errors", []) if e]
    return {"objectives": objectives, "items": items}


def _ensure_student(db, band, level, topic_id):
    key = f"h_{band[:3]}_{level}_{topic_id}"[:20]
    row = db.q1("SELECT student_id FROM student WHERE profile_key=%s", (key,))
    if row:
        sid = row["student_id"]
    else:
        with db.conn.cursor() as cur:
            cur.execute("INSERT INTO student (name, profile_key, age, level_code) VALUES (%s,%s,%s,%s)",
                        (f"Hist {band} {level}", key, 20, level))
            sid = cur.lastrowid
        db.conn.commit()
    with db.conn.cursor() as cur:
        cur.execute("DELETE FROM learner_objective WHERE student_id=%s", (sid,))
        cur.execute("DELETE FROM learner_item WHERE student_id=%s", (sid,))
    db.conn.commit()
    return sid


def _history_size(db, sid):
    db.conn.commit()
    o = db.q1("SELECT COUNT(*) c FROM learner_objective WHERE student_id=%s", (sid,))
    it = db.q1("SELECT COUNT(*) c FROM learner_item WHERE student_id=%s", (sid,))
    return o["c"], it["c"]


def _pick(db, band, match):
    for q, p in [
        ("""SELECT t.topic_id, t.title FROM topic t WHERE t.origin='kids_personal' AND t.title LIKE %s
            AND t.topic_id IN (SELECT topic_id FROM topic_suggested_band tsb JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s) LIMIT 1""", (f"%{match}%", band)),
        ("""SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
            JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s AND t.title LIKE %s LIMIT 1""", (band, f"%{match}%")),
        ("""SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
            JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s LIMIT 1""", (band,)),
    ]:
        r = db.q1(q, p)
        if r:
            return (r["topic_id"], r["title"])
    return (None, match)


async def run_sequence(db, band, level, theme, who, sem):
    async with sem:
        tid, title = _pick(db, band, theme)
        if not tid:
            return {"band": band, "level": level, "error": "sin topico"}
        sid = _ensure_student(db, band, level, tid)
        classes = []
        for ci in range(CLASSES):
            ho, hi = _history_size(db, sid)
            prompt = (await motor_engine.resolve(band, level, tid, sid, None))["prompt"]
            conv = await _one_class(prompt, title, who)
            ev = await _judge(band, level, title, conv, ci)
            classes.append({"hist": ci, "hist_obj": ho, "hist_items": hi, "score": ev.get("score"),
                            "verdict": ev.get("verdict"), "continuity": ev.get("continuity"), "conv": conv})
            print(f"  {band:>11} {level} h{ci} (obj={ho},it={hi}) score={ev.get('score')} | cont={str(ev.get('continuity'))[:50]}")
            if ci < CLASSES - 1:
                await motor_engine.train_apply(sid, await _derive_outcomes(db, level, conv))
        return {"band": band, "level": level, "title": title, "student_id": sid,
                "scores": [c["score"] for c in classes], "classes": classes}


async def main():
    db = motor_engine._connect()
    sem = asyncio.Semaphore(CONCURRENCY)
    print(f"EVOLUCION learned_state · {len(PROFILES)} perfiles x {CLASSES} clases (h0-h3) · coach Gemini real")
    results = await asyncio.gather(*[run_sequence(db, b, l, t, w, sem) for b, l, t, w in PROFILES])
    # reporte
    L = ["# Evolucion learned_state (history 0-3) · coach Gemini Flash-lite", ""]
    for r in results:
        if r.get("error"):
            L += [f"## {r['band']} {r['level']} — {r['error']}", ""]; continue
        L += [f"## {r['band']} {r['level']} · {r['title']} — scores {r['scores']}"]
        for c in r["classes"]:
            L += [f"### h{c['hist']} (learned_state: obj={c['hist_obj']}, items={c['hist_items']}) — score {c['score']}",
                  f"- continuidad: {c.get('continuity')}", f"- juez: {c.get('verdict')}"]
            L += [(f"  - **{t['who']}**: {t['text']}" if t["who"] == "Profe" else f"  - {t['who']}: {t['text']}") for t in c["conv"]]
            L += [""]
    open(os.path.join(OUT, "_EVOLUCION_history.md"), "w", encoding="utf-8").write("\n".join(L))
    print("\n=== RESUMEN (score h0->h1->h2->h3) ===")
    for r in results:
        if not r.get("error"):
            print(f"  {r['band']:>11} {r['level']}: {r['scores']}")
    print("\ntranscripciones en docs/multi-llm-v3/_EVOLUCION_history.md")
    db.conn.close()


if __name__ == "__main__":
    asyncio.run(main())

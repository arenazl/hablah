"""Spot-check del fix de pedagogía en varios perfiles kids (no solo early_child A1).
1 clase c/u, coach = Flash-lite (fiel a prod), alumno = gpt-oss:120b, juez = Claude.
Sirve para ver si el fix GENERALIZA o si child/teen (pedagogía de banda NO tocada)
necesitan su propio arreglo.

Uso: GEMINI_API_KEY=... python scripts/test_kids_spotcheck.py
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
EXCHANGES = 3
_SCHEMA = {"type": "object", "properties": {"tts": {"type": "string"}}, "required": ["tts"]}
_RUBRIC = ("SOS ESPECIALISTA SLA. Evalua SOLO lo que el alumno OYE. Naturalidad, filtro afectivo, i+1, "
           "reciclado, recast, anti-TPR-robótico.")

PROFILES = [
    ("early_child", "A1", "familia", "un nene de 5 (A1), casi todo en español, 1-2 palabras en inglés"),
    ("child",       "A2", "casa",    "un nene de 9 (A2), frases cortas, mezcla español, con errores"),
    ("teen",        "B1", "viajes",  "un chico de 13 (B1), frases más largas, se frustra si no le sale"),
    ("adult",       "B1", "trabajo", "un adulto (B1) que mejora inglés para el trabajo, comete errores y a veces duda"),
]


async def _coach(prompt, history):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (prompt + "\n\n--- CONVERSACIÓN ---\n" + (convo or "(vacía, empezás vos)")
         + "\n\nDevolvé `tts`: SOLO lo que el PROFE dice en voz (limpio), 1-3 oraciones, tu próximo turno:")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_COACH}:generateContent?key={_GKEY}"
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


async def _student(history, theme, who):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (f"Sos {who}. Clase de inglés sobre '{theme}'. Respondé como ese alumno REAL con tus errores, NUNCA te corrijas."
         f"\n\n--- CONVERSACIÓN ---\n{convo}\n\nSOLO tu próximo turno como ALUMNO (1-2 oraciones):")
    body = {"model": MODEL_STUDENT, "messages": [{"role": "user", "content": p}], "stream": False}
    for _ in range(3):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                d = (await c.post("https://ollama.com/api/chat", headers={"Authorization": f"Bearer {_OKEY}"}, json=body)).json()
            return d["message"]["content"].strip().replace("\n", " ")[:300]
        except Exception:
            await asyncio.sleep(4)
    return "(sin respuesta)"


async def _one_class(prompt, theme, who):
    h = [("Profe", await _coach(prompt, []))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _student(h, theme, who)))
        h.append(("Profe", await _coach(prompt, h)))
    return [{"who": w, "text": t} for w, t in h]


async def _judge(band, level, title, conv):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    raw = await mp._claude_headless(f"{_RUBRIC}\nClase {band} {level} sobre '{title}'.\n{convo}\n\n"
                                    'SOLO JSON: {"score":1-10,"verdict":"1-2 frases"}')
    return mp._parse_json(raw or "") or {"score": None, "verdict": "(no eval)"}


def _pick(db, band, match):
    # 1) kids_personal del tópico (kids) | 2) cualquier tópico de la banda que matchee | 3) cualquiera de la banda
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


async def main():
    db = motor_engine._connect()
    results = []
    for band, level, match, who in PROFILES:
        tid, title = _pick(db, band, match)
        if not tid:
            print(f"  {band} {level}: sin tópico"); continue
        prompt = (await motor_engine.resolve(band, level, tid, None, None))["prompt"]
        conv = await _one_class(prompt, title, who)
        ev = await _judge(band, level, title, conv)
        results.append({"band": band, "level": level, "title": title, "score": ev.get("score"),
                        "verdict": ev.get("verdict"), "conv": conv})
        print(f"  {band:>11} {level} · {title[:18]:<18} score = {ev.get('score')}  — {(ev.get('verdict') or '')[:100]}")

    # transcripts
    L = ["# Spot-check fix pedagogía kids (coach Flash-lite)", ""]
    for r in results:
        L += [f"## {r['band']} {r['level']} · {r['title']} — score {r['score']}"]
        L += [(f"- **{t['who']}**: {t['text']}" if t["who"] == "Profe" else f"- {t['who']}: {t['text']}") for t in r["conv"]]
        L += [f"\n> juez: {r.get('verdict','')}\n"]
    open(os.path.join(OUT, "_SPOTCHECK_kids.md"), "w", encoding="utf-8").write("\n".join(L))
    print("\ntranscripciones en docs/multi-llm-v3/_SPOTCHECK_kids.md")
    db.conn.close()


if __name__ == "__main__":
    asyncio.run(main())

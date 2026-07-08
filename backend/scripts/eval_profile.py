"""Genera N transcripciones de clase para UN perfil (band, level, theme), con el coach
REAL (Gemini Flash-lite) + alumno Ollama. NO juzga: escribe las transcripciones a un JSON
para que un juez (Claude) las evalúe aparte. Las N clases corren en paralelo (asyncio).

Uso: GEMINI_API_KEY=... python scripts/eval_profile.py <band> <level> <theme> "<who>" [N]
Imprime: la ruta del JSON + un resumen corto.
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
from services import motor_engine  # noqa: E402

_OKEY = open(os.path.join(os.path.dirname(__file__), "..", ".ollama_key")).read().strip()
_GKEY = os.environ.get("GEMINI_API_KEY", "")
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "multi-llm-v3"))
MODEL_COACH = "gemini-3.1-flash-lite-preview"
MODEL_STUDENT = "gpt-oss:120b"
EXCHANGES = 3
_SCHEMA = {"type": "object", "properties": {"tts": {"type": "string"}}, "required": ["tts"]}


async def _coach(prompt, history):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (prompt + "\n\n--- CONVERSACIÓN ---\n" + (convo or "(vacía, empezás vos)")
         + "\n\nDevolvé `tts`: SOLO lo que el PROFE dice en voz (limpio, sin emojis), 1-3 oraciones, tu próximo turno:")
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
    p = (f"Sos {who}. Clase de inglés sobre '{theme}'. Respondé como ese alumno REAL con tus errores, NUNCA te corrijas."
         f"\n\n--- CONVERSACIÓN ---\n{convo}\n\nSOLO tu próximo turno como ALUMNO (1-2 oraciones):")
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


async def main():
    band, level, theme, who = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    n = int(sys.argv[5]) if len(sys.argv) > 5 else 3
    db = motor_engine._connect()
    tid, title = _pick(db, band, theme)
    if not tid:
        print(json.dumps({"error": f"sin tópico {band}/{theme}"})); return
    prompt = (await motor_engine.resolve(band, level, tid, None, None))["prompt"]
    db.conn.close()
    classes = await asyncio.gather(*[_one_class(prompt, title, who) for _ in range(n)])
    path = os.path.join(OUT, f"_eval_{band}_{level}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"band": band, "level": level, "title": title, "who": who, "transcripts": classes}, f, ensure_ascii=False, indent=1)
    print(f"OK {band} {level} · {title} · {n} clases -> {path}")


if __name__ == "__main__":
    asyncio.run(main())

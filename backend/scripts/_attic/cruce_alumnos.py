"""CRUCE DE ALUMNOS (random de alumnos del handoff §0.5) — separa la señal del COACH
del ruido del ALUMNO simulado.

Para UN perfil pedagógico (band, level, theme) corre el MISMO coach (Gemini flash-lite, el
de prod) contra la grilla MODELO x PERSONA:
  - MODELO  = 5 LLM de familias distintas (Ollama Cloud) -> cancela el sesgo de un modelo puntual.
  - PERSONA = 4 temperamentos de la vida real (trabado/fluido/quedado/crack) -> realismo.
La persona modula el TEMPERAMENTO; el nivel fija el TECHO lingüistico (un A1 'crack' sigue siendo A1).

Ollama Cloud (free tier) rebota concurrencia con 429 -> las llamadas al ALUMNO van SERIALIZADAS
(semaforo global + backoff). El coach (Gemini) sí va en paralelo. Esto evita el 'alumno mudo por
infra' que arruinaba las corridas viejas (CONCURRENCY=4 contra una cuenta que aguanta ~1-2).

NO juzga: vuelca las transcripciones + metricas de produccion a un JSON para que el juez (Claude
especialista SLA) las puntue aparte.

Uso: GEMINI_API_KEY=... python scripts/cruce_alumnos.py <band> <level> <theme>
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
MODEL_COACH = "gemini-3.1-flash-lite-preview"   # FIX: el de prod (no gemini-2.5-flash)
EXCHANGES = 3
_SCHEMA = {"type": "object", "properties": {"tts": {"type": "string"}}, "required": ["tts"]}

# 5 modelos de alumno, uno por familia (verificados con _probe_students.py --seq)
STUDENT_MODELS = ["gpt-oss:120b", "qwen3-coder:480b", "gemma3:27b", "nemotron-3-nano:30b", "minimax-m3"]

# 4 personas: temperamento, NO nivel. El techo lo fija el `who` base del perfil.
PERSONAS = {
    "trabado":  "MUY tímido y trabado: respondés con 1-2 palabras sueltas, muchos silencios, a veces solo "
                "asentís o repetís una palabra. Te cuesta arrancar. Rara vez una oración completa.",
    "fluido":   "Enganchado y conversador: respondés con ganas, oraciones completas para tu nivel, arriesgás, "
                "agregás detalles personales y a veces preguntás de vuelta.",
    "quedado":  "Distraído y desinflado: respondés poco y sin entusiasmo, a veces te vas de tema o contestás "
                "otra cosa. Hay que tirarte de la lengua.",
    "crack":    "Muy capaz DENTRO DE TU NIVEL: agarrás rápido, casi no necesitás ayuda, producís lo máximo que "
                "tu nivel permite — pero SIN pasarte del techo (si sos A1 no hablás como nativo).",
}

# Ollama serializado: 1 request a la vez (free tier rebota concurrencia)
_OLLAMA_SEM = asyncio.Semaphore(1)


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
            await asyncio.sleep(4)
    return "(sin respuesta)"


async def _student(history, theme, who, persona_desc, model):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (f"Sos {who}.\nTEMPERAMENTO: {persona_desc}\n"
         f"Clase de inglés sobre '{theme}'. Respondé como ese alumno REAL, con los errores de tu nivel y tu "
         f"temperamento. NUNCA te corrijas ni rompas el techo de tu nivel."
         f"\n\n--- CONVERSACIÓN ---\n{convo}\n\nSOLO tu próximo turno como ALUMNO (1-2 oraciones):")
    body = {"model": model, "messages": [{"role": "user", "content": p}], "stream": False}
    # serializado + backoff exponencial para el 429 de Ollama Cloud
    for attempt in range(6):
        async with _OLLAMA_SEM:
            try:
                async with httpx.AsyncClient(timeout=120) as c:
                    r = await c.post("https://ollama.com/api/chat",
                                     headers={"Authorization": f"Bearer {_OKEY}"}, json=body)
                if r.status_code == 200:
                    d = r.json()
                    txt = (d.get("message", {}) or {}).get("content", "")
                    if txt:
                        return txt.strip().replace("\n", " ")[:300]
            except Exception:
                pass
        await asyncio.sleep(2 + attempt * 3)   # 2,5,8,11,14s -> respeta el rate limit
    return "(sin respuesta)"


def _output_metrics(conv):
    """Métricas de producción del alumno para separar 'alumno mudo por infra' del coach."""
    al = [t["text"] for t in conv if t["who"] == "Alumno"]
    sin_resp = sum(1 for t in al if t.strip() == "(sin respuesta)")
    words = sum(len(t.split()) for t in al if t.strip() != "(sin respuesta)")
    return {"alumno_turnos": len(al), "sin_respuesta": sin_resp, "alumno_palabras": words,
            "infra_fail": sin_resp >= 2}   # >=2 turnos sin respuesta = fallo de infra, descartar del promedio


async def _one_class(prompt, theme, who, persona_desc, model):
    h = [("Profe", await _coach(prompt, []))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _student(h, theme, who, persona_desc, model)))
        h.append(("Profe", await _coach(prompt, h)))
    return [{"who": w, "text": t} for w, t in h]


def _pick(db, band, match):
    for q, p in [
        ("""SELECT t.topic_id, t.title FROM topic t WHERE t.title LIKE %s
            AND t.topic_id IN (SELECT topic_id FROM topic_suggested_band tsb JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s) LIMIT 1""", (f"%{match}%", band)),
        ("""SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
            JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s LIMIT 1""", (band,)),
    ]:
        r = db.q1(q, p)
        if r:
            return (r["topic_id"], r["title"])
    return (None, match)


# `who` base por banda+nivel (el TECHO lingüístico; la persona va aparte)
WHO_BASE = {
    ("early_child", "A1"): "un nene de 5 años, nivel A1: casi todo en español, 1-2 palabras en inglés sueltas",
    ("child", "B1"): "un nene de 10-11 años, nivel B1: frases más largas en inglés con errores típicos de su nivel",
    ("adult", "A1"): "un adulto principiante, nivel A1: muy básico, mezcla mucho español, errores de principiante",
}


async def main():
    band, level, theme = sys.argv[1], sys.argv[2], sys.argv[3]
    who = WHO_BASE.get((band, level), f"un alumno de nivel {level}")
    db = motor_engine._connect()
    tid, title = _pick(db, band, theme)
    if not tid:
        print(json.dumps({"error": f"sin tópico {band}/{theme}"})); return
    prompt = (await motor_engine.resolve(band, level, tid, None, None))["prompt"]
    db.conn.close()

    combos = [(m, pk, pd) for m in STUDENT_MODELS for pk, pd in PERSONAS.items()]
    print(f"CRUCE {band} {level} · {title} · {len(STUDENT_MODELS)} modelos × {len(PERSONAS)} personas "
          f"= {len(combos)} clases (coach={MODEL_COACH}, Ollama serializado)")

    async def _run(model, pk, pd):
        conv = await _one_class(prompt, title, who, pd, model)
        m = _output_metrics(conv)
        tag = " [INFRA_FAIL]" if m["infra_fail"] else ""
        print(f"  · {model:<20} {pk:<8} alumno={m['alumno_palabras']:>3}pal sin_resp={m['sin_respuesta']}{tag}")
        return {"model": model, "persona": pk, "metrics": m, "conv": conv}

    cells = await asyncio.gather(*[_run(m, pk, pd) for m, pk, pd in combos])
    path = os.path.join(OUT, f"_cruce_{band}_{level}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"band": band, "level": level, "title": title, "who": who,
                   "models": STUDENT_MODELS, "personas": list(PERSONAS), "cells": cells},
                  f, ensure_ascii=False, indent=1)
    nfail = sum(1 for c in cells if c["metrics"]["infra_fail"])
    print(f"\nOK {len(cells)} clases -> {path}  ({nfail} con INFRA_FAIL a descartar)")


if __name__ == "__main__":
    asyncio.run(main())

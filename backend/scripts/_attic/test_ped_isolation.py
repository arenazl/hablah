"""Aísla el efecto del FIX de pedagogía: mismo modelo (3.1-flash-lite de coach), mismo
tópico, solo cambia el PROMPT. VIEJO = snapshot guardado antes del fix; NUEVO = resolve
actual (post-fix). Alumno gpt-oss:120b, juez Claude. 1 clase c/u. Sin tocar la base.

Uso: GEMINI_API_KEY=... python scripts/test_ped_isolation.py
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
OLD_PROMPT_FILE = os.path.join(OUT, "_ORQUESTACION_early_child_A1_familia.txt")  # snapshot PRE-fix
MODEL_COACH = sys.argv[1] if len(sys.argv) > 1 else "gemini-3.1-flash-lite-preview"
MODEL_STUDENT = "gpt-oss:120b"
EXCHANGES = 3
WHO = "un nene de 5 años (A1), casi todo en español, dice 1-2 palabras en inglés con esfuerzo, a veces se distrae"
_SCHEMA = {"type": "object", "properties": {"tts": {"type": "string"}}, "required": ["tts"]}
_RUBRIC = ("SOS ESPECIALISTA SLA. Evalua SOLO lo que el nene OYE. Naturalidad, filtro afectivo, i+1, "
           "reciclado, recast, anti-TPR-robótico.")


async def _coach(prompt, history):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (prompt + "\n\n--- CONVERSACIÓN ---\n" + (convo or "(vacía, empezás vos)")
         + "\n\nDevolvé `tts`: SOLO lo que el PROFE dice en voz (limpio, sin emojis), 1-3 oraciones, tu próximo turno:")
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


async def _student(history, theme):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (f"Sos {WHO}. Clase de inglés sobre '{theme}'. Respondé como ese alumno REAL con tus errores, NUNCA te corrijas."
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


async def _one_class(prompt, theme):
    h = [("Profe", await _coach(prompt, []))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _student(h, theme)))
        h.append(("Profe", await _coach(prompt, h)))
    return [{"who": w, "text": t} for w, t in h]


async def _judge(conv):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    raw = await mp._claude_headless(f"{_RUBRIC}\nClase early_child A1 sobre 'Mi familia'.\n{convo}\n\n"
                                    'SOLO JSON: {"score":1-10,"verdict":"1-2 frases"}')
    return mp._parse_json(raw or "") or {"score": None, "verdict": "(no eval)"}


def _md(ev_new, conv_new, ev_old, conv_old):
    def blk(name, ev, conv):
        o = [f"## {name} — score {ev.get('score')}"]
        o += [(f"- **{t['who']}**: {t['text']}" if t["who"] == "Profe" else f"- {t['who']}: {t['text']}") for t in conv]
        o += [f"\n> juez: {ev.get('verdict','')}\n"]
        return o
    L = ["# ISOLACIÓN pedagogía · early_child A1 · Mi familia",
         f"mismo modelo ({MODEL_COACH}) y tópico — solo cambia el PROMPT (viejo snapshot vs nuevo post-fix)", ""]
    L += blk("NUEVO prompt (post-fix)", ev_new, conv_new) + blk("VIEJO prompt (pre-fix)", ev_old, conv_old)
    fn = f"_ISOLACION_{MODEL_COACH.replace('/', '-')}.md"
    open(os.path.join(OUT, fn), "w", encoding="utf-8").write("\n".join(L))


async def main():
    old_prompt = open(OLD_PROMPT_FILE, encoding="utf-8").read()
    new_prompt = (await motor_engine.resolve("early_child", "A1", 615, None, None))["prompt"]
    print(f"isolación · coach={MODEL_COACH} · solo cambia el prompt")
    conv_new = await _one_class(new_prompt, "Mi familia")
    ev_new = await _judge(conv_new)
    conv_old = await _one_class(old_prompt, "Mi familia")
    ev_old = await _judge(conv_old)
    _md(ev_new, conv_new, ev_old, conv_old)
    print(f"  PROMPT NUEVO (post-fix)  score = {ev_new.get('score')}  — {(ev_new.get('verdict') or '')[:110]}")
    print(f"  PROMPT VIEJO (pre-fix)   score = {ev_old.get('score')}  — {(ev_old.get('verdict') or '')[:110]}")
    print("transcripción en docs/multi-llm-v3/_ISOLACION_pedagogia.md")


if __name__ == "__main__":
    asyncio.run(main())

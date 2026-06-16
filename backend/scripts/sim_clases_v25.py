"""Simulador de clases en TEXTO (bypass voz) — verifica el motor de 9 pasos end-to-end.

Para cada (segmento, nivel): arma el prompt determinístico con compose_proto_prompt
(datos reales de la BD), lo manda a Gemini como systemInstruction, y simula una clase
de N turnos con un "alumno simulado" (otra llamada Gemini que responde según su nivel).

Sirve para VER que el motor produce prompts coherentes y que el coach respeta los
rieles por edad/nivel — NO certifica calidad pedagógica final (esa es la sesión real).

Uso: python scripts/sim_clases_v25.py [n_casos]   (default: subconjunto de 5)
"""
import asyncio
import os
import sys
import json
from types import SimpleNamespace

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx
from sqlalchemy import select
from core.config import settings
from core.database import AsyncSessionLocal
from models.methodology import StudentType, Level
from models.template import Topic
from services.composer_proto import compose_proto_prompt

MODEL = settings.GEMINI_MODEL
# SIM_GEMINI_KEY: key válida pasada por env (ej traída de heroku) para los tests;
# el .env local puede tener una key vieja/inválida.
_KEY = os.environ.get("SIM_GEMINI_KEY") or settings.GEMINI_API_KEY
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={_KEY}"

AGE = {"mini": 5, "junior": 9, "tween": 14, "adult": 30}

# Casos (segmento, nivel). El subconjunto default cubre los extremos.
ALL_CASES = [
    ("mini", "A0"), ("mini", "A1"), ("junior", "A2"), ("junior", "B1"),
    ("tween", "B1"), ("tween", "B2"), ("adult", "A0"), ("adult", "A2"),
    ("adult", "B2"), ("adult", "C1"),
]

STUDENT_SIM = (
    "Sos {name}, un alumno de inglés de {age} años, nivel CEFR {level}. Un profe te está "
    "dando una clase. Respondé SOLO como ese alumno: 1 frase corta, con el inglés imperfecto "
    "propio de tu nivel (si sos A0/A1 mezclás español y decís pocas palabras en inglés). "
    "Nunca actúes de profe. Solo lo que diría el alumno."
)


async def _gemini(client, system, contents, temp, max_tokens):
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": temp, "maxOutputTokens": max_tokens},
        # Tests internos: el alumno simulado (nene de 5) dispara el safety; lo relajamos.
        "safetySettings": [
            {"category": c, "threshold": "BLOCK_NONE"} for c in (
                "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT",
            )
        ],
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    r = await client.post(URL, json=payload)
    if r.status_code != 200:
        raise RuntimeError(f"Gemini {r.status_code}: {r.text[:600]}")
    data = r.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return f"[sin texto: {json.dumps(data)[:200]}]"


def _st_data(st):
    return {
        "slug": st.slug, "tutor_mascot": st.tutor_mascot, "tutor_identity": st.tutor_identity,
        "tutor_tonal_rules": st.tutor_tonal_rules, "session_focus": st.session_focus,
        "pedagogy": st.pedagogy, "form_rules": st.form_rules,
        "opening_seed": st.opening_seed, "continuation_seed": st.continuation_seed, "closing_seed": st.closing_seed,
    }


def _level_data(lv):
    return {"language_rule": lv.language_rule, "curriculum_grammar": lv.curriculum_grammar,
            "expected_production": lv.expected_production, "duration_base_minutes": lv.duration_base_minutes}


async def sim_case(client, db, seg, lvl, turns=3):
    st = (await db.execute(select(StudentType).where(StudentType.slug == seg))).scalar_one_or_none()
    lv = (await db.execute(select(Level).where(Level.code == lvl))).scalar_one_or_none()
    aud = "kid" if seg in ("mini", "junior", "tween") else "adult"
    topic = (await db.execute(
        select(Topic).where(Topic.is_active.is_(True), Topic.audience == aud).limit(1)
    )).scalars().first()
    age = AGE.get(seg, 10)
    user = SimpleNamespace(nombre="Alex", target_language="en", base_language="es", cefr_level=lvl, age_group=seg)
    prompt = compose_proto_prompt(user=user, topic=topic,
                                  student_type_data=_st_data(st) if st else None,
                                  level_data=_level_data(lv) if lv else None)
    history = [{"role": "user", "parts": [{"text": "(El alumno entra a la clase y está listo para empezar.)"}]}]
    transcript = []
    sim_sys = STUDENT_SIM.format(name="Alex", age=age, level=lvl)
    for _ in range(turns):
        coach = await _gemini(client, prompt, history, temp=0.7, max_tokens=400)
        transcript.append(("COACH", coach))
        history.append({"role": "model", "parts": [{"text": coach}]})
        stu = await _gemini(client, sim_sys, [{"role": "user", "parts": [{"text": coach}]}], temp=0.9, max_tokens=80)
        transcript.append(("ALUMNO", stu))
        history.append({"role": "user", "parts": [{"text": stu}]})
    return prompt, transcript


async def main() -> None:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    seg_filter = sys.argv[2] if len(sys.argv) > 2 else None  # ej: "adult" para correr solo ese segmento
    pool = [c for c in ALL_CASES if (not seg_filter or c[0] == seg_filter)]
    cases = pool[:n]
    out = ["# Simulación de clases v25 (motor 9 pasos, texto)\n",
           f"Modelo: {MODEL} · {len(cases)} casos · 3 turnos c/u\n"]
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with AsyncSessionLocal() as db:
            for seg, lvl in cases:
                print(f"  simulando {seg}/{lvl} ...")
                prompt, transcript = await sim_case(client, db, seg, lvl)
                out.append(f"\n{'='*70}\n## {seg.upper()} · {lvl}\n{'='*70}\n")
                for who, txt in transcript:
                    out.append(f"\n**{who}:** {txt}\n")
    suffix = f"_{seg_filter}" if seg_filter else ""
    path = os.path.join(os.path.dirname(__file__), "..", "..", "Motor-Learning", f"sim_clases_v25{suffix}.md")
    with open(os.path.abspath(path), "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"\nOK -> Motor-Learning/sim_clases_v25.md ({len(cases)} casos)")


if __name__ == "__main__":
    asyncio.run(main())

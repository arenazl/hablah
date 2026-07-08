"""
Genera transcripciones de clases simuladas para un lote de combos (banda x nivel x topico).
Coach = Gemini flash-lite (prod). Alumno = Ollama (familia distinta).
Historia 0. Sin juez automatico: la especialista revisa los archivos.

Uso: python generar_transcripciones_lote.py <band_slug> [level]
  band_slug: mini | junior | tween | adult
  level: A0 | A1 | A2 | B1 | B2 | C1 | C2  (si se omite, corre todos los del lote)

Salida: docs/transcripciones_lote/<band>_<level>_<topic_id>.json

Reanudar: si el archivo de salida ya existe, saltea ese combo.
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

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

import httpx
import pymysql
from pymysql.cursors import DictCursor
from services import motor_engine
from _student_prompts import get_student_prompt

_OKEY = open(os.path.join(os.path.dirname(__file__), "..", ".ollama_key")).read().strip()
_GKEY = os.environ.get("GEMINI_API_KEY", "")

MODEL_COACH = "gemini-3.1-flash-lite-preview"
MODEL_STUDENT = "gpt-oss:120b"
EXCHANGES = 4  # turnos coach-alumno
_SCHEMA = {"type": "object", "properties": {"tts": {"type": "string"}}, "required": ["tts"]}

OUT_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "docs", "transcripciones_lote")
)

BAND_SLUGS = {"mini": 1, "junior": 2, "teen": 3, "adult": 4}
BAND_V3_CODE = {"mini": "early_child", "junior": "child", "teen": "teen", "adult": "adult"}


def get_conn():
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", 3306)),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        db=os.environ["DB_NAME"],
        ssl={"ca": None},
        cursorclass=DictCursor,
        charset="utf8mb4",
    )


async def _coach_turn(prompt: str, history: list) -> str:
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (
        prompt
        + "\n\n--- CONVERSACION ---\n"
        + (convo or "(vacia, empezas vos)")
        + "\n\nDevuelve `tts`: SOLO lo que el PROFE dice en voz, limpio, 1-3 oraciones, tu proximo turno:"
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_COACH}:generateContent?key={_GKEY}"
    body = {
        "contents": [{"parts": [{"text": p}]}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": _SCHEMA},
    }
    for _ in range(4):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                d = (await c.post(url, json=body)).json()
            return json.loads(d["candidates"][0]["content"]["parts"][0]["text"])["tts"].strip()[:500]
        except Exception:
            await asyncio.sleep(5)
    return "(sin respuesta)"


async def _student_turn(history: list, student_prompt: str) -> str:
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (
        student_prompt
        + f"\n\n--- CONVERSACION CON EL PROFE ---\n{convo}"
        + "\n\nEscribí SOLO tu próximo turno. Respetá ESTRICTAMENTE tu perfil de nivel (errores, mezcla de idiomas, largo del turno):"
    )
    body = {"model": MODEL_STUDENT, "messages": [{"role": "user", "content": p}], "stream": False}
    for _ in range(4):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                d = (
                    await c.post(
                        "https://ollama.com/api/chat",
                        headers={"Authorization": f"Bearer {_OKEY}"},
                        json=body,
                    )
                ).json()
            return d["message"]["content"].strip().replace("\n", " ")[:300]
        except Exception:
            await asyncio.sleep(5)
    return "(sin respuesta)"


_CLOSING_SIGNAL = (
    "\n\n[INSTRUCCIÓN INTERNA — NO LEER EN VOZ ALTA]: Este es el ÚLTIMO turno de la clase. "
    "Hacé un cierre suave: repassá brevemente algo de lo que charlaron hoy, festejá el logro "
    "del alumno y enganchá para la próxima clase. Cálido y breve. No cortés de golpe."
)


async def run_class(coach_prompt: str, student_prompt: str) -> list:
    h = [("Profe", await _coach_turn(coach_prompt, []))]
    for i in range(EXCHANGES):
        h.append(("Alumno", await _student_turn(h, student_prompt)))
        is_last = (i == EXCHANGES - 1)
        prompt = coach_prompt + (_CLOSING_SIGNAL if is_last else "")
        h.append(("Profe", await _coach_turn(prompt, h)))
    return [{"who": w, "text": t} for w, t in h]


KID_BANDS = {"mini", "junior", "teen"}


async def _get_prompt(band_slug: str, level: str, topic_id: int, topic_title: str) -> str | None:
    if band_slug in KID_BANDS:
        v3_code = BAND_V3_CODE[band_slug]
        resolved = await motor_engine.resolve_kid(v3_code, level, topic_id, None)
        if resolved:
            return resolved["prompt"]
        # fallback: prompt minimal si el topic no esta migrado a v3
        return (
            f"Sos Sparky, un coach de ingles para ninos. "
            f"Tema de hoy: '{topic_title}'. Nivel CEFR: {level}. "
            f"Habla principalmente en espanol con palabras simples en ingles. "
            f"Se calido, usa el nombre del tema para motivar al nino."
        )
    else:
        resolved = await motor_engine.resolve(BAND_V3_CODE[band_slug], level, topic_id, None, None)
        return resolved["prompt"]


async def process_combo(band_slug: str, level: str, topic_id: int, topic_title: str) -> None:
    out_path = os.path.join(OUT_DIR, f"{band_slug}_{level}_{topic_id}.json")
    if os.path.exists(out_path):
        print(f"  [SKIP] {band_slug}/{level}/{topic_title[:30]} (ya existe)")
        return

    print(f"  [RUN]  {band_slug}/{level}/{topic_title[:40]}...")
    try:
        coach_prompt = await _get_prompt(band_slug, level, topic_id, topic_title)
        if not coach_prompt:
            print(f"  [ERR]  sin prompt de coach para {band_slug}/{level}/{topic_id}")
            return
        student_prompt = get_student_prompt(band_slug, level)
    except Exception as e:
        print(f"  [ERR]  resolve: {e}")
        return

    transcript = await run_class(coach_prompt, student_prompt)

    result = {
        "band": band_slug,
        "level": level,
        "topic_id": topic_id,
        "topic_title": topic_title,
        "coach_model": MODEL_COACH,
        "student_model": MODEL_STUDENT,
        "exchanges": EXCHANGES,
        "transcript": transcript,
        "student_prompt_version": "v1",
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"  [OK]   -> {os.path.basename(out_path)}")


async def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: python generar_transcripciones_lote.py <band_slug> [level]")
        sys.exit(1)

    band_slug = sys.argv[1].lower()
    level_filter = sys.argv[2].upper() if len(sys.argv) > 2 else None

    if band_slug not in BAND_SLUGS:
        print(f"band_slug invalido: {band_slug}. Opciones: {list(BAND_SLUGS)}")
        sys.exit(1)

    band_id = BAND_SLUGS[band_slug]
    os.makedirs(OUT_DIR, exist_ok=True)

    conn = get_conn()
    with conn.cursor() as cur:
        q = """
            SELECT tbl.topic_id, t.title, tbl.level_code
            FROM topic_band_level tbl
            JOIN topics t ON t.id = tbl.topic_id
            WHERE tbl.band_id = %s
        """
        params = [band_id]
        if level_filter:
            q += " AND tbl.level_code = %s"
            params.append(level_filter)
        q += " ORDER BY tbl.level_code, tbl.topic_id"
        cur.execute(q, params)
        combos = cur.fetchall()
    conn.close()

    print(f"Lote: {len(combos)} combos para banda={band_slug}" + (f" nivel={level_filter}" if level_filter else ""))
    print()

    for combo in combos:
        await process_combo(band_slug, combo["level_code"], combo["topic_id"], combo["title"])
        await asyncio.sleep(0.5)  # throttle suave entre combos

    print()
    print(f"Transcripciones en: {OUT_DIR}")


if __name__ == "__main__":
    asyncio.run(main())

"""
Corre las transcripciones de un lote contra el panel de 3 jueces (skill english-teacher-judge).
Genera un archivo de evaluación por transcripción + un resumen del lote.

Uso: python juzgar_lote.py [directorio]
  directorio: ruta a los JSONs de transcripciones (default: docs/transcripciones_lote)

Salida:
  docs/evaluaciones_lote/<band>_<level>_<topic_id>_eval.json  (una por transcripción)
  docs/evaluaciones_lote/_resumen.json                        (score global del lote)
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

_GKEY = os.environ.get("GEMINI_API_KEY", "")
MODEL_JUDGE = "gemini-2.5-flash"   # juez distinto al coach (flash-lite)

# Ruta al skill
_SKILL_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", ".claude", "skills",
                 "english-teacher-judge", "skill.md")
)
_JUDGE_PROMPT = open(_SKILL_PATH, encoding="utf-8").read()

IN_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "docs", "transcripciones_lote")
)
OUT_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "docs", "evaluaciones_lote")
)

_SEM = asyncio.Semaphore(4)  # max 4 llamadas al juez en paralelo

_SCHEMA = {
    "type": "object",
    "properties": {
        "banda": {"type": "string"},
        "nivel": {"type": "string"},
        "topico": {"type": "string"},
        "juez1_profe": {
            "type": "object",
            "properties": {
                "naturalidad": {"type": "number"}, "nivel": {"type": "number"},
                "recast": {"type": "number"}, "reciclado": {"type": "number"},
                "afecto": {"type": "number"}, "cierre": {"type": "number"},
                "score": {"type": "number"}, "verdict": {"type": "string"}
            }
        },
        "juez2_sla": {
            "type": "object",
            "properties": {
                "filtro_afectivo": {"type": "number"}, "input_comprensible": {"type": "number"},
                "produccion_forzada": {"type": "number"}, "correccion_implicita": {"type": "number"},
                "variedad": {"type": "number"}, "adecuacion_edad_nivel": {"type": "number"},
                "score": {"type": "number"}, "verdict": {"type": "string"}
            }
        },
        "juez3_alumno": {
            "type": "object",
            "properties": {
                "claridad": {"type": "number"}, "motivacion": {"type": "number"},
                "ritmo": {"type": "number"}, "logro": {"type": "number"},
                "confianza": {"type": "number"},
                "score": {"type": "number"}, "verdict": {"type": "string"}
            }
        },
        "score_global": {"type": "number"},
        "hallazgos": {"type": "array", "items": {"type": "string"}},
        "para_mejorar": {"type": "string"}
    },
    "required": ["juez1_profe", "juez2_sla", "juez3_alumno", "score_global", "para_mejorar"]
}


async def judge_transcript(data: dict) -> dict | None:
    transcript_text = "\n".join(
        f"{t['who']}: {t['text']}" for t in data["transcript"]
    )
    prompt = (
        _JUDGE_PROMPT
        + f"\n\n---\nBanda: {data['band']} | Nivel: {data['level']} | Tópico: {data['topic_title']}\n\n"
        + f"TRANSCRIPCION:\n{transcript_text}\n\n"
        + "Evaluá esta clase con los 3 jueces. Devolvé SOLO el JSON del veredicto."
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_JUDGE}:generateContent?key={_GKEY}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": _SCHEMA,
            "temperature": 0.2,
        },
    }
    for attempt in range(4):
        try:
            async with _SEM:
                async with httpx.AsyncClient(timeout=120) as c:
                    r = await c.post(url, json=body)
                raw = r.json()
            text = raw["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except Exception as e:
            if attempt < 3:
                await asyncio.sleep(5 + attempt * 5)
            else:
                print(f"  [ERR] juez: {e}")
    return None


async def process_file(path: str) -> dict | None:
    data = json.load(open(path, encoding="utf-8"))
    band = data["band"]
    level = data["level"]
    tid = data["topic_id"]
    title = data["topic_title"]

    out_name = f"{band}_{level}_{tid}_eval.json"
    out_path = os.path.join(OUT_DIR, out_name)

    if os.path.exists(out_path):
        print(f"  [SKIP] {band}/{level}/{title[:30]} (ya evaluado)")
        return json.load(open(out_path, encoding="utf-8"))

    print(f"  [EVAL] {band}/{level}/{title[:40]}...")
    result = await judge_transcript(data)
    if not result:
        return None

    result["band"] = band
    result["nivel"] = level
    result["topico"] = title
    result["topic_id"] = tid

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    score = result.get("score_global", "?")
    print(f"  [OK]   {band}/{level}/{title[:30]} -> score_global={score}")
    return result


async def main() -> None:
    in_dir = sys.argv[1] if len(sys.argv) > 1 else IN_DIR
    os.makedirs(OUT_DIR, exist_ok=True)

    files = sorted(f for f in os.listdir(in_dir) if f.endswith(".json") and not f.startswith("_"))
    print(f"Evaluando {len(files)} transcripciones con panel de 3 jueces...\n")

    tasks = [process_file(os.path.join(in_dir, f)) for f in files]
    results = await asyncio.gather(*tasks)
    results = [r for r in results if r]

    if not results:
        print("Sin resultados.")
        return

    scores = [r["score_global"] for r in results if isinstance(r.get("score_global"), (int, float))]
    avg = sum(scores) / len(scores) if scores else 0

    # Resumen del lote
    resumen = {
        "total": len(results),
        "score_promedio": round(avg, 2),
        "score_min": round(min(scores), 2) if scores else None,
        "score_max": round(max(scores), 2) if scores else None,
        "por_nivel": {},
        "hallazgos_frecuentes": {},
        "items": []
    }

    for r in results:
        nv = r.get("nivel", "?")
        resumen["por_nivel"].setdefault(nv, []).append(r.get("score_global", 0))
        for h in r.get("hallazgos", []):
            resumen["hallazgos_frecuentes"][h] = resumen["hallazgos_frecuentes"].get(h, 0) + 1
        resumen["items"].append({
            "topico": r.get("topico"), "nivel": nv,
            "score_global": r.get("score_global"),
            "para_mejorar": r.get("para_mejorar", "")
        })

    # Promediar por nivel
    resumen["por_nivel"] = {
        nv: round(sum(ss) / len(ss), 2) for nv, ss in resumen["por_nivel"].items()
    }
    # Top hallazgos
    resumen["hallazgos_frecuentes"] = dict(
        sorted(resumen["hallazgos_frecuentes"].items(), key=lambda x: -x[1])[:10]
    )

    resumen_path = os.path.join(OUT_DIR, "_resumen.json")
    with open(resumen_path, "w", encoding="utf-8") as f:
        json.dump(resumen, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"Score promedio del lote: {avg:.2f}")
    print(f"Por nivel: {resumen['por_nivel']}")
    print(f"\nTop hallazgos:")
    for h, n in list(resumen["hallazgos_frecuentes"].items())[:5]:
        print(f"  [{n}x] {h}")
    print(f"\nResumen en: {resumen_path}")


if __name__ == "__main__":
    asyncio.run(main())

"""Genera seed_prompts en es/pt/en para TODOS los topics existentes via Gemini.

Resultado final: cada Topic queda con:
- seed_prompts: {"A1_es","A2_es",..."C2_es","A1_pt",..."C2_pt","A1_en",..."C2_en"}
- keywords: combinacion de las propuestas en los 3 idiomas (deduplicadas)

El analyzer / super_prompt va a leer el seed segun user.target_language.
Es idempotente: si el topic ya tiene seeds en un idioma, los reemplaza con la nueva generacion.
"""
import sys
import os
import asyncio
import json
import httpx

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from core.config import settings
from models.template import Topic


LANGS = [
    ("es", "Spanish"),
    ("pt", "Portuguese"),
    ("en", "English"),
]
CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]


async def gemini_generate(topic_title: str, topic_category: str, lang_code: str, lang_name: str) -> dict:
    prompt = f"""Sos un disenador curricular de Hablah (app de aprendizaje de idiomas por conversacion con AI).

Dado este topico:
- Titulo: {topic_title}
- Categoria: {topic_category}
- Idioma objetivo del alumno: {lang_name}

Genera contenido pedagogico de alta calidad en JSON estricto con este schema:

{{
  "seed_prompts": {{
    "A1": string, "A2": string, "B1": string, "B2": string, "C1": string, "C2": string
  }},
  "keywords": [string]
}}

CRITERIOS:
- Cada seed_prompt es una DIRECTIVA PARA EL TUTOR (no para el alumno) sobre como arrancar la charla. Ej: "Inicia preguntando por los origenes del genero y por que le interesa al alumno"
- Adapta complejidad al CEFR (A1 simple, C2 sofisticado)
- 8-12 keywords ESPECIFICAS del tema en {lang_name} (no genericas)
- Los seed_prompts estan en castellano rioplatense (instrucciones internas al tutor)
- Las keywords estan en {lang_name}

DEVOLVE SOLO JSON, sin comentarios."""

    key = settings.GEMINI_API_KEY
    model = settings.GEMINI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.5,
            "maxOutputTokens": 4000,
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=90) as cli:
        r = await cli.post(url, json=body)
        r.raise_for_status()
        data = r.json()
    text = ""
    for c in data.get("candidates", []):
        for p in (c.get("content") or {}).get("parts", []):
            text += p.get("text", "")
    return json.loads(text)


async def main(limit: int | None = None, only_missing: bool = True) -> None:
    async with AsyncSessionLocal() as db:
        topics = (await db.execute(select(Topic).where(Topic.is_active == True).order_by(Topic.id))).scalars().all()
        if limit:
            topics = topics[:limit]
        print(f"Topics a procesar: {len(topics)} (only_missing={only_missing})\n")

        for idx, t in enumerate(topics, 1):
            print(f"[{idx}/{len(topics)}] {t.title} ({t.category})")
            current_seeds = dict(t.seed_prompts or {})
            all_keywords: list[str] = list(t.keywords or [])

            for lang_code, lang_name in LANGS:
                # check si ya tiene seeds en ese lang (los 6 niveles)
                already = all(f"{lvl}_{lang_code}" in current_seeds for lvl in CEFR_LEVELS)
                if already and only_missing:
                    print(f"  - {lang_code}: ya tiene seeds, skip")
                    continue
                out = None
                for attempt in range(2):
                    try:
                        out = await gemini_generate(t.title, t.category, lang_code, lang_name)
                        break
                    except Exception as e:
                        if attempt == 1:
                            print(f"  ! {lang_code} FAIL tras 2 intentos: {e}")
                            out = None
                        else:
                            await asyncio.sleep(1)
                if out is None:
                    continue
                try:
                    sps = out.get("seed_prompts", {})
                    kws = out.get("keywords", [])
                    for lvl, txt in sps.items():
                        if txt:
                            current_seeds[f"{lvl}_{lang_code}"] = txt
                    # tambien guardamos compat sin sufijo para el lang principal del topic
                    if lang_code == "es" and not all(lvl in current_seeds for lvl in CEFR_LEVELS):
                        for lvl, txt in sps.items():
                            if txt and lvl not in current_seeds:
                                current_seeds[lvl] = txt
                    for k in kws:
                        if k and k not in all_keywords:
                            all_keywords.append(k)
                    print(f"  + {lang_code}: {len(sps)} seeds, {len(kws)} kw")
                except Exception as e:
                    print(f"  ! {lang_code} parse FAIL: {e}")

            t.seed_prompts = current_seeds
            t.keywords = all_keywords[:40]  # cap razonable
            # asegurar que levels incluya los 6
            t.levels = CEFR_LEVELS
            await db.commit()
            print()

        print(f"\nOK - {len(topics)} topics procesados")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=None, help="Procesar solo los primeros N topics (para probar)")
    p.add_argument("--all", action="store_true", help="Regenerar incluso los que ya tienen seeds")
    args = p.parse_args()
    asyncio.run(main(limit=args.limit, only_missing=not args.all))

"""Regenera TODOS los seed_prompts con tono guiado (no abierto).

Cambio vs scripts anteriores:
- Antes: 'Inicia preguntando por los origenes y por que le interesa al alumno' -> vago, el tutor improvisa
- Ahora: instruccion ESPECIFICA con 1ra pregunta concreta + de donde sigue + para que el alumno se sienta GUIADO

Solo toca seed_prompts. NO toca titulo, categoria, keywords, levels.
"""
import sys, os, asyncio, json
import httpx

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from core.config import settings
from models.template import Topic


LANGS = [("es", "Spanish"), ("pt", "Portuguese"), ("en", "English")]
CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"]


async def gemini_generate(title: str, category: str, lang_code: str, lang_name: str) -> dict:
    prompt = f"""Sos un disenador curricular de Hablah (app de conversacion con AI tutor).

TOPICO: {title}
CATEGORIA: {category}
IDIOMA QUE EL ALUMNO PRACTICA: {lang_name}

Vas a escribir 6 SEED PROMPTS (instrucciones AL TUTOR), uno por nivel CEFR (A1, A2, B1, B2, C1, C2).

REGLA CRITICA - ESTILO GUIADO:
NO escribas instrucciones vagas tipo "inicia preguntando sobre el tema" o "explora los origenes".
Cada seed prompt debe ser MUY ESPECIFICO y darle al tutor:
1. UNA pregunta CONCRETA Y ATERRIZADA para arrancar (no abstracta, no abierta-vaga)
2. La pregunta debe pedir algo PERSONAL del alumno (su ultima vez, su opinion sobre un caso real, su experiencia)
3. Despues del primer turno, el tutor debe ENCADENAR al siguiente sub-tema concreto

EJEMPLO BUENO (B1, "IA generativa"):
"Arranca preguntando: 'Cuando fue la ultima vez que usaste ChatGPT (o similar) y para que?'. Si dice que no la usa, preguntale por que no. Si la usa, pivotea hacia: '¿alguna vez te dio una respuesta que te parecio mal o sospechosa?'"

EJEMPLO MALO (lo que NO queremos):
"Inicia conversacion sobre los aspectos eticos de la IA generativa y sus implicancias"

ESCALA POR NIVEL:
- A1: Pregunta SI/NO o de eleccion (¿te gusta X o Y?), vocabulario basico
- A2: Pregunta cotidiana simple (¿cuando fue la ultima vez que X?)
- B1: Pregunta sobre experiencia personal con ejemplo concreto
- B2: Pregunta con dimension de opinion + ejemplo del mundo real
- C1: Pregunta con dimension argumentativa, pero aterrizada en caso concreto
- C2: Pregunta sofisticada pero sigue siendo concreta, no abstracta-vaga

DEVOLVE JSON ESTRICTO:
{{
  "A1": "Arranca preguntando: '...'. Si responde X, pivotea a '...'.",
  "A2": "...",
  "B1": "...",
  "B2": "...",
  "C1": "...",
  "C2": "..."
}}

Los seed_prompts estan en castellano rioplatense (son instrucciones internas para el tutor)."""

    key = settings.GEMINI_API_KEY
    model = settings.GEMINI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 3000,
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


async def main(limit: int | None = None) -> None:
    async with AsyncSessionLocal() as db:
        topics = (await db.execute(select(Topic).where(Topic.is_active == True).order_by(Topic.id))).scalars().all()
        if limit:
            topics = topics[:limit]
        print(f"Topics a procesar: {len(topics)}\n")

        for idx, t in enumerate(topics, 1):
            print(f"[{idx}/{len(topics)}] {t.title}")
            seeds = dict(t.seed_prompts or {})

            for lang_code, lang_name in LANGS:
                ok = False
                for attempt in range(2):
                    try:
                        out = await gemini_generate(t.title, t.category, lang_code, lang_name)
                        for lvl, txt in out.items():
                            if lvl in CEFR and txt:
                                seeds[f"{lvl}_{lang_code}"] = txt
                                # tambien backfill el legacy sin sufijo si es 'es'
                                if lang_code == "es":
                                    seeds[lvl] = txt
                        print(f"  + {lang_code}: 6 seeds guiados")
                        ok = True
                        break
                    except Exception as e:
                        if attempt == 1:
                            print(f"  ! {lang_code} FAIL: {e}")
                        else:
                            await asyncio.sleep(1)
                if not ok:
                    continue

            t.seed_prompts = seeds
            await db.commit()

        print(f"\nOK - {len(topics)} topics regenerados con seeds guiados")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--limit", type=int, default=None, help="Solo los primeros N (para probar)")
    args = p.parse_args()
    asyncio.run(main(limit=args.limit))

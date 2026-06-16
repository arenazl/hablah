"""Seed v25 — arranques (opening) y desarrollo (continuation) por SEGMENTO (eje edad).

Llena student_types.opening_seed / continuation_seed (closing_seed ya lo puso
seed_method_layer). Sin esto, el bloque 9 (trigger) cae al fallback kid-céntrico
('pedile que repita la primera palabra') y rompe a los adultos/niveles altos.

Adultos: conversación real, NO drill de repetición. Valores tentativos, editables.
Idempotente. Uso: python scripts/seed_v25_arranques.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.methodology import StudentType

ARRANQUES = {
    "mini": dict(
        opening=("Saludá a {name} con mucha energía y presentá el mundo de hoy ({topic}) con un gancho "
                 "corto (un personaje que necesita ayuda). Pedile repetir la PRIMERA palabra en inglés. "
                 "Flujo: frase corta en inglés → espejo en español → pedí que la repita. Esperá su respuesta."),
        continuation=("Un solo paso por turno: 1 frase corta en inglés → espejo en español → pedí que repita. "
                      "Nunca preguntas abiertas. Pocas palabras por turno. No avances si no dijo la anterior."),
    ),
    "junior": dict(
        opening=("Saludá a {name} y presentá la MISIÓN sobre {topic}. Arrancá con la primera consigna, "
                 "ofreciendo una opción A/B para avanzar la historia."),
        continuation=("Avanzá la misión con opciones A/B en inglés; festejá cada parte completada "
                      "('Mission part X complete!'); una consigna por turno; reconocé el logro sin infantilizar."),
    ),
    "tween": dict(
        opening=("Saludá a {name} con onda y planteá el reto de hoy sobre {topic} ('Challenge 1, ready?'). "
                 "Trato de igual, nada infantil."),
        continuation=("Challenges numerados en voz; dá pistas, no la respuesta; conectá con sus intereses; "
                      "tono de igual."),
    ),
    "adult": dict(
        opening=("Presentate y saludá a {name}. Abrí una CONVERSACIÓN REAL sobre {topic} con UNA pregunta "
                 "auténtica (su opinión o experiencia sobre el tema). NO pidas repetir palabras: el objetivo "
                 "gramatical del nivel va INVISIBLE, tejido en la charla."),
        continuation=("Sostené la conversación: una pregunta o situación por turno; recast natural de los "
                      "errores sin cortar la fluidez; llevá el objetivo del nivel sin explicitarlo; sin infantilizar."),
    ),
}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for slug, d in ARRANQUES.items():
            row = (await db.execute(select(StudentType).where(StudentType.slug == slug))).scalar_one_or_none()
            if not row:
                print(f"  [miss] student_type {slug}")
                continue
            row.opening_seed = d["opening"]
            row.continuation_seed = d["continuation"]
            print(f"  [upd] {slug} (opening + continuation)")
        await db.commit()
    print("\nOK - seed_v25_arranques completo (bloque 9 desde el dato, por segmento)")


if __name__ == "__main__":
    asyncio.run(main())

"""Seed de niveles CEFR con nombre amigable (tabla `levels`).

Nombres tentativos (editables desde el backoffice). El alumno ve "Explorador",
no "A1". Idempotente: upsert por code.
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.methodology import Level

LEVELS = [
    ("A0", "Despegue", 0, "Primer contacto con el idioma — palabras sueltas en contexto."),
    ("A1", "Explorador", 1, "Primeras frasitas en contexto."),
    ("A2", "Aventurero", 2, "Minihistorias y descripciones simples."),
    ("B1", "Viajero", 3, "Conversación cotidiana con fluidez creciente."),
    ("B2", "Navegante", 4, "Debate, opinión y vocabulario amplio."),
    ("C1", "Experto", 5, "Matices, ironía y registro."),
    ("C2", "Maestro", 6, "Dominio casi nativo."),
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for code, friendly, order, desc in LEVELS:
            row = (await db.execute(select(Level).where(Level.code == code))).scalar_one_or_none()
            if row:
                row.friendly_name, row.sort_order, row.short_desc = friendly, order, desc
                print(f"  [upd] {code} -> {friendly}")
            else:
                db.add(Level(code=code, friendly_name=friendly, sort_order=order, short_desc=desc, active=True))
                print(f"  [new] {code} -> {friendly}")
        await db.commit()
    print("OK — seed_levels completo")


if __name__ == "__main__":
    asyncio.run(main())

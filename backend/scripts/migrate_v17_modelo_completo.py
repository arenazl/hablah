"""Migración v17 — Modelo completo del motor (armar bien de entrada).

Aditiva e idempotente. NO toca datos ni columnas existentes.

Tablas NUEVAS (via create_all, que no toca las que ya existen):
  - coaches            : la persona del tutor (2+ por segmento, F/M) — bloque 2
  - levels             : niveles CEFR con nombre amigable
  - vocab_progress     : SRS por ítem (memoria)
  - reinforcement_queue, learner_interests, learner_traits, session_insights

Columnas NUEVAS (add si faltan):
  - student_types.closing_seed
  - methodology_modules.max_session_minutes, .max_turns
  - users.gender, .preferred_coach_id
  - sessions.raw_session_data   (crudo para el post-clase — BLUEPRINT §8)
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine, Base

# Importar TODOS los modelos para que Base.metadata conozca las tablas nuevas.
import models.user        # noqa: F401
import models.template    # noqa: F401
import models.methodology # noqa: F401
import models.learner_state  # noqa: F401

ADD_COLS = [
    ("student_types", "closing_seed", "TEXT NULL"),
    ("methodology_modules", "max_session_minutes", "INT NULL"),
    ("methodology_modules", "max_turns", "INT NULL"),
    ("users", "gender", "VARCHAR(10) NULL"),
    ("users", "preferred_coach_id", "INT NULL"),
    ("sessions", "raw_session_data", "JSON NULL"),
]


async def add_if_missing(conn, table: str, col: str, defn: str) -> None:
    r = await conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:t AND COLUMN_NAME=:c"
        ),
        {"t": table, "c": col},
    )
    if r.scalar_one() > 0:
        print(f"  [skip] {table}.{col}")
        return
    await conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {defn}"))
    print(f"  [ok]   {table}.{col}")


async def main() -> None:
    # Mostrar a qué BD apuntamos (seguridad: no crear en la base equivocada)
    async with engine.begin() as conn:
        db = (await conn.execute(text("SELECT DATABASE()"))).scalar_one()
        print(f"BD destino: {db}\n")

    print("Tablas nuevas (create_all, no toca existentes):")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  [ok] create_all")

    print("\nColumnas nuevas:")
    async with engine.begin() as conn:
        for t, c, d in ADD_COLS:
            await add_if_missing(conn, t, c, d)

    print("\nOK — migrate_v17 completo")


if __name__ == "__main__":
    asyncio.run(main())

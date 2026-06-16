"""Migración v19 — catálogo jerárquico Categoría → Subcategoría → Tópico + vocab IA.

Aditiva e idempotente. Tablas nuevas: categories, subcategories.
Columnas nuevas en topics: category_id, subcategory_id, generated_vocab.
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine, Base

import models.user        # noqa: F401
import models.template    # noqa: F401
import models.methodology # noqa: F401
import models.learner_state  # noqa: F401

ADD_COLS = [
    ("topics", "category_id", "INT NULL"),
    ("topics", "subcategory_id", "INT NULL"),
    ("topics", "generated_vocab", "JSON NULL"),
]


async def add_if_missing(conn, table, col, defn):
    r = await conn.execute(text(
        "SELECT COUNT(*) FROM information_schema.COLUMNS "
        "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:t AND COLUMN_NAME=:c"
    ), {"t": table, "c": col})
    if r.scalar_one() > 0:
        print(f"  [skip] {table}.{col}")
        return
    await conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {defn}"))
    print(f"  [ok]   {table}.{col}")


async def main() -> None:
    print("Tablas nuevas (create_all):")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  [ok] create_all")
    print("Columnas nuevas:")
    async with engine.begin() as conn:
        for t, c, d in ADD_COLS:
            await add_if_missing(conn, t, c, d)
    print("\nOK — migrate_v19 completo")


if __name__ == "__main__":
    asyncio.run(main())

"""Migración v29 — users.interest_subcategory_ids (JSON).

Guarda las subcategorías que el alumno elige en el selector nuevo (categoría →
subcategoría). El sequencer propone tópicos SOLO de esas subcategorías.
Idempotente. Uso: python scripts/migrate_v29_subcat_interests.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        exists = (await conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() "
            "AND table_name = 'users' AND column_name = 'interest_subcategory_ids'"
        ))).scalar()
        if exists:
            print("  [skip] users.interest_subcategory_ids ya existe")
        else:
            await conn.execute(text("ALTER TABLE users ADD COLUMN interest_subcategory_ids JSON NULL"))
            print("  [add] users.interest_subcategory_ids JSON NULL")
    await engine.dispose()
    print("OK - migrate_v29")


if __name__ == "__main__":
    asyncio.run(main())

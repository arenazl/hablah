"""Migración v23 — opening_seed + continuation_seed en student_types (doc 11 §1.4).

Plantillas de arranque/desarrollo por banda como dato (closing_seed ya existía).
Aditiva e idempotente.
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine

COLS = [("opening_seed", "TEXT"), ("continuation_seed", "TEXT")]


async def main() -> None:
    async with engine.begin() as conn:
        for col, typ in COLS:
            r = await conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='student_types' AND COLUMN_NAME=:c"
            ), {"c": col})
            if r.scalar_one() == 0:
                await conn.execute(text(f"ALTER TABLE `student_types` ADD COLUMN `{col}` {typ} NULL"))
                print(f"  [ok] student_types.{col}")
            else:
                print(f"  [skip] student_types.{col}")
    print("\nOK — migrate_v23 completo (opening/continuation seeds)")


if __name__ == "__main__":
    asyncio.run(main())

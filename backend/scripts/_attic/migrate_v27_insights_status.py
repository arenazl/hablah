"""Migración v27 — post-clase: session_insights.status (aprobación) + traits.

status: pending (default) → approved | discarded.
traits: JSON [{trait, confidence}] de la Mitad B (se propaga a learner_traits al aprobar).
Aditiva e idempotente. Uso: python scripts/migrate_v27_insights_status.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine

ADDS = [
    ("status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
    ("traits", "TEXT NULL"),
]


async def main() -> None:
    async with engine.begin() as conn:
        for col, typ in ADDS:
            r = await conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='session_insights' AND COLUMN_NAME=:c"
            ), {"c": col})
            if r.scalar_one() == 0:
                await conn.execute(text(f"ALTER TABLE `session_insights` ADD COLUMN `{col}` {typ}"))
                print(f"  [ok] session_insights.{col}")
            else:
                print(f"  [skip] session_insights.{col}")
    print("\nOK - migrate_v27 completo")


if __name__ == "__main__":
    asyncio.run(main())

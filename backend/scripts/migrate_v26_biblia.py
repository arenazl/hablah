"""Migración v26 — incorporaciones de la 'biblia' (seed_motor.yaml), cruzadas y aprobadas.

  levels.vocab_depth (basic|full)  → Sector 2: cuántas frases del tópico entran por nivel.
  topics.appropriate_bands (JSON)  → Sector 1: filtro fino del sequencer (no entra al prompt).

El Sector 3 (closing trigger) va como toggle en app_config (seed, no esquema).
Aditiva e idempotente. Uso: python scripts/migrate_v26_biblia.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine

ADDS = {
    "levels": [("vocab_depth", "VARCHAR(10)")],
    "topics": [("appropriate_bands", "JSON")],
}


async def main() -> None:
    async with engine.begin() as conn:
        for table, cols in ADDS.items():
            for col, typ in cols:
                r = await conn.execute(text(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:t AND COLUMN_NAME=:c"
                ), {"t": table, "c": col})
                if r.scalar_one() == 0:
                    await conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {typ} NULL"))
                    print(f"  [ok] {table}.{col}")
                else:
                    print(f"  [skip] {table}.{col}")
    print("\nOK - migrate_v26 completo (vocab_depth + appropriate_bands)")


if __name__ == "__main__":
    asyncio.run(main())

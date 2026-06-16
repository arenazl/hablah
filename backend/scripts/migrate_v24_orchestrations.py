"""Migración v24 — tabla orchestrations (clases armadas guardadas, doc 11).

Aditiva e idempotente: crea la tabla si no existe. Sin seed.
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine

DDL = """
CREATE TABLE IF NOT EXISTS `orchestrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(160) NOT NULL,
  `student_type` VARCHAR(20) NOT NULL,
  `coach_id` INT NULL,
  `level` VARCHAR(10) NOT NULL,
  `topic_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(text(DDL))
        print("  [ok] tabla orchestrations")
    print("\nOK — migrate_v24 completo (orchestrations)")


if __name__ == "__main__":
    asyncio.run(main())

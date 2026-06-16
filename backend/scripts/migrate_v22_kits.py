"""Migración v22 — tablas kits + kit_topics (pools de tópicos, doc 11 §1.2).

Aditiva e idempotente: crea ambas tablas si no existen. Sin seed (los kits los
arma el admin desde la pantalla).
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine

DDL_KITS = """
CREATE TABLE IF NOT EXISTS `kits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(300) NOT NULL DEFAULT '',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

DDL_KIT_TOPICS = """
CREATE TABLE IF NOT EXISTS `kit_topics` (
  `kit_id` INT NOT NULL,
  `topic_id` INT NOT NULL,
  PRIMARY KEY (`kit_id`, `topic_id`),
  KEY `idx_kit` (`kit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(text(DDL_KITS))
        print("  [ok] tabla kits")
        await conn.execute(text(DDL_KIT_TOPICS))
        print("  [ok] tabla kit_topics")
    print("\nOK — migrate_v22 completo (kits + kit_topics)")


if __name__ == "__main__":
    asyncio.run(main())

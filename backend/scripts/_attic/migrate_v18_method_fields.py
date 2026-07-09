"""Migración v18 — campo dedicado para la regla de IDIOMA del riel.

La regla "qué idioma usa el COACH por nivel" (el hueco que dejó pasar el "Now you")
tiene que vivir en SU PROPIO campo del riel — no apelmazada en ai_restraints — para
ser taggeable y editable sola en el editor. Aditiva e idempotente.

  methodology_modules.language_rule TEXT NULL
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
        r = await conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='methodology_modules' AND COLUMN_NAME='language_rule'"
        ))
        if r.scalar_one() > 0:
            print("  [skip] methodology_modules.language_rule")
        else:
            await conn.execute(text("ALTER TABLE `methodology_modules` ADD COLUMN `language_rule` TEXT NULL"))
            print("  [ok]   methodology_modules.language_rule")
    print("OK — migrate_v18 completo")


if __name__ == "__main__":
    asyncio.run(main())

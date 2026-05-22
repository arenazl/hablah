"""v7.1: agrega topics.kid_age_group VARCHAR para filtrar topicos kids por edad.

Valores: 'mini' (4-7), 'junior' (7-10), 'tween' (10-14), NULL (no es kid).

Idempotente.
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        exists = (await conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'topics' AND COLUMN_NAME = 'kid_age_group'"
        ))).scalar()
        if exists:
            print("[skip] topics.kid_age_group ya existe")
        else:
            await conn.execute(text(
                "ALTER TABLE topics ADD COLUMN kid_age_group VARCHAR(10) NULL, "
                "ADD INDEX idx_topics_kid_age (kid_age_group)"
            ))
            print("[ok] topics.kid_age_group agregada")

    print("\nOK - migrate_v7_1 completo")


if __name__ == "__main__":
    asyncio.run(main())

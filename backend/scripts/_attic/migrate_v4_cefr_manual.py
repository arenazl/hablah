"""Agrega columna `cefr_manual` (boolean, default false) a la tabla `users`.

Idempotente: chequea primero si ya existe.
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        # Chequear si la columna ya existe (MySQL/MariaDB compatible)
        exists = (await conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'cefr_manual'"
        ))).scalar()
        if exists:
            print("[skip] columna cefr_manual ya existe en users")
            return

        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN cefr_manual BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        print("[ok] columna cefr_manual agregada a users")


if __name__ == "__main__":
    asyncio.run(main())

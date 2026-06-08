"""Migración aditiva: agrega users.kid_buddy_id (personaje/amiguito del nene).

Idempotente: verifica si la columna ya existe antes de crearla. Aditiva y
nullable -> no rompe datos existentes.

Uso: cd backend && python scripts/migrate_kid_buddy.py
"""
import asyncio
import os
import sys

# Permite correr el script standalone (local o `heroku run`): agrega el dir
# raiz del backend al path para que `core` sea importable.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402

from core.database import engine  # noqa: E402


async def main() -> None:
    async with engine.begin() as conn:
        res = await conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_name = 'users' AND column_name = 'kid_buddy_id' "
                "AND table_schema = DATABASE()"
            )
        )
        exists = res.scalar()
        if exists:
            print("OK: users.kid_buddy_id ya existe, nada que hacer.")
            return
        await conn.execute(text("ALTER TABLE users ADD COLUMN kid_buddy_id VARCHAR(20) NULL"))
        print("OK: columna users.kid_buddy_id agregada.")


if __name__ == "__main__":
    asyncio.run(main())

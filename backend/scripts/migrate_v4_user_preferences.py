"""Migración idempotente: agrega columna user_preferences JSON a la tabla users.

El campo guarda preferencias detectadas automáticamente durante las charlas
(ej. "corrige menos", "más corto") — overrides del template para ese usuario.
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text

from core.database import AsyncSessionLocal


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # Chequear si la columna existe
        result = await db.execute(text("""
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME='users' AND COLUMN_NAME='user_preferences'
        """))
        exists = result.scalar_one_or_none()

        if exists:
            print("[skip] user_preferences ya existe")
        else:
            await db.execute(text("ALTER TABLE users ADD COLUMN user_preferences JSON NULL"))
            await db.commit()
            print("[ok] user_preferences agregada")


if __name__ == "__main__":
    asyncio.run(main())

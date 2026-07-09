"""Migración aditiva: agrega users.kid_methodology_order (etapa del currículo).

Idempotente. Default 1 = todos arrancan en la primera etapa.

Uso: heroku run python scripts/migrate_methodology_order.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402

from core.database import engine  # noqa: E402


async def main() -> None:
    async with engine.begin() as conn:
        res = await conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_name = 'users' AND column_name = 'kid_methodology_order' "
                "AND table_schema = DATABASE()"
            )
        )
        if res.scalar():
            print("OK: users.kid_methodology_order ya existe.")
            return
        await conn.execute(text("ALTER TABLE users ADD COLUMN kid_methodology_order INT NOT NULL DEFAULT 1"))
        print("OK: columna users.kid_methodology_order agregada.")


if __name__ == "__main__":
    asyncio.run(main())

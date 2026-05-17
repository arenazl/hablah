"""Crea las tablas en la BD + seedea admin demo. Idempotente."""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from core.database import engine, Base, AsyncSessionLocal
from core.security import get_password_hash
import models  # noqa: F401  (registra todas las tablas)
from models.user import User, UserRole


ADMIN_EMAIL = "admin@hablah.app"
ADMIN_PASSWORD = "admin123"


async def seed_admin() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        if existing.scalar_one_or_none():
            print(f"Admin '{ADMIN_EMAIL}' ya existe.")
            return
        u = User(
            email=ADMIN_EMAIL,
            hashed_password=get_password_hash(ADMIN_PASSWORD),
            nombre="Admin",
            apellido="Habláh",
            role=UserRole.admin,
        )
        db.add(u)
        await db.commit()
        print(f"Admin seedeado: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")


async def main() -> None:
    print("Creando tablas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tablas OK.")
    await seed_admin()


if __name__ == "__main__":
    asyncio.run(main())

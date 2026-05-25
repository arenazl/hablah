"""Crea un usuario ad-hoc. Uso:
  python scripts/create_user_adhoc.py <nombre> <password> [cefr]
Ej:
  python scripts/create_user_adhoc.py piterino 123 A1
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from core.security import get_password_hash
from models.user import User, UserRole


async def main() -> None:
    if len(sys.argv) < 3:
        print("Uso: python create_user_adhoc.py <nombre> <password> [cefr]")
        return
    nombre = sys.argv[1]
    password = sys.argv[2]
    cefr = sys.argv[3] if len(sys.argv) > 3 else "A1"
    email = f"{nombre.lower()}@hablah.app"

    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing:
            print(f"Ya existia: id={existing.id} email={existing.email} cefr={existing.cefr_level}")
            existing.hashed_password = get_password_hash(password)
            existing.cefr_level = cefr
            await db.commit()
            print(f"  -> actualizado password y cefr={cefr}")
            return

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            nombre=nombre.capitalize(),
            apellido="",
            role=UserRole.student,
            cefr_level=cefr,
            target_language="en",
            base_language="es",
            accent_preference="uk",
            target_minutes_per_session=7,
            plan="free",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"CREADO: id={user.id} email={email} password={password} cefr={cefr}")


if __name__ == "__main__":
    asyncio.run(main())

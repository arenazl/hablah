"""Cambia el nombre (label) del user look@hablah.app: Look -> Lucas. Email queda igual."""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from core.database import AsyncSessionLocal
from models.user import User


EMAIL = "look@hablah.app"
NEW_NOMBRE = "Lucas"


async def main() -> None:
    async with AsyncSessionLocal() as db:
        u = (await db.execute(select(User).where(User.email == EMAIL))).scalar_one_or_none()
        if u is None:
            print(f"[skip] no existe {EMAIL}")
            return
        old = u.nombre
        u.nombre = NEW_NOMBRE
        await db.commit()
        print(f"[ok] id={u.id} email={EMAIL} nombre: {old!r} -> {NEW_NOMBRE!r}")


if __name__ == "__main__":
    asyncio.run(main())

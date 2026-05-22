"""Crea/actualiza los usuarios marcos y hugo con pass 123.

- marcos@hablah.app / 123 → role student (Marcos)
- hugo@hablah.app   / 123 → role student (Hugo)

Idempotente: si ya existen, resetea password + nombre + role.
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
from models.template import Template


NEW_USERS = [
    {
        "email": "marcos@hablah.app",
        "password": "123",
        "nombre": "Marcos",
        "apellido": "",
        "role": UserRole.student,
        "cefr_level": "A0",
        "plan": "free",
        "tutor_slug": "coach",
    },
    {
        "email": "hugo@hablah.app",
        "password": "123",
        "nombre": "Hugo",
        "apellido": "",
        "role": UserRole.student,
        "cefr_level": "A0",
        "plan": "free",
        "tutor_slug": "coach",
    },
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for cfg in NEW_USERS:
            existing = (await db.execute(
                select(User).where(User.email == cfg["email"])
            )).scalar_one_or_none()

            template_id = None
            if cfg["tutor_slug"]:
                tpl = (await db.execute(
                    select(Template).where(Template.slug == cfg["tutor_slug"])
                )).scalar_one_or_none()
                if tpl:
                    template_id = tpl.id

            if existing:
                existing.role = cfg["role"]
                existing.nombre = cfg["nombre"]
                existing.apellido = cfg["apellido"]
                existing.cefr_level = cfg["cefr_level"]
                existing.hashed_password = get_password_hash(cfg["password"])
                if template_id:
                    existing.active_template_id = template_id
                print(f"[update] {cfg['email']} (id={existing.id})")
            else:
                u = User(
                    email=cfg["email"],
                    hashed_password=get_password_hash(cfg["password"]),
                    nombre=cfg["nombre"],
                    apellido=cfg["apellido"],
                    role=cfg["role"],
                    cefr_level=cfg["cefr_level"],
                    target_language="en",
                    base_language="es",
                    accent_preference="uk",
                    active_template_id=template_id,
                    streak_days=0,
                    streak_best=0,
                    target_minutes_per_session=7,
                    insistent_mode_enabled=True,
                    plan=cfg["plan"],
                )
                db.add(u)
                print(f"[create] {cfg['email']}")

        await db.commit()
        print("\nOK. Usuarios listos:")
        for cfg in NEW_USERS:
            print(f"  - {cfg['email']} / {cfg['password']}")


if __name__ == "__main__":
    asyncio.run(main())

"""Crea los 3 usuarios de quick-login en /login.

- lucas@hablah.app / 123  → role student (alumno demo principal)
- nico@hablah.app  / 123  → role student (alumno demo secundario)
- coach@hablah.app / 123  → role admin   (administrador / coach)

Es idempotente: si los usuarios ya existen, no hace nada (solo asegura el rol).
NO toca a Lautaro ni a ningun otro user existente.
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


QUICK_USERS = [
    {
        "email": "alumno@hablah.app",
        "password": "123",
        "nombre": "Alumno",
        "apellido": "",
        "role": UserRole.student,
        "cefr_level": "A0",
        "plan": "free",
        "tutor_slug": "coach",
        "streak_days": 0,
        "streak_best": 0,
    },
    {
        "email": "alumno2@hablah.app",
        "password": "123",
        "nombre": "Alumno 2",
        "apellido": "",
        "role": UserRole.student,
        "cefr_level": "A1",
        "plan": "free",
        "tutor_slug": "coach",
        "streak_days": 0,
        "streak_best": 0,
    },
    {
        "email": "tizi@hablah.app",
        "password": "123",
        "nombre": "Tizi",
        "apellido": "",
        "role": UserRole.student,
        "cefr_level": "A0",
        "plan": "free",
        "tutor_slug": "coach",
        "streak_days": 0,
        "streak_best": 0,
    },
    {
        "email": "ariel@hablah.app",
        "password": "123",
        "nombre": "Ariel",
        "apellido": "",
        "role": UserRole.student,
        "cefr_level": "A0",
        "plan": "free",
        "tutor_slug": "coach",
        "streak_days": 0,
        "streak_best": 0,
    },
    {
        "email": "look@hablah.app",
        "password": "123",
        "nombre": "Look",
        "apellido": "",
        "role": UserRole.student,
        "cefr_level": "A0",
        "plan": "free",
        "tutor_slug": "coach",
        "streak_days": 0,
        "streak_best": 0,
    },
    {
        "email": "coach@hablah.app",
        "password": "123",
        "nombre": "Coach",
        "apellido": "Habláh",
        "role": UserRole.admin,
        "cefr_level": "C1",
        "plan": "bootcamp",
        "tutor_slug": None,
        "streak_days": 0,
        "streak_best": 0,
    },
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for cfg in QUICK_USERS:
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
                print(f"[update] {cfg['email']} (id={existing.id}) role={cfg['role'].value} cefr={cfg['cefr_level']}")
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
                    streak_days=cfg["streak_days"],
                    streak_best=cfg["streak_best"],
                    target_minutes_per_session=7,
                    insistent_mode_enabled=True,
                    plan=cfg["plan"],
                )
                db.add(u)
                print(f"[create] {cfg['email']} role={cfg['role'].value}")

        await db.commit()
        print("\nOK. Quick-login users listos:")
        for cfg in QUICK_USERS:
            print(f"  - {cfg['email']} / {cfg['password']}")


if __name__ == "__main__":
    asyncio.run(main())

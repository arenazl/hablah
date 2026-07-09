"""Crea/actualiza usuario joel / 123.

Idempotente: si ya existe, resetea password + nombre + role.
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from core.security import get_password_hash
from models.user import User, UserRole
from models.template import Template


CFG = {
    "email": "joel@hablah.app",
    "password": "123",
    "nombre": "Joel",
    "apellido": "",
    "role": UserRole.student,
    "cefr_level": "A0",
    "plan": "free",
    "tutor_slug": "coach",
}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(User).where(User.email == CFG["email"]))).scalar_one_or_none()
        template_id = None
        if CFG["tutor_slug"]:
            tpl = (await db.execute(select(Template).where(Template.slug == CFG["tutor_slug"]))).scalar_one_or_none()
            if tpl:
                template_id = tpl.id

        if existing:
            existing.role = CFG["role"]
            existing.nombre = CFG["nombre"]
            existing.apellido = CFG["apellido"]
            existing.cefr_level = CFG["cefr_level"]
            existing.hashed_password = get_password_hash(CFG["password"])
            if template_id:
                existing.active_template_id = template_id
            print(f"[update] {CFG['email']} (id={existing.id})")
        else:
            u = User(
                email=CFG["email"],
                hashed_password=get_password_hash(CFG["password"]),
                nombre=CFG["nombre"],
                apellido=CFG["apellido"],
                role=CFG["role"],
                cefr_level=CFG["cefr_level"],
                target_language="en",
                base_language="es",
                accent_preference="uk",
                active_template_id=template_id,
                streak_days=0,
                streak_best=0,
                target_minutes_per_session=7,
                insistent_mode_enabled=True,
                plan=CFG["plan"],
            )
            db.add(u)
            print(f"[create] {CFG['email']}")

        await db.commit()
        print(f"\nOK: {CFG['email']} / {CFG['password']}")


if __name__ == "__main__":
    asyncio.run(main())

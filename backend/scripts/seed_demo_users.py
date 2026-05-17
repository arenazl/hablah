"""Crea usuarios demo para quick-login en /login.

- admin@hablah.app / admin123 → role admin (ya existe del init_db)
- demo@hablah.app  / demo123  → role student con perfil completo
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
from models.template import Template, Topic, UserInterest, TopicProgress


DEMO_EMAIL = "demo@hablah.app"
DEMO_PASSWORD = "demo123"


async def main() -> None:
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(User).where(User.email == DEMO_EMAIL))).scalar_one_or_none()
        if existing:
            print(f"Demo user '{DEMO_EMAIL}' ya existe (id={existing.id})")
            user = existing
        else:
            sincerist = (await db.execute(select(Template).where(Template.slug == "sincerist"))).scalar_one_or_none()
            user = User(
                email=DEMO_EMAIL,
                hashed_password=get_password_hash(DEMO_PASSWORD),
                nombre="Lautaro",
                apellido="Méndez",
                role=UserRole.student,
                cefr_level="B2",
                target_language="en",
                base_language="es",
                accent_preference="uk",
                active_template_id=sincerist.id if sincerist else None,
                streak_days=12,
                streak_best=12,
                target_minutes_per_session=7,
                insistent_mode_enabled=True,
                plan="pro",
            )
            db.add(user)
            await db.flush()
            print(f"Demo user creado: {DEMO_EMAIL} / {DEMO_PASSWORD} (id={user.id})")

        # Seedeo intereses si no tiene
        existing_interests = (await db.execute(
            select(UserInterest).where(UserInterest.user_id == user.id)
        )).scalars().all()
        if not existing_interests:
            slugs = ["uk-garage", "arquitectura-software", "ableton-produccion", "viajes-aeropuertos"]
            topics = (await db.execute(select(Topic).where(Topic.slug.in_(slugs)))).scalars().all()
            for t in topics:
                db.add(UserInterest(user_id=user.id, topic_id=t.id))
            print(f"  + {len(topics)} intereses seedeados")

        # Progreso seed: UK Garage 38%
        uk = (await db.execute(select(Topic).where(Topic.slug == "uk-garage"))).scalar_one_or_none()
        if uk:
            prog = (await db.execute(
                select(TopicProgress).where(
                    TopicProgress.user_id == user.id, TopicProgress.topic_id == uk.id
                )
            )).scalar_one_or_none()
            if not prog:
                db.add(TopicProgress(
                    user_id=user.id, topic_id=uk.id,
                    stages_done=2, stages_total=6, pct=38,
                    minutes_spoken=47, sessions_count=6,
                ))
                print("  + progress UK Garage 38% seedeado")

        await db.commit()
        print("OK")


if __name__ == "__main__":
    asyncio.run(main())

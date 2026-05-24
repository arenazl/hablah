"""Backfill: usuarios con < 5 intereses reciben los 10 default automaticamente.

Tambien expone helper assign_default_interests(user_id, db) que se llama
desde POST /api/users al crear usuario nuevo.

Idempotente: si el user ya tiene alguno, no lo duplica.
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import AsyncSessionLocal
from models.user import User
from models.template import Topic, UserInterest


# 10 tópicos default que se asignan a todo nuevo user. Mix balanceado
# de 8 categorias para no concentrar el interes en una sola area.
DEFAULT_INTEREST_SLUGS = [
    "arquitectura-software",   # tech
    "ia-etica",                # tech
    "uk-garage",               # arte / musica
    "futbol-mundial",          # deportes
    "espacio-astronomia",      # ciencia
    "remoto-nomada",           # negocios / lifestyle
    "viajes-aeropuertos",      # viajes
    "asado-argentino",         # gastronomia
    "stand-up-comedia",        # arte / humor
    "moda-streetwear",         # lifestyle / moda
]


async def assign_default_interests(user_id: int, db: AsyncSession) -> int:
    """Agrega los DEFAULT_INTEREST_SLUGS al user si no los tiene ya.

    Returns la cantidad de intereses agregados.
    """
    # Tópicos default por slug
    topics_res = await db.execute(select(Topic).where(Topic.slug.in_(DEFAULT_INTEREST_SLUGS)))
    topics = {t.slug: t for t in topics_res.scalars().all()}

    # Intereses que el user ya tiene
    existing_res = await db.execute(select(UserInterest.topic_id).where(UserInterest.user_id == user_id))
    existing_topic_ids = {row[0] for row in existing_res.all()}

    # Posición de partida (para que aparezcan al final si ya tiene otros)
    pos_res = await db.execute(
        select(func.coalesce(func.max(UserInterest.position), -1)).where(UserInterest.user_id == user_id)
    )
    next_pos = (pos_res.scalar() or -1) + 1

    added = 0
    for slug in DEFAULT_INTEREST_SLUGS:
        topic = topics.get(slug)
        if not topic:
            continue
        if topic.id in existing_topic_ids:
            continue
        db.add(UserInterest(user_id=user_id, topic_id=topic.id, position=next_pos))
        next_pos += 1
        added += 1

    return added


async def backfill() -> None:
    """Para CADA user con < 5 intereses, completa hasta 10 con los defaults."""
    async with AsyncSessionLocal() as db:
        # Users adultos con conteo de intereses
        users_res = await db.execute(
            select(User.id, User.email, User.nombre, func.count(UserInterest.id).label("n"))
            .outerjoin(UserInterest, UserInterest.user_id == User.id)
            .where(User.parent_user_id == None)  # noqa: E711
            .group_by(User.id, User.email, User.nombre)
            .having(func.count(UserInterest.id) < 5)
            .order_by(User.id)
        )
        rows = users_res.all()
        if not rows:
            print("Todos los usuarios ya tienen 5+ intereses, nada que hacer.")
            return

        total_added = 0
        for row in rows:
            uid, email, nombre, n = row
            added = await assign_default_interests(uid, db)
            total_added += added
            print(f"  [{nombre or '?':15s}] tenia {n} -> +{added} agregados")

        await db.commit()
        print(f"\nOK - {len(rows)} usuarios actualizados, +{total_added} intereses agregados en total")


if __name__ == "__main__":
    asyncio.run(backfill())

"""Seed del catálogo jerárquico a partir de los tópicos existentes.

Toma los `topics.category` (string plano de hoy) y arma la jerarquía:
  - una Categoría por cada string distinto (con nombre amigable),
  - una Subcategoría "General" por defecto dentro de cada una,
  - linkea cada tópico a su category_id + subcategory_id.

Las subcategorías reales se curan después desde el ABM. Idempotente.
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, text
from core.database import AsyncSessionLocal
from models.methodology import Category, Subcategory
from models.template import Topic

FRIENDLY = {
    "kids": "Kids", "arte": "Arte", "deportes": "Deportes", "tech": "Tecnología",
    "viajes": "Viajes", "ciencia": "Ciencia", "peliculas": "Películas", "moda": "Moda",
    "fitness": "Fitness", "animales": "Animales", "comida": "Comida",
    "videojuegos": "Videojuegos", "musica": "Música", "lifestyle": "Estilo de vida",
    "negocios": "Negocios", "gastronomia": "Gastronomía", "general": "General",
    "kids-deprecated": "Kids (deprecado)",
}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        cats = [r[0] for r in (await db.execute(
            text("SELECT DISTINCT category FROM topics WHERE category IS NOT NULL AND category != ''")
        )).all()]
        print(f"Categorías distintas en topics: {len(cats)}")

        for i, slug in enumerate(sorted(cats)):
            name = FRIENDLY.get(slug, slug.replace("-", " ").capitalize())
            active = slug != "kids-deprecated"
            cat = (await db.execute(select(Category).where(Category.slug == slug))).scalar_one_or_none()
            if not cat:
                cat = Category(slug=slug, name=name, sort_order=i, active=active)
                db.add(cat)
                await db.flush()
                print(f"  [new cat] {slug} -> {name}")
            else:
                cat.name, cat.sort_order, cat.active = name, i, active

            sub = (await db.execute(select(Subcategory).where(
                Subcategory.category_id == cat.id, Subcategory.slug == "general"
            ))).scalar_one_or_none()
            if not sub:
                sub = Subcategory(category_id=cat.id, slug="general", name="General", sort_order=0)
                db.add(sub)
                await db.flush()

            # Linkear los tópicos de esa categoría
            topics = (await db.execute(select(Topic).where(Topic.category == slug))).scalars().all()
            for t in topics:
                t.category_id = cat.id
                t.subcategory_id = sub.id
            print(f"  [link]    {slug}: {len(topics)} tópicos -> cat#{cat.id}/sub#{sub.id}")
        await db.commit()
    print("\nOK — seed_catalog completo")


if __name__ == "__main__":
    asyncio.run(main())

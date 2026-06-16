"""Borra tópico(s) del catálogo por término en title/slug.

No hay FK constraints reales sobre topics (los modelos usan Integer suelto), así que
el DELETE no rompe; las referencias en sessions/user_interests quedan huérfanas sin error.
Uso: python scripts/borrar_topic.py <término>   (ej: garage)
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, or_
from core.database import AsyncSessionLocal
from models.template import Topic


async def main() -> None:
    term = sys.argv[1] if len(sys.argv) > 1 else None
    if not term:
        print("uso: python scripts/borrar_topic.py <término>")
        return
    like = f"%{term}%"
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            select(Topic).where(or_(Topic.title.ilike(like), Topic.slug.ilike(like)))
        )).scalars().all()
        if not rows:
            print(f"no hay tópicos que matcheen '{term}'")
            return
        for t in rows:
            print(f"  [del] id={t.id} title='{t.title}' slug='{t.slug}'")
            await db.delete(t)
        await db.commit()
        print(f"\nOK - {len(rows)} tópico(s) borrado(s) por término '{term}'")


if __name__ == "__main__":
    asyncio.run(main())

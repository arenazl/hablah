"""Listado de topicos kids agrupados por age_group. Read-only."""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.template import Topic


async def main():
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(
            select(Topic).where(Topic.category == "kids")
            .order_by(Topic.kid_age_group, Topic.id)
        )).scalars().all()

        by_group: dict[str, list] = {"mini": [], "junior": [], "tween": [], "other": []}
        for t in rows:
            g = t.kid_age_group or "other"
            by_group.setdefault(g, []).append(t)

        for grp in ["mini", "junior", "tween", "other"]:
            items = by_group.get(grp, [])
            if not items:
                continue
            label = {
                "mini": "MINI (4-7 anos)",
                "junior": "JUNIOR (7-10 anos)",
                "tween": "TWEEN (10-14 anos)",
                "other": "SIN GRUPO ETARIO",
            }[grp]
            print(f"\n{'='*60}")
            print(f"{label}  ({len(items)} topicos)")
            print(f"{'='*60}")
            for t in items:
                hot = " HOT" if t.is_hot else ""
                act = "" if t.is_active else " [inactivo]"
                print(f"  #{t.id} {t.title} ({t.slug}){hot}{act}")
                if t.keywords:
                    kws = ", ".join(t.keywords[:5])
                    print(f"      kws: {kws}")

        print(f"\n\nTOTAL kids topicos: {len(rows)}")


if __name__ == "__main__":
    asyncio.run(main())

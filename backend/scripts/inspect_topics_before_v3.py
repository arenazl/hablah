"""Inspección READ-ONLY de la tabla topics antes del volcado v3.

No escribe nada. Solo reporta el estado actual para diseñar el volcado sin sorpresas:
cuántos activos, qué valores toman segmento/kid_age_group/audience/category, y
cómo está hoy poblado el par keywords/generated_vocab (para no cargar en el campo equivocado).
"""
import sys
import os
import asyncio
from collections import Counter

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, func
from core.database import AsyncSessionLocal
from models.template import Topic


async def main() -> None:
    async with AsyncSessionLocal() as db:
        total = (await db.execute(select(func.count(Topic.id)))).scalar_one()
        activos = (await db.execute(select(func.count(Topic.id)).where(Topic.is_active == True))).scalar_one()  # noqa: E712
        print(f"TOTAL topics: {total}  |  ACTIVOS: {activos}  |  inactivos: {total - activos}")

        rows = (await db.execute(select(Topic))).scalars().all()

        def dist(attr: str) -> Counter:
            return Counter(str(getattr(r, attr)) for r in rows if r.is_active)

        for f in ("segmento", "kid_age_group", "audience", "category"):
            print(f"\n[{f}] (solo activos):")
            for val, n in dist(f).most_common():
                print(f"   {val!r}: {n}")

        # ¿Cómo está poblada la semilla hoy? keywords vs generated_vocab
        print("\n[semilla actual — activos]:")
        con_kw = sum(1 for r in rows if r.is_active and r.keywords)
        con_gv = sum(1 for r in rows if r.is_active and r.generated_vocab)
        con_pin = sum(1 for r in rows if r.is_active and r.pinned_vocabulary)
        print(f"   con keywords: {con_kw}  |  con generated_vocab: {con_gv}  |  con pinned_vocabulary: {con_pin}")

        # Muestra de 3 activos para ver la forma real de los datos
        print("\n[muestra de 3 activos]:")
        for r in [x for x in rows if x.is_active][:3]:
            print(f"   id={r.id} slug={r.slug!r} seg={r.segmento!r} kag={r.kid_age_group!r} "
                  f"aud={r.audience!r} cat={r.category!r} levels={r.levels}")
            print(f"      keywords={r.keywords}")
            print(f"      generated_vocab={r.generated_vocab}")


if __name__ == "__main__":
    asyncio.run(main())

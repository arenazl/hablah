"""Inspección READ-ONLY de cobertura teen por nivel (WO F0-06). No escribe nada.

Reporta: todos los tópicos activos con segmento='teen' (kid_age_group='tween'),
sus levels[], keywords, generated_vocab; y cuántos quedan activos por nivel CEFR
(para confirmar el hueco B1/B2 medido en 02-hoja-de-ruta.md antes de proponer nada).
"""
import sys
import os
import asyncio
from collections import Counter

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.template import Topic

ALL_LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(Topic))).scalars().all()

        teen_active = [r for r in rows if r.is_active and (r.segmento == "teen" or r.kid_age_group == "tween")]
        teen_inactive = [r for r in rows if not r.is_active and (r.segmento == "teen" or r.kid_age_group == "tween")]

        print(f"Tópicos teen ACTIVOS: {len(teen_active)}  |  inactivos: {len(teen_inactive)}\n")

        per_level = Counter()
        print("=== Detalle tópicos teen activos ===")
        for r in sorted(teen_active, key=lambda t: t.title):
            lv = r.levels or []
            for L in lv:
                per_level[L] += 1
            print(f"\nid={r.id} slug={r.slug!r}")
            print(f"  title={r.title!r}")
            print(f"  levels={lv}  category={r.category!r}  audience={r.audience!r} segmento={r.segmento!r} kid_age_group={r.kid_age_group!r}")
            print(f"  keywords[:6]={ (r.keywords or [])[:6] }")
            gv = r.generated_vocab or []
            print(f"  generated_vocab ({len(gv)}): {gv}")

        print("\n=== Conteo de tópicos teen activos por nivel CEFR ===")
        for L in ALL_LEVELS:
            print(f"  {L}: {per_level.get(L, 0)}")

        print("\n=== Tópicos teen INACTIVOS (por si sirven para reactivar/extender) ===")
        for r in sorted(teen_inactive, key=lambda t: t.title):
            print(f"  id={r.id} title={r.title!r} levels={r.levels} keywords[:6]={(r.keywords or [])[:6]}")


if __name__ == "__main__":
    asyncio.run(main())

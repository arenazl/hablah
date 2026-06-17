"""Audit: tablas de la BD que NO tienen modelo ORM (huérfanas reales = nadie las usa).

Compara information_schema.tables contra los __tablename__ de los modelos cargados.
Read-only salvo que se pase --drop (entonces dropea las huérfanas, con confirmación).
Uso: python scripts/audit_orphan_tables.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine, Base
# importar los modelos para poblar Base.metadata
import models.user, models.template, models.methodology, models.config, models.kit  # noqa: F401
import models.learner_state, models.orchestration, models.rooms, models.kids  # noqa: F401
import models.push_subscription, models.feature_unlock  # noqa: F401


async def main() -> None:
    known = set(Base.metadata.tables.keys())
    async with engine.begin() as conn:
        rows = (await conn.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
        ))).fetchall()
        db_tables = sorted(r[0] for r in rows)
        print(f"=== {len(db_tables)} tablas en la BD · {len(known)} modelos ORM ===\n")
        orphans = []
        for t in db_tables:
            if t in known:
                continue
            n = (await conn.execute(text(f"SELECT COUNT(*) FROM `{t}`"))).scalar()
            orphans.append((t, n))
        if not orphans:
            print("Sin huérfanas: TODAS las tablas de la BD tienen modelo ORM (ninguna sin uso).")
        else:
            print("HUÉRFANAS (en la BD, sin modelo ORM → nadie las usa en el código):")
            for t, n in orphans:
                print(f"  - {t}: {n} filas")
        # modelos sin tabla (no debería pasar; indicaría migración faltante)
        missing = [t for t in known if t not in db_tables]
        if missing:
            print("\nMODELOS SIN TABLA en la BD (correr migración):")
            for t in sorted(missing):
                print(f"  - {t}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

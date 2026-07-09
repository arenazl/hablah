"""Migración v30 — DROP de admin_directives.

La feature "evolución de directivas" (el admin sumaba reglas-parche al coach en vivo) se
ELIMINÓ: contradice el modelo de 9 pasos (la conducta sale del DATO del catálogo, no de
parches apilados). Lo reemplaza la Mesa de control (editar el catálogo). Idempotente.
Uso: python scripts/migrate_v30_drop_admin_directives.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        n = (await conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() "
            "AND table_name = 'admin_directives'"
        ))).scalar()
        if not n:
            print("  [skip] admin_directives no existe")
        else:
            rows = (await conn.execute(text("SELECT COUNT(*) FROM admin_directives"))).scalar()
            await conn.execute(text("DROP TABLE IF EXISTS admin_directives"))
            print(f"  [drop] admin_directives ({rows} filas)")
    await engine.dispose()
    print("OK - migrate_v30")


if __name__ == "__main__":
    asyncio.run(main())

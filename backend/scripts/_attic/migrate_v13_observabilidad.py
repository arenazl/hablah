"""v13: Observabilidad durable — persistir el circuito + prompt final por sesion.

Heroku stdout es efimero (rota ~1500 lineas): el prompt de cada clase se perdia.
Sin el prompt+circuito guardado no se puede auditar por que una clase salio como
salio. Agrega 2 columnas a `sessions`:
  - prompt_circuit JSON: las 4 patas RESUELTAS (topico, riel+ai_restraints,
    coach+enfoque, alumno) + modo del composer + junction si/no.
  - prompt_final MEDIUMTEXT: el systemInstruction exacto que recibio el LLM.

Idempotente y 100% ADITIVO. No toca ni borra nada.

Uso: python scripts/migrate_v13_observabilidad.py
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine

COLS = {
    "sessions": [
        ("prompt_circuit", "JSON NULL"),
        ("prompt_final",   "MEDIUMTEXT NULL"),
    ],
}


async def main() -> None:
    async with engine.begin() as conn:
        for table, cols in COLS.items():
            for col, ddl in cols:
                exists = (await conn.execute(text(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c"
                ), {"t": table, "c": col})).scalar()
                if exists:
                    print(f"[skip] {table}.{col} ya existe")
                else:
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
                    print(f"[ok] {table}.{col} agregada")
    print("\nOK - migrate_v13 (observabilidad durable) completo")


if __name__ == "__main__":
    asyncio.run(main())

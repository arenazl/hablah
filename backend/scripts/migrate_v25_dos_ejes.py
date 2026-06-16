"""Migración v25 — modelo de 2 ejes: currículum por NIVEL + forma/pedagogía por EDAD.

Aditiva e idempotente (chequea information_schema antes de ADD COLUMN). NO dropea
nada: el retiro de las combinatorias (topic_module_content, methodology_modules,
methodology_stages) va al final, después de mudar el contenido a los ejes y
reapuntar el composer — para no cortar una clase en vivo.

  levels (eje NIVEL):  curriculum_grammar, expected_production, duration_base_minutes
  student_types (EDAD): pedagogy, form_rules, duration_adjust_minutes

Uso: python scripts/migrate_v25_dos_ejes.py   (o heroku run ...)
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine

ADDS = {
    "levels": [
        ("curriculum_grammar", "TEXT"),
        ("expected_production", "TEXT"),
        ("duration_base_minutes", "INT"),
    ],
    "student_types": [
        ("pedagogy", "TEXT"),
        ("form_rules", "TEXT"),
        ("duration_adjust_minutes", "INT"),
    ],
}


async def main() -> None:
    async with engine.begin() as conn:
        for table, cols in ADDS.items():
            for col, typ in cols:
                r = await conn.execute(text(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:t AND COLUMN_NAME=:c"
                ), {"t": table, "c": col})
                if r.scalar_one() == 0:
                    await conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {typ} NULL"))
                    print(f"  [ok] {table}.{col}")
                else:
                    print(f"  [skip] {table}.{col}")
    print("\nOK - migrate_v25 completo (modelo de 2 ejes: columnas aditivas)")


if __name__ == "__main__":
    asyncio.run(main())

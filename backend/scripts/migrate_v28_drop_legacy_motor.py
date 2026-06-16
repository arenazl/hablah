"""Migración v28 — DROP de las 3 tablas-cruce legacy del motor.

El motor de 9 pasos quedó como camino ÚNICO: compone el prompt apilando los 2 ejes
(student_types = EDAD, levels = NIVEL) + el tópico. Las tablas-cruce viejas eran
combinatoria por (tipo×nivel) que rompía el modelo y ya no se consultan en runtime:

  methodology_modules    (19 filas)  → el "riel" por (tipo×nivel×orden). Reemplazado
                                        por levels.curriculum_grammar + student_types.form_rules.
  topic_module_content   (0 filas)   → junction tópico×módulo. El léxico sale del tópico.
  methodology_stages     (10 filas)  → "etapas" kids (Saludos/Colores), eran tópicos.

DROP = borra contenido + tabla. Idempotente (IF EXISTS). Uso:
  python scripts/migrate_v28_drop_legacy_motor.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine

LEGACY_TABLES = ["topic_module_content", "methodology_modules", "methodology_stages"]


async def main() -> None:
    async with engine.begin() as conn:
        for tbl in LEGACY_TABLES:
            n = (await conn.execute(text(f"SELECT COUNT(*) FROM information_schema.tables "
                                         f"WHERE table_schema = DATABASE() AND table_name = '{tbl}'"))).scalar()
            if not n:
                print(f"  [skip] {tbl} no existe")
                continue
            rows = (await conn.execute(text(f"SELECT COUNT(*) FROM `{tbl}`"))).scalar()
            await conn.execute(text(f"DROP TABLE IF EXISTS `{tbl}`"))
            print(f"  [drop] {tbl} ({rows} filas borradas)")
    await engine.dispose()
    print("OK - migrate_v28: tablas-cruce legacy eliminadas (motor de 9 pasos = camino único)")


if __name__ == "__main__":
    asyncio.run(main())

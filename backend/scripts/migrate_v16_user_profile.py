"""Migración v16 — Perfil extendido del alumno para el motor adaptativo.

Agrega los campos que captura el onboarding (4-5 preguntas) y que alimentan
la pata ALUMNO del compositor de prompt. El alumno nunca ve CEFR: elige una
descripción propia que el sistema mapea internamente.

users:
  age_group          VARCHAR(20)   teen | young_adult | adult | senior
  english_self_level VARCHAR(40)   nivel descriptivo elegido en onboarding
  learning_goal      VARCHAR(60)   trabajo | viajes | hobby | estudio | migracion
  occupation         VARCHAR(120)  texto libre ("ingeniero", "jubilado"…)
  onboarding_done    TINYINT(1)    si completó el onboarding (default 0)
"""
import asyncio, sys, os

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


COLS = [
    ("age_group",          "VARCHAR(20) NULL"),
    ("english_self_level", "VARCHAR(40) NULL"),
    ("learning_goal",      "VARCHAR(60) NULL"),
    ("occupation",         "VARCHAR(120) NULL"),
    ("onboarding_done",    "TINYINT(1) NOT NULL DEFAULT 0"),
]


async def add_if_missing(conn, table: str, col: str, defn: str) -> None:
    r = await conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:t AND COLUMN_NAME=:c"
        ),
        {"t": table, "c": col},
    )
    if r.scalar_one() > 0:
        print(f"  [skip] {table}.{col}")
        return
    await conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {defn}"))
    print(f"  [ok]   {table}.{col}")


async def main() -> None:
    async with engine.begin() as conn:
        print("users:")
        for col, defn in COLS:
            await add_if_missing(conn, "users", col, defn)
    print("\nOK — migrate_v16 completo")


if __name__ == "__main__":
    asyncio.run(main())

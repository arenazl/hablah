"""Migración v16 — Perfil extendido del alumno para el motor adaptativo.

Agrega/amplía los campos que captura el onboarding (4-5 preguntas) y que
alimentan la pata ALUMNO del compositor de prompt.

users:
  age_group          VARCHAR(20)   mini | junior | tween (kids) | teen | young_adult | adult | senior
                                   — columna ya existía como VARCHAR(10); se amplía a 20.
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

# Columnas a ADD si no existen
ADD_COLS = [
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


async def widen_age_group(conn) -> None:
    """age_group existe como VARCHAR(10); necesitamos VARCHAR(20) para 'young_adult'."""
    r = await conn.execute(
        text(
            "SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='age_group'"
        )
    )
    row = r.scalar_one_or_none()
    if row is None:
        await conn.execute(text("ALTER TABLE `users` ADD COLUMN `age_group` VARCHAR(20) NULL"))
        print("  [ok]   users.age_group (nuevo)")
    elif int(row) < 20:
        await conn.execute(text("ALTER TABLE `users` MODIFY COLUMN `age_group` VARCHAR(20) NULL"))
        print(f"  [ok]   users.age_group ampliado {row}→20")
    else:
        print(f"  [skip] users.age_group (ya es VARCHAR({row}))")


async def main() -> None:
    async with engine.begin() as conn:
        print("users:")
        await widen_age_group(conn)
        for col, defn in ADD_COLS:
            await add_if_missing(conn, "users", col, defn)
    print("\nOK — migrate_v16 completo")


if __name__ == "__main__":
    asyncio.run(main())

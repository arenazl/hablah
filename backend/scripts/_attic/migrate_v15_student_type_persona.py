"""Migración v15 — Identidad de tutor en student_types + narrativa en topic_module_content.

Agrega los campos que permiten que cada tipo de alumno tenga su propia
identidad de tutor editable desde el backoffice (los bloques 2, 3, 4 del
composer_proto que hoy están hardcodeados).

student_types:
  tutor_mascot          VARCHAR(120) — nombre del personaje ("HABI", "Sparky")
  tutor_identity        TEXT         — descripción de quién es el tutor
  tutor_tonal_rules     TEXT         — reglas tonales (cómo habla)
  session_focus         TEXT         — el mundo/enfoque de la sesión

topic_module_content:
  story_spine           TEXT         — narrativa de la clase (bloque 8)
  start_trigger         TEXT         — comando de arranque (bloque 9)

Idempotente: usa ALTER IGNORE / IF NOT EXISTS.
"""
import asyncio
import sys
import os

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


STUDENT_TYPE_COLS = [
    ("tutor_mascot",      "VARCHAR(120) NULL"),
    ("tutor_identity",    "TEXT NULL"),
    ("tutor_tonal_rules", "TEXT NULL"),
    ("session_focus",     "TEXT NULL"),
]

TOPIC_MODULE_COLS = [
    ("story_spine",    "TEXT NULL"),
    ("start_trigger",  "TEXT NULL"),
]


async def add_column_if_missing(conn, table: str, col: str, definition: str) -> None:
    result = await conn.execute(
        text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() "
            "AND TABLE_NAME = :t AND COLUMN_NAME = :c"
        ),
        {"t": table, "c": col},
    )
    exists = result.scalar_one() > 0
    if exists:
        print(f"  [skip] {table}.{col} ya existe")
        return
    await conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {definition}"))
    print(f"  [ok]   {table}.{col} agregada")


async def main() -> None:
    async with engine.begin() as conn:
        print("student_types:")
        for col, defn in STUDENT_TYPE_COLS:
            await add_column_if_missing(conn, "student_types", col, defn)

        print("topic_module_content:")
        for col, defn in TOPIC_MODULE_COLS:
            await add_column_if_missing(conn, "topic_module_content", col, defn)

    print("\nOK — migrate_v15 completo")


if __name__ == "__main__":
    asyncio.run(main())

"""Migración v1: crea tablas nuevas de Habláh + agrega columnas a users.

Idempotente: chequea si la columna existe antes de crearla.
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text

from core.database import engine, Base
import models  # noqa: F401 — registra todas las tablas


USER_NEW_COLUMNS = [
    ("cefr_level", "VARCHAR(4) NOT NULL DEFAULT 'B1'"),
    ("target_language", "VARCHAR(20) NOT NULL DEFAULT 'en'"),
    ("base_language", "VARCHAR(20) NOT NULL DEFAULT 'es'"),
    ("accent_preference", "VARCHAR(40) NOT NULL DEFAULT 'uk'"),
    ("active_template_id", "INT NULL"),
    ("streak_days", "INT NOT NULL DEFAULT 0"),
    ("streak_best", "INT NOT NULL DEFAULT 0"),
    ("last_session_at", "DATETIME NULL"),
    ("target_minutes_per_session", "INT NOT NULL DEFAULT 7"),
    ("insistent_mode_enabled", "TINYINT(1) NOT NULL DEFAULT 1"),
    ("daily_reminder_enabled", "TINYINT(1) NOT NULL DEFAULT 0"),
    ("audio_retention_days", "INT NOT NULL DEFAULT 30"),
    ("plan", "VARCHAR(40) NOT NULL DEFAULT 'free'"),
]


async def add_columns_if_missing() -> None:
    async with engine.begin() as conn:
        existing = await conn.execute(
            text(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
            )
        )
        cols = {row[0] for row in existing.fetchall()}
        for col, ddl in USER_NEW_COLUMNS:
            if col in cols:
                continue
            print(f"  ALTER users ADD COLUMN {col}")
            await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {ddl}"))


async def fix_role_enum() -> None:
    """El enum viejo tenía 4 valores (admin/gerente/coordinador/vendedor).
    Lo reemplazamos por (admin/student). MySQL convierte valores fuera del
    nuevo enum a string vacío — los pasamos a 'student' antes del ALTER."""
    async with engine.begin() as conn:
        result = await conn.execute(
            text(
                "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'"
            )
        )
        row = result.fetchone()
        if not row:
            return
        current = row[0]  # "enum('admin','student')" o vieja
        target = "enum('admin','student')"
        if current.lower() == target:
            return
        print(f"  Migrando role enum: {current} → {target}")
        await conn.execute(
            text(
                "UPDATE users SET role='student' "
                "WHERE role NOT IN ('admin', 'student')"
            )
        )
        await conn.execute(
            text("ALTER TABLE users MODIFY COLUMN role ENUM('admin','student') NOT NULL DEFAULT 'student'")
        )


async def main() -> None:
    print("=== Migración v1 ===")
    print("1) Crear tablas nuevas (create_all idempotente)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("   OK")
    print("2) Fix role enum...")
    await fix_role_enum()
    print("3) Agregar columnas nuevas a users...")
    await add_columns_if_missing()
    print("=== Migración v1 completada ===")


if __name__ == "__main__":
    asyncio.run(main())

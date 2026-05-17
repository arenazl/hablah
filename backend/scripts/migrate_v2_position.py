"""Migración v2: agregar columna `position` a user_interests + backfill por added_at."""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        # ¿Ya existe la columna?
        r = await conn.execute(text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_interests' AND COLUMN_NAME = 'position'"
        ))
        if r.fetchone():
            print("Columna 'position' ya existe.")
        else:
            await conn.execute(text(
                "ALTER TABLE user_interests ADD COLUMN position INT NOT NULL DEFAULT 0"
            ))
            print("Columna 'position' agregada.")

        # Backfill: para cada user_id, ordenar por added_at y asignar position 0..N
        users = (await conn.execute(text(
            "SELECT DISTINCT user_id FROM user_interests"
        ))).fetchall()
        for (uid,) in users:
            rows = (await conn.execute(text(
                "SELECT id FROM user_interests WHERE user_id = :uid ORDER BY added_at, id"
            ), {"uid": uid})).fetchall()
            for idx, (row_id,) in enumerate(rows):
                await conn.execute(text(
                    "UPDATE user_interests SET position = :p WHERE id = :id"
                ), {"p": idx, "id": row_id})
            print(f"  user_id={uid}: {len(rows)} intereses ordenados")

    print("Migración v2 OK")


if __name__ == "__main__":
    asyncio.run(main())

"""v12: Motor Pedagógico Adaptativo — esquema (tablas nuevas + columnas).

Idempotente y 100% ADITIVO. Crea las tablas de la ontología nueva
(student_types, methodology_modules, topic_module_content) y agrega columnas a
topics/templates/users. NO toca ni borra nada existente: el prompt viejo sigue
armándose porque ningún código lee estas tablas/columnas todavía.

Uso: heroku run python scripts/migrate_v12_motor_pedagogico.py
(la BD Aiven no acepta conexiones desde fuera de la infra).
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine
from models.methodology import StudentType, MethodologyModule, TopicModuleContent  # noqa: F401

# Columnas aditivas por tabla. JSON sobre tablas existentes va NULL (MySQL no
# acepta DEFAULT literal en JSON).
COLS = {
    "topics": [
        ("audience",             "VARCHAR(10) NOT NULL DEFAULT 'adult'"),
        ("is_curriculum",        "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("pinned_vocabulary",    "JSON NULL"),
        ("target_structure",     "VARCHAR(200) NULL"),
        ("target_structure_es",  "VARCHAR(200) NULL"),
        ("mastery_criteria",     "VARCHAR(300) NULL"),
    ],
    "templates": [
        ("curriculum_mode",      "VARCHAR(20) NULL"),
        ("identity_description", "TEXT NULL"),
    ],
    "users": [
        ("curriculum_position",  "INT NOT NULL DEFAULT 1"),
    ],
}


async def main() -> None:
    async with engine.begin() as conn:
        # 1) Tablas nuevas (checkfirst: no las recrea si existen).
        for model in (StudentType, MethodologyModule, TopicModuleContent):
            await conn.run_sync(model.__table__.create, checkfirst=True)
            print(f"[ok] tabla {model.__tablename__} lista")

        # 2) Columnas aditivas (chequea information_schema antes de cada ALTER).
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

        # 3) Backfill seguro (reproduce el comportamiento actual):
        #    - users.curriculum_position <- kid_methodology_order (kids).
        await conn.execute(text(
            "UPDATE users SET curriculum_position = kid_methodology_order "
            "WHERE kid_methodology_order IS NOT NULL"
        ))
        #    - topics.audience='kid' donde hoy es kids.
        await conn.execute(text(
            "UPDATE topics SET audience='kid' "
            "WHERE category='kids' OR kid_age_group IS NOT NULL"
        ))
        print("[ok] backfill curriculum_position + topics.audience")

    print("\nOK - migrate_v12 (esquema Motor Pedagógico) completo")


if __name__ == "__main__":
    asyncio.run(main())

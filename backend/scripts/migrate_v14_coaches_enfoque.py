"""v14: segmento + enfoque en los coaches (templates).

- ADD columnas `segmento` y `enfoque` (idempotente).
- Backfill segmento por slug: coach/sincerist/arcade -> adultos; friend -> mini.
- Siembra el ENFOQUE de niños (la receta del dueño) en 'friend'.

El enfoque = cómo lleva la clase (narrativa/pedagogía del segmento). El NIVEL
(restraints) sigue en metodología; el enfoque vive en el coach.

Uso: heroku run python scripts/migrate_v14_coaches_enfoque.py
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text, select
from core.database import engine, AsyncSessionLocal
from models.template import Template

ENFOQUE_NINOS = (
    "Enfoque para un nene chiquito: explicale el mundo con palabras simples, dale ejemplos "
    "concretos de su día, metele alguna broma o algo divertido para que se enganche, y SOBRE "
    "TODO andá UNIENDO las palabras que va aprendiendo en una frasecita (no palabras sueltas). "
    "La clase es un CUENTO/AVENTURA donde él es el protagonista y la historia avanza turno a turno."
)

SEGMENTO_BY_SLUG = {
    "coach": "adultos", "sincerist": "adultos", "arcade": "adultos",
    "friend": "mini",
}


async def main() -> None:
    async with engine.begin() as conn:
        for col, ddl in (("segmento", "VARCHAR(12) NULL"), ("enfoque", "TEXT NULL")):
            exists = (await conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'templates' AND COLUMN_NAME = :c"
            ), {"c": col})).scalar()
            if exists:
                print(f"[skip] templates.{col} ya existe")
            else:
                await conn.execute(text(f"ALTER TABLE templates ADD COLUMN {col} {ddl}"))
                print(f"[ok] templates.{col} agregada")

    async with AsyncSessionLocal() as db:
        # default: lo que no esté mapeado -> adultos
        for slug, seg in SEGMENTO_BY_SLUG.items():
            t = (await db.execute(select(Template).where(Template.slug == slug))).scalar_one_or_none()
            if not t:
                continue
            t.segmento = seg
            if slug == "friend":
                t.enfoque = ENFOQUE_NINOS
            print(f"[ok] coach {slug} -> segmento={seg}" + (" + enfoque niños" if slug == "friend" else ""))
        # cualquier coach sin segmento -> adultos
        rest = (await db.execute(select(Template).where(Template.segmento.is_(None)))).scalars().all()
        for t in rest:
            t.segmento = "adultos"
            print(f"[ok] coach {t.slug} (sin map) -> adultos")
        await db.commit()

    print("\nOK - migrate_v14 (segmento + enfoque en coaches) completo")


if __name__ == "__main__":
    asyncio.run(main())

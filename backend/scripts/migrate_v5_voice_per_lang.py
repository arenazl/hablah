"""Agrega voice_id_en / voice_id_es / voice_id_pt a templates + seedea por tutor.

Idempotente: chequea cada columna antes de crear.
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text, select
from core.database import engine, AsyncSessionLocal
from models.template import Template


# Mapping voces por (tutor_slug, lang)
VOICES = {
    "coach": {
        "en": ("EXAVITQu4vr4xnSDxMaL", "Sarah (EN, cálida)"),
        "es": ("yA5jrK1S9cpCAojBYyMu", "Lucia (ES, expresiva)"),
        "pt": ("AGNkIY6dMkIkc3g53Rdb", "Rafael Silva (PT-BR)"),
    },
    "sincerist": {
        "en": ("onwK4e9ZLuTAKqWW03F9", "Daniel (EN, broadcaster)"),
        "es": ("QK4xDwo9ESPHA4JNUpX3", "Tomás (ES-AR)"),
        "pt": ("soegYoc6KNWiqSWuHJUm", "Kauan (PT-BR)"),
    },
    "arcade": {
        "en": ("FGY2WhTYpPnrIDTdsKH5", "Laura (EN, energética)"),
        "es": ("9rvdnhrYoXoUt4igKpBw", "Mariana (ES, intima)"),
        "pt": ("fhtZMBwha5du5OxuvexO", "Malu (PT-BR, casual)"),
    },
}


async def main() -> None:
    # 1) Migration: agregar columnas si no existen
    async with engine.begin() as conn:
        for col in ("voice_id_en", "voice_id_es", "voice_id_pt"):
            exists = (await conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                f"WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'templates' AND COLUMN_NAME = '{col}'"
            ))).scalar()
            if exists:
                print(f"[skip] columna {col} ya existe")
            else:
                await conn.execute(text(f"ALTER TABLE templates ADD COLUMN {col} VARCHAR(80) NULL"))
                print(f"[ok] columna {col} agregada")

    # 2) Seed por tutor
    async with AsyncSessionLocal() as db:
        for slug, voices_by_lang in VOICES.items():
            tpl = (await db.execute(select(Template).where(Template.slug == slug))).scalar_one_or_none()
            if not tpl:
                print(f"[warn] template '{slug}' no existe")
                continue
            for lang, (vid, label) in voices_by_lang.items():
                setattr(tpl, f"voice_id_{lang}", vid)
            print(f"[ok] {slug}: en/es/pt actualizados")
        await db.commit()

    print("\nOK - migrate_v5 completo")


if __name__ == "__main__":
    asyncio.run(main())

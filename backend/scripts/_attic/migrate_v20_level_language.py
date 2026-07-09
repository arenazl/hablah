"""Migración v20 — mueve la regla de idioma al NIVEL (donde corresponde).

El idioma del coach depende SOLO del nivel → vive en levels.language_rule (no
duplicado en el riel por segmento). Agrega la columna + la seedea. Aditiva.
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, text
from core.database import engine, AsyncSessionLocal
from models.methodology import Level

LANGUAGE_BY_LEVEL = {
    "A0": ("Idioma de instrucción del coach: 100% ESPAÑOL. Lo ÚNICO en inglés es la palabra "
           "objetivo del día. NUNCA traduzcas tus consignas, cues ni explicaciones al inglés "
           "(decí \"ahora vos\", NUNCA \"now you\")."),
    "A1": ("Instrucción mayormente en español. Introducí frases-meta cortas en inglés (2-3 "
           "palabras) que el alumno repite; tus consignas y explicaciones siguen en español."),
    "A2": ("Mitad español, mitad inglés. El alumno produce frases simples en inglés; vos "
           "explicás/rescatás en español sólo cuando se traba."),
    "B1": ("Mayormente en inglés. Español SOLO como rescate puntual si el alumno se traba. "
           "Velocidad normal."),
    "B2": ("100% inglés. Sin español. Recast natural de los errores, sin cortar la fluidez."),
    "C1": ("100% inglés. Registro, matices, ironía. Par intelectual."),
    "C2": ("100% inglés nativo. Pulido fino de matices y registro."),
}


async def main() -> None:
    async with engine.begin() as conn:
        r = await conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='levels' AND COLUMN_NAME='language_rule'"
        ))
        if r.scalar_one() == 0:
            await conn.execute(text("ALTER TABLE `levels` ADD COLUMN `language_rule` TEXT NULL"))
            print("  [ok] levels.language_rule")
        else:
            print("  [skip] levels.language_rule")

    async with AsyncSessionLocal() as db:
        for lv in (await db.execute(select(Level))).scalars().all():
            rule = LANGUAGE_BY_LEVEL.get(lv.code)
            if rule:
                lv.language_rule = rule
                print(f"  [seed] {lv.code}")
        await db.commit()
    print("\nOK — migrate_v20 completo (idioma en niveles)")


if __name__ == "__main__":
    asyncio.run(main())

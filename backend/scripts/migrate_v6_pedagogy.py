"""v6: pedagogy_preset + voice sliders + 1 pregunta por turno + evitar superlativos.

Idempotente. Setea defaults sensatos por tutor.
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text, select
from core.database import engine, AsyncSessionLocal
from models.template import Template

COLS = [
    ("pedagogy_preset",              "VARCHAR(40) NOT NULL DEFAULT 'balanced'"),
    ("avoid_superlative_questions",  "BOOLEAN NOT NULL DEFAULT TRUE"),
    ("one_question_per_turn",        "BOOLEAN NOT NULL DEFAULT TRUE"),
    ("voice_speed",                  "INT NOT NULL DEFAULT 100"),
    ("voice_stability",              "INT NOT NULL DEFAULT 50"),
    ("voice_style",                  "INT NOT NULL DEFAULT 30"),
]

# Default por tutor (subjetivos pero coherentes con la personalidad)
DEFAULTS_BY_SLUG = {
    "coach":     {"pedagogy_preset": "charlatan",   "voice_speed": 95,  "voice_stability": 55, "voice_style": 45, "silence_tolerance_ms": 2000},
    "sincerist": {"pedagogy_preset": "provocador",  "voice_speed": 100, "voice_stability": 70, "voice_style": 25, "silence_tolerance_ms": 1800},
    "arcade":    {"pedagogy_preset": "ludico",      "voice_speed": 105, "voice_stability": 40, "voice_style": 60, "silence_tolerance_ms": 1500},
}


async def main() -> None:
    async with engine.begin() as conn:
        for col, ddl in COLS:
            exists = (await conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                f"WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'templates' AND COLUMN_NAME = '{col}'"
            ))).scalar()
            if exists:
                print(f"[skip] columna {col} ya existe")
            else:
                await conn.execute(text(f"ALTER TABLE templates ADD COLUMN {col} {ddl}"))
                print(f"[ok] columna {col} agregada")

    async with AsyncSessionLocal() as db:
        for slug, defaults in DEFAULTS_BY_SLUG.items():
            tpl = (await db.execute(select(Template).where(Template.slug == slug))).scalar_one_or_none()
            if not tpl:
                continue
            for k, v in defaults.items():
                setattr(tpl, k, v)
            print(f"[ok] {slug}: preset={defaults['pedagogy_preset']} speed={defaults['voice_speed']} silence={defaults['silence_tolerance_ms']}ms")
        await db.commit()

    print("\nOK - migrate_v6 completo")


if __name__ == "__main__":
    asyncio.run(main())

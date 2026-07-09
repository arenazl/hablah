"""Migración v3: agrega 22 columnas a `templates` para pedagogía configurable.

Idempotente: chequea cada columna antes de crearla.
Después de aplicar columnas, setea defaults distintos para los 3 presets
(coach, sincerist, arcade) según la matriz acordada con el usuario.
"""
import sys
import os
import json
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


TEMPLATE_NEW_COLUMNS = [
    # Estilo conversacional
    ("response_length",           "VARCHAR(20) NOT NULL DEFAULT 'short'"),
    ("tutor_talk_ratio",          "INT NOT NULL DEFAULT 25"),
    ("proactive_questions",       "TINYINT(1) NOT NULL DEFAULT 1"),
    ("tutor_shares_opinions",     "TINYINT(1) NOT NULL DEFAULT 1"),
    ("warmth_level",              "INT NOT NULL DEFAULT 3"),

    # Estilo de corrección
    ("correction_mode",           "VARCHAR(30) NOT NULL DEFAULT 'recast'"),
    ("correction_focus",          "JSON NULL"),
    ("error_threshold",           "VARCHAR(20) NOT NULL DEFAULT 'repeated'"),
    ("max_feedback_items",        "INT NOT NULL DEFAULT 3"),
    ("praise_count",              "INT NOT NULL DEFAULT 1"),

    # Reporte
    ("report_include_summary",            "TINYINT(1) NOT NULL DEFAULT 1"),
    ("report_include_connectors",         "TINYINT(1) NOT NULL DEFAULT 1"),
    ("report_include_vocab_suggestions",  "TINYINT(1) NOT NULL DEFAULT 1"),
    ("report_include_pronunciation",      "TINYINT(1) NOT NULL DEFAULT 0"),
    ("report_include_next_session_tip",   "TINYINT(1) NOT NULL DEFAULT 1"),

    # Arranque
    ("opening_style",             "VARCHAR(20) NOT NULL DEFAULT 'direct'"),
    ("opening_includes_topic_intro", "TINYINT(1) NOT NULL DEFAULT 1"),

    # Dinámica
    ("silence_tolerance_ms",      "INT NOT NULL DEFAULT 800"),
    ("interruption_allowed",      "TINYINT(1) NOT NULL DEFAULT 0"),
    ("scaffold_when_stuck",       "TINYINT(1) NOT NULL DEFAULT 1"),
]


# Defaults distintos por preset
PRESET_DEFAULTS = {
    "coach": {
        "response_length": "medium",
        "tutor_talk_ratio": 35,
        "proactive_questions": 1,
        "tutor_shares_opinions": 1,
        "warmth_level": 5,
        "correction_mode": "none",
        "correction_focus": ["fluency"],
        "error_threshold": "only_major",
        "max_feedback_items": 2,
        "praise_count": 3,
        "report_include_summary": 1,
        "report_include_connectors": 0,
        "report_include_vocab_suggestions": 1,
        "report_include_pronunciation": 0,
        "report_include_next_session_tip": 1,
        "opening_style": "warm",
        "opening_includes_topic_intro": 1,
        "silence_tolerance_ms": 1500,
        "interruption_allowed": 0,
        "scaffold_when_stuck": 1,
    },
    "sincerist": {
        "response_length": "short",
        "tutor_talk_ratio": 25,
        "proactive_questions": 1,
        "tutor_shares_opinions": 1,
        "warmth_level": 3,
        "correction_mode": "recast",
        "correction_focus": ["grammar", "vocab", "fluency"],
        "error_threshold": "repeated",
        "max_feedback_items": 3,
        "praise_count": 1,
        "report_include_summary": 1,
        "report_include_connectors": 1,
        "report_include_vocab_suggestions": 1,
        "report_include_pronunciation": 1,
        "report_include_next_session_tip": 1,
        "opening_style": "direct",
        "opening_includes_topic_intro": 1,
        "silence_tolerance_ms": 800,
        "interruption_allowed": 0,
        "scaffold_when_stuck": 1,
    },
    "arcade": {
        "response_length": "terse",
        "tutor_talk_ratio": 20,
        "proactive_questions": 1,
        "tutor_shares_opinions": 0,
        "warmth_level": 4,
        "correction_mode": "recast",
        "correction_focus": ["vocab", "fluency"],
        "error_threshold": "repeated",
        "max_feedback_items": 3,
        "praise_count": 2,
        "report_include_summary": 0,
        "report_include_connectors": 0,
        "report_include_vocab_suggestions": 1,
        "report_include_pronunciation": 0,
        "report_include_next_session_tip": 1,
        "opening_style": "playful",
        "opening_includes_topic_intro": 0,
        "silence_tolerance_ms": 600,
        "interruption_allowed": 1,
        "scaffold_when_stuck": 1,
    },
}


async def add_columns_if_missing() -> None:
    async with engine.begin() as conn:
        existing = await conn.execute(text(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'templates'"
        ))
        cols = {row[0] for row in existing.fetchall()}
        for name, ddl in TEMPLATE_NEW_COLUMNS:
            if name in cols:
                continue
            print(f"  ALTER templates ADD COLUMN {name}")
            await conn.execute(text(f"ALTER TABLE templates ADD COLUMN {name} {ddl}"))


async def apply_preset_defaults() -> None:
    async with engine.begin() as conn:
        for slug, fields in PRESET_DEFAULTS.items():
            # Construir SET dinámicamente
            set_clauses = []
            params = {"slug": slug}
            for k, v in fields.items():
                if isinstance(v, list):
                    params[k] = json.dumps(v)
                else:
                    params[k] = v
                set_clauses.append(f"{k} = :{k}")
            sql = f"UPDATE templates SET {', '.join(set_clauses)} WHERE slug = :slug"
            r = await conn.execute(text(sql), params)
            print(f"  Preset '{slug}': {r.rowcount} fila actualizada")


async def main() -> None:
    print("=== Migración v3: pedagogía configurable ===")
    print("1) Agregar columnas si no existen...")
    await add_columns_if_missing()
    print("2) Aplicar defaults por preset (coach/sincerist/arcade)...")
    await apply_preset_defaults()
    print("=== Migración v3 OK ===")


if __name__ == "__main__":
    asyncio.run(main())

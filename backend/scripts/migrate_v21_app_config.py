"""Migración v21 — tabla app_config (reglas de salida/seguridad como dato, doc 11 §1.5).

Aditiva e idempotente: crea la tabla si no existe y seedea las claves de runtime
(regla de voz, tolerancia ASR, seguridad infantil, umbrales del validador). El
ON DUPLICATE KEY NO pisa `value` → re-correr no resetea lo que el admin editó.
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine

DDL = """
CREATE TABLE IF NOT EXISTS `app_config` (
  `key` VARCHAR(80) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL,
  `kind` VARCHAR(20) NOT NULL DEFAULT 'text',
  `section` VARCHAR(40) NOT NULL DEFAULT 'general',
  `label` VARCHAR(200) NOT NULL DEFAULT '',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

SEED = [
    # key, value, kind, section, label
    ("voice_emojis_screen_only", "true", "bool", "Reglas de salida", "Emojis/onomatopeyas solo a pantalla (nunca al TTS)"),
    ("asr_low_confidence_retry", "true", "bool", "Reglas de salida", "ASR de baja confianza: pedir repetir, no contarlo como error"),
    ("kid_safety_guard", "true", "bool", "Seguridad", "Guarda de seguridad infantil (nunca datos personales, redirigir temas)"),
    ("adult_stay_on_frame", "true", "bool", "Seguridad", "Guarda liviana 'stay on frame' para adultos"),
    ("validator_enabled", "true", "bool", "Validador pre-TTS", "Validador determinista activo (regenera si la salida viola un riel)"),
    ("validator_max_words_mini", "4", "int", "Validador pre-TTS", "Máx. palabras por turno — Mini"),
    ("validator_max_words_junior", "8", "int", "Validador pre-TTS", "Máx. palabras por turno — Junior"),
    ("validator_max_words_tween", "15", "int", "Validador pre-TTS", "Máx. palabras por turno — Tween"),
    ("validator_max_words_adult", "40", "int", "Validador pre-TTS", "Máx. palabras por turno — Adulto"),
]


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(text(DDL))
        print("  [ok] tabla app_config")
        for key, value, kind, section, label in SEED:
            await conn.execute(
                text(
                    "INSERT INTO `app_config` (`key`,`value`,`kind`,`section`,`label`) "
                    "VALUES (:k,:v,:kind,:section,:label) "
                    "ON DUPLICATE KEY UPDATE `kind`=VALUES(`kind`),`section`=VALUES(`section`),`label`=VALUES(`label`)"
                ),
                {"k": key, "v": value, "kind": kind, "section": section, "label": label},
            )
            print(f"  [seed] {key}")
    print("\nOK — migrate_v21 completo (app_config)")


if __name__ == "__main__":
    asyncio.run(main())

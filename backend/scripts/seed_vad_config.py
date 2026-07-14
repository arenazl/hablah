import asyncio
import os
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.path.abspath('.'))

from core.database import AsyncSessionLocal
from models.config import AppConfig
from sqlalchemy import select

VAD_SEEDS = [
    {
        "key": "vad_silence_duration_ms_kid",
        "value": "1500",
        "kind": "int",
        "section": "Voz y Silencio",
        "label": "Kids: Duración del silencio (VAD turn-taking) en ms"
    },
    {
        "key": "vad_prefix_padding_ms_kid",
        "value": "700",
        "kind": "int",
        "section": "Voz y Silencio",
        "label": "Kids: Padding de audio previo en ms"
    },
    {
        "key": "vad_start_sensitivity_kid",
        "value": "START_SENSITIVITY_LOW",
        "kind": "text",
        "section": "Voz y Silencio",
        "label": "Kids: Sensibilidad al inicio de la voz"
    },
    {
        "key": "vad_end_sensitivity_kid",
        "value": "END_SENSITIVITY_HIGH",
        "kind": "text",
        "section": "Voz y Silencio",
        "label": "Kids: Sensibilidad al final de la voz"
    },
    {
        "key": "vad_activity_handling",
        "value": "NO_INTERRUPTION",
        "kind": "text",
        "section": "Voz y Silencio",
        "label": "Kids: Comportamiento ante interrupción de ruido"
    }
]

async def main():
    async with AsyncSessionLocal() as db:
        from sqlalchemy import text
        for seed in VAD_SEEDS:
            # Check if key exists using raw SQL
            c = (await db.execute(text("SELECT config_value FROM app_config WHERE config_key = :k"), {"k": seed["key"]})).scalar_one_or_none()
            if c is None:
                print(f"Creating app_config key: {seed['key']}")
                await db.execute(
                    text("INSERT INTO app_config (config_key, config_value) VALUES (:k, :v)"),
                    {"k": seed["key"], "v": seed["value"]}
                )
            else:
                print(f"Key {seed['key']} already exists (value={c})")
        await db.commit()
    print("Seed VAD config completed successfully.")

if __name__ == '__main__':
    asyncio.run(main())

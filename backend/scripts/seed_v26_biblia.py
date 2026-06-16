"""Seed v26 — incorporaciones de la biblia cruzadas y aprobadas.

  Sector 2: levels.vocab_depth — basic (A0-A2) / full (B1+).
  Sector 3: app_config.closing_no_new_content = true (regla universal de cierre).

Idempotente. Uso: python scripts/seed_v26_biblia.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.methodology import Level
from models.config import AppConfig

# Sector 2 — profundidad de vocab/frases por nivel (basic = 1ª frase; full = todas).
VOCAB_DEPTH = {"A0": "basic", "A1": "basic", "A2": "basic", "B1": "full", "B2": "full", "C1": "full", "C2": "full"}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        print("Sector 2 — levels.vocab_depth:")
        for code, depth in VOCAB_DEPTH.items():
            row = (await db.execute(select(Level).where(Level.code == code))).scalar_one_or_none()
            if row:
                row.vocab_depth = depth
                print(f"  [upd] {code} -> {depth}")
        await db.commit()

        print("\nSector 3 — app_config.closing_no_new_content:")
        key = "closing_no_new_content"
        cfg = (await db.execute(select(AppConfig).where(AppConfig.key == key))).scalar_one_or_none()
        if cfg:
            cfg.value = "true"
            print(f"  [upd] {key}")
        else:
            db.add(AppConfig(key=key, value="true", kind="bool", section="guards",
                             label="Closing trigger: al cerrar, no abrir contenido nuevo"))
            print(f"  [new] {key}")
        await db.commit()
    print("\nOK - seed_v26 completo (vocab_depth + closing trigger)")


if __name__ == "__main__":
    asyncio.run(main())

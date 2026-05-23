"""v9: cambia default de users.cefr_level de B1 a A1.

No toca filas existentes - solo el DEFAULT de la columna para futuros INSERT
que no especifiquen cefr_level explicitamente.

Idempotente.
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        # MySQL: ALTER ... ALTER COLUMN ... SET DEFAULT
        # MySQL 8+ acepta esta sintaxis para JSON, pero para VARCHAR usamos MODIFY
        await conn.execute(text(
            "ALTER TABLE users MODIFY COLUMN cefr_level VARCHAR(4) NOT NULL DEFAULT 'A1'"
        ))
        print("[ok] users.cefr_level DEFAULT cambiado a 'A1'")
    print("\nOK - migrate_v9 completo")


if __name__ == "__main__":
    asyncio.run(main())

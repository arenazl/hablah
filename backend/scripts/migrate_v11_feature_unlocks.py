"""v11: crea tabla user_feature_unlocks para el sistema de progressive disclosure.

La app desbloquea features gradualmente por cantidad de sesiones completadas
(streak, pedagogy_picker, free_topic, mapa, disparadores, tune, voice_room,
detailed_report). Esta tabla persiste cuando cada feature fue desbloqueada
para un user, asi:

- Podemos forzar unlocks manuales (admin/A-B test) sin tocar sessions_total
- El "primer ingreso" con bubble onboarding se dispara una sola vez por user
- Sobreviven cambios futuros del threshold (si bajamos de 5 a 3 sesiones,
  los users que ya pasaron no pierden el feature)

Idempotente.
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_feature_unlocks (
                id INT NOT NULL AUTO_INCREMENT,
                user_id INT NOT NULL,
                feature_key VARCHAR(48) NOT NULL,
                unlocked_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                seen_intro_at DATETIME(6) NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uq_user_feature (user_id, feature_key),
                INDEX ix_user_feature_unlocks_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))
        print("[ok] tabla user_feature_unlocks creada/verificada")

    print("\nOK - migrate_v11 completo")


if __name__ == "__main__":
    asyncio.run(main())

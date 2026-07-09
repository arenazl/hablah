"""v10: crea tabla admin_directives para el modo evolutivo de los coaches.

Cuando el super-admin dice durante una sesion Live "hola soy el super admin
Luquitas, <feedback>", se guarda una entrada en esta tabla. La directiva queda
persistente y se inyecta en el super_prompt de TODAS las sesiones futuras de
ese template.

Cada entrada guarda snapshot del prompt antes/despues para auditoria.

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
            CREATE TABLE IF NOT EXISTS admin_directives (
                id INT NOT NULL AUTO_INCREMENT,
                template_id INT NOT NULL,
                session_id INT NULL,
                user_id INT NOT NULL,
                raw_feedback TEXT NOT NULL,
                directive_text TEXT NOT NULL,
                prompt_before MEDIUMTEXT NOT NULL,
                prompt_after MEDIUMTEXT NOT NULL,
                active TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (id),
                INDEX ix_admin_directives_template (template_id),
                INDEX ix_admin_directives_session (session_id),
                INDEX ix_admin_directives_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))
        print("[ok] tabla admin_directives creada/verificada")

    print("\nOK - migrate_v10 completo")


if __name__ == "__main__":
    asyncio.run(main())

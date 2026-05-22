"""v8: Voice Rooms - charlas multi-participante con invitados.

Crea tabla voice_rooms para soportar charlas de 2+ donde un anfitrion
crea la sala y comparte un link publico para que un amigo se una sin
login (solo con el token).

Idempotente.
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS voice_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(40) UNIQUE NOT NULL,
    host_user_id INT NOT NULL,
    topic_id INT NULL,
    template_id INT NULL,
    session_id INT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    free_topic VARCHAR(300) NULL,
    participants JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    INDEX idx_voice_rooms_token (token),
    INDEX idx_voice_rooms_host (host_user_id),
    INDEX idx_voice_rooms_status (status),
    CONSTRAINT fk_voice_rooms_host FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
"""


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(text(CREATE_TABLE))
        print("[ok] tabla voice_rooms creada (o ya existia)")
    print("\nOK - migrate_v8_rooms completo")


if __name__ == "__main__":
    asyncio.run(main())

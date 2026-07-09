"""v7: modulo Kids.

Cambios:
- users.parent_user_id (nullable int)  -> si != null, este user es perfil hijo
- users.age_group (nullable varchar)   -> 'mini' (4-7) | 'junior' (8-12) | null (adulto)
- crea tabla achievement_catalog
- crea tabla user_achievements

Idempotente.
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


USER_COLS = [
    ("parent_user_id",     "INT NULL"),
    ("age_group",          "VARCHAR(10) NULL"),           # 'mini' (4-7) | 'junior' (8-12) | NULL (adulto)
    ("kid_coins",          "INT NOT NULL DEFAULT 0"),     # monedas habi acumuladas
    ("kid_rank_slug",      "VARCHAR(40) NOT NULL DEFAULT 'curioso'"),  # curioso | explorador | aventurero | capitan | embajador
    ("kid_charlas_count",  "INT NOT NULL DEFAULT 0"),     # cantidad de charlas completadas
    ("kid_avatar_color",   "VARCHAR(20) NOT NULL DEFAULT '#FF6AA9'"),  # color del avatar
]


CREATE_ACHIEVEMENT_CATALOG = """
CREATE TABLE IF NOT EXISTS achievement_catalog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(300) NOT NULL DEFAULT '',
    icon_name VARCHAR(60) NOT NULL,
    icon_color VARCHAR(20) NOT NULL DEFAULT '#FFB800',
    category VARCHAR(40) NOT NULL DEFAULT 'kids',
    threshold INT NULL,
    `order` INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ach_cat_slug (slug)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
"""


CREATE_USER_ACHIEVEMENTS = """
CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_slug VARCHAR(80) NOT NULL,
    session_id INT NULL,
    awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_achievement (user_id, achievement_slug),
    INDEX idx_ua_user (user_id),
    INDEX idx_ua_slug (achievement_slug),
    CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
"""


async def main() -> None:
    async with engine.begin() as conn:
        # 1. Columnas en users
        for col, ddl in USER_COLS:
            exists = (await conn.execute(text(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                f"WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = '{col}'"
            ))).scalar()
            if exists:
                print(f"[skip] users.{col} ya existe")
            else:
                await conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {ddl}"))
                print(f"[ok] users.{col} agregada")

        # 2. Tablas
        await conn.execute(text(CREATE_ACHIEVEMENT_CATALOG))
        print("[ok] tabla achievement_catalog creada (o ya existia)")
        await conn.execute(text(CREATE_USER_ACHIEVEMENTS))
        print("[ok] tabla user_achievements creada (o ya existia)")

    print("\nOK - migrate_v7_kids completo")


if __name__ == "__main__":
    asyncio.run(main())

"""Sincroniza idioma (target_language + base_language) de kids con su padre.

Para kids existentes que se crearon ANTES del fix donde heredan del padre.
Despues del fix kids.py + me.py PATCH, los nuevos kids heredan automatico
y los cambios del padre se propagan. Pero los viejos quedaron con "en"
hardcoded - este script los actualiza una vez.

Uso:
  heroku run "python scripts/sync_kid_langs.py" -a hablah-api
"""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.user import User


async def main() -> None:
    async with AsyncSessionLocal() as db:
        kids = (await db.execute(
            select(User).where(User.parent_user_id.is_not(None))
        )).scalars().all()

        updated = 0
        for kid in kids:
            if not kid.parent_user_id:
                continue
            parent = (await db.execute(
                select(User).where(User.id == kid.parent_user_id)
            )).scalar_one_or_none()
            if not parent:
                continue
            changed = False
            if parent.target_language and parent.target_language != kid.target_language:
                print(f"  kid id={kid.id} {kid.nombre}: target {kid.target_language} -> {parent.target_language}")
                kid.target_language = parent.target_language
                changed = True
            if parent.base_language and parent.base_language != kid.base_language:
                print(f"  kid id={kid.id} {kid.nombre}: base {kid.base_language} -> {parent.base_language}")
                kid.base_language = parent.base_language
                changed = True
            if changed:
                updated += 1

        await db.commit()
        print(f"\n== {updated} kids actualizados de {len(kids)} totales ==")


if __name__ == "__main__":
    asyncio.run(main())

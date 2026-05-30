"""Inspecciona ambos usuarios look y lucas: id, fechas, sesiones, kids."""
import sys
import os
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, func, text

from core.database import AsyncSessionLocal
from models.user import User


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for email in ("look@hablah.app", "lucas@hablah.app"):
            u = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
            if not u:
                print(f"{email}: NO EXISTE")
                continue
            print(f"\n=== {email} (id={u.id}) ===")
            print(f"  nombre: {u.nombre!r} apellido: {u.apellido!r}")
            print(f"  role: {u.role}  cefr: {u.cefr_level}  plan: {u.plan}")
            print(f"  target_lang: {u.target_language}  base: {u.base_language}")
            print(f"  created_at: {getattr(u, 'created_at', None)}")
            print(f"  streak_days: {u.streak_days}  best: {u.streak_best}")

            for tbl, col in [
                ("conversation_sessions", "user_id"),
                ("turns", "user_id"),
                ("kids", "parent_id"),
            ]:
                try:
                    res = await db.execute(text(f"SELECT COUNT(*) FROM {tbl} WHERE {col} = :uid"), {"uid": u.id})
                    print(f"  {tbl}.{col}={u.id}: {res.scalar()}")
                except Exception as e:
                    print(f"  {tbl}: ({type(e).__name__})")


if __name__ == "__main__":
    asyncio.run(main())

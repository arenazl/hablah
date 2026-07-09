"""Trae la ULTIMA sesion global (cualquier usuario) con transcript. Read-only.

Uso: heroku run "python scripts/diag_latest.py"        # la ultima
     heroku run "python scripts/diag_latest.py 3"      # las ultimas 3
"""
import sys, os, asyncio, json
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, desc
from core.database import AsyncSessionLocal
from models.user import User
from models.template import Session as S, Template, Topic


async def main() -> None:
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    async with AsyncSessionLocal() as db:
        sessions = (await db.execute(
            select(S).order_by(desc(S.started_at)).limit(n))).scalars().all()
        if not sessions:
            print("No hay sesiones.")
            return
        for s in sessions:
            u = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
            tmpl = (await db.execute(select(Template).where(Template.id == s.template_id))).scalar_one_or_none() if s.template_id else None
            tp = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none() if s.topic_id else None
            print(f"\n{'='*70}")
            print(f"SESION #{s.id} status={s.status} | user={u.nombre if u else s.user_id} "
                  f"(id={s.user_id}, age={getattr(u,'age_group',None)}, cefr={getattr(u,'cefr_level',None)})")
            print(f"  started: {s.started_at}  ended: {s.ended_at}  dur: {s.duration_seconds}s")
            print(f"  template: {tmpl.name if tmpl else 'N/A'} ({tmpl.slug if tmpl else '-'})  "
                  f"topic: {tp.title if tp else 'N/A'}")
            print(f"{'='*70}")
            tr = s.transcript or []
            print(f"  turnos={len(tr)}  score={s.report.get('score') if isinstance(s.report, dict) else None}")
            if n == 1:  # detalle completo solo cuando se pide UNA
                for i, turn in enumerate(tr):
                    tag = "HABI" if turn.get("who") == "ai" else "NENE"
                    print(f"    [{i:02d}] {tag}: {(turn.get('text') or '').strip()}")


if __name__ == "__main__":
    asyncio.run(main())

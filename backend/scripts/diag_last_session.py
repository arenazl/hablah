"""Diagnostico rapido: ultima(s) sesion(es) de un usuario por nombre o id.

Uso desde Heroku:
  heroku run "python scripts/diag_last_session.py timo" -a hablah-api
  heroku run "python scripts/diag_last_session.py look 3" -a hablah-api   # ultimas 3

Read-only. Imprime:
  - Metadata: status, started_at, ended_at, duration, template, topic
  - Transcript COMPLETO turno por turno
  - Metrics y report si existen
"""
import sys
import os
import asyncio
import json

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, desc, or_
from core.database import AsyncSessionLocal
from models.user import User
from models.template import Session as S, Template, Topic


async def main() -> None:
    query = sys.argv[1] if len(sys.argv) > 1 else ""
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    if not query:
        print("Uso: python diag_last_session.py <nombre_o_id> [n_sesiones]")
        return

    async with AsyncSessionLocal() as db:
        # Buscar user por id o por nombre/email
        user = None
        if query.isdigit():
            user = (await db.execute(
                select(User).where(User.id == int(query))
            )).scalar_one_or_none()
        if not user:
            user = (await db.execute(
                select(User).where(or_(
                    User.nombre.ilike(f"%{query}%"),
                    User.email.ilike(f"%{query}%"),
                ))
            )).scalars().first()

        if not user:
            print(f"No encontre usuario para '{query}'")
            return

        print(f"== USUARIO: id={user.id} nombre={user.nombre} email={user.email}")
        print(f"   cefr={user.cefr_level} target={user.target_language} "
              f"age_group={getattr(user, 'age_group', None)} "
              f"parent={getattr(user, 'parent_user_id', None)}")

        sessions = (await db.execute(
            select(S).where(S.user_id == user.id)
            .order_by(desc(S.started_at)).limit(n)
        )).scalars().all()

        if not sessions:
            print("Sin sesiones registradas para este usuario.")
            return

        for s in sessions:
            tmpl = None
            tp = None
            if s.template_id:
                tmpl = (await db.execute(select(Template).where(Template.id == s.template_id))).scalar_one_or_none()
            if s.topic_id:
                tp = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none()

            print(f"\n{'='*70}")
            print(f"SESION #{s.id}  status={s.status}")
            print(f"  started: {s.started_at}  ended: {s.ended_at}  dur: {s.duration_seconds}s")
            print(f"  template: {tmpl.name if tmpl else 'N/A'} ({tmpl.slug if tmpl else '-'})")
            print(f"  topic: {tp.title if tp else 'N/A'} ({tp.slug if tp else '-'})")
            print(f"  cefr_at_start: {s.cefr_at_start}")
            print(f"{'='*70}")

            tr = s.transcript or []
            print(f"\nTRANSCRIPT ({len(tr)} turnos):")
            for i, turn in enumerate(tr):
                who = turn.get("who", "?")
                text = (turn.get("text") or "").strip()
                tag = "HABI/COACH" if who == "ai" else "USER"
                print(f"  [{i:02d}] {tag}: {text}")

            if s.metrics:
                print(f"\nMETRICS: {json.dumps(s.metrics, ensure_ascii=False)}")
            if s.report:
                rep = json.dumps(s.report, ensure_ascii=False, indent=2)
                # truncar si es muy largo
                if len(rep) > 1500:
                    rep = rep[:1500] + "... [truncado]"
                print(f"\nREPORT:\n{rep}")


if __name__ == "__main__":
    asyncio.run(main())

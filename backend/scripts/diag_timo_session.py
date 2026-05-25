"""Diagnostico ad-hoc: ultima sesion de Timo (kid profile).

Busca:
- el user Timo (kid)
- su ultima sesion
- imprime metadata + ultimos turnos del transcript

NO modifica nada. Read-only.
"""
import sys
import os
import asyncio
import json
from datetime import datetime

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, desc
from core.database import AsyncSessionLocal
from models.user import User
from models.template import Session as S, Template, Topic


async def main():
    async with AsyncSessionLocal() as db:
        timos = (await db.execute(
            select(User).where(User.nombre.ilike("%imo%"))
        )).scalars().all()

        print(f"== Encontrados {len(timos)} usuarios con 'imo' en el nombre ==")
        for t in timos:
            print(f"  id={t.id} nombre={t.nombre} email={t.email} "
                  f"parent={t.parent_user_id} age_group={t.age_group} cefr={t.cefr_level}")

        if not timos:
            return

        # Buscar la ultima sesion del primer Timo kid (con parent_user_id)
        kids = [t for t in timos if t.parent_user_id]
        if not kids:
            kids = timos
        timo = kids[0]
        print(f"\n== Analizando ultima sesion de: {timo.nombre} (id={timo.id}) ==")

        sessions = (await db.execute(
            select(S).where(S.user_id == timo.id).order_by(desc(S.started_at)).limit(5)
        )).scalars().all()

        print(f"\nUltimas {len(sessions)} sesiones:")
        for s in sessions:
            print(f"  sid={s.id} status={s.status} "
                  f"started={s.started_at} ended={s.ended_at} "
                  f"dur={s.duration_seconds} turns={len(s.transcript or [])} "
                  f"template={s.template_id} topic={s.topic_id}")

        if not sessions:
            return

        last = sessions[0]
        print(f"\n== Detalle sesion id={last.id} ==")
        print(f"  template_id={last.template_id} topic_id={last.topic_id}")
        if last.template_id:
            tmpl = (await db.execute(
                select(Template).where(Template.id == last.template_id)
            )).scalar_one_or_none()
            if tmpl:
                print(f"  template: {tmpl.name} ({tmpl.slug})")
        if last.topic_id:
            tp = (await db.execute(
                select(Topic).where(Topic.id == last.topic_id)
            )).scalar_one_or_none()
            if tp:
                print(f"  topic: {tp.title} ({tp.slug}) category={tp.category}")

        tr = last.transcript or []
        print(f"\n  Transcript total turns: {len(tr)}")
        print(f"  Ultimos 12 turnos:")
        for i, turn in enumerate(tr[-12:]):
            who = turn.get("who", "?")
            text = (turn.get("text") or "").strip()
            text_short = (text[:200] + "...") if len(text) > 200 else text
            print(f"  [{i}] {who}: {text_short}")

        print(f"\n  metrics: {json.dumps(last.metrics or {}, ensure_ascii=False)[:300]}")
        print(f"  report: {json.dumps(last.report or {}, ensure_ascii=False)[:300]}")


if __name__ == "__main__":
    asyncio.run(main())

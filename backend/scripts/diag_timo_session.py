"""Diagnostico ad-hoc: sesion 166 de Timo (la colgada)."""
import sys
import os
import asyncio
import json

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.template import Session as S, Topic


async def main():
    async with AsyncSessionLocal() as db:
        for sid in [166, 167]:
            s = (await db.execute(select(S).where(S.id == sid))).scalar_one_or_none()
            if not s:
                print(f"\nSESION {sid}: NO EXISTE")
                continue
            tp = None
            if s.topic_id:
                tp = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none()
            print(f"\n{'='*60}")
            print(f"SESION {sid}")
            print(f"{'='*60}")
            print(f"status={s.status} started={s.started_at} ended={s.ended_at} dur={s.duration_seconds}")
            print(f"topic_id={s.topic_id} topic_title={tp.title if tp else 'N/A'} slug={tp.slug if tp else 'N/A'}")
            tr = s.transcript or []
            print(f"Total turns: {len(tr)}")
            for i, turn in enumerate(tr):
                who = turn.get("who", "?")
                text = (turn.get("text") or "").strip()
                tag = "AI" if who == "ai" else "USR"
                print(f"  [{i:02d}] {tag}: {text}")


if __name__ == "__main__":
    asyncio.run(main())

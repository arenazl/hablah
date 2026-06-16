"""Post-clase — memoria del alumno: revisión/aprobación + panel + sequencer.

- GET  /insights/pending          → insights de la Mitad B esperando aprobación del profe.
- POST /insights/{id}/approve     → propaga a learner_interests / learner_traits / reinforcement_queue.
- POST /insights/{id}/discard     → descarta (no escribe memoria).
- GET  /student/{id}              → memoria del alumno (SRS + intereses + rasgos) para el panel.
- GET  /suggest-next-topic?user_id → sequencer: sugiere el próximo tópico desde la memoria.
"""
import datetime
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.user import User
from models.template import Topic
from models.learner_state import VocabProgress, ReinforcementQueue, LearnerInterest, LearnerTrait, SessionInsight

router = APIRouter()


def _jload(s) -> list:
    try:
        v = json.loads(s) if s else []
        return v if isinstance(v, list) else []
    except Exception:
        return []


@router.get("/insights/pending")
async def pending_insights(db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    rows = (await db.execute(
        select(SessionInsight).where(SessionInsight.status == "pending").order_by(desc(SessionInsight.id)).limit(100)
    )).scalars().all()
    out = []
    for r in rows:
        u = (await db.execute(select(User).where(User.id == r.student_id))).scalar_one_or_none()
        out.append({
            "id": r.id, "session_id": r.session_id, "student_id": r.student_id,
            "student_name": getattr(u, "nombre", None) or f"#{r.student_id}",
            "summary": r.summary, "affective": r.affective,
            "new_interests": _jload(r.new_interests), "items_to_reinforce": _jload(r.items_to_reinforce),
            "traits": _jload(r.traits), "suggested_topic": r.suggested_topic,
        })
    return out


@router.post("/insights/{insight_id}/approve")
async def approve_insight(insight_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    ins = (await db.execute(select(SessionInsight).where(SessionInsight.id == insight_id))).scalar_one_or_none()
    if not ins:
        raise HTTPException(404, "Insight no encontrado")
    today = datetime.date.today()
    sid = ins.student_id

    for it in _jload(ins.new_interests):
        if not it:
            continue
        row = (await db.execute(select(LearnerInterest).where(
            LearnerInterest.student_id == sid, LearnerInterest.interest == str(it)))).scalar_one_or_none()
        if row:
            row.weight = min(1.0, (row.weight or 0.5) + 0.2); row.last_seen = today
        else:
            db.add(LearnerInterest(student_id=sid, interest=str(it), source="detected", weight=0.5, last_seen=today))

    for t in _jload(ins.traits):
        name = t.get("trait") if isinstance(t, dict) else str(t)
        conf = float(t.get("confidence", 0.5)) if isinstance(t, dict) else 0.5
        if not name:
            continue
        row = (await db.execute(select(LearnerTrait).where(
            LearnerTrait.student_id == sid, LearnerTrait.trait == name))).scalar_one_or_none()
        if row:
            row.confidence = min(1.0, (row.confidence or 0.5) + 0.1)
        else:
            db.add(LearnerTrait(student_id=sid, trait=name, confidence=conf))

    for item in _jload(ins.items_to_reinforce):
        if item:
            db.add(ReinforcementQueue(student_id=sid, item=str(item), reason="post-clase", priority=1))

    ins.status = "approved"
    await db.commit()
    return {"ok": True}


@router.post("/insights/{insight_id}/discard")
async def discard_insight(insight_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    ins = (await db.execute(select(SessionInsight).where(SessionInsight.id == insight_id))).scalar_one_or_none()
    if not ins:
        raise HTTPException(404, "Insight no encontrado")
    ins.status = "discarded"
    await db.commit()
    return {"ok": True}


@router.get("/student/{student_id}")
async def student_memory(student_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    today = datetime.date.today()
    vp = (await db.execute(select(VocabProgress).where(VocabProgress.student_id == student_id))).scalars().all()
    rq = (await db.execute(select(ReinforcementQueue).where(ReinforcementQueue.student_id == student_id))).scalars().all()
    li = (await db.execute(select(LearnerInterest).where(LearnerInterest.student_id == student_id))).scalars().all()
    lt = (await db.execute(select(LearnerTrait).where(LearnerTrait.student_id == student_id))).scalars().all()
    return {
        "vocab_progress": [{
            "item": r.item, "status": r.status, "seen": r.seen_count, "ok": r.success_count, "fail": r.fail_count,
            "next_review": r.next_review.isoformat() if r.next_review else None,
            "due": bool(r.next_review and r.next_review <= today),
        } for r in vp],
        "reinforcement_queue": [{"item": r.item, "reason": r.reason} for r in rq],
        "interests": [{"interest": r.interest, "source": r.source, "weight": r.weight} for r in li],
        "traits": [{"trait": r.trait, "confidence": r.confidence} for r in lt],
    }


@router.get("/suggest-next-topic")
async def suggest_next_topic(user_id: int = Query(...), db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    """Sequencer determinista: resuelve el próximo tópico (topic_id + título) desde la
    memoria del alumno + el catálogo. Misma lógica que usa el arranque de clase."""
    from services.memory_analyzer import suggest_next_topic as _seq
    return await _seq(db, user_id)

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from core.security import get_current_user
from models.template import Session as SessionModel, Topic, Template
from models.user import User
from schemas.template import SessionStartRequest, SessionResponse, SessionEndRequest

router = APIRouter()


def _serialize(s: SessionModel) -> dict:
    return {
        "id": s.id,
        "user_id": s.user_id,
        "template_id": s.template_id,
        "topic_id": s.topic_id,
        "cefr_at_start": s.cefr_at_start,
        "status": s.status,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        "duration_seconds": s.duration_seconds,
        "transcript": s.transcript or [],
        "metrics": s.metrics or {},
        "report": s.report or {},
        "score": s.score,
        "is_rescue": s.is_rescue,
    }


@router.post("/start")
async def start_session(
    payload: SessionStartRequest,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Inicia una sesión nueva. Devuelve session_id + super-prompt para el LLM."""
    topic = None
    if payload.topic_id:
        topic = (await db.execute(select(Topic).where(Topic.id == payload.topic_id))).scalar_one_or_none()

    template = None
    template_id = payload.template_id or current.active_template_id
    if template_id:
        template = (await db.execute(select(Template).where(Template.id == template_id))).scalar_one_or_none()

    s = SessionModel(
        user_id=current.id,
        template_id=template.id if template else None,
        topic_id=topic.id if topic else None,
        cefr_at_start=current.cefr_level or "B1",
        status="active",
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)

    # Importar acá para evitar ciclos
    from services.super_prompt import build_super_prompt

    super_prompt = build_super_prompt(user=current, template=template, topic=topic)
    voice_id = (template.voice_id if template else None) or ""

    return {
        "session_id": s.id,
        "super_prompt": super_prompt,
        "voice_id": voice_id,
        "template": {
            "id": template.id, "name": template.name, "slug": template.slug,
            "rigor": template.rigor, "challenges_per_min": template.challenges_per_min,
        } if template else None,
        "topic": {
            "id": topic.id, "title": topic.title, "slug": topic.slug,
            "keywords": topic.keywords,
        } if topic else None,
    }


@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: int,
    payload: SessionEndRequest,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
    if not s or s.user_id != current.id:
        raise HTTPException(404, "Sesión no encontrada")
    s.transcript = [line.model_dump() for line in payload.transcript]
    s.ended_at = datetime.now(timezone.utc)
    if s.started_at:
        delta = (s.ended_at - s.started_at.replace(tzinfo=timezone.utc)).total_seconds()
        s.duration_seconds = int(delta)
    s.status = "ended"
    await db.commit()
    await db.refresh(s)

    # Dispatch análisis post-sesión (asíncrono, no bloquea respuesta)
    from services.session_analyzer import analyze_session_safe
    import asyncio
    asyncio.create_task(analyze_session_safe(session_id))

    return _serialize(s)


@router.get("/", response_model=list[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SessionModel)
        .where(SessionModel.user_id == current.id)
        .order_by(desc(SessionModel.started_at))
        .limit(50)
    )
    rows = result.scalars().all()
    return [_serialize(r) for r in rows]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
    if not s or s.user_id != current.id:
        raise HTTPException(404, "Sesión no encontrada")
    return _serialize(s)

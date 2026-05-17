"""Endpoint /api/me — vista enriquecida del perfil del usuario logueado."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.template import Template, Topic, UserInterest, TopicProgress, Session as SessionModel, ErrorLog

router = APIRouter()


@router.get("/profile")
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Perfil completo: user + template activo + intereses + progreso + última sesión."""
    template = None
    if current.active_template_id:
        template = (await db.execute(
            select(Template).where(Template.id == current.active_template_id)
        )).scalar_one_or_none()

    interests_rows = await db.execute(
        select(Topic).join(UserInterest, UserInterest.topic_id == Topic.id)
        .where(UserInterest.user_id == current.id)
        .order_by(UserInterest.added_at)
    )
    interests = [
        {"id": t.id, "slug": t.slug, "title": t.title, "category": t.category}
        for t in interests_rows.scalars().all()
    ]

    progress_rows = await db.execute(
        select(TopicProgress, Topic)
        .join(Topic, Topic.id == TopicProgress.topic_id)
        .where(TopicProgress.user_id == current.id)
    )
    progress = []
    for prog, topic in progress_rows.all():
        progress.append({
            "topic_id": topic.id,
            "topic_title": topic.title,
            "stages_done": prog.stages_done,
            "stages_total": prog.stages_total,
            "pct": prog.pct,
            "minutes_spoken": prog.minutes_spoken,
            "sessions_count": prog.sessions_count,
        })

    last_session = (await db.execute(
        select(SessionModel).where(SessionModel.user_id == current.id)
        .order_by(SessionModel.started_at.desc()).limit(1)
    )).scalar_one_or_none()

    total_sessions = (await db.execute(
        select(func.count(SessionModel.id)).where(SessionModel.user_id == current.id)
    )).scalar() or 0

    return {
        "user": {
            "id": current.id,
            "email": current.email,
            "nombre": current.nombre,
            "apellido": current.apellido,
            "role": current.role.value if hasattr(current.role, "value") else current.role,
            "cefr_level": current.cefr_level,
            "target_language": current.target_language,
            "base_language": current.base_language,
            "accent_preference": current.accent_preference,
            "streak_days": current.streak_days,
            "streak_best": current.streak_best,
            "target_minutes_per_session": current.target_minutes_per_session,
            "insistent_mode_enabled": current.insistent_mode_enabled,
            "daily_reminder_enabled": current.daily_reminder_enabled,
            "audio_retention_days": current.audio_retention_days,
            "plan": current.plan,
        },
        "active_template": {
            "id": template.id, "slug": template.slug, "name": template.name,
            "description": template.description, "voice_id": template.voice_id, "voice_label": template.voice_label,
        } if template else None,
        "interests": interests,
        "progress": progress,
        "last_session": {
            "id": last_session.id, "topic_id": last_session.topic_id,
            "started_at": last_session.started_at.isoformat() if last_session.started_at else None,
            "score": last_session.score,
        } if last_session else None,
        "total_sessions": total_sessions,
    }


# ─── Settings ───────────────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional


class SettingsUpdate(BaseModel):
    accent_preference: Optional[str] = None
    target_minutes_per_session: Optional[int] = None
    insistent_mode_enabled: Optional[bool] = None
    daily_reminder_enabled: Optional[bool] = None
    audio_retention_days: Optional[int] = None
    active_template_id: Optional[int] = None


@router.patch("/settings")
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(current, k, v)
    await db.commit()
    await db.refresh(current)
    return {"ok": True}

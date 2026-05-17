from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from typing import Optional

from core.database import get_db
from core.security import require_role
from models.user import User, UserRole
from models.template import Template, Session as SessionModel, ErrorLog

router = APIRouter()


@router.get("/")
async def list_alumnos(
    q: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Lista alumnos para el backoffice (admin only)."""
    query = select(User).where(User.role == UserRole.student.value)
    if q:
        needle = f"%{q.lower()}%"
        query = query.where(or_(
            User.email.ilike(needle),
            User.nombre.ilike(needle),
            User.apellido.ilike(needle),
        ))
    if level:
        query = query.where(User.cefr_level == level)
    # MySQL: NULLS LAST se simula con un CASE / IS NULL (la columna IS NULL devuelve 0/1).
    query = query.order_by(User.last_session_at.is_(None), desc(User.last_session_at), User.nombre).limit(200)

    rows = (await db.execute(query)).scalars().all()

    # Para cada usuario, traigo template activo + count sesiones
    out = []
    for u in rows:
        tpl = None
        if u.active_template_id:
            tpl = (await db.execute(
                select(Template).where(Template.id == u.active_template_id)
            )).scalar_one_or_none()
        total_sessions = (await db.execute(
            select(func.count(SessionModel.id)).where(SessionModel.user_id == u.id)
        )).scalar() or 0
        # progreso global = avg de pct de topic_progress
        # simplificación: para demo devolvemos un fijo basado en cefr
        cefr_pct = {"A1": 8, "A2": 18, "B1": 34, "B2": 62, "C1": 84, "C2": 95}.get(u.cefr_level, 30)
        out.append({
            "id": u.id,
            "email": u.email,
            "nombre": u.nombre,
            "apellido": u.apellido,
            "cefr_level": u.cefr_level,
            "tutor": tpl.name if tpl else None,
            "tutor_slug": tpl.slug if tpl else None,
            "progress_pct": cefr_pct,
            "streak_days": u.streak_days,
            "plan": u.plan,
            "total_sessions": total_sessions,
            "last_session_at": u.last_session_at.isoformat() if u.last_session_at else None,
        })
    return out


@router.get("/{user_id}/errors")
async def alumno_errors(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Top errores recurrentes del alumno (modo insistente)."""
    rows = (await db.execute(
        select(ErrorLog.error_key, ErrorLog.label, ErrorLog.kind, func.count(ErrorLog.id).label("c"))
        .where(ErrorLog.user_id == user_id, ErrorLog.resolved == False)  # noqa: E712
        .group_by(ErrorLog.error_key, ErrorLog.label, ErrorLog.kind)
        .order_by(desc("c"))
        .limit(10)
    )).all()
    return [
        {"error_key": k, "label": l, "kind": kind, "count": c}
        for k, l, kind, c in rows
    ]

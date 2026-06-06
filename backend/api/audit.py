"""Endpoints /api/audit/* — panel de auditoria admin.

Lee TODO lo que persiste en la DB (tabla `sessions` + `error_logs`) para que el
admin pueda revisar charlas, horarios, transcripts, metricas y reportes con
filtros. Reemplaza al viejo /api/diag/* que apuntaba a GCP Cloud Logging
(muerto en Heroku).

Solo admin (require_role). La UI /admin/auditoria consume estos.

NOTA: los eventos en vivo (interrupciones, timing fino, cortes al alumno) hoy
solo viven en stdout (efimero en Heroku). Esta vista muestra lo PERSISTIDO:
transcript turno x turno, metricas calculadas, reporte final y errores. Para
auditar eventos en vivo hace falta persistirlos (fase 2).
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.user import User
from models.template import Session as SessionModel, Template, Topic, ErrorLog

router = APIRouter()


def _iso(dt: Any) -> Optional[str]:
    return dt.isoformat() if dt else None


def _parse_date(s: Optional[str]) -> Optional[datetime]:
    """Acepta 'YYYY-MM-DD' o ISO completo. Devuelve datetime aware (UTC)."""
    if not s:
        return None
    try:
        if len(s) == 10:
            dt = datetime.strptime(s, "%Y-%m-%d")
        else:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _transcript_stats(transcript: Any) -> dict[str, int]:
    """Cuenta turnos por hablante a partir del transcript persistido."""
    tr = transcript or []
    user_turns = sum(1 for t in tr if (t or {}).get("who") == "user")
    ai_turns = sum(1 for t in tr if (t or {}).get("who") == "ai")
    return {"turns": len(tr), "user_turns": user_turns, "ai_turns": ai_turns}


@router.get("/sessions")
async def list_sessions(
    q: Optional[str] = Query(None, description="Filtra por nombre o email del usuario"),
    user_id: Optional[int] = Query(None, description="Filtra por id de usuario exacto"),
    status: Optional[str] = Query(None, description="active | ended | analyzed"),
    template_id: Optional[int] = Query(None),
    from_date: Optional[str] = Query(None, description="started_at >= (YYYY-MM-DD o ISO)"),
    to_date: Optional[str] = Query(None, description="started_at <= (YYYY-MM-DD o ISO)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Lista sesiones (charlas) con filtros. Una fila por charla, mas reciente
    primero. Cada fila trae metadata + conteo de turnos para un vistazo rapido."""
    conditions = []

    # Filtro por usuario: id exacto o busqueda por nombre/email
    target_user_ids: Optional[set[int]] = None
    if user_id is not None:
        target_user_ids = {user_id}
    elif q:
        rows = (await db.execute(
            select(User.id).where(or_(
                User.nombre.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
                User.apellido.ilike(f"%{q}%"),
            ))
        )).scalars().all()
        target_user_ids = set(rows) or {-1}  # -1 => no matchea nada

    if target_user_ids is not None:
        conditions.append(SessionModel.user_id.in_(target_user_ids))
    if status:
        conditions.append(SessionModel.status == status)
    if template_id is not None:
        conditions.append(SessionModel.template_id == template_id)
    dt_from = _parse_date(from_date)
    dt_to = _parse_date(to_date)
    if dt_from:
        conditions.append(SessionModel.started_at >= dt_from)
    if dt_to:
        # incluir todo el dia si vino solo fecha
        if to_date and len(to_date) == 10:
            dt_to = dt_to + timedelta(days=1)
        conditions.append(SessionModel.started_at <= dt_to)

    base = select(SessionModel)
    if conditions:
        for c in conditions:
            base = base.where(c)

    total = (await db.execute(
        select(func.count()).select_from(base.subquery())
    )).scalar_one()

    sessions = (await db.execute(
        base.order_by(desc(SessionModel.started_at)).limit(limit).offset(offset)
    )).scalars().all()

    # Resolver nombres de user/template/topic en batch (evita N+1)
    uids = {s.user_id for s in sessions}
    tids = {s.template_id for s in sessions if s.template_id}
    topids = {s.topic_id for s in sessions if s.topic_id}

    users = {u.id: u for u in (await db.execute(
        select(User).where(User.id.in_(uids or {-1}))
    )).scalars().all()}
    templates = {t.id: t for t in (await db.execute(
        select(Template).where(Template.id.in_(tids or {-1}))
    )).scalars().all()}
    topics = {t.id: t for t in (await db.execute(
        select(Topic).where(Topic.id.in_(topids or {-1}))
    )).scalars().all()}

    items = []
    for s in sessions:
        u = users.get(s.user_id)
        tmpl = templates.get(s.template_id) if s.template_id else None
        tp = topics.get(s.topic_id) if s.topic_id else None
        stats = _transcript_stats(s.transcript)
        items.append({
            "id": s.id,
            "user_id": s.user_id,
            "user_name": u.nombre if u else f"#{s.user_id}",
            "user_email": u.email if u else None,
            "status": s.status,
            "started_at": _iso(s.started_at),
            "ended_at": _iso(s.ended_at),
            "duration_seconds": s.duration_seconds,
            "template_name": tmpl.name if tmpl else None,
            "topic_title": tp.title if tp else None,
            "cefr_at_start": s.cefr_at_start,
            "score": s.score,
            "is_rescue": s.is_rescue,
            "has_audio": bool(s.audio_url),
            "has_report": bool(s.report),
            "has_metrics": bool(s.metrics),
            **stats,
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "sessions": items,
    }


@router.get("/sessions/{session_id}")
async def session_detail(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Detalle COMPLETO de una charla: metadata + transcript turno x turno +
    metricas + reporte + errores detectados en esa sesion."""
    s = (await db.execute(
        select(SessionModel).where(SessionModel.id == session_id)
    )).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Sesion no encontrada")

    u = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
    tmpl = (await db.execute(select(Template).where(Template.id == s.template_id))).scalar_one_or_none() if s.template_id else None
    tp = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none() if s.topic_id else None

    errors = (await db.execute(
        select(ErrorLog).where(ErrorLog.session_id == session_id).order_by(ErrorLog.detected_at)
    )).scalars().all()

    return {
        "id": s.id,
        "user": {
            "id": s.user_id,
            "name": u.nombre if u else f"#{s.user_id}",
            "email": u.email if u else None,
            "cefr_level": u.cefr_level if u else None,
            "target_language": u.target_language if u else None,
        },
        "status": s.status,
        "started_at": _iso(s.started_at),
        "ended_at": _iso(s.ended_at),
        "duration_seconds": s.duration_seconds,
        "cefr_at_start": s.cefr_at_start,
        "score": s.score,
        "is_rescue": s.is_rescue,
        "audio_url": s.audio_url,
        "template": {"id": tmpl.id, "name": tmpl.name, "slug": tmpl.slug} if tmpl else None,
        "topic": {"id": tp.id, "title": tp.title, "slug": tp.slug} if tp else None,
        "transcript": s.transcript or [],
        "metrics": s.metrics or {},
        "report": s.report or {},
        "errors": [
            {
                "id": e.id,
                "kind": e.kind,
                "error_key": e.error_key,
                "label": e.label,
                "snippet_wrong": e.snippet_wrong,
                "snippet_correct": e.snippet_correct,
                "resolved": e.resolved,
                "detected_at": _iso(e.detected_at),
            }
            for e in errors
        ],
        **_transcript_stats(s.transcript),
    }


@router.get("/errors")
async def list_errors(
    q: Optional[str] = Query(None, description="Filtra por nombre/email del usuario"),
    user_id: Optional[int] = Query(None),
    kind: Optional[str] = Query(None, description="grammar | pronunciation | vocabulary"),
    resolved: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Lista errores detectados (tabla error_logs) con filtros. Util para ver
    patrones de error que disparan el modo insistente."""
    conditions = []
    if user_id is not None:
        conditions.append(ErrorLog.user_id == user_id)
    elif q:
        uids = (await db.execute(
            select(User.id).where(or_(
                User.nombre.ilike(f"%{q}%"),
                User.email.ilike(f"%{q}%"),
            ))
        )).scalars().all()
        conditions.append(ErrorLog.user_id.in_(set(uids) or {-1}))
    if kind:
        conditions.append(ErrorLog.kind == kind)
    if resolved is not None:
        conditions.append(ErrorLog.resolved == resolved)

    base = select(ErrorLog)
    for c in conditions:
        base = base.where(c)

    total = (await db.execute(
        select(func.count()).select_from(base.subquery())
    )).scalar_one()

    rows = (await db.execute(
        base.order_by(desc(ErrorLog.detected_at)).limit(limit).offset(offset)
    )).scalars().all()

    uids = {r.user_id for r in rows}
    users = {u.id: u for u in (await db.execute(
        select(User).where(User.id.in_(uids or {-1}))
    )).scalars().all()}

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "errors": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "user_name": users[r.user_id].nombre if r.user_id in users else f"#{r.user_id}",
                "session_id": r.session_id,
                "kind": r.kind,
                "error_key": r.error_key,
                "label": r.label,
                "snippet_wrong": r.snippet_wrong,
                "snippet_correct": r.snippet_correct,
                "resolved": r.resolved,
                "detected_at": _iso(r.detected_at),
            }
            for r in rows
        ],
    }


@router.get("/stats")
async def audit_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """KPIs rapidos para el header del panel: charlas hoy / 7d, errores
    abiertos, sesiones activas ahora."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    sessions_today = (await db.execute(
        select(func.count()).select_from(SessionModel).where(SessionModel.started_at >= today_start)
    )).scalar_one()
    sessions_week = (await db.execute(
        select(func.count()).select_from(SessionModel).where(SessionModel.started_at >= week_start)
    )).scalar_one()
    active_now = (await db.execute(
        select(func.count()).select_from(SessionModel).where(SessionModel.status == "active")
    )).scalar_one()
    open_errors = (await db.execute(
        select(func.count()).select_from(ErrorLog).where(ErrorLog.resolved == False)  # noqa: E712
    )).scalar_one()

    return {
        "sessions_today": sessions_today,
        "sessions_week": sessions_week,
        "active_now": active_now,
        "open_errors": open_errors,
    }

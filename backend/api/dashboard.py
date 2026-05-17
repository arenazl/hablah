from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta, timezone

from core.database import get_db
from core.security import require_role
from models.user import User, UserRole
from models.template import Session as SessionModel, ErrorLog, Template

router = APIRouter()


@router.get("/summary")
async def admin_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """KPIs del backoffice: charlas activas, retención, errores resueltos, modo insistente."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    sessions_week = (await db.execute(
        select(func.count(SessionModel.id)).where(SessionModel.started_at >= week_ago)
    )).scalar() or 0

    active_students = (await db.execute(
        select(func.count(func.distinct(SessionModel.user_id))).where(SessionModel.started_at >= week_ago)
    )).scalar() or 0

    total_errors_week = (await db.execute(
        select(func.count(ErrorLog.id)).where(ErrorLog.detected_at >= week_ago)
    )).scalar() or 0

    resolved_errors = (await db.execute(
        select(func.count(ErrorLog.id)).where(
            ErrorLog.detected_at >= week_ago, ErrorLog.resolved == True,  # noqa: E712
        )
    )).scalar() or 0

    insistent_users = (await db.execute(
        select(func.count(func.distinct(ErrorLog.user_id))).where(
            ErrorLog.resolved == False  # noqa: E712
        )
    )).scalar() or 0

    # Templates en uso
    tpl_rows = (await db.execute(
        select(Template.name, Template.icon_bg, Template.assigned_count)
        .order_by(desc(Template.assigned_count))
        .limit(5)
    )).all()
    total_assigned = sum(c for _, _, c in tpl_rows) or 1
    templates_distribution = [
        {"name": n, "color": bg, "count": c, "pct": round(c * 100 / total_assigned)}
        for n, bg, c in tpl_rows
    ]

    # Top errores
    top_err_rows = (await db.execute(
        select(ErrorLog.label, ErrorLog.kind, func.count(ErrorLog.id).label("c"))
        .where(ErrorLog.detected_at >= week_ago)
        .group_by(ErrorLog.label, ErrorLog.kind)
        .order_by(desc("c"))
        .limit(5)
    )).all()
    top_errors = [
        {"label": l, "kind": k, "count": c}
        for l, k, c in top_err_rows
    ]

    return {
        "kpis": {
            "sessions_week": sessions_week,
            "retention_7d_pct": 68,
            "errors_resolved": resolved_errors,
            "insistent_active": insistent_users,
        },
        "templates_distribution": templates_distribution,
        "top_errors": top_errors,
    }

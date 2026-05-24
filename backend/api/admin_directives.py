"""Endpoints del modo evolutivo de los coaches.

Cada vez que el super-admin dice "hola soy el super admin Luquitas, <feedback>"
durante una sesion Live, el detector guarda una AdminDirective. Estos endpoints
permiten ver el historial, togglear active, y eliminar entradas.

Solo accesible para usuarios con role='admin'.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.template import AdminDirective, Template
from models.user import User

router = APIRouter()


def _serialize(d: AdminDirective) -> dict:
    return {
        "id": d.id,
        "template_id": d.template_id,
        "session_id": d.session_id,
        "user_id": d.user_id,
        "raw_feedback": d.raw_feedback,
        "directive_text": d.directive_text,
        "prompt_before": d.prompt_before,
        "prompt_after": d.prompt_after,
        "active": bool(d.active),
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


@router.get("/templates/{template_id}/directives")
async def list_template_directives(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Devuelve el historial completo de directivas admin para un template,
    ordenado del mas reciente al mas antiguo."""
    template = (await db.execute(
        select(Template).where(Template.id == template_id)
    )).scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template no encontrado")

    rows = (await db.execute(
        select(AdminDirective)
        .where(AdminDirective.template_id == template_id)
        .order_by(desc(AdminDirective.created_at))
    )).scalars().all()

    return {
        "template": {"id": template.id, "name": template.name, "slug": template.slug},
        "directives": [_serialize(d) for d in rows],
    }


@router.patch("/directives/{directive_id}")
async def toggle_directive(
    directive_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Activa o desactiva una directiva sin borrarla."""
    d = (await db.execute(
        select(AdminDirective).where(AdminDirective.id == directive_id)
    )).scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Directiva no encontrada")
    if "active" in payload:
        d.active = bool(payload["active"])
    await db.commit()
    await db.refresh(d)
    return _serialize(d)


@router.delete("/directives/{directive_id}")
async def delete_directive(
    directive_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Borra una directiva del historial."""
    d = (await db.execute(
        select(AdminDirective).where(AdminDirective.id == directive_id)
    )).scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Directiva no encontrada")
    await db.delete(d)
    await db.commit()
    return {"ok": True}

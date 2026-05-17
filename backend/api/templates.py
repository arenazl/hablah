from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db
from core.security import get_current_user, require_role
from models.template import Template
from models.user import User
from schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse

router = APIRouter()


@router.get("/", response_model=list[TemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Template).order_by(Template.is_preset.desc(), Template.name))
    return result.scalars().all()


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (await db.execute(select(Template).where(Template.id == template_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Template no encontrado")
    return row


@router.post("/", response_model=TemplateResponse)
async def create_template(
    payload: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    exists = await db.execute(select(Template).where(Template.slug == payload.slug))
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Slug ya existe")
    obj = Template(**payload.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    payload: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    row = (await db.execute(select(Template).where(Template.id == template_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Template no encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    row = (await db.execute(select(Template).where(Template.id == template_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Template no encontrado")
    if row.is_preset:
        raise HTTPException(400, "No se puede borrar un preset")
    await db.delete(row)
    await db.commit()
    return {"ok": True}

"""Reglas de salida / seguridad — config de runtime editable (doc 11 §1.5).

CRUD mínimo (listar + editar valor) de app_config. Solo role='admin'.
La capa de runtime configurable sin tocar código.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.config import AppConfig
from models.user import User

router = APIRouter()


def _serialize(c: AppConfig) -> dict:
    return {"key": c.key, "value": c.value, "kind": c.kind, "section": c.section, "label": c.label}


class ConfigUpdate(BaseModel):
    value: str


@router.get("")
async def list_config(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    rows = (await db.execute(
        select(AppConfig).order_by(AppConfig.section, AppConfig.key)
    )).scalars().all()
    return [_serialize(c) for c in rows]


@router.patch("/{key}")
async def update_config(
    key: str,
    payload: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    c = (await db.execute(select(AppConfig).where(AppConfig.key == key))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="config no encontrada")
    c.value = payload.value
    await db.commit()
    await db.refresh(c)
    return _serialize(c)

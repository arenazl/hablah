"""CRUD de Niveles CEFR (con nombre amigable + regla de idioma por nivel).

La regla de idioma del coach vive acá (es SOLO por nivel). Patrón estándar.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.methodology import Level
from models.user import User

router = APIRouter()


class LevelBase(BaseModel):
    code: str
    friendly_name: str
    sort_order: int = 0
    short_desc: Optional[str] = None
    language_rule: Optional[str] = None
    active: bool = True


class LevelUpdate(BaseModel):
    code: Optional[str] = None
    friendly_name: Optional[str] = None
    sort_order: Optional[int] = None
    short_desc: Optional[str] = None
    language_rule: Optional[str] = None
    active: Optional[bool] = None


def _serialize(lv: Level) -> dict:
    return {
        "id": lv.id, "code": lv.code, "friendly_name": lv.friendly_name,
        "sort_order": lv.sort_order, "short_desc": lv.short_desc or "",
        "language_rule": getattr(lv, "language_rule", None) or "", "active": bool(lv.active),
    }


@router.get("")
async def list_levels(db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    rows = (await db.execute(select(Level).order_by(Level.sort_order))).scalars().all()
    return [_serialize(lv) for lv in rows]


@router.post("", status_code=201)
async def create_level(payload: LevelBase, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    lv = Level(**payload.model_dump())
    db.add(lv); await db.commit(); await db.refresh(lv)
    return _serialize(lv)


@router.patch("/{level_id}")
async def update_level(level_id: int, payload: LevelUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    lv = (await db.execute(select(Level).where(Level.id == level_id))).scalar_one_or_none()
    if not lv:
        raise HTTPException(404, "Nivel no encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(lv, k, v)
    await db.commit(); await db.refresh(lv)
    return _serialize(lv)

"""CRUD de Coaches — la persona del tutor (bloque 2). 2+ por segmento (F/M).

Mismo patrón que methodology_modules.py. Solo role='admin'.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.methodology import Coach
from models.user import User

router = APIRouter()


class CoachBase(BaseModel):
    student_type: str
    gender: str = "female"
    name: str
    identity: Optional[str] = None
    personality: Optional[str] = None
    voice_name: Optional[str] = None
    sort_order: int = 0
    active: bool = True


class CoachCreate(CoachBase):
    pass


class CoachUpdate(BaseModel):
    student_type: Optional[str] = None
    gender: Optional[str] = None
    name: Optional[str] = None
    identity: Optional[str] = None
    personality: Optional[str] = None
    voice_name: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None


def _serialize(c: Coach) -> dict:
    return {
        "id": c.id, "student_type": c.student_type, "gender": c.gender, "name": c.name,
        "identity": c.identity or "", "personality": c.personality or "",
        "voice_name": c.voice_name or "", "sort_order": c.sort_order, "active": bool(c.active),
    }


@router.get("")
async def list_coaches(
    student_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    q = select(Coach)
    if student_type:
        q = q.where(Coach.student_type == student_type)
    q = q.order_by(Coach.student_type, Coach.sort_order)
    rows = (await db.execute(q)).scalars().all()
    return [_serialize(c) for c in rows]


@router.post("", status_code=201)
async def create_coach(
    payload: CoachCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    c = Coach(**payload.model_dump())
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return _serialize(c)


@router.patch("/{coach_id}")
async def update_coach(
    coach_id: int,
    payload: CoachUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    c = (await db.execute(select(Coach).where(Coach.id == coach_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Coach no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(c, key, value)
    await db.commit()
    await db.refresh(c)
    return _serialize(c)


@router.delete("/{coach_id}")
async def delete_coach(
    coach_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    c = (await db.execute(select(Coach).where(Coach.id == coach_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Coach no encontrado")
    await db.delete(c)
    await db.commit()
    return {"ok": True}

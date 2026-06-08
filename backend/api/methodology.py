"""CRUD del currículum / metodología (módulo admin "Metodología").

Solo role='admin'. El super admin gestiona las etapas del plan de estudios
(vocabulario + estructura gramatical + criterio de avance) por grupo etario.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.methodology import MethodologyStage
from models.user import User

router = APIRouter()


class VocabItem(BaseModel):
    en: str
    es: str


class StageBase(BaseModel):
    age_group: str
    cefr_level: str = "A0"
    order_index: int = 0
    title: str
    vocabulary: list[VocabItem] = []
    target_structure: Optional[str] = None
    target_structure_es: Optional[str] = None
    mastery_criteria: Optional[str] = None
    notes: Optional[str] = None
    active: bool = True


class StageCreate(StageBase):
    pass


class StageUpdate(BaseModel):
    age_group: Optional[str] = None
    cefr_level: Optional[str] = None
    order_index: Optional[int] = None
    title: Optional[str] = None
    vocabulary: Optional[list[VocabItem]] = None
    target_structure: Optional[str] = None
    target_structure_es: Optional[str] = None
    mastery_criteria: Optional[str] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


def _serialize(s: MethodologyStage) -> dict:
    return {
        "id": s.id,
        "age_group": s.age_group,
        "cefr_level": s.cefr_level,
        "order_index": s.order_index,
        "title": s.title,
        "vocabulary": s.vocabulary or [],
        "target_structure": s.target_structure,
        "target_structure_es": s.target_structure_es,
        "mastery_criteria": s.mastery_criteria,
        "notes": s.notes,
        "active": bool(s.active),
    }


@router.get("")
async def list_stages(
    age_group: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Lista las etapas del currículum, opcionalmente filtradas por grupo etario."""
    q = select(MethodologyStage)
    if age_group:
        q = q.where(MethodologyStage.age_group == age_group)
    q = q.order_by(MethodologyStage.age_group, MethodologyStage.order_index)
    rows = (await db.execute(q)).scalars().all()
    return [_serialize(s) for s in rows]


@router.post("", status_code=201)
async def create_stage(
    payload: StageCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    s = MethodologyStage(
        age_group=payload.age_group,
        cefr_level=payload.cefr_level,
        order_index=payload.order_index,
        title=payload.title,
        vocabulary=[v.model_dump() for v in payload.vocabulary],
        target_structure=payload.target_structure,
        target_structure_es=payload.target_structure_es,
        mastery_criteria=payload.mastery_criteria,
        notes=payload.notes,
        active=payload.active,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _serialize(s)


@router.patch("/{stage_id}")
async def update_stage(
    stage_id: int,
    payload: StageUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    s = (await db.execute(
        select(MethodologyStage).where(MethodologyStage.id == stage_id)
    )).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Etapa no encontrada")
    data = payload.model_dump(exclude_unset=True)  # vocabulary ya viene como list[dict]
    for key, value in data.items():
        setattr(s, key, value)
    await db.commit()
    await db.refresh(s)
    return _serialize(s)


@router.delete("/{stage_id}")
async def delete_stage(
    stage_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    s = (await db.execute(
        select(MethodologyStage).where(MethodologyStage.id == stage_id)
    )).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Etapa no encontrada")
    await db.delete(s)
    await db.commit()
    return {"ok": True}

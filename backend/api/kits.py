"""Kits — pools de tópicos curados (doc 11 §1.2). Solo role='admin'.

CRUD de kits + asignación de tópicos (N:N). El sequencer (futuro) elige de acá.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.kit import Kit, KitTopic
from models.user import User

router = APIRouter()


class KitBase(BaseModel):
    name: str
    description: str = ""
    active: bool = True


class KitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class KitTopicsSet(BaseModel):
    topic_ids: List[int]


async def _topic_ids(db: AsyncSession, kit_id: int) -> List[int]:
    rows = (await db.execute(
        select(KitTopic.topic_id).where(KitTopic.kit_id == kit_id)
    )).scalars().all()
    return list(rows)


def _serialize(k: Kit, topic_ids: List[int]) -> dict:
    return {
        "id": k.id, "name": k.name, "description": k.description or "",
        "active": bool(k.active), "topic_ids": topic_ids,
    }


@router.get("")
async def list_kits(db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    kits = (await db.execute(select(Kit).order_by(Kit.name))).scalars().all()
    out = []
    for k in kits:
        out.append(_serialize(k, await _topic_ids(db, k.id)))
    return out


@router.post("", status_code=201)
async def create_kit(payload: KitBase, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    k = Kit(name=payload.name, description=payload.description, active=payload.active)
    db.add(k)
    await db.commit()
    await db.refresh(k)
    return _serialize(k, [])


@router.patch("/{kit_id}")
async def update_kit(kit_id: int, payload: KitUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    k = (await db.execute(select(Kit).where(Kit.id == kit_id))).scalar_one_or_none()
    if not k:
        raise HTTPException(status_code=404, detail="Kit no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(k, key, value)
    await db.commit()
    await db.refresh(k)
    return _serialize(k, await _topic_ids(db, kit_id))


@router.put("/{kit_id}/topics")
async def set_kit_topics(kit_id: int, payload: KitTopicsSet, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    k = (await db.execute(select(Kit).where(Kit.id == kit_id))).scalar_one_or_none()
    if not k:
        raise HTTPException(status_code=404, detail="Kit no encontrado")
    await db.execute(delete(KitTopic).where(KitTopic.kit_id == kit_id))
    for tid in dict.fromkeys(payload.topic_ids):  # dedup, preserva orden
        db.add(KitTopic(kit_id=kit_id, topic_id=tid))
    await db.commit()
    return _serialize(k, await _topic_ids(db, kit_id))


@router.delete("/{kit_id}")
async def delete_kit(kit_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    k = (await db.execute(select(Kit).where(Kit.id == kit_id))).scalar_one_or_none()
    if not k:
        raise HTTPException(status_code=404, detail="Kit no encontrado")
    await db.execute(delete(KitTopic).where(KitTopic.kit_id == kit_id))
    await db.delete(k)
    await db.commit()
    return {"ok": True}

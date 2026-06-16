"""CRUD de los RIELES de metodología (Motor Pedagógico Adaptativo).

Reemplaza conceptualmente al viejo /api/methodology (que listaba tópicos
disfrazados). Acá vive la metodología real: las auto-restricciones del coach
por (student_type × nivel). Solo role='admin'.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.methodology import StudentType
from models.user import User

router = APIRouter()


def _serialize_student_type(s: StudentType) -> dict:
    return {
        "id": s.id,
        "slug": s.slug,
        "name": s.name,
        "description": s.description or "",
        "age_min": s.age_min,
        "age_max": s.age_max,
        "tutor_mascot": getattr(s, "tutor_mascot", None) or "",
        "tutor_identity": getattr(s, "tutor_identity", None) or "",
        "tutor_tonal_rules": getattr(s, "tutor_tonal_rules", None) or "",
        "session_focus": getattr(s, "session_focus", None) or "",
        "opening_seed": getattr(s, "opening_seed", None) or "",
        "continuation_seed": getattr(s, "continuation_seed", None) or "",
        "closing_seed": getattr(s, "closing_seed", None) or "",
        # Eje EDAD del motor (cómo enseña / forma): lo lee el bloque 3 y 6.
        "pedagogy": getattr(s, "pedagogy", None) or "",
        "form_rules": getattr(s, "form_rules", None) or "",
        "duration_adjust_minutes": getattr(s, "duration_adjust_minutes", None),
        "active": bool(s.active),
    }


class StudentTypeUpdate(BaseModel):
    tutor_mascot: Optional[str] = None
    tutor_identity: Optional[str] = None
    tutor_tonal_rules: Optional[str] = None
    session_focus: Optional[str] = None
    opening_seed: Optional[str] = None
    continuation_seed: Optional[str] = None
    closing_seed: Optional[str] = None
    pedagogy: Optional[str] = None
    form_rules: Optional[str] = None
    duration_adjust_minutes: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None


@router.get("/student-types")
async def list_student_types(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    rows = (await db.execute(
        select(StudentType).where(StudentType.active.is_(True)).order_by(StudentType.sort_order)
    )).scalars().all()
    return [_serialize_student_type(s) for s in rows]


@router.patch("/student-types/{slug}")
async def update_student_type(
    slug: str,
    payload: StudentTypeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    s = (await db.execute(
        select(StudentType).where(StudentType.slug == slug)
    )).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="StudentType no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(s, key, value)
    await db.commit()
    await db.refresh(s)
    return _serialize_student_type(s)


class StudentTypeCreate(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    sort_order: int = 0
    tutor_mascot: Optional[str] = None
    tutor_identity: Optional[str] = None
    tutor_tonal_rules: Optional[str] = None
    session_focus: Optional[str] = None
    opening_seed: Optional[str] = None
    continuation_seed: Optional[str] = None
    closing_seed: Optional[str] = None
    pedagogy: Optional[str] = None
    form_rules: Optional[str] = None
    duration_adjust_minutes: Optional[int] = None


@router.post("/student-types", status_code=201)
async def create_student_type(
    payload: StudentTypeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    exists = (await db.execute(
        select(StudentType).where(StudentType.slug == payload.slug)
    )).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Ya existe un StudentType con ese slug")
    s = StudentType(**payload.model_dump())
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _serialize_student_type(s)


@router.delete("/student-types/{slug}")
async def delete_student_type(
    slug: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    s = (await db.execute(
        select(StudentType).where(StudentType.slug == slug)
    )).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="StudentType no encontrado")
    await db.delete(s)
    await db.commit()
    return {"ok": True}



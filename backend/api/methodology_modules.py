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
from models.methodology import MethodologyModule, StudentType
from models.user import User

router = APIRouter()


class ModuleBase(BaseModel):
    student_type: str = "adult"
    level: str = "A0"
    module_order: int = 1
    focus_name: str
    ai_restraints: str = ""
    target_grammar: Optional[str] = None
    evaluation_criteria: Optional[str] = None
    correction_hint: Optional[str] = None
    max_session_minutes: Optional[int] = None
    max_turns: Optional[int] = None
    code: Optional[str] = None
    notes: Optional[str] = None
    active: bool = True


class ModuleCreate(ModuleBase):
    pass


class ModuleUpdate(BaseModel):
    student_type: Optional[str] = None
    level: Optional[str] = None
    module_order: Optional[int] = None
    focus_name: Optional[str] = None
    ai_restraints: Optional[str] = None
    target_grammar: Optional[str] = None
    evaluation_criteria: Optional[str] = None
    correction_hint: Optional[str] = None
    max_session_minutes: Optional[int] = None
    max_turns: Optional[int] = None
    code: Optional[str] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


def _serialize(m: MethodologyModule) -> dict:
    return {
        "id": m.id,
        "student_type": m.student_type,
        "level": m.level,
        "module_order": m.module_order,
        "focus_name": m.focus_name,
        "ai_restraints": m.ai_restraints or "",
        "target_grammar": m.target_grammar,
        "evaluation_criteria": m.evaluation_criteria,
        "correction_hint": m.correction_hint,
        "max_session_minutes": getattr(m, "max_session_minutes", None),
        "max_turns": getattr(m, "max_turns", None),
        "code": m.code,
        "notes": m.notes,
        "active": bool(m.active),
    }


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


@router.get("")
async def list_modules(
    student_type: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Lista los rieles, filtrables por edad (student_type) y/o nivel."""
    q = select(MethodologyModule)
    if student_type:
        q = q.where(MethodologyModule.student_type == student_type)
    if level:
        q = q.where(MethodologyModule.level == level)
    q = q.order_by(MethodologyModule.student_type, MethodologyModule.level, MethodologyModule.module_order)
    rows = (await db.execute(q)).scalars().all()
    return [_serialize(m) for m in rows]


@router.post("", status_code=201)
async def create_module(
    payload: ModuleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    m = MethodologyModule(
        student_type=payload.student_type, level=payload.level, module_order=payload.module_order,
        focus_name=payload.focus_name, ai_restraints=payload.ai_restraints,
        target_grammar=payload.target_grammar, evaluation_criteria=payload.evaluation_criteria,
        correction_hint=payload.correction_hint,
        max_session_minutes=payload.max_session_minutes, max_turns=payload.max_turns,
        code=payload.code,
        notes=payload.notes, active=payload.active, modeling_examples=[], spaced_review=[],
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _serialize(m)


@router.patch("/{module_id}")
async def update_module(
    module_id: int,
    payload: ModuleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    m = (await db.execute(
        select(MethodologyModule).where(MethodologyModule.id == module_id)
    )).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(m, key, value)
    await db.commit()
    await db.refresh(m)
    return _serialize(m)


@router.delete("/{module_id}")
async def delete_module(
    module_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    m = (await db.execute(
        select(MethodologyModule).where(MethodologyModule.id == module_id)
    )).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Módulo no encontrado")
    await db.delete(m)
    await db.commit()
    return {"ok": True}

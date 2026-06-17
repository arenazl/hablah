"""Catálogo de reglas del motor — ABM (la biblioteca editable).

El profe ve las reglas predefinidas, las prende/apaga (active), corrige el texto, o agrega
una nueva. NO hay texto libre suelto: todo vive como filas reusables. Solo role='admin'.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.rule import Rule
from models.user import User

router = APIRouter()


def _ser(r: Rule) -> dict:
    return {
        "id": r.id, "bloque": r.bloque, "categoria": r.categoria, "eje": r.eje,
        "aplica_a": r.aplica_a, "regla": r.regla, "origen": r.origen,
        "editable": bool(r.editable), "notas": r.notas or "",
        "sort_order": r.sort_order, "active": bool(r.active),
    }


@router.get("/resolve")
async def resolve_rules(
    segment: str = Query("mini"), nivel: str = Query("A1"), topic_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin")),
):
    """Dado (banda, nivel, tópico) devuelve el prompt armado desde el catálogo + qué reglas
    (IDs) cayeron en cada slot. Es la orquestación: pura selección, sin texto libre."""
    from services.composer_rules import compose_from_catalog
    from models.template import Topic
    topic = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalar_one_or_none() if topic_id else None
    return await compose_from_catalog(db, segment=segment, nivel=nivel, topic=topic, user_name="Alumno (preview)")


@router.get("")
async def list_rules(
    bloque: Optional[str] = Query(None), eje: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin")),
):
    q = select(Rule)
    if bloque:
        q = q.where(Rule.bloque == bloque)
    if eje:
        q = q.where(Rule.eje == eje)
    rows = (await db.execute(q.order_by(Rule.sort_order))).scalars().all()
    return [_ser(r) for r in rows]


class RuleUpdate(BaseModel):
    regla: Optional[str] = None
    aplica_a: Optional[str] = None
    categoria: Optional[str] = None
    bloque: Optional[str] = None
    eje: Optional[str] = None
    notas: Optional[str] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None


@router.patch("/{rule_id}")
async def update_rule(rule_id: str, payload: RuleUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    r = (await db.execute(select(Rule).where(Rule.id == rule_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Regla no encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    await db.commit(); await db.refresh(r)
    return _ser(r)


class RuleCreate(BaseModel):
    id: str
    bloque: str
    categoria: str = "custom"
    eje: str = "EDAD"
    aplica_a: str = "todos"
    regla: str
    notas: Optional[str] = None


@router.post("", status_code=201)
async def create_rule(payload: RuleCreate, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    exists = (await db.execute(select(Rule).where(Rule.id == payload.id))).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Ya existe una regla con ese ID")
    r = Rule(**payload.model_dump(), origen="profe", editable=True, active=True, sort_order=9999)
    db.add(r); await db.commit(); await db.refresh(r)
    return _ser(r)


@router.delete("/{rule_id}")
async def delete_rule(rule_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    r = (await db.execute(select(Rule).where(Rule.id == rule_id))).scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Regla no encontrada")
    await db.delete(r); await db.commit()
    return {"ok": True}

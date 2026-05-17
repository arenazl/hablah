from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import Optional

from core.database import get_db
from core.security import get_current_user, require_role
from models.template import Topic, UserInterest
from models.user import User
from schemas.template import TopicCreate, TopicUpdate, TopicResponse

router = APIRouter()


@router.get("/", response_model=list[TopicResponse])
async def list_topics(
    category: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Topic).where(Topic.is_active == True)  # noqa: E712
    if category and category != "todas":
        query = query.where(Topic.category == category)
    if q:
        needle = f"%{q.lower()}%"
        query = query.where(or_(
            Topic.title.ilike(needle),
            Topic.slug.ilike(needle),
        ))
    query = query.order_by(Topic.is_hot.desc(), Topic.usage_count.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/categories")
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Devuelve categorías + count para sidebar de Tópicos."""
    result = await db.execute(select(Topic.category, Topic.id).where(Topic.is_active == True))  # noqa: E712
    rows = result.all()
    counts: dict[str, int] = {}
    for cat, _id in rows:
        counts[cat] = counts.get(cat, 0) + 1
    return [{"key": k, "count": v} for k, v in counts.items()]


@router.get("/my-interests", response_model=list[TopicResponse])
async def my_interests(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Tópicos elegidos por el usuario logueado, ordenados por position."""
    result = await db.execute(
        select(Topic)
        .join(UserInterest, UserInterest.topic_id == Topic.id)
        .where(UserInterest.user_id == current.id)
        .order_by(UserInterest.position, UserInterest.added_at)
    )
    return result.scalars().all()


@router.post("/my-interests/{topic_id}")
async def add_interest(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    topic = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalar_one_or_none()
    if not topic:
        raise HTTPException(404, "Topic no existe")
    exists = await db.execute(
        select(UserInterest).where(
            UserInterest.user_id == current.id, UserInterest.topic_id == topic_id
        )
    )
    if exists.scalar_one_or_none():
        return {"ok": True, "already": True}
    # Posición = al final
    from sqlalchemy import func as _func
    max_pos = (await db.execute(
        select(_func.coalesce(_func.max(UserInterest.position), -1))
        .where(UserInterest.user_id == current.id)
    )).scalar() or -1
    db.add(UserInterest(user_id=current.id, topic_id=topic_id, position=max_pos + 1))
    await db.commit()
    return {"ok": True}


@router.delete("/my-interests/{topic_id}")
async def remove_interest(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    await db.execute(
        UserInterest.__table__.delete().where(
            UserInterest.user_id == current.id, UserInterest.topic_id == topic_id
        )
    )
    await db.commit()
    return {"ok": True}


from pydantic import BaseModel


class ReorderRequest(BaseModel):
    topic_ids: list[int]  # nuevo orden completo


@router.post("/my-interests/reorder")
async def reorder_interests(
    payload: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Reordena los intereses del usuario. Recibe lista completa de topic_ids
    en el orden deseado y asigna position 0..N."""
    for idx, topic_id in enumerate(payload.topic_ids):
        await db.execute(
            UserInterest.__table__.update()
            .where(UserInterest.user_id == current.id, UserInterest.topic_id == topic_id)
            .values(position=idx)
        )
    await db.commit()
    return {"ok": True, "count": len(payload.topic_ids)}


@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    row = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Topic no encontrado")
    return row


@router.post("/", response_model=TopicResponse)
async def create_topic(
    payload: TopicCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    exists = await db.execute(select(Topic).where(Topic.slug == payload.slug))
    if exists.scalar_one_or_none():
        raise HTTPException(400, "Slug ya existe")
    obj = Topic(**payload.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.patch("/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: int,
    payload: TopicUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    row = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Topic no encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/{topic_id}")
async def delete_topic(
    topic_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    row = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Topic no encontrado")
    await db.delete(row)
    await db.commit()
    return {"ok": True}

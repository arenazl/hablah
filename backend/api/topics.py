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


from pydantic import BaseModel


class _ReorderRequest(BaseModel):
    topic_ids: list[int]


# IMPORTANTE: /reorder antes que /{topic_id} para que FastAPI matchee primero
# la ruta literal y no parsee "reorder" como topic_id (causa HTTP 422).
@router.post("/my-interests/reorder")
async def reorder_interests(
    payload: _ReorderRequest,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Reordena intereses. topic_ids en el orden deseado, position 0..N."""
    for idx, topic_id in enumerate(payload.topic_ids):
        await db.execute(
            UserInterest.__table__.update()
            .where(UserInterest.user_id == current.id, UserInterest.topic_id == topic_id)
            .values(position=idx)
        )
    await db.commit()
    return {"ok": True, "count": len(payload.topic_ids)}


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


# ─── AI generation for seed_prompts + keywords ───────────────────────────────

import httpx
import json as _json
from core.config import settings


@router.post("/{topic_id}/generate-seeds")
async def generate_seeds_ai(
    topic_id: int,
    lang: str = Query("es", description="Idioma objetivo del topic (es | pt | en | it)"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Genera seed_prompts (uno por nivel CEFR) + keywords usando Gemini.

    No persiste cambios — devuelve la propuesta. El admin la revisa y guarda.
    """
    row = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Topic no encontrado")

    lang_name = {"en": "English", "pt": "Portuguese", "es": "Spanish", "it": "Italian"}.get(lang, lang)

    prompt = f"""Sos un diseñador curricular de Habláh (app de aprendizaje de idiomas por conversación con AI).

Dado este tópico:
- Título: {row.title}
- Categoría: {row.category}
- Idioma objetivo del alumno: {lang_name}

Generá contenido pedagógico de alta calidad en JSON estricto con este schema:

{{
  "seed_prompts": {{
    "A1": string,
    "A2": string,
    "B1": string,
    "B2": string,
    "C1": string,
    "C2": string
  }},
  "keywords": [string]   // 8 a 12 palabras o frases clave en {lang_name} que el alumno debería poder usar
}}

CRITERIOS:
- Cada seed_prompt es una DIRECTIVA PARA EL TUTOR (no para el alumno) — le indica cómo arrancar la conversación. Ejemplo: "Iniciá preguntando sobre los origenes del genero y por qué le interesa al alumno"
- Adaptá la complejidad al nivel CEFR (A1 = muy simple, C2 = sofisticado, debate)
- Las keywords deben ser ESPECÍFICAS del tema, no genéricas (ej: para "Café de especialidad" → "v60", "espresso", "tueste claro", NO "delicioso", "rico")
- Los seed_prompts están en castellano rioplatense (son instrucciones internas para el tutor)
- Las keywords están en {lang_name}

DEVOLVÉ SOLO EL JSON, sin comentarios."""

    key = settings.GEMINI_API_KEY
    model = settings.GEMINI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.5,
            "maxOutputTokens": 2000,
            "responseMimeType": "application/json",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=60) as cli:
            r = await cli.post(url, json=body)
            r.raise_for_status()
            data = r.json()
        text = ""
        for c in data.get("candidates", []):
            for p in (c.get("content") or {}).get("parts", []):
                text += p.get("text", "")
        result = _json.loads(text)
    except Exception as e:
        raise HTTPException(500, f"Generación falló: {e}")

    return {
        "topic_id": topic_id,
        "lang": lang,
        "seed_prompts": result.get("seed_prompts", {}),
        "keywords": result.get("keywords", []),
        "note": "Propuesta generada por AI. Revisá y guardá con PATCH /topics/{id}",
    }

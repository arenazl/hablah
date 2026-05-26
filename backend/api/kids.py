"""API del modulo Kids.

Cuenta padre (adulto) crea perfiles hijos (mini 4-7 / junior 8-12).
Cada perfil tiene su propio progreso, monedas, rank, achievements.

Endpoints:
  POST   /api/kids/profiles               - Adulto crea perfil hijo
  GET    /api/kids/profiles               - Adulto lista sus perfiles
  POST   /api/kids/profiles/{id}/login    - Adulto entra como ese perfil hijo (devuelve token)
  GET    /api/kids/topics                 - Lista 10 topicos kids
  GET    /api/kids/me                     - Datos del perfil kid actual (con coins, rank, etc)
  GET    /api/kids/achievements           - Catalogo de achievements + cuales ya gano el user actual
  POST   /api/kids/coins                  - Agrega monedas (admin / sistema)
"""
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from core.database import get_db
from core.security import get_password_hash, create_access_token, get_current_user
from core.config import settings
from models.user import User, UserRole
from models.template import Template, Topic, TopicProgress
from models.kids import AchievementCatalog, UserAchievement


router = APIRouter()


# ─── Schemas ────────────────────────────────────────────────────────
class KidProfileCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    age: int = Field(..., ge=4, le=12)
    avatar_color: Optional[str] = "#FF6AA9"


class KidProfileResponse(BaseModel):
    id: int
    name: str
    age_group: str  # 'mini' | 'junior'
    avatar_color: str
    coins: int
    rank_slug: str
    charlas_count: int

    class Config:
        from_attributes = True


class KidsLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    profile: KidProfileResponse


class KidsMeResponse(BaseModel):
    id: int
    name: str
    age_group: str
    avatar_color: str
    coins: int
    rank_slug: str
    charlas_count: int
    parent_user_id: int


class TopicResponse(BaseModel):
    id: int
    slug: str
    title: str
    category: str
    keywords: list
    is_hot: bool


class AchievementResponse(BaseModel):
    slug: str
    name: str
    description: str
    icon_name: str
    icon_color: str
    threshold: Optional[int]
    order: int
    awarded: bool  # si el user actual ya lo tiene


# ─── Helpers ────────────────────────────────────────────────────────
def _age_to_group(age: int) -> str:
    return "mini" if age <= 7 else "junior"


async def _get_friend_template_id(db: AsyncSession) -> Optional[int]:
    result = await db.execute(select(Template).where(Template.slug == "friend"))
    tpl = result.scalar_one_or_none()
    return tpl.id if tpl else None


# ─── Endpoints ──────────────────────────────────────────────────────
@router.post("/profiles", response_model=KidProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_kid_profile(
    payload: KidProfileCreate,
    parent: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adulto crea un perfil hijo dentro de su cuenta."""
    if parent.parent_user_id is not None:
        raise HTTPException(status_code=403, detail="Un perfil hijo no puede crear perfiles hijos")

    age_group = _age_to_group(payload.age)
    friend_id = await _get_friend_template_id(db)

    # Email sintetico para el perfil hijo (no se usa para login, solo unique key)
    synthetic_email = f"kid_{parent.id}_{payload.name.lower().replace(' ', '_')}@kids.hablah.app"

    # Si ya existe un perfil con ese nombre para este padre, lo devolvemos
    existing = (await db.execute(
        select(User).where(
            User.parent_user_id == parent.id,
            User.email == synthetic_email,
        )
    )).scalar_one_or_none()
    if existing:
        return KidProfileResponse(
            id=existing.id,
            name=existing.nombre,
            age_group=existing.age_group or age_group,
            avatar_color=existing.kid_avatar_color,
            coins=existing.kid_coins,
            rank_slug=existing.kid_rank_slug,
            charlas_count=existing.kid_charlas_count,
        )

    kid = User(
        email=synthetic_email,
        hashed_password=get_password_hash(""),  # no necesita login con password
        nombre=payload.name,
        apellido="",
        role=UserRole.student,
        cefr_level="A0",
        # Hereda idioma del padre. Si el padre tiene en, el kid arranca en en;
        # si despues el padre cambia a pt, el endpoint /api/me/settings propaga
        # al kid automaticamente.
        target_language=parent.target_language or "en",
        base_language=parent.base_language or "es",
        accent_preference="us_f",
        active_template_id=friend_id,
        target_minutes_per_session=5,
        insistent_mode_enabled=False,
        plan="free",
        parent_user_id=parent.id,
        age_group=age_group,
        kid_avatar_color=payload.avatar_color or "#FF6AA9",
    )
    db.add(kid)
    await db.commit()
    await db.refresh(kid)

    return KidProfileResponse(
        id=kid.id,
        name=kid.nombre,
        age_group=kid.age_group,
        avatar_color=kid.kid_avatar_color,
        coins=kid.kid_coins,
        rank_slug=kid.kid_rank_slug,
        charlas_count=kid.kid_charlas_count,
    )


@router.get("/profiles", response_model=list[KidProfileResponse])
async def list_kid_profiles(
    parent: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adulto lista sus perfiles hijos."""
    if parent.parent_user_id is not None:
        raise HTTPException(status_code=403, detail="Un perfil hijo no ve perfiles hijos")

    result = await db.execute(select(User).where(User.parent_user_id == parent.id))
    kids = result.scalars().all()
    return [
        KidProfileResponse(
            id=k.id,
            name=k.nombre,
            age_group=k.age_group or "mini",
            avatar_color=k.kid_avatar_color,
            coins=k.kid_coins,
            rank_slug=k.kid_rank_slug,
            charlas_count=k.kid_charlas_count,
        )
        for k in kids
    ]


@router.post("/profiles/{kid_id}/login", response_model=KidsLoginResponse)
async def login_as_kid(
    kid_id: int,
    parent: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adulto entra a la app como el perfil hijo. Devuelve un JWT del kid."""
    if parent.parent_user_id is not None:
        raise HTTPException(status_code=403, detail="Solo cuentas adultas pueden cambiar de perfil")

    result = await db.execute(
        select(User).where(User.id == kid_id, User.parent_user_id == parent.id)
    )
    kid = result.scalar_one_or_none()
    if not kid:
        raise HTTPException(status_code=404, detail="Perfil hijo no encontrado")

    token = create_access_token(
        data={"sub": str(kid.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return KidsLoginResponse(
        access_token=token,
        profile=KidProfileResponse(
            id=kid.id,
            name=kid.nombre,
            age_group=kid.age_group or "mini",
            avatar_color=kid.kid_avatar_color,
            coins=kid.kid_coins,
            rank_slug=kid.kid_rank_slug,
            charlas_count=kid.kid_charlas_count,
        ),
    )


@router.get("/me", response_model=KidsMeResponse)
async def kids_me(user: User = Depends(get_current_user)):
    """Datos del perfil kid actual."""
    if user.parent_user_id is None or user.age_group is None:
        raise HTTPException(status_code=403, detail="No es un perfil hijo")
    return KidsMeResponse(
        id=user.id,
        name=user.nombre,
        age_group=user.age_group,
        avatar_color=user.kid_avatar_color,
        coins=user.kid_coins,
        rank_slug=user.kid_rank_slug,
        charlas_count=user.kid_charlas_count,
        parent_user_id=user.parent_user_id,
    )


@router.get("/topics", response_model=list[TopicResponse])
async def list_kids_topics(
    age_group: Optional[str] = None,  # 'mini' | 'junior' | 'tween' | None (todos)
    db: AsyncSession = Depends(get_db),
):
    """Topicos curados para chicos. Publico (no requiere auth).
    Si pasas ?age_group=mini, filtra solo los topicos de ese nivel.
    """
    query = select(Topic).where(Topic.category == "kids", Topic.is_active == True)
    if age_group in ("mini", "junior", "tween"):
        query = query.where(Topic.kid_age_group == age_group)
    query = query.order_by(Topic.id)

    result = await db.execute(query)
    topics = result.scalars().all()
    return [
        TopicResponse(
            id=t.id,
            slug=t.slug,
            title=t.title,
            category=t.category,
            keywords=t.keywords or [],
            is_hot=t.is_hot,
        )
        for t in topics
    ]


@router.get("/topics/next-random")
async def kids_next_random_topic(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Devuelve un topico random de los que el chico TODAVIA NO completo.

    Criterio "no completado": sin entry en topic_progress O con pct < 100.
    Filtra por age_group del kid. Si el chico ya completo TODOS los de su
    grupo, devuelve uno random igual (para que pueda repetir).

    Pensado para el boton FAB del microfono: tap -> directo a una clase
    nueva sin que el nene tenga que elegir.
    """
    import random

    age_group = getattr(user, "age_group", None)
    if not age_group:
        raise HTTPException(status_code=400, detail="Perfil sin age_group")

    # Todos los topicos activos del grupo
    all_topics = (await db.execute(
        select(Topic).where(
            Topic.category == "kids",
            Topic.is_active == True,  # noqa: E712
            Topic.kid_age_group == age_group,
        )
    )).scalars().all()

    if not all_topics:
        raise HTTPException(status_code=404, detail="Sin topicos disponibles para este grupo")

    # Progreso del chico
    progress = (await db.execute(
        select(TopicProgress).where(TopicProgress.user_id == user.id)
    )).scalars().all()
    completed_ids = {p.topic_id for p in progress if (p.pct or 0) >= 100}

    pending = [t for t in all_topics if t.id not in completed_ids]
    pool = pending if pending else all_topics
    chosen = random.choice(pool)

    return {
        "id": chosen.id,
        "slug": chosen.slug,
        "title": chosen.title,
        "keywords": chosen.keywords or [],
        "is_hot": bool(chosen.is_hot),
        "all_completed": not pending,
    }


@router.get("/achievements", response_model=list[AchievementResponse])
async def list_kids_achievements(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Catalogo de achievements + flag awarded por user actual."""
    catalog_result = await db.execute(
        select(AchievementCatalog).where(AchievementCatalog.category == "kids").order_by(AchievementCatalog.order)
    )
    catalog = catalog_result.scalars().all()

    awarded_result = await db.execute(
        select(UserAchievement.achievement_slug).where(UserAchievement.user_id == user.id)
    )
    awarded_slugs = {row[0] for row in awarded_result.all()}

    return [
        AchievementResponse(
            slug=a.slug,
            name=a.name,
            description=a.description,
            icon_name=a.icon_name,
            icon_color=a.icon_color,
            threshold=a.threshold,
            order=a.order,
            awarded=a.slug in awarded_slugs,
        )
        for a in catalog
    ]

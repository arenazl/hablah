from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from core.database import get_db
from core.security import get_current_user, get_password_hash, require_role
from models.user import User
from schemas.user import UserResponse, UserCreate, UserUpdate

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    result = await db.execute(select(User).order_by(User.nombre))
    return result.scalars().all()


@router.post("/", response_model=UserResponse)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    exists = await db.execute(select(User).where(User.email == payload.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ya registrado")
    u = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        nombre=payload.nombre,
        apellido=payload.apellido,
        telefono=payload.telefono,
        role=payload.role,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)

    # Auto-asignar 10 topicos default para que la galaxia tenga contenido
    # apenas el user entra (sin onboarding obligatorio).
    from scripts.backfill_default_interests import assign_default_interests
    await assign_default_interests(u.id, db)
    await db.commit()

    return u


@router.get("/me", response_model=UserResponse)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == current.id))
    return result.scalar_one()


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == current.id))
    u = result.scalar_one()
    data = payload.model_dump(exclude_unset=True)
    for protected in ("is_active",):
        data.pop(protected, None)
    for k, v in data.items():
        setattr(u, k, v)
    await db.commit()
    await db.refresh(u)
    return u


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.id != user_id and current.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(u, k, v)
    await db.commit()
    await db.refresh(u)
    return u

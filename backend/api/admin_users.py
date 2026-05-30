"""Endpoints admin para CRUD completo de usuarios.

Separado de api/users.py para tener un namespace limpio /api/admin/users que
solo admins pueden tocar. La UI /app/admin/users consume estos.

Capabilities:
- GET /api/admin/users         — listar todos
- POST /api/admin/users        — crear nuevo (email, password, nombre, role, etc.)
- PATCH /api/admin/users/{id}  — editar (email, nombre, apellido, telefono, role, is_active, cefr_level, target_language, base_language)
- POST /api/admin/users/{id}/reset-password — reset password manual
- DELETE /api/admin/users/{id} — borrar user (purga UserInterest + Sessions + etc.)
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import get_password_hash, require_role
from models.user import User, UserRole

router = APIRouter()


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str
    apellido: str = ""
    telefono: Optional[str] = None
    role: str = "student"
    cefr_level: Optional[str] = "B1"
    target_language: Optional[str] = "en"
    base_language: Optional[str] = "es"


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    cefr_level: Optional[str] = None
    target_language: Optional[str] = None
    base_language: Optional[str] = None


class PasswordReset(BaseModel):
    new_password: str


@router.get("")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Lista TODOS los users con info clave (admin only)."""
    from sqlalchemy import func
    from models.template import Session as SessionModel
    rows = (await db.execute(select(User).order_by(User.id))).scalars().all()
    # Conteo de sesiones por user
    sess_rows = (await db.execute(
        select(SessionModel.user_id, func.count(SessionModel.id))
        .group_by(SessionModel.user_id)
    )).all()
    sess_count: dict[int, int] = {r[0]: r[1] for r in sess_rows}
    return [
        {
            "id": u.id,
            "email": u.email,
            "nombre": u.nombre,
            "apellido": u.apellido,
            "telefono": u.telefono,
            "role": u.role.value if hasattr(u.role, "value") else u.role,
            "is_active": u.is_active,
            "cefr_level": u.cefr_level,
            "target_language": u.target_language,
            "base_language": u.base_language,
            "is_kid": bool(u.parent_user_id) or bool(getattr(u, "age_group", None)),
            "parent_user_id": u.parent_user_id,
            "sessions_count": sess_count.get(u.id, 0),
            "last_session_at": u.last_session_at.isoformat() if u.last_session_at else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in rows
    ]


@router.post("")
async def create_user(
    payload: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Crear user nuevo."""
    exists = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if exists:
        raise HTTPException(400, "Email ya existe")
    try:
        role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(400, f"Role invalido. Validos: {[r.value for r in UserRole]}")
    u = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        nombre=payload.nombre,
        apellido=payload.apellido,
        telefono=payload.telefono,
        role=role,
        cefr_level=payload.cefr_level or "B1",
        target_language=payload.target_language or "en",
        base_language=payload.base_language or "es",
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return {"ok": True, "id": u.id, "email": u.email}


@router.patch("/{user_id}")
async def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Editar user — admin puede cambiar cualquier campo (incluso role, email)."""
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User no encontrado")
    data = payload.model_dump(exclude_unset=True)
    # Convertir role string a enum si viene
    if "role" in data:
        try:
            data["role"] = UserRole(data["role"])
        except ValueError:
            raise HTTPException(400, f"Role invalido")
    # Email unicity check
    if "email" in data and data["email"] != u.email:
        exists = (await db.execute(select(User).where(User.email == data["email"]))).scalar_one_or_none()
        if exists:
            raise HTTPException(400, "Email ya en uso por otro user")
    for k, v in data.items():
        setattr(u, k, v)
    await db.commit()
    await db.refresh(u)
    return {"ok": True, "id": u.id}


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    payload: PasswordReset,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Resetear password manualmente."""
    if len(payload.new_password) < 3:
        raise HTTPException(400, "Password debe tener al menos 3 chars")
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User no encontrado")
    u.hashed_password = get_password_hash(payload.new_password)
    await db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_role("admin")),
):
    """Borrar user (purga sus relaciones)."""
    if user_id == current.id:
        raise HTTPException(400, "No te podes auto-borrar")
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User no encontrado")
    # Purgar tablas relacionadas (best-effort, no rompe si tabla no existe)
    from models.template import UserInterest, TopicProgress, Session as SessionModel, ErrorLog
    await db.execute(delete(UserInterest).where(UserInterest.user_id == user_id))
    await db.execute(delete(TopicProgress).where(TopicProgress.user_id == user_id))
    await db.execute(delete(SessionModel).where(SessionModel.user_id == user_id))
    try:
        await db.execute(delete(ErrorLog).where(ErrorLog.user_id == user_id))
    except Exception:
        pass
    await db.delete(u)
    await db.commit()
    return {"ok": True, "deleted_id": user_id}

"""CRUD del catálogo: Categorías y Subcategorías (Categoría → Subcategoría → Tópico).

Mismo patrón que methodology_modules.py. Solo role='admin'.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role, get_current_user
from models.methodology import Category, Subcategory
from models.user import User

router = APIRouter()


# ─── Público (alumno logueado): para el selector de intereses categoría→subcategoría ──
@router.get("/public/categories")
async def public_categories(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    rows = (await db.execute(
        select(Category).where(Category.active.is_(True)).order_by(Category.sort_order)
    )).scalars().all()
    return [{"id": c.id, "slug": c.slug, "name": c.name} for c in rows]


@router.get("/public/subcategories")
async def public_subcategories(category_id: Optional[int] = Query(None), db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    q = select(Subcategory).where(Subcategory.active.is_(True))
    if category_id:
        q = q.where(Subcategory.category_id == category_id)
    rows = (await db.execute(q.order_by(Subcategory.category_id, Subcategory.sort_order))).scalars().all()
    return [{"id": s.id, "category_id": s.category_id, "slug": s.slug, "name": s.name} for s in rows]


# ─── Categorías ──────────────────────────────────────────────────────────────
class CategoryBase(BaseModel):
    slug: str
    name: str
    sort_order: int = 0
    active: bool = True


class CategoryUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None


def _cat(c: Category) -> dict:
    return {"id": c.id, "slug": c.slug, "name": c.name, "sort_order": c.sort_order, "active": bool(c.active)}


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    rows = (await db.execute(select(Category).order_by(Category.sort_order))).scalars().all()
    return [_cat(c) for c in rows]


@router.post("/categories", status_code=201)
async def create_category(payload: CategoryBase, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    c = Category(**payload.model_dump())
    db.add(c); await db.commit(); await db.refresh(c)
    return _cat(c)


@router.patch("/categories/{cat_id}")
async def update_category(cat_id: int, payload: CategoryUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    c = (await db.execute(select(Category).where(Category.id == cat_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Categoría no encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    await db.commit(); await db.refresh(c)
    return _cat(c)


@router.delete("/categories/{cat_id}")
async def delete_category(cat_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    c = (await db.execute(select(Category).where(Category.id == cat_id))).scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Categoría no encontrada")
    await db.delete(c); await db.commit()
    return {"ok": True}


# ─── Subcategorías ───────────────────────────────────────────────────────────
class SubcategoryBase(BaseModel):
    category_id: int
    slug: str
    name: str
    sort_order: int = 0
    active: bool = True


class SubcategoryUpdate(BaseModel):
    category_id: Optional[int] = None
    slug: Optional[str] = None
    name: Optional[str] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None


def _sub(s: Subcategory) -> dict:
    return {"id": s.id, "category_id": s.category_id, "slug": s.slug, "name": s.name, "sort_order": s.sort_order, "active": bool(s.active)}


@router.get("/subcategories")
async def list_subcategories(category_id: Optional[int] = Query(None), db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    q = select(Subcategory)
    if category_id:
        q = q.where(Subcategory.category_id == category_id)
    rows = (await db.execute(q.order_by(Subcategory.category_id, Subcategory.sort_order))).scalars().all()
    return [_sub(s) for s in rows]


@router.post("/subcategories", status_code=201)
async def create_subcategory(payload: SubcategoryBase, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    s = Subcategory(**payload.model_dump())
    db.add(s); await db.commit(); await db.refresh(s)
    return _sub(s)


@router.patch("/subcategories/{sub_id}")
async def update_subcategory(sub_id: int, payload: SubcategoryUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    s = (await db.execute(select(Subcategory).where(Subcategory.id == sub_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Subcategoría no encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.commit(); await db.refresh(s)
    return _sub(s)


@router.delete("/subcategories/{sub_id}")
async def delete_subcategory(sub_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_role("admin"))):
    s = (await db.execute(select(Subcategory).where(Subcategory.id == sub_id))).scalar_one_or_none()
    if not s:
        raise HTTPException(404, "Subcategoría no encontrada")
    await db.delete(s); await db.commit()
    return {"ok": True}

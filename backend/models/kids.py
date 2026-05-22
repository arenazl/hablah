"""Modelos del modulo Kids.

- AchievementCatalog: catalogo de logros disponibles (slug + nombre + icono SVG Lucide + descripcion).
- UserAchievement: instancia de logro otorgado a un usuario.

NO usar emojis Unicode en los datos - solo nombres de iconos Lucide
(ej. "Trophy", "Star", "Award") que el frontend renderiza como SVG.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func

from core.database import Base


class AchievementCatalog(Base):
    """Catalogo maestro de achievements posibles."""
    __tablename__ = "achievement_catalog"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(80), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    description = Column(String(300), nullable=False, default="")
    icon_name = Column(String(60), nullable=False)  # nombre del icono Lucide (ej. "Trophy")
    icon_color = Column(String(20), nullable=False, default="#FFB800")  # hex color
    category = Column(String(40), nullable=False, default="kids")  # kids | adult | general
    threshold = Column(Integer, nullable=True)  # sesiones / charlas necesarias (null = al primero)
    order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserAchievement(Base):
    """Achievement otorgado a un usuario."""
    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_slug", name="uq_user_achievement"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_slug = Column(String(80), nullable=False, index=True)
    session_id = Column(Integer, nullable=True)
    awarded_at = Column(DateTime(timezone=True), server_default=func.now())

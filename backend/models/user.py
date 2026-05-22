from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Enum as SAEnum
from sqlalchemy.sql import func
import enum

from core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    student = "student"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    telefono = Column(String(40), nullable=True)
    foto_url = Column(String(500), nullable=True)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.student)
    is_active = Column(Boolean, nullable=False, default=True)

    # Habláh — perfil de aprendizaje
    cefr_level = Column(String(4), nullable=False, default="B1")
    cefr_manual = Column(Boolean, nullable=False, default=False)  # True = usuario fijo el nivel manualmente, no auto-promover
    target_language = Column(String(20), nullable=False, default="en")  # en, pt, it
    base_language = Column(String(20), nullable=False, default="es")
    accent_preference = Column(String(40), nullable=False, default="uk")  # uk, us, neutral

    active_template_id = Column(Integer, nullable=True)
    streak_days = Column(Integer, nullable=False, default=0)
    streak_best = Column(Integer, nullable=False, default=0)
    last_session_at = Column(DateTime(timezone=True), nullable=True)

    target_minutes_per_session = Column(Integer, nullable=False, default=7)
    insistent_mode_enabled = Column(Boolean, nullable=False, default=True)
    daily_reminder_enabled = Column(Boolean, nullable=False, default=False)
    audio_retention_days = Column(Integer, nullable=False, default=30)

    plan = Column(String(40), nullable=False, default="free")  # free, pro, bootcamp

    # Preferencias aprendidas en vivo durante las charlas (override del template).
    # El user dice "corrige menos" en voz alta → un detector lo persiste aquí
    # y se aplica en el super_prompt de la próxima sesión. Keys posibles:
    #   correction_mode: "none" | "recast" | "explicit_soft" | "explicit_strict"
    #   response_length: "terse" | "short" | "medium" | "long"
    #   warmth_level: 1..5
    user_preferences = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

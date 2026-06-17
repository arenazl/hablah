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
    cefr_level = Column(String(4), nullable=False, default="A1")
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

    # ─── Kids module ────────────────────────────────────────────────
    # Si parent_user_id != null, este user es un perfil hijo dentro de la cuenta adulta.
    parent_user_id = Column(Integer, nullable=True, index=True)
    age_group = Column(String(20), nullable=True)  # kids: mini|junior|tween  /  adultos: teen|young_adult|adult|senior
    kid_coins = Column(Integer, nullable=False, default=0)
    kid_rank_slug = Column(String(40), nullable=False, default="curioso")  # curioso | explorador | aventurero | capitan | embajador
    kid_charlas_count = Column(Integer, nullable=False, default=0)
    kid_avatar_color = Column(String(20), nullable=False, default="#FF6AA9")
    kid_buddy_id = Column(String(20), nullable=True)  # personaje/amiguito elegido (perro, dino, conejo, ...) -> voz por personaje
    kid_methodology_order = Column(Integer, nullable=False, default=1)  # etapa del currículo (methodology_stages.order_index) donde está el nene
    # Motor Pedagógico Adaptativo: posición unificada en el track de metodología
    # (methodology_modules.module_order). Generaliza kid_methodology_order a todos.
    curriculum_position = Column(Integer, nullable=False, default=1)

    # ─── Onboarding v16 ────────────────────────────────────────────────────────
    # Datos que el alumno elige en las 4-5 preguntas del onboarding. Alimentan
    # la pata ALUMNO del compositor de prompt (motor pedagógico adaptativo).
    english_self_level = Column(String(40), nullable=True)  # zero|survival|basic|intermediate|upper|advanced|near_native
    learning_goal = Column(String(60), nullable=True)  # trabajo|viajes|hobby|estudio|migracion
    occupation = Column(String(120), nullable=True)  # texto libre
    onboarding_done = Column(Boolean, nullable=False, default=False)
    # Selector de intereses (categoría → subcategoría): IDs de subcategorías elegidas.
    # El sequencer propone tópicos SOLO de estas subcategorías. NULL/[] = todo el catálogo.
    interest_subcategory_ids = Column(JSON, nullable=True)

    # ─── Coach (persona) + género ───────────────────────────────────────────────
    # El género NO afecta la pedagogía; es el default sugerido del coach (que el
    # alumno puede cambiar). preferred_coach_id apunta a coaches.id (persona+voz).
    gender = Column(String(10), nullable=True)  # female | male | (null = sin especificar)
    preferred_coach_id = Column(Integer, nullable=True)  # -> coaches.id

    # Preferencias aprendidas en vivo durante las charlas (override del template).
    # El user dice "corrige menos" en voz alta → un detector lo persiste aquí
    # y se aplica en el super_prompt de la próxima sesión. Keys posibles:
    #   correction_mode: "none" | "recast" | "explicit_soft" | "explicit_strict"
    #   response_length: "terse" | "short" | "medium" | "long"
    #   warmth_level: 1..5
    user_preferences = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

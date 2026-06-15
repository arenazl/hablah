"""Estado del alumno — tablas de MEMORIA del motor adaptativo.

Son las que le dan memoria al sistema (patitas 10/11 del compositor + SRS). El
POST-CLASE (módulo futuro) las ESCRIBE; el camino de la ida persiste el crudo en
`sessions.raw_session_data` para alimentarlas. Hoy se crean vacías: estructura
lista para cuando se construya el post-clase. Ver docs/BLUEPRINT_modelo_y_seed.md §8.
"""
from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func

from core.database import Base


class VocabProgress(Base):
    """SRS por ítem de vocabulario — el motor de la retención (alimenta learner_state)."""
    __tablename__ = "vocab_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    item = Column(String(120), nullable=False)  # "dog", "it's a dog"
    skill_stage = Column(String(20), nullable=False, default="repeat")  # repeat|recognize|recall|use
    status = Column(String(20), nullable=False, default="new")  # new|learning|mastered
    seen_count = Column(Integer, nullable=False, default=0)
    success_count = Column(Integer, nullable=False, default=0)
    fail_count = Column(Integer, nullable=False, default=0)
    ease = Column(Float, nullable=False, default=2.5)  # factor tipo SM-2
    last_seen = Column(Date, nullable=True)
    next_review = Column(Date, nullable=True, index=True)  # el sequencer lo usa
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ReinforcementQueue(Base):
    """Cola de refuerzo — ítems trabados, los prioriza el sequencer."""
    __tablename__ = "reinforcement_queue"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    item = Column(String(120), nullable=False)
    reason = Column(String(80), nullable=True)  # failed_3x | pronunciation | confused_with:X
    priority = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())


class LearnerInterest(Base):
    """Intereses (declarados + DETECTADOS por el post-clase). Evolucionan de peso.
    Distinto de user_interests (N-to-N con topics): acá es texto libre con weight."""
    __tablename__ = "learner_interests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    interest = Column(String(120), nullable=False)  # "dinosaurios", "volcanes"
    source = Column(String(20), nullable=False, default="detected")  # declared | detected
    weight = Column(Float, nullable=False, default=0.5)  # sube cuando reaparece/engancha
    last_seen = Column(Date, nullable=True)


class LearnerTrait(Base):
    """Rasgos cualitativos del alumno inferidos por el post-clase (Mitad B)."""
    __tablename__ = "learner_traits"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    trait = Column(String(200), nullable=False)  # "se engancha con onomatopeyas espaciales"
    confidence = Column(Float, nullable=False, default=0.5)  # 0..1, sube al reaparecer
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SessionInsight(Base):
    """Insights cualitativos de cada clase (Mitad B del post-clase: 1 llamada LLM)."""
    __tablename__ = "session_insights"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    summary = Column(Text, nullable=True)
    affective = Column(String(20), nullable=True)  # engaged | neutral | frustrated
    new_interests = Column(Text, nullable=True)     # JSON list (se guarda como texto)
    items_to_reinforce = Column(Text, nullable=True)  # JSON list
    suggested_topic = Column(String(200), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

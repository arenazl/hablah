"""Metodología / Currículum por etapas (plan de estudios estructurado).

Cada etapa = un tema con vocabulario + UNA estructura gramatical + criterio de
avance, ordenada por progresión (`order_index`). El coach recibe SOLO la etapa
donde está el alumno (el QUÉ enseñar); el prompt define el CÓMO.

Editable por el super admin desde el módulo "Metodología" (ABM). Por grupo
etario (kids mini/junior/tween) y nivel CEFR.
"""
from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text
from sqlalchemy.sql import func

from core.database import Base


class MethodologyStage(Base):
    __tablename__ = "methodology_stages"

    id = Column(Integer, primary_key=True, index=True)
    age_group = Column(String(10), nullable=False, index=True)  # mini | junior | tween
    cefr_level = Column(String(4), nullable=False, default="A0")
    order_index = Column(Integer, nullable=False, default=0)  # orden de progresión
    title = Column(String(120), nullable=False)  # "Saludos", "Colores", ...
    # Vocabulario: lista de {"en": "hello", "es": "hola"}.
    vocabulary = Column(JSON, nullable=False, default=list)
    target_structure = Column(String(200), nullable=True)  # "My name is ___"
    target_structure_es = Column(String(200), nullable=True)  # "Me llamo ___"
    mastery_criteria = Column(String(300), nullable=True)  # cuándo se da por aprendida
    notes = Column(Text, nullable=True)  # notas del pedagogo/admin
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

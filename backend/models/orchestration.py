"""Orchestration — una clase armada y guardada por el profe (doc 11).

Persiste la combinación que el profe compuso en el editor visual (segmento, coach,
nivel, tópico) bajo un nombre, para reusarla. Es authoring: no entra al prompt,
es el atajo para no rearmar la clase cada vez.
"""
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from core.database import Base


class Orchestration(Base):
    __tablename__ = "orchestrations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False)
    student_type = Column(String(20), nullable=False)
    coach_id = Column(Integer, nullable=True)
    level = Column(String(10), nullable=False)
    topic_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

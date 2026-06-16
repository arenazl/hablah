"""Kits — pools de tópicos curados (doc 11 §1.2).

El kit es el pool de tópicos que un alumno puede recibir; el sequencer elige UNO
de ahí por sesión. No entra al prompt: es la fuente de la que se elige. Curado
por el equipo (authoring). Relación N:N kit ↔ topic vía kit_topics.
"""
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from core.database import Base


class Kit(Base):
    __tablename__ = "kits"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(String(300), nullable=False, default="")
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())


class KitTopic(Base):
    __tablename__ = "kit_topics"

    kit_id = Column(Integer, primary_key=True)
    topic_id = Column(Integer, primary_key=True)

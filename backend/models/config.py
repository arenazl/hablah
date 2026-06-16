"""AppConfig — configuración de runtime editable desde el back office (doc 11 §1.5).

Reglas de salida y seguridad como DATO, no como constantes: regla de voz (emojis
solo a pantalla), tolerancia de ASR, guarda de seguridad infantil y los umbrales
del validador determinista (máx. palabras por banda). La idea del doc: que el
engine las lea en vez de hardcodearlas. Tabla key-value tipada para una pantalla
de toggles/umbrales.
"""
from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.sql import func

from core.database import Base


class AppConfig(Base):
    __tablename__ = "app_config"

    key = Column(String(80), primary_key=True)
    value = Column(Text, nullable=False, default="")
    kind = Column(String(20), nullable=False, default="text")   # bool | int | text
    section = Column(String(40), nullable=False, default="general")
    label = Column(String(200), nullable=False, default="")
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

"""Suscripciones Web Push de los usuarios para notificarles eventos clave (lead asignado,
mensaje nuevo del cliente cuando la app esta minimizada)."""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from core.database import Base


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Datos del PushSubscription del navegador
    endpoint = Column(Text, nullable=False)
    p256dh = Column(String(200), nullable=False)
    auth = Column(String(100), nullable=False)

    # Metadata util
    user_agent = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)

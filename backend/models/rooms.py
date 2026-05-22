"""Voice Rooms: charlas de 2+ participantes (anfitrion + invitados sin login).

Una room la crea un usuario logueado (host). Le devuelve un room_token publico.
El host comparte el link `/charla/{token}` y los invitados se unen sin auth -
solo con el token y un nombre.

El backend tiene UNA sola sesion Gemini Live por room. Los audios de los
participantes se mezclan en server-side antes de mandarse a Gemini, y el
audio que Habi responde se broadcastea a todos los participantes.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func

from core.database import Base


class VoiceRoom(Base):
    """Cuarto de charla compartida. Se cierra cuando el host termina o expira."""
    __tablename__ = "voice_rooms"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(40), unique=True, nullable=False, index=True)  # uuid short
    host_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    topic_id = Column(Integer, nullable=True)
    template_id = Column(Integer, nullable=True)
    session_id = Column(Integer, nullable=True)  # id de la sesion Gemini asociada
    status = Column(String(20), nullable=False, default="open")  # open | closed
    free_topic = Column(String(300), nullable=True)
    # Lista de participantes activos: [{"pid": "guest_xxx", "name": "Pepe", "is_host": false}]
    participants = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

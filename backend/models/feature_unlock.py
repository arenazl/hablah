from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from core.database import Base


class UserFeatureUnlock(Base):
    """Registro de cuando un user desbloqueo una feature.

    Las features se desbloquean automaticamente al alcanzar ciertos
    thresholds de sessions_total (ver services/feature_flags.py).
    Persistimos el unlock_at para que:
    - Si bajamos el threshold despues, el user que ya tenia el feature lo
      conserva sin re-disparar el "intro bubble"
    - Podemos forzar unlocks manuales por admin/A-B test (creando una row
      antes de que el user llegue al threshold natural)
    - Sabemos si el user ya vio el intro/tooltip del feature (seen_intro_at)
    """
    __tablename__ = "user_feature_unlocks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    feature_key = Column(String(48), nullable=False)
    unlocked_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    seen_intro_at = Column(DateTime(timezone=True), nullable=True)

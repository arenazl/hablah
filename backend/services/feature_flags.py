"""Sistema de progressive disclosure / feature gating.

Las features se desbloquean automaticamente segun cantidad de sesiones
completadas. Para usuarios kids el modelo es distinto (no aplican estos
gates — los kids tienen su propia progresion via achievements).

Filosofia:
- Usuario nuevo (0 sesiones): ve solo lo escencial → cero abrumamiento
- Cada N sesiones: desbloquea 1 feature nueva con bubble explicativo
- Nada se "esconde" para siempre: a las 30+ sesiones tienen todo

Cambiar thresholds aca no rompe a users existentes: el registro de
user_feature_unlocks captura el momento del unlock y se respeta.
"""
from __future__ import annotations

from datetime import datetime
from typing import TypedDict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.feature_unlock import UserFeatureUnlock


# Lista canonica de features gateables. El orden no importa, pero los
# thresholds si — el frontend usa el threshold para hint "te faltan N
# sesiones para desbloquear X".
FEATURE_THRESHOLDS: dict[str, int] = {
    "streak":           1,   # Streak chip + heatmap basico
    "pedagogy_picker":  3,   # Cambiar estilo del tutor (6 chips)
    "free_topic":       5,   # Hablar de cualquier tema (no solo lista)
    "mapa_basico":      7,   # /mapa con nivel + horas
    "disparadores":    10,   # Click en keyword pivot la charla
    "tune_audio":      14,   # /tune con voz + 4 presets de audio
    "voice_room":      21,   # Invitar amigo a sala compartida
    "detailed_report": 30,   # Report completo con score + audio resumen
}


class FeatureFlag(TypedDict):
    """Estado de una feature para el frontend."""
    unlocked: bool
    threshold: int        # sesiones requeridas
    sessions_left: int    # sesiones que faltan (0 si ya unlocked)
    needs_intro: bool     # mostrar bubble de bienvenida (primera vez)


async def get_feature_flags(
    db: AsyncSession,
    user_id: int,
    sessions_total: int,
    *,
    is_kid: bool = False,
) -> dict[str, FeatureFlag]:
    """Calcula el estado actual de TODAS las features para el user.

    Si is_kid=True devolvemos dict vacio — kids no usa este sistema.
    """
    if is_kid:
        return {}

    # 1) Traer unlocks ya persistidos para el user
    rows = (await db.execute(
        select(UserFeatureUnlock).where(UserFeatureUnlock.user_id == user_id)
    )).scalars().all()
    persisted: dict[str, UserFeatureUnlock] = {r.feature_key: r for r in rows}

    # 2) Para cada feature canonica:
    #    - Si ya esta en `persisted` → unlocked=True
    #    - Si no, chequear si sessions_total alcanza el threshold
    #    - Si alcanza y no esta persistido → crear el registro AHORA (lazy)
    new_unlocks: list[UserFeatureUnlock] = []
    flags: dict[str, FeatureFlag] = {}
    for key, threshold in FEATURE_THRESHOLDS.items():
        existing = persisted.get(key)
        if existing:
            flags[key] = FeatureFlag(
                unlocked=True,
                threshold=threshold,
                sessions_left=0,
                needs_intro=(existing.seen_intro_at is None),
            )
        elif sessions_total >= threshold:
            # Recien alcanzo el threshold — crear registro lazy
            new_row = UserFeatureUnlock(user_id=user_id, feature_key=key)
            db.add(new_row)
            new_unlocks.append(new_row)
            flags[key] = FeatureFlag(
                unlocked=True, threshold=threshold,
                sessions_left=0, needs_intro=True,
            )
        else:
            flags[key] = FeatureFlag(
                unlocked=False, threshold=threshold,
                sessions_left=threshold - sessions_total,
                needs_intro=False,
            )

    if new_unlocks:
        await db.commit()

    return flags


async def mark_intro_seen(
    db: AsyncSession,
    user_id: int,
    feature_key: str,
) -> bool:
    """Marca que el user ya vio el bubble intro del feature.

    Devuelve True si se actualizo, False si no habia row (feature no
    desbloqueado todavia).
    """
    row = (await db.execute(
        select(UserFeatureUnlock).where(
            UserFeatureUnlock.user_id == user_id,
            UserFeatureUnlock.feature_key == feature_key,
        )
    )).scalar_one_or_none()
    if not row:
        return False
    if row.seen_intro_at is None:
        row.seen_intro_at = datetime.utcnow()
        await db.commit()
    return True

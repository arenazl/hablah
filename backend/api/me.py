"""Endpoint /api/me — vista enriquecida del perfil del usuario logueado."""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from core.database import get_db
from core.security import get_current_user
from models.user import User
from models.template import Template, Topic, UserInterest, TopicProgress, Session as SessionModel, ErrorLog

router = APIRouter()

CEFR_ORDER = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]


@router.get("/profile")
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Perfil completo: user + template activo + intereses + progreso + última sesión."""
    template = None
    if current.active_template_id:
        template = (await db.execute(
            select(Template).where(Template.id == current.active_template_id)
        )).scalar_one_or_none()

    interests_rows = await db.execute(
        select(Topic).join(UserInterest, UserInterest.topic_id == Topic.id)
        .where(UserInterest.user_id == current.id)
        .order_by(UserInterest.added_at)
    )
    interests = [
        {"id": t.id, "slug": t.slug, "title": t.title, "category": t.category}
        for t in interests_rows.scalars().all()
    ]

    progress_rows = await db.execute(
        select(TopicProgress, Topic)
        .join(Topic, Topic.id == TopicProgress.topic_id)
        .where(TopicProgress.user_id == current.id)
    )
    progress = []
    for prog, topic in progress_rows.all():
        progress.append({
            "topic_id": topic.id,
            "topic_title": topic.title,
            "stages_done": prog.stages_done,
            "stages_total": prog.stages_total,
            "pct": prog.pct,
            "minutes_spoken": prog.minutes_spoken,
            "sessions_count": prog.sessions_count,
        })

    last_session = (await db.execute(
        select(SessionModel).where(SessionModel.user_id == current.id)
        .order_by(SessionModel.started_at.desc()).limit(1)
    )).scalar_one_or_none()

    total_sessions = (await db.execute(
        select(func.count(SessionModel.id)).where(SessionModel.user_id == current.id)
    )).scalar() or 0

    # Feature gating: desbloqueamos features gradualmente por sessions_total.
    # Kids tiene su propia progresion (achievements) — no aplica este sistema.
    from services.feature_flags import get_feature_flags
    _ag = getattr(current, "age_group", None)
    is_kid = _ag in ("mini", "junior", "tween") or bool(getattr(current, "parent_user_id", None))
    feature_flags = await get_feature_flags(
        db, user_id=current.id, sessions_total=total_sessions, is_kid=is_kid,
    )

    return {
        "user": {
            "id": current.id,
            "email": current.email,
            "nombre": current.nombre,
            "apellido": current.apellido,
            "role": current.role.value if hasattr(current.role, "value") else current.role,
            "cefr_level": current.cefr_level,
            "cefr_manual": getattr(current, "cefr_manual", False),
            "target_language": current.target_language,
            "base_language": current.base_language,
            "accent_preference": current.accent_preference,
            "streak_days": current.streak_days,
            "streak_best": current.streak_best,
            "target_minutes_per_session": current.target_minutes_per_session,
            "insistent_mode_enabled": current.insistent_mode_enabled,
            "daily_reminder_enabled": current.daily_reminder_enabled,
            "audio_retention_days": current.audio_retention_days,
            "plan": current.plan,
        },
        "active_template": {
            "id": template.id, "slug": template.slug, "name": template.name,
            "description": template.description, "voice_id": template.voice_id, "voice_label": template.voice_label,
            "rigor": template.rigor,
            "warmth_level": getattr(template, "warmth_level", None),
            "block_on_repeat": getattr(template, "block_on_repeat", None),
            "interruption_allowed": getattr(template, "interruption_allowed", None),
        } if template else None,
        "interests": interests,
        "progress": progress,
        "last_session": {
            "id": last_session.id, "topic_id": last_session.topic_id,
            "started_at": last_session.started_at.isoformat() if last_session.started_at else None,
            "score": last_session.score,
        } if last_session else None,
        "total_sessions": total_sessions,
        "feature_flags": feature_flags,
    }


@router.post("/feature-flags/{feature_key}/seen")
async def mark_feature_intro_seen(
    feature_key: str,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Marca que el user ya vio el bubble intro de un feature recien desbloqueado."""
    from services.feature_flags import mark_intro_seen
    ok = await mark_intro_seen(db, current.id, feature_key)
    return {"ok": ok}


# ─── Settings ───────────────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import Optional


class SubcatInterests(BaseModel):
    subcategory_ids: list[int]


@router.get("/subcategory-interests")
async def get_subcat_interests(current: User = Depends(get_current_user)):
    """Las subcategorías que el alumno eligió en el selector. El sequencer propone tópicos de ahí."""
    return {"subcategory_ids": getattr(current, "interest_subcategory_ids", None) or []}


@router.put("/subcategory-interests")
async def set_subcat_interests(
    payload: SubcatInterests,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    current.interest_subcategory_ids = [int(x) for x in payload.subcategory_ids]
    await db.commit()
    return {"subcategory_ids": current.interest_subcategory_ids}


@router.get("/next-topic")
async def my_next_topic(db: AsyncSession = Depends(get_db), current: User = Depends(get_current_user)):
    """El tópico que el sequencer elige para el alumno (desde su memoria + subcategorías
    elegidas). NO crea sesión: solo devuelve {topic_id, topic_title} para arrancar la clase."""
    from services.memory_analyzer import suggest_next_topic
    return await suggest_next_topic(db, current.id)


class SettingsUpdate(BaseModel):
    accent_preference: Optional[str] = None
    target_minutes_per_session: Optional[int] = None
    insistent_mode_enabled: Optional[bool] = None
    daily_reminder_enabled: Optional[bool] = None
    audio_retention_days: Optional[int] = None
    active_template_id: Optional[int] = None
    cefr_level: Optional[str] = None
    cefr_manual: Optional[bool] = None
    target_language: Optional[str] = None  # en, pt, es, it
    base_language: Optional[str] = None    # es, pt, en


@router.patch("/settings")
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    # Si el usuario eligio nivel desde la UI sin pasar cefr_manual explicito, lo marcamos manual
    if "cefr_level" in data and "cefr_manual" not in data:
        data["cefr_manual"] = True
    for k, v in data.items():
        setattr(current, k, v)
    await db.commit()
    await db.refresh(current)

    # Si el adulto cambio target_language o base_language, propagar a sus hijos
    # (kids con parent_user_id = current.id). Los kids heredan el idioma del
    # padre - asi cuando el padre cambia a portugues, Timo / Mateo / etc.
    # tambien quedan en portugues sin tener que tocar cada perfil.
    if "target_language" in data or "base_language" in data:
        from models.user import User as UserModel
        from sqlalchemy import update
        propagate: dict = {}
        if "target_language" in data:
            propagate["target_language"] = data["target_language"]
        if "base_language" in data:
            propagate["base_language"] = data["base_language"]
        await db.execute(
            update(UserModel)
            .where(UserModel.parent_user_id == current.id)
            .values(**propagate)
        )
        await db.commit()

    return {"ok": True}


# ─── Streak heatmap ──────────────────────────────────────────────────────────

@router.get("/streak-heatmap")
async def streak_heatmap(
    days: int = 28,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Devuelve [{date, sessions, minutes, level}] para los ultimos N dias.

    level es 0..4 calculado por cantidad de sesiones del dia.
    """
    days = max(1, min(days, 90))
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    start_dt = datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc)

    rows = (await db.execute(
        select(SessionModel.started_at, SessionModel.duration_seconds)
        .where(SessionModel.user_id == current.id)
        .where(SessionModel.started_at >= start_dt)
    )).all()

    bucket: dict[str, dict[str, int]] = {}
    for started_at, dur in rows:
        if not started_at:
            continue
        key = started_at.date().isoformat()
        b = bucket.setdefault(key, {"sessions": 0, "minutes": 0})
        b["sessions"] += 1
        b["minutes"] += int((dur or 0) / 60)

    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        key = d.isoformat()
        b = bucket.get(key, {"sessions": 0, "minutes": 0})
        count = b["sessions"]
        if count == 0:
            level = 0
        elif count == 1:
            level = 1
        elif count == 2:
            level = 2
        elif count == 3:
            level = 3
        else:
            level = 4
        out.append({"date": key, "sessions": count, "minutes": b["minutes"], "level": level})
    return out


# ─── Level progress ──────────────────────────────────────────────────────────

@router.get("/level-progress")
async def level_progress(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """% al proximo nivel + stats (charlas totales, horas habladas, fluidez 30d delta)."""
    current_level = current.cefr_level or "B1"
    try:
        idx = CEFR_ORDER.index(current_level)
    except ValueError:
        idx = CEFR_ORDER.index("B1")
    next_level = CEFR_ORDER[idx + 1] if idx < len(CEFR_ORDER) - 1 else CEFR_ORDER[-1]

    sessions_total = (await db.execute(
        select(func.count(SessionModel.id)).where(SessionModel.user_id == current.id)
    )).scalar() or 0

    total_seconds = (await db.execute(
        select(func.coalesce(func.sum(SessionModel.duration_seconds), 0))
        .where(SessionModel.user_id == current.id)
    )).scalar() or 0
    hours_spoken = round(float(total_seconds) / 3600.0, 1)

    # Avg score last 10 sessions analizadas para % al proximo nivel
    last_scores = (await db.execute(
        select(SessionModel.score)
        .where(SessionModel.user_id == current.id)
        .where(SessionModel.score.is_not(None))
        .order_by(SessionModel.started_at.desc())
        .limit(10)
    )).scalars().all()
    avg_score = float(sum(last_scores)) / len(last_scores) if last_scores else 0.0

    # Banda CEFR: A0=0..15, A1=15..30, A2=30..45, B1=45..60, B2=60..75, C1=75..90, C2=90..100
    bands = {"A0": (0, 15), "A1": (15, 30), "A2": (30, 45), "B1": (45, 60), "B2": (60, 75), "C1": (75, 90), "C2": (90, 100)}
    lo, hi = bands.get(current_level, (45, 60))
    if hi == lo:
        pct = 0
    else:
        pct = int(max(0, min(100, (avg_score - lo) / (hi - lo) * 100)))

    # Fluidez delta 30 dias: avg score ultimos 30 vs 30 previos
    now = datetime.now(timezone.utc)
    d30 = now - timedelta(days=30)
    d60 = now - timedelta(days=60)
    avg_30 = (await db.execute(
        select(func.avg(SessionModel.score))
        .where(SessionModel.user_id == current.id)
        .where(SessionModel.started_at >= d30)
        .where(SessionModel.score.is_not(None))
    )).scalar()
    avg_prev = (await db.execute(
        select(func.avg(SessionModel.score))
        .where(SessionModel.user_id == current.id)
        .where(SessionModel.started_at >= d60)
        .where(SessionModel.started_at < d30)
        .where(SessionModel.score.is_not(None))
    )).scalar()
    fluency_delta_30d = None
    if avg_30 is not None and avg_prev is not None and avg_prev > 0:
        fluency_delta_30d = int(round((float(avg_30) - float(avg_prev))))

    return {
        "current": current_level,
        "next": next_level,
        "pct": pct,
        "sessions_total": sessions_total,
        "hours_spoken": hours_spoken,
        "fluency_delta_30d": fluency_delta_30d,
    }


# ─── Today (mision del dia) ──────────────────────────────────────────────────

@router.get("/today")
async def get_today(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Mision del dia: tópico sugerido + tutor + 3 in-context prompts (vocab/gram/restr).

    Pick del topico: round-robin sobre intereses del user evitando el de la ultima sesion.
    Si no hay intereses, devuelve un tema libre sugerido.
    """
    # Tutor activo
    template = None
    if current.active_template_id:
        template = (await db.execute(
            select(Template).where(Template.id == current.active_template_id)
        )).scalar_one_or_none()

    # Intereses ordenados
    interests = (await db.execute(
        select(Topic).join(UserInterest, UserInterest.topic_id == Topic.id)
        .where(UserInterest.user_id == current.id)
        .order_by(UserInterest.position)
    )).scalars().all()

    # Topico de la ultima sesion (para evitar repetir)
    last_session = (await db.execute(
        select(SessionModel).where(SessionModel.user_id == current.id)
        .order_by(SessionModel.started_at.desc()).limit(1)
    )).scalar_one_or_none()
    last_topic_id = last_session.topic_id if last_session else None

    # Pick: primer interes que no sea el de ayer
    pick: Topic | None = None
    for t in interests:
        if t.id != last_topic_id:
            pick = t
            break
    if pick is None and interests:
        pick = interests[0]

    # 3 in-context prompts derivados del topico
    keyword = (pick.keywords or ["nevertheless"])[0] if pick else "nevertheless"
    topic_title = pick.title if pick else "tema libre"
    in_context_prompts = [
        {"kind": "vocab",  "label": "Vocabulario",
         "text": f"Intentá usar **{keyword}** en alguna idea sobre {topic_title.lower()}."},
        {"kind": "gram",   "label": "Gramática",
         "text": "Contá cómo **empezó** el tema usando **pasado simple**."},
        {"kind": "restr",  "label": "Restricción",
         "text": "El tutor va a discrepar. Expresá **desacuerdo formal**."},
    ]

    # Deteccion simple de error recurrente (rescue): mismo error_key no resuelto en >=3 sesiones distintas
    rescue = None
    if current.insistent_mode_enabled:
        # Top error_key con mas sesiones distintas en ultimos 7 dias, no resuelto
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        rows = (await db.execute(
            select(ErrorLog.error_key, ErrorLog.label, func.count(func.distinct(ErrorLog.session_id)).label("n"))
            .where(ErrorLog.user_id == current.id)
            .where(ErrorLog.resolved == False)
            .where(ErrorLog.detected_at >= cutoff)
            .group_by(ErrorLog.error_key, ErrorLog.label)
            .having(func.count(func.distinct(ErrorLog.session_id)) >= 3)
            .order_by(func.count(func.distinct(ErrorLog.session_id)).desc())
            .limit(1)
        )).all()
        if rows:
            error_key, label, n_sessions = rows[0]
            # 3 ejemplos mas recientes de ese error
            examples = (await db.execute(
                select(ErrorLog.snippet_wrong, ErrorLog.snippet_correct, ErrorLog.detected_at)
                .where(ErrorLog.user_id == current.id)
                .where(ErrorLog.error_key == error_key)
                .where(ErrorLog.resolved == False)
                .order_by(ErrorLog.detected_at.desc())
                .limit(3)
            )).all()
            rescue = {
                "active": True,
                "error_key": error_key,
                "label": label,
                "sessions_count": int(n_sessions),
                "examples": [
                    {"wrong": w, "correct": c, "ctx_date": d.isoformat() if d else None}
                    for w, c, d in examples
                ],
            }

    return {
        "mission": {
            "topic": {"id": pick.id, "slug": pick.slug, "title": pick.title, "category": pick.category} if pick else None,
            "template": {"id": template.id, "name": template.name, "slug": template.slug, "rigor": template.rigor} if template else None,
            "suggested_minutes": current.target_minutes_per_session,
            "level": current.cefr_level,
            "language": current.target_language,
        },
        "in_context_prompts": in_context_prompts,
        "rescue": rescue,
    }

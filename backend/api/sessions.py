from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from core.security import get_current_user
from models.template import Session as SessionModel, Topic, Template, template_voice_for_lang  # noqa: F401
from models.user import User
from schemas.template import SessionStartRequest, SessionResponse, SessionEndRequest

router = APIRouter()


def _serialize(s: SessionModel) -> dict:
    return {
        "id": s.id,
        "user_id": s.user_id,
        "template_id": s.template_id,
        "topic_id": s.topic_id,
        "cefr_at_start": s.cefr_at_start,
        "status": s.status,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        "duration_seconds": s.duration_seconds,
        "transcript": s.transcript or [],
        "metrics": s.metrics or {},
        "report": s.report or {},
        "score": s.score,
        "is_rescue": s.is_rescue,
    }


@router.post("/start")
async def start_session(
    payload: SessionStartRequest,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Inicia una sesión nueva. Devuelve session_id + super-prompt para el LLM."""
    topic = None
    if payload.topic_id:
        topic = (await db.execute(select(Topic).where(Topic.id == payload.topic_id))).scalar_one_or_none()

    # Sequencer: si el alumno no eligió tópico (ni texto libre), lo elige el motor desde
    # su memoria (post-clase): última sugerencia + tópico apropiado a su banda no visto
    # recientemente. Determinista; si no hay datos, queda None y sigue el flujo normal.
    if not topic and not (payload.free_topic and payload.free_topic.strip()):
        try:
            from services.memory_analyzer import suggest_next_topic
            nxt = await suggest_next_topic(db, current.id)
            if nxt.get("topic_id"):
                topic = (await db.execute(select(Topic).where(Topic.id == nxt["topic_id"]))).scalar_one_or_none()
        except Exception:
            pass

    template = None
    template_id = payload.template_id or current.active_template_id
    if template_id:
        template = (await db.execute(select(Template).where(Template.id == template_id))).scalar_one_or_none()

    s = SessionModel(
        user_id=current.id,
        template_id=template.id if template else None,
        topic_id=topic.id if topic else None,
        cefr_at_start=current.cefr_level or "B1",
        status="active",
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)

    # Importar acá para evitar ciclos
    from services.super_prompt import build_super_prompt

    # Si el alumno eligió free_topic (texto libre tipo "cocina mediterránea",
    # "estar soltero a los 40"), pre-generamos un brief narrativo con Gemini Flash.
    # Esto le da al tutor ángulos concretos, hooks y opening line natural —
    # para que la charla NO arranque con preguntas robóticas tipo "tell me about X".
    # Capa de "creatividad conversacional" de Habláh. Ver services/topic_brief.py.
    topic_brief = None
    if payload.free_topic and payload.free_topic.strip() and not topic:
        from services.topic_brief import build_topic_brief
        age_group = getattr(current, "age_group", None)
        is_kid = bool(age_group) or bool(getattr(current, "parent_user_id", None))
        topic_brief = await build_topic_brief(
            free_topic=payload.free_topic,
            cefr=current.cefr_level or "B1",
            target_lang=current.target_language or "en",
            base_lang=current.base_language or "es",
            is_kid=is_kid,
        )


    # Historial del topico para ESTE alumno: cuantas veces lo hizo + frases
    # que el coach YA le enseno (entre comillas en el transcript). Asi el
    # coach EVITA repetir las mismas palabras la proxima vez y trae nuevas
    # del mismo mini-mundo.
    topic_visits = 0
    previous_phrases: list[str] = []
    if topic:
        prev_sessions = (await db.execute(
            select(SessionModel)
            .where(SessionModel.user_id == current.id)
            .where(SessionModel.topic_id == topic.id)
            .where(SessionModel.id != s.id)  # excluir la sesion actual
            .order_by(desc(SessionModel.started_at))
            .limit(5)
        )).scalars().all()
        topic_visits = len(prev_sessions)
        if topic_visits > 0:
            import re
            seen: set[str] = set()
            phrases: list[str] = []
            for ps in prev_sessions:
                for turn in (ps.transcript or []):
                    if turn.get("who") != "ai":
                        continue
                    text = (turn.get("text") or "")
                    # Frases modelo entre comillas (rectas o tipograficas)
                    for m in re.findall(r'["“]([^"”]+)["”]', text):
                        m = m.strip()
                        if 2 <= len(m) <= 40 and m.lower() not in seen:
                            seen.add(m.lower())
                            phrases.append(m)
                            if len(phrases) >= 12:
                                break
                    if len(phrases) >= 12:
                        break
                if len(phrases) >= 12:
                    break
            previous_phrases = phrases

    # El prompt de la clase lo arma el WS de voz (gemini_live) server-side con los datos del
    # motor de 9 pasos; el cliente NO usa este campo (sólo necesita session_id + voz). Por eso
    # acá no se construye: evita un MotorDataMissing y desacopla /start del builder.
    super_prompt = ""
    voice_id = template_voice_for_lang(template, current.target_language, user=current)

    return {
        "session_id": s.id,
        "super_prompt": super_prompt,
        "voice_id": voice_id,
        "template": {
            "id": template.id, "name": template.name, "slug": template.slug,
            "rigor": template.rigor, "challenges_per_min": template.challenges_per_min,
        } if template else None,
        "topic": {
            "id": topic.id, "title": topic.title, "slug": topic.slug,
            "keywords": topic.keywords,
        } if topic else ({"id": None, "title": payload.free_topic, "slug": "free", "keywords": []} if payload.free_topic else None),
    }


@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: int,
    payload: SessionEndRequest,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
    if not s or s.user_id != current.id:
        raise HTTPException(404, "Sesión no encontrada")
    s.transcript = [line.model_dump() for line in payload.transcript]
    s.ended_at = datetime.now(timezone.utc)
    if s.started_at:
        delta = (s.ended_at - s.started_at.replace(tzinfo=timezone.utc)).total_seconds()
        s.duration_seconds = int(delta)
    s.status = "ended"
    await db.commit()
    await db.refresh(s)

    # Dispatch post-sesión (asíncrono, no bloquea): reporte + MEMORIA del alumno.
    from services.session_analyzer import analyze_session_safe
    from services.memory_analyzer import analyze_memory_safe
    import asyncio
    asyncio.create_task(analyze_session_safe(session_id))
    asyncio.create_task(analyze_memory_safe(session_id))

    return _serialize(s)


@router.get("/", response_model=list[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SessionModel)
        .where(SessionModel.user_id == current.id)
        .order_by(desc(SessionModel.started_at))
        .limit(50)
    )
    rows = result.scalars().all()
    return [_serialize(r) for r in rows]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
    if not s or s.user_id != current.id:
        raise HTTPException(404, "Sesión no encontrada")
    return _serialize(s)


from fastapi import Query, Response
from services.elevenlabs import synth as elevenlabs_synth, TUTOR_VOICES


@router.get("/{session_id}/feedback-audio")
async def feedback_audio(
    session_id: int,
    which: str = Query("praise", description="praise | correction_{i}"),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Sintetiza con ElevenLabs (voz del tutor de la sesión) el elogio o una
    corrección del reporte. ON DEMAND — solo se llama si el usuario tappea play."""
    s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
    if not s or s.user_id != current.id:
        raise HTTPException(404, "Sesión no encontrada")
    if not s.report:
        raise HTTPException(400, "Sesión sin reporte todavía")

    text = ""
    if which == "praise":
        text = s.report.get("praise", "")
    elif which.startswith("correction_"):
        try:
            idx = int(which.split("_")[1])
            fb = (s.report.get("feedback") or [])
            if 0 <= idx < len(fb):
                text = fb[idx].get("snippet_correct", "")
        except Exception:
            pass

    if not text:
        raise HTTPException(404, "No hay texto para sintetizar")

    # Voz del tutor de esa sesión segun target_language del user
    voice_id = None
    tpl = None
    if s.template_id:
        tpl = (await db.execute(select(Template).where(Template.id == s.template_id))).scalar_one_or_none()
        if tpl:
            voice_id = template_voice_for_lang(tpl, current.target_language, user=current) or None

    # Aplicar voice settings configurables del template
    vs = _voice_settings_from_template(tpl)
    try:
        audio = await elevenlabs_synth(text, voice_id=voice_id, **vs)
    except Exception as e:
        raise HTTPException(500, f"TTS falló: {e}")

    return Response(content=audio, media_type="audio/mpeg")


def _voice_settings_from_template(tpl):
    """Mapea los enteros 0..100 del template a los floats 0..1 que espera ElevenLabs."""
    if not tpl:
        return {}
    return {
        "stability": (getattr(tpl, "voice_stability", 50) or 50) / 100.0,
        "style": (getattr(tpl, "voice_style", 30) or 30) / 100.0,
    }


@router.get("/{session_id}/summary-audio")
async def summary_audio(
    session_id: int,
    lang: str = Query("es", description="es | en"),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Audio del resumen narrativo de la sesion en castellano o ingles."""
    s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
    if not s or s.user_id != current.id:
        raise HTTPException(404, "Sesion no encontrada")
    if not s.report:
        raise HTTPException(400, "Sesion sin reporte todavia")

    text = s.report.get("summary_en") if lang == "en" else s.report.get("summary")
    if not text:
        raise HTTPException(404, f"No hay summary en {lang}")

    voice_id = None
    tpl_for_summary = None
    if s.template_id:
        tpl_for_summary = (await db.execute(select(Template).where(Template.id == s.template_id))).scalar_one_or_none()
        if tpl_for_summary:
            voice_id = template_voice_for_lang(tpl_for_summary, lang, user=current) or tpl_for_summary.voice_id

    vs = _voice_settings_from_template(tpl_for_summary)
    try:
        audio = await elevenlabs_synth(text, voice_id=voice_id, **vs)
    except Exception as e:
        raise HTTPException(500, f"TTS fallo: {e}")

    return Response(content=audio, media_type="audio/mpeg")

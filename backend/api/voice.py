import json
import logging
from types import SimpleNamespace

from fastapi import APIRouter, WebSocket, Query
from sqlalchemy import select

from core.database import AsyncSessionLocal
from services.gemini_live import voice_proxy
from services.composer_proto import compose_proto_prompt
from services.voice_engine import VoiceEngineContext, get_engine, available_engines
from services.voice_room_engine import (
    Room,
    RoomParticipant,
    get_or_create_room,
    handle_room_ws,
)
from services.super_prompt import build_super_prompt
from services import motor_engine
from models.rooms import VoiceRoom
from models.user import User
from models.template import Topic, Template

router = APIRouter()
log = logging.getLogger(__name__)


@router.websocket("/ws")
async def voice_ws(
    websocket: WebSocket,
    session_id: int = Query(...),
    token: str = Query(...),
    voice: str = Query(None),
):
    """WebSocket bidireccional para conversación en vivo con Gemini Live.

    Cliente debe pasar session_id (creado por POST /api/sessions/start) + token JWT.
    `voice` opcional: voz prebuilt de Gemini (Puck, Charon, ...) por personaje kids.
    """
    await websocket.accept()
    await voice_proxy(websocket, session_id, token, voice_name=voice)


@router.websocket("/ws_room")
async def voice_ws_room(
    websocket: WebSocket,
    room_token: str = Query(...),
    pid: str = Query(...),
    lang: str = Query(None),
):
    """WebSocket de Voice Room: charla multi-participante con 1 sesion Gemini compartida.

    NO requiere JWT - el room_token + pid son suficientes (modelo de invitacion publica).
    El frontend debe pasar:
      - room_token: el token que devolvio POST /api/rooms
      - pid: el participant id (host_pid del host, o guest_pid devuelto por /join)
      - lang: opcional - override del target_language para esta room.
              Usado por /tune para forzar idioma sin tocar el user. Valores
              validos: en, es, pt, it, fr, de.
    """
    await websocket.accept()

    # Cargar room desde BD para validar token + pid
    async with AsyncSessionLocal() as db:
        vroom = (await db.execute(select(VoiceRoom).where(VoiceRoom.token == room_token))).scalar_one_or_none()
        if not vroom:
            await websocket.close(code=4004)
            return
        if vroom.status != "open":
            await websocket.close(code=4003)
            return

        participants = vroom.participants or []
        match = next((p for p in participants if p["pid"] == pid), None)
        if not match:
            await websocket.close(code=4001)
            return

        # Construir el ctx una sola vez (cuando se crea la room en memoria)
        host = (await db.execute(select(User).where(User.id == vroom.host_user_id))).scalar_one_or_none()
        # Override de idioma si el query param lang esta presente. Modificamos
        # el atributo en memoria (no se commitea a BD) para que build_super_prompt
        # lo use al armar el prompt del coach.
        if host and lang and lang in ("en", "es", "pt", "it", "fr", "de"):
            host.target_language = lang
        topic = None
        if vroom.topic_id:
            topic = (await db.execute(select(Topic).where(Topic.id == vroom.topic_id))).scalar_one_or_none()
        template = None
        if vroom.template_id:
            template = (await db.execute(select(Template).where(Template.id == vroom.template_id))).scalar_one_or_none()

        super_prompt = build_super_prompt(
            user=host, template=template, topic=topic,
        )

    is_kid_host = bool(getattr(host, "age_group", None)) or bool(getattr(host, "parent_user_id", None)) if host else False
    effective_lang = (lang if (lang and lang in ("en", "es", "pt", "it", "fr", "de")) else (host.target_language if host else "en"))
    ctx = VoiceEngineContext(
        session_id=vroom.session_id or 0,
        user_id=vroom.host_user_id,
        user_name=host.nombre if host else None,
        is_kid=is_kid_host,
        template_id=template.id if template else None,
        super_prompt=super_prompt,
        voice_id=template.voice_id if template else "",
        language=effective_lang,
        target_language=effective_lang,
        silence_tolerance_ms=template.silence_tolerance_ms if template else 800,
        interruption_allowed=template.interruption_allowed if template else False,
    )

    room: Room = await get_or_create_room(room_token, ctx)
    participant = RoomParticipant(
        pid=pid,
        name=match["name"],
        is_host=match.get("is_host", False),
        ws=websocket,
    )

    try:
        await handle_room_ws(websocket, room, participant)
    except Exception as e:
        log.exception("voice_ws_room error: %s", e)


# ─── Banco de pruebas de voz (ruta frontend /llm) ────────────────────────────
# Tópico ESTÁTICO para el banco de pruebas (sin BD). Nene A0, animales.
_LLM_TEST_TOPIC = SimpleNamespace(
    title="Animals",
    pinned_vocabulary=["dog", "cat", "fish"],
    keywords=["dog", "cat", "fish"],
)

# Riel del banco: método de FRASE-PUENTE. El nene repite "<palabra-ES> se dice
# <word-EN>" (ej: "perro se dice dog"), nunca el monosílabo suelto — así dura lo
# suficiente para que el VAD lo cace Y es A0-doable (90% español). Es estático y
# solo del banco: NO toca el _FALLBACK_RIELS_A0_MINI de prod.
_LLM_METHODOLOGY = {
    "ai_restraints": (
        "  - UN SOLO PASO POR TURNO: das un contexto cortito + un ejemplo y cerrás SIEMPRE con \"ahora vos\".\n"
        "  - El alumno repite una FRASE-PUENTE bilingüe, NUNCA una palabra suelta: \"<palabra en español> se dice <word en inglés>\" (ej: \"perro se dice dog\"). Es 90% español con la palabra nueva en inglés adentro — un nene A0 la puede decir, y dura lo suficiente para escucharse entera.\n"
        "  - PROHIBIDO pedir que repita SOLO la palabra en inglés suelta (ej: solo \"dog\"): es demasiado corta y no se entiende. Siempre la frase-puente entera.\n"
        "  - Tu turno termina con \"ahora vos: <palabra-ES> se dice <word-EN>\" y PARÁS. No sigas hasta que responda.\n"
        "  - Turnos muy cortos (máx ~25 palabras). No te cuelgues con explicaciones largas.\n"
        "  - La unidad que aprende es la palabra suelta; la frase-puente es solo el envoltorio para que la diga completa.\n"
        "  - NUNCA mientas: si no la dijo bien, repetí con más energía, no festejes de mentira."
    ),
}
_LLM_TOPIC_CONTENT = {
    "allowed_vocabulary": ["dog", "cat", "fish"],
    "required_keywords": [],
    "story_spine": "Timi y HABI conocen animales. Cada animal que Timi nombra con la frase-puente aparece en la mini-aventura.",
    "start_trigger": (
        "Es la PRIMERA clase de {name}. Arrancá presentándote cálido y corto POR TU NOMBRE "
        "(\"¡Hola {name}! Soy tu profe...\"). Anunciá el tema de hoy con un gancho "
        "(\"Hoy vamos a conocer animales, ¿alguna vez viste un perro?\"). Después presentá la "
        "primera palabra con la frase-puente \"Perro se dice dog\". Cerrá con "
        "\"Ahora vos: perro se dice dog\" y esperá; NO sigas hasta que responda. "
        "Todo en 3-4 frases cortas, sin colgarte."
    ),
}
_LLM_VALID_VOICES = {"Puck", "Charon", "Kore", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"}
_LLM_START_SENS = {"START_SENSITIVITY_HIGH", "START_SENSITIVITY_LOW", "START_SENSITIVITY_UNSPECIFIED"}
_LLM_END_SENS = {"END_SENSITIVITY_HIGH", "END_SENSITIVITY_LOW", "END_SENSITIVITY_UNSPECIFIED"}
_LLM_ACTIVITY = {"START_OF_ACTIVITY_INTERRUPTS", "NO_INTERRUPTION"}


@router.websocket("/ws_llm_test")
async def voice_ws_llm_test(
    websocket: WebSocket,
    engine: str = Query("gemini_live"),
    model: str = Query("models/gemini-3.1-flash-live-preview"),
    voice: str = Query("Aoede"),
    start_sens: str = Query("START_SENSITIVITY_HIGH"),
    end_sens: str = Query("END_SENSITIVITY_HIGH"),
    silence_ms: int = Query(500),
    prefix_ms: int = Query(200),
    activity: str = Query("START_OF_ACTIVITY_INTERRUPTS"),
    thinking: int = Query(256),
    age_group: str = Query("mini"),
    level: str = Query("A0"),
):
    """Banco de pruebas AISLADO de voz / turn-taking (ruta frontend /llm).

    NO toca la BD, NO pide JWT, NO persiste nada. Arma el prompt de 9 bloques con
    datos ESTÁTICOS (fallbacks del composer) para un nene A0 y corre el engine con
    TODOS los knobs de VAD/turn-taking ajustables por query param, para tunear en
    vivo qué config toma mejor la voz. No afecta a la app.
    """
    await websocket.accept()
    safe_voice = voice if voice in _LLM_VALID_VOICES else "Aoede"
    seg = age_group if age_group in ("mini", "junior", "tween", "adult") else "mini"
    lvl = level if level in ("A0", "A1", "A2", "B1", "B2", "C1", "C2") else "A0"
    # Prompt REAL del motor desde la BD para (segmento, nivel) — los 28 del smoke test.
    # Lee catálogos (no persiste). Fail-fast: si falta un dato, cierra con error.
    from core.database import AsyncSessionLocal
    from sqlalchemy import select as _sel, text as _text
    from models.methodology import StudentType as _ST, Level as _LV
    from models.template import Topic as _TP
    from services.composer_proto import MotorDataMissing
    async with AsyncSessionLocal() as _db:
        _st = (await _db.execute(_sel(_ST).where(_ST.slug == seg))).scalar_one_or_none()
        _lv = (await _db.execute(_sel(_LV).where(_LV.code == lvl))).scalar_one_or_none()
        _aud = "kid" if seg in ("mini", "junior", "tween") else "adult"
        _tp = (await _db.execute(_sel(_TP).where(_TP.is_active.is_(True), _TP.audience == _aud).limit(1))).scalars().first()
        # la tabla app_config real usa columnas config_key/config_value (no el ORM key/value) -> raw SQL
        _appcfg = {r[0]: r[1] for r in (await _db.execute(_text("SELECT config_key, config_value FROM app_config"))).all()}
    st_data = {
        "slug": _st.slug, "tutor_mascot": _st.tutor_mascot, "tutor_identity": _st.tutor_identity,
        "tutor_tonal_rules": _st.tutor_tonal_rules, "session_focus": _st.session_focus,
        "pedagogy": _st.pedagogy, "form_rules": _st.form_rules, "opening_seed": _st.opening_seed,
        "continuation_seed": _st.continuation_seed, "closing_seed": _st.closing_seed,
    } if _st else None
    level_data = {
        "language_rule": _lv.language_rule, "curriculum_grammar": _lv.curriculum_grammar,
        "expected_production": _lv.expected_production, "duration_base_minutes": _lv.duration_base_minutes,
        "vocab_depth": _lv.vocab_depth,
    } if _lv else None
    user = SimpleNamespace(nombre="Timi", target_language="en", base_language="es",
                           cefr_level=lvl, age_group=seg)
    try:
        super_prompt = compose_proto_prompt(user=user, topic=_tp, student_type_data=st_data,
                                            level_data=level_data, app_config=_appcfg)
    except MotorDataMissing as _e:
        log.warning("voice_ws_llm_test: dato faltante %s/%s: %s", seg, lvl, _e)
        await websocket.close(code=1011)
        return
    ctx = VoiceEngineContext(
        session_id=0,
        user_id=0,
        user_name=user.nombre,
        is_kid=seg in ("mini", "junior", "tween"),
        super_prompt=super_prompt,
        voice_id=None,
        voice_name=safe_voice,
        language="es",
        target_language="en",
        silence_tolerance_ms=1500,
        interruption_allowed=True,
        model_override=model or None,
        start_sensitivity_override=start_sens if start_sens in _LLM_START_SENS else None,
        end_sensitivity_override=end_sens if end_sens in _LLM_END_SENS else None,
        silence_ms_override=int(min(max(silence_ms, 0), 2000)),
        prefix_padding_override=int(min(max(prefix_ms, 0), 1000)),
        activity_handling_override=activity if activity in _LLM_ACTIVITY else None,
        thinking_budget_override=int(min(max(thinking, 0), 4096)),
    )
    engine_name = engine if engine in available_engines() else "gemini_live"
    log.info("voice_ws_llm_test: engine=%s model=%s voice=%s start=%s end=%s silence=%s prefix=%s act=%s think=%s",
             engine_name, model, safe_voice, start_sens, end_sens, silence_ms, prefix_ms, activity, thinking)
    try:
        eng = get_engine(engine_name)
        async for _line in eng.run(websocket, ctx):
            pass
    except Exception as e:
        log.exception("voice_ws_llm_test error: %s", e)
        try:
            await websocket.close()
        except Exception:
            pass


@router.websocket("/ws_orchestration")
async def voice_ws_orchestration(
    websocket: WebSocket,
    band_code: str = Query("adult"),
    level_code: str = Query("B2"),
    topic_id: int = Query(0),
    overrides: str = Query(""),
    engine: str = Query("gemini_live"),
    model: str = Query("models/gemini-3.1-flash-live-preview"),
    voice: str = Query("Aoede"),
):
    """Prueba de voz de UNA ORQUESTACIÓN v3 COMPLETA (ruta frontend /probar-orq).

    Resuelve el circuito con el MOTOR v3 (banda × nivel × tópico + overrides JIT del
    fine-tuning) y conversa con ESE prompt — toda la orquestación, no el proto genérico.
    Sin login / sin BD persistida. overrides = JSON [{slot,action,target_id?,body?}].
    """
    await websocket.accept()
    safe_voice = voice if voice in _LLM_VALID_VOICES else "Aoede"
    try:
        ovr = json.loads(overrides) if overrides else None
    except Exception:
        ovr = None
    try:
        res = await motor_engine.resolve(band_code, level_code, topic_id or None, None, ovr)
        super_prompt = res["prompt"]
    except Exception as e:
        log.warning("voice_ws_orchestration resolve falló %s/%s: %s", band_code, level_code, e)
        await websocket.close(code=1011)
        return
    ctx = VoiceEngineContext(
        session_id=0, user_id=0, user_name="Alumno",
        is_kid=band_code in ("early_child", "child"),
        super_prompt=super_prompt, voice_id=None, voice_name=safe_voice,
        language="es", target_language="en",
        silence_tolerance_ms=1500, interruption_allowed=True,
        model_override=model or None,
    )
    engine_name = engine if engine in available_engines() else "gemini_live"
    log.info("voice_ws_orchestration: %s/%s topic=%s engine=%s voice=%s overrides=%s",
             band_code, level_code, topic_id, engine_name, safe_voice, bool(ovr))
    try:
        eng = get_engine(engine_name)
        async for _line in eng.run(websocket, ctx):
            pass
    except Exception as e:
        log.exception("voice_ws_orchestration error: %s", e)
        try:
            await websocket.close()
        except Exception:
            pass

import logging

from fastapi import APIRouter, WebSocket, Query
from sqlalchemy import select

from core.database import AsyncSessionLocal
from services.gemini_live import voice_proxy
from services.voice_engine import VoiceEngineContext
from services.voice_room_engine import (
    Room,
    RoomParticipant,
    get_or_create_room,
    handle_room_ws,
)
from services.super_prompt import build_super_prompt
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
):
    """WebSocket bidireccional para conversación en vivo con Gemini Live.

    Cliente debe pasar session_id (creado por POST /api/sessions/start) + token JWT.
    """
    await websocket.accept()
    await voice_proxy(websocket, session_id, token)


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

        admin_directives: list[str] = []
        if template:
            from services.admin_feedback import load_active_directives
            admin_directives = await load_active_directives(template.id, db)
        super_prompt = build_super_prompt(
            user=host, template=template, topic=topic,
            admin_directives=admin_directives,
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

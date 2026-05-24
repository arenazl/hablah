"""Proxy WebSocket Habláh ↔ motor de voz activo.

DEPRECATED como nombre — ya no es solo Gemini. El archivo se mantiene por
compatibilidad con imports existentes. Toda la lógica delega a
services.voice_engine.get_engine() que decide qué motor usar según ENV.

Para cambiar de proveedor: editar VOICE_ENGINE en .env (gemini_live por default).
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import WebSocket

from core.config import settings
from core.database import AsyncSessionLocal
from core.security import decode_token
from sqlalchemy import select
from models.template import Session as SessionModel, Template, Topic, template_voice_for_lang
from models.user import User
from services.super_prompt import build_super_prompt
from services.voice_engine import VoiceEngineContext, get_engine

log = logging.getLogger(__name__)


# Re-export para compatibilidad con smoke_test.py
from services.voice_engines.gemini_live_engine import LIVE_API_URL, LIVE_MODEL  # noqa: F401


async def _load_session_context(session_id: int) -> Optional[dict]:
    async with AsyncSessionLocal() as db:
        s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
        if not s:
            return None
        user = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
        template = None
        topic = None
        if s.template_id:
            template = (await db.execute(select(Template).where(Template.id == s.template_id))).scalar_one_or_none()
        if s.topic_id:
            topic = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none()
        if not user:
            return None
        admin_directives: list[str] = []
        if template:
            from services.admin_feedback import load_active_directives
            admin_directives = await load_active_directives(template.id, db)
        return {
            "session_id": s.id,
            "user_id": user.id,
            "template_id": template.id if template else None,
            "super_prompt": build_super_prompt(
                user=user, template=template, topic=topic,
                admin_directives=admin_directives,
            ),
            "voice_id": template_voice_for_lang(template, user.target_language, user=user) if template else None,
            "language": user.target_language or "en",
            "target_language": user.target_language or "en",
            "silence_tolerance_ms": getattr(template, "silence_tolerance_ms", 800) if template else 800,
            "interruption_allowed": getattr(template, "interruption_allowed", False) if template else False,
        }


async def voice_proxy(ws: WebSocket, session_id: int, token: str) -> None:
    # Validar JWT
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        await ws.close(code=4001)
        return

    ctx_dict = await _load_session_context(session_id)
    if not ctx_dict or ctx_dict["user_id"] != user_id:
        await ws.close(code=4004)
        return

    ctx = VoiceEngineContext(
        session_id=ctx_dict["session_id"],
        user_id=ctx_dict["user_id"],
        template_id=ctx_dict.get("template_id"),
        super_prompt=ctx_dict["super_prompt"],
        voice_id=ctx_dict["voice_id"],
        language=ctx_dict["language"],
        target_language=ctx_dict["target_language"],
        silence_tolerance_ms=ctx_dict.get("silence_tolerance_ms", 800),
        interruption_allowed=ctx_dict.get("interruption_allowed", False),
    )

    engine_name = os.environ.get("VOICE_ENGINE", "gemini_live")
    log.info(f"voice_proxy: session={session_id} engine={engine_name}")
    engine = get_engine(engine_name)

    # Acumular líneas para persistir
    transcript: list[dict] = []
    async for line in engine.run(ws, ctx):
        transcript.append(line)

    if transcript:
        async with AsyncSessionLocal() as db:
            s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
            if s:
                existing = s.transcript or []
                s.transcript = existing + transcript
                await db.commit()

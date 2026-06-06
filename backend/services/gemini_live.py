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
        is_kid = bool(getattr(user, "age_group", None)) or bool(getattr(user, "parent_user_id", None))

        # Calcular qué keywords del topic ya se usaron en las ultimas 5 sesiones
        # del MISMO user+topic. Esto evita que el coach siempre arranque con el
        # mismo dato (ej. "Last of Us" en topic videojuegos).
        recently_used_keywords: set[str] = set()
        if topic and topic.keywords and s.user_id and s.topic_id:
            recent_sessions = (await db.execute(
                select(SessionModel.transcript)
                .where(SessionModel.user_id == s.user_id)
                .where(SessionModel.topic_id == s.topic_id)
                .where(SessionModel.id != s.id)
                .order_by(SessionModel.id.desc())
                .limit(5)
            )).all()
            kw_lower = {k.lower(): k for k in topic.keywords}
            for (tr,) in recent_sessions:
                if not tr:
                    continue
                ai_text = " ".join(
                    (line.get("text") or "") for line in tr
                    if isinstance(line, dict) and line.get("who") == "ai"
                ).lower()
                for kl, kw in kw_lower.items():
                    if kl in ai_text:
                        recently_used_keywords.add(kw)

        # Objetivo pedagogico de ESTA sesion (invisible al alumno).
        # Pickeamos UN objetivo del catalogo del nivel del alumno, excluyendo
        # los que se trabajaron en las ultimas 5 sesiones (cualquier topic).
        from services.learning_objectives import pick_objective
        from sqlalchemy import update
        recent_objective_codes: set[str] = set()
        if s.user_id:
            recent_codes_rows = (await db.execute(
                select(SessionModel.learning_objective_code)
                .where(SessionModel.user_id == s.user_id)
                .where(SessionModel.id != s.id)
                .where(SessionModel.learning_objective_code.isnot(None))
                .order_by(SessionModel.id.desc())
                .limit(5)
            )).all()
            recent_objective_codes = {r[0] for r in recent_codes_rows if r[0]}
        learning_objective = pick_objective(
            user.cefr_level or "B1",
            recently_used_codes=recent_objective_codes,
        )
        if learning_objective:
            await db.execute(
                update(SessionModel)
                .where(SessionModel.id == s.id)
                .values(learning_objective_code=learning_objective["code"])
            )
            await db.commit()

        return {
            "session_id": s.id,
            "user_id": user.id,
            "user_name": user.nombre,
            "is_kid": is_kid,
            "template_id": template.id if template else None,
            "super_prompt": build_super_prompt(
                user=user, template=template, topic=topic,
                admin_directives=admin_directives,
                recently_used_keywords=recently_used_keywords,
                learning_objective=learning_objective,
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
        user_name=ctx_dict.get("user_name"),
        is_kid=ctx_dict.get("is_kid", False),
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

"""Proxy WebSocket Habláh ↔ Gemini Live API.

Diseño:
- El frontend abre WS a /api/voice/ws?session_id=NN&token=JWT.
- Validamos token, cargamos sesión, armamos super-prompt (ya guardado al start).
- Abrimos WS a la Live API de Google con setup inicial (model, voice, system_instruction).
- Forwardeamos cada frame de audio del cliente → Google y cada respuesta (audio + transcripción)
  de Google → cliente.
- Al cerrar, guardamos la transcripción consolidada en sessions.transcript.

NOTA: La Live API de Google está en preview. Cuando GA cambie endpoint/protocolo,
solo cambia este archivo.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import Optional

import httpx
import websockets
from fastapi import WebSocket, WebSocketDisconnect

from core.config import settings
from core.database import AsyncSessionLocal
from core.security import decode_token
from sqlalchemy import select
from models.template import Session as SessionModel, Template, Topic
from models.user import User
from services.super_prompt import build_super_prompt

log = logging.getLogger(__name__)


# Endpoint Live API (audio nativo bidireccional)
LIVE_API_URL = (
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)
LIVE_MODEL = "models/gemini-2.5-flash-native-audio-latest"


async def _load_session_context(session_id: int) -> Optional[dict]:
    """Carga user + template + topic + super-prompt en memoria."""
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
        return {
            "session_id": s.id,
            "user_id": user.id,
            "super_prompt": build_super_prompt(user=user, template=template, topic=topic),
            "voice_id": (template.voice_id if template else None),
            "language": user.target_language or "en",
        }


async def voice_proxy(ws: WebSocket, session_id: int, token: str) -> None:
    """Proxy bidireccional cliente ↔ Gemini Live.

    Protocolo del cliente:
      send: { "type": "audio", "data": "<base64 PCM 16kHz mono>" }
      send: { "type": "end" }
      recv: { "type": "audio", "data": "<base64 mp3/pcm>" }
      recv: { "type": "transcript", "who": "ai"|"user", "text": "..." }
    """
    # Validar JWT
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        await ws.close(code=4001)
        return

    ctx = await _load_session_context(session_id)
    if not ctx or ctx["user_id"] != user_id:
        await ws.close(code=4004)
        return

    if not settings.GEMINI_API_KEY:
        await ws.close(code=4500)
        return

    # Conectar a Gemini Live
    google_url = f"{LIVE_API_URL}?key={settings.GEMINI_API_KEY}"
    try:
        google_ws = await websockets.connect(google_url, max_size=2**24)
    except Exception as e:
        log.exception("No pude abrir WS a Gemini Live: %s", e)
        await ws.send_json({"type": "error", "error": "live_unavailable"})
        await ws.close(code=4502)
        return

    # Setup inicial Gemini Live
    setup = {
        "setup": {
            "model": LIVE_MODEL,
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {"voiceName": "Aoede"},
                    },
                    "languageCode": "en-GB" if ctx["language"] == "en" else "en-US",
                },
            },
            "systemInstruction": {
                "parts": [{"text": ctx["super_prompt"]}],
            },
        }
    }
    await google_ws.send(json.dumps(setup))

    # Buffer de transcripción para guardar al final
    transcript: list[dict] = []

    async def client_to_google():
        try:
            while True:
                msg = await ws.receive_json()
                if msg.get("type") == "audio":
                    b64 = msg.get("data", "")
                    await google_ws.send(json.dumps({
                        "realtimeInput": {
                            "mediaChunks": [{"mimeType": "audio/pcm;rate=16000", "data": b64}]
                        }
                    }))
                elif msg.get("type") == "end":
                    await google_ws.close()
                    return
        except WebSocketDisconnect:
            await google_ws.close()
        except Exception as e:
            log.exception("client_to_google error: %s", e)
            await google_ws.close()

    async def google_to_client():
        try:
            async for raw in google_ws:
                try:
                    data = json.loads(raw)
                except Exception:
                    continue
                # Server content (audio chunks + text)
                sc = data.get("serverContent")
                if not sc:
                    continue
                model_turn = sc.get("modelTurn") or {}
                for part in model_turn.get("parts", []):
                    inline = part.get("inlineData")
                    if inline and inline.get("mimeType", "").startswith("audio"):
                        await ws.send_json({"type": "audio", "data": inline["data"]})
                    text = part.get("text")
                    if text:
                        transcript.append({"who": "ai", "text": text})
                        await ws.send_json({"type": "transcript", "who": "ai", "text": text})
                # Input transcription (lo que dijo el alumno, transcripto por Google)
                input_transcription = sc.get("inputTranscription")
                if input_transcription and input_transcription.get("text"):
                    t = input_transcription["text"]
                    transcript.append({"who": "user", "text": t})
                    await ws.send_json({"type": "transcript", "who": "user", "text": t})
                if sc.get("turnComplete"):
                    await ws.send_json({"type": "turn_complete"})
        except websockets.ConnectionClosed:
            pass
        except Exception as e:
            log.exception("google_to_client error: %s", e)

    try:
        await asyncio.gather(client_to_google(), google_to_client())
    finally:
        # Persistir transcripción al cierre
        if transcript:
            async with AsyncSessionLocal() as db:
                s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
                if s:
                    existing = s.transcript or []
                    s.transcript = existing + transcript
                    await db.commit()
        try:
            await google_ws.close()
        except Exception:
            pass

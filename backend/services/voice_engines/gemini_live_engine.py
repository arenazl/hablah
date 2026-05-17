"""Gemini Live engine — WebSocket bidireccional con audio nativo (Aoede).

Latencia ~500ms. Es el default para conversación en vivo.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncIterator

import websockets
from fastapi import WebSocket, WebSocketDisconnect

from core.config import settings
from services.voice_engine import VoiceEngine, VoiceEngineContext

log = logging.getLogger(__name__)


LIVE_API_URL = (
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)
# Modelo más nuevo habilitado en la API key actual (Gemini 3.1 Live preview)
LIVE_MODEL = "models/gemini-3.1-flash-live-preview"


class GeminiLiveEngine(VoiceEngine):
    name = "gemini_live"

    async def run(self, ws: WebSocket, ctx: VoiceEngineContext) -> AsyncIterator[dict]:
        if not settings.GEMINI_API_KEY:
            await ws.send_json({"type": "error", "error": "GEMINI_API_KEY missing"})
            return

        url = f"{LIVE_API_URL}?key={settings.GEMINI_API_KEY}"
        try:
            google_ws = await websockets.connect(url, max_size=2**24)
        except Exception as e:
            log.exception("No pude abrir WS a Gemini Live: %s", e)
            await ws.send_json({"type": "error", "error": "live_unavailable"})
            return

        setup = {
            "setup": {
                "model": LIVE_MODEL,
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Aoede"}},
                    },
                },
                "systemInstruction": {"parts": [{"text": ctx.super_prompt}]},
            }
        }
        await google_ws.send(json.dumps(setup))

        transcript: list[dict] = []

        async def client_to_google() -> None:
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
                log.exception("client_to_google: %s", e)
                await google_ws.close()

        async def google_to_client() -> None:
            try:
                async for raw in google_ws:
                    try:
                        data = json.loads(raw)
                    except Exception:
                        continue
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
                    input_tr = sc.get("inputTranscription")
                    if input_tr and input_tr.get("text"):
                        t = input_tr["text"]
                        transcript.append({"who": "user", "text": t})
                        await ws.send_json({"type": "transcript", "who": "user", "text": t})
                    if sc.get("turnComplete"):
                        await ws.send_json({"type": "turn_complete"})
            except websockets.ConnectionClosed:
                pass
            except Exception as e:
                log.exception("google_to_client: %s", e)

        try:
            await asyncio.gather(client_to_google(), google_to_client())
        finally:
            try:
                await google_ws.close()
            except Exception:
                pass

        for line in transcript:
            yield line

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
                # VAD automático: Gemini detecta inicio/fin de turno por silencio
                "realtimeInputConfig": {
                    "automaticActivityDetection": {
                        "disabled": False,
                        "startOfSpeechSensitivity": "START_SENSITIVITY_HIGH",
                        "endOfSpeechSensitivity": "END_SENSITIVITY_HIGH",
                        "prefixPaddingMs": 200,
                        # Configurable por template via silence_tolerance_ms
                        "silenceDurationMs": ctx.silence_tolerance_ms,
                    },
                    "activityHandling": (
                        "START_OF_ACTIVITY_INTERRUPTS" if ctx.interruption_allowed else "NO_INTERRUPTION"
                    ),
                },
                # Transcripción del usuario (lo que dijo, en texto)
                "inputAudioTranscription": {},
                # Transcripción del tutor también, para mostrar en el panel lateral
                "outputAudioTranscription": {},
                "systemInstruction": {"parts": [{"text": ctx.super_prompt}]},
            }
        }
        await google_ws.send(json.dumps(setup))

        # Trigger inicial: solo "start" — el tono y la apertura ya están en el system prompt.
        await google_ws.send(json.dumps({
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": "(start)"}]}],
                "turnComplete": True,
            }
        }))

        transcript: list[dict] = []

        async def client_to_google() -> None:
            try:
                while True:
                    msg = await ws.receive_json()
                    if msg.get("type") == "audio":
                        b64 = msg.get("data", "")
                        # Live API v1beta (modelo 3.1): realtimeInput.audio (singular)
                        # — mediaChunks fue deprecado.
                        await google_ws.send(json.dumps({
                            "realtimeInput": {
                                "audio": {"mimeType": "audio/pcm;rate=16000", "data": b64}
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
                        # texto en parts: ocurre raro en modo audio, pero por las dudas
                        text = part.get("text")
                        if text:
                            transcript.append({"who": "ai", "text": text})
                            await ws.send_json({"type": "transcript", "who": "ai", "text": text})

                    # outputTranscription = lo que dice el TUTOR (transcripción del audio que él genera)
                    out_tr = sc.get("outputTranscription")
                    if out_tr and out_tr.get("text"):
                        t = out_tr["text"]
                        transcript.append({"who": "ai", "text": t})
                        await ws.send_json({"type": "transcript", "who": "ai", "text": t})

                    # inputTranscription = lo que dice el USER
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

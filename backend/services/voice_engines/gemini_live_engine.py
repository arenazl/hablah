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


async def _maybe_detect_preference(*, user_id, user_text, target_lang, google_ws, client_ws):
    """Wrapper que llama al detector y, si aplicó cambio, notifica al cliente."""
    from services.preference_detector import detect_and_apply

    async def send_system_update(text: str) -> None:
        # Inyectamos un mensaje system al Gemini Live para que el tutor adapte el próximo turno
        await google_ws.send(json.dumps({
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": text}]}],
                "turnComplete": True,
            }
        }))

    try:
        result = await detect_and_apply(
            user_id=user_id,
            user_text=user_text,
            target_lang=target_lang,
            send_system_update=send_system_update,
        )
        if result:
            # Notificar al frontend para mostrar toast
            try:
                await client_ws.send_json({
                    "type": "preference_applied",
                    "changes": result["changes"],
                    "confirmation": result.get("confirmation", ""),
                })
            except Exception:
                pass
    except Exception as e:
        log.exception("preference detector failed: %s", e)


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
        # Gemini Live manda outputTranscription/inputTranscription en chunks
        # palabra-por-palabra. Lo acumulamos en un buffer y persistimos UNA
        # entrada por turno cuando llega turnComplete (o cuando cambia el rol).
        ai_buf: list[str] = []
        user_buf: list[str] = []

        def _flush_buffers():
            if ai_buf:
                full = "".join(ai_buf).strip()
                if full:
                    transcript.append({"who": "ai", "text": full})
                ai_buf.clear()
            if user_buf:
                full = "".join(user_buf).strip()
                if full:
                    transcript.append({"who": "user", "text": full})
                user_buf.clear()

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
                    elif msg.get("type") == "say":
                        # Forzar al tutor a decir algo (ej. despedida al cambiar de tutor)
                        text = (msg.get("text") or "").strip()
                        if text:
                            await google_ws.send(json.dumps({
                                "clientContent": {
                                    "turns": [{"role": "user", "parts": [{"text": text}]}],
                                    "turnComplete": True,
                                }
                            }))
                    elif msg.get("type") == "system_update":
                        # Cambio en caliente: lo mandamos como "user note" silencioso.
                        # turnComplete: True para no romper el turno actual.
                        text = (msg.get("text") or "").strip()
                        if text:
                            await google_ws.send(json.dumps({
                                "clientContent": {
                                    "turns": [{"role": "user", "parts": [{"text": text}]}],
                                    "turnComplete": True,
                                }
                            }))
                    elif msg.get("type") == "ping":
                        # Keepalive del frontend - solo ACK, no propagar a Gemini
                        try:
                            await ws.send_json({"type": "pong"})
                        except Exception:
                            pass
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
                        # texto en parts (raro en modo audio, lo bufferamos también)
                        text = part.get("text")
                        if text:
                            ai_buf.append(text)
                            await ws.send_json({"type": "transcript_chunk", "who": "ai", "text": text})

                    # outputTranscription = transcripción del audio del TUTOR (chunks palabra-por-palabra)
                    out_tr = sc.get("outputTranscription")
                    if out_tr and out_tr.get("text"):
                        ai_buf.append(out_tr["text"])
                        # Frente: chunk para actualizar el último mensaje IN-PLACE
                        await ws.send_json({"type": "transcript_chunk", "who": "ai", "text": out_tr["text"]})

                    # inputTranscription = transcripción del audio del USER (chunks)
                    input_tr = sc.get("inputTranscription")
                    if input_tr and input_tr.get("text"):
                        user_buf.append(input_tr["text"])
                        await ws.send_json({"type": "transcript_chunk", "who": "user", "text": input_tr["text"]})

                    if sc.get("turnComplete"):
                        # Capturamos lo último del user ANTES de flush
                        last_user_text = "".join(user_buf).strip()
                        # Consolidar buffers en UNA entrada por hablante en el transcript final
                        _flush_buffers()
                        await ws.send_json({"type": "turn_complete"})
                        # Detección de preferencias del alumno (no bloqueante)
                        if last_user_text and len(last_user_text) >= 6:
                            asyncio.create_task(_maybe_detect_preference(
                                user_id=ctx.user_id,
                                user_text=last_user_text,
                                target_lang=ctx.target_language or "es",
                                google_ws=google_ws,
                                client_ws=ws,
                            ))
            except websockets.ConnectionClosed:
                pass
            except Exception as e:
                log.exception("google_to_client: %s", e)

        try:
            await asyncio.gather(client_to_google(), google_to_client())
        finally:
            # Flush por las dudas (turno parcial que no llegó a turnComplete)
            _flush_buffers()
            try:
                await google_ws.close()
            except Exception:
                pass

        for line in transcript:
            yield line

"""Engine Gemini-TEXT + ElevenLabs WS streaming.

Idea (resuelve la desinc de native-audio SIN Vertex):
- Gemini Live en modo responseModalities=TEXT: hace el STT del nene (entiende
  bien, no alucina como Whisper) + el LLM, y devuelve TEXTO. Al no emitir audio
  nativo, NO existe el "tijerazo" que se comia frases.
- El texto del coach se streamea al WebSocket de ElevenLabs (stream-input) que
  devuelve audio PCM 24kHz impecable -> el cliente lo reproduce igual que el
  native (mismo formato).

El audio del nene -> Gemini es identico al gemini_live_engine (se reusa el
resampler a 16k). El cliente NO se toca: recibe {type:audio, PCM 24k} +
{type:transcript}, lo mismo que ya consume.

Activar con VOICE_ENGINE=gemini_text_eleven. Experimental: si falla, unset.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import os

import websockets
from fastapi import WebSocket, WebSocketDisconnect

from core.config import settings
from services.voice_engine import VoiceEngine, VoiceEngineContext
from services.voice_engines.gemini_live_engine import LIVE_API_URL, LIVE_MODEL, _pcm16_to_16k

log = logging.getLogger(__name__)

ELEVEN_MODEL = os.getenv("ELEVENLABS_MODEL", "eleven_flash_v2_5")

# OJO: el 3.1-flash-live (native-audio) NO soporta responseModalities=TEXT (cierra
# con 1007). Para modo TEXT hace falta un modelo Live half-cascade. Configurable.
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "models/gemini-2.0-flash-live-001")


def _gemini_url() -> str:
    return f"{LIVE_API_URL}?key={settings.GEMINI_API_KEY}"


def _eleven_url(voice_id: str) -> str:
    # output_format=pcm_24000 -> PCM 16-bit 24kHz crudo, lo que el cliente reproduce.
    return (
        f"wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input"
        f"?model_id={ELEVEN_MODEL}&output_format=pcm_24000&inactivity_timeout=180"
    )


class GeminiTextElevenEngine(VoiceEngine):
    name = "gemini_text_eleven"

    async def run(self, ws: WebSocket, ctx: VoiceEngineContext):
        if not (settings.GEMINI_API_KEY and settings.ELEVENLABS_API_KEY):
            await ws.send_json({"type": "error", "error": "missing_keys"})
            return

        is_kid = bool(getattr(ctx, "is_kid", False))
        voice_id = ctx.voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID
        if not voice_id:
            await ws.send_json({"type": "error", "error": "no_voice_id"})
            return

        transcript: list[dict] = []

        # ─── Conexión a Gemini (modo TEXT) ───
        try:
            gws = await websockets.connect(_gemini_url(), max_size=2 ** 24)
        except Exception as e:
            log.exception("gemini connect: %s", e)
            await ws.send_json({"type": "error", "error": "live_unavailable"})
            return

        silence_ms = int(min(max(ctx.silence_tolerance_ms, 1500 if is_kid else 600), 2000))
        setup = {
            "setup": {
                "model": GEMINI_TEXT_MODEL,
                "generationConfig": {
                    "responseModalities": ["TEXT"],
                    "thinkingConfig": {"thinkingBudget": int(os.getenv("GEMINI_THINKING_BUDGET", "256"))},
                },
                "realtimeInputConfig": {
                    "automaticActivityDetection": {
                        "disabled": False,
                        "startOfSpeechSensitivity": "START_SENSITIVITY_LOW" if is_kid else "START_SENSITIVITY_HIGH",
                        "endOfSpeechSensitivity": "END_SENSITIVITY_HIGH",
                        "prefixPaddingMs": 200,
                        "silenceDurationMs": silence_ms,
                    },
                    "activityHandling": os.getenv("GEMINI_ACTIVITY_HANDLING", "NO_INTERRUPTION"),
                },
                "inputAudioTranscription": {},
                "systemInstruction": {"parts": [{"text": ctx.super_prompt}]},
            }
        }
        await gws.send(json.dumps(setup))
        try:
            first = await asyncio.wait_for(gws.recv(), timeout=10.0)
            if "setupComplete" not in json.loads(first):
                log.warning("gemini setup unexpected: %s", str(first)[:200])
        except Exception as e:
            log.exception("gemini setup failed: %s", e)
            await ws.send_json({"type": "error", "error": "live_unavailable"})
            try: await gws.close()
            except Exception: pass
            return

        # Trigger inicial: dispara el ARRANQUE del prompt (el coach saluda).
        await gws.send(json.dumps({
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": "Hola"}]}],
                "turnComplete": True,
            }
        }))

        stop = asyncio.Event()
        resample = {"state": None}
        eleven = {"ws": None, "reader": None}  # WS de ElevenLabs del turno actual
        ai_buf: list[str] = []

        async def open_eleven():
            ew = await websockets.connect(
                _eleven_url(voice_id),
                extra_headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
                max_size=2 ** 24,
            )
            # BOS: inicializa el stream con voice_settings.
            await ew.send(json.dumps({
                "text": " ",
                "voice_settings": {"stability": 0.4, "similarity_boost": 0.85},
            }))
            return ew

        async def eleven_reader(ew):
            """Lee el audio PCM de ElevenLabs y lo manda al cliente."""
            try:
                async for m in ew:
                    d = json.loads(m)
                    a = d.get("audio")
                    if a:
                        await ws.send_json({"type": "audio", "data": a})
                    if d.get("isFinal"):
                        break
            except Exception:
                pass

        async def close_eleven():
            if eleven["ws"] is not None:
                try:
                    await eleven["ws"].send(json.dumps({"text": ""}))  # EOS -> flush final
                except Exception:
                    pass
                if eleven["reader"]:
                    try:
                        await asyncio.wait_for(eleven["reader"], timeout=20.0)
                    except Exception:
                        pass
                try:
                    await eleven["ws"].close()
                except Exception:
                    pass
            eleven["ws"] = None
            eleven["reader"] = None

        # ─── Audio del nene -> Gemini (idéntico al gemini_live_engine) ───
        async def client_to_gemini():
            try:
                while not stop.is_set():
                    msg = await ws.receive_json()
                    t = msg.get("type")
                    if t == "audio":
                        b64 = msg.get("data", "")
                        sr = int(msg.get("sample_rate") or 16000)
                        if sr not in (8000, 16000, 22050, 24000, 32000, 44100, 48000):
                            sr = 16000
                        if sr != 16000 and b64:
                            try:
                                pcm16, resample["state"] = _pcm16_to_16k(base64.b64decode(b64), sr, resample["state"])
                                b64 = base64.b64encode(pcm16).decode("ascii")
                                sr = 16000
                            except Exception:
                                pass
                        try:
                            await gws.send(json.dumps({
                                "realtimeInput": {"audio": {"mimeType": f"audio/pcm;rate={sr}", "data": b64}}
                            }))
                        except websockets.ConnectionClosed:
                            break
                    elif t == "ping":
                        try: await ws.send_json({"type": "pong"})
                        except Exception: pass
                    elif t == "end":
                        stop.set()
                        break
            except WebSocketDisconnect:
                stop.set()
            except Exception as e:
                log.exception("client_to_gemini: %s", e)
                stop.set()

        # ─── Texto del coach (Gemini) -> ElevenLabs + transcript ───
        async def gemini_to_eleven():
            try:
                while not stop.is_set():
                    raw = await gws.recv()
                    d = json.loads(raw)
                    sc = d.get("serverContent")
                    if not sc:
                        continue
                    it = sc.get("inputTranscription")
                    if it and it.get("text"):
                        await ws.send_json({"type": "transcript", "who": "user", "text": it["text"]})
                    mt = sc.get("modelTurn")
                    if mt:
                        for p in mt.get("parts", []):
                            txt = p.get("text", "")
                            if not txt:
                                continue
                            ai_buf.append(txt)
                            await ws.send_json({"type": "transcript", "who": "ai", "text": txt})
                            if eleven["ws"] is None:
                                eleven["ws"] = await open_eleven()
                                eleven["reader"] = asyncio.create_task(eleven_reader(eleven["ws"]))
                            try:
                                await eleven["ws"].send(json.dumps({"text": txt + " ", "try_trigger_generation": True}))
                            except Exception:
                                pass
                    if sc.get("turnComplete"):
                        await close_eleven()
                        full = "".join(ai_buf).strip()
                        if full:
                            transcript.append({"who": "ai", "text": full})
                        ai_buf.clear()
                        try: await ws.send_json({"type": "turn_complete"})
                        except Exception: pass
            except websockets.ConnectionClosed:
                stop.set()
            except Exception as e:
                log.exception("gemini_to_eleven: %s", e)
                stop.set()

        try:
            await asyncio.gather(client_to_gemini(), gemini_to_eleven())
        finally:
            stop.set()
            try: await close_eleven()
            except Exception: pass
            try: await gws.close()
            except Exception: pass

        for line in transcript:
            yield line

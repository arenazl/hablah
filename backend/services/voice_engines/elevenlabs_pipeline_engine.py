"""ElevenLabs Pipeline engine — Whisper STT → Gemini text → ElevenLabs TTS.

Latencia ~2s pero voz Lucia/Melanie (mucho más expresiva que Aoede).
Activar con VOICE_ENGINE=elevenlabs_pipeline en .env.

Detecta fin de turno del usuario por silencio (~700ms).
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import time
import wave
from typing import AsyncIterator

import httpx
from fastapi import WebSocket, WebSocketDisconnect

from core.config import settings
from services.elevenlabs import synth as elevenlabs_synth
from services.voice_engine import VoiceEngine, VoiceEngineContext

log = logging.getLogger(__name__)


SILENCE_THRESHOLD_MS = 700  # silencio para considerar fin de turno del usuario
SILENCE_RMS = 80            # umbral de amplitud (PCM int16) para considerar silencio


class ElevenLabsPipelineEngine(VoiceEngine):
    name = "elevenlabs_pipeline"

    async def run(self, ws: WebSocket, ctx: VoiceEngineContext) -> AsyncIterator[dict]:
        if not (settings.GROQ_API_KEY and settings.GEMINI_API_KEY and settings.ELEVENLABS_API_KEY):
            await ws.send_json({"type": "error", "error": "missing_keys"})
            return

        transcript: list[dict] = []
        history: list[dict] = []  # turnos para Gemini context

        # Buffer de audio del usuario (PCM 16kHz mono int16)
        user_buf = bytearray()
        last_voice_ts: float = 0.0
        in_turn = False
        ended = False

        async def receive_loop() -> None:
            nonlocal user_buf, last_voice_ts, in_turn, ended
            try:
                while not ended:
                    msg = await ws.receive_json()
                    if msg.get("type") == "audio":
                        chunk = base64.b64decode(msg.get("data", ""))
                        user_buf.extend(chunk)
                        # Calcular RMS rápido para detectar voz/silencio
                        if len(chunk) >= 2:
                            samples = len(chunk) // 2
                            import struct
                            try:
                                ints = struct.unpack(f"<{samples}h", chunk[: samples * 2])
                                rms = (sum(s * s for s in ints) / samples) ** 0.5
                            except Exception:
                                rms = 0
                            if rms > SILENCE_RMS:
                                last_voice_ts = time.time()
                                in_turn = True
                    elif msg.get("type") == "end":
                        ended = True
                        return
            except WebSocketDisconnect:
                ended = True
            except Exception as e:
                log.exception("receive_loop: %s", e)
                ended = True

        async def turn_processor() -> None:
            nonlocal user_buf, in_turn, ended
            while not ended:
                await asyncio.sleep(0.15)
                # Si hay audio acumulado y pasaron N ms de silencio → procesar turno
                if not in_turn or not user_buf:
                    continue
                silence_ms = (time.time() - last_voice_ts) * 1000
                if silence_ms < SILENCE_THRESHOLD_MS:
                    continue

                pcm = bytes(user_buf)
                user_buf = bytearray()
                in_turn = False

                # 1) Whisper STT
                try:
                    text_user = await _whisper_transcribe(pcm)
                except Exception as e:
                    log.exception("whisper failed: %s", e)
                    continue
                if not text_user.strip():
                    continue
                transcript.append({"who": "user", "text": text_user})
                await ws.send_json({"type": "transcript", "who": "user", "text": text_user})
                history.append({"role": "user", "parts": [{"text": text_user}]})

                # 2) Gemini text generación
                try:
                    text_ai = await _gemini_chat(ctx.super_prompt, history)
                except Exception as e:
                    log.exception("gemini failed: %s", e)
                    await ws.send_json({"type": "error", "error": "llm_failed"})
                    continue
                transcript.append({"who": "ai", "text": text_ai})
                await ws.send_json({"type": "transcript", "who": "ai", "text": text_ai})
                history.append({"role": "model", "parts": [{"text": text_ai}]})

                # 3) ElevenLabs TTS → PCM 24kHz crudo (mismo formato que el coach
                # Gemini native). El cliente reproduce PCM int16 24kHz: si mandamos
                # MP3 lo interpreta como PCM y suena ruido blanco (shhhh).
                try:
                    pcm = await elevenlabs_synth(text_ai, voice_id=ctx.voice_id or None, output_format="pcm_24000")
                    b64 = base64.b64encode(pcm).decode("ascii")
                    await ws.send_json({"type": "audio", "data": b64})
                except Exception as e:
                    log.exception("elevenlabs failed: %s", e)

                await ws.send_json({"type": "turn_complete"})

        try:
            await asyncio.gather(receive_loop(), turn_processor())
        except Exception as e:
            log.exception("pipeline error: %s", e)

        for line in transcript:
            yield line


async def _whisper_transcribe(pcm_16khz_mono: bytes) -> str:
    """Convierte PCM int16 16kHz a WAV y pega a Groq Whisper."""
    if len(pcm_16khz_mono) < 16000:  # menos de 1 segundo
        return ""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(pcm_16khz_mono)
    wav_bytes = buf.getvalue()

    async with httpx.AsyncClient(timeout=20) as cli:
        r = await cli.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            files={"file": ("turn.wav", wav_bytes, "audio/wav")},
            data={"model": settings.GROQ_WHISPER_MODEL or "whisper-large-v3", "response_format": "json"},
        )
    r.raise_for_status()
    return r.json().get("text", "").strip()


async def _gemini_chat(system_prompt: str, history: list[dict]) -> str:
    """Llama Gemini text completion con system_instruction + historial."""
    model = settings.GEMINI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
    body = {
        "contents": history,
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 250},
    }
    async with httpx.AsyncClient(timeout=20) as cli:
        r = await cli.post(url, json=body)
    r.raise_for_status()
    data = r.json()
    cands = data.get("candidates") or []
    if not cands:
        return ""
    parts = (cands[0].get("content") or {}).get("parts") or []
    return " ".join(p.get("text", "") for p in parts).strip()

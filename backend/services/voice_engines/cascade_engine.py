"""Cascade engine: orquesta 3 llamadas HTTP en serie en vez de la Live API.

Pipeline:
  1. Whisper (Groq) → transcribe audio del alumno a texto
  2. Gemini 2.5 Flash (text) → recibe historial + nuevo turno, devuelve respuesta texto
  3. Gemini Flash TTS → convierte texto a audio
  → stream chunks de audio al frontend (mismo protocolo WS que gemini_live)

Ventajas vs Live native-audio:
  - Sigue prompts al 100% (Flash text es excelente en instruction-following)
  - ~65x más barato (text tokens vs audio tokens)
  - Logs del transcript son lo que el modelo realmente procesa (auditabilidad)
  - Modular: podemos cambiar STT o TTS independientes

Desventajas:
  - Latencia mayor (3 calls en serie, ~1.5-2.5s vs ~200ms del Live)
  - Server-side VAD requerido (manejo de buffering por turno)
  - Sin interrupción nativa (barge-in se simula matando el TTS en curso)
"""
from __future__ import annotations

import asyncio
import base64
import io
import logging
import struct
import time
import wave
from typing import AsyncIterator, Optional

import httpx
from fastapi import WebSocket, WebSocketDisconnect

from core.config import settings
from core.trace import trace, trace_duration_ms
from services.voice_engine import VoiceEngine, VoiceEngineContext

log = logging.getLogger(__name__)


# ─── Config ────────────────────────────────────────────────────────────

WHISPER_MODEL = "whisper-large-v3-turbo"  # Groq, $0.04/hr, muy rápido
WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

FLASH_MODEL = "gemini-2.5-flash"
FLASH_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{FLASH_MODEL}:generateContent"
)

TTS_MODEL = "gemini-2.5-flash-preview-tts"
TTS_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{TTS_MODEL}:generateContent"
)
TTS_VOICE = "Aoede"

# VAD basado en energía RMS.
VAD_SILENCE_RMS_THRESHOLD = 0.005
VAD_END_OF_SPEECH_SECONDS = 1.2
VAD_MIN_SPEECH_SECONDS = 0.3

# Mapeo CEFR/idioma → código ISO Whisper
_LANG_MAP = {
    "english": "en", "en": "en", "en-us": "en", "en-gb": "en",
    "spanish": "es", "es": "es", "es-ar": "es", "es-mx": "es",
    "italian": "it", "it": "it",
    "portuguese": "pt", "pt": "pt", "pt-br": "pt",
    "french": "fr", "fr": "fr",
    "german": "de", "de": "de",
}


def _normalize_lang(lang: Optional[str]) -> str:
    if not lang:
        return "en"
    return _LANG_MAP.get(lang.strip().lower(), "en")


# ─── Helpers de audio ─────────────────────────────────────────────────

def _pcm_to_wav_bytes(pcm_data: bytes, sample_rate: int = 16000) -> bytes:
    """Envolver PCM raw 16-bit mono en contenedor WAV para Whisper."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buf.getvalue()


def _rms_of_pcm_chunk(pcm_bytes: bytes) -> float:
    """RMS normalizado [0, 1] de un chunk PCM int16."""
    if not pcm_bytes:
        return 0.0
    n_samples = len(pcm_bytes) // 2
    if n_samples == 0:
        return 0.0
    samples = struct.unpack(f"<{n_samples}h", pcm_bytes)
    sq = sum(s * s for s in samples) / n_samples
    return (sq ** 0.5) / 32768.0


# ─── API calls ────────────────────────────────────────────────────────

async def _stt_groq_whisper(
    audio_pcm: bytes, *, sample_rate: int = 16000,
    language: str = "en", session_id: Optional[int] = None,
) -> Optional[str]:
    """Transcribir PCM via Groq Whisper. Devuelve texto o None si falla."""
    if not audio_pcm or not settings.GROQ_API_KEY:
        return None
    t0 = time.time()
    wav_bytes = _pcm_to_wav_bytes(audio_pcm, sample_rate)
    headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
    files = {
        "file": ("audio.wav", wav_bytes, "audio/wav"),
        "model": (None, WHISPER_MODEL),
        "language": (None, language),
        "response_format": (None, "text"),
        "temperature": (None, "0"),
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as cli:
            r = await cli.post(WHISPER_URL, headers=headers, files=files)
            if r.status_code != 200:
                trace.warn("cascade.stt.failed",
                           session_id=session_id, status=r.status_code,
                           body=r.text[:300], latency_ms=trace_duration_ms(t0))
                return None
            text = r.text.strip()
            trace.event("cascade.stt.ok", session_id=session_id,
                        text_preview=text[:120],
                        latency_ms=trace_duration_ms(t0))
            return text or None
    except Exception as e:
        trace.error("cascade.stt.error", session_id=session_id,
                    error=str(e), latency_ms=trace_duration_ms(t0))
        return None


async def _llm_flash_text(
    *, system_instruction: str, history: list[dict], user_text: str,
    session_id: Optional[int] = None,
) -> Optional[str]:
    """Llama a gemini-2.5-flash en modo texto. Devuelve respuesta del coach."""
    if not settings.GEMINI_API_KEY:
        return None
    t0 = time.time()
    contents = list(history)
    contents.append({"role": "user", "parts": [{"text": user_text}]})
    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.85,
            "topP": 0.95,
            "maxOutputTokens": 400,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    url = f"{FLASH_URL}?key={settings.GEMINI_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as cli:
            r = await cli.post(url, json=payload)
            if r.status_code != 200:
                trace.warn("cascade.llm.failed",
                           session_id=session_id, status=r.status_code,
                           body=r.text[:300], latency_ms=trace_duration_ms(t0))
                return None
            data = r.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except (KeyError, IndexError):
                trace.warn("cascade.llm.bad_response", session_id=session_id,
                           body=str(data)[:300])
                return None
            trace.event("cascade.llm.ok", session_id=session_id,
                        text_preview=text[:120],
                        latency_ms=trace_duration_ms(t0))
            return text
    except Exception as e:
        trace.error("cascade.llm.error", session_id=session_id,
                    error=str(e), latency_ms=trace_duration_ms(t0))
        return None


async def _tts_gemini(
    text: str, *, voice: str = TTS_VOICE,
    session_id: Optional[int] = None,
) -> Optional[bytes]:
    """Sintetiza audio PCM 24kHz desde texto via Gemini Flash TTS."""
    if not text.strip() or not settings.GEMINI_API_KEY:
        return None
    t0 = time.time()
    payload = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": voice}
                }
            },
        },
    }
    url = f"{TTS_URL}?key={settings.GEMINI_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=20.0) as cli:
            r = await cli.post(url, json=payload)
            if r.status_code != 200:
                trace.warn("cascade.tts.failed",
                           session_id=session_id, status=r.status_code,
                           body=r.text[:300], latency_ms=trace_duration_ms(t0))
                return None
            data = r.json()
            try:
                inline = data["candidates"][0]["content"]["parts"][0]["inlineData"]
                audio_bytes = base64.b64decode(inline["data"])
                trace.event("cascade.tts.ok", session_id=session_id,
                            bytes=len(audio_bytes),
                            latency_ms=trace_duration_ms(t0))
                return audio_bytes
            except (KeyError, IndexError):
                trace.warn("cascade.tts.bad_response",
                           session_id=session_id, body=str(data)[:300])
                return None
    except Exception as e:
        trace.error("cascade.tts.error", session_id=session_id,
                    error=str(e), latency_ms=trace_duration_ms(t0))
        return None


# ─── Engine ───────────────────────────────────────────────────────────

class CascadeEngine(VoiceEngine):
    """Orquestador HTTP-cascade. Mismo protocolo WS que GeminiLiveEngine."""

    name = "cascade"

    async def run(
        self, ws: WebSocket, ctx: VoiceEngineContext,
    ) -> AsyncIterator[dict]:
        session_id = getattr(ctx, "session_id", None)
        if not settings.GEMINI_API_KEY or not settings.GROQ_API_KEY:
            await ws.send_json({"type": "error",
                                "error": "missing_api_keys"})
            return

        target_lang = getattr(ctx, "target_language", "en")
        whisper_lang = _normalize_lang(target_lang)
        # ctx.voice_id viene del template (ElevenLabs voice_id). Gemini TTS
        # solo acepta nombres como aoede/puck/kore. Ignoramos ctx.voice_id y
        # usamos siempre el default de Gemini hasta tener un mapeo template→gem.
        voice = TTS_VOICE
        sys_prompt = getattr(ctx, "super_prompt", "") or ""

        trace.event("cascade.session.start", session_id=session_id,
                    model=FLASH_MODEL, voice=voice,
                    whisper_lang=whisper_lang)

        history: list[dict] = []
        transcript: list[dict] = []
        speech_buf = bytearray()
        speech_started_at: Optional[float] = None
        last_voice_ts: Optional[float] = None
        stop_event = asyncio.Event()
        turn_lock = asyncio.Lock()  # serializa turnos
        bg_tasks: list[asyncio.Task] = []

        async def _stream_audio(audio_bytes: bytes) -> None:
            chunk_size = 24000
            for i in range(0, len(audio_bytes), chunk_size):
                chunk = audio_bytes[i:i + chunk_size]
                b64 = base64.b64encode(chunk).decode("ascii")
                await ws.send_json({
                    "type": "audio", "data": b64, "sample_rate": 24000
                })

        async def _coach_turn(user_text: str) -> None:
            """Procesa un turno del coach desde user_text → audio en cliente."""
            async with turn_lock:
                if stop_event.is_set():
                    return
                await ws.send_json({"type": "transcript_chunk",
                                    "who": "user", "text": user_text})
                transcript.append({"who": "user", "text": user_text})
                history.append({"role": "user",
                                "parts": [{"text": user_text}]})

                coach_text = await _llm_flash_text(
                    system_instruction=sys_prompt,
                    history=history[:-1],
                    user_text=user_text,
                    session_id=session_id,
                )
                if not coach_text:
                    await ws.send_json({"type": "error",
                                        "error": "llm_failed"})
                    return
                await ws.send_json({"type": "transcript_chunk",
                                    "who": "ai", "text": coach_text})
                transcript.append({"who": "ai", "text": coach_text})
                history.append({"role": "model",
                                "parts": [{"text": coach_text}]})

                audio_bytes = await _tts_gemini(
                    coach_text, voice=voice, session_id=session_id,
                )
                if not audio_bytes:
                    await ws.send_json({"type": "error",
                                        "error": "tts_failed"})
                    return
                await _stream_audio(audio_bytes)
                await ws.send_json({"type": "turn_complete"})

        async def _stt_then_turn(audio_pcm: bytes) -> None:
            user_text = await _stt_groq_whisper(
                audio_pcm, sample_rate=16000,
                language=whisper_lang, session_id=session_id,
            )
            if not user_text:
                return
            await _coach_turn(user_text)

        async def _initial_greeting() -> None:
            """Lanza el saludo del coach. Toma el turn_lock para bloquear input."""
            async with turn_lock:
                if stop_event.is_set():
                    return
                greeting = await _llm_flash_text(
                    system_instruction=sys_prompt,
                    history=[],
                    user_text="(Start the conversation now. Open naturally.)",
                    session_id=session_id,
                )
                if not greeting:
                    return
                await ws.send_json({"type": "transcript_chunk",
                                    "who": "ai", "text": greeting})
                transcript.append({"who": "ai", "text": greeting})
                history.append({"role": "model",
                                "parts": [{"text": greeting}]})
                audio_bytes = await _tts_gemini(
                    greeting, voice=voice, session_id=session_id,
                )
                if not audio_bytes:
                    return
                await _stream_audio(audio_bytes)
                await ws.send_json({"type": "turn_complete"})

        # Saludo inicial async (el turn_lock evita que se mezcle con user input)
        bg_tasks.append(asyncio.create_task(_initial_greeting()))

        # ─── Loop principal: receive audio del cliente + VAD ──────
        try:
            while not stop_event.is_set():
                try:
                    msg = await asyncio.wait_for(
                        ws.receive_json(), timeout=30.0,
                    )
                except asyncio.TimeoutError:
                    continue
                except WebSocketDisconnect:
                    break

                mtype = msg.get("type")
                if mtype == "audio":
                    b64 = msg.get("data", "")
                    try:
                        chunk_pcm = base64.b64decode(b64)
                    except Exception:
                        continue
                    rms = _rms_of_pcm_chunk(chunk_pcm)
                    now = time.time()
                    if rms > VAD_SILENCE_RMS_THRESHOLD:
                        if speech_started_at is None:
                            speech_started_at = now
                        last_voice_ts = now
                        speech_buf.extend(chunk_pcm)
                    elif speech_started_at is not None:
                        speech_buf.extend(chunk_pcm)
                        if (last_voice_ts and
                                (now - last_voice_ts) > VAD_END_OF_SPEECH_SECONDS):
                            speech_duration = (last_voice_ts - speech_started_at)
                            audio_to_process = bytes(speech_buf)
                            speech_buf.clear()
                            speech_started_at = None
                            last_voice_ts = None
                            if speech_duration >= VAD_MIN_SPEECH_SECONDS:
                                bg_tasks.append(asyncio.create_task(
                                    _stt_then_turn(audio_to_process)
                                ))
                elif mtype == "end":
                    stop_event.set()
                    break
                elif mtype == "say":
                    # Modo QA: inject texto directo
                    user_text = (msg.get("text") or "").strip()
                    if user_text:
                        bg_tasks.append(asyncio.create_task(
                            _coach_turn(user_text)
                        ))
                elif mtype == "ping":
                    await ws.send_json({"type": "pong"})
        except WebSocketDisconnect:
            pass
        except Exception as e:
            log.exception("cascade engine error: %s", e)
            trace.error("cascade.session.crash",
                        session_id=session_id, error=str(e))
        finally:
            stop_event.set()
            # Esperar tasks en curso (max 5s) para no perder el último turno
            if bg_tasks:
                pending = [t for t in bg_tasks if not t.done()]
                if pending:
                    try:
                        await asyncio.wait_for(
                            asyncio.gather(*pending, return_exceptions=True),
                            timeout=5.0,
                        )
                    except asyncio.TimeoutError:
                        for t in pending:
                            if not t.done():
                                t.cancel()
            trace.event("cascade.session.end",
                        session_id=session_id,
                        n_turns=len(transcript))

        for line in transcript:
            yield line

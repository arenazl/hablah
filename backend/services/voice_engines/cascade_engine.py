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
import os
import re
import struct
import time
import wave
from datetime import datetime, timezone
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

# Google Cloud Text-to-Speech (NO Gemini TTS preview). El preview tenia rate
# limit ~10 RPM en free tier -> reventaba con cualquier sesion real (logs
# sesiones 325-334 -> HTTP 429 masivo). El TTS standard tiene 1000 req/min
# y 4M chars/mes free, voces Neural2/Chirp3-HD estables.
TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"

# Mapeo target_language -> (languageCode, voiceName). Neural2 es el balance
# calidad/costo. Chirp3-HD es mejor pero ~3x mas caro.
_TTS_VOICE_BY_LANG: dict[str, tuple[str, str]] = {
    "en": ("en-US", "en-US-Neural2-F"),
    "es": ("es-US", "es-US-Neural2-A"),
    "pt": ("pt-BR", "pt-BR-Neural2-A"),
    "it": ("it-IT", "it-IT-Neural2-A"),
    "fr": ("fr-FR", "fr-FR-Neural2-A"),
    "de": ("de-DE", "de-DE-Neural2-A"),
}
TTS_DEFAULT_VOICE = ("en-US", "en-US-Neural2-F")

# Token del metadata server (Cloud Run SA). TTL ~1h, cacheamos.
_GCP_METADATA_URL = (
    "http://metadata.google.internal/computeMetadata/v1/"
    "instance/service-accounts/default/token"
)
_gcp_token_cache: dict[str, float | str] = {"token": "", "expires_at": 0.0}

# VAD basado en energía RMS.
VAD_SILENCE_RMS_THRESHOLD = 0.005
VAD_END_OF_SPEECH_SECONDS = 2.0  # subido desde 1.2: cadencia natural tiene pausas
VAD_MIN_SPEECH_SECONDS = 0.3
# Si el user habla durante el TTS del coach, cancelamos el resto del audio.
VAD_BARGE_IN_RMS_THRESHOLD = 0.02  # más alto que silencio: solo cuenta si claramente habla


def _runtime_addon_block(target_language: str) -> str:
    """Bloque prepended al system_instruction. Cubre fallas observadas en
    session 324 (audit del 2026-05-28):
      - Coach no sabia la fecha actual ("World Cup is in 2026" siendo 2026)
      - Coach usaba markdown (*so* overrated) que el TTS lee literal
      - Filler words repetidos ("Oh, that's a big one!", "Right?", "Nice!")
      - Loops cuando el alumno repetia ("Sure but isn't that reductionist?")
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    year = today[:4]
    return f"""[RUNTIME RULES — non-negotiable, applied BEFORE the system prompt below]

CURRENT DATE: {today}. We are in {year}.
You exist in this point in time. Any year before {year} is the PAST.
The next World Cup is in 2026. If the student mentions current events,
trust their timing reference. Never claim "X is in {year}" as if it were future.

OUTPUT FORMAT (you are speaking out loud through TTS):
- NEVER use markdown. No *asterisks*, no **bold**, no _underscores_, no `backticks`.
- TTS reads asterisks and backticks LITERALLY. Plain text only.
- No bullet points, no numbered lists. Just sentences.

BANNED OPENINGS (do NOT start a turn with any of these):
- "Oh, that's..." / "Oh, definitely!" / "Oh, interesting!"
- "Nice!" / "Great!" / "Wow!" / "Awesome!"
- "Right?" / "Absolutely!" / "Totally!"
- "That's a fair point" / "That's a big one" / "That's interesting"
- "Hey [name]!" as a turn opener after the first turn
- ANY exclamation-as-acknowledgement before answering

If your draft starts with any of these, rewrite the first sentence.
Start directly with content: a fact, a question, a reframe, a counter-point.

NO-LOOP RULE:
If the student repeats the same phrase twice (e.g. "isn't that reductionist?"),
you have ALREADY heard them. Do NOT ask for clarification again.
Take a position: agree, disagree, or admit you don't know — then move forward.

LANGUAGE: respond in {target_language} only, unless the system prompt overrides.
"""

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


_SENTENCE_BOUNDARY_RE = re.compile(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])")


def _split_into_chunks_2(text: str) -> list[str]:
    """Divide texto en MAX 2 chunks: primera oración + resto.

    Por qué 2 y no N: el streaming por oración (5+ chunks/turno) reventó el
    rate limit RPM del TTS (logs sesiones 325-329 = HTTP 429 masivos). Con 2
    chunks ganamos casi toda la mejora de latencia perceptual (la 1ra
    oración llega en ~1.5s) sin multiplicar las llamadas.
    """
    text = text.strip()
    if not text:
        return []
    parts = _SENTENCE_BOUNDARY_RE.split(text)
    parts = [p.strip() for p in parts if p.strip()]
    if len(parts) <= 1:
        return [text]
    # Si la 1ra oración es muy corta (<25 chars), juntar con la 2da.
    first = parts[0]
    rest_start = 1
    if len(first) < 25 and len(parts) > 1:
        first = (first + " " + parts[1]).strip()
        rest_start = 2
    rest = " ".join(parts[rest_start:]).strip()
    return [first, rest] if rest else [first]


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
        import traceback as _tb
        trace.error("cascade.stt.error", session_id=session_id,
                    error=str(e), error_type=type(e).__name__,
                    traceback=_tb.format_exc()[:1500],
                    latency_ms=trace_duration_ms(t0))
        return None


async def _llm_claude_cli(
    *, system_instruction: str, history: list[dict], user_text: str,
    session_id: Optional[int] = None,
) -> Optional[str]:
    """Llama a Claude Code CLI headless via subprocess. Usa la sub Max del user
    montada via CLAUDE_CREDENTIALS_JSON env var. No consume API tokens."""
    t0 = time.time()
    # Armamos el prompt: system + conversation history + user turn
    conversation = ""
    for h in history:
        who = "Student" if h["role"] == "user" else "You (tutor)"
        text = h["parts"][0]["text"] if isinstance(h.get("parts"), list) else h.get("text", "")
        conversation += f"\n\n{who}: {text}"
    conversation += f"\n\nStudent: {user_text}\n\nYou (tutor):"
    full_prompt = system_instruction + "\n\n--- CONVERSATION SO FAR ---" + conversation

    clean_env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
    try:
        proc = await asyncio.create_subprocess_exec(
            "claude", "-p", "--model", "claude-haiku-4-5", full_prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=clean_env,
        )
        out, err = await asyncio.wait_for(proc.communicate(), timeout=60.0)
        text = out.decode("utf-8", errors="replace").strip()
        if not text:
            trace.warn("cascade.llm.claude_empty",
                       session_id=session_id,
                       stderr=err.decode("utf-8", errors="replace")[:300],
                       latency_ms=trace_duration_ms(t0))
            return None
        # VALIDACION: si el subprocess devolvio un mensaje de error de la API,
        # NO lo pasamos como respuesta del coach. Devolver None para que el
        # caller decida fallback (o silencio). Antes pasamos literal
        # "Failed to authenticate. API Error: 401..." al TTS y el alumno
        # oyo eso como respuesta del coach.
        _err_patterns = (
            "Failed to authenticate", "API Error:", "401", "403",
            "invalid_request_error", "authentication_error",
            "rate_limit_error", "Invalid authentication credentials",
            "Internal Server Error",
        )
        _lt = text.lower()
        if any(p.lower() in _lt for p in _err_patterns) and len(text) < 400:
            trace.error("cascade.llm.claude_api_error",
                        session_id=session_id, response=text[:300],
                        latency_ms=trace_duration_ms(t0))
            return None
        trace.event("cascade.llm.ok", session_id=session_id,
                    text_preview=text[:120], provider="claude_cli",
                    latency_ms=trace_duration_ms(t0))
        return text
    except asyncio.TimeoutError:
        trace.error("cascade.llm.claude_timeout", session_id=session_id,
                    latency_ms=trace_duration_ms(t0))
        return None
    except Exception as e:
        import traceback as _tb
        trace.error("cascade.llm.claude_error", session_id=session_id,
                    error=str(e), error_type=type(e).__name__,
                    traceback=_tb.format_exc()[:1500],
                    latency_ms=trace_duration_ms(t0))
        return None


async def _llm_gemini_flash(
    *, system_instruction: str, history: list[dict], user_text: str,
    session_id: Optional[int] = None,
) -> Optional[str]:
    """Llamada Gemini Flash (la implementacion vieja extraida). Usado como
    fallback si claude_cli falla."""
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
            "maxOutputTokens": 220,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    url = f"{FLASH_URL}?key={settings.GEMINI_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as cli:
            r = await cli.post(url, json=payload)
            if r.status_code != 200:
                return None
            data = r.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
            except (KeyError, IndexError):
                return None
    except Exception:
        return None


async def _llm_flash_text(
    *, system_instruction: str, history: list[dict], user_text: str,
    session_id: Optional[int] = None,
) -> Optional[str]:
    """Toggle via env LLM_PROVIDER. claude_cli con fallback a Gemini Flash.
    Si Claude falla por cualquier razon (auth, timeout, error), se intenta
    Gemini Flash para que el alumno NO quede sin respuesta."""
    if os.getenv("LLM_PROVIDER", "gemini").lower() == "claude_cli":
        result = await _llm_claude_cli(
            system_instruction=system_instruction,
            history=history, user_text=user_text,
            session_id=session_id,
        )
        if result:
            return result
        # Claude fallo (None) - fallback a Gemini Flash.
        trace.warn("cascade.llm.fallback_to_gemini", session_id=session_id)
        return await _llm_gemini_flash(
            system_instruction=system_instruction,
            history=history, user_text=user_text,
            session_id=session_id,
        )
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
            "maxOutputTokens": 220,
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
        import traceback as _tb
        trace.error("cascade.llm.error", session_id=session_id,
                    error=str(e), error_type=type(e).__name__,
                    traceback=_tb.format_exc()[:1500],
                    latency_ms=trace_duration_ms(t0))
        return None


async def _get_gcp_token() -> Optional[str]:
    """Token de la default Cloud Run SA via metadata server. Cacheado 50min."""
    now = time.time()
    cached_token = _gcp_token_cache.get("token") or ""
    expires_at = float(_gcp_token_cache.get("expires_at") or 0)
    if cached_token and now < expires_at:
        return str(cached_token)
    try:
        async with httpx.AsyncClient(timeout=5.0) as cli:
            r = await cli.get(_GCP_METADATA_URL,
                              headers={"Metadata-Flavor": "Google"})
            if r.status_code != 200:
                log.warning("gcp_token: metadata server %s", r.status_code)
                return None
            data = r.json()
            tok = data.get("access_token") or ""
            ttl = int(data.get("expires_in") or 3600)
            _gcp_token_cache["token"] = tok
            _gcp_token_cache["expires_at"] = now + max(60, ttl - 600)  # refresh 10min antes
            return tok
    except Exception as e:
        log.warning("gcp_token: %s", e)
        return None


async def _tts_gcp(
    text: str, *, target_language: str = "en",
    session_id: Optional[int] = None,
) -> Optional[bytes]:
    """Sintetiza PCM 24kHz LINEAR16 via Google Cloud Text-to-Speech."""
    if not text.strip():
        return None
    token = await _get_gcp_token()
    if not token:
        trace.warn("cascade.tts.no_token", session_id=session_id)
        return None
    lang_code, voice_name = _TTS_VOICE_BY_LANG.get(
        target_language[:2].lower(), TTS_DEFAULT_VOICE
    )
    t0 = time.time()
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": lang_code, "name": voice_name},
        "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 24000},
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Goog-User-Project": "hablah-prod",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as cli:
            r = await cli.post(TTS_URL, json=payload, headers=headers)
            if r.status_code == 401:
                # token vencido o invalido -> limpiar cache y reintentar 1 vez
                _gcp_token_cache["token"] = ""
                _gcp_token_cache["expires_at"] = 0.0
                token = await _get_gcp_token()
                if token:
                    headers["Authorization"] = f"Bearer {token}"
                    r = await cli.post(TTS_URL, json=payload, headers=headers)
            if r.status_code != 200:
                trace.warn("cascade.tts.failed",
                           session_id=session_id, status=r.status_code,
                           body=r.text[:300], latency_ms=trace_duration_ms(t0))
                return None
            data = r.json()
            b64 = data.get("audioContent") or ""
            if not b64:
                trace.warn("cascade.tts.bad_response",
                           session_id=session_id, body=str(data)[:300])
                return None
            audio_bytes = base64.b64decode(b64)
            trace.event("cascade.tts.ok", session_id=session_id,
                        bytes=len(audio_bytes), voice=voice_name,
                        latency_ms=trace_duration_ms(t0))
            return audio_bytes
    except Exception as e:
        import traceback as _tb
        trace.error("cascade.tts.error", session_id=session_id,
                    error=str(e), error_type=type(e).__name__,
                    traceback=_tb.format_exc()[:1500],
                    latency_ms=trace_duration_ms(t0))
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
        # Cuando usamos claude_cli usamos un prompt GENERICO simple. El
        # super_prompt complejo con keywords y reglas verbose hizo que Claude
        # ignorara al alumno y tirara datos del topic (bug S473).
        if os.getenv("LLM_PROVIDER", "gemini").lower() == "claude_cli":
            user_name = getattr(ctx, "user_name", "") or "the student"
            cefr = getattr(ctx, "cefr_level", None) or "B1"
            # Extraemos SOLO el nombre del topic del super_prompt (sin keywords
            # ni reglas). El super_prompt tiene "- Tema: {title}." dentro del
            # bloque TÓPICO DE HOY.
            sp = getattr(ctx, "super_prompt", "") or ""
            topic_name = ""
            for line in sp.splitlines():
                line = line.strip()
                if line.startswith("- Tema:"):
                    topic_name = line.replace("- Tema:", "").strip().rstrip(".")
                    break
            topic_line = (
                f"Today's topic suggestion: {topic_name}. Use it as a starting "
                f"point but follow the student wherever they want to take it."
            ) if topic_name else (
                "No specific topic today — ask the student what they want to talk about."
            )
            sys_prompt = (
                f"You are a friendly English conversation tutor talking with "
                f"{user_name}, a CEFR {cefr} student learning {target_lang}.\n\n"
                f"{topic_line}\n\n"
                f"Be a real conversation partner, not a tutor giving a class:\n"
                f"- Respond to what {user_name} just said. If they ask you something, answer it.\n"
                f"- Keep turns short (1-2 sentences usually).\n"
                f"- Don't always end with a question. Sometimes just react.\n"
                f"- Don't pile on facts or names unless they're actually engaging "
                f"with a topic and want depth.\n"
                f"- Follow their lead. If they change subject, go with them.\n"
                f"- Respond only in {target_lang}, no markdown, plain text only.\n"
            )
        else:
            sys_prompt = getattr(ctx, "super_prompt", "") or ""

        _, voice_name_for_log = _TTS_VOICE_BY_LANG.get(
            target_lang[:2].lower(), TTS_DEFAULT_VOICE
        )
        trace.event("cascade.session.start", session_id=session_id,
                    model=FLASH_MODEL, voice=voice_name_for_log,
                    whisper_lang=whisper_lang)

        history: list[dict] = []
        transcript: list[dict] = []
        speech_buf = bytearray()
        speech_started_at: Optional[float] = None
        last_voice_ts: Optional[float] = None
        stop_event = asyncio.Event()
        turn_lock = asyncio.Lock()  # serializa turnos
        bg_tasks: list[asyncio.Task] = []
        coach_speaking = asyncio.Event()   # True mientras streameamos audio del coach
        barge_in = asyncio.Event()         # User interrumpio → cortar TTS en curso

        async def _stream_audio_bytes(audio_bytes: bytes) -> None:
            chunk_size = 24000
            for i in range(0, len(audio_bytes), chunk_size):
                if barge_in.is_set():
                    return
                chunk = audio_bytes[i:i + chunk_size]
                b64 = base64.b64encode(chunk).decode("ascii")
                await ws.send_json({
                    "type": "audio", "data": b64, "sample_rate": 24000
                })

        async def _speak_streamed(text: str) -> bool:
            """TTS por oracion → stream incremental. Devuelve True si se completo."""
            sentences = _split_into_chunks_2(text)
            if not sentences:
                return False
            coach_speaking.set()
            barge_in.clear()
            try:
                for i, sentence in enumerate(sentences):
                    if barge_in.is_set():
                        trace.event("cascade.tts.interrupted",
                                    session_id=session_id,
                                    after_sentence=i, total=len(sentences))
                        await ws.send_json({"type": "interrupted"})
                        return False
                    audio_bytes = await _tts_gcp(
                        sentence, target_language=target_lang,
                        session_id=session_id,
                    )
                    if not audio_bytes:
                        continue  # skip esa oracion, seguir con la proxima
                    await _stream_audio_bytes(audio_bytes)
                return True
            finally:
                coach_speaking.clear()

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

                await _speak_streamed(coach_text)
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
                await _speak_streamed(greeting)
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
                    # Barge-in: user habla mientras coach esta speaking → cortar TTS.
                    if coach_speaking.is_set() and rms > VAD_BARGE_IN_RMS_THRESHOLD:
                        if not barge_in.is_set():
                            barge_in.set()
                            trace.event("cascade.barge_in.detected",
                                        session_id=session_id, rms=round(rms, 4))
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

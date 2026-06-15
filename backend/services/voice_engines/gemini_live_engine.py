"""Gemini Live engine — WebSocket bidireccional con audio nativo (Aoede).

Latencia ~500ms. Es el default para conversación en vivo.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
import time
from typing import AsyncIterator

try:
    import audioop  # stdlib; removido en Python 3.13 (PEP 594)
except ImportError:  # pragma: no cover
    audioop = None

import websockets
from fastapi import WebSocket, WebSocketDisconnect

from core.config import settings
from core.trace import trace, trace_duration_ms
from services.voice_engine import VoiceEngine, VoiceEngineContext

log = logging.getLogger(__name__)


_MD_NOISE = re.compile(r"[*_`#]+")


def _clean_coach_text(text: str) -> str:
    """Saca markdown (asteriscos, underscores, backticks, #) del texto del coach.

    El modelo native-audio a veces 'negrita' la palabra que enseña (*ARMS*,
    **SHIP**). No se vocaliza, pero ensucia el subtítulo y cualquier TTS posterior.
    """
    return _MD_NOISE.sub("", text) if text else text


def _pcm16_to_16k(pcm: bytes, in_rate: int, state):
    """Resamplea PCM int16 LE mono de in_rate -> 16000 Hz.

    Gemini Live native-audio SOLO transcribe input a 16kHz. iOS Safari suele
    abrir el AudioContext a 48000 e ignorar el sampleRate pedido; mandar ese
    audio declarado rate=48000 hacia que Vertex NO transcribiera el input
    (user_text_chunks=0 -> coach mudo -> corte; S502/S503).

    Mantener el `state` entre chunks evita clicks en los bordes
    (audioop.ratecv lo gestiona). Devuelve (pcm_16k_bytes, new_state).
    """
    if in_rate == 16000 or not pcm:
        return pcm, state
    if audioop is not None:
        return audioop.ratecv(pcm, 2, 1, in_rate, 16000, state)
    # Fallback sin audioop (py3.13+): interpolacion lineal, sin filtro
    # anti-alias. Suficiente para no romper; en py3.11 nunca se usa.
    import array
    samples = array.array("h")
    samples.frombytes(pcm)
    n_in = len(samples)
    if n_in == 0:
        return pcm, state
    n_out = max(1, int(n_in * 16000 / in_rate))
    out = array.array("h", bytes(2 * n_out))
    step = n_in / n_out
    for i in range(n_out):
        pos = i * step
        idx = int(pos)
        frac = pos - idx
        s0 = samples[idx]
        s1 = samples[idx + 1] if idx + 1 < n_in else s0
        out[i] = int(s0 + (s1 - s0) * frac)
    return out.tobytes(), state


async def _handle_admin_directive(*, raw_text: str, feedback_body: str, ctx, google_ws, client_ws):
    """Procesa una directiva admin disparada durante una sesion Live.

    Snapshot del prompt antes -> Flash refine -> insert AdminDirective -> snapshot
    despues. Despues le inyecta al modelo Gemini un mensaje user sintetico para
    que confirme en voz al admin. Notifica al frontend para mostrar toast.
    """
    from services.admin_feedback import apply_admin_directive

    if not getattr(ctx, "template_id", None):
        log.warning("admin_directive: ctx.template_id es None, ignorando")
        return

    try:
        result = await apply_admin_directive(
            raw_feedback=raw_text,
            feedback_body=feedback_body,
            template_id=ctx.template_id,
            session_id=ctx.session_id,
            user_id=ctx.user_id,
        )
        if not result:
            return

        # Inyectar mensaje sintetico al modelo para que confirme en voz.
        # turnComplete=False: contexto sin disparar respuesta, asi evitamos
        # ghost turn por gap timeout. La confirmacion verbal se pierde pero
        # el toast frontend muestra que se aplico (mejor que coach repitiendo
        # cola del turno anterior 15s tarde - bug S493).
        try:
            await google_ws.send(json.dumps({
                "clientContent": {
                    "turns": [{"role": "user", "parts": [{"text": result["confirmation_text"]}]}],
                    "turnComplete": False,
                }
            }))
        except Exception as e:
            log.warning("admin_directive: no pude inyectar confirmacion al modelo: %s", e)

        # Toast al frontend
        try:
            await client_ws.send_json({
                "type": "admin_directive_applied",
                "directive_id": result["id"],
                "directive_text": result["directive_text"],
            })
        except Exception:
            pass
    except Exception as e:
        log.exception("admin_directive: handler fallo: %s", e)


async def _maybe_detect_preference(*, user_id, user_text, target_lang, google_ws, client_ws):
    """Wrapper que llama al detector y, si aplicó cambio, notifica al cliente."""
    from services.preference_detector import detect_and_apply

    async def send_system_update(text: str) -> None:
        # Inyectamos un mensaje system al Gemini Live para que el tutor adapte el próximo turno.
        # turnComplete=False: el modelo absorbe la instruccion como contexto pero NO dispara
        # un turno de respuesta. Sino el coach soltaba un turno fantasma 15s despues
        # (timeout del Flash request) con la cola del turno anterior (bug S493).
        await google_ws.send(json.dumps({
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": text}]}],
                "turnComplete": False,
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


# Provider selection: 'ai_studio' (free tier, API key, native-audio) or 'vertex'
# (paid, service account, half-cascade gemini-live-2.5-flash que sigue prompts).
# Toggle via env VOICE_PROVIDER. Default ai_studio para no romper.
import os as _os
VOICE_PROVIDER = _os.getenv("VOICE_PROVIDER", "ai_studio").lower()
VERTEX_REGION = _os.getenv("VERTEX_REGION", "us-central1")
VERTEX_PROJECT = _os.getenv("VERTEX_PROJECT", "hablah-prod")

if VOICE_PROVIDER == "vertex":
    LIVE_API_URL = (
        f"wss://{VERTEX_REGION}-aiplatform.googleapis.com/ws/"
        "google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent"
    )
    # Half-cascade model (separate STT + LLM + TTS) — sigue prompts mucho mejor
    # que native-audio. Vertex format: projects/.../locations/.../publishers/google/models/...
    LIVE_MODEL = (
        f"projects/{VERTEX_PROJECT}/locations/{VERTEX_REGION}"
        "/publishers/google/models/gemini-live-2.5-flash-native-audio"
    )
else:
    LIVE_API_URL = (
        "wss://generativelanguage.googleapis.com/ws/"
        "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
    )
    # Modelo configurable por env var. Default native-audio 2.5; en Heroku usamos
    # gemini-3.1-flash-live-preview (set via GEMINI_LIVE_MODEL).
    LIVE_MODEL = _os.getenv(
        "GEMINI_LIVE_MODEL", "models/gemini-2.5-flash-native-audio-preview-09-2025"
    )

# Gemini Live tiene un límite duro de ~10 minutos por sesión.
# Antes de ese límite renovamos transparentemente la sesión.
GEMINI_SESSION_MAX_SECONDS = 600
# A los 8:30 avisamos al cliente (1m30 antes del corte).
WARN_BEFORE_END_SECONDS = 90
# A los 9:30 forzamos renovación preventiva para no chocar con el GoAway.
RENEW_BEFORE_END_SECONDS = 30

# Watchdog "el coach nunca se muere": si despues de un turnComplete del usuario
# pasan COACH_SILENCE_TRIGGER_SECONDS sin que el coach diga nada, disparamos
# rescate. Cascada: trigger sintetico -> renew forzado -> mensaje verbal.
#
# Antes era 4s pero disparaba MAL: cuando el user terminaba de hablar, Gemini
# Live a veces tarda 3-6s en arrancar a generar audio (procesamiento normal),
# y durante esa ventana el watchdog interpretaba que el coach se quedo mudo.
# El trigger sintetico se metia en el medio del turno coach causando frases
# concatenadas tipo "...Decila vos!¡Ay perdon no te escuche!". Subido a 12s
# real (tras evidencia en logs de Timo session 181).
COACH_SILENCE_TRIGGER_SECONDS = 60
COACH_SILENCE_HARD_RESCUE_SECONDS = 120


async def _get_vertex_token() -> str:
    """Genera un Bearer token para Vertex AI.

    Prioridad:
    1. GOOGLE_SERVICE_ACCOUNT_JSON_B64: JSON del service account en base64
       (evita problemas de escapes de \\n en private_key). Recomendado en Heroku.
    2. Metadata server de Google Cloud (Cloud Run / GKE) como fallback.
    """
    import asyncio
    import base64
    import json as _json
    import os as _os2

    sa_b64 = _os2.getenv("GOOGLE_SERVICE_ACCOUNT_JSON_B64")

    if sa_b64:
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account

        sa_info = _json.loads(base64.b64decode(sa_b64).decode("utf-8"))
        creds = service_account.Credentials.from_service_account_info(
            sa_info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, creds.refresh, Request())
        log.info("vertex_token: obtenido via GOOGLE_SERVICE_ACCOUNT_JSON_B64 (%s)", sa_info.get("client_email"))
        return creds.token

    # Fallback: metadata server (Cloud Run / GKE)
    import httpx
    metadata_url = (
        "http://metadata.google.internal/computeMetadata/v1/"
        "instance/service-accounts/default/token"
    )
    try:
        async with httpx.AsyncClient(timeout=5.0) as cli:
            r = await cli.get(metadata_url, headers={"Metadata-Flavor": "Google"})
            r.raise_for_status()
            log.info("vertex_token: obtenido via metadata server")
            return r.json()["access_token"]
    except Exception as e:
        log.error("vertex_token_fetch_failed: no hay GOOGLE_SERVICE_ACCOUNT_JSON_B64 ni metadata server: %s", e)
        raise


async def _open_gemini_session(ctx, transcript_so_far: list[dict]):
    """Abre una conexion a Gemini Live + manda el setup + trigger inicial.

    Si transcript_so_far tiene contenido, lo inyectamos como historial para
    que la sesion renovada continue la conversacion (no arranca de cero).
    """
    import time as _time
    session_id = getattr(ctx, "session_id", None)
    t0 = _time.time()
    is_kid = bool(getattr(ctx, "is_kid", False))
    # Override del modelo por sesión (banco de pruebas /llm). Si el ctx no lo
    # trae, usamos el LIVE_MODEL global -> path de prod intacto.
    _model = getattr(ctx, "model_override", None) or LIVE_MODEL
    # Overrides de VAD/turn-taking del banco /llm. None => valor de prod.
    _start_sens = getattr(ctx, "start_sensitivity_override", None)
    _end_sens = getattr(ctx, "end_sensitivity_override", None)
    _silence_ms = getattr(ctx, "silence_ms_override", None)
    _prefix_ms = getattr(ctx, "prefix_padding_override", None)
    _activity = getattr(ctx, "activity_handling_override", None)
    _thinking = getattr(ctx, "thinking_budget_override", None)
    free_topic = getattr(ctx, "free_topic", None)
    super_prompt_size = len(getattr(ctx, "super_prompt", "") or "")
    trace.event("gemini.setup.start",
                session_id=session_id, model=_model, is_kid=is_kid,
                provider=VOICE_PROVIDER,
                free_topic=free_topic, super_prompt_size=super_prompt_size,
                is_renewal=bool(transcript_so_far))

    if VOICE_PROVIDER == "vertex":
        # Vertex: bearer token + URL sin API key
        token = await _get_vertex_token()
        try:
            google_ws = await websockets.connect(
                LIVE_API_URL,
                max_size=2**24,
                extra_headers={"Authorization": f"Bearer {token}"},
            )
        except Exception as e:
            trace.error("gemini.setup.connect_failed",
                        session_id=session_id, provider="vertex",
                        error=str(e), latency_ms=trace_duration_ms(t0))
            raise
    else:
        url = f"{LIVE_API_URL}?key={settings.GEMINI_API_KEY}"
        try:
            google_ws = await websockets.connect(url, max_size=2**24)
        except Exception as e:
            trace.error("gemini.setup.connect_failed",
                        session_id=session_id, provider="ai_studio",
                        error=str(e), latency_ms=trace_duration_ms(t0))
            raise

    # Kids: VAD mas sensible al inicio (queremos interrumpir rapido al coach)
    # y mas tolerante al final (chico se queda pensando o trabado).
    is_kid = bool(getattr(ctx, "is_kid", False))
    setup = {
        "setup": {
            "model": _model,
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                # thinkingBudget: con 0 (apagado) el modelo se trababa con inputs
                # ambiguos + prompt grande (gaps de 6-10s). Un presupuesto bajo le da
                # "espacio mental" para resolver sin explotar la latencia. Configurable.
                "thinkingConfig": {"thinkingBudget": (_thinking if _thinking is not None else int(_os.getenv("GEMINI_THINKING_BUDGET", "1024")))},
                "speechConfig": {
                    "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": getattr(ctx, "voice_name", None) or "Kore"}},
                },
            },
            # SafetySettings BLOCK_NONE: SOLO Vertex lo acepta a nivel 'setup'. AI Studio
            # (gemini-3.x-flash-live-preview) rechaza el campo con 1007 "Unknown name
            # safetySettings at 'setup'" -> cierra el WS y el coach queda MUDO. Por eso
            # lo incluimos condicional al provider. (BLOCK_NONE evita que el filtro mute
            # turnos del coach por palabras sensibles - S498 Jona.)
            **({"safetySettings": [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_CIVIC_INTEGRITY", "threshold": "BLOCK_NONE"},
            ]} if VOICE_PROVIDER == "vertex" else {}),
            "realtimeInputConfig": {
                "automaticActivityDetection": {
                    "disabled": False,
                    # Kids: START_SENSITIVITY_LOW para que solo voz CLARA y fuerte
                    # interrumpa al coach. Antes con HIGH se disparaba con ruidito
                    # de fondo o respiracion → el coach cortaba sin sentido y
                    # despues respondia un turn vacio con "muy bien" generico.
                    "startOfSpeechSensitivity": (
                        _start_sens or ("START_SENSITIVITY_LOW" if is_kid else "START_SENSITIVITY_HIGH")
                    ),
                    # HIGH: VAD interno mas sensible para detectar voz Y turn-end.
                    # Con LOW no transcribia inputs cortos (S489 tuvo 0 input_transcription
                    # con 60 chunks de audio). El silenceDurationMs=2000 capped evita
                    # que pise al alumno cuando hace pausa corta.
                    "endOfSpeechSensitivity": (_end_sens or "END_SENSITIVITY_HIGH"),
                    "prefixPaddingMs": (_prefix_ms if _prefix_ms is not None else 200),
                    "silenceDurationMs": (
                        int(min(max(_silence_ms, 0), 2000)) if _silence_ms is not None
                        # Adultos: piso 600ms; Kids: piso 1500ms; cap 2000ms (API rechaza >2000 con 1007).
                        else int(min(max(ctx.silence_tolerance_ms, 1500 if is_kid else 600), 2000))
                    ),
                },
                # NO_INTERRUPTION: con START_OF_ACTIVITY_INTERRUPTS, un ruidito del
                # nene durante el gap de procesamiento de Gemini abortaba la
                # generación del coach -> freeze a la 3ra-4ta interacción. Con
                # NO_INTERRUPTION el VAD de Google ya no aborta solo. Configurable.
                "activityHandling": (_activity or _os.getenv("GEMINI_ACTIVITY_HANDLING", "NO_INTERRUPTION")),
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
            "systemInstruction": {"parts": [{"text": ctx.super_prompt}]},
        }
    }
    await google_ws.send(json.dumps(setup))
    trace.event("gemini.setup.sent", session_id=session_id, latency_ms=trace_duration_ms(t0))

    # Esperamos setupComplete de Gemini. Si en vez llega error (429/400/etc),
    # lo capturamos en vez de tragarlo silenciosamente.
    try:
        first_msg = await asyncio.wait_for(google_ws.recv(), timeout=10.0)
        try:
            parsed = json.loads(first_msg)
        except Exception:
            parsed = {"raw": first_msg[:300]}
        if "setupComplete" in parsed:
            trace.event("gemini.setup.complete",
                        session_id=session_id, model=_model,
                        latency_ms=trace_duration_ms(t0))
        else:
            trace.error("gemini.setup.unexpected_first_msg",
                        session_id=session_id, first_msg=str(parsed)[:600],
                        latency_ms=trace_duration_ms(t0))
    except websockets.ConnectionClosed as e:
        # Vertex / AI Studio cerro la conexion antes de enviar setupComplete.
        # Es nuestro mejor diagnostico de "el setup no es valido". Capturamos
        # code y reason que dice Google.
        trace.error("gemini.setup.ws_closed_before_complete",
                    session_id=session_id, provider=VOICE_PROVIDER,
                    close_code=e.code, close_reason=str(e.reason)[:300],
                    model=_model,
                    latency_ms=trace_duration_ms(t0))
        try: await google_ws.close()
        except Exception: pass
        raise RuntimeError(f"gemini_live_ws_closed: {e.code} {e.reason}")
    except asyncio.TimeoutError:
        trace.error("gemini.setup.timeout",
                    session_id=session_id, timeout_seconds=10,
                    latency_ms=trace_duration_ms(t0))
        try: await google_ws.close()
        except Exception: pass
        raise RuntimeError("gemini_live_setup_timeout")
    except Exception as e:
        trace.error("gemini.setup.read_error", session_id=session_id, error=str(e),
                    latency_ms=trace_duration_ms(t0))
        raise

    if transcript_so_far:
        # Renovacion: minimo contexto posible al modelo nuevo. Pasar el
        # historial completo confundia al modelo y lo hacia re-ejecutar la
        # conversacion desde el principio (bug session 349: turnos 19+
        # duplicaban los turnos 0-18 textualmente). Solo le decimos:
        # ultimo turno del coach + ultimo turno del user. Si no hay user
        # turn, asumimos que el coach esta esperando respuesta.
        last_ai = next(
            (t["text"] for t in reversed(transcript_so_far) if t.get("who") == "ai"),
            ""
        )
        last_user = next(
            (t["text"] for t in reversed(transcript_so_far) if t.get("who") == "user"),
            ""
        )
        if last_user:
            handover = (
                f"(You are continuing a conversation. Your previous reply was: "
                f"\"{last_ai[:300]}\". The student then said: \"{last_user[:300]}\". "
                f"Respond to that now. Do NOT greet them again. Do NOT introduce "
                f"yourself. Do NOT recap. Just answer their last message in one "
                f"short turn.)"
            )
        else:
            handover = (
                f"(You are continuing a conversation. You just said: "
                f"\"{last_ai[:300]}\". Wait for the student to reply - do NOT "
                f"speak yet, do NOT greet again, do NOT recap.)"
            )
        await google_ws.send(json.dumps({
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": handover}]}],
                "turnComplete": True,
            }
        }))
    else:
        await google_ws.send(json.dumps({
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": "(start)"}]}],
                "turnComplete": True,
            }
        }))
        trace.event("gemini.start_trigger.sent", session_id=session_id)

    return google_ws


class GeminiLiveEngine(VoiceEngine):
    name = "gemini_live"

    async def run(self, ws: WebSocket, ctx: VoiceEngineContext) -> AsyncIterator[dict]:
        # Vertex usa bearer token del metadata server, no GEMINI_API_KEY.
        # Solo ai_studio necesita la API key.
        if VOICE_PROVIDER != "vertex" and not settings.GEMINI_API_KEY:
            await ws.send_json({"type": "error", "error": "GEMINI_API_KEY missing"})
            return

        try:
            google_ws = await _open_gemini_session(ctx, transcript_so_far=[])
        except Exception as e:
            log.exception("No pude abrir WS a Gemini Live: %s", e)
            await ws.send_json({"type": "error", "error": "live_unavailable"})
            return

        transcript: list[dict] = []
        # Gemini Live manda outputTranscription/inputTranscription en chunks
        # palabra-por-palabra. Lo acumulamos en un buffer y persistimos UNA
        # entrada por turno cuando llega turnComplete (o cuando cambia el rol).
        ai_buf: list[str] = []
        user_buf: list[str] = []

        # State machine de la cola post-turnComplete (spec oficial Live API):
        # "outputTranscription is sent INDEPENDENTLY of other server messages
        # and there is NO GUARANTEED ORDERING". Es decir, puede llegar texto
        # del coach DESPUES del turnComplete del mismo turno. Si lo appendeamos
        # a ai_buf nuevo, se pega al PROXIMO turno como fragmento.
        # Lo correcto: mientras hay turno cerrado esperando cola, mergear text
        # al ULTIMO transcript[-1] del ai. El nuevo turno arranca solo cuando
        # llega un audio chunk nuevo del modelo.
        coach_turn_closed_awaiting_tail = [False]  # mutable container para closure

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

        def _merge_tail_into_last_ai(text: str) -> bool:
            """Mergea text rezagado al ultimo turno del coach en transcript.
            Devuelve True si lo mergeo, False si no habia turno previo."""
            if not text or not text.strip():
                return True
            for i in range(len(transcript) - 1, -1, -1):
                if transcript[i].get("who") == "ai":
                    transcript[i]["text"] = (transcript[i]["text"] or "") + text
                    return True
            return False

        # Holder mutable de la conexion a Gemini.
        # Al renovar, reemplazamos gws_holder["ws"] sin tocar el WS del cliente.
        gws_holder = {"ws": google_ws}
        # Flag para que las tareas sepan cuando hay que terminar limpiamente
        # (cliente envio "end" o se desconecto).
        stop_event = asyncio.Event()
        # Evento que dispara la renovacion preventiva
        renew_event = asyncio.Event()
        # Timestamps para el coach_watchdog ("el coach nunca se muere")
        # last_user_turn_at: cuando termino el ultimo turno del usuario.
        # last_ai_output_at: cuando recibimos el ultimo audio/texto del coach.
        # rescue_attempts: cuantos rescates ya intentamos para esta "racha" de silencio.
        timing = {
            "last_user_turn_at": None,  # type: ignore
            "last_ai_output_at": asyncio.get_event_loop().time(),
            "rescue_attempts": 0,
        }

        # Contadores para trazas — agregamos al final de la sesion en un summary
        counters = {"user_audio_chunks": 0, "user_audio_bytes": 0,
                    "ai_audio_chunks": 0, "ai_audio_bytes": 0,
                    "ai_text_chunks": 0, "user_text_chunks": 0,
                    "turn_completes_seen": 0, "first_ai_audio_at": None}

        session_id_log = getattr(ctx, "session_id", None)
        is_kid_log = bool(getattr(ctx, "is_kid", False))
        # model efectivo (override del banco /llm o LIVE_MODEL global). Solo para
        # que el trace reporte el modelo real que se está probando.
        _model_log = getattr(ctx, "model_override", None) or LIVE_MODEL
        trace.event("session.engine.start", session_id=session_id_log, model=_model_log,
                    is_kid=is_kid_log)

        def _mark_first_coach_response(modality: str) -> None:
            """Desglose de latencia por turno: mide say/input-del-user -> primera
            respuesta REAL del coach. Si hubo 'thinking' antes, separa cuanto fue
            red+arranque (time_to_thinking) vs pensar+generar (thinking_to_audio).
            Solo mide el primer output de cada turno (awaiting_coach_since se limpia)."""
            t0 = timing.get("awaiting_coach_since")
            if t0 is None:
                return
            now = asyncio.get_event_loop().time()
            th0 = timing.get("thinking_first_at")
            trace.event("turn.coach_first_response",
                        session_id=session_id_log,
                        modality=modality,
                        total_ms=int((now - t0) * 1000),
                        time_to_thinking_ms=int((th0 - t0) * 1000) if th0 else None,
                        thinking_to_audio_ms=int((now - th0) * 1000) if th0 else None,
                        had_thinking=th0 is not None)
            timing["awaiting_coach_since"] = None
            timing["thinking_first_at"] = None

        # Defensa contra "ghost turns": el modelo a veces emite un turno extra
        # con la cola del turno anterior 13-15s despues, sin que el user haya
        # hablado. Sintoma: coach repite algo, se frena, retoma otra cosa
        # (bug S493). Detectamos y descartamos esos turnos.
        # IMPORTANTE: chequeamos user_audio_chunks_since_last_coach Y NO solo
        # inputTranscription, porque el VAD a veces no transcribe en tiempo real
        # (especialmente turnos largos) y la transcripcion llega despues del
        # primer audio del coach. Sin este check, dropeabamos turnos legitimos
        # del coach (S495: 7 turnos descartados por error).
        ghost_state = {
            "coach_turns_completed": 0,           # cuantos turnos del coach cerraron OK
            "user_input_since_last_coach": False, # llego input_transcription desde el ultimo turn.complete?
            "user_audio_chunks_since_last_coach": 0,  # chunks de audio del user desde el ultimo coach close
            "last_coach_turn_complete_at": None,  # timestamp del ultimo turn.complete del coach
            "current_turn_is_ghost": False,       # turno actual marcado como ghost -> dropear audio/transcript
        }
        # DESACTIVADA - la defensa estaba dropeando turnos LEGITIMOS del coach
        # (S495 perdio multiples turnos -> silencios). El bug raiz del ghost
        # (preference_detector inyectando turnComplete=True) ya esta fixeado en
        # super_prompt.py + engine setup. La defensa quedaba como segunda red
        # pero el costo (turnos legitimos descartados) supero el beneficio.
        GHOST_MIN_GAP_SECONDS = 99999.0  # efectivamente desactivada
        GHOST_MIN_USER_AUDIO_CHUNKS = 0

        # State del resampler del audio del cliente -> 16kHz (ver _pcm16_to_16k).
        # Persiste durante toda la conexion del cliente (incluso renovaciones de
        # la WS a Gemini) para no introducir clicks entre chunks consecutivos.
        resample_state = {"state": None}

        async def client_to_google() -> None:
            try:
                while not stop_event.is_set():
                    msg = await ws.receive_json()
                    if msg.get("type") == "audio":
                        b64 = msg.get("data", "")
                        # sample_rate REAL del cliente (mobile Safari suele ser
                        # 48000 aunque pidamos 16000). Si no viene, asumimos 16000
                        # por compat con clientes viejos.
                        client_sr = int(msg.get("sample_rate") or 16000)
                        # Si el cliente manda fuera del rango aceptado por Gemini,
                        # lo clavamos a 16000 (es mejor mandar a 16k aunque sea
                        # ligeramente off que no mandar nada).
                        if client_sr not in (8000, 16000, 22050, 24000, 32000, 44100, 48000):
                            client_sr = 16000
                        counters["user_audio_chunks"] += 1
                        counters["user_audio_bytes"] += len(b64) * 3 // 4  # base64 → bytes aprox
                        # Tracking para defensa anti-ghost: este chunk cuenta
                        # como "user mando audio desde el ultimo coach close".
                        ghost_state["user_audio_chunks_since_last_coach"] += 1
                        # Resampleo a 16kHz: Gemini Live native-audio solo
                        # transcribe input a 16kHz. Si el cliente capta a otro
                        # rate (iOS Safari = 48000), convertimos aca antes de
                        # mandar. Sin esto Vertex no transcribia y el coach
                        # quedaba mudo tras el saludo (S502/S503).
                        send_sr = client_sr
                        if client_sr != 16000 and b64:
                            try:
                                pcm_in = base64.b64decode(b64)
                                pcm_16k, resample_state["state"] = _pcm16_to_16k(
                                    pcm_in, client_sr, resample_state["state"])
                                b64 = base64.b64encode(pcm_16k).decode("ascii")
                                send_sr = 16000
                                if counters["user_audio_chunks"] == 1:
                                    trace.event("client.audio.resampled",
                                                session_id=session_id_log,
                                                from_sr=client_sr, to_sr=16000)
                            except Exception as e:
                                # Si el resampleo falla, mandamos el original (no
                                # romper la sesion). Peor transcripcion > corte.
                                trace.warn("client.audio.resample_failed",
                                           session_id=session_id_log, error=str(e))
                                send_sr = client_sr
                        # Log el sample rate la primera vez
                        if counters["user_audio_chunks"] == 1:
                            trace.event("client.audio.first_chunk",
                                        session_id=session_id_log,
                                        sample_rate=client_sr,
                                        bytes_approx=counters["user_audio_bytes"])
                        # Logueamos cada 50 chunks
                        if counters["user_audio_chunks"] % 50 == 0:
                            trace.debug("client.audio.streaming",
                                        session_id=session_id_log,
                                        chunks=counters["user_audio_chunks"],
                                        approx_bytes=counters["user_audio_bytes"],
                                        sample_rate=client_sr)
                        try:
                            await gws_holder["ws"].send(json.dumps({
                                "realtimeInput": {
                                    "audio": {"mimeType": f"audio/pcm;rate={send_sr}", "data": b64}
                                }
                            }))
                        except websockets.ConnectionClosed:
                            trace.warn("gemini.audio.send_failed_ws_closed",
                                       session_id=session_id_log,
                                       user_chunks=counters["user_audio_chunks"])
                            # Si Gemini cerro a mitad de envio, esperamos a la renovacion
                            await asyncio.sleep(0.5)
                            continue
                    elif msg.get("type") == "say":
                        text = (msg.get("text") or "").strip()
                        if text:
                            try:
                                await gws_holder["ws"].send(json.dumps({
                                    "clientContent": {
                                        "turns": [{"role": "user", "parts": [{"text": text}]}],
                                        "turnComplete": True,
                                    }
                                }))
                                # Instrumentacion latencia: marca el envio del turno del
                                # user (modo say) -> medimos say -> 1er audio del coach.
                                timing["awaiting_coach_since"] = asyncio.get_event_loop().time()
                                timing["thinking_first_at"] = None
                            except websockets.ConnectionClosed:
                                pass
                    elif msg.get("type") == "system_update":
                        text = (msg.get("text") or "").strip()
                        if text:
                            try:
                                # turnComplete=False: inyectamos la instruccion en el contexto
                                # del modelo pero NO disparamos un turno de respuesta. El modelo
                                # incorporara la regla cuando el alumno hable luego con audio.
                                # Asi al cambiar estilo / pivotear keyword NO arranca a hablar
                                # solo como si el user hubiera dicho algo.
                                await gws_holder["ws"].send(json.dumps({
                                    "clientContent": {
                                        "turns": [{"role": "user", "parts": [{"text": text}]}],
                                        "turnComplete": False,
                                    }
                                }))
                            except websockets.ConnectionClosed:
                                pass
                    elif msg.get("type") == "ping":
                        try:
                            await ws.send_json({"type": "pong"})
                        except Exception:
                            pass
                    elif msg.get("type") == "end":
                        stop_event.set()
                        try:
                            await gws_holder["ws"].close()
                        except Exception:
                            pass
                        return
            except WebSocketDisconnect:
                stop_event.set()
                try:
                    await gws_holder["ws"].close()
                except Exception:
                    pass
            except Exception as e:
                log.exception("client_to_google: %s", e)
                stop_event.set()

        async def google_to_client() -> None:
            """Loop que consume la conexion actual de Gemini. Si la cierran con
            1008 (timeout de sesion) NO termina - señaliza renovacion."""
            while not stop_event.is_set():
                current_ws = gws_holder["ws"]
                try:
                    async for raw in current_ws:
                        try:
                            data = json.loads(raw)
                        except Exception:
                            continue
                        sc = data.get("serverContent")
                        if not sc:
                            # DIAG: que mas viene fuera de serverContent?
                            top_keys = list(data.keys())
                            if top_keys and top_keys != ["setupComplete"]:
                                trace.event("gemini.raw.no_serverContent",
                                            session_id=session_id_log,
                                            top_keys=top_keys,
                                            preview=str(data)[:300])
                            continue

                        # DIAG: logear las keys que llegan dentro de serverContent
                        # para detectar si Vertex usa otro nombre para transcripcion
                        sc_keys = sorted(sc.keys())
                        if sc_keys not in (counters.get("_seen_sc_keys") or []):
                            seen = counters.get("_seen_sc_keys") or []
                            seen.append(sc_keys)
                            counters["_seen_sc_keys"] = seen
                            trace.event("gemini.raw.sc_keys",
                                        session_id=session_id_log,
                                        keys=sc_keys,
                                        sample=str({k: (str(sc.get(k))[:120] if not isinstance(sc.get(k), (dict, list)) else type(sc.get(k)).__name__) for k in sc_keys})[:600])

                        # Barge-in: Gemini detecto que el usuario empezo a hablar
                        # mientras el coach soltaba audio. Avisamos al cliente para
                        # que CANCELE INMEDIATAMENTE la cola de audio que esta
                        # reproduciendo del coach. PERO con NO_INTERRUPTION el coach
                        # NO se aborta (sigue generando) -> cancelar el audio cortaba
                        # la frase a la mitad ("¡Eso, muy..." + reinicio). Solo
                        # reenviar el interrupted si el modo realmente interrumpe.
                        if sc.get("interrupted"):
                            _ah = _os.getenv("GEMINI_ACTIVITY_HANDLING", "NO_INTERRUPTION")
                            trace.event("gemini.interrupted", session_id=session_id_log, reenviado=(_ah != "NO_INTERRUPTION"))
                            if _ah != "NO_INTERRUPTION":
                                try:
                                    await ws.send_json({"type": "interrupted"})
                                except Exception:
                                    pass

                        model_turn = sc.get("modelTurn") or {}
                        # Si llega audio del modelo y estabamos esperando cola
                        # del turno previo, ese turno previo se cierra de verdad:
                        # arranca el nuevo turno. Cualquier text que venga ahora
                        # va al nuevo ai_buf, no como cola del anterior.
                        has_audio_now = any(
                            (p.get("inlineData") or {}).get("mimeType", "").startswith("audio")
                            for p in model_turn.get("parts", [])
                        )
                        if has_audio_now and coach_turn_closed_awaiting_tail[0]:
                            coach_turn_closed_awaiting_tail[0] = False

                        for part in model_turn.get("parts", []):
                            inline = part.get("inlineData")
                            if inline and inline.get("mimeType", "").startswith("audio"):
                                # Deteccion de ghost turn: SOLO al inicio del turno.
                                # Es ghost si: no es saludo + sin input_transcription +
                                # sin audio chunks del user recientes + gap > 5s.
                                # El check de audio chunks es CLAVE: la transcripcion del
                                # input a veces llega DESPUES del primer audio del coach
                                # (S495 perdimos 7 turnos legitimos por solo mirar transcription).
                                if timing.get("current_turn_ai_started_at") is None:
                                    now_t = time.time()
                                    last_close = ghost_state["last_coach_turn_complete_at"]
                                    has_user_input = (
                                        ghost_state["user_input_since_last_coach"]
                                        or ghost_state["user_audio_chunks_since_last_coach"] >= GHOST_MIN_USER_AUDIO_CHUNKS
                                    )
                                    if (
                                        ghost_state["coach_turns_completed"] >= 1
                                        and not has_user_input
                                        and last_close is not None
                                        and (now_t - last_close) > GHOST_MIN_GAP_SECONDS
                                    ):
                                        ghost_state["current_turn_is_ghost"] = True
                                        counters["ghost_turns_blocked"] = counters.get("ghost_turns_blocked", 0) + 1
                                        trace.warn(
                                            "gemini.coach.ghost_turn_dropped",
                                            session_id=session_id_log,
                                            gap_since_last_coach_s=round(now_t - last_close, 2),
                                            coach_turns_so_far=ghost_state["coach_turns_completed"],
                                            user_audio_chunks_in_window=ghost_state["user_audio_chunks_since_last_coach"],
                                            reason="no_user_input_or_audio_since_last_turn",
                                        )
                                    timing["current_turn_ai_started_at"] = asyncio.get_event_loop().time()

                                timing["last_ai_output_at"] = asyncio.get_event_loop().time()
                                # Si es ghost, NO mandar audio al cliente.
                                if ghost_state["current_turn_is_ghost"]:
                                    continue
                                _mark_first_coach_response("audio")
                                counters["ai_audio_chunks"] += 1
                                audio_bytes = len(inline.get("data", "")) * 3 // 4
                                counters["ai_audio_bytes"] += audio_bytes
                                if counters["first_ai_audio_at"] is None:
                                    counters["first_ai_audio_at"] = time.time()
                                    trace.event("gemini.audio.first_chunk",
                                                session_id=session_id_log,
                                                bytes=audio_bytes)
                                await ws.send_json({"type": "audio", "data": inline["data"]})
                            text = part.get("text")
                            if text:
                                stripped = text.strip()
                                looks_like_thinking = (
                                    stripped.startswith("**") or
                                    "I'm now implementing" in stripped or
                                    "Initiating Conversation Protocol" in stripped or
                                    stripped.startswith("Okay, I've got it") or
                                    stripped.startswith("Following instructions")
                                )
                                if looks_like_thinking:
                                    if timing.get("awaiting_coach_since") and timing.get("thinking_first_at") is None:
                                        timing["thinking_first_at"] = asyncio.get_event_loop().time()
                                    trace.warn("gemini.text.thinking_dropped",
                                               session_id=session_id_log,
                                               text_preview=stripped[:200])
                                elif ghost_state["current_turn_is_ghost"]:
                                    # Ghost turn: descartar texto tambien
                                    pass
                                elif coach_turn_closed_awaiting_tail[0]:
                                    # Cola del turno previo (spec: outputTranscription
                                    # llega independientemente, sin ordering garantizado).
                                    # Mergear al transcript previo en lugar de appendear a
                                    # ai_buf nuevo.
                                    _merge_tail_into_last_ai(text)
                                else:
                                    text = _clean_coach_text(text)
                                    timing["last_ai_output_at"] = asyncio.get_event_loop().time()
                                    counters["ai_text_chunks"] += 1
                                    ai_buf.append(text)
                                    trace.event("gemini.coach_chunk", session_id=session_id_log, src="part", n=counters["ai_text_chunks"], text=text[:160])
                                    await ws.send_json({"type": "transcript_chunk", "who": "ai", "text": text})

                        out_tr = sc.get("outputTranscription")
                        if out_tr and out_tr.get("text"):
                            if ghost_state["current_turn_is_ghost"]:
                                pass  # ghost: no propagar transcripcion
                            elif coach_turn_closed_awaiting_tail[0]:
                                # Cola rezagada de outputTranscription post-turnComplete.
                                # Mergear al transcript previo, no al ai_buf nuevo.
                                _merge_tail_into_last_ai(out_tr["text"])
                            else:
                                cleaned = _clean_coach_text(out_tr["text"])
                                timing["last_ai_output_at"] = asyncio.get_event_loop().time()
                                counters["ai_text_chunks"] += 1
                                ai_buf.append(cleaned)
                                trace.event("gemini.coach_chunk", session_id=session_id_log, src="outTr", n=counters["ai_text_chunks"], text=cleaned[:160])
                                await ws.send_json({"type": "transcript_chunk", "who": "ai", "text": cleaned})

                        input_tr = sc.get("inputTranscription")
                        if input_tr and input_tr.get("text"):
                            counters["user_text_chunks"] += 1
                            user_buf.append(input_tr["text"])
                            # Marcar que llego input del user desde el ultimo coach turn:
                            # el proximo turno del coach NO se considera ghost.
                            ghost_state["user_input_since_last_coach"] = True
                            # User empezo a hablar -> ya no estamos esperando cola del
                            # coach previo, el proximo audio del coach sera nuevo turno.
                            coach_turn_closed_awaiting_tail[0] = False
                            now_ts = asyncio.get_event_loop().time()
                            timing["last_user_input_at"] = now_ts
                            # OVERLAP REAL: input del user llegando DESPUES de
                            # que el coach ya empezo a hablar = el coach lo piso.
                            overlap_ms = None
                            coach_started = timing.get("current_turn_ai_started_at")
                            if coach_started is not None and now_ts > coach_started:
                                overlap_ms = int((now_ts - coach_started) * 1000)
                                counters["overlaps"] = counters.get("overlaps", 0) + 1
                                trace.warn("gemini.coach.overlap_user",
                                           session_id=session_id_log,
                                           overlap_ms=overlap_ms,
                                           input_text=input_tr["text"][:200])
                            trace.event("gemini.input_transcription",
                                        session_id=session_id_log,
                                        chunk_n=counters["user_text_chunks"],
                                        text_preview=input_tr["text"][:200],
                                        overlap_ms=overlap_ms)
                            await ws.send_json({"type": "transcript_chunk", "who": "user", "text": input_tr["text"]})

                        if sc.get("turnComplete"):
                            counters["turn_completes_seen"] += 1
                            # Timing: cuanto paso desde el ultimo input del user
                            # hasta este turn.complete. Si fue corto y el turno es
                            # del COACH (no del user), el coach probablemente le
                            # corto al alumno.
                            ms_since_user = None
                            possible_cut = False
                            last_in = timing.get("last_user_input_at")
                            if last_in is not None:
                                ms_since_user = int((asyncio.get_event_loop().time() - last_in) * 1000)
                                # Si el coach respondio rapido (<1500ms) y este turno
                                # es del coach (user_buf vacio), es un probable corte.
                                if ms_since_user < 1500 and not "".join(user_buf).strip():
                                    possible_cut = True
                                    counters["possible_cuts"] = counters.get("possible_cuts", 0) + 1
                            ai_text_final = "".join(ai_buf).strip()
                            trace.event("gemini.turn.complete",
                                        session_id=session_id_log,
                                        n=counters["turn_completes_seen"],
                                        user_text="".join(user_buf).strip()[:200],
                                        ai_text=ai_text_final[:200],
                                        ms_since_user_input=ms_since_user,
                                        possible_coach_cut=possible_cut)
                            # Empty turn: coach cerro turno sin generar audio ni texto.
                            # Causas tipicas: safety filter bloqueo silenciosamente, o
                            # el modelo decidio no responder. Loguear como WARNING para
                            # detectar mute silencioso (S498 Jona: 2 empty turns por safety).
                            had_user = bool("".join(user_buf).strip()) or counters.get("user_audio_chunks_in_turn", 0) > 0
                            if not ai_text_final and counters.get("ai_audio_chunks", 0) == counters.get("_ai_audio_at_last_tc", 0) and had_user:
                                trace.warn("gemini.coach.empty_turn",
                                           session_id=session_id_log,
                                           turn_n=counters["turn_completes_seen"],
                                           user_text_preview="".join(user_buf).strip()[:200],
                                           hint="probable safety filter block or no-response decision")
                            counters["_ai_audio_at_last_tc"] = counters.get("ai_audio_chunks", 0)
                            if possible_cut:
                                trace.warn("gemini.coach.possible_cut",
                                           session_id=session_id_log,
                                           turn_n=counters["turn_completes_seen"],
                                           ms_since_user_input=ms_since_user,
                                           ai_text_preview="".join(ai_buf).strip()[:200])
                            last_user_text = "".join(user_buf).strip()
                            # Si era ghost turn, FLUSH SILENCIOSO: no escribir al
                            # transcript ni emitir turn_complete al cliente.
                            was_ghost = ghost_state["current_turn_is_ghost"]
                            # Si el turno cerrado fue del COACH (ai_buf tenia texto),
                            # marcamos que esperamos cola post-turnComplete - cualquier
                            # text/outputTranscription que llegue antes del proximo audio
                            # del coach se mergea al transcript previo, no al nuevo.
                            had_ai_content = bool("".join(ai_buf).strip())
                            if was_ghost:
                                user_buf.clear()
                                ai_buf.clear()
                            else:
                                _flush_buffers()
                                if had_ai_content:
                                    coach_turn_closed_awaiting_tail[0] = True
                            # Si el ultimo turno completado fue del USER, anotamos
                            # el timestamp para que el coach_watchdog empiece a
                            # contar el silencio del coach.
                            if last_user_text and not was_ghost:
                                timing["last_user_turn_at"] = asyncio.get_event_loop().time()
                                timing["rescue_attempts"] = 0
                            # Reset para detectar overlap del proximo turno del coach.
                            timing["current_turn_ai_started_at"] = None
                            # Actualizar ghost state: este turno del coach cerro.
                            ghost_state["coach_turns_completed"] += 1
                            ghost_state["last_coach_turn_complete_at"] = time.time()
                            ghost_state["user_input_since_last_coach"] = False
                            ghost_state["user_audio_chunks_since_last_coach"] = 0
                            ghost_state["current_turn_is_ghost"] = False
                            if was_ghost:
                                # No notificamos al cliente — el ghost no existio.
                                continue
                            await ws.send_json({"type": "turn_complete"})
                            if last_user_text and len(last_user_text) >= 6:
                                # Modo evolutivo: check admin trigger ANTES del preference
                                # detector. Si matchea, se procesa como directiva y se
                                # SALTEA el preference detector (es admin, no charla).
                                from services.admin_feedback import detect_admin_trigger
                                admin_body = detect_admin_trigger(last_user_text)
                                if admin_body:
                                    asyncio.create_task(_handle_admin_directive(
                                        raw_text=last_user_text,
                                        feedback_body=admin_body,
                                        ctx=ctx,
                                        google_ws=gws_holder["ws"],
                                        client_ws=ws,
                                    ))
                                else:
                                    asyncio.create_task(_maybe_detect_preference(
                                        user_id=ctx.user_id,
                                        user_text=last_user_text,
                                        target_lang=ctx.target_language or "es",
                                        google_ws=gws_holder["ws"],
                                        client_ws=ws,
                                    ))
                except websockets.ConnectionClosed as e:
                    # Gemini cerro la sesion. Si fue por timeout (1008) o renovacion
                    # preventiva, abrimos nueva sesion transparentemente.
                    if stop_event.is_set():
                        return
                    code = getattr(e, "code", None)
                    log.info("Gemini WS closed (code=%s) - intentando renovar sesion", code)
                    renew_event.set()
                    # Esperamos a que el renew_watchdog haya abierto una nueva
                    for _ in range(40):  # hasta 4 segundos
                        if gws_holder["ws"] is not current_ws or stop_event.is_set():
                            break
                        await asyncio.sleep(0.1)
                    if stop_event.is_set():
                        return
                    # Si gws_holder no se renovo, salimos
                    if gws_holder["ws"] is current_ws:
                        log.error("No se pudo renovar la sesion Gemini, cerrando")
                        return
                    # Continuamos el while -> nuevo current_ws
                except Exception as e:
                    log.exception("google_to_client: %s", e)
                    return

        async def session_watchdog() -> None:
            """Avisa al cliente 90s antes del corte + renueva preventivamente 30s
            antes del corte para no chocar con el GoAway de Gemini."""
            try:
                # Aviso visual al cliente
                await asyncio.wait_for(stop_event.wait(), timeout=GEMINI_SESSION_MAX_SECONDS - WARN_BEFORE_END_SECONDS)
                return  # stop_event seteo -> sesion terminada por el user, no avisar
            except asyncio.TimeoutError:
                pass

            if stop_event.is_set():
                return
            try:
                await ws.send_json({
                    "type": "session_ending_soon",
                    "seconds_left": WARN_BEFORE_END_SECONDS,
                    "message": "Tu charla se está renovando en 90 segundos. Vas a poder seguir hablando sin cortes.",
                })
            except Exception:
                pass

            try:
                await asyncio.wait_for(
                    stop_event.wait(),
                    timeout=WARN_BEFORE_END_SECONDS - RENEW_BEFORE_END_SECONDS,
                )
                return
            except asyncio.TimeoutError:
                pass

            if not stop_event.is_set():
                renew_event.set()

        async def renew_watchdog() -> None:
            """Cuando renew_event se setea, cierra la sesion actual y abre una
            nueva con el historial de transcript inyectado."""
            while not stop_event.is_set():
                try:
                    await asyncio.wait_for(renew_event.wait(), timeout=1)
                except asyncio.TimeoutError:
                    continue
                renew_event.clear()
                if stop_event.is_set():
                    return

                old_ws = gws_holder["ws"]
                # Flush antes de renovar para conservar el ultimo turno parcial
                _flush_buffers()
                try:
                    await ws.send_json({"type": "session_renewing"})
                except Exception:
                    pass
                try:
                    new_ws = await _open_gemini_session(ctx, transcript_so_far=transcript[:])
                except Exception as e:
                    log.exception("No pude renovar Gemini: %s", e)
                    try:
                        await ws.send_json({"type": "error", "error": "session_renew_failed"})
                    except Exception:
                        pass
                    stop_event.set()
                    return
                gws_holder["ws"] = new_ws
                try:
                    await old_ws.close()
                except Exception:
                    pass
                try:
                    await ws.send_json({"type": "session_renewed", "message": "¡Listo, podés seguir hablando!"})
                except Exception:
                    pass
                log.info("Sesion Gemini renovada exitosamente. Turnos en historial: %d", len(transcript))

        async def coach_watchdog() -> None:
            """El coach NUNCA se muere. Cada ~1s monitorea silencio del coach
            despues de un turno del usuario. Cascada de rescate:

            - >8s silencio: trigger sintetico al modelo (suave, "seguis ahi?")
            - >14s silencio: rescate verbal explicito + force-renew si falla.

            Solo cuenta el silencio si hubo un turno del usuario reciente que
            todavia no fue contestado. Si el usuario no dijo nada, el silencio
            es normal.
            """
            while not stop_event.is_set():
                try:
                    await asyncio.wait_for(stop_event.wait(), timeout=1.0)
                    return
                except asyncio.TimeoutError:
                    pass

                last_user_at = timing.get("last_user_turn_at")
                if last_user_at is None:
                    continue

                last_ai_at = timing.get("last_ai_output_at") or 0
                # Si el coach hablo despues del ultimo turno del usuario, todo OK.
                if last_ai_at >= last_user_at:
                    continue

                now = asyncio.get_event_loop().time()
                silence = now - last_user_at
                attempts = timing.get("rescue_attempts", 0)

                if silence < COACH_SILENCE_TRIGGER_SECONDS:
                    continue

                # Nivel 1: trigger sintetico SUAVE - SOLO si pasaron 12s+ y NO
                # hay audio del coach reciente. Mensaje conservador: NO le pedimos
                # que diga "no te escuche" ni "perdon" - solo que continue suave
                # si el silencio es real. Para el modelo Live esto es un nudge,
                # no un comando que verbalice.
                if attempts == 0:
                    log.warning(
                        "coach_watchdog: silencio %.1fs tras turno user. "
                        "Nivel 1: nudge silencioso.", silence,
                    )
                    timing["rescue_attempts"] = 1
                    trigger_text = (
                        "(Internal nudge - do NOT verbalize this, do NOT say sorry, "
                        "do NOT say you didn't hear: the student seems to be quiet. "
                        "If you have something natural to say to continue, say it in "
                        "ONE short sentence. If not, stay silent.)"
                    )
                    try:
                        # turnComplete=False: inyectamos como contexto, NO forzamos
                        # respuesta. Asi el modelo absorbe la pista pero NO dispara
                        # un turno verbalizando 'lost you for a sec' (S495 turno 34).
                        await gws_holder["ws"].send(json.dumps({
                            "clientContent": {
                                "turns": [{"role": "user", "parts": [{"text": trigger_text}]}],
                                "turnComplete": False,
                            }
                        }))
                    except Exception as e:
                        log.warning("coach_watchdog nivel 1 fallo: %s", e)
                    try:
                        await ws.send_json({"type": "coach_recovering", "level": 1})
                    except Exception:
                        pass
                    continue

                # Nivel 2 (hard rescue): force-renew + saludo de rescate
                if silence >= COACH_SILENCE_HARD_RESCUE_SECONDS and attempts == 1:
                    log.error(
                        "coach_watchdog: silencio %.1fs tras nivel 1. "
                        "Nivel 2: force-renew + rescate verbal.", silence,
                    )
                    timing["rescue_attempts"] = 2
                    try:
                        await ws.send_json({"type": "coach_recovering", "level": 2})
                    except Exception:
                        pass
                    # Force-renew: cerrar el WS actual y abrir uno nuevo
                    # con un mensaje de rescate como primer turno.
                    old_ws = gws_holder["ws"]
                    name = getattr(ctx, "user_name", "") or ""
                    is_kid_ctx = bool(getattr(ctx, "is_kid", False))
                    if is_kid_ctx:
                        rescue_msg = (
                            f"(Sistema: hubo un problema tecnico y la conexion se reinicio. "
                            f"Saludá a {name} en castellano de forma natural y calida "
                            f"diciendo algo como 'Ey {name}, perdón, me trabe un toque, "
                            f"¿seguimos?'. UNA sola frase corta. Despues volve al tópico "
                            f"que estaban trabajando.)"
                        )
                    else:
                        rescue_msg = (
                            f"(System: there was a tech glitch and we reconnected. "
                            f"Greet {name} casually like 'Hey {name}, sorry, lost you for "
                            f"a sec — where were we?'. ONE short sentence. Then pick up "
                            f"the topic we were on.)"
                        )
                    try:
                        new_ws = await _open_gemini_session(ctx, transcript_so_far=transcript[:])
                        gws_holder["ws"] = new_ws
                        try:
                            await new_ws.send(json.dumps({
                                "clientContent": {
                                    "turns": [{"role": "user", "parts": [{"text": rescue_msg}]}],
                                    "turnComplete": True,
                                }
                            }))
                        except Exception:
                            pass
                        try:
                            await old_ws.close()
                        except Exception:
                            pass
                        # Reset timing para que el watchdog le de tiempo al rescate
                        timing["last_user_turn_at"] = asyncio.get_event_loop().time()
                        timing["last_ai_output_at"] = asyncio.get_event_loop().time()
                        log.info("coach_watchdog: nivel 2 OK - sesion reabierta con rescate")
                    except Exception as e:
                        log.exception("coach_watchdog nivel 2 fallo: %s", e)
                        try:
                            await ws.send_json({"type": "error", "error": "coach_unrecoverable"})
                        except Exception:
                            pass

        try:
            await asyncio.gather(
                client_to_google(),
                google_to_client(),
                session_watchdog(),
                renew_watchdog(),
                coach_watchdog(),
                return_exceptions=True,
            )
        finally:
            stop_event.set()
            _flush_buffers()
            try:
                await gws_holder["ws"].close()
            except Exception:
                pass

            # Summary final de la sesion para diagnostico post-mortem
            first_ai_ts = counters.get("first_ai_audio_at")
            trace.event("session.engine.end",
                        session_id=session_id_log,
                        user_audio_chunks=counters["user_audio_chunks"],
                        user_audio_bytes_approx=counters["user_audio_bytes"],
                        ai_audio_chunks=counters["ai_audio_chunks"],
                        ai_audio_bytes_approx=counters["ai_audio_bytes"],
                        ai_text_chunks=counters["ai_text_chunks"],
                        user_text_chunks=counters["user_text_chunks"],
                        turn_completes=counters["turn_completes_seen"],
                        coach_spoke=bool(counters["ai_audio_chunks"] > 0),
                        user_was_transcribed=bool(counters["user_text_chunks"] > 0),
                        transcript_lines=len(transcript))

        for line in transcript:
            yield line

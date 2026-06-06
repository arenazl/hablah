"""Gemini Live engine — WebSocket bidireccional con audio nativo (Aoede).

Latencia ~500ms. Es el default para conversación en vivo.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import AsyncIterator

import websockets
from fastapi import WebSocket, WebSocketDisconnect

from core.config import settings
from core.trace import trace, trace_duration_ms
from services.voice_engine import VoiceEngine, VoiceEngineContext

log = logging.getLogger(__name__)


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

        # Inyectar mensaje sintetico al modelo para que confirme en voz
        try:
            await google_ws.send(json.dumps({
                "clientContent": {
                    "turns": [{"role": "user", "parts": [{"text": result["confirmation_text"]}]}],
                    "turnComplete": True,
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
    LIVE_MODEL = "models/gemini-2.5-flash-native-audio-preview-09-2025"

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
COACH_SILENCE_TRIGGER_SECONDS = 12
COACH_SILENCE_HARD_RESCUE_SECONDS = 22


async def _get_vertex_token() -> str:
    """Obtiene un access token del metadata server de Cloud Run.

    En Cloud Run el service account default es compute@... — necesita rol
    'roles/aiplatform.user' para llamar Vertex. Si no estamos en Cloud Run,
    devuelve None y cae a auth alternativa.
    """
    import httpx
    metadata_url = (
        "http://metadata.google.internal/computeMetadata/v1/"
        "instance/service-accounts/default/token"
    )
    try:
        async with httpx.AsyncClient(timeout=5.0) as cli:
            r = await cli.get(metadata_url, headers={"Metadata-Flavor": "Google"})
            r.raise_for_status()
            return r.json()["access_token"]
    except Exception as e:
        log.error("vertex_token_fetch_failed: %s", e)
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
    free_topic = getattr(ctx, "free_topic", None)
    super_prompt_size = len(getattr(ctx, "super_prompt", "") or "")
    trace.event("gemini.setup.start",
                session_id=session_id, model=LIVE_MODEL, is_kid=is_kid,
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
            "model": LIVE_MODEL,
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                # thinkingBudget=0 = desactiva el modo "thinking" del modelo.
                # Sin esto, gemini-2.5-flash-native-audio-* puede VERBALIZAR su
                # cadena de razonamiento en voz alta ("I'm now implementing the
                # first turn...") en vez de ejecutar la instruccion directamente.
                "thinkingConfig": {"thinkingBudget": 0},
                "speechConfig": {
                    # Voz Kore: tonalidad calida, mejor resolucion percibida que
                    # Aoede. Si el template define su propia voz, override aca.
                    "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": getattr(ctx, "voice_name", None) or "Kore"}},
                },
            },
            "realtimeInputConfig": {
                "automaticActivityDetection": {
                    "disabled": False,
                    # Kids: START_SENSITIVITY_LOW para que solo voz CLARA y fuerte
                    # interrumpa al coach. Antes con HIGH se disparaba con ruidito
                    # de fondo o respiracion → el coach cortaba sin sentido y
                    # despues respondia un turn vacio con "muy bien" generico.
                    "startOfSpeechSensitivity": (
                        "START_SENSITIVITY_LOW" if is_kid else "START_SENSITIVITY_HIGH"
                    ),
                    # HIGH: VAD interno mas sensible para detectar voz Y turn-end.
                    # Con LOW no transcribia inputs cortos (S489 tuvo 0 input_transcription
                    # con 60 chunks de audio). El silenceDurationMs=2000 capped evita
                    # que pise al alumno cuando hace pausa corta.
                    "endOfSpeechSensitivity": "END_SENSITIVITY_HIGH",
                    "prefixPaddingMs": 200,
                    "silenceDurationMs": (
                        # Adultos: piso 800ms (templates: 1000ms = ~1s perceptual).
                        # Kids: piso 1500ms (cadencia mas lenta).
                        # Cap a 2000ms (Gemini Live API rechaza valores mayores con 1007).
                        int(min(max(ctx.silence_tolerance_ms, 1500 if is_kid else 800), 2000))
                    ),
                },
                # Permitimos siempre que el alumno interrumpa al coach. Si el
                # VAD se equivoca y el coach arranca antes de tiempo, el
                # alumno puede cortarlo apenas habla — recupera el control.
                "activityHandling": "START_OF_ACTIVITY_INTERRUPTS",
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
                        session_id=session_id, model=LIVE_MODEL,
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
                    model=LIVE_MODEL,
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
        trace.event("session.engine.start", session_id=session_id_log, model=LIVE_MODEL,
                    is_kid=is_kid_log)

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
                                    "audio": {"mimeType": f"audio/pcm;rate={client_sr}", "data": b64}
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
                        # reproduciendo del coach.
                        if sc.get("interrupted"):
                            try:
                                await ws.send_json({"type": "interrupted"})
                            except Exception:
                                pass

                        model_turn = sc.get("modelTurn") or {}
                        for part in model_turn.get("parts", []):
                            inline = part.get("inlineData")
                            if inline and inline.get("mimeType", "").startswith("audio"):
                                timing["last_ai_output_at"] = asyncio.get_event_loop().time()
                                # Track inicio del turno actual del coach para
                                # detectar overlap si llega input_transcription
                                # DESPUES de este timestamp.
                                if timing.get("current_turn_ai_started_at") is None:
                                    timing["current_turn_ai_started_at"] = asyncio.get_event_loop().time()
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
                                    trace.warn("gemini.text.thinking_dropped",
                                               session_id=session_id_log,
                                               text_preview=stripped[:200])
                                else:
                                    timing["last_ai_output_at"] = asyncio.get_event_loop().time()
                                    counters["ai_text_chunks"] += 1
                                    ai_buf.append(text)
                                    await ws.send_json({"type": "transcript_chunk", "who": "ai", "text": text})

                        out_tr = sc.get("outputTranscription")
                        if out_tr and out_tr.get("text"):
                            timing["last_ai_output_at"] = asyncio.get_event_loop().time()
                            counters["ai_text_chunks"] += 1
                            ai_buf.append(out_tr["text"])
                            await ws.send_json({"type": "transcript_chunk", "who": "ai", "text": out_tr["text"]})

                        input_tr = sc.get("inputTranscription")
                        if input_tr and input_tr.get("text"):
                            counters["user_text_chunks"] += 1
                            user_buf.append(input_tr["text"])
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
                            trace.event("gemini.turn.complete",
                                        session_id=session_id_log,
                                        n=counters["turn_completes_seen"],
                                        user_text="".join(user_buf).strip()[:200],
                                        ai_text="".join(ai_buf).strip()[:200],
                                        ms_since_user_input=ms_since_user,
                                        possible_coach_cut=possible_cut)
                            if possible_cut:
                                trace.warn("gemini.coach.possible_cut",
                                           session_id=session_id_log,
                                           turn_n=counters["turn_completes_seen"],
                                           ms_since_user_input=ms_since_user,
                                           ai_text_preview="".join(ai_buf).strip()[:200])
                            last_user_text = "".join(user_buf).strip()
                            _flush_buffers()
                            # Si el ultimo turno completado fue del USER, anotamos
                            # el timestamp para que el coach_watchdog empiece a
                            # contar el silencio del coach.
                            if last_user_text:
                                timing["last_user_turn_at"] = asyncio.get_event_loop().time()
                                timing["rescue_attempts"] = 0
                            # Reset para detectar overlap del proximo turno del coach.
                            timing["current_turn_ai_started_at"] = None
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
                        await gws_holder["ws"].send(json.dumps({
                            "clientContent": {
                                "turns": [{"role": "user", "parts": [{"text": trigger_text}]}],
                                "turnComplete": True,
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

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


LIVE_API_URL = (
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)
# Modelo más nuevo habilitado en la API key actual (Gemini 3.1 Live preview)
LIVE_MODEL = "models/gemini-3.1-flash-live-preview"

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


async def _open_gemini_session(ctx, transcript_so_far: list[dict]):
    """Abre una conexion a Gemini Live + manda el setup + trigger inicial.

    Si transcript_so_far tiene contenido, lo inyectamos como historial para
    que la sesion renovada continue la conversacion (no arranca de cero).
    """
    url = f"{LIVE_API_URL}?key={settings.GEMINI_API_KEY}"
    google_ws = await websockets.connect(url, max_size=2**24)

    # Kids: VAD mas sensible al inicio (queremos interrumpir rapido al coach)
    # y mas tolerante al final (chico se queda pensando o trabado).
    is_kid = bool(getattr(ctx, "is_kid", False))
    setup = {
        "setup": {
            "model": LIVE_MODEL,
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Aoede"}},
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
                    "endOfSpeechSensitivity": (
                        "END_SENSITIVITY_LOW" if is_kid else "END_SENSITIVITY_HIGH"
                    ),
                    "prefixPaddingMs": 200,
                    "silenceDurationMs": (
                        max(ctx.silence_tolerance_ms, 1200) if is_kid else ctx.silence_tolerance_ms
                    ),
                },
                "activityHandling": (
                    "START_OF_ACTIVITY_INTERRUPTS" if ctx.interruption_allowed else "NO_INTERRUPTION"
                ),
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
            "systemInstruction": {"parts": [{"text": ctx.super_prompt}]},
        }
    }
    await google_ws.send(json.dumps(setup))

    if transcript_so_far:
        # Renovacion: reinyectamos el historial reciente como contexto al nuevo modelo
        # (tomamos los ultimos 12 turnos para no exceder budget de tokens)
        recent = transcript_so_far[-12:]
        history_text = "\n".join(
            f"{'Tutor' if t['who'] == 'ai' else 'Alumno'}: {t['text']}"
            for t in recent
        )
        await google_ws.send(json.dumps({
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": (
                    f"(Continuando la conversacion. Esto es lo que se hablo antes, "
                    f"no lo repitas - solo seguila naturalmente):\n\n{history_text}\n\n"
                    f"(continua desde donde quedamos)"
                )}]}],
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

    return google_ws


class GeminiLiveEngine(VoiceEngine):
    name = "gemini_live"

    async def run(self, ws: WebSocket, ctx: VoiceEngineContext) -> AsyncIterator[dict]:
        if not settings.GEMINI_API_KEY:
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

        async def client_to_google() -> None:
            try:
                while not stop_event.is_set():
                    msg = await ws.receive_json()
                    if msg.get("type") == "audio":
                        b64 = msg.get("data", "")
                        try:
                            await gws_holder["ws"].send(json.dumps({
                                "realtimeInput": {
                                    "audio": {"mimeType": "audio/pcm;rate=8000", "data": b64}
                                }
                            }))
                        except websockets.ConnectionClosed:
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
                                await gws_holder["ws"].send(json.dumps({
                                    "clientContent": {
                                        "turns": [{"role": "user", "parts": [{"text": text}]}],
                                        "turnComplete": True,
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
                            continue

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
                                await ws.send_json({"type": "audio", "data": inline["data"]})
                            text = part.get("text")
                            if text:
                                timing["last_ai_output_at"] = asyncio.get_event_loop().time()
                                ai_buf.append(text)
                                await ws.send_json({"type": "transcript_chunk", "who": "ai", "text": text})

                        out_tr = sc.get("outputTranscription")
                        if out_tr and out_tr.get("text"):
                            timing["last_ai_output_at"] = asyncio.get_event_loop().time()
                            ai_buf.append(out_tr["text"])
                            await ws.send_json({"type": "transcript_chunk", "who": "ai", "text": out_tr["text"]})

                        input_tr = sc.get("inputTranscription")
                        if input_tr and input_tr.get("text"):
                            user_buf.append(input_tr["text"])
                            await ws.send_json({"type": "transcript_chunk", "who": "user", "text": input_tr["text"]})

                        if sc.get("turnComplete"):
                            last_user_text = "".join(user_buf).strip()
                            _flush_buffers()
                            # Si el ultimo turno completado fue del USER, anotamos
                            # el timestamp para que el coach_watchdog empiece a
                            # contar el silencio del coach.
                            if last_user_text:
                                timing["last_user_turn_at"] = asyncio.get_event_loop().time()
                                timing["rescue_attempts"] = 0
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

        for line in transcript:
            yield line

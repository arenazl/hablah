"""Voice Room Engine: charla de N participantes + 1 sesion Gemini compartida.

Cada participante (host o guest) tiene su WebSocket al backend. El backend:
1. Mantiene un Room en memoria (rooms_registry) con la lista de WSs activos
2. Cuando llega un audio chunk de cualquiera, lo MIXEA con los otros buffers
   pendientes y lo manda a Gemini (1 stream a Gemini por room).
3. Cuando Gemini responde audio, lo BROADCASTEA a todos los participantes.
4. Cuando un participante habla, ese audio se broadcastea a los otros para
   que se escuchen entre si (sin pasar por Gemini para esto - directo).

Mixer simple: suma PCM int16 y clampea. Asume sample rate 16kHz mono (lo que
manda el frontend ya). Mezcla en buffers de ~20ms (320 samples).
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

import websockets
from fastapi import WebSocket, WebSocketDisconnect

from core.config import settings
from services.voice_engines.gemini_live_engine import (
    LIVE_API_URL,
    LIVE_MODEL,
    _open_gemini_session,
)
from services.voice_engine import VoiceEngineContext

log = logging.getLogger(__name__)


@dataclass
class RoomParticipant:
    pid: str
    name: str
    is_host: bool
    ws: WebSocket


@dataclass
class Room:
    token: str
    ctx: VoiceEngineContext
    participants: dict[str, RoomParticipant] = field(default_factory=dict)
    google_ws: Optional[websockets.WebSocketClientProtocol] = None
    transcript: list[dict] = field(default_factory=list)
    started: bool = False
    closed: bool = False


# Registro global de rooms en memoria. Key = room_token
rooms_registry: dict[str, Room] = {}
rooms_lock = asyncio.Lock()


async def get_or_create_room(token: str, ctx: VoiceEngineContext) -> Room:
    async with rooms_lock:
        if token not in rooms_registry:
            rooms_registry[token] = Room(token=token, ctx=ctx)
        return rooms_registry[token]


async def remove_room_if_empty(token: str) -> None:
    async with rooms_lock:
        room = rooms_registry.get(token)
        if room and not room.participants:
            room.closed = True
            if room.google_ws:
                try:
                    await room.google_ws.close()
                except Exception:
                    pass
            rooms_registry.pop(token, None)


def _mix_pcm_b64(chunks_b64: list[str]) -> str:
    """Mezcla N chunks PCM int16 little-endian base64 en uno solo (suma clampeada)."""
    if len(chunks_b64) == 1:
        return chunks_b64[0]
    raw = [base64.b64decode(c) for c in chunks_b64]
    # Encontramos la longitud minima entre chunks (recortamos a eso)
    n = min(len(r) for r in raw)
    if n % 2 == 1:
        n -= 1
    if n <= 0:
        return chunks_b64[0]

    out = bytearray(n)
    # Suma manual byte a byte como int16 LE
    for i in range(0, n, 2):
        s = 0
        for r in raw:
            sample = int.from_bytes(r[i:i + 2], byteorder="little", signed=True)
            s += sample
        # Clamp a int16
        if s > 32767:
            s = 32767
        elif s < -32768:
            s = -32768
        out[i:i + 2] = s.to_bytes(2, byteorder="little", signed=True)
    return base64.b64encode(bytes(out)).decode("ascii")


async def _broadcast(room: Room, message: dict, *, exclude_pid: Optional[str] = None) -> None:
    """Manda message a todos los participants de la room (opcionalmente excluyendo uno)."""
    dead: list[str] = []
    for pid, p in list(room.participants.items()):
        if exclude_pid and pid == exclude_pid:
            continue
        try:
            await p.ws.send_json(message)
        except Exception:
            dead.append(pid)
    for pid in dead:
        room.participants.pop(pid, None)


async def _start_gemini_for_room(room: Room) -> None:
    """Abre la conexion Gemini para el room (una sola vez, lazy)."""
    if room.started:
        return
    room.started = True
    try:
        room.google_ws = await _open_gemini_session(room.ctx, transcript_so_far=[])
    except Exception as e:
        log.exception("No pude abrir Gemini para room %s: %s", room.token, e)
        room.started = False
        return

    # Lanzamos task que escucha respuestas de Gemini y las broadcastea
    asyncio.create_task(_gemini_to_room(room))


async def _gemini_to_room(room: Room) -> None:
    """Lee respuestas de Gemini y las distribuye a todos los participants."""
    ai_buf: list[str] = []
    user_buf: list[str] = []

    def _flush():
        if ai_buf:
            full = "".join(ai_buf).strip()
            if full:
                room.transcript.append({"who": "ai", "text": full})
            ai_buf.clear()
        if user_buf:
            full = "".join(user_buf).strip()
            if full:
                room.transcript.append({"who": "user", "text": full})
            user_buf.clear()

    try:
        async for raw in room.google_ws:  # type: ignore
            if room.closed:
                break
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
                    # Audio de Habi -> broadcast a todos
                    await _broadcast(room, {"type": "audio", "data": inline["data"]})
                text = part.get("text")
                if text:
                    ai_buf.append(text)
                    await _broadcast(room, {"type": "transcript_chunk", "who": "ai", "text": text})

            out_tr = sc.get("outputTranscription")
            if out_tr and out_tr.get("text"):
                ai_buf.append(out_tr["text"])
                await _broadcast(room, {"type": "transcript_chunk", "who": "ai", "text": out_tr["text"]})

            input_tr = sc.get("inputTranscription")
            if input_tr and input_tr.get("text"):
                user_buf.append(input_tr["text"])
                await _broadcast(room, {"type": "transcript_chunk", "who": "user", "text": input_tr["text"]})

            if sc.get("turnComplete"):
                _flush()
                await _broadcast(room, {"type": "turn_complete"})
    except websockets.ConnectionClosed:
        log.info("Gemini WS cerrado para room %s", room.token)
    except Exception as e:
        log.exception("_gemini_to_room error en %s: %s", room.token, e)
    finally:
        _flush()


# Buffer ring de audio por room: acumulamos chunks de los participantes durante
# ~50ms y los mezclamos antes de mandar a Gemini. Asi cuando 2 hablan a la vez
# se mezcla; cuando habla 1 solo no hay overhead.
class RoomAudioPump:
    """Acumula chunks por room y los flushea cada N ms."""
    _pumps: dict[str, "RoomAudioPump"] = {}
    FLUSH_INTERVAL_MS = 40  # ~40ms = balance entre latencia y calidad de mezcla

    @classmethod
    def get(cls, room: Room) -> "RoomAudioPump":
        if room.token not in cls._pumps:
            pump = cls(room)
            cls._pumps[room.token] = pump
            pump._task = asyncio.create_task(pump._run())
        return cls._pumps[room.token]

    @classmethod
    def remove(cls, token: str) -> None:
        pump = cls._pumps.pop(token, None)
        if pump and pump._task:
            pump._task.cancel()

    def __init__(self, room: Room) -> None:
        self.room = room
        self.buffer: dict[str, list[str]] = defaultdict(list)  # pid -> [b64 chunks]
        self.lock = asyncio.Lock()
        self._task: Optional[asyncio.Task] = None

    async def push(self, pid: str, audio_b64: str) -> None:
        async with self.lock:
            self.buffer[pid].append(audio_b64)

    async def _run(self) -> None:
        try:
            while not self.room.closed:
                await asyncio.sleep(self.FLUSH_INTERVAL_MS / 1000)
                async with self.lock:
                    if not self.buffer:
                        continue
                    snapshot = {pid: chunks[:] for pid, chunks in self.buffer.items() if chunks}
                    self.buffer.clear()
                if not snapshot:
                    continue
                # Broadcast voces de participantes ENTRE ellos (sin pasar por Gemini)
                # Cada participant recibe el audio de los OTROS, no el suyo
                for pid, chunks in snapshot.items():
                    for chunk in chunks:
                        await _broadcast(
                            self.room,
                            {"type": "participant_audio", "from_pid": pid, "data": chunk},
                            exclude_pid=pid,
                        )

                # Mezclamos TODO el audio de este tick para mandar a Gemini
                all_chunks: list[str] = []
                for chunks in snapshot.values():
                    all_chunks.extend(chunks)
                if all_chunks and self.room.google_ws and not self.room.closed:
                    # Concatenamos chunks de cada participant (mismo participant = mismo timestamp),
                    # luego sumamos los streams concatenados.
                    # Simplificacion: solo mezclamos el PRIMER chunk de cada participant en este tick
                    # y mandamos los siguientes secuencialmente. Para v1 suficiente.
                    try:
                        # tomar 1 chunk por participant si hay 2+ participants -> mezclar
                        if len(snapshot) > 1:
                            first_chunks = [chunks[0] for chunks in snapshot.values()]
                            mixed = _mix_pcm_b64(first_chunks)
                            await self.room.google_ws.send(json.dumps({
                                "realtimeInput": {
                                    "audio": {"mimeType": "audio/pcm;rate=16000", "data": mixed}
                                }
                            }))
                            # Resto de chunks (si quedan): los mandamos secuenciales sin mezclar
                            # (asume que el participant lider habla solo el resto del tick)
                            max_len = max(len(c) for c in snapshot.values())
                            for i in range(1, max_len):
                                round_chunks = [chunks[i] for chunks in snapshot.values() if i < len(chunks)]
                                if len(round_chunks) > 1:
                                    mixed = _mix_pcm_b64(round_chunks)
                                else:
                                    mixed = round_chunks[0]
                                await self.room.google_ws.send(json.dumps({
                                    "realtimeInput": {
                                        "audio": {"mimeType": "audio/pcm;rate=16000", "data": mixed}
                                    }
                                }))
                        else:
                            # Solo 1 participant hablando - mandamos directo sin mezclar
                            for chunk in all_chunks:
                                await self.room.google_ws.send(json.dumps({
                                    "realtimeInput": {
                                        "audio": {"mimeType": "audio/pcm;rate=16000", "data": chunk}
                                    }
                                }))
                    except websockets.ConnectionClosed:
                        log.warning("Gemini WS cerrado durante mix, room %s", self.room.token)
                        return
                    except Exception as e:
                        log.exception("Mixer error room %s: %s", self.room.token, e)
        except asyncio.CancelledError:
            pass


async def _notify_coach_guest_joined(room: Room, guest_name: str) -> None:
    """Avisa al coach IA que entró un nuevo participante a la charla.

    Inyecta un mensaje sistema-like como turno user sintético, asi el modelo
    sabe que ahora la conversacion es grupal y arranca a repartir preguntas
    entre los participantes nombrandolos. Sin esto, el coach sigue conversando
    como si fuera 1:1 con el host.
    """
    if not room.google_ws or room.closed:
        return
    host_name = next(
        (p.name for p in room.participants.values() if p.is_host),
        "el alumno",
    )
    msg = (
        f"[Sistema · MODO GRUPAL ACTIVADO] Acaba de entrar a la charla una "
        f"persona nueva llamada {guest_name}. Ahora son {host_name} y {guest_name} "
        f"hablando con vos. INSTRUCCIONES:\n"
        f"1. Saludá a {guest_name} en UNA frase corta por nombre y contale en "
        f"otra frase el tema que vienen charlando.\n"
        f"2. De ahora en adelante REPARTÍ las preguntas alternando entre "
        f"{host_name} y {guest_name}, NOMBRANDOLOS explícitamente cada vez "
        f"('Bueno {guest_name}, decime...', 'Ahora vos {host_name}, ¿qué "
        f"opinás?').\n"
        f"3. Cuando uno responda, dirigite al OTRO para la próxima pregunta. "
        f"Nunca hagas dos preguntas seguidas a la misma persona.\n"
        f"4. Hacé la primera pregunta a {guest_name} para que arranque "
        f"presentándose o contando algo sobre el tema."
    )
    try:
        await room.google_ws.send(json.dumps({
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": msg}]}],
                "turnComplete": True,
            }
        }))
        log.info("Room %s: notifique al coach que entro %s", room.token, guest_name)
    except Exception as e:
        log.warning("No pude notificar al coach del guest join: %s", e)


async def handle_room_ws(ws: WebSocket, room: Room, participant: RoomParticipant) -> None:
    """Loop principal del WS de un participant."""
    # Agregar al room
    room.participants[participant.pid] = participant

    # Notificar a los demas que se unio alguien
    await _broadcast(room, {
        "type": "participant_joined",
        "pid": participant.pid,
        "name": participant.name,
        "is_host": participant.is_host,
        "participants": [
            {"pid": p.pid, "name": p.name, "is_host": p.is_host}
            for p in room.participants.values()
        ],
    }, exclude_pid=participant.pid)

    # Mandar al recien llegado la lista completa
    await ws.send_json({
        "type": "room_joined",
        "your_pid": participant.pid,
        "participants": [
            {"pid": p.pid, "name": p.name, "is_host": p.is_host}
            for p in room.participants.values()
        ],
    })

    # Si es el host y todavia no arrancamos Gemini, arrancar
    if participant.is_host and not room.started:
        await _start_gemini_for_room(room)

    # Si NO es el host (guest se sumo), avisar al coach IA para que entre
    # en modo grupal y arranque a repartir preguntas. Solo si Gemini ya
    # esta corriendo (el host ya esta dentro).
    if not participant.is_host and room.started:
        # Pequeno delay para que el WS de Gemini este listo si recien arranco
        await asyncio.sleep(0.3)
        await _notify_coach_guest_joined(room, participant.name)

    pump = RoomAudioPump.get(room)

    try:
        while not room.closed:
            msg = await ws.receive_json()
            mtype = msg.get("type")
            if mtype == "audio":
                b64 = msg.get("data", "")
                if b64:
                    await pump.push(participant.pid, b64)
            elif mtype == "ping":
                try:
                    await ws.send_json({"type": "pong"})
                except Exception:
                    pass
            elif mtype == "end":
                # Si el HOST termina, cerramos la room entera
                if participant.is_host:
                    room.closed = True
                    if room.google_ws:
                        try:
                            await room.google_ws.close()
                        except Exception:
                            pass
                    await _broadcast(room, {"type": "room_closed", "reason": "host_left"})
                break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        log.exception("handle_room_ws error %s/%s: %s", room.token, participant.pid, e)
    finally:
        room.participants.pop(participant.pid, None)
        await _broadcast(room, {
            "type": "participant_left",
            "pid": participant.pid,
            "name": participant.name,
        })
        # Si quedaron 0 participants, cerrar room
        if not room.participants:
            room.closed = True
            if room.google_ws:
                try:
                    await room.google_ws.close()
                except Exception:
                    pass
            RoomAudioPump.remove(room.token)
            rooms_registry.pop(room.token, None)

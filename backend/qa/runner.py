"""Runner: conecta a /api/voice/ws como si fueras un alumno real, pero
mandando texto en vez de audio. Captura todo el transcript del coach y
lo devuelve para que el scorer lo evalue.

Flujo:
1. POST /api/auth/login con credenciales de un user de QA (sin tocar prod users)
2. POST /api/sessions/start con topic_id o free_topic
3. WebSocket /api/voice/ws?session_id=X&token=Y
4. Esperamos el primer turno del coach via transcript_chunk eventos
5. Mandamos { type: "say", text: persona.strategy(transcript, turn) }
6. Esperamos el siguiente turn_complete y repetimos
7. Mandamos { type: "end" } y cerramos

Devolvemos un RunResult con todo el transcript + metricas (latencias,
errores) para que el scorer lo evalue.
"""
from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import Optional

import httpx
import websockets

from qa.personas import Persona


@dataclass
class TurnEvent:
    """Un turno conversacional con metricas."""
    n: int
    speaker: str  # 'coach' | 'student'
    text: str
    ts_received: float = 0.0
    latency_since_prev_ms: int = 0


@dataclass
class RunResult:
    persona_name: str
    topic_label: str
    session_id: Optional[int]
    started_at: float
    ended_at: float
    turns: list[TurnEvent] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    coach_first_audio_latency_ms: Optional[int] = None
    total_coach_text_chars: int = 0
    total_student_chars: int = 0

    @property
    def duration_seconds(self) -> float:
        return self.ended_at - self.started_at

    @property
    def n_coach_turns(self) -> int:
        return sum(1 for t in self.turns if t.speaker == "coach")

    @property
    def n_student_turns(self) -> int:
        return sum(1 for t in self.turns if t.speaker == "student")

    def coach_text_full(self) -> str:
        return "\n".join(t.text for t in self.turns if t.speaker == "coach")

    def conversation_str(self) -> str:
        lines = []
        for t in self.turns:
            who = "TUTOR" if t.speaker == "coach" else "ALUMNO"
            lines.append(f"[{who}] {t.text}")
        return "\n".join(lines)


async def login(base_url: str, email: str, password: str) -> str:
    """Login → devuelve JWT."""
    async with httpx.AsyncClient(timeout=20.0) as cli:
        r = await cli.post(
            f"{base_url}/api/auth/login",
            json={"email": email, "password": password},
        )
        r.raise_for_status()
        return r.json()["access_token"]


async def start_session(
    base_url: str, token: str,
    topic_id: Optional[int] = None,
    free_topic: Optional[str] = None,
    template_id: Optional[int] = None,
) -> int:
    """POST /sessions/start → devuelve session_id."""
    async with httpx.AsyncClient(timeout=30.0) as cli:
        r = await cli.post(
            f"{base_url}/api/sessions/start",
            headers={"Authorization": f"Bearer {token}"},
            json={"topic_id": topic_id, "free_topic": free_topic, "template_id": template_id},
        )
        r.raise_for_status()
        return r.json()["session_id"]


async def end_session(base_url: str, token: str, session_id: int, transcript: list[dict]) -> None:
    async with httpx.AsyncClient(timeout=30.0) as cli:
        try:
            await cli.post(
                f"{base_url}/api/sessions/{session_id}/end",
                headers={"Authorization": f"Bearer {token}"},
                json={"transcript": transcript},
            )
        except Exception:
            pass  # no critico si falla


def _ws_url(base_url: str, session_id: int, token: str) -> str:
    """Convierte http(s)://host → ws(s)://host/api/voice/ws?..."""
    if base_url.startswith("https://"):
        ws_base = "wss://" + base_url[len("https://"):]
    elif base_url.startswith("http://"):
        ws_base = "ws://" + base_url[len("http://"):]
    else:
        ws_base = base_url
    return f"{ws_base}/api/voice/ws?session_id={session_id}&token={token}"


async def run_conversation(
    *,
    base_url: str,
    token: str,
    session_id: int,
    persona: Persona,
    topic_label: str,
    max_wait_for_coach_seconds: float = 45.0,
    coach_silence_threshold_seconds: float = 2.5,
    hard_scenario_timeout_seconds: float = 240.0,
) -> RunResult:
    """Conecta al WS y conduce la conversacion.

    coach_silence_threshold: cuanto esperar SIN recibir nada nuevo del coach
    para considerar que termino su turno y mandar la siguiente respuesta del
    alumno. (turn_complete event tambien dispara el envio.)
    """
    started = time.time()
    result = RunResult(
        persona_name=persona.name,
        topic_label=topic_label,
        session_id=session_id,
        started_at=started,
        ended_at=started,
    )

    url = _ws_url(base_url, session_id, token)
    coach_buf: list[str] = []
    last_coach_text_ts: Optional[float] = None
    coach_first_audio_ts: Optional[float] = None
    student_turn_n = 0
    prev_student_ts: float = started

    async with websockets.connect(url, max_size=2**24) as ws:
        # Loop principal — consumimos eventos y mandamos respuestas del alumno
        stop = False
        last_event_ts = time.time()

        async def reader():
            """Lee eventos del WS y los acumula en coach_buf + tracks."""
            nonlocal last_coach_text_ts, coach_first_audio_ts, last_event_ts, stop
            try:
                async for raw in ws:
                    last_event_ts = time.time()
                    try:
                        msg = json.loads(raw)
                    except Exception:
                        continue
                    if msg.get("type") == "audio":
                        if coach_first_audio_ts is None:
                            coach_first_audio_ts = time.time()
                            result.coach_first_audio_latency_ms = int((coach_first_audio_ts - started) * 1000)
                    elif msg.get("type") == "transcript_chunk" and msg.get("who") == "ai":
                        text = msg.get("text", "")
                        if text:
                            coach_buf.append(text)
                            last_coach_text_ts = time.time()
                    elif msg.get("type") == "transcript_chunk" and msg.get("who") == "user":
                        # En modo "say" no deberiamos recibir transcripcion del user
                        # (porque mandamos texto, no audio). La capturamos por las dudas.
                        pass
                    elif msg.get("type") == "turn_complete":
                        # Coach termino su turno — flush buffer
                        full = "".join(coach_buf).strip()
                        if full:
                            now = time.time()
                            result.turns.append(TurnEvent(
                                n=len(result.turns) + 1,
                                speaker="coach",
                                text=full,
                                ts_received=now,
                                latency_since_prev_ms=int((now - prev_student_ts) * 1000),
                            ))
                            result.total_coach_text_chars += len(full)
                            coach_buf.clear()
                    elif msg.get("type") == "error":
                        result.errors.append(f"engine_error: {msg.get('error', '?')}")
                    elif msg.get("type") == "session_ending_soon":
                        stop = True
            except websockets.ConnectionClosed as e:
                result.errors.append(f"ws_closed: {e.code} {e.reason}")
            except Exception as e:
                result.errors.append(f"reader_error: {type(e).__name__}: {e}")

        reader_task = asyncio.create_task(reader())

        try:
            # Loop del alumno — esperamos al coach, despues respondemos
            scenario_start = time.time()
            while not stop and student_turn_n < persona.max_turns:
                # Hard timeout para que un scenario no se cuelgue forever
                if time.time() - scenario_start > hard_scenario_timeout_seconds:
                    result.errors.append(f"hard_scenario_timeout: {int(time.time() - scenario_start)}s")
                    break
                # 1) Esperamos a que el coach hable Y se quede en silencio
                wait_start = time.time()
                while True:
                    if reader_task.done():
                        break
                    elapsed_since_event = time.time() - last_event_ts
                    elapsed_total = time.time() - wait_start

                    # Si nunca hubo audio del coach + pasamos el max_wait → abortamos
                    if coach_first_audio_ts is None and elapsed_total > max_wait_for_coach_seconds:
                        result.errors.append(
                            f"coach_never_spoke: {int(elapsed_total)}s sin audio"
                        )
                        stop = True
                        break

                    # Si el coach hablo y ya se quedo en silencio N segundos → su turno termino
                    if last_coach_text_ts and (time.time() - last_coach_text_ts) > coach_silence_threshold_seconds:
                        # Flush manual si no llego turn_complete
                        if coach_buf:
                            full = "".join(coach_buf).strip()
                            if full:
                                now = time.time()
                                result.turns.append(TurnEvent(
                                    n=len(result.turns) + 1,
                                    speaker="coach",
                                    text=full,
                                    ts_received=now,
                                    latency_since_prev_ms=int((now - prev_student_ts) * 1000),
                                ))
                                result.total_coach_text_chars += len(full)
                                coach_buf.clear()
                        break

                    await asyncio.sleep(0.2)

                if stop or reader_task.done():
                    break

                # 2) El alumno responde
                transcript_so_far = [{"who": t.speaker.replace("coach", "ai"), "text": t.text} for t in result.turns]
                student_text = persona.strategy(transcript_so_far, student_turn_n)
                if not student_text:
                    break

                student_ts = time.time()
                result.turns.append(TurnEvent(
                    n=len(result.turns) + 1,
                    speaker="student",
                    text=student_text,
                    ts_received=student_ts,
                ))
                result.total_student_chars += len(student_text)
                prev_student_ts = student_ts
                last_coach_text_ts = None

                try:
                    await ws.send(json.dumps({"type": "say", "text": student_text}))
                except Exception as e:
                    result.errors.append(f"send_say_error: {e}")
                    break

                student_turn_n += 1

            # Cerrar limpio
            try:
                await ws.send(json.dumps({"type": "end"}))
            except Exception:
                pass

            # Damos 2s para que llegue el ultimo turno del coach
            await asyncio.sleep(2.0)
            reader_task.cancel()
            try: await reader_task
            except (asyncio.CancelledError, Exception): pass

        finally:
            result.ended_at = time.time()

    return result

"""Endpoints para correr la QA suite desde un panel web admin.

Flujo:
1. Frontend: POST /api/qa/run { suite: "smoke" } → devuelve { run_id }
2. Frontend: GET /api/qa/run/{run_id}/stream (SSE) → recibe eventos en vivo
3. Cada scenario emite: scenario.start, scenario.turn, scenario.end con score
4. Al terminar todos: run.complete con resumen

Almacenamos eventos en memoria por run_id (cap 200 runs). NO persistimos a BD
porque son tests sinteticos — el reporte se descarga como JSON desde el UI.

Admin-only.
"""
from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.security import require_role
from models.user import User
from qa.personas import PERSONAS, get_persona
from qa.scenarios import get_suite, Scenario
from qa.runner import login as qa_login, start_session, end_session, run_conversation
from qa.scorer import score_run


router = APIRouter()


class RunRequest(BaseModel):
    suite: Optional[str] = None  # "smoke" | "quality" | "stress:<topic_id>"
    persona: Optional[str] = None  # solo si NO se manda suite
    topic_id: Optional[int] = None
    free_topic: Optional[str] = None
    user_email: Optional[str] = None  # default: env QA_USER_EMAIL
    user_password: Optional[str] = None


class _Run:
    """Estado en memoria de una corrida."""
    def __init__(self, run_id: str, scenarios: list[Scenario]):
        self.run_id = run_id
        self.scenarios = scenarios
        self.started_at = time.time()
        self.events: list[dict] = []
        self.queue: asyncio.Queue = asyncio.Queue()
        self.done = False
        self.task: Optional[asyncio.Task] = None

    def emit(self, event: str, **data: Any) -> None:
        record = {
            "event": event,
            "ts": time.time(),
            **data,
        }
        self.events.append(record)
        try:
            self.queue.put_nowait(record)
        except asyncio.QueueFull:
            pass


_RUNS: dict[str, _Run] = {}
_RUNS_MAX = 50  # cap simple


def _gc_runs() -> None:
    if len(_RUNS) <= _RUNS_MAX:
        return
    oldest = sorted(_RUNS.items(), key=lambda kv: kv[1].started_at)[:len(_RUNS) - _RUNS_MAX]
    for k, _ in oldest:
        _RUNS.pop(k, None)


async def _execute_scenario(run: _Run, sc: Scenario, base_url: str, email: str, password: str) -> dict:
    """Corre 1 escenario y emite eventos progresivos."""
    persona = get_persona(sc.persona)
    topic_label = sc.free_topic or (f"topic_{sc.topic_id}" if sc.topic_id else "free")

    run.emit("scenario.start", scenario=sc.name, persona=persona.name, topic=topic_label,
             description=sc.description)

    try:
        token = await qa_login(base_url, email, password)
    except Exception as e:
        run.emit("scenario.error", scenario=sc.name, stage="login", error=str(e))
        return {"scenario": sc.name, "error": f"login: {e}"}

    try:
        session_id = await start_session(
            base_url, token,
            topic_id=sc.topic_id, free_topic=sc.free_topic,
        )
    except Exception as e:
        run.emit("scenario.error", scenario=sc.name, stage="session_start", error=str(e))
        return {"scenario": sc.name, "error": f"session_start: {e}"}

    run.emit("scenario.session_started", scenario=sc.name, session_id=session_id)

    result = await run_conversation(
        base_url=base_url, token=token, session_id=session_id,
        persona=persona, topic_label=topic_label,
    )

    # Emitir cada turno como evento
    for t in result.turns:
        run.emit("scenario.turn", scenario=sc.name, n=t.n,
                 speaker=t.speaker, text=t.text,
                 latency_since_prev_ms=t.latency_since_prev_ms)

    transcript = [{"who": t.speaker.replace("coach", "ai"), "text": t.text} for t in result.turns]
    await end_session(base_url, token, session_id, transcript)

    if result.errors:
        for err in result.errors:
            run.emit("scenario.runtime_error", scenario=sc.name, error=err)

    # Scoring
    run.emit("scenario.scoring", scenario=sc.name)
    score = await score_run(
        result,
        target_language=persona.target_language,
        base_language=persona.base_language,
        cefr_level=persona.cefr_level,
    )

    summary = {
        "scenario": sc.name,
        "persona": persona.name,
        "topic": topic_label,
        "session_id": session_id,
        "duration_seconds": result.duration_seconds,
        "first_coach_audio_ms": result.coach_first_audio_latency_ms,
        "n_coach_turns": result.n_coach_turns,
        "n_student_turns": result.n_student_turns,
        "errors": result.errors,
        "score_overall": score.overall,
        "score_rubric": score.rubric,
        "score_issues": score.issues,
        "score_strengths": score.strengths,
        "conversation": result.conversation_str(),
    }
    run.emit("scenario.end", **summary)
    return summary


async def _run_orchestrator(run: _Run, base_url: str, email: str, password: str) -> None:
    """Driver que corre cada scenario secuencialmente."""
    try:
        run.emit("run.start", n_scenarios=len(run.scenarios),
                 scenarios=[s.name for s in run.scenarios])
        results: list[dict] = []
        for sc in run.scenarios:
            try:
                r = await _execute_scenario(run, sc, base_url, email, password)
            except Exception as e:
                r = {"scenario": sc.name, "error": f"uncaught: {e}"}
                run.emit("scenario.error", scenario=sc.name, stage="uncaught", error=str(e))
            results.append(r)

        passed = sum(1 for r in results if isinstance(r.get("score_overall"), (int, float)) and r["score_overall"] >= 6.5)
        failed = len(results) - passed
        avg = sum(r.get("score_overall", 0) or 0 for r in results) / max(1, len(results))
        run.emit("run.complete",
                 total_seconds=time.time() - run.started_at,
                 n_passed=passed, n_failed=failed,
                 avg_score=round(avg, 2),
                 results=results)
    finally:
        run.done = True
        # Sentinel para que el SSE termine
        await run.queue.put({"event": "_end_"})


@router.post("/run")
async def start_qa_run(
    payload: RunRequest,
    _: User = Depends(require_role("admin")),
):
    """Dispara una corrida. Devuelve run_id para escuchar via SSE."""
    base_url = os.getenv("QA_BASE", "https://hablah-api-685973917497.southamerica-east1.run.app")
    email = payload.user_email or os.getenv("QA_USER_EMAIL")
    password = payload.user_password or os.getenv("QA_USER_PASSWORD")
    if not email or not password:
        raise HTTPException(400, "QA_USER_EMAIL / QA_USER_PASSWORD requeridos (env o body)")

    # Build scenario list
    if payload.suite:
        try:
            scenarios = get_suite(payload.suite)
        except ValueError as e:
            raise HTTPException(400, str(e))
    elif payload.persona:
        scenarios = [Scenario(
            name=f"single_{payload.persona}",
            persona=payload.persona,
            topic_id=payload.topic_id,
            free_topic=payload.free_topic,
            description="Single run",
        )]
    else:
        raise HTTPException(400, "Debes pasar suite o persona")

    run_id = uuid.uuid4().hex[:12]
    run = _Run(run_id, scenarios)
    _RUNS[run_id] = run
    _gc_runs()

    # Disparamos en background
    run.task = asyncio.create_task(_run_orchestrator(run, base_url, email, password))

    return {"run_id": run_id, "n_scenarios": len(scenarios),
            "scenarios": [{"name": s.name, "persona": s.persona,
                          "topic": s.free_topic or f"topic_{s.topic_id}",
                          "description": s.description} for s in scenarios]}


@router.get("/run/{run_id}/stream")
async def stream_run(run_id: str, request: Request, _: User = Depends(require_role("admin"))):
    """SSE: emite los eventos de una corrida en tiempo real."""
    run = _RUNS.get(run_id)
    if not run:
        raise HTTPException(404, "run_id no existe")

    async def gen():
        # Primero emitir eventos ya acumulados (catch-up si te conectaste tarde)
        for e in run.events:
            yield f"data: {json.dumps(e, default=str, ensure_ascii=False)}\n\n"
        # Luego stream en vivo
        while True:
            if await request.is_disconnected():
                break
            try:
                ev = await asyncio.wait_for(run.queue.get(), timeout=30)
            except asyncio.TimeoutError:
                # heartbeat para mantener viva la conexion
                yield ": keepalive\n\n"
                continue
            if ev.get("event") == "_end_":
                yield "event: done\ndata: {}\n\n"
                break
            yield f"data: {json.dumps(ev, default=str, ensure_ascii=False)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",  # nginx-friendly
    })


@router.get("/runs")
async def list_runs(_: User = Depends(require_role("admin"))):
    """Lista las corridas en memoria — para que el panel muestre las recientes
    sin tener que reapretar."""
    runs = []
    for run_id, r in sorted(_RUNS.items(), key=lambda kv: kv[1].started_at, reverse=True):
        runs.append({
            "run_id": run_id,
            "started_at": r.started_at,
            "done": r.done,
            "n_scenarios": len(r.scenarios),
            "scenarios": [{"name": s.name, "persona": s.persona,
                          "topic": s.free_topic or f"topic_{s.topic_id}",
                          "description": s.description} for s in r.scenarios],
        })
    return {"runs": runs}


@router.get("/personas")
async def list_personas(_: User = Depends(require_role("admin"))):
    return [{"name": p.name, "description": p.description,
             "cefr_level": p.cefr_level, "max_turns": p.max_turns}
            for p in PERSONAS.values()]


@router.get("/suites")
async def list_suites(_: User = Depends(require_role("admin"))):
    return {
        "smoke": "3 escenarios rapidos (~1 min)",
        "quality": "8 escenarios de calidad (~3 min, agarra bugs de prompt)",
        "stress:<topic_id>": "Todas las personas contra un topic puntual",
    }

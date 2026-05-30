"""Endpoint para que el ErrorBoundary del frontend reporte crashes en prod.

Cuando algo crashea en la SPA, el ErrorBoundary postea acá con stack + URL +
contexto. Lo logueamos para que veamos en `heroku logs` cuando algo se rompe
en producción sin que tengamos que esperar a que un usuario nos avise.

Sin BD por ahora — solo logging. Si queremos agregarlo, sumamos modelo y tabla
mas adelante.
"""
import logging
from typing import Any, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

from core.trace import trace

log = logging.getLogger(__name__)

router = APIRouter()


class FrontendErrorPayload(BaseModel):
    message: str
    stack: Optional[str] = ""
    component_stack: Optional[str] = ""
    url: Optional[str] = ""
    user_agent: Optional[str] = ""
    ts: Optional[str] = ""


@router.post("/frontend")
async def report_frontend_error(payload: FrontendErrorPayload, request: Request) -> dict:
    """Recibe un crash del frontend y lo loguea. Sin auth (los crashes pueden
    venir de usuarios anónimos en la landing)."""
    client_ip = request.client.host if request.client else "?"
    log.error(
        "[FRONTEND_CRASH] ts=%s ip=%s url=%s\n"
        "  message: %s\n"
        "  ua: %s\n"
        "  stack: %s\n"
        "  component_stack: %s",
        payload.ts, client_ip, payload.url,
        payload.message, payload.user_agent,
        (payload.stack or "")[:2000],
        (payload.component_stack or "")[:1500],
    )
    return {"ok": True}


class FrontendTraceEvent(BaseModel):
    """Evento del frontend que se loguea con el mismo formato structured que
    el backend, asi /api/diag/session-trace los une cronologicamente."""
    event: str
    session_id: Optional[int] = None
    data: Optional[dict[str, Any]] = None


@router.post("/trace")
async def report_frontend_trace(payload: FrontendTraceEvent) -> dict:
    """Recibe trace events del frontend (WS lifecycle, audio playback,
    transcripts) y los reemite via structured logging para que aparezcan en
    Cloud Logging junto con los del backend, correlacionados por session_id."""
    fields = {"source": "frontend"}
    if payload.session_id is not None:
        fields["session_id"] = payload.session_id
    if payload.data:
        for k, v in payload.data.items():
            if k not in fields:
                fields[k] = v
    trace.event(payload.event, **fields)
    return {"ok": True}

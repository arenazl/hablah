"""Endpoint para que el ErrorBoundary del frontend reporte crashes en prod.

Cuando algo crashea en la SPA, el ErrorBoundary postea acá con stack + URL +
contexto. Lo logueamos para que veamos en `heroku logs` cuando algo se rompe
en producción sin que tengamos que esperar a que un usuario nos avise.

Sin BD por ahora — solo logging. Si queremos agregarlo, sumamos modelo y tabla
mas adelante.
"""
import logging
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional

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

"""Endpoint /api/diag/* para diagnostico.

Consume Cloud Logging via la API REST y devuelve una vista cronologica
limpia de TODOS los eventos estructurados de una sesion. Asi vos podes
hacer un GET y ver exactamente que paso, sin tener que entrar a la consola
de GCP a armar queries.
"""
from __future__ import annotations

import os
import logging
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.user import User

log = logging.getLogger(__name__)

router = APIRouter()


GCP_PROJECT = "hablah-prod"
LOGGING_URL = "https://logging.googleapis.com/v2/entries:list"


async def _get_gcp_access_token() -> Optional[str]:
    """Obtiene un access token desde el metadata server de Cloud Run.

    Cloud Run inyecta credenciales del service account compute. Las usamos
    para llamar a la API de Cloud Logging. Devuelve None si no estamos
    en GCP (ej. corriendo local).
    """
    metadata_url = (
        "http://metadata.google.internal/computeMetadata/v1/"
        "instance/service-accounts/default/token"
    )
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(metadata_url, headers={"Metadata-Flavor": "Google"})
            if r.status_code != 200:
                return None
            return r.json().get("access_token")
    except Exception:
        return None


@router.get("/session-trace/{session_id}")
async def get_session_trace(
    session_id: int,
    minutes: int = Query(30, description="Ventana de tiempo hacia atras a inspeccionar"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Devuelve todos los eventos structured-log para una sesion.

    Cronologico, con campos clave normalizados. Solo admin.
    """
    token = await _get_gcp_access_token()
    if not token:
        raise HTTPException(503, "GCP metadata no disponible (corriendo fuera de Cloud Run?)")

    # Cloud Logging API expects ISO timestamp range
    from datetime import datetime, timezone, timedelta
    end = datetime.now(timezone.utc)
    start = end - timedelta(minutes=minutes)

    filter_str = (
        f'resource.type="cloud_run_revision" '
        f'AND resource.labels.service_name="hablah-api" '
        f'AND jsonPayload.session_id={session_id} '
        f'AND timestamp>="{start.isoformat()}" '
    )

    body = {
        "resourceNames": [f"projects/{GCP_PROJECT}"],
        "filter": filter_str,
        "orderBy": "timestamp asc",
        "pageSize": 500,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                LOGGING_URL,
                headers={"Authorization": f"Bearer {token}"},
                json=body,
            )
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        raise HTTPException(500, f"Error consultando Cloud Logging: {e}")

    entries = data.get("entries", [])
    timeline = []
    for e in entries:
        payload = e.get("jsonPayload") or {}
        timeline.append({
            "ts": e.get("timestamp"),
            "severity": e.get("severity", "INFO"),
            "event": payload.get("event") or payload.get("message"),
            "data": {k: v for k, v in payload.items()
                     if k not in ("event", "message", "severity", "timestamp_iso", "ts_unix")},
        })

    return {
        "session_id": session_id,
        "window_minutes": minutes,
        "n_events": len(timeline),
        "timeline": timeline,
    }


@router.get("/recent-sessions")
async def recent_sessions(
    minutes: int = Query(60),
    only_failed: bool = Query(False, description="Solo sesiones que cerraron sin audio del coach"),
    _: User = Depends(require_role("admin")),
):
    """Lista resumenes de session.engine.end events recientes.

    Usalo para ver de un vistazo si las ultimas N sesiones tuvieron audio
    del coach, transcript del user, errores, etc.
    """
    token = await _get_gcp_access_token()
    if not token:
        raise HTTPException(503, "GCP metadata no disponible")

    from datetime import datetime, timezone, timedelta
    end = datetime.now(timezone.utc)
    start = end - timedelta(minutes=minutes)

    filter_str = (
        f'resource.type="cloud_run_revision" '
        f'AND resource.labels.service_name="hablah-api" '
        f'AND jsonPayload.event="session.engine.end" '
        f'AND timestamp>="{start.isoformat()}" '
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                LOGGING_URL,
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "resourceNames": [f"projects/{GCP_PROJECT}"],
                    "filter": filter_str,
                    "orderBy": "timestamp desc",
                    "pageSize": 50,
                },
            )
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        raise HTTPException(500, f"Error consultando Cloud Logging: {e}")

    sessions = []
    for e in data.get("entries", []):
        p = e.get("jsonPayload") or {}
        sid = p.get("session_id")
        coach_spoke = p.get("coach_spoke", False)
        user_transcribed = p.get("user_was_transcribed", False)
        if only_failed and coach_spoke:
            continue
        sessions.append({
            "ts": e.get("timestamp"),
            "session_id": sid,
            "coach_spoke": coach_spoke,
            "user_transcribed": user_transcribed,
            "turn_completes": p.get("turn_completes", 0),
            "user_audio_chunks": p.get("user_audio_chunks", 0),
            "ai_audio_chunks": p.get("ai_audio_chunks", 0),
            "trace_url": f"/api/diag/session-trace/{sid}?minutes={minutes}",
        })
    return {"n": len(sessions), "sessions": sessions}

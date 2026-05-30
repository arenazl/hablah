"""Logging estructurado JSON para Cloud Logging.

Cada evento se emite como una linea JSON a stdout (Cloud Run los captura como
structured logs y los podes filtrar/agregar facilmente). Todos los eventos de
una sesion comparten el mismo `session_id` → query rapida:

    resource.type="cloud_run_revision"
    AND jsonPayload.session_id="240"

Severity sigue la convencion de Cloud Logging (DEBUG/INFO/WARNING/ERROR).

Uso:

    from core.trace import trace

    trace.event("gemini.setup.start", session_id=42, model="...", is_kid=False)
    trace.event("gemini.setup.complete", session_id=42, latency_ms=350)
    trace.error("gemini.audio.send_failed", session_id=42, error=str(e))

Convencion de nombres de evento (puntuados, lowercase):
- <subsystem>.<noun>.<verb>   ej "gemini.audio.received", "ws.client.closed"
- Subsystems: gemini, ws_client, ws_room, grammar, topic_brief, session,
  feature_unlock, audio_pipeline

Campos comunes auto-inyectados: timestamp_iso, event, severity, session_id
(si pasaste uno). El resto lo agregas como kwargs y van como propiedades.
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from typing import Any


_SEVERITY_TO_LEVEL = {
    "DEBUG": "DEBUG", "INFO": "INFO", "WARNING": "WARNING",
    "ERROR": "ERROR", "CRITICAL": "CRITICAL",
}


def _emit(event: str, severity: str, **fields: Any) -> None:
    """Emite una linea JSON a stdout. Cloud Run la parsea como structured log."""
    record: dict[str, Any] = {
        "severity": _SEVERITY_TO_LEVEL.get(severity, "INFO"),
        # Cloud Logging usa el campo "message" como el texto principal mostrado
        # en la UI; ponemos el event_name ahi para que sea facil identificarlo.
        "message": event,
        "event": event,
        "timestamp_iso": datetime.now(timezone.utc).isoformat(),
        "ts_unix": time.time(),
    }
    # Merge fields del caller. Si pasaron una excepcion, la serializamos.
    for k, v in fields.items():
        if isinstance(v, Exception):
            record[k] = f"{type(v).__name__}: {v}"
        elif v is not None:
            record[k] = v
    try:
        sys.stdout.write(json.dumps(record, default=str, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    except Exception:
        # En el peor caso, fallback a logging estandar
        import logging
        logging.getLogger("trace").info("%s %s", event, record)


class Trace:
    """Helpers de un nivel para llamar mas conciso desde el codigo."""

    @staticmethod
    def event(event: str, **fields: Any) -> None:
        _emit(event, "INFO", **fields)

    @staticmethod
    def debug(event: str, **fields: Any) -> None:
        _emit(event, "DEBUG", **fields)

    @staticmethod
    def warn(event: str, **fields: Any) -> None:
        _emit(event, "WARNING", **fields)

    @staticmethod
    def error(event: str, **fields: Any) -> None:
        _emit(event, "ERROR", **fields)


trace = Trace()


def trace_duration_ms(t0: float) -> int:
    """Helper: ms transcurridos desde t0 (time.time() snapshot)."""
    return int((time.time() - t0) * 1000)

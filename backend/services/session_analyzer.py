"""Análisis post-sesión: toma la transcripción + audio (si hay) → Gemini Pro
para sacar reporte sincerista (1 elogio + ≤3 puntos a pulir) y errores recurrentes
que alimentan el modo insistente.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

import httpx

from core.config import settings
from core.database import AsyncSessionLocal
from sqlalchemy import select
from models.template import Session as SessionModel, Topic, ErrorLog
from models.user import User

log = logging.getLogger(__name__)


ANALYZER_PROMPT = """Sos un evaluador pedagógico para Habláh (plataforma de aprendizaje de idiomas).
Recibí una transcripción de una conversación entre un tutor IA y un alumno.
Devolveme un JSON estricto con esta estructura exacta:

{
  "score": 0-100,
  "fluency_delta_pct": -20..+20,
  "praise": "1 oración corta, positiva, en español rioplatense",
  "feedback": [
    {
      "type": "grammar" | "pronunciation" | "vocabulary",
      "error_key": "snake_case_short_id",
      "label": "Nombre descriptivo en español (max 60 chars)",
      "snippet_wrong": "frase exacta del alumno (en idioma objetivo)",
      "snippet_correct": "versión natural correcta (en idioma objetivo)"
    }
  ],
  "metrics": {
    "words_spoken": int,
    "wpm": int,
    "keywords_hit": int,
    "keywords_total": int
  }
}

Máximo 3 items en feedback. Solo errores REPETIDOS o sustanciales — ignorá típos minoritarios.
Si la transcripción es muy corta o no hay errores, feedback puede ser [].
"""


async def _gemini_complete(prompt: str, payload_text: str) -> dict:
    """Llama a Gemini 2.5 Flash con JSON output forzado."""
    key = settings.GEMINI_API_KEY
    model = settings.GEMINI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    body = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt + "\n\n--- TRANSCRIPCIÓN ---\n" + payload_text}]}
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1500,
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=45) as cli:
        r = await cli.post(url, json=body)
        r.raise_for_status()
        data = r.json()
    text = ""
    for c in data.get("candidates", []):
        for p in (c.get("content") or {}).get("parts", []):
            text += p.get("text", "")
    return json.loads(text)


async def analyze_session(session_id: int) -> Optional[dict]:
    async with AsyncSessionLocal() as db:
        s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
        if not s:
            return None
        if not s.transcript:
            log.info("session %s sin transcripción, skip", session_id)
            return None

        # Render plano de la transcripción
        lines = []
        for line in s.transcript:
            who = line.get("who", "?").upper()
            text = line.get("text", "")
            lines.append(f"[{who}] {text}")
        transcript_text = "\n".join(lines)

        try:
            result = await _gemini_complete(ANALYZER_PROMPT, transcript_text)
        except Exception as e:
            log.error("Gemini analyzer falló session %s: %s", session_id, e)
            return None

        # Persistir reporte + métricas + score
        s.report = result
        s.metrics = result.get("metrics", {})
        s.score = result.get("score")
        s.status = "analyzed"

        # Guardar errores recurrentes para modo insistente
        for fb in result.get("feedback") or []:
            err = ErrorLog(
                user_id=s.user_id,
                session_id=s.id,
                kind=fb.get("type", "grammar"),
                error_key=fb.get("error_key", "unknown"),
                label=fb.get("label", ""),
                snippet_wrong=fb.get("snippet_wrong"),
                snippet_correct=fb.get("snippet_correct"),
            )
            db.add(err)

        # Actualizar streak del user
        user = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
        if user:
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)
            if user.last_session_at:
                last = user.last_session_at
                if last.tzinfo is None:
                    last = last.replace(tzinfo=timezone.utc)
                hours = (now - last).total_seconds() / 3600
                if hours < 36:
                    user.streak_days = (user.streak_days or 0) + 1
                else:
                    user.streak_days = 1
            else:
                user.streak_days = 1
            user.streak_best = max(user.streak_best or 0, user.streak_days)
            user.last_session_at = now

        await db.commit()
        return result


async def analyze_session_safe(session_id: int) -> None:
    """Wrapper que loguea errores sin romper el ciclo del endpoint."""
    try:
        await analyze_session(session_id)
    except Exception as e:
        log.exception("analyze_session_safe falló: %s", e)

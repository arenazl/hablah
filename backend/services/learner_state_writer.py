"""Post-clase — escribe la HISTORIA del alumno (tabla `learner_state`, ULTRA LIVIANO).

WO F2-01. Es el 3er pilar del motor: que la clase 2 no repita la clase 1. Al cerrar la
sesión (`api/sessions.py` → `end_session`), destila del transcript, con UNA llamada batch a
Gemini (NO live — reusa `session_analyzer._gemini_complete`), el estado accionable mínimo y
lo hace UPSERT por alumno en `learner_state`.

Diseño settled (coincide con la recomendación de Gemini): NO se vuelca el JSON entero de
errores. Solo lo accionable: top-1 error a vigilar, ≤3 intereses, ≤3 dominados, ≤1 a repasar.

CONTRATO del dict (lo que F2-02 va a LEER) — ver el docstring de `models.learner_state.LearnerState`.

FAIL-SOFT (único punto donde se acepta degradar con log): la clase YA terminó cuando esto
corre en background; si la destilación falla (API caída, timeout, tabla ausente), se loggea
ERROR con trace_id y NO se rompe el cierre. La historia es best-effort, nunca bloquea la clase.
"""
from __future__ import annotations

import logging
import uuid
from typing import Optional

from sqlalchemy import select

from core.database import AsyncSessionLocal
from models.learner_state import LearnerState
from models.template import Session as SessionModel, Topic
from models.user import User
from services.session_analyzer import _gemini_complete

log = logging.getLogger(__name__)

# Topes del contrato liviano (ver models.learner_state.LearnerState).
_MAX_INTERESTS = 3
_MAX_MASTERED = 3
_MAX_LEN = 255  # frase corta; los campos String de la tabla son String(255)

# Forma canónica vacía del estado (para arrancar el merge sin fila previa).
EMPTY_STATE: dict = {"top_error": "", "interests": [], "mastered": [], "review": ""}


# ──────────────────────────────────────────────────────────────────────────────────────
# Normalización + merge (PUROS, sin DB — testeables aislados)
# ──────────────────────────────────────────────────────────────────────────────────────
def _clean_str(v) -> str:
    """Frase corta segura: str, strip, cap de longitud. '' si vacío/None."""
    if not v:
        return ""
    return str(v).strip()[:_MAX_LEN]


def _clean_list(v, cap: int) -> list[str]:
    """Lista de frases cortas, dedup case-insensitive, en orden, tope `cap`."""
    if not isinstance(v, (list, tuple)):
        v = [v] if v else []
    seen: set[str] = set()
    out: list[str] = []
    for x in v:
        s = _clean_str(x)
        k = s.lower()
        if s and k not in seen:
            seen.add(k)
            out.append(s)
        if len(out) >= cap:
            break
    return out


def normalize_distilled(raw: Optional[dict]) -> dict:
    """Coacciona la salida cruda de Gemini al CONTRATO liviano. Nunca lanza."""
    raw = raw or {}
    return {
        "top_error": _clean_str(raw.get("top_error")),
        "interests": _clean_list(raw.get("interests"), _MAX_INTERESTS),
        "mastered": _clean_list(raw.get("mastered"), _MAX_MASTERED),
        "review": _clean_str(raw.get("review")),
    }


def _merge_capped(new_list, prev_list, cap: int) -> list[str]:
    """Une nuevo + previo (nuevo primero, más reciente), dedup case-insensitive, tope `cap`."""
    combined = list(new_list or []) + list(prev_list or [])
    return _clean_list(combined, cap)


def merge_learner_state(prev: Optional[dict], new: dict) -> dict:
    """Aplica las reglas de merge del contrato (ver LearnerState). Puro, sin DB.

      · top_error → el nuevo REEMPLAZA; si el nuevo viene vacío, conserva el previo.
      · interests → ACUMULAN (nuevo primero), dedup, tope 3.
      · mastered  → ROTA (nuevo adelante, viejo sale), tope 3.
      · review    → el nuevo REEMPLAZA; si viene vacío, conserva el previo.
    """
    prev = prev or EMPTY_STATE
    new = new or EMPTY_STATE
    return {
        "top_error": _clean_str(new.get("top_error")) or _clean_str(prev.get("top_error")),
        "interests": _merge_capped(new.get("interests"), prev.get("interests"), _MAX_INTERESTS),
        "mastered": _merge_capped(new.get("mastered"), prev.get("mastered"), _MAX_MASTERED),
        "review": _clean_str(new.get("review")) or _clean_str(prev.get("review")),
    }


# ──────────────────────────────────────────────────────────────────────────────────────
# Destilación (1 llamada batch a Gemini)
# ──────────────────────────────────────────────────────────────────────────────────────
_DISTILL_PROMPT = """You are the memory of an English tutor for Habláh. Read the class
transcript (alternating [AI] tutor / [USER] student) and distill ONLY what will make the
NEXT class better — so class 2 does not repeat class 1. Analyze ONLY the student ([USER]).

Student: {name} · CEFR level: {level} · topic: {topic}

Return a STRICT JSON object, ALL fields in ENGLISH, teacher language, SHORT phrases (these are
directives for the coach, not prose). Keep it tiny and actionable:

{{
  "top_error": "the single most important recurring language mistake to watch for next time, with a 2-4 word example. Empty string if none clear.",
  "interests": ["up to 3 concrete things the student showed they like talking about"],
  "mastered": ["up to 3 things the student clearly handled well (do not re-teach; use as anchor)"],
  "review": "the ONE thing to revisit next class, short phrase. Empty string if none."
}}

Rules: correct LANGUAGE only, never facts. If a field has nothing real, return "" or []. Do
NOT invent. No markdown, JSON only."""


def _render_transcript(transcript) -> str:
    lines = []
    for line in (transcript or []):
        who = (line.get("who") or "?").upper()
        text = line.get("text", "")
        if text:
            lines.append(f"[{who}] {text}")
    return "\n".join(lines)


async def distill_learner_state(session_id: int, trace_id: str) -> Optional[dict]:
    """Destila + upsert. Devuelve el dict FINAL persistido, o None si no hay nada que hacer
    (sesión inexistente / sin transcript). Puede LANZAR (lo contiene el _safe)."""
    async with AsyncSessionLocal() as db:
        s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
        if not s or not s.transcript:
            log.info("learner_state[%s] session %s sin transcript, skip", trace_id, session_id)
            return None

        user = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
        if not user:
            log.info("learner_state[%s] session %s sin user, skip", trace_id, session_id)
            return None

        topic = None
        if s.topic_id:
            topic = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none()

        prompt = _DISTILL_PROMPT.format(
            name=user.nombre,
            level=(user.cefr_level or "A1"),
            topic=(topic.title if topic else "free talk"),
        )
        raw = await _gemini_complete(prompt, _render_transcript(s.transcript))
        distilled = normalize_distilled(raw)

        # Upsert por alumno (merge con lo previo).
        row = (await db.execute(
            select(LearnerState).where(LearnerState.student_id == user.id))).scalar_one_or_none()
        prev = None
        if row:
            prev = {"top_error": row.top_error, "interests": row.interests or [],
                    "mastered": row.mastered or [], "review": row.review or ""}
        merged = merge_learner_state(prev, distilled)

        if not row:
            row = LearnerState(student_id=user.id)
            db.add(row)
        row.top_error = merged["top_error"]
        row.interests = merged["interests"]
        row.mastered = merged["mastered"]
        row.review = merged["review"]

        await db.commit()
        log.info("learner_state[%s] session %s escrito para alumno %s: %s",
                 trace_id, session_id, user.id, merged)
        return merged


async def distill_learner_state_safe(session_id: int) -> None:
    """FAIL-SOFT: nunca lanza. Si la destilación falla, loggea ERROR con trace_id y sigue.
    La clase ya terminó — la historia es best-effort y NUNCA rompe el cierre."""
    trace_id = uuid.uuid4().hex[:8]
    try:
        await distill_learner_state(session_id, trace_id)
    except Exception as e:
        log.error("learner_state[%s] destilación FALLÓ session %s: %s — cierre de clase INTACTO "
                  "(historia best-effort)", trace_id, session_id, e)


# ──────────────────────────────────────────────────────────────────────────────────────
# Lectura (para F2-02: el composer usa la historia)
# ──────────────────────────────────────────────────────────────────────────────────────
async def load_learner_state_lite(db, student_id: int) -> Optional[dict]:
    """Devuelve el dict liviano del alumno (CONTRATO), o None si no hay fila / está vacía
    → el composer omite el bloque 6 (fail-safe, no inventa)."""
    row = (await db.execute(
        select(LearnerState).where(LearnerState.student_id == student_id))).scalar_one_or_none()
    if not row:
        return None
    state = {
        "top_error": row.top_error or "",
        "interests": row.interests or [],
        "mastered": row.mastered or [],
        "review": row.review or "",
    }
    return state if any(state.values()) else None

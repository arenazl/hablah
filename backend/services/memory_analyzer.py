"""Post-clase — MEMORIA del alumno (SRS + insights). Doc 08 de Motor-Learning.

Se dispara al cerrar la clase (junto al session_analyzer del reporte). Dos mitades:

  Mitad A — DETERMINISTA (sin IA): de los ítems objetivo de la sesión + el transcript
    del alumno → actualiza vocab_progress (SRS). Los ítems que el alumno DIJO avanzan;
    NO se inventan fallos. Automático, sin aprobación.
  Mitad B — 1 llamada a IA: lee el transcript → session_insights (resumen, intereses,
    rasgos, ítems a reforzar, próximo tópico), status='pending'. Recién al APROBAR el
    profe se propaga a learner_interests / learner_traits / reinforcement_queue.

NOTA (honesta): el SRS exacto pediría contadores por turno (raw_session_data, hoy no
capturado). Mientras tanto se deriva del transcript (¿el alumno dijo el ítem objetivo?).
Aproximación determinista; se vuelve exacta al instrumentar el motor de voz en vivo.
"""
from __future__ import annotations

import datetime
import json
import logging
from typing import Optional

from sqlalchemy import select

from core.database import AsyncSessionLocal
from models.template import Session as SessionModel, Topic
from models.user import User
from models.learner_state import VocabProgress, SessionInsight, ReinforcementQueue, LearnerInterest, LearnerTrait
from services.session_analyzer import _gemini_complete

log = logging.getLogger(__name__)


def _srs_apply(row: VocabProgress, result: str, today: datetime.date) -> None:
    """Porta engine.srs_update a la fila ORM. result: ok | struggled | fail."""
    row.seen_count = (row.seen_count or 0) + 1
    if result == "ok":
        row.success_count = (row.success_count or 0) + 1
        row.ease = min((row.ease or 2.5) + 0.1, 2.8)
        interval = max(1, round(row.success_count * row.ease))
        row.next_review = today + datetime.timedelta(days=interval)
        row.status = "mastered" if row.success_count >= 3 else "learning"
    elif result == "struggled":
        row.next_review = today + datetime.timedelta(days=1)
        row.status = "learning"
    else:  # fail
        row.fail_count = (row.fail_count or 0) + 1
        row.ease = max((row.ease or 2.5) - 0.2, 1.3)
        row.next_review = today
        row.status = "learning"
    row.last_seen = today


def _target_items(topic: Optional[Topic]) -> list[str]:
    """Ítems objetivo de la sesión (vocab del tópico). Igual que lee el composer."""
    if not topic:
        return []
    items: list[str] = []
    for v in (getattr(topic, "pinned_vocabulary", None) or []):
        if isinstance(v, dict):
            if v.get("en"):
                items.append(str(v["en"]))
        elif v:
            items.append(str(v))
    for k in (getattr(topic, "keywords", None) or []):
        if k:
            items.append(str(k))
    for g in (getattr(topic, "generated_vocab", None) or []):
        if g:
            items.append(str(g))
    seen, out = set(), []
    for it in items:
        key = it.lower().strip()
        if key and key not in seen:
            seen.add(key)
            out.append(it)
    return out


def _student_text(transcript) -> str:
    return " \n".join(l.get("text", "") for l in (transcript or []) if (l.get("who") or "").lower() == "user")


async def load_learner_state(db, student_id: int) -> Optional[dict]:
    """Arma el dict learner_state (bloque 5b) desde la memoria del alumno. None si vacío
    → el composer omite el bloque (fail-safe)."""
    today = datetime.date.today()
    vp = (await db.execute(select(VocabProgress).where(VocabProgress.student_id == student_id))).scalars().all()
    rq = (await db.execute(select(ReinforcementQueue).where(ReinforcementQueue.student_id == student_id))).scalars().all()
    li = (await db.execute(select(LearnerInterest).where(LearnerInterest.student_id == student_id))).scalars().all()
    lt = (await db.execute(select(LearnerTrait).where(LearnerTrait.student_id == student_id))).scalars().all()
    state = {
        "mastered": [r.item for r in vp if r.status == "mastered"],
        "learning": [r.item for r in vp if r.status == "learning"],
        "due_for_review": [r.item for r in vp if r.next_review and r.next_review <= today],
        "recent_errors": [r.item for r in rq],
        "interests": [r.interest for r in li],
        "traits": [r.trait for r in lt],
    }
    return state if any(state.values()) else None


MEMORY_PROMPT = """Sos un analista pedagógico de Habláh. Leé la transcripción de una clase de inglés
(alternancia [AI] tutor / [USER] alumno) y devolvé SOLO un JSON con la MEMORIA del alumno.
Analizá SOLO lo que muestra el alumno ([USER]).

Datos: alumno {name}, nivel {level}, idioma base español rioplatense.

Devolvé JSON ESTRICTO:
{{
  "summary": "2-3 oraciones en español de cómo fue la clase y qué mostró el alumno",
  "affective": "engaged | neutral | frustrated",
  "new_interests": ["temas que el alumno mencionó que le interesan (español, 0-4)"],
  "traits": [{{"trait": "rasgo pedagógico observado (ej: 'se traba con preguntas abiertas')", "confidence": 0.7}}],
  "items_to_reinforce": ["palabras/frases en inglés que le costaron o evitó (0-5)"],
  "suggested_topic": "un tópico sugerido para la próxima clase (español)"
}}
Si algo no aparece, devolvé lista vacía []. No inventes.
"""


async def analyze_memory(session_id: int) -> Optional[dict]:
    today = datetime.date.today()
    async with AsyncSessionLocal() as db:
        s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
        if not s or not s.transcript:
            return None
        user = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
        if not user:
            return None
        topic = None
        if s.topic_id:
            topic = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none()

        # ── Mitad A — SRS determinista (los ítems objetivo que el alumno dijo) ──
        said = _student_text(s.transcript).lower()
        updated = 0
        for item in _target_items(topic):
            if item.lower().strip() not in said:
                continue  # no lo dijo: no se penaliza (pudo no llegar a ese ítem)
            row = (await db.execute(select(VocabProgress).where(
                VocabProgress.student_id == user.id, VocabProgress.item == item))).scalar_one_or_none()
            if not row:
                row = VocabProgress(student_id=user.id, item=item, status="new", ease=2.5)
                db.add(row)
            _srs_apply(row, "ok", today)
            updated += 1
        await db.commit()

        # ── Mitad B — insights cualitativos (1 llamada IA), queda 'pending' ──
        lines = [f"[{(l.get('who') or '?').upper()}] {l.get('text','')}" for l in s.transcript]
        prompt = MEMORY_PROMPT.format(name=user.nombre, level=(user.cefr_level or "A1"))
        insight_id = None
        try:
            result = await _gemini_complete(prompt, "\n".join(lines))
            insight = SessionInsight(
                session_id=s.id, student_id=user.id,
                summary=result.get("summary"), affective=result.get("affective"),
                new_interests=json.dumps(result.get("new_interests") or [], ensure_ascii=False),
                items_to_reinforce=json.dumps(result.get("items_to_reinforce") or [], ensure_ascii=False),
                traits=json.dumps(result.get("traits") or [], ensure_ascii=False),
                suggested_topic=result.get("suggested_topic"), status="pending",
            )
            db.add(insight)
            await db.commit()
            await db.refresh(insight)
            insight_id = insight.id
        except Exception as e:
            log.error("memoria IA falló session %s: %s", session_id, e)

        log.info("memoria session %s: SRS +%s ítems, insight=%s", session_id, updated, insight_id)
        return {"srs_updated": updated, "insight_id": insight_id}


async def analyze_memory_safe(session_id: int) -> None:
    try:
        await analyze_memory(session_id)
    except Exception as e:
        log.exception("analyze_memory_safe falló: %s", e)

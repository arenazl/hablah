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


def compute_interaction_counters(transcript, target_items: list[str]) -> dict:
    """Contadores por ítem desde el transcript (base del SRS, más exacto que binario):
      attempts      = veces que el ALUMNO dijo el ítem objetivo,
      confirmations = veces que el COACH lo confirmó (eco del ítem en su turno siguiente).
    Sigue siendo derivado del transcript (no de confianza de ASR), pero cuenta intentos
    reales y usa la confirmación del coach para distinguir 'lo dijo bien' de 'lo intentó'."""
    counters = {it: {"attempts": 0, "confirmations": 0} for it in target_items}
    turns = transcript or []
    low_items = [(it, it.lower().strip()) for it in target_items if it]
    for i, turn in enumerate(turns):
        if (turn.get("who") or "").lower() != "user":
            continue
        text = (turn.get("text") or "").lower()
        said = [it for (it, low) in low_items if low and low in text]
        if not said:
            continue
        nxt = turns[i + 1] if i + 1 < len(turns) else None
        ai_next = (nxt.get("text") or "").lower() if (nxt and (nxt.get("who") or "").lower() == "ai") else ""
        for it in said:
            counters[it]["attempts"] += 1
            if it.lower().strip() in ai_next:
                counters[it]["confirmations"] += 1
    return counters


def build_raw_session_data(transcript, target_items: list[str]) -> dict:
    """Snapshot durable per-turno de la clase (sessions.raw_session_data). Lo persiste el
    motor de voz al cerrar el WS (lado de consumo, cero latencia en la charla)."""
    return {
        "schema": "v1",
        "target_items": target_items,
        "counters": compute_interaction_counters(transcript, target_items),
        "turns": [{"who": (t.get("who") or ""), "text": (t.get("text") or "")} for t in (transcript or [])],
    }


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


def _band_of(user) -> tuple[str, str]:
    """(band, audience) del alumno. band = mini|junior|tween|adult; audience = kid|adult."""
    band = getattr(user, "age_group", None) or "adult"
    audience = "kid" if band in ("mini", "junior", "tween") else "adult"
    return band, audience


def _topic_ok_for_band(topic: Topic, band: str) -> bool:
    """appropriate_bands NULL = sin restricción; si tiene lista, el band debe estar."""
    bands = getattr(topic, "appropriate_bands", None)
    if not bands:
        return True
    try:
        return band in [str(b) for b in bands]
    except TypeError:
        return True


async def suggest_next_topic(db, student_id: int) -> dict:
    """Sequencer determinista: elige el próximo tópico para el alumno desde su memoria.

    Resuelve un topic_id CONCRETO (no solo texto) para que el arranque de clase lo use:
      1) match del 'suggested_topic' del último post-clase contra el catálogo (por título),
      2) si no, un tópico apropiado a su banda que NO haya hecho en las últimas 5 clases,
      3) si no, cualquiera apropiado a su banda.
    Filtra por audience + appropriate_bands. Devuelve {topic_id, topic_title, due_items,
    reinforce_items, suggested_topic, reason}.
    """
    today = datetime.date.today()
    user = (await db.execute(select(User).where(User.id == student_id))).scalar_one_or_none()
    band, audience = _band_of(user)

    vp = (await db.execute(select(VocabProgress).where(VocabProgress.student_id == student_id))).scalars().all()
    due = [r.item for r in vp if r.next_review and r.next_review <= today]
    rq = (await db.execute(select(ReinforcementQueue).where(ReinforcementQueue.student_id == student_id))).scalars().all()
    last = (await db.execute(
        select(SessionInsight).where(SessionInsight.student_id == student_id).order_by(SessionInsight.id.desc()).limit(1)
    )).scalars().first()
    suggested_text = getattr(last, "suggested_topic", None)

    # Catálogo apropiado a la banda (audience + appropriate_bands).
    cands = (await db.execute(
        select(Topic).where(Topic.is_active.is_(True), Topic.audience == audience)
    )).scalars().all()
    cands = [t for t in cands if _topic_ok_for_band(t, band)]

    # Tópicos hechos en las últimas 5 clases (para no repetir).
    recent_rows = (await db.execute(
        select(SessionModel.topic_id).where(SessionModel.user_id == student_id, SessionModel.topic_id.isnot(None))
        .order_by(SessionModel.id.desc()).limit(5)
    )).all()
    recent_ids = {r[0] for r in recent_rows}

    chosen = None
    reason = ""
    if suggested_text:
        needle = suggested_text.lower().strip()
        chosen = next((t for t in cands if needle in (t.title or "").lower() or (t.title or "").lower() in needle), None)
        if chosen:
            reason = f"match del post-clase: '{suggested_text}'"
    if not chosen:
        fresh = [t for t in cands if t.id not in recent_ids]
        chosen = fresh[0] if fresh else (cands[0] if cands else None)
        if chosen:
            reason = "tópico apropiado a la banda no visto recientemente"

    return {
        "topic_id": getattr(chosen, "id", None),
        "topic_title": getattr(chosen, "title", None),
        "due_items": due,
        "reinforce_items": [r.item for r in rq],
        "suggested_topic": suggested_text,
        "reason": reason or "sin datos de memoria; el alumno elige el tópico",
    }


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

        # ── Mitad A — SRS determinista ──
        async def _row_for(item: str) -> VocabProgress:
            row = (await db.execute(select(VocabProgress).where(
                VocabProgress.student_id == user.id, VocabProgress.item == item))).scalar_one_or_none()
            if not row:
                row = VocabProgress(student_id=user.id, item=item, status="new", ease=2.5)
                db.add(row)
            return row

        updated = 0
        raw = getattr(s, "raw_session_data", None)
        counters = raw.get("counters") if isinstance(raw, dict) else None
        if counters:
            # EXACTO: usa los contadores per-ítem que capturó el motor de voz (attempts +
            # confirmations). 'ok' si el coach lo confirmó; 'struggled' si lo intentó sin confirmar.
            for item, c in counters.items():
                attempts = int((c or {}).get("attempts") or 0)
                if attempts <= 0:
                    continue  # no lo dijo: no se penaliza
                row = await _row_for(item)
                result = "ok" if int((c or {}).get("confirmations") or 0) > 0 else "struggled"
                _srs_apply(row, result, today)
                if attempts > 1:
                    row.seen_count = (row.seen_count or 0) + (attempts - 1)  # reflejar intentos reales
                updated += 1
        else:
            # FALLBACK (sin raw_session_data): derivación binaria del transcript.
            said = _student_text(s.transcript).lower()
            for item in _target_items(topic):
                if item.lower().strip() not in said:
                    continue
                row = await _row_for(item)
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

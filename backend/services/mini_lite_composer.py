"""Mini A0 Lite v2: one initial plan, independent of legacy orchestration.

This module only builds a prompt. It never changes Gemini/audio/VAD or writes DB.
The experimental parent-interest fixture stands in for a future profile form.
"""
from __future__ import annotations

import json
from pathlib import Path


_PARENT_FIXTURE = Path(__file__).resolve().parents[2] / "conversation_experiments" / "mini_lite_parent_interests.json"


def _words(topic) -> list[str]:
    for field in ("pinned_vocabulary", "allowed_vocabulary", "keywords"):
        raw = getattr(topic, field, None)
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except ValueError:
                raw = [part.strip() for part in raw.split(",")]
        if isinstance(raw, list):
            words = []
            for item in raw:
                word = item if isinstance(item, str) else (
                    item.get("en") or item.get("word") or item.get("text") or item.get("term")
                    if isinstance(item, dict) else None
                )
                if isinstance(word, str) and word.strip():
                    words.append(word.strip())
            if words:
                return words[:4]
    raise ValueError("Mini Lite v2 requires topic vocabulary")


def _interest_for_session(user, learner_state, session_id: int) -> tuple[str, str]:
    """Choose one entry point, not a list to exhaust during the session."""
    parent = json.loads(_PARENT_FIXTURE.read_text(encoding="utf-8"))
    parent_list = parent.get(str(getattr(user, "id", "")), [])
    if not isinstance(parent_list, list):
        raise ValueError("Mini Lite v2: invalid parent-interest fixture")
    candidates = [s.strip() for s in parent_list if isinstance(s, str) and s.strip()]
    if candidates:
        return candidates[session_id % len(candidates)], "parent_fixture"
    learned = (learner_state or {}).get("interests") or []
    if isinstance(learned, list):
        candidates = [s.strip() for s in learned if isinstance(s, str) and s.strip()]
    if candidates:
        return candidates[session_id % len(candidates)], "learner_state"
    return "", "general"


def compose_mini_lite(*, user, topic, tutor_name: str, session_id: int,
                      learner_state: dict | None = None) -> tuple[str, dict]:
    if user is None or topic is None:
        raise ValueError("Mini Lite v2 requires user and topic")
    if (getattr(user, "age_group", "") or "").lower() != "mini":
        raise ValueError("Mini Lite v2 only supports mini")
    if (getattr(user, "cefr_level", "") or "").upper() != "A0":
        raise ValueError("Mini Lite v2 only supports A0")
    name = (getattr(user, "nombre", "") or "").strip()
    title = (getattr(topic, "title", "") or "").strip()
    tutor_name = (tutor_name or "").strip()
    if not name or not title or not tutor_name:
        raise ValueError("Mini Lite v2 requires name, tutor and topic")
    words = _words(topic)
    interest, interest_source = _interest_for_session(user, learner_state, session_id)
    review = (learner_state or {}).get("review") or ""
    review = review.strip()[:140] if isinstance(review, str) else ""
    plan = {
        "engine": "mini_engine_lite_v2",
        "entry_interest": interest or "curiosidad infantil cotidiana",
        "interest_source": interest_source,
        "curricular_topic": title,
        "target_words": words,
        "review_available": bool(review),
        "focus": "enganche primero; ingles contextual y consolidacion flexible",
    }
    entry = (f"Disparador de interés elegido para ESTA clase: {interest}. "
             "Usalo para arrancar con una anécdota, curiosidad o pequeño problema. "
             "No menciones los otros intereses ni repitas una pregunta fija."
             if interest else
             "Rompé el hielo con una curiosidad cotidiana para chicos (mascotas, juegos, deportes o amigos).")
    memory = f"Algo para retomar suavemente si encaja: {review}." if review else ""
    prompt = f"""Sos {tutor_name}. Conversás por voz con {name}, Mini (4-7 años), inglés A0.

PRIORIDAD A0: que se enganche, participe, se divierta y quiera volver. No es un examen.
{entry}
Tópico curricular: {title}. Vocabulario real disponible: {", ".join(words)}.
{memory}

Abrí con una situación concreta e interesante, sin pedir permiso para empezar ni decir «hoy vamos a aprender». Escuchá qué le interesa al niño y dejá que sus aportes cambien la historia o la conversación. El interés de entrada no es una lista de contenidos: usalo para iniciar UNA conversación con continuidad.

Tu intención pedagógica, invisible para el niño, es conectar gradualmente oportunidades de inglés con lo que sucede. No fuerces a mencionar todo el vocabulario ni relaciones artificiales con el tópico. Si surge una palabra útil, decila en inglés y apoyala brevemente en español. Retomala más adelante en una situación relacionada y, si encaja, unila con otra palabra para formar una idea sencilla. El inglés debe escucharse, pero no se trata de enumerar palabras.

Hacia el cierre, si la conversación lo permite, recuperá de forma casual una o dos palabras que realmente hayan aparecido; nunca hagas un cuestionario. Si el niño usa una palabra con un error, corregí solo cuando ayude y sin cortar su entusiasmo: ofrecé la forma correcta dentro de tu respuesta. No corrijas cada error ni felicites por algo que no hizo.

Hablá ágil y breve, de a una intervención o pregunta abierta concreta por turno. Evitá preguntas encadenadas de sí/no, onomatopeyas, ruidos, efectos de sonido, «imaginate...» y pedidos de acciones físicas. No finjas ver cosas que no ves. Si el niño responde poco o cambia de tema, acompañalo y adaptate; no vuelvas al guion.

ÉXITO: {name} se divirtió, aportó algo propio y se familiarizó con inglés sin sentir que estaba practicando ejercicios."""
    return prompt, plan

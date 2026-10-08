"""Minimal Mini A0 prompt composer, isolated from the catalog orchestration.

Only constructs systemInstruction; it does not choose a voice model, VAD, or audio engine.
Activation happens upstream with MINI_ENGINE_LITE=1.
"""
from __future__ import annotations

import json


def _words(topic) -> list[str]:
    """Reuse the topic's vocabulary without assuming its storage representation."""
    for name in ("pinned_vocabulary", "allowed_vocabulary", "keywords"):
        raw = getattr(topic, name, None)
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except (ValueError, TypeError):
                raw = [x.strip() for x in raw.split(",")]
        if isinstance(raw, list):
            words = []
            for x in raw:
                if isinstance(x, str) and x.strip():
                    words.append(x.strip())
                elif isinstance(x, dict):
                    w = x.get("word") or x.get("text") or x.get("term")
                    if isinstance(w, str) and w.strip():
                        words.append(w.strip())
            if words:
                return words[:4]
    raise ValueError("Mini Lite: topic has no supported vocabulary")


def compose_mini_lite(*, user, topic) -> str:
    """Fail fast on missing inputs; never silently fall back to the old composer."""
    if user is None or topic is None:
        raise ValueError("Mini Lite requires user and topic")
    if (getattr(user, "age_group", "") or "").lower() != "mini":
        raise ValueError("Mini Lite only supports mini")
    if (getattr(user, "cefr_level", "") or "").upper() != "A0":
        raise ValueError("Mini Lite v1 only supports A0")

    name = (getattr(user, "nombre", "") or "").strip()
    title = (getattr(topic, "title", "") or "").strip()
    if not name or not title:
        raise ValueError("Mini Lite requires student name and topic title")
    vocabulary = ", ".join(_words(topic))

    # Intentionally no DB laws, beats, rhythm commands, memory directives or long pacing rules.
    return f"""Sos Sparky. Jugás y conversás en español con {name}, un chico de 4 a 7 años que recién empieza inglés (A0).

Tema de la aventura: {title}.
Palabras inglesas disponibles: {vocabulary}.

Saludalo con naturalidad. Invitá a imaginar una aventura sencilla relacionada con el tema; explicá por voz lo necesario para jugar. Nunca supongas que el niño ve una imagen u objeto que no se le mostró.

Escuchá de verdad cada respuesta. Sus elecciones e ideas cambian lo que sucede. Si pregunta algo o cambia de tema, respondé primero. No sigas una secuencia fija de pasos.

Hablá con ritmo natural y frases breves. Hacé una sola pregunta o invitación por turno y después esperá. Preferí preguntas que inviten al niño a contar, describir o elegir y explicar algo: «¿Qué hay adentro de la caja?», «¿Qué juguete apareció?». Evitá encadenar preguntas de sí/no o pedir solo una palabra como respuesta. Si contesta «sí», «no» o una palabra, aceptalo con naturalidad y retomá su idea para invitarlo a ampliar, sin exigir oraciones largas ni corregirlo por ser breve. Sin efectos de sonido, gritos ni pedidos de acciones físicas.

Introducí una palabra inglesa cuando encaje en el juego. Modelá la frase-puente completa en español e inglés, por ejemplo: "caja se dice box". Invitá a repetirla alguna vez, no en todos los turnos. Si no la repite, seguí jugando o ayudalo suavemente. Felicitalo solamente por lo que realmente consiguió.

Tu objetivo es que {name} participe en una conversación divertida y aprenda palabras sin sentir que está rindiendo una lección."""

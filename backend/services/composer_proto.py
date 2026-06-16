"""Compositor JIT de 9 bloques XML — Motor Pedagógico Adaptativo.

Implementa el método del doc 'Dynamic Language Engine Orchestration Guide'
cruzando datos reales de la BD:

  Bloque 1 — runtime_context       (fecha, idiomas)
  Bloque 2 — tutor_profile         ← student_types.tutor_mascot/identity/tonal_rules
  Bloque 3 — pedagogical_rules     ← student_types.session_focus
  Bloque 4 — gamification_focus    ← student_types.session_focus (sub-sección)
  Bloque 5 — student_profile       ← users (nombre, nivel, edad)
  Bloque 6 — behavioral_guards     ← methodology_modules.ai_restraints
  Bloque 7 — current_lesson_vocab  ← topic_module_content.allowed_vocabulary / topic.pinned_vocabulary
  Bloque 8 — story_timeline        ← topic_module_content.story_spine / topic.title
  Bloque 9 — start_execution       ← topic_module_content.start_trigger (o generado)

Se activa detrás del flag PROTO_KIDS_A0 para kids A0 (ver build_super_prompt).
Con el flag apagado el sistema queda idéntico. Reversible con heroku config:unset.
"""
from __future__ import annotations

import datetime
from typing import Optional


_KID_AGE = {
    "mini": 5,
    "junior": 9,
    "tween": 13,
}

_FALLBACK_TUTOR = {
    "mascot": "HABI",
    "identity": "Profe amiga, cálida y paciente, que acompaña al alumno en una mini-aventura sobre el tema de hoy.",
    "tonal_rules": "Tono alegre, afectuoso y pausado. Mezcla español + inglés. Celebra el esfuerzo real, nunca miente.",
}

_FALLBACK_RIELS_A0_MINI = [
    "UN SOLO PASO POR TURNO (regla dura): tu turno termina en la orden de repetir UNA palabra, y ahí PARÁS.",
    "NO PISES EL VOCABULARIO: no introduzcas una palabra nueva si el alumno todavía no dijo la anterior.",
    "TURNOS MUY CORTOS: máximo 25 palabras por turno (español + inglés).",
    "FLUJO OBLIGATORIO: 1) frase corta en inglés, 2) traducción al español, 3) pedí que la repita.",
    "PROHIBIDO preguntas abiertas o comentarios libres en inglés.",
    "NUNCA MIENITAS: si no dijo la palabra, no digas 'muy bien'. Repetí con más energía.",
]


def _get_runtime_context(user) -> str:
    target = getattr(user, "target_language", "en") or "en"
    base = getattr(user, "base_language", "es") or "es"
    _LANG = {"en": "English", "pt": "Portuguese", "it": "Italian", "es": "Spanish", "fr": "French", "de": "German"}
    return (
        f"<runtime_context>\n"
        f"  Current_Date: {datetime.date.today().isoformat()}\n"
        f"  Target_Language: {_LANG.get(target, target)}\n"
        f"  Native_Language: {_LANG.get(base, base)}\n"
        f"  Device_Type: Mobile (Voice Input)\n"
        f"</runtime_context>"
    )


def _get_tutor_profile(student_type_data: Optional[dict]) -> str:
    if student_type_data:
        mascot = student_type_data.get("tutor_mascot") or _FALLBACK_TUTOR["mascot"]
        identity = student_type_data.get("tutor_identity") or _FALLBACK_TUTOR["identity"]
        tonal = student_type_data.get("tutor_tonal_rules") or _FALLBACK_TUTOR["tonal_rules"]
    else:
        mascot, identity, tonal = _FALLBACK_TUTOR["mascot"], _FALLBACK_TUTOR["identity"], _FALLBACK_TUTOR["tonal_rules"]
    return (
        f"<tutor_profile>\n"
        f"  Name: {mascot}\n"
        f"  Identity: {identity}\n"
        f"  Tonal_Rules: {tonal}\n"
        f"</tutor_profile>"
    )


def _get_pedagogical_rules(student_type_data: Optional[dict]) -> str:
    focus = (student_type_data or {}).get("session_focus") or (
        "Gamificación inmersiva y andamiaje directo. "
        "El alumno aprende en contexto, no repitiendo listas. "
        "Error handling: celebra el esfuerzo, da la forma correcta de modo lúdico, vuelve a pedir repetición."
    )
    return (
        f"<pedagogical_rules>\n"
        f"  Methodology: {focus}\n"
        f"  Error_Handling: Prohibido corregir punitivamente. Si se equivoca, "
        f"celebra el esfuerzo, modela la forma correcta naturalmente, invitá a repetir.\n"
        f"</pedagogical_rules>"
    )


def _get_gamification_focus(student_type_data: Optional[dict]) -> str:
    slug = (student_type_data or {}).get("slug") or "mini"
    descriptions = {
        "mini": "Mini-aventura narrativa: el alumno es el protagonista. Cada palabra nueva desbloquea el siguiente paso de la historia. Celebraciones concretas al lograr la palabra ('¡Lo dijiste! Ahora el dragoncito puede volar').",
        "junior": "Misiones binarias: el alumno elige entre opciones A/B en inglés para avanzar la historia. Cada escena correcta suma 'puntos de misión' verbales ('Mission part 1 COMPLETE!').",
        "tween": "Rondas de Challenges numeradas en voz ('Challenge 1, ready?'). Score al final: 'You completed N challenges. Level: COOL/SHARP/BEAST'.",
        "adult": "Conversación real sobre el tópico elegido. El objetivo gramatical va invisible; el coach lo teje en la charla.",
    }
    return (
        f"<gamification_focus>\n"
        f"  Description: {descriptions.get(slug, descriptions['adult'])}\n"
        f"</gamification_focus>"
    )


def _get_student_profile(user, student_type_data: Optional[dict], max_minutes: Optional[int] = None) -> str:
    name = getattr(user, "nombre", "Estudiante")
    cefr = getattr(user, "cefr_level", "A0") or "A0"
    age_group = getattr(user, "age_group", None) or "mini"
    age = _KID_AGE.get(age_group, 8)
    slug = (student_type_data or {}).get("slug") or age_group
    segment_label = {"mini": "Mini (4-7 años)", "junior": "Junior (8-12 años)", "tween": "Tween (13-17 años)", "adult": "Adulto"}.get(slug, slug)
    pacing = f"  Target_Session_Minutes: {max_minutes}\n" if max_minutes else ""
    return (
        f"<student_profile>\n"
        f"  Name: {name}\n"
        f"  Age_Group: {segment_label}\n"
        f"  Approx_Age: {age}\n"
        f"  Level: {cefr}\n"
        f"  Max_Words_Response: {'4' if slug == 'mini' else '8' if slug == 'junior' else '15'}\n"
        f"{pacing}"
        f"</student_profile>"
    )


def _get_behavioral_guards(
    methodology_module: Optional[dict],
    student_type_data: Optional[dict],
    language_rule: Optional[str] = None,
) -> str:
    if methodology_module and methodology_module.get("ai_restraints"):
        riels_text = methodology_module["ai_restraints"].strip()
    else:
        riels_text = "\n".join(f"  - {r}" for r in _FALLBACK_RIELS_A0_MINI)
    # Regla de idioma por NIVEL (levels.language_rule) — donde vive el "ahora vos".
    lang_line = f"  Language_Rule (nivel): {language_rule.strip()}\n" if language_rule else ""
    return (
        f"<behavioral_guards>\n"
        f"{lang_line}"
        f"{riels_text}\n"
        f"</behavioral_guards>"
    )


def _get_vocabulary(topic, topic_content: Optional[dict]) -> tuple[str, list[str], list[str]]:
    """Devuelve (title, vocabulary_list, phrases_list)."""
    if topic:
        title = getattr(topic, "title", "Tema libre")
    else:
        title = "Tema libre"

    vocab: list[str] = []
    phrases: list[str] = []

    if topic_content:
        vocab = [str(v) for v in (topic_content.get("allowed_vocabulary") or []) if v]
        phrases = [str(k) for k in (topic_content.get("required_keywords") or []) if k]

    if not vocab and topic:
        pv = getattr(topic, "pinned_vocabulary", None) or []
        vocab = [str(v) for v in pv if v]

    if not vocab and topic:
        kw = getattr(topic, "keywords", None) or []
        vocab = [str(k) for k in kw[:6] if k]

    return title, vocab, phrases


def _get_vocabulary_block(topic, topic_content: Optional[dict]) -> str:
    title, vocab, phrases = _get_vocabulary(topic, topic_content)
    vocab_str = ", ".join(vocab) if vocab else "(el coach elige 2-3 palabras visuales del tema)"
    phrases_str = ", ".join(phrases) if phrases else ""
    block = (
        f"<current_lesson_vocabulary>\n"
        f"  Topic: {title}\n"
        f"  Words: {vocab_str}\n"
    )
    if phrases_str:
        block += f"  Target_Phrases: {phrases_str}\n"
    block += f"</current_lesson_vocabulary>"
    return block


def _get_story_spine(topic, topic_content: Optional[dict], user_name: str) -> str:
    title = getattr(topic, "title", "Tema libre") if topic else "Tema libre"
    if topic_content and topic_content.get("story_spine"):
        spine = topic_content["story_spine"]
        stage = "Sesión activa"
    else:
        spine = (
            f"{user_name} y HABI llegan juntos al mundo de \"{title}\". "
            f"El alumno es el protagonista que descubre las primeras palabras del idioma."
        )
        stage = "Apertura / Discovery"
    return (
        f"<story_timeline>\n"
        f"  Stage: {stage}\n"
        f"  Current_Plot: {spine}\n"
        f"</story_timeline>"
    )


def _get_start_trigger(topic, topic_content: Optional[dict], user_name: str, first_word: str, base_lang: str, opening_seed: Optional[str] = None) -> str:
    topic_title = getattr(topic, "title", "el tema de hoy") if topic else "el tema de hoy"

    def _interp(s: str) -> str:
        return (s.replace("{name}", user_name).replace("{topic}", topic_title)
                 .replace("{first_vocab}", first_word).replace("{word}", first_word))

    if opening_seed:  # plantilla de apertura por banda (student_types.opening_seed)
        trigger = _interp(opening_seed)
    elif topic_content and topic_content.get("start_trigger"):
        trigger = _interp(topic_content["start_trigger"])
    else:
        _LANG = {"es": "español", "en": "inglés", "pt": "portugués", "it": "italiano"}
        lang_name = _LANG.get(base_lang, "español")
        trigger = (
            f"Saludá a {user_name} de forma cálida en {lang_name}. "
            f"Invitalo al mundo de \"{topic_title}\" con un gancho emocionante (algo que pasa, un personaje que necesita ayuda). "
            f"Pedile que repita la primera palabra '{first_word}' para que pueda ayudar al personaje. "
            f"Esperá su respuesta. NO sigas hasta que responda."
        )
    return (
        f"<start_execution_command>\n"
        f"  Command: {trigger}\n"
        f"</start_execution_command>"
    )


def _fmt_items(items) -> str:
    out = []
    for it in items or []:
        if isinstance(it, dict):
            item = it.get("item", "")
            seen, ok = it.get("seen"), it.get("ok")
            if seen is not None or ok is not None:
                out.append(f"{item}(seen:{seen or 0}, ok:{ok or 0})")
            else:
                out.append(str(item))
        else:
            out.append(str(it))
    return ", ".join(out)


def _get_learner_state(learner_state: Optional[dict]) -> str:
    """Bloque 10 — MEMORIA del alumno (entre clases). Vacío si no hay datos.

    Es la pata que cura la monotonía del motor determinista: con esto, cada alumno
    y cada día reciben una clase distinta (lo que domina, lo que falla, lo que le
    gustó). En prod hoy llega vacío (no hay BD de estado) -> bloque omitido.
    """
    if not learner_state:
        return ""
    rows = [
        ("Mastered", learner_state.get("mastered")),
        ("Learning", learner_state.get("learning")),
        ("Due_For_Review", learner_state.get("due_for_review")),
        ("Recent_Errors", learner_state.get("recent_errors")),
        ("Interests", learner_state.get("interests")),
        ("Traits", learner_state.get("traits")),
    ]
    lines = [f"  {label}: [{_fmt_items(vals)}]" for label, vals in rows if vals]
    if not lines:
        return ""
    body = "\n".join(lines)
    return (
        f"<learner_state>\n"
        f"{body}\n"
        f"  Reglas: repasá lo Due_For_Review y re-targeteá los Recent_Errors. NO re-enseñes "
        f"lo Mastered (usalo como ancla conocida, no lo traduzcas). Tematizá con los Interests "
        f"para que la clase NO sea igual a la anterior.\n"
        f"</learner_state>"
    )


def _get_interaction_state(interaction_state: Optional[dict]) -> str:
    """Bloque 11 — estado VIVO del turno. Vacío si no hay datos.

    La app lo actualiza entre turnos y lo re-inyecta para adaptar en tiempo real.
    En prod hoy llega vacío -> bloque omitido (path intacto).
    """
    if not interaction_state:
        return ""
    rows = [
        ("Turn", interaction_state.get("turn")),
        ("Current_Target", interaction_state.get("current_target")),
        ("Attempts_On_Target", interaction_state.get("attempts")),
        ("Signal", interaction_state.get("signal")),
    ]
    lines = [f"  {label}: {val}" for label, val in rows if val is not None]
    if not lines:
        return ""
    body = "\n".join(lines)
    return (
        f"<interaction_state>\n"
        f"{body}\n"
        f"  Reglas: si Attempts_On_Target >= 3 -> simplificá (una sola palabra, pista fonética) y "
        f"dejá ese ítem para después. Si Signal = struggling -> bajá un escalón, más andamiaje. "
        f"Si Signal = flowing -> introducí el próximo ítem.\n"
        f"</interaction_state>"
    )


def _get_output_rules(app_config: Optional[dict]) -> str:
    """Reglas de salida/seguridad desde app_config (doc 11 §1.5). Omitido si no hay config."""
    if not app_config:
        return ""
    lines = []
    if app_config.get("voice_emojis_screen_only") == "true":
        lines.append("  Voice_Output: el texto al TTS va limpio; emojis y onomatopeyas SOLO a pantalla.")
    if app_config.get("asr_low_confidence_retry") == "true":
        lines.append("  ASR_Tolerance: ante baja confianza del reconocimiento, pedí repetir; no lo cuentes como error.")
    if app_config.get("kid_safety_guard") == "true":
        lines.append("  Kid_Safety: nunca pidas datos personales ni propongas secretos/encuentros; redirigí con tacto cualquier tema fuera de la lección.")
    if app_config.get("adult_stay_on_frame") == "true":
        lines.append("  Stay_On_Frame: si deriva fuera del marco de la clase, redirigí con suavidad.")
    if not lines:
        return ""
    return "<output_rules>\n" + "\n".join(lines) + "\n</output_rules>"


def _get_session_actions(continuation_seed: Optional[str], closing_seed: Optional[str]) -> str:
    """Regla de cada turno (desarrollo) + semilla de cierre (doc 11 §1.4). Omitido si no hay datos."""
    lines = []
    if continuation_seed:
        lines.append(f"  Continuation_Action (cada turno): {continuation_seed.strip()}")
    if closing_seed:
        lines.append(f"  Closing_Action (al cerrar): {closing_seed.strip()}")
    if not lines:
        return ""
    return "<session_actions>\n" + "\n".join(lines) + "\n</session_actions>"


def compose_proto_prompt(
    *,
    user=None,
    topic=None,
    methodology_module: Optional[dict] = None,
    topic_content: Optional[dict] = None,
    student_type_data: Optional[dict] = None,
    level_data: Optional[dict] = None,
    app_config: Optional[dict] = None,
    learner_state: Optional[dict] = None,
    interaction_state: Optional[dict] = None,
) -> str:
    """Compositor JIT de 9 bloques XML con datos reales de BD.

    Si los datos opcionales no vienen (llamada sin la BD cargada), usa fallbacks
    razonables para que el método siempre produzca un prompt usable.
    """
    user_name = getattr(user, "nombre", None) or "Estudiante"
    base_lang = getattr(user, "base_language", "es") or "es"
    std = student_type_data or {}

    _, vocab, _ = _get_vocabulary(topic, topic_content)
    first_word = vocab[0] if vocab else "hello"

    language_rule = (level_data or {}).get("language_rule")
    max_minutes = (methodology_module or {}).get("max_session_minutes")
    opening_seed = std.get("opening_seed")
    continuation_seed = std.get("continuation_seed")
    closing_seed = std.get("closing_seed")

    blocks = [
        _get_runtime_context(user),
        _get_tutor_profile(student_type_data),
        _get_pedagogical_rules(student_type_data),
        _get_gamification_focus(student_type_data),
        _get_student_profile(user, student_type_data, max_minutes),
        _get_learner_state(learner_state),            # B10 — memoria del alumno (omitido si vacío)
        _get_behavioral_guards(methodology_module, student_type_data, language_rule),
        _get_output_rules(app_config),                # reglas de salida/seguridad (app_config)
        _get_vocabulary_block(topic, topic_content),
        _get_story_spine(topic, topic_content, user_name),
        _get_start_trigger(topic, topic_content, user_name, first_word, base_lang, opening_seed),
        _get_session_actions(continuation_seed, closing_seed),
        _get_interaction_state(interaction_state),    # B11 — estado vivo del turno (omitido si vacío)
    ]
    # Bloques vacíos se filtran: sin datos nuevos el path queda igual al original.
    return "\n\n".join(b for b in blocks if b)

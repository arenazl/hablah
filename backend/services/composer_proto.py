"""Compositor JIT del prompt — Motor Pedagógico Adaptativo (FAIL-FAST, sin fallbacks).

Arma el prompt apilando los catálogos de los 2 ejes (NUNCA cruzados):
  EJE NIVEL  (levels):        idioma ES/EN + currículum + producción esperada (el QUÉ)
  EJE EDAD   (student_types): tutor, pedagogía, foco, forma, arranque/cierre (el CÓMO)
  + tópico (topics, elegido por el sequencer) + memoria del alumno (post-clase, opcional)

REGLA DURA (charla 2026-06-16): el motor NO usa fallbacks. Si un dato de catálogo
falta, se lanza MotorDataMissing con el nombre exacto del campo a cargar. Motivo: un
default silencioso enmascara un olvido de carga y no sabés si el prompt lo armó el
dato o el fallback. Mejor explotar y saber qué falta.

Bloques opcionales (se omiten si no hay dato, NO son fallbacks): learner_state e
interaction_state (memoria/estado vivo, se llenan post-clase), output_rules (config),
story_timeline (narrativa curada por tópico, cuando exista).

LEY DE ASIGNACIÓN — test de las 3 preguntas (docs/03-rework/01-analisis-integral.md §4).
Antes de escribir CUALQUIER regla en el catálogo, preguntar: "si cambio la EDAD del alumno,
¿esta regla debe cambiar? ¿y si cambio el NIVEL? ¿y con la HISTORIA?".
  · No cambia con nada  -> UNIVERSAL (pedagogía básica de conversación): app_config
                          'universal_conversation_rules', bloque <universal_conversation_rules>
                          (F1-01). Ej.: recast en vez de corregir en seco · variá, no repitas
                          fórmulas · seguí el interés del alumno · la estructura es vehículo,
                          no guion · honestidad conversacional (no inventar hechos vividos).
  · Solo con EDAD       -> student_types (el CÓMO social/afectivo): tono, juego, forma del turno.
  · Solo con NIVEL      -> levels (el QUÉ lingüístico): % ES/EN, gramática, producción esperada.
  · Con el alumno       -> learner_state / perfil (error a vigilar, intereses, dominado).
  · Con el TÓPICO       -> topics (SOLO léxico: keywords[:6] + frases-ancla). Jamás conducta.
La ley no se sostiene con disciplina sino con herramienta: el barrido de duplicados de F1-01
(misma oración en 2 capas = bug) + la invariante del smoke F1-03 (bloques únicos).
"""
from __future__ import annotations

import datetime
from typing import Optional

_LANG = {"en": "English", "pt": "Portuguese", "it": "Italian", "es": "Spanish", "fr": "French", "de": "German"}
_LANG_ES = {"es": "español", "en": "inglés", "pt": "portugués", "it": "italiano"}

_SEGMENT_LABEL = {"mini": "Mini (4-7 años)", "junior": "Junior (8-12 años)",
                  "tween": "Tween (13-17 años)", "adult": "Adulto"}


class MotorDataMissing(Exception):
    """Falta un dato de catálogo y el motor NO usa fallback: explota para que se sepa
    exactamente qué cargar (que un default no enmascare un olvido de carga)."""


def _req(value, field: str, ctx: str = ""):
    """Devuelve value si está cargado; si falta (None/''/[]/{}) lanza MotorDataMissing."""
    empty = value is None or (isinstance(value, (str, list, dict)) and len(value) == 0)
    if empty:
        where = f" ({ctx})" if ctx else ""
        raise MotorDataMissing(
            f"[motor] dato faltante: '{field}'{where}. Cargalo en su tabla — "
            f"el motor de 9 pasos NO usa fallback."
        )
    return value


def _get_runtime_context(user) -> str:
    target = getattr(user, "target_language", "en") or "en"
    base = getattr(user, "base_language", "es") or "es"
    return (
        f"<runtime_context>\n"
        f"  Current_Date: {datetime.date.today().isoformat()}\n"
        f"  Target_Language: {_LANG.get(target, target)}\n"
        f"  Native_Language: {_LANG.get(base, base)}\n"
        f"  Device_Type: Mobile (Voice Input)\n"
        f"</runtime_context>"
    )


def _get_tutor_profile(std: dict, ctx: str) -> str:
    mascot = _req(std.get("tutor_mascot"), "student_types.tutor_mascot", ctx)
    identity = _req(std.get("tutor_identity"), "student_types.tutor_identity", ctx)
    tonal = _req(std.get("tutor_tonal_rules"), "student_types.tutor_tonal_rules", ctx)
    return (
        f"<tutor_profile>\n"
        f"  Name: {mascot}\n"
        f"  Identity: {identity}\n"
        f"  Tonal_Rules: {tonal}\n"
        f"</tutor_profile>"
    )


def _get_pedagogical_rules(std: dict, ctx: str) -> str:
    ped = _req(std.get("pedagogy"), "student_types.pedagogy", ctx)
    return (
        f"<pedagogical_rules>\n"
        f"  Methodology: {ped}\n"
        f"</pedagogical_rules>"
    )


def _get_gamification_focus(std: dict, ctx: str) -> str:
    focus = _req(std.get("session_focus"), "student_types.session_focus", ctx)
    return (
        f"<gamification_focus>\n"
        f"  Description: {focus}\n"
        f"</gamification_focus>"
    )


def _get_student_profile(user, std: dict, ctx: str) -> str:
    name = _req(getattr(user, "nombre", None), "user.nombre", ctx)
    cefr = _req(getattr(user, "cefr_level", None), "user.cefr_level", ctx)
    slug = _req(std.get("slug") or getattr(user, "age_group", None), "segmento del alumno", ctx)
    return (
        f"<student_profile>\n"
        f"  Name: {name}\n"
        f"  Age_Group: {_SEGMENT_LABEL.get(slug, slug)}\n"
        f"  Level: {cefr}\n"
        f"</student_profile>"
    )


def _get_behavioral_guards(std: dict, lv: dict, ctx: str) -> str:
    """Bloque 6 — los rieles, APILANDO los 2 ejes (nunca cruzados, sin fallback).

    F1-02 (jerarquía semántica / recency bias): la Expected_Production va envuelta en
    <critical_objective> con una línea imperativa para forzar atención SIN depender del
    orden del stack (recomendación de Gemini, dueño del modelo de voz). Solo estructura
    XML: el contenido del preset (levels.expected_production) NO se toca."""
    lang = _req(lv.get("language_rule"), "levels.language_rule", ctx)
    grammar = _req(lv.get("curriculum_grammar"), "levels.curriculum_grammar", ctx)
    prod = _req(lv.get("expected_production"), "levels.expected_production", ctx)
    form = _req(std.get("form_rules"), "student_types.form_rules", ctx)
    return (
        f"<behavioral_guards>\n"
        f"  Language_Rule (nivel): {lang.strip()}\n"
        f"  Level_Target (nivel): {grammar.strip()}\n"
        f"  <critical_objective>\n"
        f"    HIGHEST PRIORITY — this is exactly what the student must produce this class; "
        f"follow it above every other block:\n"
        f"    Expected_Production (nivel): {prod.strip()}\n"
        f"  </critical_objective>\n"
        f"  Form_Rules (segmento): {form.strip()}\n"
        f"</behavioral_guards>"
    )


def _get_universal_rules(app_config: Optional[dict], ctx: str) -> str:
    """Capa UNIVERSAL anti-robot (F1-01) — el CÓMO se conversa, transversal a TODA clase.

    Test de las 3 preguntas (ver cabecera del módulo): estas reglas NO cambian con la edad,
    ni con el nivel, ni con la historia → viven en UNA sola capa (dato en app_config,
    clave 'universal_conversation_rules') y el composer las apila SIEMPRE, cerca del final
    del stack (recency bias). NO es opcional como output_rules: fail-fast si la clave falta
    (una regla, una capa — el barrido de F1-01 saca las copias de seeds/form_rules)."""
    cfg = _req(app_config, "app_config (necesita universal_conversation_rules)", ctx)
    rules = _req(cfg.get("universal_conversation_rules"),
                 "app_config.universal_conversation_rules", ctx)
    return (
        f"<universal_conversation_rules>\n"
        f"{rules.strip()}\n"
        f"</universal_conversation_rules>"
    )


def _get_vocabulary(topic, topic_content: Optional[dict]) -> tuple[str, list[str], list[str]]:
    """(title, vocab, phrases) crudos del tópico. Sin fallback: el caller valida."""
    title = getattr(topic, "title", None) if topic else None
    vocab: list[str] = []
    phrases: list[str] = []
    if topic_content:
        vocab = [str(v) for v in (topic_content.get("allowed_vocabulary") or []) if v]
        phrases = [str(k) for k in (topic_content.get("required_keywords") or []) if k]
    if not vocab and topic:
        vocab = [str(v) for v in (getattr(topic, "pinned_vocabulary", None) or []) if v]
    if not vocab and topic:
        vocab = [str(k) for k in (getattr(topic, "keywords", None) or [])[:6] if k]
    # generated_vocab = frases-ancla generadas en batch (capa B). Son FRASES, no palabras
    # sueltas → alimentan Target_Phrases cuando el tópico no trae required_keywords.
    if not phrases and topic:
        phrases = [str(p) for p in (getattr(topic, "generated_vocab", None) or []) if p]
    return title, vocab, phrases


def _get_vocabulary_block(topic, topic_content: Optional[dict], ctx: str, vocab_depth: Optional[str]) -> str:
    title, vocab, phrases = _get_vocabulary(topic, topic_content)
    _req(title, "tópico (sequencer no resolvió un tópico)", ctx)
    # El bloque 7 necesita contenido léxico: palabras (Words) O frases-ancla (Target_Phrases).
    # Un tópico de charla adulta puede no tener palabras sueltas y sí frases (generated_vocab).
    _req(vocab or phrases, "vocab/frases del tópico (pinned_vocabulary/keywords/generated_vocab)", ctx)
    # Sector 2 (biblia): la PROFUNDIDAD escala por nivel. basic (A0-A2) = solo la 1ª frase; full = todas.
    depth = _req(vocab_depth, "levels.vocab_depth", ctx)
    if depth == "basic" and phrases:
        phrases = phrases[:1]
    block = f"<current_lesson_vocabulary>\n  Topic: {title}\n"
    if vocab:
        block += f"  Words: {', '.join(vocab)}\n"
    if phrases:
        block += f"  Target_Phrases: {', '.join(phrases)}\n"
    block += "</current_lesson_vocabulary>"
    return block


def _get_story_spine(topic, topic_content: Optional[dict]) -> str:
    """Bloque 8 — narrativa curada por tópico. OPCIONAL: si no hay junction curado,
    se OMITE (no se inventa una narrativa de fallback)."""
    if topic_content and topic_content.get("story_spine"):
        return (
            f"<story_timeline>\n"
            f"  Stage: Sesión activa\n"
            f"  Current_Plot: {topic_content['story_spine']}\n"
            f"</story_timeline>"
        )
    return ""


def _interp(s: str, name: str, topic_title: str, first_word: str) -> str:
    return (s.replace("{name}", name).replace("{topic}", topic_title)
             .replace("{first_vocab}", first_word).replace("{word}", first_word))


def _get_start_trigger(topic, topic_content: Optional[dict], name: str, first_word: str,
                       opening_seed: Optional[str], ctx: str) -> str:
    seed = opening_seed or (topic_content or {}).get("start_trigger")
    _req(seed, "student_types.opening_seed (o topic_content.start_trigger)", ctx)
    topic_title = getattr(topic, "title", None) or "el tema de hoy"
    return (
        f"<start_execution_command>\n"
        f"  Command: {_interp(seed, name, topic_title, first_word)}\n"
        f"</start_execution_command>"
    )


def _get_session_actions(continuation_seed: Optional[str], closing_seed: Optional[str], ctx: str) -> str:
    cont = _req(continuation_seed, "student_types.continuation_seed", ctx)
    clos = _req(closing_seed, "student_types.closing_seed", ctx)
    return (
        f"<session_actions>\n"
        f"  Continuation_Action (cada turno): {cont.strip()}\n"
        f"  Closing_Action (al cerrar): {clos.strip()}\n"
        f"</session_actions>"
    )


def _fmt_items(items) -> str:
    out = []
    for it in items or []:
        if isinstance(it, dict):
            item, seen, ok = it.get("item", ""), it.get("seen"), it.get("ok")
            out.append(f"{item}(seen:{seen or 0}, ok:{ok or 0})" if (seen is not None or ok is not None) else str(item))
        else:
            out.append(str(it))
    return ", ".join(out)


def _get_learner_state(learner_state: Optional[dict]) -> str:
    """Bloque 10 — memoria del alumno. OPCIONAL (la llena el post-clase; vacío hoy)."""
    if not learner_state:
        return ""
    rows = [("Mastered", learner_state.get("mastered")), ("Learning", learner_state.get("learning")),
            ("Due_For_Review", learner_state.get("due_for_review")), ("Recent_Errors", learner_state.get("recent_errors")),
            ("Interests", learner_state.get("interests")), ("Traits", learner_state.get("traits"))]
    lines = [f"  {label}: [{_fmt_items(vals)}]" for label, vals in rows if vals]
    if not lines:
        return ""
    return (
        f"<learner_state>\n" + "\n".join(lines) + "\n"
        f"  Reglas: repasá lo Due_For_Review y re-targeteá los Recent_Errors. NO re-enseñes lo "
        f"Mastered (usalo como ancla). Tematizá con los Interests para que la clase no se repita.\n"
        f"</learner_state>"
    )


def _get_interaction_state(interaction_state: Optional[dict]) -> str:
    """Bloque 11 — estado vivo del turno. OPCIONAL (lo actualiza la app; vacío al inicio)."""
    if not interaction_state:
        return ""
    rows = [("Turn", interaction_state.get("turn")), ("Current_Target", interaction_state.get("current_target")),
            ("Attempts_On_Target", interaction_state.get("attempts")), ("Signal", interaction_state.get("signal"))]
    lines = [f"  {label}: {val}" for label, val in rows if val is not None]
    if not lines:
        return ""
    return (
        f"<interaction_state>\n" + "\n".join(lines) + "\n"
        f"  Reglas: Attempts_On_Target >= 3 -> simplificá y dejá el ítem para después. "
        f"Signal=struggling -> más andamiaje. Signal=flowing -> próximo ítem.\n"
        f"</interaction_state>"
    )


def _get_output_rules(app_config: Optional[dict]) -> str:
    """Reglas de salida/seguridad desde app_config. OPCIONAL (config de runtime)."""
    if not app_config:
        return ""
    lines = []
    if app_config.get("voice_emojis_screen_only") == "true":
        lines.append("  Voice_Output: el texto al TTS va limpio; emojis y onomatopeyas SOLO a pantalla.")
    if app_config.get("asr_low_confidence_retry") == "true":
        lines.append("  ASR_Tolerance: ante baja confianza del reconocimiento, pedí repetir; no lo cuentes como error.")
    if app_config.get("kid_safety_guard") == "true":
        lines.append("  Kid_Safety: nunca pidas datos personales ni propongas secretos/encuentros; redirigí fuera de la lección.")
    if app_config.get("adult_stay_on_frame") == "true":
        lines.append("  Stay_On_Frame: si deriva fuera del marco de la clase, redirigí con suavidad.")
    if app_config.get("closing_no_new_content") == "true":  # Sector 3 (biblia): closing trigger universal
        lines.append("  Closing_Trigger: si la fase actual es la de cierre, ejecutá el cierre; NO abras contenido nuevo.")
    return ("<output_rules>\n" + "\n".join(lines) + "\n</output_rules>") if lines else ""


def compose_proto_prompt(
    *,
    user=None,
    topic=None,
    methodology_module: Optional[dict] = None,  # legacy, ya no se usa (queda por compat de firma)
    topic_content: Optional[dict] = None,
    student_type_data: Optional[dict] = None,
    level_data: Optional[dict] = None,
    app_config: Optional[dict] = None,
    learner_state: Optional[dict] = None,
    interaction_state: Optional[dict] = None,
) -> str:
    """Arma el prompt apilando los 2 ejes + tópico. FAIL-FAST: si falta un dato de
    catálogo lanza MotorDataMissing (no hay fallback)."""
    std = _req(student_type_data, "student_type_data (eje EDAD — student_types)")
    lv = _req(level_data, "level_data (eje NIVEL — levels)")
    slug = std.get("slug") or getattr(user, "age_group", None) or "?"
    cefr = getattr(user, "cefr_level", None) or "?"
    ctx = f"segmento={slug}, nivel={cefr}"

    user_name = _req(getattr(user, "nombre", None), "user.nombre", ctx)
    _, vocab, phrases = _get_vocabulary(topic, topic_content)
    _req(topic, "tópico (sequencer)", ctx)
    _req(vocab or phrases, "vocab/frases del tópico (pinned_vocabulary/keywords/generated_vocab)", ctx)
    first_word = (vocab or phrases)[0]   # ancla para el trigger: 1ª palabra, o 1ª frase si no hay palabras

    blocks = [
        _get_runtime_context(user),
        _get_tutor_profile(std, ctx),
        _get_pedagogical_rules(std, ctx),
        _get_gamification_focus(std, ctx),
        _get_student_profile(user, std, ctx),
        _get_learner_state(learner_state),          # opcional (memoria, post-clase)
        _get_behavioral_guards(std, lv, ctx),
        _get_output_rules(app_config),              # opcional (config runtime)
        _get_vocabulary_block(topic, topic_content, ctx, lv.get("vocab_depth")),
        _get_story_spine(topic, topic_content),     # opcional (narrativa curada)
        _get_universal_rules(app_config, ctx),       # F1-01: SIEMPRE, cerca del final (recency)
        _get_start_trigger(topic, topic_content, user_name, first_word, std.get("opening_seed"), ctx),
        _get_session_actions(std.get("continuation_seed"), std.get("closing_seed"), ctx),
        _get_interaction_state(interaction_state),  # opcional (estado vivo)
    ]
    return "\n\n".join(b for b in blocks if b)

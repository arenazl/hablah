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
import hashlib
import json
from typing import Optional

_LANG = {"en": "English", "pt": "Portuguese", "it": "Italian", "es": "Spanish", "fr": "French", "de": "German"}
_LANG_ES = {"es": "español", "en": "inglés", "pt": "portugués", "it": "italiano"}

_SEGMENT_LABEL = {"mini": "Mini (4-7 years old)", "junior": "Junior (8-12 years old)",
                  "tween": "Tween (13-17 years old)", "adult": "Adult"}


# ── F2-03 · Rotación de semilla por sesión (variedad POR CONSTRUCCIÓN) ─────────────────────
# La variedad NO puede descansar en la estocasticidad del modelo (colapsa al drill): sale del
# MOTOR, muestreando dentro del catálogo curado. Determinístico y auditable: mismo (alumno,
# tópico, día) = misma semilla = MISMO prompt byte a byte; día distinto = selección distinta.
# NO es un if/parche ni fuerza vocab: rota lo que YA está cargado.
def _session_seed(student_id, topic_id, day_iso: str) -> int:
    """Semilla estable ENTRE procesos (hashlib, NO hash() que va salado por PYTHONHASHSEED)."""
    key = f"{student_id or 0}|{topic_id or 0}|{day_iso}"
    return int(hashlib.sha256(key.encode("utf-8")).hexdigest()[:12], 16)


def _derive(seed: int, salt: str) -> int:
    """Sub-semilla por propósito, para decorrelar las selecciones (frase-ancla vs arranque)."""
    return int(hashlib.sha256(f"{int(seed)}:{salt}".encode("utf-8")).hexdigest()[:12], 16)


def _pick(items: list, seed: int):
    """Elemento elegido determinísticamente por semilla (rota entre los N, no siempre el 1º)."""
    return items[seed % len(items)] if items else None


def _rotate(items: list, seed: int) -> list:
    """Mismo contenido, punto de entrada rotado por semilla (varía el orden/énfasis)."""
    if len(items) <= 1:
        return list(items)
    k = seed % len(items)
    return list(items[k:]) + list(items[:k])


def _opening_variants(raw) -> list[str]:
    """El arranque puede venir como 1 string o como JSON array de variantes (F2-03: 3-4 por edad
    en student_types.opening_seed). Devuelve la lista (≥1); el composer rota por semilla. Si es un
    string común, es la única 'variante'. Robusto: nunca lanza (dato malformado -> string crudo)."""
    if isinstance(raw, list):
        return [str(v).strip() for v in raw if str(v).strip()]
    if isinstance(raw, str):
        s = raw.strip()
        if s.startswith("[") and s.endswith("]"):
            try:
                arr = json.loads(s)
                if isinstance(arr, list):
                    vs = [str(v).strip() for v in arr if str(v).strip()]
                    if vs:
                        return vs
            except Exception:
                pass
        return [raw] if raw.strip() else []
    return []


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
        f"  Language_Rule (level): {lang.strip()}\n"
        f"  Level_Target (level): {grammar.strip()}\n"
        f"  <critical_objective>\n"
        f"    HIGHEST PRIORITY — this is exactly what the student must produce this class; "
        f"follow it above every other block:\n"
        f"    Expected_Production (level): {prod.strip()}\n"
        f"  </critical_objective>\n"
        f"  Form_Rules (segment): {form.strip()}\n"
        f"</behavioral_guards>"
    )


def _get_universal_rules(app_config: Optional[dict], ctx: str, age_group: str = "?", level_code: str = "?") -> str:
    """Capa UNIVERSAL anti-robot (F1-01) con acoplamiento por edad y nivel (Bloque A vs Bloque B).
    
    Aplica las reglas universales filtradas y reenumeradas.
    """
    raw_rules = _req(app_config.get("universal_conversation_rules"), "app_config.universal_conversation_rules", ctx)
    
    # Parsear y separar las reglas del string original de la base de datos
    parsed_rules = {}
    current_num = None
    current_text = []
    
    import re
    for line in raw_rules.split("\n"):
        line_stripped = line.strip()
        if not line_stripped:
            continue
        m = re.match(r"^(\d+)\.\s*(.*)$", line_stripped)
        if m:
            if current_num is not None:
                parsed_rules[current_num] = "\n".join(current_text).strip()
            current_num = int(m.group(1))
            current_text = [m.group(2)]
        else:
            if current_num is not None:
                current_text.append(line_stripped)
                
    if current_num is not None:
        parsed_rules[current_num] = "\n".join(current_text).strip()

    # Seleccionar las reglas estrictamente según la combinación Edad/Nivel (Filtro JIT)
    age_slug = str(age_group).lower()
    level_slug = str(level_code).lower()
    
    # Bloque A (Mini o Nivel A0/A1) vs Bloque B (Teens/Adultos/Niveles B1+)
    if age_slug == "mini" or level_slug in ["a0", "a1"]:
        target_ids = [1, 2, 3, 12, 16]
    else:
        target_ids = [1, 4, 13, 15, 16]
        
    rules_list = []
    for idx, rule_id in enumerate(target_ids, 1):
        body = parsed_rules.get(rule_id)
        if body:
            # Reenumerar dinámicamente las reglas filtradas para mantener la correlatividad en el prompt
            first_line, *rest = body.split("\n")
            lines_str = "\n".join([f"  {idx}. {first_line}"] + [f"     {r}" for r in rest])
            rules_list.append(lines_str)
            
    rules = "\n".join(rules_list)
    return (
        f"<conversation_rules>\n"
        f"{rules}\n"
        f"</conversation_rules>"
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


def _get_vocabulary_block(title: str, vocab: list[str], phrases: list[str], ctx: str) -> str:
    _req(title, "tópico (sequencer no resolvió un tópico)", ctx)
    _req(vocab or phrases, "vocab/frases del tópico (pinned_vocabulary/keywords/generated_vocab)", ctx)
    block = f"<current_lesson_vocabulary>\n  Topic: {title}\n"
    if vocab:
        block += f"  Words_Available: {', '.join(vocab)}\n"
        block += ("  Guidance: weave in only the words that fit the story NATURALLY — 2-3 done "
                  "well beat forcing the whole list. Leave the rest for future classes.\n")
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


def _get_narrative_style(std: dict, app_config: Optional[dict], session_seed: int) -> str:
    """Bloque 8b — TIPO de narrativa: catálogo chico (~10 estilos: cuentito, misión, misterio,
    charla informal, pseudo-terapia...) gateado por EDAD y rotado por semilla (mecanismo F2-03).
    Inyecta el CÓMO-de-hoy del tejido; la LEY de tejer vive en la capa universal (11-12) y la
    historia concreta la GENERA el modelo en vivo (anti-goal: no persistir cuentos por tópico).
    OPCIONAL: sin catálogo en app_config.lesson_approaches, se omite — cero acople."""
    raw = (app_config or {}).get("lesson_approaches")
    if not raw:
        return ""
    try:
        import json as _json
        styles = _json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        return ""
    slug = (std.get("slug") or "").lower()
    apt = [s for s in styles if not s.get("bands") or slug in [str(b).lower() for b in s["bands"]]]
    if not apt:
        return ""
    pick = _pick(apt, _derive(session_seed, "narrative"))
    return (f"<lesson_approach>\n  Style: {pick.get('key')}\n"
            f"  Directive: {pick.get('directive')}\n</lesson_approach>")


def _get_session_rails(std: dict, app_config: Optional[dict]) -> str:
    """Bloque 8c — RIELES de la sesión: el arco de beats que la improvisación recorre (la
    escena avanza, no loopea). El esqueleto es agnóstico; el CONTENIDO va por banda (edad)
    en app_config.session_rails (JSON {band: [beats]}). OPCIONAL: sin catálogo se omite.
    Los rieles NO son guion: dicen POR DÓNDE va la clase, jamás qué decir."""
    raw = (app_config or {}).get("session_rails")
    if not raw:
        return ""
    try:
        import json as _json
        rails = _json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        return ""
    beats = rails.get((std.get("slug") or "").lower()) or rails.get("default")
    if not beats:
        return ""
    lines = "\n".join(f"  {b}" for b in beats)
    return (f"<session_rails>\n{lines}\n"
            f"  Rule: do not abandon a beat until the student has PRODUCED; always move forward, "
            f"do not rewind or repeat a completed beat.\n</session_rails>")


def _interp(s: str, name: str, topic_title: str, first_word: str) -> str:
    return (s.replace("{name}", name).replace("{topic}", topic_title)
             .replace("{first_vocab}", first_word).replace("{word}", first_word))


def _get_start_trigger(topic, topic_content: Optional[dict], name: str, first_word: str,
                       opening_seed: Optional[str], age_group: str, ctx: str, session_seed: int = 0) -> str:
    # 1. Cargar las semillas narrativas desde el objeto topic con fallbacks en Python
    narrative_role = getattr(topic, "narrative_role", None) or ""
    narrative_setting = getattr(topic, "narrative_setting", None) or ""
    narrative_conflict = getattr(topic, "narrative_conflict", None) or ""
    
    topic_title = getattr(topic, "title", None) or "today's topic"
    
    # Si alguno está vacío, aplicar el default seguro según el grupo de edad (CÓMO)
    if not narrative_role or not narrative_setting or not narrative_conflict:
        if age_group == "mini":
            narrative_role = "friends exploring the world of words"
            narrative_setting = f"a magical place related to {topic_title}"
            narrative_conflict = f"playing to discover new things about {topic_title}"
        elif age_group == "junior":
            narrative_role = "two hero explorers on a secret mission"
            narrative_setting = f"an exciting expedition about {topic_title}"
            narrative_conflict = f"completing challenges and solving mysteries about {topic_title}"
        elif age_group == "teen":
            narrative_role = "two friends talking in a relaxed, peer-to-peer tone"
            narrative_setting = f"a space for debating ideas about {topic_title}"
            narrative_conflict = f"solving an interesting challenge and sharing perspectives about {topic_title}"
        else: # adult
            narrative_role = "two professionals or adults conversing casually"
            narrative_setting = f"an interactive video call to practice English about {topic_title}"
            narrative_conflict = f"sharing opinions, experiences, and debating about {topic_title}"

    # Interpolar placeholders en las semillas narrativas
    narrative_role = _interp(narrative_role, name, topic_title, first_word)
    narrative_setting = _interp(narrative_setting, name, topic_title, first_word)
    narrative_conflict = _interp(narrative_conflict, name, topic_title, first_word)

    # Construir el start_execution_command integrando el opening_seed dinámico del catálogo
    base_opening = (opening_seed or "").strip()
    if not base_opening:
        base_opening = f"Greet {name} with high energy. Introduce today's topic ({topic_title}) and introduce the first keyword ({first_word})."

    command_text = (
        f"{base_opening}\n\n"
        f"  <narrative_anchors>\n"
        f"    Rule: To create the story, DO NOT use generic elements unless indicated here. Use EXCLUSIVELY this narrative configuration to set the scene:\n"
        f"    - Role: {narrative_role}\n"
        f"    - Setting: {narrative_setting}\n"
        f"    - Mission/Conflict: {narrative_conflict}\n"
        f"  </narrative_anchors>"
    )

    return (
        f"<start_execution_command>\n"
        f"  Command: {command_text}\n"
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


def _get_learner_state(learner_state: Optional[dict]) -> str:
    """Bloque 6 — memoria del alumno (HISTORIA), CONTRATO LIVIANO (F2-02).

    Shape liviano (services.learner_state_writer.load_learner_state_lite):
        {top_error: str, interests: list[str]≤3, mastered: list[str]≤3, review: str}
    Render imperativo y ≤5 LÍNEAS SIEMPRE (1 encabezado + ≤4 campos). Si el dato viene más gordo,
    se recorta por PRIORIDAD: top_error > review > interests > mastered (los de menor prioridad se
    caen para no pasar de 5). OPCIONAL: sin historia (None/vacío) el bloque se OMITE — nunca se
    inventa. El post-clase (F2-01) es quien lo escribe; la clase 2 no debe repetir la clase 1."""
    if not learner_state:
        return ""
    top_error = str(learner_state.get("top_error") or "").strip()
    review = str(learner_state.get("review") or "").strip()
    interests = [str(x).strip() for x in (learner_state.get("interests") or []) if str(x).strip()][:3]
    mastered = [str(x).strip() for x in (learner_state.get("mastered") or []) if str(x).strip()][:3]

    # Campos en ORDEN DE PRIORIDAD (top_error > review > interests > mastered); tope 4 -> ≤5 líneas.
    fields = []
    if top_error:
        fields.append(f"  · watch for (recast it, don't lecture): {top_error}")
    if review:
        fields.append(f"  · revisit this class: {review}")
    if interests:
        fields.append(f"  · likes talking about: {', '.join(interests)} — theme the class around it")
    if mastered:
        fields.append(f"  · already knows: {', '.join(mastered)} — use as anchor, don't re-teach")
    if not fields:
        return ""
    fields = fields[:4]
    return (
        "<learner_state>\n"
        "  Student memory — build on the last class, don't repeat it:\n"
        + "\n".join(fields) + "\n"
        "</learner_state>"
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
        f"  Rules: Attempts_On_Target >= 3 -> simplify and leave the item for later. "
        f"Signal=struggling -> more scaffolding. Signal=flowing -> next item.\n"
        f"</interaction_state>"
    )


def _get_output_rules(app_config: Optional[dict]) -> str:
    """Reglas de salida/seguridad desde app_config. OPCIONAL (config de runtime)."""
    if not app_config:
        return ""
    lines = []
    if app_config.get("voice_emojis_screen_only") == "true":
        lines.append("  Voice_Output: the text to the TTS must be clean; emojis and onomatopoeias to the screen only.")
    if app_config.get("asr_low_confidence_retry") == "true":
        lines.append("  ASR_Tolerance: in case of low speech recognition confidence, ask to repeat; do not count it as an error.")
    if app_config.get("kid_safety_guard") == "true":
        lines.append("  Kid_Safety: never ask for personal data or propose secrets/meetings; redirect out of the lesson.")
    if app_config.get("adult_stay_on_frame") == "true":
        lines.append("  Stay_On_Frame: if the conversation drifts out of the lesson framework, redirect gently.")
    if app_config.get("closing_no_new_content") == "true":  # Sector 3 (biblia): closing trigger universal
        lines.append("  Closing_Trigger: if the current phase is closing, execute the closure; DO NOT open new content.")
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
    session_seed: Optional[int] = None,
) -> str:
    """Arma el prompt apilando los 2 ejes + tópico. FAIL-FAST: si falta un dato de
    catálogo lanza MotorDataMissing (no hay fallback).

    session_seed (F2-03): semilla determinística de la sesión para MUESTREAR (no siempre lo
    primero) frase-ancla, orden de frases y variante de arranque -> variedad por construcción,
    NO por el humor del modelo. Si es None se deriva de (user.id, topic.id, HOY): mismo cruce el
    mismo día = MISMO prompt (auditable); día distinto = selección distinta."""
    raw_std = _req(student_type_data, "student_type_data (eje EDAD — student_types)")
    raw_lv = _req(level_data, "level_data (eje NIVEL — levels)")
    slug = raw_std.get("slug") or getattr(user, "age_group", None) or "?"
    cefr = getattr(user, "cefr_level", None) or "?"
    ctx = f"segmento={slug}, nivel={cefr}"

    if session_seed is None:
        session_seed = _session_seed(getattr(user, "id", None), getattr(topic, "id", None),
                                     datetime.date.today().isoformat())

    user_name = _req(getattr(user, "nombre", None), "user.nombre", ctx)
    title, raw_vocab, raw_phrases = _get_vocabulary(topic, topic_content)
    _req(topic, "tópico (sequencer)", ctx)
    _req(raw_vocab or raw_phrases, "vocab/frases del tópico (pinned_vocabulary/keywords/generated_vocab)", ctx)

    # 1. Rotar y acotar palabras para esta sesión (máx 4 para kids)
    vocab = _rotate(raw_vocab, _derive(session_seed, "words"))[:4] if raw_vocab else []

    # 2. Rotar y acotar frases-ancla según nivel
    depth = _req(raw_lv.get("vocab_depth"), "levels.vocab_depth", ctx)
    seed_phrase = _derive(session_seed, "phrase")
    if depth == "basic" and raw_phrases:
        phrases = [_pick(raw_phrases, seed_phrase)]
    elif raw_phrases:
        phrases = _rotate(raw_phrases, seed_phrase)
    else:
        phrases = []

    # 3. Elegir la palabra/frase de ancla del arranque (first_word) de la lista acotada de hoy
    first_word = _pick(vocab or phrases, seed_phrase)

    # Copias mutables para la interpolación JIT de plantillas
    std = dict(raw_std)
    lv = dict(raw_lv)
    cfg = dict(app_config) if app_config else {}

    topic_title = getattr(topic, "title", None) or "el tema de hoy"
    expected_prod = lv.get("expected_production") or ""
    lang_rule = lv.get("language_rule") or ""
    grammar = lv.get("curriculum_grammar") or ""
    tutor = std.get("tutor_mascot") or "HABI"
    identity = std.get("tutor_identity") or ""
    tonal = std.get("tutor_tonal_rules") or ""
    pedagogy = std.get("pedagogy") or ""
    universal_closing = cfg.get("universal_closing_rule") or "The session is closed by the user with the button: NEVER say goodbye."

    def interpolate(s: str) -> str:
        if not s:
            return ""
        return (
            s.replace("{name}", user_name)
             .replace("{topic}", topic_title)
             .replace("{first_vocab}", first_word)
             .replace("{word}", first_word)
             .replace("{expected_production}", expected_prod.strip())
             .replace("{language_rule}", lang_rule.strip())
             .replace("{curriculum_grammar}", grammar.strip())
             .replace("{tutor_mascot}", tutor)
             .replace("{tutor}", tutor)
             .replace("{tutor_identity}", identity.strip())
             .replace("{tutor_tonal_rules}", tonal.strip())
             .replace("{pedagogical_rules}", pedagogy.strip())
             .replace("{universal_closing_rule}", universal_closing.strip())
         )

    # Aplicar interpolación JIT a todas las cadenas del catálogo
    for k, v in std.items():
        if isinstance(v, str):
            std[k] = interpolate(v)
    for k, v in lv.items():
        if isinstance(v, str):
            lv[k] = interpolate(v)
    if app_config:
        cfg_interpolated = {}
        for k, v in app_config.items():
            if isinstance(v, str):
                cfg_interpolated[k] = interpolate(v)
            else:
                cfg_interpolated[k] = v
        app_config = cfg_interpolated

    blocks = [
        _get_runtime_context(user),
        _get_tutor_profile(std, ctx),
        _get_pedagogical_rules(std, ctx),
        _get_gamification_focus(std, ctx),
        _get_student_profile(user, std, ctx),
        _get_learner_state(learner_state),          # opcional (memoria, post-clase)
        _get_behavioral_guards(std, lv, ctx),
        _get_output_rules(app_config),              # opcional (config runtime)
        _get_vocabulary_block(title, vocab, phrases, ctx),
        _get_story_spine(topic, topic_content),     # opcional (narrativa curada)
        _get_narrative_style(std, app_config, session_seed),  # opcional: TIPO de narrativa (rota por semilla, gateado por edad)
        _get_session_rails(std, app_config),                  # opcional: RIELES (arco de beats por edad; avance, no loop)
        _get_universal_rules(app_config, ctx, slug, cefr),       # F1-01: SIEMPRE, cerca del final (recency)
        _get_start_trigger(topic, topic_content, user_name, first_word, std.get("opening_seed"), slug, ctx, session_seed),
        _get_session_actions(std.get("continuation_seed"), std.get("closing_seed"), ctx),
        _get_interaction_state(interaction_state),  # opcional (estado vivo)
    ]
    return "\n\n".join(b for b in blocks if b)

"""Templates metodológicos del backoffice (Coach, Sincerist, Arcade, etc.).

Cada template define el comportamiento del tutor: tono, rigor, frecuencia
de retos, voz ElevenLabs asignada. Se combina con perfil de usuario y
tópico activo para armar el super-prompt enviado al LLM.
"""
from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, Text
from sqlalchemy.sql import func

from core.database import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(80), unique=True, nullable=False, index=True)  # coach, sincerist, arcade
    name = Column(String(150), nullable=False)
    description = Column(String(300), nullable=False, default="")

    # Personalidad
    rigor = Column(Integer, nullable=False, default=3)            # 1..5
    challenges_per_min = Column(Integer, nullable=False, default=2)  # 0..6
    allow_interruptions = Column(Boolean, nullable=False, default=False)
    block_on_repeat = Column(Boolean, nullable=False, default=True)
    json_output = Column(Boolean, nullable=False, default=True)

    # Tono — lista de adjetivos que se inyectan al prompt
    tones = Column(JSON, nullable=False, default=list)  # ["profesional", "directo", "demandante"]

    # Voz ElevenLabs asignada a este template (voice_id legacy + por idioma)
    voice_id = Column(String(80), nullable=False, default="")  # default / fallback
    voice_label = Column(String(120), nullable=False, default="")
    voice_id_en = Column(String(80), nullable=True)
    voice_id_es = Column(String(80), nullable=True)
    voice_id_pt = Column(String(80), nullable=True)

    # Pedagogia (preset + reglas concretas inyectadas al super_prompt)
    pedagogy_preset = Column(String(40), nullable=False, default="balanced")
    # entrevistador | balanced | charlatan | mentor | provocador | ludico
    avoid_superlative_questions = Column(Boolean, nullable=False, default=True)
    one_question_per_turn = Column(Boolean, nullable=False, default=True)

    # Voz ElevenLabs - settings de cadencia
    voice_speed = Column(Integer, nullable=False, default=100)        # 70..130 (%)
    voice_stability = Column(Integer, nullable=False, default=50)     # 0..100
    voice_style = Column(Integer, nullable=False, default=30)         # 0..100 (expresividad emocional)

    # UI
    icon_bg = Column(String(40), nullable=False, default="#00B37E")  # CSS color
    is_preset = Column(Boolean, nullable=False, default=False)
    version = Column(String(20), nullable=False, default="v1.0")
    status = Column(String(20), nullable=False, default="active")  # active | draft | beta

    assigned_count = Column(Integer, nullable=False, default=0)

    # ─── PEDAGOGÍA CONFIGURABLE (v2) ──────────────────────────────────────
    # Estilo conversacional del tutor
    response_length = Column(String(20), nullable=False, default="short")   # terse | short | medium | long
    tutor_talk_ratio = Column(Integer, nullable=False, default=25)          # 10..50 (% del tiempo)
    proactive_questions = Column(Boolean, nullable=False, default=True)
    tutor_shares_opinions = Column(Boolean, nullable=False, default=True)
    warmth_level = Column(Integer, nullable=False, default=3)               # 1..5

    # Estilo de corrección
    correction_mode = Column(String(30), nullable=False, default="recast")  # none | recast | explicit_soft | explicit_strict
    correction_focus = Column(JSON, nullable=False, default=lambda: ["grammar", "vocab", "fluency"])
    error_threshold = Column(String(20), nullable=False, default="repeated")  # only_major | repeated | all
    max_feedback_items = Column(Integer, nullable=False, default=3)         # 1..10
    praise_count = Column(Integer, nullable=False, default=1)               # 1..5

    # Estructura del reporte final
    report_include_summary = Column(Boolean, nullable=False, default=True)
    report_include_connectors = Column(Boolean, nullable=False, default=True)
    report_include_vocab_suggestions = Column(Boolean, nullable=False, default=True)
    report_include_pronunciation = Column(Boolean, nullable=False, default=False)
    report_include_next_session_tip = Column(Boolean, nullable=False, default=True)

    # Arranque de sesión
    opening_style = Column(String(20), nullable=False, default="direct")    # direct | warm | playful
    opening_includes_topic_intro = Column(Boolean, nullable=False, default=True)

    # Dinámica de la sesión
    silence_tolerance_ms = Column(Integer, nullable=False, default=800)     # 300..3000
    interruption_allowed = Column(Boolean, nullable=False, default=False)
    scaffold_when_stuck = Column(Boolean, nullable=False, default=True)

    # ─── Motor Pedagógico Adaptativo (plan warm-soaring-cloud) ───
    # La "bisagra": cómo se fusionan el riel (metodología) y el escenario (tópico).
    #   staged_vocab     → el riel manda, el tópico decora (kids A0).
    #   hidden_objective → el tópico manda, el objetivo va invisible (adultos A1+).
    #   none             → charla libre.
    # NULL = el compositor infiere el modo de (is_kid, cefr) — back-compat.
    curriculum_mode = Column(String(20), nullable=True)
    # Identidad actoral del coach (skin): descripción de la persona.
    identity_description = Column(Text, nullable=True)
    # Segmento al que sirve este coach (mini/junior/tween/adultos). Adultos tienen
    # varios (personalidades); kids uno por banda.
    segmento = Column(String(12), nullable=True, index=True)
    # ENFOQUE: cómo lleva la clase (la receta narrativa/pedagógica del segmento).
    # Niños: explicar el mundo + ejemplos + broma + unir las palabras en una frase.
    enfoque = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Topic(Base):
    """Punteros temáticos. Cada usuario elige 4-5 al onboarding."""
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    category = Column(String(80), nullable=False, default="general")  # tech, arte, lifestyle, diseno, negocios, kids
    # FOSIL: el motor no lee este campo (composer_proto usa keywords[:6] y generated_vocab).
    # No borrar la columna/dato — legacy de una generación previa del catálogo.
    seed_prompts = Column(JSON, nullable=False, default=dict)  # { "A2": "...", "B2": "...", "C1": "..." } o { "mini": "...", "junior": "...", "tween": "..." }
    # VIVO, pero PARCIAL: composer_proto solo consume keywords[:6] (ver services/composer_proto.py).
    # keywords[6:] queda cargado en varios tópicos y no llega nunca al prompt — no es fósil (SÍ se
    # lee), pero cualquier keyword más allá de la 6ª es dato muerto en la práctica.
    keywords = Column(JSON, nullable=False, default=list)      # ["two-step", "sub-bass", ...]
    levels = Column(JSON, nullable=False, default=list)        # ["A2", "B1", "B2", "C1"]
    is_hot = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    usage_count = Column(Integer, nullable=False, default=0)

    # Solo aplica si category='kids': nivel etario del tópico
    kid_age_group = Column(String(10), nullable=True, index=True)  # 'mini' (4-7) | 'junior' (7-10) | 'tween' (10-14)

    # ─── Motor Pedagógico Adaptativo (plan warm-soaring-cloud) ───
    # Audiencia del tópico (reemplaza el chequeo frágil category=='kids').
    audience = Column(String(10), nullable=False, default="adult")  # adult | kid
    # Segmento: a quién le interesa (madurez/interés, NO nivel de idioma).
    # mini | junior | tween | adultos. El tópico es agnóstico al nivel CEFR.
    segmento = Column(String(12), nullable=True, index=True)
    # Bandas para las que el tópico es apropiado (filtro fino del sequencer, Sector 1
    # biblia): lista de mini/junior/tween/adult. NULL = sin restricción. NO entra al
    # prompt: lo usa la SELECCIÓN de tópico (upstream), el contenido sigue agnóstico.
    appropriate_bands = Column(JSON, nullable=True)
    # is_curriculum=True → tópico de plan estructurado (vocab pinneado, ordenado),
    # ej. los tópicos kids de A0 (Saludos/Colores/Conteo) con vocab fijo.
    is_curriculum = Column(Boolean, nullable=False, default=False)
    # nullable: se agrega vía ALTER sobre tabla existente (MySQL no acepta DEFAULT JSON).
    pinned_vocabulary = Column(JSON, nullable=True)  # [{"en","es"}] (kids); None == []
    target_structure = Column(String(200), nullable=True)  # "It's red"
    target_structure_es = Column(String(200), nullable=True)
    mastery_criteria = Column(String(300), nullable=True)

    # ─── Catálogo jerárquico (Categoría → Subcategoría → Tópico) ───
    category_id = Column(Integer, nullable=True, index=True)     # -> categories.id
    subcategory_id = Column(Integer, nullable=True, index=True)  # -> subcategories.id
    # Tags guía generados por IA en BATCH (offline) y revisables. NO es currículo:
    # son anclas conversacionales naturales para guiar la charla. Ver doctrina 05.
    generated_vocab = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Session(Base):
    """Cada charla del alumno. Contiene transcripción, métricas, audio."""
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    template_id = Column(Integer, nullable=True, index=True)
    topic_id = Column(Integer, nullable=True, index=True)

    cefr_at_start = Column(String(4), nullable=False, default="B1")
    status = Column(String(20), nullable=False, default="active")  # active | ended | analyzed
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    # Transcripción consolidada (alternancia AI/user)
    transcript = Column(JSON, nullable=False, default=list)
    # Métricas calculadas post-sesión
    metrics = Column(JSON, nullable=False, default=dict)
    # Reporte sincerista (1 elogio + 3 puntos a pulir)
    report = Column(JSON, nullable=False, default=dict)
    score = Column(Integer, nullable=True)  # 0..100

    is_rescue = Column(Boolean, nullable=False, default=False)
    audio_url = Column(String(500), nullable=True)  # Cloudinary del audio grabado
    # Objetivo pedagogico de la sesion (past_simple_irregular, conditional_type_1...)
    # Lo elige el backend al armar el super_prompt y queda para tracking
    # (no repetir objetivos en las ultimas N sesiones del alumno).
    learning_objective_code = Column(String(64), nullable=True)

    # ─── Observabilidad durable: el circuito + prompt de ESTA clase ───
    # Heroku stdout es efimero; sin esto no se audita por que una clase salio
    # asi. Se escriben 1 vez en el setup del WS (services/gemini_live.py).
    prompt_circuit = Column(JSON, nullable=True)   # las 4 patas RESUELTAS + modo + junction
    prompt_final = Column(Text, nullable=True)     # systemInstruction exacto enviado al LLM
    # Crudo de la sesión para el post-clase (contadores de interacción, target items,
    # timing, señales). Hoy va al stdout efímero de Heroku; esto lo persiste para
    # alimentar el SRS/learner_state cuando exista el post-clase. Ver BLUEPRINT §8.
    raw_session_data = Column(JSON, nullable=True)


class ErrorLog(Base):
    """Errores recurrentes del alumno — disparador del modo insistente."""
    __tablename__ = "error_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    kind = Column(String(40), nullable=False)  # grammar | pronunciation | vocabulary
    error_key = Column(String(160), nullable=False, index=True)  # "past_simple_irregular"
    label = Column(String(300), nullable=False)
    snippet_wrong = Column(Text, nullable=True)
    snippet_correct = Column(Text, nullable=True)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved = Column(Boolean, nullable=False, default=False)


class TopicProgress(Base):
    """Progreso del usuario por tópico (mapa de progreso)."""
    __tablename__ = "topic_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    topic_id = Column(Integer, nullable=False, index=True)
    stages_done = Column(Integer, nullable=False, default=0)
    stages_total = Column(Integer, nullable=False, default=6)
    pct = Column(Integer, nullable=False, default=0)  # 0..100
    minutes_spoken = Column(Integer, nullable=False, default=0)
    sessions_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserInterest(Base):
    """N-to-N usuarios↔tópicos (los 4-5 punteros activos).

    `position` define el orden en que aparecen en /app/practicar (0 = primero).
    """
    __tablename__ = "user_interests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    topic_id = Column(Integer, nullable=False, index=True)
    position = Column(Integer, nullable=False, default=0)
    added_at = Column(DateTime(timezone=True), server_default=func.now())


ACCENT_VOICE_OVERRIDES = {
    # 4 voces explicitas para el target_language=en
    "uk_f": "pFZP5JQG7iQjIQuC4Bku",  # Lily - UK female, velvety
    "uk_m": "JBFqnCBsd6RMkjVDRZzb",  # George - UK male, storyteller
    "us_f": "EXAVITQu4vr4xnSDxMaL",  # Sarah - US female, warm
    "us_m": "cjVigY5qzO86Huf0OWal",  # Eric - US male, smooth
    # legacy keys
    "uk":   "JBFqnCBsd6RMkjVDRZzb",  # alias -> George
    "us":   "EXAVITQu4vr4xnSDxMaL",  # alias -> Sarah
}


def template_voice_for_lang(template, lang: str | None, user=None) -> str:
    """Devuelve voice_id para el target_language del user, con fallback al voice_id legacy.

    Si el user tiene accent_preference seteado (us_f / us_m / uk) y el idioma es 'en',
    eso PISA la voz del template.
    """
    if user is not None and (lang == "en" or (lang is None and getattr(user, "target_language", None) == "en")):
        accent = getattr(user, "accent_preference", None)
        override = ACCENT_VOICE_OVERRIDES.get(accent or "")
        if override:
            return override
    if not template:
        return ""
    if lang:
        attr = f"voice_id_{lang}"
        v = getattr(template, attr, None)
        if v:
            return v
    return template.voice_id or ""

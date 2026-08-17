"""Estado del alumno — tablas de MEMORIA del motor adaptativo.

Son las que le dan memoria al sistema (patitas 10/11 del compositor + SRS). El
POST-CLASE (módulo futuro) las ESCRIBE; el camino de la ida persiste el crudo en
`sessions.raw_session_data` para alimentarlas. Hoy se crean vacías: estructura
lista para cuando se construya el post-clase. Ver docs/BLUEPRINT_modelo_y_seed.md §8.
"""
from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.sql import func

from core.database import Base


class LearnerState(Base):
    """HISTORIA del alumno — el 3er pilar del motor, ULTRA LIVIANO (una fila por alumno).

    Lo ESCRIBE el post-clase (F2-01, `services.learner_state_writer`) destilando el
    transcript con UNA llamada batch a Gemini; lo LEE el composer (F2-02) para armar el
    bloque 6 (`<learner_state>`). Diseño settled: NO se vuelca el JSON entero de errores —
    solo lo accionable para que la clase 2 no repita la clase 1, sin engordar el contexto.

    ══════════════════════════════════════════════════════════════════════════════════
    CONTRATO DEL FORMATO (lo que F2-02 va a LEER — tiene que calzar EXACTO)
    ══════════════════════════════════════════════════════════════════════════════════
    La representación canónica en memoria es un dict (lo devuelve `load_learner_state_lite`
    y lo consume/escribe `merge_learner_state`). TODO el texto va en INGLÉS, lenguaje de
    profe, frases cortas (son directivas para el coach, no prosa):

        {
          "top_error":  str,        # 1 solo. El error MÁS accionable a vigilar. "" si no hay.
                                    #   ej: "drops articles: 'I have dog'"
          "interests":  list[str],  # ≤ 3. De qué le gusta hablar. Se ACUMULAN (cap 3).
                                    #   ej: ["dinosaurs", "space", "soccer"]
          "mastered":   list[str],  # ≤ 3. Lo que ya maneja (no re-enseñar; usar de ancla). ROTA.
                                    #   ej: ["greetings", "colors"]
          "review":     str,        # ≤ 1. La única cosa a repasar la próxima. "" si no hay.
                                    #   ej: "past simple: 'went' not 'goed'"
        }

    Reglas de MERGE al hacer upsert (una fila por `student_id`):
      · top_error → el nuevo REEMPLAZA (si vuelve a aparecer, refresca el slot); si el
        destilado no trae uno, se conserva el previo.
      · interests → se ACUMULAN con dedup case-insensitive, los más recientes primero, tope 3.
      · mastered  → ROTA: los nuevos entran adelante, los viejos salen, tope 3.
      · review    → el nuevo REEMPLAZA; si no hay nuevo, se conserva el previo.

    Prioridad de truncado (para F2-02, si hubiera que recortar el bloque):
        top_error > review > interests > mastered.

    Columnas persistidas: top_error/review como String (frase corta), interests/mastered
    como JSON (lista de strings). `updated_at` para auditoría.
    """
    __tablename__ = "learner_state"

    id = Column(Integer, primary_key=True, index=True)
    # Una fila por alumno POR MATERIA. Antes era `unique=True` sobre student_id — una sola bolsa
    # por alumno — y eso alcanzaba cuando el producto era una app de inglés. Con el motor
    # polimórfico mezclaba: lo que domina de inglés y lo que domina de informática caían juntos,
    # y `top_error` era el mismo para las dos. Mismo camino que ya hizo el nivel en `user_level`.
    student_id = Column(Integer, nullable=False, index=True)
    # Espacio de nombres compartido con user_level.materia, según el modelo de familias:
    #   familia `lenguaje`     -> la materia ES el idioma        ('en', 'fr', 'pt')
    #   familia `conocimiento` -> la materia es la disciplina    ('informatica', 'oficios')
    # NULL = historia vieja sin materia; se sigue leyendo como fallback.
    materia = Column(String(30), nullable=True, index=True)
    top_error = Column(String(255), nullable=False, default="")       # 1 · lenguaje de profe, EN
    interests = Column(JSON, nullable=False, default=list)             # ≤3 · acumula (cap 3)
    mastered = Column(JSON, nullable=False, default=list)              # ≤3 · rota
    review = Column(String(255), nullable=False, default="")          # ≤1 · reemplaza
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class VocabProgress(Base):
    """SRS por ítem de vocabulario — el motor de la retención (alimenta learner_state)."""
    __tablename__ = "vocab_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    item = Column(String(120), nullable=False)  # "dog", "it's a dog"
    skill_stage = Column(String(20), nullable=False, default="repeat")  # repeat|recognize|recall|use
    status = Column(String(20), nullable=False, default="new")  # new|learning|mastered
    seen_count = Column(Integer, nullable=False, default=0)
    success_count = Column(Integer, nullable=False, default=0)
    fail_count = Column(Integer, nullable=False, default=0)
    ease = Column(Float, nullable=False, default=2.5)  # factor tipo SM-2
    last_seen = Column(Date, nullable=True)
    next_review = Column(Date, nullable=True, index=True)  # el sequencer lo usa
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ReinforcementQueue(Base):
    """Cola de refuerzo — ítems trabados, los prioriza el sequencer."""
    __tablename__ = "reinforcement_queue"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    item = Column(String(120), nullable=False)
    reason = Column(String(80), nullable=True)  # failed_3x | pronunciation | confused_with:X
    priority = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())


class LearnerInterest(Base):
    """Intereses (declarados + DETECTADOS por el post-clase). Evolucionan de peso.
    Distinto de user_interests (N-to-N con topics): acá es texto libre con weight."""
    __tablename__ = "learner_interests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    interest = Column(String(120), nullable=False)  # "dinosaurios", "volcanes"
    source = Column(String(20), nullable=False, default="detected")  # declared | detected
    weight = Column(Float, nullable=False, default=0.5)  # sube cuando reaparece/engancha
    last_seen = Column(Date, nullable=True)


class LearnerTrait(Base):
    """Rasgos cualitativos del alumno inferidos por el post-clase (Mitad B)."""
    __tablename__ = "learner_traits"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    trait = Column(String(200), nullable=False)  # "se engancha con onomatopeyas espaciales"
    confidence = Column(Float, nullable=False, default=0.5)  # 0..1, sube al reaparecer
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SessionInsight(Base):
    """Insights cualitativos de cada clase (Mitad B del post-clase: 1 llamada LLM)."""
    __tablename__ = "session_insights"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    student_id = Column(Integer, nullable=False, index=True)
    summary = Column(Text, nullable=True)
    affective = Column(String(20), nullable=True)  # engaged | neutral | frustrated
    new_interests = Column(Text, nullable=True)     # JSON list (se guarda como texto)
    items_to_reinforce = Column(Text, nullable=True)  # JSON list
    suggested_topic = Column(String(200), nullable=True)
    traits = Column(Text, nullable=True)  # JSON [{trait, confidence}] de la Mitad B; se propaga al aprobar
    # Aprobación del profe (human-in-the-loop): pending hasta que el profe revise; al
    # aprobar se propaga a learner_interests / learner_traits / reinforcement_queue.
    status = Column(String(20), nullable=False, default="pending")  # pending | approved | discarded
    created_at = Column(DateTime, server_default=func.now())

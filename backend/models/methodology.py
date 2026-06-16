"""Metodología — el "riel" pedagógico por nivel (Motor Pedagógico Adaptativo).

Ontología nueva (plan warm-soaring-cloud):
  StudentType (Mini/Junior/Adult)  → segmento de madurez (la VÍA de entrega)
  MethodologyModule                → el riel por (tipo × nivel × orden): las
                                      auto-restricciones del coach + gramática
                                      objetivo + criterio de avance. ES la
                                      "metodología real" que hoy no existe como
                                      dato (vivía hardcodeada en learning_objectives.py
                                      + los OVERRIDE_RULES).
  TopicModuleContent               → junction tópico × módulo: adapta un tópico
                                      abstracto al nivel (seed, keywords, léxico).

`MethodologyStage` queda LEGACY: sus filas (Saludos/Colores/Conteo) son en
realidad TÓPICOS con vocab y migran a la tabla `topics`. No se borra hasta
verificar la migración en prod.
"""
from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text
from sqlalchemy.sql import func

from core.database import Base


class StudentType(Base):
    """Segmento de madurez del alumno (la VÍA de entrega del mismo nivel).

    Un mini-A1 y un tween-A1 comparten el objetivo lingüístico (nivel) pero
    divergen en la ENTREGA (juego vs reto vs charla adulta). Catálogo editable;
    raíz del árbol del backoffice (ReactFlow).
    """
    __tablename__ = "student_types"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(20), unique=True, nullable=False, index=True)  # mini | junior | tween | adult
    name = Column(String(80), nullable=False)  # "Mini (4-7)", "Adulto"
    description = Column(String(300), nullable=False, default="")
    age_min = Column(Integer, nullable=True)
    age_max = Column(Integer, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)
    # Bloques 2-4 del compositor: quién es el tutor y cómo lleva la clase.
    tutor_mascot = Column(String(120), nullable=True)
    tutor_identity = Column(Text, nullable=True)
    tutor_tonal_rules = Column(Text, nullable=True)
    session_focus = Column(Text, nullable=True)
    # Cierre suave (biblia 9 pasos, nota 02): semilla de la frase de cierre por
    # segmento. El LLM la usa de guía; no es verbatim. Ver docs/mejoras_pedagogicas/03.
    closing_seed = Column(Text, nullable=True)
    # Plantillas de arranque/desarrollo por banda (doc 11 §1.4), como dato.
    opening_seed = Column(Text, nullable=True)
    continuation_seed = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class MethodologyModule(Base):
    """El RIEL por nivel: las reglas de oro que blindan al coach del 'vía libre'.

    Una fila = un peldaño del aprendizaje para un (student_type, level, orden).
    `ai_restraints` es el corazón: las auto-restricciones del habla de la IA
    ("en A0 solo 1-3 palabras", "en A1 prohibido el pasado"). Unifica lo que hoy
    está partido entre learning_objectives.py (qué empujar) y los OVERRIDE_RULES.
    """
    __tablename__ = "methodology_modules"

    id = Column(Integer, primary_key=True, index=True)
    # Referencias por slug (consistente con User.age_group); 'adult' para grandes.
    student_type = Column(String(20), nullable=False, index=True)  # mini | junior | tween | adult
    level = Column(String(4), nullable=False, index=True)  # A0..C2
    module_order = Column(Integer, nullable=False, default=1)  # progresión dentro del (tipo,nivel)

    focus_name = Column(String(120), nullable=False)  # "Aislamiento fonético", "Presente continuo"
    # ai_restraints: las reglas limitantes que se inyectan al system prompt.
    ai_restraints = Column(Text, nullable=False, default="")
    target_grammar = Column(String(300), nullable=True)  # estructura exacta a empujar
    evaluation_criteria = Column(Text, nullable=True)  # hito de éxito para avanzar
    # Duración de la clase (Regla 1 biblia: atada a nivel × segmento). Bajo nivel
    # / chico = corta (se estrella). Alto nivel = se extiende. NULL = sin límite.
    max_session_minutes = Column(Integer, nullable=True)
    max_turns = Column(Integer, nullable=True)
    # Regla de IDIOMA del coach por nivel — campo propio (no apelmazado en ai_restraints).
    # A0 = 100% español salvo la palabra objetivo; ramping a 100% inglés en B2+. Es donde
    # vive el fix del "Now you". Lo renderiza el bloque 6 cuando se haga el wire.
    language_rule = Column(Text, nullable=True)

    # Heredado de learning_objectives.py (objetivo invisible adultos):
    modeling_examples = Column(JSON, nullable=False, default=list)  # frases modelo
    correction_hint = Column(Text, nullable=True)  # cómo recast sin explicar gramática
    # code estable para rotación/tracking (sessions.learning_objective_code).
    code = Column(String(64), nullable=True, index=True)
    # Repaso espaciado: codes de módulos previos a reintroducir (frágiles).
    spaced_review = Column(JSON, nullable=False, default=list)

    notes = Column(Text, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TopicModuleContent(Base):
    """La matriz de intersección: adapta un TÓPICO abstracto a un MÓDULO (nivel).

    Es el pegamento que hace que el mismo tópico ("Fútbol") se enseñe distinto en
    A0 ({ball, goal}) vs A1 present continuous ({running, passing}). Curado a mano
    para kids/A0-A1; para adultos se autogenera con Gemini on-demand (cacheado) o
    cae al fallback de Topic.seed_prompts.
    """
    __tablename__ = "topic_module_content"

    id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, nullable=False, index=True)
    module_id = Column(Integer, nullable=False, index=True)  # -> methodology_modules.id

    seed_prompt = Column(Text, nullable=True)  # disparador inicial adaptado al nivel
    required_keywords = Column(JSON, nullable=False, default=list)  # palabras clave del nivel
    allowed_vocabulary = Column(JSON, nullable=False, default=list)  # filtro de léxico (duro en A0/A1)

    # Bloques 8-9 del compositor: narrativa de la clase y comando de arranque.
    story_spine = Column(Text, nullable=True)      # "Sparky y Timo aterrizan frente a un T-Rex..."
    start_trigger = Column(Text, nullable=True)    # "Saludá a {name}, explicale que acaban de llegar..."

    is_generated = Column(Boolean, nullable=False, default=False)  # True = autogenerado por Gemini
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class MethodologyStage(Base):
    """LEGACY — son tópicos de kids con vocab (Saludos/Colores/Conteo), no método.
    Migran a `topics`. Se conserva hasta verificar la migración en prod.
    """
    __tablename__ = "methodology_stages"

    id = Column(Integer, primary_key=True, index=True)
    age_group = Column(String(10), nullable=False, index=True)  # mini | junior | tween
    cefr_level = Column(String(4), nullable=False, default="A0")
    order_index = Column(Integer, nullable=False, default=0)  # orden de progresión
    title = Column(String(120), nullable=False)  # "Saludos", "Colores", ...
    # Vocabulario: lista de {"en": "hello", "es": "hola"}.
    vocabulary = Column(JSON, nullable=False, default=list)
    target_structure = Column(String(200), nullable=True)  # "My name is ___"
    target_structure_es = Column(String(200), nullable=True)  # "Me llamo ___"
    mastery_criteria = Column(String(300), nullable=True)  # cuándo se da por aprendida
    notes = Column(Text, nullable=True)  # notas del pedagogo/admin
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Coach(Base):
    """La PERSONA del tutor — el 'quién enseña' (bloque 2 del compositor).

    Cada segmento tiene 2+ coaches (femenino y masculino): MISMA pedagogía,
    distinta personalidad + voz. El alumno elige; el género del alumno es solo el
    default sugerido. Separa el PERSONAJE (acá) de la PEDAGOGÍA (StudentType).
    """
    __tablename__ = "coaches"

    id = Column(Integer, primary_key=True, index=True)
    student_type = Column(String(20), nullable=False, index=True)  # mini|junior|tween|adult...
    gender = Column(String(10), nullable=False, default="female")  # female | male | neutral
    name = Column(String(80), nullable=False)  # único e identificable (Sparky, Nova, Lia...)
    identity = Column(Text, nullable=True)        # quién es (bloque 2 tutor_profile)
    personality = Column(Text, nullable=True)     # tono / reglas tonales (bloque 2)
    voice_name = Column(String(40), nullable=True)  # voz Gemini prebuilt (Aoede/Puck/Kore...)
    sort_order = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Level(Base):
    """Niveles CEFR con NOMBRE AMIGABLE para el usuario (no mostrar 'A1' pelado).

    Lo usa la UI (el alumno ve dónde está) y el selector de nivel del editor.
    """
    __tablename__ = "levels"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(4), unique=True, nullable=False, index=True)  # A0..C2
    friendly_name = Column(String(60), nullable=False)  # "Explorador", "Maestro"
    sort_order = Column(Integer, nullable=False, default=0)
    short_desc = Column(String(200), nullable=True)
    # Regla de IDIOMA del coach — vive ACÁ porque la mezcla ES/EN depende SOLO del
    # nivel (un A0 es español tenga 5 o 40 años). A0=100% español salvo la palabra
    # objetivo -> B2+=100% inglés. Es donde vive el fix del "Now you".
    language_rule = Column(Text, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Category(Base):
    """Categoría padre del catálogo de tópicos (Deportes, Arte, Tech…).

    Jerarquía determinística decidida por nosotros: Categoría → Subcategoría → Tópico.
    El tópico es agnóstico al nivel; esto es solo organización del catálogo.
    """
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(60), unique=True, nullable=False, index=True)
    name = Column(String(80), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Subcategory(Base):
    """Subcategoría (hija de una Categoría). El tópico cuelga de acá."""
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, nullable=False, index=True)  # -> categories.id
    slug = Column(String(80), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

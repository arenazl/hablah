"""Metodología — catálogos de los 2 EJES del motor de 9 pasos.

Modelo de 2 ejes que se APILAN (nunca se cruzan):
  StudentType (Mini/Junior/Tween/Adult) → EJE EDAD: el CÓMO se enseña (tutor +
                                            pedagogía + foco + forma + arranque).
  Level (A0..C2)                         → EJE NIVEL: el QUÉ se aprende (idioma
                                            ES/EN + currículum + producción).
  Coach                                  → la PERSONA del tutor (bloque 2).

Las tablas-cruce legacy (MethodologyModule / TopicModuleContent / MethodologyStage)
se ELIMINARON (2026-06-16): eran combinatoria por (tipo×nivel) que rompía el modelo
de 2 ejes. El motor compone el prompt apilando los catálogos, sin cruces.
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
    # ─── Pedagogía / forma por EDAD (el CÓMO se enseña; agnóstico del tópico y del
    # nivel). El QUÉ (currículum) vive en levels. Se APILA con el eje nivel, nunca
    # se cruza. Consolida lo que hoy está disperso (session_focus + presets). ───
    pedagogy = Column(Text, nullable=True)                  # gamificación, manejo del error, registro por edad
    form_rules = Column(Text, nullable=True)                # reglas de forma (nene: contexto/celebración; adulto: sin infantilizar)
    duration_adjust_minutes = Column(Integer, nullable=True)  # ajuste de duración por edad (+/- sobre la base del nivel)
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
    # ─── Currículum lingüístico por NIVEL (universal: B2 = voz pasiva igual tengas
    # 8 o 90 años). El QUÉ se aprende; el CÓMO (forma/pedagogía) vive en student_types.
    # Se APILA con el eje edad, nunca se cruza en una fila. ───
    curriculum_grammar = Column(Text, nullable=True)        # estructuras del nivel (qué se aprende)
    expected_production = Column(Text, nullable=True)       # qué produce el alumno (A0 sueltas -> C2 matices)
    duration_base_minutes = Column(Integer, nullable=True)  # duración base del nivel (+ ajuste por edad)
    # Profundidad de vocab/frases del tópico que entra en este nivel (Sector 2 biblia):
    # basic = solo la 1ª frase clave; full = todas. El tópico es el mismo; cambia la dosis.
    vocab_depth = Column(String(10), nullable=True)         # basic | full
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

"""
engine.py — núcleo determinista del Motor de Lenguaje Dinámico.

Funciones PURAS, sin dependencias externas y sin acceso a DB. Acá vive todo lo
crítico: presets por banda/nivel, el ensamblado del único prompt, el SRS y la
lógica del sequencer. La base de datos y la IA del post-clase se conectan afuera
(repository.py / pipeline.py), nunca acá.

Probalo sin DB:
    python engine.py
"""
from __future__ import annotations
import datetime
from dataclasses import dataclass, field
from typing import Optional


# ============================================================================
#  BANDAS DE EDAD + PRESETS  (capas 2, 3, 6 — tipo "P")
# ============================================================================
def age_band(age: int) -> str:
    if age <= 6:  return "early_child"
    if age <= 10: return "child"
    if age <= 17: return "teen"
    return "adult"


TUTOR = {  # capa 2: tutor_identity
    "early_child": ("Sparky", "un dragoncito espacial que recolecta estrellas de energía",
                    "Súper alegre, exclamativo, con onomatopeyas y emojis (solo en pantalla)."),
    "child":       ("Nova", "una exploradora compañera de aventuras",
                    "Entusiasta y curiosa; festeja cada logro."),
    "teen":        ("Leo", "un coach de idiomas cercano, sin disfraz infantil",
                    "Relajado, actual y motivador."),
    "adult":       ("Alex", "un profesor/host carismático",
                    "Claro, cordial y directo, con modismos naturales."),
}

PEDAGOGY = {  # capa 3: pedagogical_framework_preset
    "early_child": "Gamificación inmersiva y andamiaje directo. 0% gramática explícita. El error nunca se corrige de forma punitiva.",
    "child":       "Lúdico con mini-retos y recompensas. Gramática implícita, sin metalenguaje.",
    "teen":        "Comunicativo basado en sus intereses. Gramática contextual ligera.",
    "adult":       "Fluency first. No interrumpir por errores menores; anotar vicios en silencio para el cierre.",
}

RIELS = {  # capa 6: behavioral_guards (base por banda)
    "early_child": [
        "Prohibido hacer preguntas abiertas o comentarios libres en inglés.",
        "Flujo de 3 pasos: 1) 1 frase corta en inglés, 2) espejo inmediato en español, 3) pedir repetir 1 palabra clave.",
        "Máximo 30 palabras por turno.",
    ],
    "child": [
        "Solo preguntas cerradas y simples (yes/no, esto o aquello).",
        "Frases de 2 a 4 palabras; mantener el espejo en español tras cada frase nueva.",
        "Máximo 45 palabras por turno.",
    ],
    "teen": [
        "Preguntas abiertas simples permitidas; fomentar que produzca lenguaje.",
        "Reducir el español al mínimo; usarlo solo para destrabar.",
        "Conectar siempre con sus intereses.",
    ],
    "adult": [
        "Una sola pregunta o situación por turno.",
        "Si se traba más de 3 s, dar una pista o sinónimo, no la respuesta.",
        "Priorizar la continuidad del diálogo sobre la precisión estructural.",
    ],
}

LEVEL_MOD = {  # modificador por nivel sobre los rieles
    "A1": "Nivel A1: espejo en español SIEMPRE activo; vocabulario mínimo; máximo andamiaje.",
    "A2": "Nivel A2: espejo en español frecuente; frases cortas y concretas.",
    "B1": "Nivel B1: español solo si se traba; conversación guiada.",
    "B2": "Nivel B2: sin español (inmersión); corrección por recast.",
    "C1": "Nivel C1: sin español (inmersión); matices e idiomático; se admite el debate.",
}

_PACING_BASE = {"early_child": 3, "child": 4, "teen": 6, "adult": 8}  # minutos


def pacing_min(band: str, level: str) -> int:
    return _PACING_BASE[band] + (2 if level in ("B2", "C1") else 0)


def select_target(vocab: list[str], phrases: list[str], level: str) -> tuple[list[str], list[str]]:
    """Escala la dificultad del tópico por nivel."""
    if level in ("A1", "A2"):
        return vocab, phrases[:1]
    return vocab, phrases


# ============================================================================
#  GENERADORES DEL TRIGGER (capa 9 — apertura / desarrollo / cierre)
# ============================================================================
def _is_kid(band: str) -> bool:
    return band in ("early_child", "child")


def opening_action(band, name, topic_title, first_vocab) -> str:
    tutor_name = TUTOR[band][0]
    if _is_kid(band):
        return (f"Saludá a {name} con mucha energía como {tutor_name}, presentá el mundo de hoy "
                f"(\"{topic_title}\") y enganchá. Pedile repetir \"{first_vocab}\". Respetá el flujo de 3 pasos.")
    if band == "teen":
        return (f"Saludá a {name} de forma relajada como {tutor_name}, presentá el tema "
                f"(\"{topic_title}\") y abrí con una sola pregunta simple en inglés.")
    return (f"Presentate como {tutor_name} e iniciá en inglés. Saludá a {name}, dale la bienvenida, "
            f"presentá el escenario (\"{topic_title}\") y abrí con la primera consigna. Una sola pregunta por turno.")


def continuation_action(band, objective) -> str:
    if _is_kid(band):
        return ("Avanzá un paso por turno: 1 frase en inglés -> espejo en español -> pedir repetición. "
                "Nunca preguntas abiertas. Máx. 30 palabras.")
    if band == "teen":
        return "Sostené la charla con una sola pregunta/consigna por turno, español al mínimo, conectando con sus intereses."
    return (f"Mantené la conversación viva: una pregunta o situación por turno, sin castellano, con pistas si se "
            f"traba >3 s. Hacé avanzar hacia: {objective}.")


def closing_action(band, level, name, topic_title, objective, phrases) -> str:
    if _is_kid(band):
        return (f"Cerrá con calidez: repaso MUY breve (\"Hoy aprendimos sobre {topic_title}\"), festejá el logro y "
                f"enganchá (\"¿Jugamos un ratito más?\" / \"¡Nos vemos la próxima!\"). En español con alguna palabra en inglés.")
    if band == "teen":
        ph = phrases[0] if phrases else topic_title
        return (f"Cerrá en inglés simple: repaso breve (\"Today we practiced {ph}\"), un elogio corto y gancho "
                f"(\"Wanna keep going?\" / \"See you next time!\").")
    ph = '", "'.join(phrases) if phrases else objective
    return (f"Salí suavemente del marco. Repaso al nivel {level} de lo trabajado ({objective}: \"{ph}\"). "
            f"Entregá 1-2 correcciones de Recent_Errors (los vicios anotados en silencio), sin abrumar. "
            f"Gancho: \"Shall we continue with another situation?\" / \"Well done, {name} — see you next time!\".")


def focus_text(band, topic_title, objective) -> str:
    if _is_kid(band):
        return f"Misión lúdica sobre \"{topic_title}\": cada acierto da una recompensa."
    if band == "teen":
        return f"Charla guiada sobre \"{topic_title}\", conectada con lo que le gusta, para que produzca lenguaje."
    return f"Roleplay / escenario comunicativo sobre \"{topic_title}\" (objetivo: {objective})."


def narrative_phases(band) -> list[str]:
    if _is_kid(band):
        return ["Phase 1: Arrival (saludo + enganche con el mundo de hoy)",
                "Phase 2: Mission (juego con el vocabulario objetivo)",
                "Phase 3: Reward (logro y refuerzo)",
                "Phase 4: Session Close (mini-repaso + gancho)"]
    return ["Phase 1: Context Setup (apertura del escenario)",
            "Phase 2: Development (desarrollo de la conversación)",
            "Phase 3: Resolution (resolución del objetivo)",
            "Phase 4: Session Close (salir del marco: repaso + feedback + gancho)"]


# ============================================================================
#  ESTRUCTURAS DE ENTRADA AL COMPOSER
# ============================================================================
@dataclass
class Student:
    name: str
    age: int
    level: str
    interests: list[str] = field(default_factory=list)
    native_dialect: str = "es-AR"
    barrier: Optional[str] = None


@dataclass
class Topic:
    category: str
    subcategory: str
    title: str
    objective: str
    vocab: list[str]
    phrases: list[str]


@dataclass
class LearnerState:
    mastered: list[str] = field(default_factory=list)
    learning: list[str] = field(default_factory=list)
    due_for_review: list[str] = field(default_factory=list)
    recent_errors: list[str] = field(default_factory=list)


# ============================================================================
#  EL COMPOSER  —  arma UN solo prompt (concatenación determinista, sin IA)
# ============================================================================
def _block(tag: str, lines: list[str]) -> str:
    body = "\n".join("    " + ln for ln in lines)
    return f"  <{tag}>\n{body}\n  </{tag}>"


def compose_stack(student: Student, topic: Topic, learner: LearnerState,
                  *, target_date: Optional[datetime.date] = None) -> str:
    """Devuelve el <system_instruction_stack> completo, listo para mandar al modelo."""
    band = age_band(student.age)
    today = (target_date or datetime.date.today()).isoformat()
    tname, tpersona, ttone = TUTOR[band]
    vocab, phrases = select_target(topic.vocab, topic.phrases, student.level)
    guards = RIELS[band] + [LEVEL_MOD[student.level]]
    tgt = pacing_min(band, student.level)
    phases = narrative_phases(band)
    first_vocab = topic.vocab[0] if topic.vocab else topic.title

    blocks = [
        _block("runtime_context", [
            f"Current Date: {today}",
            "Target Language: English",
            f"Native Language: Spanish ({student.native_dialect}, Rioplatense)",
            "Interface Mode: Realtime Multimodal Voice Session",
            "Voice Output Rule: el texto al TTS va limpio (emojis y onomatopeyas solo a pantalla).",
        ]),
        _block("tutor_identity", [
            f"Character Persona: Sos {tname}, {tpersona}.",
            f"Tone: {ttone}",
        ]),
        _block("pedagogical_framework_preset", [
            f"Methodology: {PEDAGOGY[band]}",
        ]),
        _block("lesson_focus_engagement", [
            f"Gamification: {focus_text(band, topic.title, topic.objective)}",
        ]),
        _block("student_profile", [
            f"Name: {student.name}",
            f"Age: {student.age}",
            f"Language Level: {student.level}",
            f"Interests: {', '.join(student.interests) if student.interests else '—'}",
        ] + ([f"Barrier: {student.barrier}"] if student.barrier else [])),
        _block("learner_state", [
            f"Mastered: [{', '.join(learner.mastered)}]",
            f"Learning: [{', '.join(learner.learning)}]",
            f"Due_For_Review: [{', '.join(learner.due_for_review)}]",
            f"Recent_Errors: [{', '.join(learner.recent_errors) if learner.recent_errors else '—'}]",
        ]),
        _block("behavioral_guards",
            [f"Rule {i+1}: {g}" for i, g in enumerate(guards)] + [
                f"Rule {len(guards)+1} (ASR tolerance): si el ASR llega con baja confianza, pedí repetir; no lo cuentes como error.",
                f"Rule {len(guards)+2} (Stay on frame): si deriva a temas fuera de la clase, redirigí con tacto.",
                f"Rule {len(guards)+3} (Closing trigger): si Current_Phase = \"Phase 4\", ejecutá Closing_Action; no inicies contenido nuevo.",
            ]),
        _block("current_topic_vocabulary", [
            f"Category: {topic.category}",
            f"Subcategory: {topic.subcategory}",
            f"Topic Title: {topic.title}",
            f"Target Objective: {topic.objective}",
            f"Key Vocabulary: [{', '.join(vocab)}]",
            f"Key Phrases: [{', '.join(phrases)}]",
        ]),
        _block("narrative_spine", [
            f"Pacing: duración objetivo ~{tgt} min (por banda + nivel; ajustable por preferencia).",
            "Session Structure:",
        ] + [f"  - {p}" for p in phases] + ["Current Phase: Phase 1"]),
        _block("interaction_state", [
            "Turn: 1",
            f"Elapsed_Min: 0 / target {tgt}",
            "Signal: idle",
            "Current_Phase: Phase 1",
        ]),
        _block("execution_trigger", [
            "Phase_Aware: la acción depende de interaction_state.Current_Phase. Las tres viajan en este prompt.",
            f"Opening_Action (Phase 1): {opening_action(band, student.name, topic.title, first_vocab)}",
            f"Continuation_Action (Phases 2-3): {continuation_action(band, topic.objective)}",
            f"Closing_Action (Phase 4): {closing_action(band, student.level, student.name, topic.title, topic.objective, phrases)}",
        ]),
    ]
    return "<system_instruction_stack>\n\n" + "\n\n".join(blocks) + "\n\n</system_instruction_stack>"


# ============================================================================
#  SRS — mitad determinista del post-clase (sin IA)
# ============================================================================
def srs_update(item: dict, result: str, today: Optional[datetime.date] = None) -> dict:
    """
    Actualiza una fila de vocab_progress según el resultado del turno.
    item: dict con seen_count, success_count, fail_count, ease, status, next_review, last_seen
    result: "ok" | "struggled" | "fail"
    """
    today = today or datetime.date.today()
    item["seen_count"] = item.get("seen_count", 0) + 1
    if result == "ok":
        item["success_count"] = item.get("success_count", 0) + 1
        item["ease"] = min(item.get("ease", 2.5) + 0.1, 2.8)
        interval = max(1, round(item["success_count"] * item["ease"]))
        item["next_review"] = today + datetime.timedelta(days=interval)
        item["status"] = "mastered" if item["success_count"] >= 3 else "learning"
    elif result == "struggled":
        item["next_review"] = today + datetime.timedelta(days=1)
        item["status"] = "learning"
    else:  # fail
        item["fail_count"] = item.get("fail_count", 0) + 1
        item["ease"] = max(item.get("ease", 2.5) - 0.2, 1.3)
        item["next_review"] = today
        item["status"] = "learning"
    item["last_seen"] = today
    return item


# ============================================================================
#  SEQUENCER — elige el tópico del día desde el kit (pre-clase)
# ============================================================================
def pick_topic(kit: list[Topic], due_items: set[str],
               interest_weight: dict[str, float], today: Optional[datetime.date] = None) -> Optional[Topic]:
    """
    Elige UN tópico del kit. Prioriza: (1) tópicos con ítems SRS debidos hoy,
    (2) mayor peso de interés según su categoría. Determinista.
    """
    if not kit:
        return None

    def score(t: Topic) -> tuple:
        due_hits = sum(1 for w in (t.vocab + t.phrases) if w in due_items)
        return (due_hits, interest_weight.get(t.category, 0.0))

    return max(kit, key=score)


# ============================================================================
#  VALIDADOR de salida (pre-TTS) — determinista, sin IA. Stub extensible.
# ============================================================================
def validate_output(text: str, band: str, level: str) -> list[str]:
    """Devuelve lista de problemas (vacía = OK). Acá no hay LLM, solo reglas."""
    problems = []
    words = len(text.split())
    cap = {"early_child": 30, "child": 45}.get(band)
    if cap and words > cap:
        problems.append(f"excede {cap} palabras ({words})")
    # los emojis no deben ir al canal de voz (voice_text)
    if any(ord(c) > 0x2190 for c in text):
        problems.append("contiene símbolos/emoji: no deben ir al TTS (usar screen_text)")
    return problems


# ============================================================================
#  SELFTEST  (corre sin DB:  python engine.py)
# ============================================================================
if __name__ == "__main__":
    print("=" * 78)
    print("DEMO 1 — Composer: un solo prompt para un adulto B1")
    print("=" * 78)
    carlos = Student("Carlos", 34, "B1", interests=["viajes", "gastronomía"],
                     barrier="alta inhibición y miedo a equivocarse al hablar")
    topic = Topic("Viajes", "Alojamiento", "The Hostel Overbooking Crisis",
                  "quejarse de forma cortés pero firme",
                  vocab=["Issue", "Booking"],
                  phrases=["I was wondering if...", "There seems to be an issue with...", "Could you please check..."])
    learner = LearnerState(mastered=["Could you please..."], learning=["There seems to be an issue with..."],
                           due_for_review=["I was wondering if..."], recent_errors=["Present Perfect vs Past Simple"])
    print(compose_stack(carlos, topic, learner))

    print("\n" + "=" * 78)
    print("DEMO 2 — el MISMO motor para un nene de 5 (A1) con el mismo tópico agnóstico")
    print("=" * 78)
    timo = Student("Timo", 5, "A1", interests=["dinosaurios"])
    print(compose_stack(timo, topic, LearnerState(learning=["Issue"], due_for_review=["Booking"])))

    print("\n" + "=" * 78)
    print("DEMO 3 — SRS (mitad determinista del post-clase)")
    print("=" * 78)
    row = {"item": "Booking", "seen_count": 1, "success_count": 0, "fail_count": 1, "ease": 2.5}
    print("antes :", row)
    print("ok    :", srs_update(dict(row), "ok"))
    print("fail  :", srs_update(dict(row), "fail"))

    print("\n" + "=" * 78)
    print("DEMO 4 — Sequencer: elegir tópico del kit")
    print("=" * 78)
    kit = [
        Topic("Espacio y ciencia", "Astronomía", "Explorar el espacio", "describir el cielo",
              ["Star", "Planet"], ["A bright star"]),
        Topic("Viajes", "Alojamiento", "The Hostel Overbooking Crisis", "quejarse con cortesía",
              ["Issue", "Booking"], ["I was wondering if..."]),
    ]
    chosen = pick_topic(kit, due_items={"Booking"}, interest_weight={"Viajes": 2.0, "Espacio y ciencia": 1.0})
    print("elegido:", chosen.title)

    print("\n" + "=" * 78)
    print("DEMO 5 — Validador de salida (pre-TTS)")
    print("=" * 78)
    print("ok   :", validate_output("Eat apple. Comé la manzana. Decí: apple.", "early_child", "A1"))
    print("largo:", validate_output(" ".join(["word"] * 40), "early_child", "A1"))
    print("emoji:", validate_output("Great job! 🚀", "early_child", "A1"))

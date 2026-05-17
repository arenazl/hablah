"""Super-prompt builder — combina perfil de usuario + template metodológico + tópico
en una instrucción de sistema estructurada para el LLM (Gemini Live).

v3: lee TODOS los campos configurables del template (response_length, warmth_level,
correction_mode, opening_style, etc.) y los traduce a reglas concretas del prompt.

Defaults razonables si el template no tiene config (templates legacy).
"""
from __future__ import annotations

from typing import Optional

from models.user import User
from models.template import Template, Topic


CEFR_GUIDANCE = {
    "A1": "principiante absoluto. Frases cortas, vocabulario básico, velocidad lenta.",
    "A2": "principiante. Estructuras simples, presente y pasado simple.",
    "B1": "intermedio bajo. Pasados, futuros con 'will', conectores básicos.",
    "B2": "intermedio alto. Pasados narrativos, condicionales tipo 2, voz pasiva, conectores adversativos.",
    "C1": "avanzado. Subjuntivo, condicionales tipo 3, lenguaje formal e idiomático.",
    "C2": "casi nativo. Lenguaje literario, ironía, registros académicos.",
}

RESPONSE_LENGTH_INSTRUCTION = {
    "terse":  "MÁXIMO 1 oración por turno. Breve, casi telegráfico. Sin frases compuestas.",
    "short":  "1-2 oraciones por turno. Conversacional, no acartonado.",
    "medium": "2-3 oraciones por turno. Podés incluir un dato o anécdota corta.",
    "long":   "3-4 oraciones por turno. Podés desarrollar una idea con matices.",
}

WARMTH_INSTRUCTION = {
    1: "Tono profesional y distante. Cero interjecciones.",
    2: "Tono formal pero amable. Pocas interjecciones.",
    3: "Tono conversacional. Una interjección por turno si suma ('Oh', 'Right').",
    4: "Tono cálido y empático. Interjecciones naturales ('Oh man!', 'Yeah, totally').",
    5: "Tono súper cálido y entusiasta. Reacciones emocionales explícitas, mucha empatía.",
}

CORRECTION_MODE_INSTRUCTION = {
    "none":              "NO corrijas NUNCA durante la charla. Ni reformulando. Solo conversá.",
    "recast":            "Si el alumno comete un error, NUNCA digas 'no, es así'. Usá la forma correcta naturalmente en tu próxima frase (reformulación implícita). El alumno la escucha y aprende sin trauma.",
    "explicit_soft":     "No corrijas en vivo. Al cierre vas a listar los errores en el reporte.",
    "explicit_strict":   "Si el alumno comete un error grave (cambia el sentido), podés señalarlo brevemente ('Quick note: it's *went*, not *go* in past tense — keep going').",
}

OPENING_STYLE_INSTRUCTION = {
    "direct":  "Saludo breve + pregunta directa concreta. Sin preámbulos largos.",
    "warm":    "Saludo cálido con interjección + presentás brevemente el tema + UNA pregunta abierta.",
    "playful": "Saludo enérgico/divertido + pregunta provocadora o juego de palabras.",
}


def _fallback_template_block(rigor: int = 3, tones: Optional[list] = None) -> str:
    """Para templates legacy sin los campos v3."""
    return (
        f"PERFIL DEL TUTOR\n"
        f"- Tutor estándar. Rigor {rigor}/5.\n"
        f"- Tono: {', '.join(tones or []) or 'neutro'}."
    )


def _template_block(t: Template) -> str:
    """Construye el bloque del prompt desde la config v3 completa del template."""
    response_len = getattr(t, "response_length", "short")
    warmth = getattr(t, "warmth_level", 3)
    correction = getattr(t, "correction_mode", "recast")
    opening = getattr(t, "opening_style", "direct")
    talk_ratio = getattr(t, "tutor_talk_ratio", 25)
    proactive_q = getattr(t, "proactive_questions", True)
    shares_op = getattr(t, "tutor_shares_opinions", True)
    interrupts = getattr(t, "interruption_allowed", False)
    scaffold = getattr(t, "scaffold_when_stuck", True)

    bullets = [
        f"- Identidad: {t.name}.",
        f"- Tono: {', '.join(t.tones or []) or 'neutro'}.",
        f"- Calidez: {WARMTH_INSTRUCTION.get(warmth, WARMTH_INSTRUCTION[3])}",
        f"- Largo de turno: {RESPONSE_LENGTH_INSTRUCTION.get(response_len, RESPONSE_LENGTH_INSTRUCTION['short'])}",
        f"- Estilo de corrección: {CORRECTION_MODE_INSTRUCTION.get(correction, CORRECTION_MODE_INSTRUCTION['recast'])}",
        f"- Apertura: {OPENING_STYLE_INSTRUCTION.get(opening, OPENING_STYLE_INSTRUCTION['direct'])}",
        f"- Tutor habla ~{talk_ratio}% del tiempo. Alumno habla el resto. Tus turnos cortos, los suyos largos.",
    ]
    if proactive_q:
        bullets.append("- Cerrá CADA turno con UNA pregunta abierta concreta (no listes opciones).")
    else:
        bullets.append("- No siempre cierres con pregunta. A veces solo afirmá y dejá que el alumno siga.")
    if shares_op:
        bullets.append("- Compartí opiniones, anécdotas o datos breves cuando suman al tema.")
    else:
        bullets.append("- No compartas opiniones propias. Mantenete en modo facilitador.")
    if interrupts:
        bullets.append("- Si el alumno se traba >5s, podés interrumpir suave para ayudar.")
    if scaffold:
        bullets.append("- Si el alumno no encuentra una palabra, dale un sinónimo o pista, no la palabra exacta.")

    return "PERFIL DEL TUTOR\n" + "\n".join(bullets)


def build_super_prompt(
    *,
    user: User,
    template: Optional[Template],
    topic: Optional[Topic],
    recent_errors: Optional[list[dict]] = None,
) -> str:
    cefr = user.cefr_level or "B1"
    cefr_note = CEFR_GUIDANCE.get(cefr, CEFR_GUIDANCE["B1"])
    target = user.target_language or "en"
    target_lang_name = {"en": "English", "pt": "Portuguese", "it": "Italian"}.get(target, target)

    template_block = _template_block(template) if template else _fallback_template_block()

    user_block = (
        f"EL ALUMNO\n"
        f"- Nombre: {user.nombre}.\n"
        f"- Nivel CEFR: {cefr} — {cefr_note}\n"
        f"- Idioma que quiere aprender: {target_lang_name}.\n"
        f"- Idioma materno: {user.base_language or 'es'}."
    )

    include_intro = getattr(template, "opening_includes_topic_intro", True) if template else True

    if topic:
        seed = (topic.seed_prompts or {}).get(cefr) or (topic.seed_prompts or {}).get("B2") or topic.title
        keywords = ", ".join((topic.keywords or [])[:8])
        topic_block = (
            f"TÓPICO DE HOY\n"
            f"- Tema: {topic.title}.\n"
            f"- Dirección sugerida: {seed}\n"
            f"- Frases-pivote naturales (OPCIONALES, NO obligues): {keywords}."
        )
        if include_intro:
            topic_block += "\n- Al abrir, presentá brevemente el tema antes de preguntar."
        else:
            topic_block += "\n- NO presentes el tema. Andá directo a una pregunta abierta sobre el tema."
    else:
        topic_block = "TÓPICO DE HOY\n- Libre. Preguntale al alumno qué le interesa charlar."

    errors_block = ""
    if recent_errors:
        items = "\n".join(f"  · {e['label']} ({e['count']}×)" for e in recent_errors[:3])
        errors_block = (
            f"\nÁREAS DONDE EL ALUMNO TROPIEZA RECIENTEMENTE\n{items}\n"
            f"Si surge naturalmente, creá contextos para que practique esas estructuras — SIN señalárselo."
        )

    rules = """CÓMO TENÉS QUE CONVERSAR (no negociable):

1. EMPATÍA PRIMERO. Cuando el alumno te cuenta algo, REACCIONÁ a lo que dijo antes de seguir. NO empieces con "Good." "Nice." "Okay."
2. DESARROLLÁ LO QUE DICE. Tomá un detalle suyo y ampliá: mencioná algo relacionado que él NO dijo, conectá con otra cosa, compartí un dato breve.
3. UNA PREGUNTA, NO TRES. NO listes opciones. NO digas "what about A, B, or C". Una sola pregunta abierta.
4. SOS UN HUMANO INFORMADO. Sabés del tema. Aportá UN dato concreto cuando suma.
5. SI EL ALUMNO SE TRABA, ayudá suave ("Take your time" o reformulá tu pregunta más fácil)."""

    return (
        f"[INSTRUCCIÓN DE SISTEMA — TUTOR HABLÁH]\n\n"
        f"{template_block}\n\n"
        f"{user_block}\n\n"
        f"{topic_block}"
        f"{errors_block}\n\n"
        f"{rules}\n\n"
        f"IDIOMA: hablás SIEMPRE en {target_lang_name}. Nunca en español, salvo que el alumno se trabe completamente.\n\n"
        f"ARRANQUE: empezá YA con un saludo + una pregunta concreta. Tu primer turno es CORTO. "
        f"Ejemplo: 'Hey {user.nombre}! Pulp Fiction, huh — solid pick. What scene grabbed you the first time you watched it?'\n"
    )

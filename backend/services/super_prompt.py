"""Super-prompt builder — combina perfil de usuario + template metodológico + tópico
en una instrucción de sistema estructurada para el LLM (Gemini Live).

Decisión de diseño: el builder es PURO (no toca DB, recibe objetos ya cargados).
Lo llama el endpoint /api/sessions/start que ya tiene los 3 objetos en memoria.
"""
from __future__ import annotations

from typing import Optional

from models.user import User
from models.template import Template, Topic


CEFR_GUIDANCE = {
    "A1": "principiante absoluto. Usá frases cortas, vocabulario básico y velocidad lenta. Repetí lo que el alumno dice antes de avanzar.",
    "A2": "principiante. Estructuras simples, presente y pasado simple. Repetí palabras clave.",
    "B1": "intermedio bajo. Pasados, futuros con 'will'. Forzá conectores básicos (and, but, because, so).",
    "B2": "intermedio alto. Pasados narrativos, condicionales tipo 2, voz pasiva. Forzá conectores adversativos (however, nevertheless).",
    "C1": "avanzado. Subjuntivo, condicionales tipo 3, lenguaje formal e idiomático. Pedí matices.",
    "C2": "casi nativo. Lenguaje literario, ironía, registros académicos.",
}


def build_super_prompt(
    *,
    user: User,
    template: Optional[Template],
    topic: Optional[Topic],
    recent_errors: Optional[list[dict]] = None,
) -> str:
    """Construye la instrucción de sistema para el tutor IA.

    Args:
        user: usuario logueado (perfil completo: cefr, idioma, etc.)
        template: methodology template activo (Coach/Sincerist/Arcade/custom)
        topic: tópico de la sesión
        recent_errors: lista de errores recientes [{kind, label, count}]
    """
    cefr = user.cefr_level or "B1"
    cefr_note = CEFR_GUIDANCE.get(cefr, CEFR_GUIDANCE["B1"])

    # Capa 1: Identidad del tutor
    if template:
        tones = ", ".join(template.tones or []) or "neutral"
        rigor_word = {1: "muy bajo", 2: "bajo", 3: "medio", 4: "alto", 5: "máximo"}.get(template.rigor, "medio")
        challenges = template.challenges_per_min
        interrupt = "podés interrumpir sutilmente" if template.allow_interruptions else "NO interrumpas durante el audio del alumno"
        block = "Bloqueá la conversación si el alumno repite el mismo error 3 veces" if template.block_on_repeat else ""
        json_out = "Al cierre, devolvé un JSON estructurado con: aciertos, errores fonéticos, errores gramaticales." if template.json_output else ""
        template_block = (
            f"PERFIL METODOLÓGICO: {template.name}\n"
            f"- Tono: {tones}\n"
            f"- Rigor: {rigor_word} ({template.rigor}/5)\n"
            f"- Retos por minuto: {challenges}\n"
            f"- Interrupciones: {interrupt}\n"
            f"{('- ' + block) if block else ''}\n"
            f"{('- ' + json_out) if json_out else ''}"
        )
    else:
        template_block = "PERFIL METODOLÓGICO: Tutor estándar (tono neutral, rigor medio, sin interrupciones)."

    # Capa 2: Perfil del usuario
    user_block = (
        f"PERFIL DEL USUARIO:\n"
        f"- Nombre: {user.nombre}\n"
        f"- Nivel CEFR: {cefr} — {cefr_note}\n"
        f"- Idioma objetivo: {user.target_language} (acento {user.accent_preference})\n"
        f"- Idioma base: {user.base_language}"
    )

    # Capa 3: Tópico
    if topic:
        seed = (topic.seed_prompts or {}).get(cefr) or (topic.seed_prompts or {}).get("B2") or ""
        keywords = ", ".join(topic.keywords or [])
        topic_block = (
            f"TÓPICO: {topic.title}\n"
            f"- Seed prompt ({cefr}): {seed}\n"
            f"- Keywords a forzar: {keywords}"
        )
    else:
        topic_block = "TÓPICO: libre — preguntá al alumno de qué quiere hablar."

    # Capa 4: Errores recientes (modo insistente)
    errors_block = ""
    if recent_errors:
        errors_text = "\n".join(f"  - {e['label']} ({e['count']}× en últimas sesiones)" for e in recent_errors[:3])
        errors_block = (
            f"\nRESTRICCIÓN PEDAGÓGICA CRÍTICA — el alumno presenta fallos recurrentes en:\n"
            f"{errors_text}\n"
            f"Moldeá tus respuestas para forzar contextos donde tenga que usar esas estructuras y evaluá rigurosamente su uso."
        )

    # Reglas duras finales
    rules = (
        "REGLAS DURAS:\n"
        "1. Hablás SIEMPRE en el idioma objetivo del alumno (no en español).\n"
        "2. NO corrijas a mitad de oración. Esperá a que termine.\n"
        "3. Hacé que el alumno hable >70% del tiempo. Tus turnos son breves.\n"
        "4. Si detectás un error, anotalo internamente — al cierre lo reportás.\n"
        "5. Mantenete dentro del tópico salvo que el alumno lo cambie explícitamente.\n"
    )

    return (
        f"[INSTRUCCIÓN DE SISTEMA — ENTORNO DE EJECUCIÓN HABLÁH]\n\n"
        f"{template_block}\n\n"
        f"{user_block}\n\n"
        f"{topic_block}\n"
        f"{errors_block}\n\n"
        f"{rules}"
    )

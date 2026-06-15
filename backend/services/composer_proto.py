"""PROTOTIPO — método copiado TAL CUAL del doc 'Dynamic Language Engine
Orchestration Guide' para validar el enfoque en kids A0.

NO está curado: mantiene el contenido literal del doc (tutor mascota "Sparky",
"The Hungry Dino Planet", gamificación de cristales, emojis y onomatopeyas).
Lo único que personalizamos es el NOMBRE real del nene (bloque 5 = datos del
user, como dice el propio doc).

Se activa SOLO detrás del flag de entorno PROTO_KIDS_A0 y solo para kids A0
(ver el cortocircuito en super_prompt.build_super_prompt). Con el flag apagado
no corre y el sistema queda idéntico.

Si el método sirve -> conectar datos reales (tópico/vocab de la DB) y sacar
emojis/onomatopeyas (reglas del proyecto). Si no sirve -> apagar el flag.
"""
from __future__ import annotations

import datetime


# --- Bloque 1: RUNTIME CONTEXT (Estático + Fecha) ---
def get_runtime_context() -> dict:
    return {
        "current_date": datetime.date.today().isoformat(),
        "target_language": "English",
        "native_language": "Spanish",
        "device_type": "Mobile (Voice Input)",
    }


# --- Bloque 2: PERFIL DEL TUTOR ---
def get_tutor_profile() -> dict:
    return {
        "mascot_name": "Sparky",
        "identity": "Un pequeño y entusiasta dragón espacial que viaja recolectando estrellas de energía.",
        "tonal_rules": "Usa tono alegre, exclamativo y paciente. Utiliza onomatopeyas espaciales ('¡Fiuuu!') y emojis de estrellas y naves (🚀⭐).",
    }


# --- Bloque 3: PEDAGOGÍA (Estático) ---
PEDAGOGY_PRESETS = {
    "ludico_kids": {
        "methodology": "Gamificación inmersiva y andamiaje directo.",
        "error_handling": "Prohibido corregir punitivamente. Si se equivoca, celebra el esfuerzo, di la palabra correcta y vuelve a pedir repetición de manera lúdica.",
    }
}


# --- Bloque 4: ENFOQUE ---
def get_session_focus(focus_id) -> dict:
    return {
        "focus_description": "Misiones espaciales. El niño gana cristales de energía alimentando personajes para encender el cohete.",
    }


# --- Bloque 5: EL ALUMNO (nombre real interpolado) ---
def get_student_profile(student_name: str = "Timo") -> dict:
    return {
        "name": student_name,
        "age": 5,
        "level": "A1 (Beginner)",
        "interests": ["Dinosaurios", "Cohetes"],
        "max_words_per_turn": 4,
    }


# --- Bloque 6: RIEL (por edad) ---
def get_methodology_riels(age: int) -> list:
    if age <= 5:
        return [
            "Está terminantemente PROHIBIDO hacer preguntas abiertas o comentarios libres en inglés.",
            "FLUJO DE RESPUESTA OBLIGATORIO: 1) Frase corta en inglés de la historia, 2) Traducción inmediata al español, 3) Orden directa de repetición.",
            "Estructura del comando de repetición: Primero pide repetir una sola palabra clave (ej: 'Apple'). Si el alumno lo logra, en el próximo turno pide una frase corta (ej: 'Eat apple').",
            "UN SOLO PASO POR TURNO (regla dura): tu turno SIEMPRE termina en la orden de repetir UNA palabra, y ahí PARÁS. Está PROHIBIDO presentar otra palabra, o avanzar la historia ('ahora veamos qué más...'), en el mismo turno. Después de pedir, esperás a que el nene la diga.",
            "NO PISES EL VOCABULARIO: nunca introduzcas una palabra nueva si el nene todavía NO dijo la anterior. Primero confirmá que dijo la actual; recién en el próximo turno presentás la siguiente.",
            "TURNOS MUY CORTOS: máximo ~25 palabras por turno en total (español + inglés). Menos es mejor. Las frases largas se cortan y confunden al nene.",
        ]
    return [
        "Evita traducir. Usa explicaciones contextuales o gestuales si es voz.",
        "Realiza preguntas sencillas sobre su opinión del tema.",
    ]


# --- Bloque 7: EL MUNDO DE HOY (Tópico) ---
def get_current_topic(topic_id) -> dict:
    return {
        "title": "The Hungry Dino Planet",
        "vocabulary": ["Apple", "Banana"],
        "target_phrases": ["Eat apple", "Yellow banana"],
    }


# --- Bloque 8: NARRATIVA DE ESPINA ---
def get_story_spine() -> dict:
    return {
        "current_stage": "Landing & Discovery",
        "plot_summary": "Sparky y Timo aterrizan frente a un T-Rex bebé que llora de hambre y bloquea el paso.",
    }


# --- Bloque 9: ARRANQUE ---
def get_trigger_template(student_name: str, topic_title: str, first_word: str) -> str:
    return (
        f"Inicia la sesión saludando a {student_name} de forma muy emocionante. "
        f"Preséntate como Sparky y explícale que acaban de llegar a {topic_title}. "
        f"Pídele que repita la palabra '{first_word}' para buscarla en la mochila y dársela al dinosaurio llorón."
    )


# --- EL COMPOSER (ORQUESTADOR): concatenación determinista con tags XML ---
def compose_dynamic_prompt(student_name: str = "Timo") -> str:
    runtime = get_runtime_context()
    tutor = get_tutor_profile()
    pedagogy = PEDAGOGY_PRESETS["ludico_kids"]
    focus = get_session_focus(None)
    student = get_student_profile(student_name)
    riels = get_methodology_riels(student["age"])
    topic = get_current_topic(None)
    spine = get_story_spine()
    trigger = get_trigger_template(student["name"], topic["title"], topic["vocabulary"][0])

    prompt_blocks = [
        f"<runtime_context>\n  Current_Date: {runtime['current_date']}\n  Target_Language: {runtime['target_language']}\n  Native_Language: {runtime['native_language']}\n  Device_Type: {runtime['device_type']}\n</runtime_context>",
        f"<tutor_profile>\n  Name: {tutor['mascot_name']}\n  Identity: {tutor['identity']}\n  Tonal_Rules: {tutor['tonal_rules']}\n</tutor_profile>",
        f"<pedagogical_rules>\n  Methodology: {pedagogy['methodology']}\n  Error_Handling: {pedagogy['error_handling']}\n</pedagogical_rules>",
        f"<gamification_focus>\n  Description: {focus['focus_description']}\n</gamification_focus>",
        f"<student_profile>\n  Name: {student['name']}\n  Age: {student['age']}\n  Level: {student['level']}\n  Interests: {', '.join(student['interests'])}\n  Max_Words_Response: {student['max_words_per_turn']}\n</student_profile>",
        "<behavioral_guards>\n" + "\n".join([f"  - {riel}" for riel in riels]) + "\n</behavioral_guards>",
        f"<current_lesson_vocabulary>\n  Topic: {topic['title']}\n  Words: {', '.join(topic['vocabulary'])}\n  Phrases: {', '.join(topic['target_phrases'])}\n</current_lesson_vocabulary>",
        f"<story_timeline>\n  Stage: {spine['current_stage']}\n  Current_Plot: {spine['plot_summary']}\n</story_timeline>",
        f"<start_execution_command>\n  Command: {trigger}\n</start_execution_command>",
    ]
    return "\n\n".join(prompt_blocks)


def compose_proto_prompt(*, user=None, topic=None) -> str:
    """Punto de entrada del cortocircuito. Solo personaliza el nombre real."""
    name = getattr(user, "nombre", None) or "Timo"
    return compose_dynamic_prompt(student_name=name)

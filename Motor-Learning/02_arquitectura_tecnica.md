# Arquitectura técnica — Motor de prompt modular de 9 capas

Documento para el equipo de desarrollo. Describe cómo el *Composer* ensambla, de forma determinista y sin IA intermedia, un prompt en 9 bloques que adapta dinámicamente la enseñanza desde los 5 años hasta adultos.

---

## 1. Decisión arquitectónica central: concatenación determinista, no IA intermedia

El prompt final **no** se consolida con un modelo intermedio. Se ensambla por concatenación determinista de strings con delimitadores XML.

Razones:

- **Latencia.** Una IA intermedia para consolidar agrega entre ~1,5 y 3 s por turno. En una app de voz, eso es inaceptable.
- **Costo.** Cada consolidación intermedia es una llamada facturable extra por turno.
- **Integridad de los rieles.** Una IA intermedia puede "olvidar", reescribir o diluir las reglas críticas del Bloque 6 (los rieles de seguridad). La concatenación las deja intactas, byte por byte.

El ensamblado es **O(1)** en términos de llamadas a modelo: cero. Solo I/O contra la base y string building.

### Por qué XML y no JSON o markdown plano

Los modelos modernos (GPT‑4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) están entrenados para interpretar etiquetas XML y separar limpiamente *instrucciones operativas* de *contexto dinámico*. Los tags actúan como fronteras semánticas duras entre bloques, lo que reduce el sangrado de contexto entre, por ejemplo, las reglas pedagógicas y el vocabulario del tópico.

---

## 2. Las 9 capas y sus fuentes

El orden de apilado es fijo. Cada capa tiene una fuente y una naturaleza (estática vs. dinámica) distinta:

| # | Bloque | Fuente | Naturaleza |
|---|--------|--------|------------|
| 1 | Runtime context | `runtime_prompt.py` (constante de sistema + fecha) | Estático + dato dinámico (fecha) |
| 2 | Perfil del tutor | template en código + tabla `tutors` (DB) | Plantilla + valores DB |
| 3 | Pedagogía (estilo) | constante `PEDAGOGY_PRESETS[...]` | Estático |
| 4 | Enfoque de sesión | `templates.enfoque` (DB) | Dinámico |
| 5 | El alumno | tabla `users` (DB) | Dinámico |
| 6 | Rieles (cómo enseñás) | `methodology_modules.ai_restraints` (DB) | Dinámico (se selecciona por edad) |
| 7 | Tópico del día | tabla `topics` (DB) + fallback | Dinámico |
| 8 | Narrativa de espina | constante en `composer.py` | Estático |
| 9 | Arranque (trigger) | plantilla del inyector + nombre/tópico | Plantilla + datos dinámicos |

**Punto clave de diseño:** el Bloque 6 (rieles) se selecciona dinámicamente según la edad del alumno. Es el componente que evita el bloqueo cognitivo en chicos chicos: prohíbe preguntas abiertas en inglés y obliga a un flujo de salida de 3 pasos (frase corta → espejo en español → comando de repetición de 1 palabra).

---

## 3. Mapa de responsabilidades

Para no mezclar conceptos en el backend, cada cosa tiene un único lugar:

- **Reglas pedagógicas globales (estilo)** → Bloque 3. Directrices generales de enseñanza de la app.
- **Reglas lógicas rígidas (el algoritmo de interacción)** → Bloque 6. El flujo paso a paso, la prohibición de preguntas abiertas, los límites de palabras.
- **Tono y personalidad** → Bloque 2 (perfil del tutor). Evita que el modelo suene a asistente corporativo frío.
- **Datos del alumno y progreso** → Bloque 5. Edad exacta, nivel, intereses para personalizar analogías.
- **Materia de estudio** → Bloque 7. Solo datos limpios de diccionario (vocabulario, frases objetivo), **sin** instrucciones conversacionales.

La regla de oro: el Bloque 7 nunca contiene instrucciones de comportamiento. Si una pieza de texto le dice al modelo *cómo* actuar, no va en el tópico.

---

## 4. El Composer

Cada bloque se recupera de su fuente de forma desacoplada y luego se ensambla con delimitadores XML. Implementación de referencia en Python:

```python
import datetime

# --- FUENTES (DB & CONFIGURACIONES) ---

# Bloque 1: runtime (sistema)
def get_runtime_context():
    return {
        "current_date": datetime.date.today().isoformat(),
        "target_language": "English",
        "native_language": "Spanish",
        "device_type": "Mobile (Voice Input)"
    }

# Bloque 2: perfil del tutor (DB estático)
def get_tutor_profile():
    return {
        "mascot_name": "Sparky",
        "identity": "Un pequeño y entusiasta dragón espacial que recolecta estrellas de energía.",
        "tonal_rules": "Tono alegre, exclamativo y paciente. Onomatopeyas espaciales ('¡Fiuuu!') y emojis (🚀⭐)."
    }

# Bloque 3: pedagogía (config estático)
PEDAGOGY_PRESETS = {
    "ludico_kids": {
        "methodology": "Gamificación inmersiva y andamiaje directo.",
        "error_handling": "Prohibido corregir punitivamente. Si se equivoca: celebra el esfuerzo, di la palabra correcta y vuelve a pedir repetición de forma lúdica."
    }
}

# Bloque 4: enfoque (DB dinámico)
def get_session_focus(focus_id):
    return {"focus_description": "Misiones espaciales. El niño gana cristales alimentando personajes para encender el cohete."}

# Bloque 5: alumno (DB dinámico)
def get_student_profile(student_id):
    return {
        "name": "Timo", "age": 5, "level": "A1 (Beginner)",
        "interests": ["Dinosaurios", "Cohetes"], "max_words_per_turn": 4
    }

# Bloque 6: rieles (DB dinámico, seleccionados por edad)
def get_methodology_riels(age):
    if age <= 5:
        return [
            "PROHIBIDO hacer preguntas abiertas o comentarios libres en inglés.",
            "FLUJO OBLIGATORIO: 1) frase corta en inglés, 2) traducción inmediata al español, 3) orden directa de repetición.",
            "Comando de repetición: primero una sola palabra clave (ej: 'Apple'); si lo logra, en el próximo turno una frase corta (ej: 'Eat apple')."
        ]
    return [
        "Evita traducir. Usa explicaciones contextuales o gestuales si es voz.",
        "Realiza preguntas sencillas sobre su opinión del tema."
    ]

# Bloque 7: tópico (DB dinámico)
def get_current_topic(topic_id):
    return {"title": "The Hungry Dino Planet", "vocabulary": ["Apple", "Banana"], "target_phrases": ["Eat apple", "Yellow banana"]}

# Bloque 8: narrativa (config estático)
def get_story_spine():
    return {"current_stage": "Landing & Discovery", "plot_summary": "Sparky y Timo aterrizan frente a un T-Rex bebé que llora de hambre y bloquea el paso."}

# Bloque 9: arranque (plantilla + datos dinámicos)
def get_trigger_template(student_name, topic_title, first_word):
    return (
        f"Inicia la sesión saludando a {student_name} de forma muy emocionante. "
        f"Preséntate como Sparky y explicá que acaban de llegar a {topic_title}. "
        f"Pedile que repita '{first_word}' para buscarla en la mochila y dársela al dinosaurio llorón."
    )


# --- COMPOSER (ORQUESTADOR) ---

def compose_dynamic_prompt(student_id, topic_id, focus_id):
    # 1. Recuperación desacoplada
    runtime  = get_runtime_context()
    tutor    = get_tutor_profile()
    pedagogy = PEDAGOGY_PRESETS["ludico_kids"]
    focus    = get_session_focus(focus_id)
    student  = get_student_profile(student_id)
    riels    = get_methodology_riels(student["age"])
    topic    = get_current_topic(topic_id)
    spine    = get_story_spine()
    trigger  = get_trigger_template(student["name"], topic["title"], topic["vocabulary"][0])

    # 2. Ensamblado determinista con delimitadores XML
    prompt_blocks = [
        f"<system_context>\n  Date: {runtime['current_date']}\n  Target_Lang: {runtime['target_language']}\n  Native_Lang: {runtime['native_language']}\n  Device: {runtime['device_type']}\n</system_context>",
        f"<tutor_profile>\n  Name: {tutor['mascot_name']}\n  Identity: {tutor['identity']}\n  Tonal_Rules: {tutor['tonal_rules']}\n</tutor_profile>",
        f"<pedagogical_rules>\n  Methodology: {pedagogy['methodology']}\n  Error_Handling: {pedagogy['error_handling']}\n</pedagogical_rules>",
        f"<gamification_focus>\n  Description: {focus['focus_description']}\n</gamification_focus>",
        f"<student_profile>\n  Name: {student['name']}\n  Age: {student['age']}\n  Level: {student['level']}\n  Interests: {', '.join(student['interests'])}\n  Max_Words_Response: {student['max_words_per_turn']}\n</student_profile>",
        "<behavioral_guards>\n" + "\n".join([f"  - {r}" for r in riels]) + "\n</behavioral_guards>",
        f"<current_lesson_vocabulary>\n  Topic: {topic['title']}\n  Words: {', '.join(topic['vocabulary'])}\n  Phrases: {', '.join(topic['target_phrases'])}\n</current_lesson_vocabulary>",
        f"<story_timeline>\n  Stage: {spine['current_stage']}\n  Current_Plot: {spine['plot_summary']}\n</story_timeline>",
        f"<start_execution_command>\n  Command: {trigger}\n</start_execution_command>",
    ]
    return "\n\n".join(prompt_blocks)


if __name__ == "__main__":
    print(compose_dynamic_prompt(student_id=101, topic_id=202, focus_id=303))
```

---

## 5. Notas de implementación para el equipo

- **Desacople de fuentes.** Cada `get_*` encapsula su fuente (constante, config o tabla). Cambiar de dónde sale un bloque no toca el Composer.
- **Selección por edad.** `get_methodology_riels(age)` es el único punto donde la lógica ramifica por edad. Mantener ahí toda la diferenciación etaria evita reglas dispersas.
- **El tópico es solo datos.** Validar en la capa de datos que `topics` no contenga instrucciones conversacionales; eso pertenece a los Bloques 2/3/6.
- **Fallback del Bloque 7.** El tópico debe tener un fallback si la consulta a `topics` no devuelve fila, para no romper el ensamblado.
- **Orden inmutable.** El orden de apilado es parte del contrato con el modelo. No reordenar bloques sin re-evaluar el comportamiento.

---

## 6. Resultado en producción (ejemplo)

Con esta estructura, para Timo (5 años) el modelo produce una salida que la app de voz procesa de inmediato:

> **Sparky:** "Oh! We landed on a new planet! 🚀⭐ ¡Aterrizamos en un nuevo planeta, Timo! Y mirá... ¡hay un dinosaurio llorando! Decí conmigo: Apple."

El modelo frena ahí y espera la entrada del micrófono — exactamente el flujo de 3 pasos que imponen los rieles del Bloque 6.

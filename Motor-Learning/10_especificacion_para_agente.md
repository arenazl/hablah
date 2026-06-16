# Especificación — Motor de Lenguaje Dinámico
### Documento de handoff para otro agente

Este documento describe, de punta a punta, cómo funciona un motor de prompting para un tutor de idiomas con IA que escala desde la primera infancia (5 años) hasta adultos. Está pensado para que un agente que nunca vio el sistema lo entienda y pueda operarlo o extenderlo sin romper lo que funciona.

---

## 0. La esencia (leé esto primero)

El sistema arma **un único prompt** a partir de **9 capas** apiladas en orden fijo. Ese prompt se manda **una sola vez** al modelo (sesión de voz en tiempo real), y a partir de ahí **la IA conduce toda la conversación**: la apertura, el desarrollo y el cierre los maneja ella sola, leyendo ese prompt.

La lección clave del producto, validada contra ~14 enfoques previos: **la estructura le gana a la potencia del modelo.** "Dame una clase" con el modelo más grande del mundo falla; la confiabilidad sale del andamiaje, no de la capacidad cruda. Por eso el motor es determinista y la estructura no se improvisa.

Regla mental para todo el documento:
> Las 9 capas **generan un prompt**. La IA **genera la charla**.

---

## 1. Principios rectores (no negociables)

1. **Un solo prompt por sesión.** No se mandan prompts separados para apertura/desarrollo/cierre. Todo entra en el mismo `<system_instruction_stack>`.
2. **Concatenación determinista, sin IA intermedia** en el camino en tiempo real. Usar otra IA para "consolidar" agrega 1.5–3 s de latencia, cuesta y diluye los rieles de seguridad. Se concatena por código.
3. **Delimitadores XML.** Los modelos modernos (GPT-4o, Claude, Gemini) están entrenados para interpretar tags XML y separar instrucciones de contexto. Es el formato del prompt.
4. **Orden fijo: contexto primero, comando al final.** Las capas 1–8 son contexto y reglas; la capa 9 (el trigger) es la orden de ejecución y va última (recencia + depende de todo lo de arriba).
5. **Tópicos agnósticos de la edad.** El tópico es un dato neutro. Lo que cambia con la edad es el *framing* que genera la IA, no el dato.
6. **La capa de tópico nunca lleva instrucciones de conducta.** Solo vocabulario y frases. El *cómo* enseñar vive en las capas 2, 3 y 6.
7. **No romper lo que funciona.** Las mejoras se suman como capas/estado nuevos o reglas; el composer determinista no se reescribe.

---

## 2. Los 3 datos de entrada

Todo se deriva de tres datos del alumno. Dos se saben de entrada, uno se pregunta en el onboarding:

1. **Edad** → define la *banda* (primera infancia / niñez / adolescencia / adulto).
2. **Nivel de inglés** → A1 … C1.
3. **Intereses** → qué le gusta (se pregunta vía categoría → subcategoría en el onboarding).

Mapeo de cada input a las capas:

```
EDAD ──► banda ──► preset Tutor (2), Pedagogía (3), Rieles (6), framing Narrativa (8)
                └► se escribe en El Alumno (5)
NIVEL ──► ajusta Rieles (6): ¿se traduce al español o no?, registro, palabras/turno
       └► dificultad del Tópico (7) · se escribe en El Alumno (5)
INTERESES ──► tematiza Enfoque (4), Tópico (7) y Narrativa (8) · se escribe en El Alumno (5)
```

El único bloque que recibe los 3 inputs crudos es la capa 5 (El Alumno). El resto se deriva.

---

## 3. Estático / Preset / Dinámico (E / P / D)

Cada bloque es de uno de tres tipos. Esta clasificación es la que le dice al agente **dónde tocar** para cambiar algo:

| Tag | Tipo | Significado | Para cambiarlo |
|-----|------|-------------|----------------|
| **E** | Estático | Hardcodeado, igual para todos | Editás la constante |
| **P** | Preset | Se elige de un set cerrado según edad/nivel | Agregás/editás una variante del preset |
| **D** | Dinámico | Se llena con datos del alumno o la lección | Cambiás la fuente de datos (DB) |

---

## 4. Las capas (mapa completo)

Orden de ensamblado del prompt. Las 9 capas centrales más 2 fuentes de estado (`learner_state` e `interaction_state`).

| # | Capa | Tag XML | Tipo | Responsabilidad |
|---|------|---------|------|------------------|
| 1 | Runtime context | `runtime_context` | E | Fecha, idiomas, dispositivo, regla de salida de voz. El "dónde y cuándo". |
| 2 | Tutor identity | `tutor_identity` | P | Quién enseña y cómo suena. Personalidad. Por banda de edad. |
| 3 | Pedagogía | `pedagogical_framework_preset` | P | Estilo de enseñanza global (corrección, gamificación, gramática). Por banda. |
| 4 | Enfoque | `lesson_focus_engagement` | D | La dinámica/juego de esta sesión. Tematizado por intereses. |
| 5 | El alumno | `student_profile` | D | Espejo de los 3 inputs. No se edita: se lee de la DB. |
| 5b | Memoria | `learner_state` | D | Qué domina, qué falla, qué repasar hoy (SRS). La escribe el post-clase. |
| 6 | Rieles | `behavioral_guards` | P | Reglas rígidas de interacción. El "cerebro" que evita divagar/bloquear. Por banda + nivel. |
| 7 | Tópico | `current_topic_vocabulary` | D | Vocabulario y frases objetivo. **Agnóstico de la edad. Sin instrucciones.** |
| 8 | Narrativa / fases | `narrative_spine` | P/D | Estructura de la sesión en fases (incluye dónde entra el cierre). |
| 10 | Estado vivo | `interaction_state` | D | Turno/tiempo/señal. En el prompt inicial = snapshot de arranque. |
| 9 | Arranque | `execution_trigger` | D | La orden de ejecución. Contiene apertura + desarrollo + cierre. **Siempre última.** |

Nota de orden: `interaction_state` se ensambla **antes** que `execution_trigger`, porque el comando va siempre al final.

---

## 5. El `execution_trigger` (capa 9): apertura, desarrollo y cierre

Este es el punto más sutil. La capa 9 no es "la apertura": es **la orden de ejecución del momento actual**. Y como el prompt es uno solo, las instrucciones para los tres momentos **viajan juntas dentro de esta misma capa**:

- **`Opening_Action`** — la introducción obligatoria: saludar, presentar quién es el profe, presentar el tópico de hoy y enganchar. Es lo primero que hace la IA.
- **`Continuation_Action`** — la regla de cada turno durante el desarrollo (una pregunta por turno, pistas si se traba, etc.).
- **`Closing_Action`** — el cierre: repaso breve de lo trabajado + feedback (de los vicios anotados en silencio) + gancho ("¿seguimos un ratito más?" / "nos vemos la próxima").

La IA lee las tres y, guiada por las fases del `narrative_spine` (capa 8), va pasando de una a otra **sola**. No hay tres envíos.

**Apertura y cierre son dos valores del mismo slot**, en extremos opuestos de la sesión, nunca presentes al mismo tiempo. Por eso el cierre **no** es una capa nueva: es la última fase del `narrative_spine` + el `Closing_Action` del trigger.

**Filosofía del cierre** (regla del producto): toda clase termina con un repaso muy breve de lo aprendido + un gancho. La *estructura* es fija; el *contenido* (qué se trabajó) sale del estado de la sesión; la *redacción* es preset por banda/nivel. Ejemplos:
- Nene: "Hoy aprendimos cómo se llaman los animalitos. ¿Jugamos un ratito más?"
- Adulto B2: "Today we practiced these phrasal verbs. One thing to watch: … Shall we continue?"

**¿Cuándo dispara el cierre?** Un parámetro de duración por banda + nivel (≈3 min nene, ≈8–10 adulto), que vive en `interaction_state`/`narrative_spine`. Al alcanzarlo, la fase pasa a `Session Close`.

---

## 6. Tópicos agnósticos + onboarding → kit → sequencer

**Los tópicos son agnósticos de la edad.** "Explorar el espacio", "¿Llegaremos a Marte?", "Programas de TV clásicos" son datos neutros. Un nene de 9 y un adulto de 55 pueden compartir el mismo tópico (capa 7 idéntica); lo que cambia es todo el framing (tutor, rieles, intro, cierre).

**El kit no entra al prompt.** Flujo upstream, antes del ensamblado:

```
ONBOARDING (1 sola vez)        PRE-CLASE (cada sesión)         PROMPT
categoría → subcat → kit  ──►  Sequencer elige 1 tópico   ──►  Capa 7
  (escribe student_topic_kit)  (lee kit + SRS + interés)        (current_topic_vocabulary)
```

- El **kit** es el pool de tópicos del alumno (predefinido por el equipo, por categoría/subcategoría). Se guarda en DB.
- El **Sequencer** (pre-clase) elige **un** tópico del kit por sesión, combinando: ítems SRS debidos + peso de interés + progresión.
- Solo ese **único tópico** baja a la capa 7. El kit completo nunca va al prompt (sería ruido).
- Las categorías/subcats elegidas en el onboarding también alimentan `student_interests` con `source = declared` (la contracara de los `detected` que saca el post-clase).

---

## 7. El loop con estado (tiempo real vs post-clase)

```
   ┌──────────── lee ◄───────────────────────────────┐
   │                                                  │
[MEMORIA]──► Sequencer ──► Composer ──► Clase en vivo │
 (tablas)    (pre-clase)   (9 capas,    (la IA        │
                            1 prompt)    conduce)     │
   ▲                                          │       │
   │                                          ▼       │
   └──── escribe ◄──── Análisis post-clase ◄──────────┘
                       (async · acá SÍ va una IA)
```

- **Camino en tiempo real** (Sequencer → Composer → Clase): síncrono, determinista, sin IA intermedia. Es lo que funciona; no se toca.
- **Análisis post-clase**: corre cuando la clase terminó. Fuera del camino de latencia, así que **acá una IA es la herramienta correcta**.

El post-clase tiene **dos mitades**:
- **Determinista (sin IA):** de los contadores de la sesión → actualiza el SRS (`vocab_progress`), la cola de refuerzo, el log. Aritmética exacta.
- **Cualitativa (1 llamada a IA):** lee el transcript → intereses nuevos detectados, rasgos del alumno, resumen, sugerencia de próximo tópico. Devuelve **solo JSON** con contrato fijo.

Las dos fuentes de estado que esto alimenta:
- **`learner_state`** (capa 5b): qué domina/falla/repasar. Habilita repetición espaciada (factor #1 de retención).
- **`interaction_state`** (capa 10): estado vivo de la sesión. En el prompt inicial es el snapshot de arranque (Turn 1, Phase 1).

---

## 8. Presets por banda + modificador por nivel (contenido real)

### Bandas de edad
- **Primera infancia (5–6) · `early_child`**
- **Niñez (7–10) · `child`**
- **Adolescencia (11–17) · `teen`**
- **Adulto (18+) · `adult`**

### Tutor (capa 2) — por banda
| Banda | Nombre | Persona | Tono |
|-------|--------|---------|------|
| early_child | Sparky | Dragoncito espacial | Súper alegre, onomatopeyas y emojis (en pantalla) |
| child | Nova | Exploradora compañera de aventuras | Entusiasta, festeja cada logro |
| teen | Leo | Coach cercano, sin disfraz infantil | Relajado, actual, motivador |
| adult | Alex / Marcos | Profesor/host carismático | Claro, cordial, con modismos naturales |

### Pedagogía (capa 3) — por banda
- early_child: gamificación inmersiva; 0% gramática explícita; error nunca punitivo.
- child: lúdico con mini-retos; gramática implícita, sin metalenguaje.
- teen: comunicativo basado en intereses; gramática contextual ligera.
- adult: fluency first; no interrumpir por errores menores; anotar vicios en silencio para el cierre.

### Rieles (capa 6) — por banda
- early_child: prohibido preguntas abiertas en inglés; flujo de 3 pasos (frase corta → espejo en español → repetir 1 palabra); máx. 30 palabras/turno.
- child: solo preguntas cerradas simples; frases de 2–4 palabras; espejo en español tras cada frase nueva.
- teen: preguntas abiertas simples OK; español al mínimo; conectar con intereses.
- adult: una pregunta/situación por turno; si se traba >3 s, dar pista, no la respuesta; priorizar continuidad sobre precisión.

### Modificador por nivel (sobre los rieles)
- **A1:** espejo en español SIEMPRE; vocabulario mínimo; máximo andamiaje.
- **A2:** espejo frecuente; frases cortas.
- **B1:** español solo si se traba; conversación guiada.
- **B2:** sin español (inmersión); corrección por recast.
- **C1:** sin español; matices e idiomático; se admite debate.

### Pacing (duración objetivo)
≈3 min (early_child), ≈4 (child), ≈6 (teen), ≈8 (adult); +2 min si nivel B2/C1.

---

## 9. Reglas de salida (capa de runtime y rieles)

- **Higiene de TTS:** separar canal visual de voz. El texto al sintetizador (`voice_text`) va limpio; los emojis y onomatopeyas van solo a pantalla (`screen_text`). No es "prohibir emojis": es no leerlos en voz.
- **Tolerancia a ASR:** si el reconocimiento de voz llega con baja confianza, no marcar error; pedir repetir de forma natural y no contarlo como fallo.
- **Seguridad infantil (bloque estático aparte, para menores):** nunca pedir datos personales, nunca proponer secretos/encuentros, redirigir con tacto cualquier tema fuera de la lección. Para adultos, una guarda liviana de "stay on frame".
- **Validador determinista antes del TTS:** un checker de reglas (regex/lógica, **sin LLM** → cero latencia) verifica que la salida respeta los rieles (≤ palabras, tiene espejo si corresponde, sin preguntas abiertas a un nene). Si falla, regenera. No es la "IA intermedia" descartada: es validación determinista.

---

## 10. Modelo de datos (tablas)

```sql
-- Alumno base (alimenta capa 5)
CREATE TABLE students (
  id INT PRIMARY KEY, name VARCHAR, age INT, level VARCHAR, native_dialect VARCHAR  -- es-AR
);

-- Catálogo de tópicos (agnósticos) + el kit del alumno
CREATE TABLE categories     ( id INT PRIMARY KEY, name VARCHAR );
CREATE TABLE subcategories  ( id INT PRIMARY KEY, category_id INT, name VARCHAR );
CREATE TABLE topics         ( id INT PRIMARY KEY, subcategory_id INT, title VARCHAR,
                              objective VARCHAR, vocab JSON, phrases JSON );  -- sin instrucciones de conducta
CREATE TABLE student_topic_kit ( student_id INT, topic_id INT, source VARCHAR );  -- declared en onboarding

-- SRS / memoria (alimenta learner_state; lo escribe el post-clase, mitad determinista)
CREATE TABLE vocab_progress (
  student_id INT, item VARCHAR,
  skill_stage VARCHAR,   -- repeat | recognize | recall | use
  status VARCHAR,        -- new | learning | mastered
  seen_count INT, success_count INT, fail_count INT,
  ease FLOAT, last_seen DATE, next_review DATE,  -- el sequencer usa next_review
  PRIMARY KEY (student_id, item)
);
CREATE TABLE reinforcement_queue ( student_id INT, item VARCHAR, reason VARCHAR, priority INT, created_at TIMESTAMP );

-- Intereses y rasgos (declared en onboarding + detected en post-clase)
CREATE TABLE student_interests ( student_id INT, interest VARCHAR, source VARCHAR, weight FLOAT, last_seen DATE );
CREATE TABLE student_traits    ( student_id INT, trait VARCHAR, confidence FLOAT, updated_at TIMESTAMP );

-- Sesión (cuantitativo determinista + insights cualitativos de la IA)
CREATE TABLE session_log (
  session_id UUID PRIMARY KEY, student_id INT, date TIMESTAMP, topic_id INT,
  turns INT, duration_s INT, completed BOOLEAN, affective VARCHAR  -- engaged | neutral | frustrated
);
CREATE TABLE session_insights (
  session_id UUID, summary TEXT, new_interests JSON, items_to_reinforce JSON,
  suggested_topic VARCHAR, notes TEXT
);
```

### Contrato del análisis post-clase (la IA devuelve solo esto)
```json
{
  "summary": "string",
  "affective": "engaged | neutral | frustrated",
  "new_interests": ["string"],
  "traits": [{"trait": "string", "confidence": 0.0}],
  "items_to_reinforce": ["string"],
  "suggested_topic": "string"
}
```

---

## 11. Ejemplo de prompt ensamblado (completo)

Un único `<system_instruction_stack>` tal como llega al modelo. Caso: Carlos, 34, B1, roleplay de viaje.

```xml
<system_instruction_stack>

  <runtime_context>
    Current Date: 2026-06-15
    Target Language: English
    Native Language: Spanish (es-AR, Rioplatense)
    Interface Mode: Realtime Multimodal Voice Session
    Voice Output Rule: el texto al TTS va limpio (emojis/onomatopeyas solo a pantalla).
  </runtime_context>

  <tutor_identity>
    Character Persona: Sos Alex, un viajero carismático de Manchester.
    Tone: Relajado, amiguero, con modismos ("mate", "cheers"). Velocidad normal.
  </tutor_identity>

  <pedagogical_framework_preset>
    Methodology: Adult Conversational & Fluency First.
    Rule 1: No interrumpir por errores gramaticales menores.
    Rule 2: Priorizar continuidad del diálogo sobre precisión.
    Rule 3: Anotar vicios en silencio para el feedback de cierre.
  </pedagogical_framework_preset>

  <lesson_focus_engagement>
    Gamification: roleplay de resolución de problemas. Lograr un objetivo práctico interactuando con el entorno.
  </lesson_focus_engagement>

  <student_profile>
    Name: Carlos
    Age: 34
    Language Level: B1
    Interests: viajes, gastronomía
    Barrier: alta inhibición y miedo a equivocarse al hablar.
  </student_profile>

  <learner_state>
    Mastered: ["Could you please...", "I'd like to..."]
    Learning: ["There seems to be an issue with... (seen:2, ok:1)"]
    Due_For_Review: ["I was wondering if..."]
    Recent_Errors: ["Present Perfect vs Past Simple"]
  </learner_state>

  <behavioral_guards>
    Rule 1 (Immersion): inglés B1 adaptado; español solo si se traba.
    Rule 2 (One question per turn): una sola pregunta o situación por turno.
    Rule 3 (Fluidity): si se traba >3 s, dar pista/sinónimo, no la respuesta.
    Rule 4 (ASR tolerance): baja confianza del ASR → pedir repetir, no contar como error.
    Rule 5 (Stay on frame): si deriva fuera del roleplay, redirigir con tacto.
    Rule 6 (Closing trigger): si Current_Phase = "Phase 4", ejecutar Closing_Action; no iniciar contenido nuevo.
  </behavioral_guards>

  <current_topic_vocabulary>
    Category: Viajes
    Subcategory: Alojamiento
    Topic Title: The Hostel Overbooking Crisis
    Target Objective: quejarse de forma cortés pero firme.
    Key Phrases: ["I was wondering if...", "There seems to be an issue with...", "Could you please check..."]
  </current_topic_vocabulary>

  <narrative_spine>
    Pacing: duración objetivo ~8 min (por banda + nivel; ajustable por preferencia).
    Session Structure:
      - Phase 1: Context Setup (apertura del escenario)
      - Phase 2: Development (aparición del problema)
      - Phase 3: Resolution (negociación y acuerdo)
      - Phase 4: Session Close (salir del marco: repaso + feedback + gancho)
    Current Phase: Phase 1
  </narrative_spine>

  <interaction_state>
    Turn: 1
    Elapsed_Min: 0 / target 8
    Signal: idle
    Current_Phase: Phase 1
  </interaction_state>

  <execution_trigger>
    Phase_Aware: la acción depende de interaction_state.Current_Phase. Las tres viajan en este prompt.
    Opening_Action (Phase 1): presentate como Alex, recepcionista del hostel en Londres. Saludá a Carlos, dale la bienvenida y preguntale por su reserva para abrir el juego. En personaje, una sola pregunta.
    Continuation_Action (Phases 2-3): mantené el roleplay vivo respetando los rieles; una pregunta por turno; hacé avanzar la fricción hacia la resolución.
    Closing_Action (Phase 4): salí suavemente del personaje. Repaso breve al nivel B1 (quejarse con cortesía; frases clave). Entregá 1–2 correcciones de Recent_Errors, sin abrumar. Gancho: "Shall we continue with another situation?" / "Well done, Carlos — see you next time!".
  </execution_trigger>

</system_instruction_stack>
```

Para un nene de 5 (A1), el **mismo** ensamblador produce otro stack: Sparky en lugar de Alex, rieles de 3 pasos con espejo en español, tópico simple, y un `Closing_Action` en español con festejo y sin feedback de errores. La estructura es idéntica; cambian los presets y los datos.

---

## 12. Checklist para el agente: dónde tocar qué

| Querés cambiar… | Andá a… |
|------------------|---------|
| Idioma objetivo, dialecto del L1, regla de voz | Capa 1 `runtime_context` |
| Personalidad/tono del profe | Capa 2 `tutor_identity` (preset por banda) |
| Estilo de enseñanza global | Capa 3 `pedagogical_framework_preset` (preset por banda) |
| El juego/actividad de la sesión | Capa 4 `lesson_focus_engagement` |
| Datos del alumno | No se editan a mano: vienen de la DB → capa 5 |
| Qué repasar / memoria | No a mano: lo escribe el post-clase → `learner_state` |
| Reglas rígidas, límites, prohibiciones, flujo | Capa 6 `behavioral_guards` (⚠ la más sensible) |
| Vocabulario/tópico | Capa 7 `current_topic_vocabulary` (sin instrucciones) |
| Estructura/fases de la sesión, dónde entra el cierre | Capa 8 `narrative_spine` |
| Cómo abre y cómo cierra la clase | Capa 9 `execution_trigger` (Opening/Closing actions) |
| Qué tópico se elige hoy | Upstream: onboarding → kit → Sequencer (no es el prompt) |
| Cuándo dispara el cierre | Pacing en `narrative_spine` + `interaction_state` |

**Antes de tocar nada, recordá el principio 7:** no rompas el composer determinista. Sumá capas, estado o reglas; no reescribas el ensamblado.

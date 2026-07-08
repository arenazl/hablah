# Filosofía del motor (cómo funciona HOY) — para analizar por fuera

> El motor tal cual está hoy: **v2 = compose_proto** (`backend/services/composer_proto.py`), que es el
> que corre en producción (la app real: `/app`, `/kids/sesion`, `/charla`). Esto describe su
> filosofía y su mecánica, no lo que debería ser.

## 1. El núcleo: la clase la arma un MOTOR, no la IA

La clase **no la improvisa la IA**. Un motor de reglas **apila presets desde el DATO** (tablas del
catálogo) y arma un prompt completo (el `<system_instruction_stack>`); recién con ese prompt terminado,
la IA (Gemini Live) **conversa**. La IA es el actor, no el guionista. Eso hace la app determinística y
auditable: dado un cruce, sabés qué prompt sale.

**Regla dura:** cero `if`/parches en el composer. Si algo tiene que cambiar, cambia el DATO (un preset
en una tabla), no el código. La conducta "sale del dato".

## 2. Los 3 pilares

La clase se genera con **EDAD × NIVEL × HISTORIA**:

- **EDAD** (tabla `student_types`, eje "el CÓMO"): quién es el profe (mascota, identidad, tono), la
  pedagogía, el foco de juego, la forma del turno, los seeds de arranque/continuación/cierre.
- **NIVEL** (tabla `levels`, eje "el QUÉ"): el idioma de instrucción (%ES/EN), la gramática objetivo,
  la **producción esperada** (ej. A0 = frase-puente "X se dice Y"; B2 = debate), la profundidad de vocab.
- **HISTORIA** (`learner_state`, dinámico): lo que le gusta, los errores a vigilar, lo dominado, lo que
  toca repasar. **Hoy está vacío** — la app todavía no acumula historia. Es el pilar que, cuando se
  llene, evitará que la clase se repita.

Los dos ejes estáticos (edad, nivel) **se apilan, nunca se cruzan**: el CÓMO no depende del nivel y el
QUÉ no depende de la edad. La historia se inyecta encima cuando existe.

## 3. Los 9 pasos (bloques del prompt) y de qué depende cada uno

El prompt se arma apilando estos bloques (en orden). Al lado, su **dueño** (qué pilar lo determina):

| # | Bloque | Dueño |
|---|---|---|
| 1 | `runtime_context` (idioma, device) | estático |
| 2 | `tutor_profile` (mascota, identidad, tono) | EDAD |
| 3 | `pedagogical_rules` (metodología) | EDAD |
| 4 | `gamification_focus` (foco de juego) | EDAD |
| 5 | `student_profile` (nombre, edad, nivel) | perfil del alumno |
| 6 | `learner_state` (errores/intereses/dominado) | HISTORIA (hoy vacío) |
| 7 | `behavioral_guards` (idioma + gramática + **producción esperada** + forma) | NIVEL + EDAD |
| 8 | `current_lesson_vocabulary` (título + palabras) | **TÓPICO** |
| 9 | `start_execution_command` (arranque) | EDAD (interpola `{topic}`/`{first_vocab}`) |
| + | `session_actions` (continuación + cierre) | EDAD |

**Recency bias:** los bloques del final (arranque, acciones de sesión) pesan más para el modelo que los
del medio. Si un seed del final contradice un guard del medio, suele ganar el seed. Por eso los seeds
delegan la forma a `Expected_Production` en vez de hardcodearla.

## 4. El tópico es LIVIANO (y por eso la orquestación es casi agnóstica del tópico)

El tópico entra como una **semilla**: solo el bloque 8 (`current_lesson_vocabulary`) y dos placeholders
(`{topic}`, `{first_vocab}`) del arranque dependen de él. **Todo el marco pedagógico lo definen edad ×
nivel.** No se fuerza vocab (probado: forzar listas de vocab DEGRADA la clase); el coach genera el
contenido del tema dentro de los rieles, con libertad. Por eso estas dos vistas:

- `orquestaciones/agnosticas/` → el marco puro por (edad × nivel), con el tópico como placeholder.
  **Para analizar las reglas pedagógicas del cruce.**
- `orquestaciones/topic-builtin/` → el mismo marco pero con un tópico concreto enchufado.
  **Para ver cómo queda una clase real.**

## 5. Fail-fast, sin fallbacks

Si falta un dato de catálogo, el motor **explota** (`MotorDataMissing`) con el nombre exacto del campo
a cargar, en vez de rellenar con un default silencioso. Motivo: un default enmascara un olvido de carga
y no sabés si el prompt lo armó el dato o el fallback. Mejor saber qué falta.

## 6. Qué NO hace (a propósito)

- **No persiste orquestaciones.** Se generan al vuelo (JIT) apilando presets. No hay una tabla con "la
  clase de Mi-familia-para-mini-A0" precompilada: se arma en el momento. (Es O(edad + nivel + tópico)
  de catálogo, no O(edad × nivel × tópico) de combos curados.)
- **No cruza los ejes.** Edad y nivel se apilan; no hay tabla-cruce edad×nivel.

## 7. Dónde vive en el código

- `backend/services/composer_proto.py` → `compose_proto_prompt(...)`: arma los bloques.
- `backend/services/gemini_live.py`: carga los datos (student_types, levels, topic, app_config,
  learner_state) y llama al composer; después abre el WS de voz.
- Tablas: `student_types` (edad), `levels` (nivel), `topics` (tópico), `app_config` (reglas de voz),
  y el `learner_state` (post-clase, hoy vacío).

## 8. Cómo se arma el prompt, en concreto — y sus peculiaridades

El composer concatena los bloques (§3) en orden fijo y produce un `<system_instruction_stack>` (XML
plano). Peculiaridades que hay que tener en la cabeza porque **el prompt no se cumple al 100%**:

1. **Recency bias:** los bloques del final (arranque, `session_actions`) pesan MÁS para el modelo que
   los del medio (guards). Si un seed del final contradice un guard del medio, **suele ganar el seed**.
   Por eso los seeds delegan la forma a `Expected_Production` en vez de hardcodearla — para no competir.
2. **Reglas que compiten = clase tibia.** Si la misma conducta está escrita en 2-3 capas
   (pedagogía + form_rules + seeds) y difieren un poco, el modelo **promedia** y sale mecánico/robótico.
   Regla: **cada regla en UNA sola capa.** Duplicar marea al modelo.
3. **Placeholders:** `{topic}`, `{first_vocab}`, `{name}` se interpolan en los seeds; si falta el dato,
   quedan literales en el prompt (bug visible).
4. **Bloques opcionales, no fallback:** `learner_state`, `output_rules`, `story_spine` se OMITEN si no
   hay dato (no se inventan). Hoy `learner_state` casi siempre se omite (no hay historia).
5. **Fail-fast:** si falta un dato obligatorio, `MotorDataMissing` (no default silencioso).

## 9. La infraestructura de la conversación (donde el papel choca con la realidad)

**Cómo se genera la charla:** el prompt va a **Gemini Live** (modelo `models/gemini-3.1-flash-live-preview`),
por un **WebSocket bidireccional de audio** (voz Aoede), con **VAD del lado de Gemini** (Gemini decide
cuándo terminó de hablar el alumno). Backend en **Cloud Run us-east4** (cerca de la DB Aiven NYC; la
migración bajó mucho la latencia).

**PROS:** latencia baja (~500 ms), audio nativo, charla fluida, no manejamos VAD nosotros.

**CONTRAS (los que nos pasaron de verdad, end-to-end):**
- **El VAD no capta monosílabos (<1 s):** un "sí"/"no" no se transmite → la clase queda muda. Por eso
  A0 usa la **frase-puente** ("X se dice Y"): obliga a un enunciado largo que el VAD sí capta. (La
  pedagogía y la infra empujan a la MISMA solución — no es casualidad.)
- **Sample rate:** iOS capta a 48 kHz; hay que **resamplear a 16 kHz** en el backend o Gemini no
  transcribe el input y el coach queda mudo.
- **El coach corta al alumno** (sensibilidad de fin-de-turno) y el ASR transcribe a medias → **los
  scores por voz no son 100% confiables**; validar escuchando, no solo por texto.
- **1011 = sin crédito** en la key (el WS cierra). **Nombre de modelo sin prefijo `models/`** → la API
  Live lo rechaza (nos rompió el voice tras la migración).

## 10. El eslabón estocástico: la IA INTERPRETA, no obedece

**Este es el punto que la filosofía sola esconde.** El motor es determinístico **hasta que entrega el
prompt**. De ahí en adelante, el modelo **interpreta** ese prompt y **toma decisiones** — no lo cumple
al pie de la letra. Consecuencias reales:

- Aunque el dato **prohíba** preguntas sí/no o mencionar fotos, el modelo **a veces igual las mete**:
  lee "escenario/visual/pantalla" y completa con recursos que no existen; o hace la pregunta cerrada
  aunque esté prohibida.
- Aunque las directivas pidan **variar / no-robot**, el Flash tiende a ejecutar la lectura más
  **literal y segura** → sale robótico. Lo vimos y lo llamamos **"el muro del Flash"**: el dato está
  perfecto pero el modelo lo sub-ejecuta.

**Por eso:** (a) un prompt que "se ve genial" puede fallar en vivo — **texto ≠ voz**, hay que validar
END TO END por micrófono; (b) las directivas tienen que ser **imperativas y no competir** entre capas
(§8.2); (c) si el modelo no ejecuta lo que el dato pide, puede hacer falta un **modelo más fuerte para
el rol de coach**. La calidad final = motor determinístico **×** qué tan bien el modelo obedece el prompt.

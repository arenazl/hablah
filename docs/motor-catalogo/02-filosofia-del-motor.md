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

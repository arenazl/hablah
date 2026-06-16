# Blueprint — Modelo del motor (11 capas), seed e interfaz

> Fundación del "armar el modelo bien de entrada". Cubre: las capas, el schema
> (tablas/columnas por edad × nivel + las nuevas), el mapa de seed (de dónde sale
> cada contenido) y el editor visual. **Para revisar y editar antes de tocar la BD.**
> Alcance: TODOS los segmentos × niveles. Interfaz: editor visual ReactFlow.
> Estado: propuesta · 2026-06-15.

---

## 1. Las capas del motor (9 + 2 patitas + seguridad)

| # | Capa (bloque) | Responde | Varía por | Fuente en BD |
|---|---|---|---|---|
| S | `safety_guards` (NUEVO, estático) | qué nunca hacer (seguridad infantil) | fijo / segmento | estático o tabla `safety_rules` |
| 1 | `runtime_context` | fecha, idiomas, dispositivo | transversal | runtime |
| 2 | `tutor_profile` | quién enseña, tono | **edad/segmento (+género?)** | `StudentType` |
| 3 | `pedagogical_rules` | cómo enseña | edad/segmento | `StudentType` |
| 4 | `gamification_focus` | dinámica/juego | edad/segmento | `StudentType` |
| 5 | `student_profile` | quién es este alumno | individual | `User` |
| 10 | `learner_state` (PATITA 1) | qué domina/falla/le gustó | individual | `vocab_progress`, `student_interests`, `student_traits` |
| 6 | `behavioral_guards` (rieles) | qué forma del idioma puede usar + do/don't | **nivel × segmento** | `MethodologyModule` |
| 7 | `current_lesson_vocabulary` | palabras de hoy | tópico × nivel | `TopicModuleContent` |
| 8 | `story_timeline` (narración) | la historia donde ocurre | **tópico × nivel × edad** | `TopicModuleContent` |
| 9 | `start_execution_command` | cómo arranca | tópico × nivel × edad | `TopicModuleContent` |
| 11 | `interaction_state` (PATITA 2) | cómo viene el turno (vivo) | en sesión | memoria (app) |

> Las patitas 10 y 11 ya están en `composer_proto.py` (aditivas: omitidas si no hay dato → prod intacto).

---

## 2. Schema — tablas existentes (a completar) + nuevas

### Existentes (hoy con fallback, hay que llenar)
- **`StudentType`** (por segmento) — queda **gender-agnostic, solo lo pedagógico**:
  `session_focus`/`pedagogical_style`, `gamification_focus`, duración. La **persona del
  coach se saca** a la nueva entidad `Coach` (ver abajo) — esto resuelve D1+D3.
  → **NUEVO**: `closing_seed` (frase de cierre, notas 02/03), `max_session_minutes`, `max_turns`.
- **`Coach`** (NUEVO) — la **persona** del tutor. **2+ por segmento: femenino y masculino**,
  misma pedagogía, distinta personalidad + voz:
  `segment, gender, name, identity, personality (tonal_rules), voice_name`.
  Alimenta el **bloque 2** (tutor_profile). El alumno elige; `User.preferred_coach_id`
  + género como default sugerido.
- **`MethodologyModule`** (por segmento × nivel A0..C2)
  `ai_restraints (rieles + do/don't), target_grammar, focus_name, evaluation_criteria`
  → **NUEVO**: `max_session_minutes`, `max_turns` (Regla 1 duración), `spanish_mirror_rule` (desvanecer espejo), `skill_stage_rules` (repetir→reconocer→recordar→usar)
- **`TopicModuleContent`** (tópico × módulo[=segmento×nivel])
  `allowed_vocabulary, required_keywords, story_spine, start_trigger`
  → la **narración cambia con la edad** porque el módulo incluye el segmento. OK.
- **`Topic`** `title, segmento, audience, keywords, pinned_vocabulary, is_curriculum`
- **`User`** `age_group, cefr_level, target/base_language` → **NUEVO**: `gender` (si D1=sí)

### Nuevas — referencia
- **`Level`** (NUEVO) — los niveles CEFR con **nombre amigable** para el usuario (no mostrar "A1" pelado): `code (A0..C2), friendly_name, order, short_desc`. Lo usa la UI (el alumno ve dónde está) y el selector de nivel del editor.

### Nuevas — estado del alumno (de las mejoras 06/07/08)
- **`vocab_progress`** (SRS): item, skill_stage, status, seen/success/fail_count, ease, next_review → alimenta `learner_state`
- **`reinforcement_queue`**: item, reason, priority
- **`student_interests`**: interest, source(declared|detected), weight
- **`student_traits`**: trait, confidence
- **`session_log`** + **`session_insights`** (post-clase)
- **`curriculum_sequence`** (el sequencer que elige el tópico del día)

---

## 3. Cómo varía cada cosa (la regla de oro del modelo)

- **Tutor / tono / gamificación** → por **EDAD/segmento** → `StudentType`.
- **Rieles / gramática / espejo / duración / do-don't** → por **NIVEL × segmento** → `MethodologyModule`.
- **Vocab / narración / trigger** → por **TÓPICO × nivel × edad** → `TopicModuleContent`.
- **Memoria (errores, dominado, intereses)** → por **ALUMNO** → tablas de estado.

---

## 4. Mapa de seed — de dónde sale cada contenido (¡ya está escrito!)

| Tabla | Fuente | Qué se porta |
|---|---|---|
| `StudentType` | `04_composer_3inputs.py` (TUTOR_PRESETS, PEDAGOGY_PRESETS) + `05_20_ejemplos` | persona/tono/estilo por banda |
| `MethodologyModule` | `04` (RIELS_PRESETS[band] + LEVEL_MOD[level]) + frase-puente + Regla 1 + safety | rieles + reglas por nivel×segmento |
| `TopicModuleContent` | `04` (THEMES: 20 tópicos con vocab/phrases/kid_narrative/adult_narrative) + `05` | vocab + narración + trigger por tópico×nivel×edad |
| `Topic` | `04` THEMES (keys) | el catálogo de tópicos |

> **No hay que inventar contenido**: los presets de `04` y los 20 ejemplos de `05` son el seed. El trabajo es estructurarlo en filas por (segmento × nivel × tópico).

---

## 5. Interfaz — editor visual ReactFlow

- **Selectores arriba:** edad/segmento · género · nivel · tópico.
- **Grafo:** un nodo por capa (las 11 + safety). Al elegir la combinación, cada nodo trae su fila de BD para esa combinación.
- **Editable:** tocás un nodo → editás su campo → PATCH a la tabla correspondiente.
- **Preview en vivo:** al lado del grafo, el **prompt final** que produce `compose_proto_prompt` con esa combinación (para que veas el efecto de cada edición).
- **Disparar prueba:** botón para correr esa combinación en una sesión de voz (reusa el banco `/llm`).
- Backend: endpoints CRUD por entidad (StudentType / MethodologyModule / TopicModuleContent / Topic).

---

## 6. Decisiones pedagógicas que necesito de vos (antes de seedear)

- **D1 — Género:** ¿afecta el modelo? ¿qué cambia (voz, tutor, narración, ejemplos)? ¿o por ahora no?
- **D2 — Nombre del tutor:** ¿canónico "Sparky" (spec) o "HABI" (código)? ¿uno por segmento?
- **D3 — Pedagogía vs gamificación:** hoy comparten `session_focus`. ¿Los separo en dos campos de `StudentType`?
- **D4 — Estado del alumno (patitas 10/11): RESUELTO.** El post-clase (el *procesamiento*) es un módulo aparte → se hace **después**. PERO el **camino de la ida persiste TODO el crudo AHORA** (transcript completo + contadores de interacción + target items + log de la sesión) en `sessions.raw_session_data`. Sin captura ahora, no hay data histórica cuando construyamos el post-clase. Ver §8.
- **D5 — Duración por (segmento × nivel):** los números (ej: mini A0 = 5 min). ¿Los definís vos o arranco con una tabla tentativa para que ajustes?

---

## 7. Plan de ejecución (después de tu OK al blueprint)

1. **Migración** — agregar columnas/tablas nuevas (las de §2).
2. **Seed** — script que porta los presets de `04`/`05` a filas (§4).
3. **Wire** — el composer pasa a leer TODO de BD; los fallbacks hardcodeados → dato (revisar lo estático).
4. **Captura de crudo para el post-clase** (§8) — va junto con el wire, NO después.
5. **Editor ReactFlow** + endpoints CRUD (§5).

---

## 8. Captura de crudo para el post-clase (requisito del camino de la ida)

El post-clase (procesamiento) se construye después, pero **la ida tiene que guardar
ya toda la materia prima** que ese paso va a necesitar. Hoy gran parte se loguea al
stdout de Heroku (efímero, rota) y **se pierde**.

**Qué persistir por sesión** (a `sessions.raw_session_data` JSON, al cerrar):

| Dato | Para qué (post-clase) | ¿Hoy? |
|---|---|---|
| Transcript completo (turno × turno) | Mitad B (LLM lee la charla) | **sí** (`sessions.transcript`) |
| Prompt final + circuito (qué capas se usaron) | auditar la clase | **sí** (`prompt_circuit`) |
| Contadores de interacción (turnos, intentos por ítem, ok/fail, audio/text chunks, timing) | Mitad A (SRS determinista) | **no** → hoy solo a stdout |
| Target items de la sesión (vocab objetivo) | saber qué se intentó enseñar | **no** |
| Log: duración, turnos, completada, señales afectivas | `session_log` | **no** |

**Tarea concreta:** al final de la sesión (`voice_proxy` / engine), volcar los
`counters` + target items + timing a `sessions.raw_session_data`. Es barato (un
INSERT al cierre, fuera del tiempo real) y deja la data lista para cuando el
post-clase exista.

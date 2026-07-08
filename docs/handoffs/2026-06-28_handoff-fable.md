# HANDOFF PARA FABLE — Habláh: historia, estado y honestidad

> Para el modelo que toma la app mañana (Fable 5). Esto es el CONTEXTO que la foto actual del
> código NO muestra: **cómo mutó la app, qué se decidió, qué se rompió y por qué.**
> No hay culpables — se apilaron capas de requisitos del dueño + decisiones de varios agentes +
> cambios de rumbo, y terminó en un Frankenstein. Leé esto ANTES de tocar nada.
>
> Docs hermanos: [plan de recuperación](../01-recuperacion-motor/01-plan-recuperacion.md) (análisis
> objetivo de los 3 motores + plan) · [deudas técnicas](../01-recuperacion-motor/02-deudas-tecnicas.md).

---

## 1. El concepto primario (lo que la hacía un 8/10)

- App de clases de inglés **por voz** (Gemini Live), **determinística**.
- La clase **NO la improvisa la IA**: la arma un **motor de reglas de 9 pasos** apilando presets, y
  recién con el prompt ya armado, la IA conversa.
- **3 pilares** generan la clase: **EDAD + NIVEL + HISTORIA**. Con esos 3 sale todo — parte
  **estática** (presets) + parte **dinámica** (la historia del alumno: intereses, errores, dominado).
- El **tópico** cuelga de la EDAD (por interés: dinos para un nene, no para uno de 70) y puede estar
  en varios niveles.
- El tópico es **liviano** (una semilla): el coach tiene **libertad** dentro de los rieles. NO se
  fuerza vocab, NO se scriptea. "La clase de dinos no es siempre preguntar por el T-Rex."
- **El determinismo es el alma. No se toca.** El mismo motor sirve al nene de 5 y al adulto de 60:
  cambian los presets (edad+nivel), no el motor.

---

## 2. La historia: cómo mutó el motor (y dónde se rompió)

| Motor | Qué era | Estado |
|---|---|---|
| **v1 — `super_prompt`** | **ESTÁTICO**: un super-prompt template fijo (rigor/tono/challenges). | Muerto (borrado 2026-06-17). |
| **v2 — `composer_proto`** | **REGLAS / 2 ejes JIT**: apila `student_types`(edad) + `levels`(nivel) + `topics` + `learner_state`, al vuelo, sin persistir. | **EL QUE FUNCIONABA (8/10). Es producción HOY.** |
| **v3 — `motor_engine`** | **REGLAS + PLANTILLAS + ORQUESTACIÓN PERSISTIDA**: 9 capas explícitas, `trigger_template` (plantillas), tabla `orchestration` (persistir custom por perfil), SRS. | Experimento. **NUNCA llegó a producción** (flag `MOTOR_V3_KIDS=0`). |

**El arco (en palabras del dueño):**
`estático (v1)` → `modelo de reglas (v2)` → `reglas + plantillas (v3)` → **las plantillas se hicieron
transversales/genéricas** → **eso rompió el dinamismo.**

**El quiebre, concreto:** en v3 las plantillas (`trigger_template`, seeds, `expected_production`) se
volvieron un **molde genérico para todos**, y la tabla `orchestration` (donde vivirían las clases
custom por perfil) quedó **vacía (5 demos)**. Resultado: la orquestación dejó de ser **custom por
perfil (edad×nivel×tópico)** y pasó a ser genérica → **se perdió el dinamismo**. Síntomas reales:
clase de "animales de la selva" sin un solo animal, A0 con preguntas sí/no (que el VAD no capta),
"te muestro una foto" en una app de solo voz.

**El malentendido que costó semanas:** el **TEST** (`/mini-test`, `/finaltest`, editor `/motor`) se
construyó sobre **v3**. Entonces el dueño **probaba v3 (roto)** mientras **producción corría v2
(sano)** → falsa sensación de "la app se rompió". Los arreglos al catálogo de v2 "no se veían" porque
el test no leía v2.

---

## 3. La foto actual (post-recuperación de esta semana)

- **DECISIÓN TOMADA: motor único = v2 (`composer_proto`).** v3 y v1 se jubilan.
- `/mini-test` ahora corre por **v2** (ws `/api/voice/ws_mini` → `motor_engine.resolve_v2`). Validado
  por voz real: fluida, VAD ok, comprensión ok. **La infraestructura se recuperó.**
- `/mini-test` tiene un **visor de los 9 pasos** (desglose por campo, con su `tabla.columna` y su
  "dueño" = de qué pilar depende). Sirve para VER la orquestación determinística.
- A0 **de-robotizado** en el dato (reversible; scripts `backend/scripts/fix_a0_derobot.py` +
  `restore_a0_derobot.py`).
- PWA **auto-actualizable** (version.json + versionCheck + SW network-first + no-store).
- **PENDIENTE:** `/finaltest` y editor `/motor` todavía resuelven por v3 — falta jubilarlos.

### Mapa superficie → motor (EL error recurrente — no volver a caer)
- **App real de producción** → v2 (`gemini_live` → `build_super_prompt` → `compose_proto`).
- **/mini-test** → v2 (ws_mini). **/finaltest, /motor** → todavía v3. Antes de tocar/probar algo,
  preguntar: **"¿en qué motor lo estoy probando?"**

---

## 4. Los 9 pasos y su DUEÑO (la matriz de dependencias — el corazón del modelo)

Cada paso del prompt es un **preset separado** en su tabla (NO un registro único). Se apilan:

| Depende de… | Qué preset | Tabla |
|---|---|---|
| **estático** (toda clase) | runtime, seguridad/voz, y el CÓMO se conversa (anti-robot) | runtime / `app_config` / *(capa universal a crear)* |
| **EDAD** | profe/mascota, tono, pedagogía, juego, forma, arranque, turno | `student_types` |
| **NIVEL** | idioma %ES/EN, gramática, **forma de producción** (A0 frase-puente, B2 debate), profundidad | `levels` |
| **EDAD + NIVEL** | andamiaje/rescate ES↔EN, el arranque concreto | (emerge del apilado) |
| **EDAD + NIVEL + TÓPICO** | el contenido puntual — **emergente**, tópico liviano, coach genera | `topics` (liviano) |
| **HISTORIA** (dinámico) | intereses, errores a vigilar, dominado, a repasar → evita repetición | `learner_state` |

---

## 5. Decisiones SETTLED (no re-litigar — se charlaron a fondo)

1. **Generar, NO persistir** orquestaciones. (Persistir = curar edad×nivel×tópico = miles de combos,
   inviable; nunca se hizo. La tabla `orchestration` se deja morir.)
2. **NO forzar vocab** (probado: degrada la clase — libre 7.7/8.8 vs vocab 6.5).
3. **NO engordar el tópico** (`seed_prompts` llegó a 10KB en adultos y **ni lo lee el motor** = peso muerto).
4. **NO curar 2000 combos a mano** (la sesión pasada quemó ~US$120 yendo a eso sin cimientos).
5. **Cada regla en UNA capa** — si la repetís en dos lados, compiten y marean al LLM.
6. El **"cómo se conversa" (anti-robot: variá, reciclá, seguí al alumno, la estructura es vehículo)**
   es **transversal** → va en **UN solo lugar** (capa universal). Hoy está disperso en seeds/form_rules
   → **falta extraerlo** (charlado, no implementado).

---

## 6. Los errores detectados (honestidad — sin culpables)

Fueron capas de capas: requisitos que cambiaron, cada agente sumando sin consolidar, y decisiones que
en su momento parecían razonables. Los concretos:

1. **El test sobre el motor equivocado.** `/mini-test` y `/finaltest` se armaron sobre v3 (nunca
   shipeado) mientras producción corría v2 → el dueño evaluaba un motor y arreglábamos otro. **Éste
   fue el más caro en tiempo y confianza.**
2. **Perseguir la persistencia de orquestaciones (v3)** que nunca se realizó (5 demos) y **no hacía
   falta**: el modelo correcto (generar de presets) ya existía en v2 desde el principio.
3. **Engorde del tópico**: se le metieron campos (`seed_prompts` 10KB, structures, mastery…) que el
   motor no consume — ruido que hizo ver el modelo más complejo de lo que es.
4. **Forzar vocab** se re-intentó pese a estar probado que degrada.
5. **Corrupción de datos** por un batch de "quitar emojis" (2026-06-24) que truncó campos de
   `student_types` (ej. "Aventur667"). Se restauró, pero mandó a diagnosticar el motor cuando el
   problema era el dato.
6. **Reglas duplicadas entre capas** (pedagogía + form_rules + seeds decían lo mismo del "no robot")
   → compiten y el LLM promedia hacia lo mecánico.
7. **El "muro del Flash"**: aun con el dato perfecto, Gemini Flash **sub-ejecuta** las directivas
   (sale robótico igual). Ver §8.
8. **Bug activo en producción**: `app_config` se carga vacío en el WS de voz (reglas de voz
   ignoradas) — ver DEUDAS_TECNICAS #2.
9. **Captura VAD/ASR**: el coach corta al alumno; los scores de voz no son 100% confiables hasta
   arreglarlo. Validar SIEMPRE por micrófono real (texto ≠ voz).

---

## 7. Hoja de ruta para Fable (en orden sugerido)

1. **Confirmar/validar** por voz el estado actual (A0 de-robotizado). Si sigue robótico → §8.
2. **Capa universal anti-robot** (sacar el "cómo se conversa" de seeds/form_rules a un solo preset
   transversal que el composer apila siempre). Es el fix de raíz del robotismo + DRY.
3. **Historia (3er pilar) en el test**: hoy el test va con historia 0; cablear intereses/errores y
   comprobar que el coach los USA (que la clase 2 no repita la 1).
4. **Limpiar el tagging tópico↔edad↔nivel** (`segmento` + `levels[]`; hay ruido) y mantener el tópico
   liviano.
5. **Jubilar v3** de `/finaltest` y `/motor` (que todo el test corra v2). Un solo motor vivo.
6. **Bugs transversales**: `app_config=None`, captura VAD/ASR (DEUDAS_TECNICAS).

---

## 8. El riesgo grande a tener presente (el "muro del Flash")

Aunque el DATO esté perfecto, **Gemini Flash tiende a ejecutar la lectura más literal/segura y sale
robótico** — ya pasó antes ("el learned_state persiste pero el coach lo sub-usa"). Opciones si las
directivas no alcanzan: (a) hacerlas más imperativas y consolidadas (capa universal), (b) evaluar un
**modelo más fuerte para el rol de coach**. Y **validar siempre por voz real**, no por juez de texto
(los scores de texto no transfieren 1:1 a la voz por el tema VAD/ASR).

---

## 9. Punteros a los archivos clave

| Archivo | Qué es |
|---|---|
| `backend/services/composer_proto.py` | **El motor v2** (el bueno). Apila los presets → prompt. |
| `backend/services/motor_engine.py` | Puente async + `resolve_v2` (motor único para el test) + v3. |
| `backend/services/gemini_live.py` | WS de voz de producción (arma el prompt con compose_proto). |
| `backend/api/voice.py` | `ws_mini` (test por v2) + `ws_orchestration` (v3, a jubilar). |
| `backend/api/finaltest.py` | Endpoints del test: `/mini/topics`, `/mini/preview` (desglose), juez. |
| `frontend/src/pages/MiniTestPanel.tsx` | La paginita: combos edad/nivel/tópico + visor de 9 pasos. |
| `backend/motor_core/motor_prompt.py` | El motor v3 (9 capas + orquestación). Referencia; se jubila. |
| `docs/01-recuperacion-motor/01-plan-recuperacion.md` · `02-deudas-tecnicas.md` | Plan objetivo + deudas. |

**Deploy:** continuo vía el proyecto Infra **`structure`** (`d:\Code\structure`). Un push a
`origin/main` deploya (Heroku backend + Netlify front). NO deployar a mano.

**Datos:** una sola base Aiven (compartida por v2 y v3). NO correr seeds a ciegas (hoy el catálogo de
v2 está sano; verificar con `repr()` antes de tocar).

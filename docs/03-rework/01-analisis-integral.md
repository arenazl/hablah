# Análisis integral — por qué se degradó la calidad y cómo está la arquitectura final

> Autor: Fable (2026-07-09). Análisis de contexto y lógica COMPLETO — los modelos implementadores
> (Opus/Sonnet) NO deben re-analizar nada de esto: su trabajo empieza en `02-hoja-de-ruta.md`.
> Evidencia: handoffs (`docs/handoffs/`), plan de recuperación (`docs/01-recuperacion-motor/`),
> infra (`docs/02-infra/`), filosofía (`docs/motor-catalogo/filosofia-del-motor/`), código real
> (`backend/services/`, `frontend/src/`), y la base Aiven (inspeccionada 2026-07-08).

---

## PARTE 1 — Por qué se degradó la calidad (las 7 causas raíz, con evidencia)

La degradación NO fue un bug ni una mala arquitectura de base: el concepto original (motor
determinístico de 9 pasos, 3 pilares, IA solo como actor) era y sigue siendo un 8/10. La calidad se
degradó por **siete patrones de proceso** que se apilaron. En orden de daño:

### Causa 1 — Se construía en paralelo sin consolidar (tres motores conviviendo)

v1 (super-prompt estático) → v2 (composer_proto, reglas JIT) → v3 (motor_engine, plantillas +
orquestación persistida). Cada generación se construyó **al lado** de la anterior, nunca **encima**:
v1 se borró recién el 2026-06-17, v3 nunca shipeó (flag `MOTOR_V3_KIDS=0`) pero colonizó todas las
superficies de test. Resultado: tres motores, dos catálogos mentales, y cada agente nuevo sumando a
la capa que encontraba primero.

**El síntoma más caro:** `/mini-test` y `/finaltest` se construyeron sobre v3 mientras producción
corría v2. **El dueño evaluó durante semanas un motor que no era el de producción** — veía "animales
de la selva sin un solo animal", "preguntas sí/no en A0", "te muestro una foto" (todos síntomas de
v3 roto) y concluía "la app se rompió", mientras v2 seguía sano. Los arreglos al catálogo v2 "no se
veían" porque el test no leía v2. Éste fue el mayor costo en tiempo y confianza de todo el proyecto.

### Causa 2 — v3 persiguió exactamente lo que el spec rechazaba

El spec del dueño dice "GENERAR, no persistir" (concatenar presets al vuelo). v3 se diseñó alrededor
de **persistir orquestaciones curadas** por perfil (tabla `orchestration`): eso implica curar
edad × nivel × tópico = miles de combos. Nunca se curaron (la tabla quedó en 5 demos), así que v3
servía **plantillas genéricas** para todos → se perdió el dinamismo que era el alma del producto.
Una sesión quemó ~US$120 yendo hacia los 2000 combos antes de frenar. La lección quedó como
anti-goal settled: la complejidad correcta es O(edad + nivel + tópico) de catálogo, no
O(edad × nivel × tópico) de combos.

### Causa 3 — El dato es el código de este motor, pero se trató sin disciplina de código

La regla de oro del motor es "la conducta sale del DATO" (cero `if` en el composer). Eso convierte
las tablas del catálogo en **el código fuente real** de la app. Pero el dato nunca tuvo las
prácticas que el código sí tiene (git, diff, review, tests):

- Un batch de "quitar emojis" (2026-06-24) **truncó campos** de `student_types` ("Aventur667") y
  mandó a diagnosticar el motor cuando el problema era el dato corrupto.
- `seed_prompts` llegó a **10KB por tópico** en adultos — campo que el motor **ni lee**. Peso muerto
  que hizo ver el modelo más complejo de lo que es y tentó a más engorde.
- `keywords` acumuló ~40 términos multilingües por tópico cuando el motor lee **solo los primeros
  6** (`keywords[:6]`). Nadie sabía qué parte del dato era viva y qué parte era fósil.
- Se re-intentó **forzar vocab** pese a estar medido que degrada (clase libre 7.7/8.8 vs con vocab
  forzado 6.5/6.5).
- Seeds corridos a ciegas pisaron dato sano más de una vez ("NO correr seeds" terminó como regla).

**Patrón:** cada escritura al catálogo era un deploy a producción sin diff, sin backup y sin test.
Recién el 2026-07-08 se estableció el patrón correcto (scripts dry-run → diff visible → backup →
apply), con el volcado del catálogo v3.

### Causa 4 — Reglas duplicadas entre capas → "clase tibia"

La misma conducta ("no seas robot", "variá", el flujo del turno) se escribió en 2-3 capas a la vez
(pedagogía + form_rules + seeds), con redacciones levemente distintas. El LLM ante reglas que
compiten **promedia** → sale mecánico. Confirmado por Gemini (dueño del modelo): "si le decís 'sé
divertido' en el perfil y 'mantené rigor' en la pedagogía, el modelo promedia y sale aburrido".
Sucedió porque cada iteración pedagógica agregaba su regla donde estaba trabajando, sin barrer las
copias anteriores. La regla "cada regla en UNA capa" existe, pero no hay ningún mecanismo que la
haga cumplir — es disciplina manual, y la disciplina manual pierde contra el tiempo.

### Causa 5 — El loop de validación estuvo roto casi siempre (se tuneó contra ruido)

Para mejorar un sistema estocástico necesitás una vara confiable. Casi nunca la hubo:

- **Scores de texto sobre el motor equivocado** (v3) — semanas de números que no median producción.
- **El alumno simulado estaba roto**: los 429 de Ollama daban un "alumno mudo" y el famoso "3" de
  early_child A1 era infra del test, no el coach (subió a 7.3 sin tocar un dato al arreglarlo).
- **Texto ≠ voz**: el VAD no capta monosílabos (<1s), el coach corta al alumno, el ASR transcribe a
  medias → los scores por voz tampoco son 100% confiables (deuda abierta).
- Los LLM son estocásticos: una corrida miente. El circuito 5×4 (5 muestreos × 4 historias) llegó
  tarde como vara oficial.

**Consecuencia:** varias "mejoras" y "regresiones" fueron ruido de medición. Se tomaron decisiones
de dato sobre señales falsas.

### Causa 6 — El techo del actor: "el muro del Flash"

Aunque el dato esté perfecto, Gemini Flash **sub-ejecuta** las directivas: ejecuta la lectura más
literal/segura (sale robótico), sub-usa el learner_state, mete preguntas cerradas prohibidas y
recursos visuales inexistentes. El motor es determinístico **hasta que entrega el prompt**; de ahí
en más la calidad es motor × obediencia del modelo. Este factor no se gestionó como variable propia:
no hubo jerarquía semántica en el prompt (recency bias sin mitigar: el bloque 9 le gana al 7), ni
evaluación seria de un modelo más fuerte para el rol de coach. Gemini (dueño del modelo) confirmó el
diagnóstico y propuso el mitigador concreto (etiquetas de alta prioridad).

### Causa 7 — La superficie de trabajo devoró al producto

Medido en el repo hoy: **~16 rutas top-level de test/laboratorio** (`/llm`, `/finaltest`,
`/mini-test`, `/training`, `/probar-orq`, `/motor`, `/auditoria`, `/orquestacion`, `/comparacion`,
`/transcripciones`, `/infra`, `/tune`, `/kids/kit`, `/kids/galeria`, `/kids/curar`,
`/transcripciones-vocab`) + **~15 paneles** bajo `/admin/*`, contra **~5 superficies de producto**
(landing, login, `/app`, `/kids`, `/charla`). Además `WebApp.tsx` — la app adulta entera — es **un
solo archivo de 3.744 líneas**.

Cada experimento dejó un panel atrás y nadie los jubiló. Costos concretos: (a) el dueño aterrizaba
en paneles v3 y veía "roto" (causa 1 amplificada); (b) los agentes nuevos no sabían qué superficie
era producto y cuál laboratorio; (c) rutas de laboratorio quedaron públicas; (d) el bundle del
producto carga código de banco de pruebas. La app se volvió el banco de trabajo de su propio motor.

### Síntesis causal (cómo se encadenaron)

```
v3 persigue persistencia (C2) ──► 3 motores en paralelo (C1) ──► test sobre motor equivocado (C1)
        │                                                                 │
        ▼                                                                 ▼
paneles v3 por todos lados (C7)                              se tunea contra ruido (C5)
        │                                                                 │
        ▼                                                                 ▼
dato engordado/corrupto sin guardas (C3) ──► reglas duplicadas (C4) ──► clase tibia
                                                                          │
                                                                          ▼
                                                        Flash sub-ejecuta lo que queda (C6)
                                                                          │
                                                                          ▼
                                                            "la app se degradó" (percepción)
```

No hubo UNA falla: hubo un sistema sin mecanismos de consolidación, guarda y medición, en el que
cada capa razonable individualmente sumó al pozo.

---

## PARTE 2 — La arquitectura final, pieza por pieza (estado 2026-07-09)

### 2.1 El motor (v2 · `composer_proto.py`, 303 LOC) — VEREDICTO: correcto, conservar

Cumple 8/9 conceptos del spec (el 9º —"el test corre este motor"— se recuperó a medias: `/mini-test`
sí, `/finaltest` y `/motor` todavía no). Es chico, legible, determinístico, fail-fast
(`MotorDataMissing` con el campo exacto), apila EDAD (`student_types`) + NIVEL (`levels`) + TÓPICO
(`topics`, liviano) + HISTORIA (`learner_state`) sin cruzar ejes ni persistir. **No se reescribe.
El rework del motor es cerrarle los 5 huecos:**

| # | Hueco | Detalle |
|---|---|---|
| M1 | Anti-robot disperso | El "cómo se conversa" vive repartido en seeds/form_rules (violación de "una regla una capa"). Falta la **capa universal** transversal. |
| M2 | Recency bias sin gestionar | Los bloques finales (arranque/seeds) le ganan a los guards del medio. Falta jerarquía semántica (etiqueta de alta prioridad a la producción esperada — recomendación textual de Gemini, dueño del modelo). |
| M3 | HISTORIA no cerrada | `learner_state` vacío: el post-clase no lo escribe, el composer lo omite siempre. El 3er pilar —lo que evita que la clase se repita— es una promesa, no una feature. |
| M4 | Fail-fast solo adentro | La filosofía anti-fallback rige dentro del composer pero NO en los bordes: `app_config` cargó `None` en silencio durante semanas en producción (reglas de voz ignoradas sin un solo error). Arreglado el 2026-07-08, pero sin regresión que lo proteja. |
| M5 | Dato fósil en `topics` | `seed_prompts` (hasta 10KB) y `keywords[7..40]` no los lee nadie. Trampa para el próximo agente que "vea" el dato y construya sobre él. |

### 2.2 El backend (25+ servicios) — VEREDICTO: sano en el hot-path, con capas geológicas

- **Hot-path de voz** (`gemini_live.py` → `build_super_prompt` → `compose_proto` →
  `voice_engines/gemini_live_engine.py`): correcto y validado por voz. OJO: `super_prompt.py` es el
  **wrapper de v2**, no el v1 muerto — no confundir por el nombre.
- **Capas geológicas:** `motor_engine.py` (v3, 361 LOC) sigue vivo en `/finaltest` y `/motor`;
  conviven además `composer_rules`, `motor_protocol`, `runtime_prompt`, `learning_objectives`,
  `topic_brief`, analizadores varios (`session_analyzer`, `live_analyzer`, `memory_analyzer`,
  `preference_detector`) — generaciones distintas sin pasada de retiro. Nadie sabe de memoria cuáles
  tienen llamadores vivos.
- **`backend/scripts/`: ~50 scripts** de seed/migración/diagnóstico acumulados, varios peligrosos si
  se corren hoy (seeds que pisan dato sano). Sin convención que separe los vivos de los fósiles.

### 2.3 El frontend — VEREDICTO: buen esqueleto de producto, sepultado bajo el laboratorio

- **Producto:** landing (7 páginas), flujo kids (7 pantallas con contexto propio), `/app`
  (WebApp), `/charla` (invitados). La estructura conceptual es correcta.
- **Problemas estructurales:** (a) `WebApp.tsx` = 3.744 líneas en un archivo (todo el producto
  adulto); (b) ~31 paneles de laboratorio mezclados en las mismas rutas y el mismo bundle que el
  producto, varios públicos; (c) varios paneles son v3-only → muestran un motor jubilado (fuente
  recurrente del malentendido de la causa 1); (d) ESLint sin configurar (solo `tsc`): las
  violaciones de reglas de hooks llegan a runtime (regla dura del dueño incumplida); (e) el estándar
  de viewport/safe-area PWA (regla 18) no está auditado superficie por superficie.
- **Voz en el cliente:** `useLiveVoice` centralizado (bien, 2026-07-08), PWA auto-actualizable (bien).

### 2.4 El dato (Aiven, base única) — VEREDICTO: recién saneado, sin guardas permanentes

- `student_types` (4) y `levels` (7) sanos y verificados. `topics`: **94 activos** curados y
  volcados el 2026-07-08 (curación externa con Gemini, estructura v3 + contenido rico conservado,
  backup). `orchestration` (v3): muerta, se deja morir. `learner_state`: **vacío** (M3).
- El patrón de escritura segura (inspect → diff dry-run → backup → apply) **existe desde ayer** pero
  es costumbre, no mecanismo: nada impide el próximo batch destructivo.

### 2.5 La infra — VEREDICTO: recién resuelta, con un riesgo puntual serio

- Migrada Heroku → **Cloud Run us-east4**: RTT 271ms → **12ms** desde Argentina (medido). Deploy
  continuo por push a `origin/main`. La latencia dejó de ser factor.
- Restricción estructural: las salas de voz viven en memoria del proceso → `min=max=1` +
  `--no-cpu-throttling` + timeout largo son **obligatorios**.
- **Riesgo #1 de infra:** el CD con `--source` puede **pisar esos flags en cada push** → "el coach se
  muere en el próximo deploy". Debe quedar fijado declarativamente (trigger/service.yaml). Es el
  punto que Infra pidió explícitamente vigilar.

### 2.6 El actor (Gemini Live) — VEREDICTO: la variable menos gestionada

Flash sub-ejecuta directivas (muro del Flash), el VAD no capta monosílabos y puede cambiar de umbral
en updates silenciosos de Google, el ASR transcribe a medias. Mitigadores conocidos y no aplicados:
jerarquía semántica en el prompt (M2), push-to-talk como fallback propio en niveles bajos, y —si el
muro persiste tras M1+M2— evaluar un modelo más fuerte para el rol de coach (spike con gate de
decisión; hay banco `/llm` para eso).

---

## PARTE 3 — La filosofía del rework (qué se decide, antes del cómo)

1. **El motor NO se reescribe.** v2 cumple el spec; reescribir sería repetir la causa 1. El rework
   del motor = cerrar M1..M5.
2. **El dato se trata como código.** Toda escritura al catálogo pasa por el patrón
   dry-run → diff → backup → apply, y el catálogo vivo se snapshotea versionado en git. Es el
   antídoto estructural de la causa 3.
3. **Un solo camino vivo por capa.** Un motor (v2), una superficie de test que lo corre, y el
   laboratorio separado del producto (rutas `/lab/*` con guard, bundle aparte). Antídoto de las
   causas 1 y 7.
4. **Cada regla en una capa, con barrido.** La capa universal anti-robot se crea **removiendo** las
   copias dispersas en el mismo cambio (no sumando una capa más). Antídoto de la causa 4.
5. **La vara antes que el tuning.** Smoke textual barato (invariantes duras del armado) como gate de
   regresión + validación por voz (protocolo 5×4) como única vara de calidad. Nunca más tunear
   contra ruido. Antídoto de la causa 5.
6. **El actor se gestiona como variable.** Jerarquía en el prompt primero; si el muro persiste,
   spike de modelo más fuerte con gate de decisión del dueño. Antídoto de la causa 6.
7. **Anti-goals intocables** (heridas ya pagadas): NO persistir orquestaciones · NO forzar vocab ·
   NO engordar tópicos · NO curar combos masivos a mano · NO `if`/parche en el composer · NO seeds a
   ciegas · NO deploy manual.

---

## PARTE 4 — La ley de asignación de reglas (el corazón de por qué el motor degradó)

La duda del dueño ("qué debe ser estático, qué template acoplado a edad, qué a nivel, qué agnóstico
porque es pedagogía básica") es exactamente el punto donde el motor de 9 pasos empezó a degradarse.
El diagnóstico fino:

**El composer nunca cruzó los ejes. Los TEXTOS sí.** La arquitectura decía "edad y nivel se apilan,
no se cruzan" y el código lo respetó siempre. Pero adentro de los presets, la pedagogía básica
(universal) se copió en cada edad, y la forma de producción (nivel) se hardcodeó en seeds de edad.
Cada copia divergió un poco, las reglas compitieron, el modelo promedió → clase tibia. Al principio
funcionaba porque había POCAS reglas y cada una estaba en un solo lugar de facto; al crecer sin una
ley de asignación, cada mejora se escribió donde el autor estaba parado ese día. Entropía sin
mecanismo, no un error puntual.

**La ley (test de las 3 preguntas).** Antes de escribir CUALQUIER regla en el catálogo, preguntar:
*"si cambio la edad del alumno, ¿esta regla DEBE cambiar? ¿y si cambio el nivel? ¿y con la
historia?"*

| Respuesta | Dueño | Vive en | Ejemplos |
|---|---|---|---|
| No cambia con nada | **UNIVERSAL** (pedagogía básica de conversación) | capa universal (una sola, F1-01) | recast en vez de corregir en seco · variá, no repitas fórmulas · seguí el interés del alumno · la estructura es vehículo, no guion · cierre suave |
| Solo con EDAD | **EDAD** (el CÓMO social/afectivo) | `student_types` | identidad/mascota · tono y energía · juego · duración de atención · forma del turno (corto/largo) |
| Solo con NIVEL | **NIVEL** (el QUÉ lingüístico) | `levels` | % ES/EN · gramática objetivo · forma de producción (frase-puente ↔ debate) · profundidad de vocab |
| Con el alumno puntual | **HISTORIA / PERFIL** | `learner_state` / perfil | error a vigilar · intereses · dominado · nombre, edad exacta |
| Con el TÓPICO | **TÓPICO** (solo léxico) | `topics` | título + semilla (keywords[:6] + frases-ancla). **Jamás conducta.** |

**La corrección al mapa de 9 pasos:** el modelo de 3 pilares es correcto y se conserva; lo que
faltaba es que lo UNIVERSAL sea un ciudadano de primera clase (hoy es implícito, repartido dentro
de EDAD). Concretamente: `pedagogical_rules` (bloque 3, dueño=EDAD hoy) se parte en dos — la BASE
metodológica (universal, se muda a la capa transversal) y la ADAPTACIÓN por edad (lo único que
queda en `student_types`). Los seeds quedan como cáscara que delega la forma a
`Expected_Production` (ya aprendido). Eso es F1-01.

**El mecanismo para que no vuelva a pasar:** la ley no se sostiene con disciplina, se sostiene con
herramienta — el barrido de duplicados de F1-01 (misma oración en dos capas = bug) y la invariante
del smoke F1-03 (bloques únicos). El test de las 3 preguntas va como comentario en la cabecera de
`composer_proto.py`, donde el próximo agente lo lea antes de agregar nada.

---

La hoja de ruta ejecutable (órdenes de trabajo autocontenidas para Opus/Sonnet) está en
**[`02-hoja-de-ruta.md`](02-hoja-de-ruta.md)**.

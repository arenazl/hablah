# Deuda técnica abierta

Cosas detectadas y **no** resueltas, con lo que se sabe de cada una. Nada de esto está
adivinado: o está medido o está leído del código.

---

## 1. Delay de ~2 s entre pregunta y respuesta — CERRADO sin arreglo (17/08)

**Reportado el 16/08.** Al día siguiente el dueño reportó que la charla es "casi instantánea"
y que llegó a interrumpir al coach y le captó todo.

**No se atribuye a ningún cambio.** Se descartaron las dos hipótesis que teníamos:

- No fue el cursor de audio (`nextStartTimeRef`): ese bug sólo se manifiesta al encadenar
  charlas sin refrescar, y el dueño nunca hizo eso.
- No fue el tamaño del prompt: se midió y **creció** (informática CON2 pasó de 5.389 a 5.613
  chars con la capa de apertura).

Lectura del dueño: "99% era mi conexión". Se cierra sin arreglo. Si vuelve, medir con el
`lag_ms` por turno y el `audio.cadena`, que ya están.

---

## 2. El gate del micrófono está muerto — y hoy conviene que lo esté

`useLiveVoice.ts` lee `playingRef.current` para no capturar mientras el coach habla, pero
**`playingRef` nunca se pone en `true`** en todo el archivo: se declara, se pone en `false` en
`stop()` y se lee dos veces. El fix del commit `5843028` quedó inerte.

**Lo importante, verificado el 17/08:** el dueño interrumpió al coach y le captó todo. O sea
que el gate muerto le está dando justo lo que quiere — el micrófono abierto todo el turno,
barge-in completo. El diseño original del código era el opuesto (tapar el turno entero y
resignar la interrupción, ver el comentario en el archivo).

**Costo actual:** de vez en cuando se cuela la última palabra del coach en la transcripción,
porque el parlante todavía suena cuando el mic ya está tomando.

**Decisión del dueño:** taparle sólo la cola, no el turno entero. **No tocarlo mientras la voz
ande bien** — la infra está funcionando y no se arriesga.

Si se implementa: gatear por el backlog de playback (`nextStartTimeRef - currentTime`) sólo en
el tramo final más un ratito después, para conservar el barge-in. De paso el diagnóstico deja
de mentir: hoy `rms_max_coach_hablando` lee el mismo `playingRef` muerto, así que reporta todo
como "coach callado".

---

## 3. El gating de reglas usa un número que colisiona entre familias

`levels.sort_order` es compartido: `CON1`/`A0`/`FONR` son todos 0, `CON2`/`A1` son 1. Y
`_filter_rules` gatea `conversation_rules` por ese número.

Consecuencias medidas:
- `native_pronunciation` (`max_level=A2`, orden 2) **entra** en una clase de informática en
  francés — la regla de pronunciar `'elephant'` como inglés real.
- `harvest_dont_chase` (`min_level=A2`) **queda afuera** de CON1 y CON2 — justo la regla que
  dice qué hacer cuando el adulto habla mucho, que es la más útil de esa familia.
- `student_types.max_level_order` deja pasar `FONR` para todas las edades por lo mismo.

**Arreglo:** `conversation_rules` necesita una dimensión de FAMILIA, no un rango numérico.
Es aditivo (columna nullable; sin valor, gatea como hoy).

---

## 4. Huecos de catálogo identificados (no rompen, pero faltan)

Del barrido (`backend/scripts/barrido_huecos_motor.py`, salida en
`docs/08-barrido-huecos/huecos_motor.json`):

- **5 cruces de `age_level_matrix` que no existen:** `mini×B1`, `junior×C1`, y `junior/teen/adult × FONR`.
  Los tres de FONR probablemente **no deban existir** (fonética es de mini) — pero el motor no
  puede distinguir "falta cargarlo" de "no corresponde". Ver punto 5.
- **10 tópicos sin categoría** (ids 177-186): componen bien, pero sin `family` el modelo de
  familias no puede decidir cómo se comportan sus semillas.

---

## 5. "Vacío a propósito" y "falta el dato" son lo mismo para el motor

`_req` revienta si un campo falta, y está bien: evita fallbacks silenciosos. Pero como no
existe el slot vacío, **cada placeholder son 39 textos obligatorios** en los cruces, aunque
para algunos no corresponda decir nada. De ahí que "no inventes una escena" aparezca tres
veces en el mismo prompt: tres slots tenían que decir algo.

**Arreglo:** distinguir los dos casos. `falta` sigue reventando; `vacío a propósito` omite el
slot. No toca el fail-fast ni saca ningún campo.

---

## 6. Las semillas siguen siendo un contenedor mezclado

`topics.keywords` guarda cuatro cosas distintas en un solo array: progresión de la materia,
término del rubro, léxico del tópico y frases de práctica. El motor les aplica **una sola
mecánica** (rotar la bolsa, cortar en 6, cortar en 4, elegir 1), que sólo es correcta para el
léxico.

La `Language_Note` corregida ahora le pide al coach que las convierta al idioma de la clase,
lo que tapa el síntoma más visible. El rediseño del contenedor sigue pendiente y está
documentado en la conversación del 16/08.

---

## 7. La semilla de sesión está congelada por día

`_session_seed(student_id, topic_id, day_iso)` incluye el día, no la sesión. Diez pruebas en
una tarde son, por construcción, la misma clase. Y `orchestration_resolver` llama a
`_get_vocabulary(topic, topic_content)` **sin los cuatro argumentos** que sí le pasa
`composer_proto` (`app_config`, `level_code`, `age_slug`, `session_seed`), así que la rotación
de keywords por semilla está inerte y el tope por nivel nunca se lee.

Bloquea cualquier medición de variedad — no de densidad, que con semilla fija está bien.

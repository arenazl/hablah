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

## 3. El gating de reglas usaba un número que colisionaba entre familias — RESUELTO (17/08)

`levels.sort_order` era compartido: `CON1`/`A0` valían 0 y `CON2`/`A1` valían 1, así que
filtrar por nivel era un accidente aritmético. Entraba `native_pronunciation` en una clase de
informática y se caía `harvest_dont_chase` de los niveles bajos de oficios.

**Arreglado con dos cosas:** la columna `conversation_rules.families` (el acoplamiento que
faltaba) y el filtro pasando a usar el **escalón** de la escalera única en vez de `sort_order`.

Medido: plomería Inicial 8 leyes y ninguna de idiomas · inglés A1 10 · kids A0 13.

---

## 4. Huecos de catálogo — quedan dos

Del barrido (`backend/scripts/barrido_huecos_motor.py`, salida en
`docs/08-barrido-huecos/huecos_motor.json`):

- **2 cruces de `age_level_matrix` que no existen:** `mini×B1` y `junior×C1`. Los tres de FONR
  desaparecieron al anular la disciplina fonética.
- **10 tópicos sin categoría** (ids 177-186): componen bien, pero sin `family` el modelo de
  familias no puede decidir cómo se comportan sus semillas.

---

## 5. "Vacío a propósito" vs "falta el dato" — RESUELTO (17/08)

`_req` revienta si falta un campo, y está bien. El problema era que no existía el slot vacío,
así que cada placeholder eran 38 textos obligatorios aunque para algunos cruces no
correspondiera decir nada — de ahí que "no inventes una escena" apareciera tres veces.

**Arreglado:** los placeholders opcionales devuelven "" y su línea del template se cae entera.
El fail-fast quedó intacto para los que sí faltan. Lo usan `{HISTORIA:*}`, y con eso además se
sacó el literal en inglés que el resolver devolvía para las anclas narrativas.

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

## 7. La semilla de sesión estaba congelada por día — RESUELTO (17/08)

`_session_seed(student_id, topic_id, day_iso)` incluía el día, no la sesión: diez pruebas en
una tarde eran la misma clase. Y `orchestration_resolver` llamaba a `_get_vocabulary` **sin los
cuatro argumentos** que sí le pasaba `composer_proto`, así que la rotación por semilla estaba
inerte y el tope por nivel nunca se leía (de 40 keywords cargadas, 34 no llegaban nunca).

**Arreglado:** la clave incluye qué número de clase es (contado de `sessions`, dato real, no
random) y el resolver pasa los cuatro argumentos. Sigue siendo determinístico: recomponer la
clase 2 devuelve lo mismo que la primera vez.

Medido en música CON1, cuatro clases del mismo alumno: `rhythm,beat,key,note` →
`key,note,scale,rhythm` → `beat,key,note,scale` → `note,scale,rhythm,beat`.

**Lo que sigue abierto es el punto 6**, no esto: con 5 semillas y tomando 4, la variedad tiene
techo por el contenedor, no por la semilla.

# Deuda técnica abierta

Cosas detectadas y **no** resueltas, con lo que se sabe de cada una. Nada de esto está
adivinado: o está medido o está leído del código.

---

## 1. Delay de ~2 s entre pregunta y respuesta (reportado 16/08)

**Síntoma:** el coach tarda ~2 segundos en contestar. No estaba ayer.

**Qué NO es:** no es el `nextStartTimeRef` de la segunda charla (ese ya se arregló y daba
un delay igual a lo que duró la charla anterior, no 2 s fijos).

**Dónde mirar, por orden de sospecha:**
- `app_config` de VAD: `vad_silence_duration_ms_*` está en **1500 ms** para kid. Si el cruce
  que probó cae en esa config, 1,5 s de silencio + latencia de red da exactamente ~2 s. Es la
  recalibración que quedó pendiente del handoff del 16/08 (bajar a 900).
- `playbackCushionSeconds` en `loadAudioSettings()` — colchón fijo antes de agendar audio.
- El `thinking` del modelo: según `project_voice_finetuning_findings`, thinking=0 es la
  palanca de latencia (3,0 → 1,7 s). Verificar que siga en 0 para el modelo elegido.

**Cómo medirlo sin adivinar:** ya existe el log `lag_ms` por turno de transcripción y el
`audio.cadena`. Con una charla alcanza para separar "el modelo tarda" de "el VAD espera".

---

## 2. El gate del micrófono está muerto

`useLiveVoice.ts` lee `playingRef.current` para no capturar mientras el coach habla, pero
**`playingRef` nunca se pone en `true`** en todo el archivo: se declara, se pone en `false`
en `stop()` y se lee dos veces. El fix del commit `5843028` quedó inerte.

Hoy lo tapa la cancelación de eco del browser; se cuela la cola (la última palabra del coach
aparece en la transcripción).

**Por qué no se arregló:** la corrección obvia —gatear por el backlog de audio pendiente—
cierra el mic durante **todo** el turno del coach, porque Gemini manda más rápido que tiempo
real. Eso **mata el barge-in**. Requiere una decisión de producto antes que de código.

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

# Latencia de la clase por voz — diagnóstico medido (2026-10-07/08)

> **Estado:** diagnóstico. Nada implementado en producto, salvo la instrumentación que ya estaba en
> este branch (`b0d0d9d`, ver D2). Decisiones de configuración (thinking, VAD) quedan como gate del dueño.
> Branch: `diagnostics/voice-startup-latency-20261007`.
>
> **Síntoma reportado (Lucas, 07/10 ART):** "mucho delay entre mi mensaje y la respuesta", probando en
> local. **Meta del dueño:** menos de 1,5 s percibidos entre intervenciones, idealmente ~1 s — como meta,
> no como garantía de Gemini Live.
>
> **Método:** hechos medidos / hipótesis cuantificadas / conclusiones, separados. Todo número sale de un
> comando corrido o de un evento de traza con timestamp. Lo no medido se dice "no medido".

---

## A. Hechos medidos

### A1. Condiciones de la prueba (sesión 763, local) y en qué difiere de producción

| | local (sesión 763) | producción | igual |
|---|---|---|---|
| modelo Live | `gemini-2.5-flash-native-audio-preview-09-2025` — default del código; el `.env` local no define `GEMINI_LIVE_MODEL` | `gemini-3.1-flash-live-preview` | **no** |
| proveedor | `ai_studio` (default) | `ai_studio` | sí |
| `thinkingBudget` | 1024 (default del código, `gemini_live_engine.py`) | 1024 (`GEMINI_THINKING_BUDGET` no está en el env de Cloud Run) | sí |
| VAD | silence 600 ms / prefix 200 / start HIGH / end UNSPECIFIED / `START_OF_ACTIVITY_INTERRUPTS` — sale de `app_config` | misma base, mismos valores | sí |
| base de datos | Aiven desde la PC del dueño: handshake 1,1–2,5 s; 150–300 ms por consulta | Aiven desde us-east4: ~0,3 s por conexión nueva *incluyendo* la consulta (cota por TTFB de `/api/finaltest/options`) | **no** |

**Conclusión de A1:** la prueba local no es comparable con producción en dos variables (modelo y
distancia a la base). Cualquier comparación de latencias exige igualar el modelo primero (ver F).

### A2. Apertura: 12,3 s desde que el front está listo hasta el primer audio del coach

```
02:18:37.6  front listo (WebSocket abierto, AudioContext a 16 kHz)
   +7.41 s   backend armando el contexto de la clase   (_load_session_context)
02:18:45.0  gemini.setup.start
   +1.04 s   gemini.setup.sent
   +0.32 s   gemini.setup.complete
   +2.09 s   gemini.text.thinking_dropped   (el modelo razonó antes del saludo)
   +0.51 s   primer chunk del coach (texto)
   +0.91 s   gemini.audio.first_chunk
02:18:49.9  "Hey Lucas..."
```

Los 7,41 s se reprodujeron aparte cronometrando `_load_session_context(763)`: **9,76 s con pool frío,
7,44 s con pool caliente**. Coincide con lo observado en la sesión.

Desglose medido desde la PC del dueño, función por función:

| pieza | tiempo | qué es |
|---|---|---|
| `orchestration_resolver._lang_names()` | 1,45 s | abre una conexión **sync** nueva (pymysql + handshake SSL) |
| `orchestration_resolver._load_orchestration('adult','B2')` | 1,89 s | otra conexión sync nueva |
| `orchestration_resolver.load_rhythm('adult','B2')` | 1,59 s | otra conexión sync nueva |
| `motor_engine._connect()` pelado, sin consulta | 1,12 s | sólo el handshake |
| ~12 round-trips del pool async en secuencia (session, user, template, topic, recent_sessions, recent_codes, UPDATE objective, student_type, level, app_config, learner_state, UPDATE `prompt_circuit`) | ~2,4 s | 150–300 ms cada uno desde la PC |

**Hecho estructural, independiente del ambiente:** `build_super_prompt` (que por `compose_from_template`
abre `_lang_names` y `_load_orchestration`) y `load_rhythm` se llaman **dentro del `voice_proxy` async sin
`asyncio.to_thread`** — `backend/services/gemini_live.py`, llamadas a `load_rhythm(` y
`build_super_prompt(` en `_load_session_context`. Son llamadas bloqueantes: mientras duran, **el event
loop entero se detiene**. Con una sola instancia fija y `gunicorn -w 1`, cada apertura de clase congela
el audio de todos los demás alumnos durante ese tiempo. En producción ese tiempo es menor (ver B1) pero
el bloqueo existe igual.

### A3. Por turno: 2,43 s y 2,41 s (última palabra transcrita → primer chunk del coach)

Medido en los dos turnos de voz de la sesión 763 (último `gemini.input_transcription` → primer
`gemini.coach_chunk` del turno siguiente).

- `gemini.text.thinking_dropped` aparece **0,26 s antes** del primer chunk en los dos turnos: el modelo
  razonó hasta casi hablar.
- Backlog del reproductor (`voice.playback.backlog`): 236 ms y 287 ms.
- **T0 (última muestra de voz real del alumno): no existe.** Lo más cercano es la última transcripción
  parcial de Gemini, que ya trae su propio retraso.
- **T1 (Gemini cierra el turno del alumno): no existe.** Con VAD automático Gemini **no manda ninguna
  señal de fin de habla**; en `serverContent` sólo llegan `inputTranscription`, `modelTurn`,
  `outputTranscription`, `generationComplete`, `turnComplete` (verificado en `gemini.raw.sc_keys`).
- **T2 real (primer audio reproducido en el navegador): no existe.** El front no emite ese evento.
- La instrumentación que separa thinking de red+arranque — `turn.coach_first_response` con
  `time_to_thinking_ms` y `thinking_to_audio_ms` — **existe en el engine pero sólo se arma en modo
  `say` (texto)**: `timing["awaiting_coach_since"]` se setea únicamente en la rama `msg.type == "say"`
  de `gemini_live_engine.py`. En turnos de voz nunca dispara. Por eso no apareció.
- `ms_since_user_input` (emitido en `gemini.turn.complete`, valor 9688 ms en el turno 2) mide desde el
  último input hasta el **fin** del turno del coach, no hasta su primer audio. No sirve para T0→T2.

### A4. Producción, últimos 30 días

- El access log de Cloud Run (`run.googleapis.com/requests`) registra todos los requests, incluido el
  upgrade de WebSocket. Búsqueda de `/voice/ws` en 30 días: **cero entradas**.
- Trazas JSON de la app (`"event":`) en stdout/stderr en 3 días: **cero**. Los logs de la app van a
  `stderr` como `textPayload` de gunicorn.
- Es **evidencia fuerte, no prueba**, de que no hubo clases de voz en producción en 30 días. No se afirma
  como certeza.

### A5. Herramientas existentes

- `backend/scripts/tune_turntaking.py` (06/06): corre contra **Vertex us-central1 con un WebSocket
  propio**, no contra el engine de la app ni contra ai_studio; no acepta `thinkingBudget`; sus 12 frases
  son todas "normales". Mide `response_latency = t_first_coach_audio - t_voice_end`, que es la métrica
  correcta, pero en el camino equivocado. **Tal como está no sirve para el benchmark pedido.**
- `/voice/ws_llm_test` (banco `/llm`, `backend/api/voice.py`): acepta por query `engine`, `model`,
  `voice`, `start_sens`, `end_sens`, `silence_ms`, `prefix_ms`, `activity`, `thinking`. Corre por el
  **mismo engine y proveedor que producción**. Es la base correcta para el benchmark.
- `VoiceEngineContext` soporta `thinking_budget_override` y `model_override`.

### A6. Decisiones previas que se heredan (no se re-litigan; se reabren sólo con datos)

- 29/05: `thinkingBudget: 0`. 08/06 (`19944c0`): subido a **1024** + `NO_INTERRUPTION`, "anti-freeze":
  con 0 el modelo se trababa con inputs ambiguos + prompt grande (gaps de 6–10 s). Nunca se re-validó.
- 21/06 (memoria `project_voice_finetuning_findings`): en el banco `/llm`, `thinking=0` → ~1,7 s estable;
  `thinking=256` → ~3,0 s e inestable. Otro modelo, otro prompt.
- 17/08 (`docs/deuda-tecnica.md` §1): "delay de ~2 s — CERRADO sin arreglo", el dueño reportó la charla
  "casi instantánea". **Cierre administrativo, no techo técnico.** Si al hablar se siente artificial,
  sigue siendo un problema de experiencia.
- 17/08 (§2): el gate del micrófono (`playingRef`) está muerto y hoy conviene que lo esté (barge-in
  completo). No afecta la latencia.

---

## B. Hipótesis (cuantificadas, NO medidas)

| # | hipótesis | de dónde sale | cómo se confirma |
|---|---|---|---|
| B1 | **Apertura en producción ≈ 1,1 s**, no 7,4 | 3 conexiones sync × ~0,3 s (cota medida en prod por TTFB) + 12 round-trips × ~20 ms | la instrumentación de D2 ya está en este branch: abrir una clase en prod con el branch deployado y leer `voice.context.stage` |
| B2 | De los 2,4 s por turno, **~0,6 s son el VAD y ~1,8 s el modelo** (razonar + generar) | `vad_silence_duration_ms_adult=600` (config) y `thinking_dropped` a −0,26 s | T0/T1/T2 (D1) |
| B3 | `thinkingBudget=0` bajaría el turno a **~1,7 s** | dato de junio, otro modelo y otro prompt | benchmark (E) |
| B4 | El modelo 3.1 de prod puede ser más rápido **o más lento** que el 2.5 probado | ningún dato | igualar modelo (F) y medir |

---

## C. Tabla de cuellos de botella

| # | cuello | tiempo medido | evidencia | mejora propuesta | riesgo | ahorro estimado |
|---|---|---|---|---|---|---|
| 1 | **3 conexiones sync nuevas por clase, bloqueando el event loop** | 4,93 s local (1,45+1,89+1,59); ~0,9 s prod (cota) | cronómetro por función; `_connect()` en `orchestration_resolver.py` (`_lang_names`, `_load_orchestration`, `load_rhythm`); sin `to_thread` en `gemini_live.py` | (a) una sola conexión por apertura; (b) catálogos cacheados con TTL (templates, idiomas, ritmo, reglas: cambian por UPDATE, no por alumno); (c) `to_thread` o migrar al pool async | bajo: datos de catálogo; invalidación por TTL corto o por versión | **−4,5 s local / −0,8 s prod** en apertura; **desaparece el congelamiento de los demás alumnos** |
| 2 | **~12 round-trips async en secuencia** | ~2,4 s local; ~0,2 s prod (cota) | `await db.execute` ×12 en `_load_session_context`; 150–300 ms c/u desde la PC | paralelizar lecturas independientes (`asyncio.gather`); sacar el UPDATE de `prompt_circuit` del camino crítico (post-setup o background) | bajo | −1,5 s local / −0,1 s prod |
| 3 | **Razonamiento del modelo en cada turno** | thinking hasta −0,26 s del primer chunk; 2,09 s en el saludo | `thinking_dropped` ×3; `thinkingBudget=1024` | benchmark 0/256/1024 (E) y recién ahí decidir | **alto si se baja a ciegas**: 08/06 se subió a 1024 por freeze con inputs ambiguos (gaps 6–10 s) | hasta −1,2 s por turno (dato junio), **a confirmar** |
| 4 | **VAD esperando silencio** | 600 ms (config, no medido) | `vad_silence_duration_ms_adult=600`; junio: "silence es lineal con la latencia" pero "no ayuda como palanca" | no tocar hasta tener T0/T1 | medio: bajar demasiado corta al alumno en pausas | −0,2 s como mucho, si T1 lo justifica |
| 5 | **Setup de Gemini por clase** | 1,36 s | `setup.sent` 1,04 + `complete` 0,32 | nada de nuestro lado (proveedor). Mitigación: arrancar el setup **en paralelo** con la carga del contexto (hoy secuencial: contexto → setup) | bajo | −1,3 s percibido en apertura (se solapa con #1/#2) |
| 6 | **Modelo distinto local vs prod** | — | `.env` sin `GEMINI_LIVE_MODEL` | igualar en local vía env del proceso (no `.env`, no prod) antes de comparar | ninguno | elimina una variable |
| 7 | **No existe medición T0/T1/T2** | — | ausencia de eventos; `turn.coach_first_response` sólo en `say` | instrumentación D1 | ninguno | sin esto, todo lo demás es estimación |
| 8 | **Reproductor** | backlog 236–287 ms + cushion 100 ms | `voice.playback.backlog` | nada por ahora; medir T2 real primero | — | ~0 |

---

## D. Instrumentación

### D1. Por turno — tres marcas, una por capa (propuesta, sin implementar)

| marca | dónde | cómo |
|---|---|---|
| **T0** última muestra de voz del alumno | front, `useLiveVoice.ts` | timestamp del último chunk del worklet con RMS > umbral; se manda al backend como evento `client.voice.end` (canal ya existente: `audio.cadena`) |
| **T1** Gemini cierra el turno del alumno | backend, `gemini_live_engine.py` | Gemini no lo manda con VAD automático. Proxy más cercano: timestamp del **último** `inputTranscription` antes del primer `modelTurn`. Alternativa real: verificar si el modelo 3.1 soporta `inputAudioTranscription` con `finished` |
| **T2a** primer chunk de audio en el backend | backend, `gemini_live_engine.py` | **armar `timing["awaiting_coach_since"]` también al recibir `inputTranscription`**, no sólo en `say` → `turn.coach_first_response` dispara en voz y separa `time_to_thinking` de `thinking_to_audio` |
| **T2b** primer audio **reproducido** | front, `useLiveVoice.ts` | timestamp del primer `AudioBufferSource.start()` del turno; evento `client.playback.first_audio` |

Con eso: **VAD = T1−T0 · modelo = T2a−T1 (con desglose de thinking) · transmisión+playback = T2b−T2a.**

### D2. Apertura — YA EXISTE en este branch (`b0d0d9d`, 07/10), con dos huecos

El commit agrega `_checkpoint(label)` en `_load_session_context` y emite
`voice.context.stage session=… stage=… duration_ms=… total_ms=…` por `log.info`. Siete tramos, en orden:

| tramo | qué cubre | observación |
|---|---|---|
| `recent_keywords` | session + user + template + topic + recent_sessions (5 consultas async) | mezcla la carga base con el historial; separable si hace falta |
| `objective` | recent_codes + UPDATE del objetivo + commit | — |
| `student_type` | consulta de `student_types` **+ `load_rhythm` (1 conexión sync)** | **hueco 1:** el ritmo (sync, ~1,6 s desde la PC) queda escondido dentro de este tramo |
| `level_and_config` | levels + app_config | — |
| `learner_state` | learner_state liviano | — |
| `prompt_composition` | `build_super_prompt` = **`_lang_names` + `_load_orchestration` (2 conexiones sync) + composición pura** | **hueco 2:** no distingue las dos conexiones sync (~3,3 s desde la PC) de la composición en memoria |
| `prompt_persistence` | UPDATE `prompt_circuit` + `prompt_final` + commit | — |

Dos observaciones:

1. **Formato.** Sale por `logging` como texto, no por `trace.event` como JSON. En Cloud Run cae en
   `stderr` como `textPayload` (se busca con `textPayload:"voice.context.stage"`); no comparte formato ni
   `session_id` indexado con el resto de la traza. Si se quiere cruzar con `gemini.setup.*` en la misma
   línea de tiempo, conviene emitirlo también por `trace.event("session.ctx.stage", ...)`. Opcional.
2. **Todavía no hay una medición con esta instrumentación.** La sesión 763 corrió sobre `main`
   (`run.py`, sin este commit). Para obtener el desglose real hay que relanzar el backend **en este
   branch** y abrir una clase; en local va a reproducir los 7,4 s con el reparto por tramo.

Propuesta mínima para cerrar los dos huecos: un checkpoint `rhythm` justo después de `load_rhythm(`, y
dentro de `prompt_composition`, cronometrar `_lang_names` y `_load_orchestration` por separado (o mover
las tres a `to_thread` y medir el bloqueo del loop directamente con `loop.time()` antes/después).

---

## E. Benchmark de `thinkingBudget` (diseño)

**No** usar `tune_turntaking.py` (Vertex, WS propio). Usar `/voice/ws_llm_test`, que corre por el mismo
engine y proveedor que producción y acepta `thinking` y `model` por query.

- **Matriz:** `thinking ∈ {0, 256, 1024}` × modelo = el de prod (`gemini-3.1-flash-live-preview`) ×
  prompt real (6.763 chars, el que produce `compose_from_template` para el perfil; no el estático del
  banco).
- **Entradas:** 12 normales (las del harness) + 8 **ambiguas**: medias frases, muletillas ("eh… no sé"),
  cambio de tema a mitad, pausa corta dentro de la frase, una palabra suelta, silencio largo tras una
  pregunta. El freeze de junio fue con "inputs ambiguos": hay que reproducirlo a propósito.
- **Audio:** gTTS como hoy; 3 corridas por celda.
- **Métricas por turno:** T0→T2a (p50, p95), `had_thinking`, turnos vacíos (coach mudo), **bloqueos**
  (más de 6 s), transcripción correcta; calidad por juez sobre la transcript.
- **Salida:** una tabla. **La decisión es gate del dueño.**

---

## F. Igualar antes de comparar

La próxima prueba manual conviene hacerla **en producción** (modelo 3.1, base cerca, proceso caliente).
Si se prefiere local: relanzar el backend con `GEMINI_LIVE_MODEL=models/gemini-3.1-flash-live-preview`
**en el entorno del proceso** — sin tocar `.env` ni producción — y en este branch, para que D2 mida.

**Sobre la meta de 1–1,5 s:** el piso teórico del turno sin tocar el VAD es ~0,6 s (VAD) + lo que tarde
el 3.1 con `thinking=0`. Si genera en ~1,1 s como el 2.5 en junio, **1,5 s es alcanzable**; **1 s exige
además tocar el VAD**, que sólo se justifica con T0/T1 medidos.

---

## G. Orden propuesto

1. **D2 (ya está) + cerrar sus dos huecos + D1** — sin esto todo lo demás se decide a ciegas.
2. **C1 + C2** (conexión única / caché de catálogo / `to_thread` / paralelizar) — riesgo bajo, elimina el
   bloqueo del loop; se mide antes/después con D2.
3. **E** (benchmark de thinking) — con D1 en su lugar; decisión: gate del dueño.
4. **C4** (VAD) — sólo con T0/T1 medidos.

## Fuentes de esta medición

- Log del backend local, sesión 763 (`run.py`, puerto 8200, código de `main`), eventos de `core/trace.py`.
- Scripts de cronometraje (scratchpad de la sesión): `t_db_rtt.py`, `t_sync.py`, `t_ctx.py`, `t_loop.py`.
- `gcloud logging read` sobre `hablah-prod` / `hablah-api` (requests, stdout, stderr), 3–40 días.
- `git log -S thinkingBudget -- backend/services/voice_engines/gemini_live_engine.py`; `git show b0d0d9d`.
- `docs/deuda-tecnica.md` §1–§2 (17/08), memorias `project_voice_finetuning_findings`,
  `project_voice_latency_cuts_diagnosis`.

---

## H. Medición 2 — sesión 764, local, modelo de producción (08/10, ~03:40 ART)

Misma máquina, mismo front, backend relanzado **sobre este branch** con
`GEMINI_LIVE_MODEL=models/gemini-3.1-flash-live-preview` en el entorno del proceso. 64 turnos del
coach, 42 pares medibles alumno→coach. **Percepción del dueño: "increíble charla, apenas un mínimo
delay, mejoró mucho".**

### H1. Hechos

**Apertura: 11,57 s** (anoche 12,3 s) — no mejoró, y no tenía por qué: el tramo grande sigue siendo
el contexto contra la base desde la PC.

```
front listo -> setup Gemini (contexto)   8.32 s   (anoche 7.41)
setup Gemini                             0.71 s   (anoche 1.36)
setup OK -> primer audio del coach       2.54 s   (anoche 3.51)
```

**Turnos (última transcripción parcial del alumno → primer chunk del coach), n = 42:**

```
min 0,73 s · mediana 2,74 s · max 4,71 s        (anoche, 2.5, n = 2: 2,43 y 2,41)
```

**`thinking_dropped` = 0 en 64 turnos.** Con el 2.5 hubo razonamiento visible en cada turno; con el 3.1
no aparece ni una vez. O el 3.1 no razona con `thinkingBudget=1024`, o no expone el texto. Hecho: el
evento no existe en esta sesión.

**Reproductor:** `voice.playback.backlog` alterna valores normales (82–473 ms) con valores negativos
grandes (−5.068, −13.297, −36.961 ms). Un backlog negativo significa `nextStartTime < currentTime`: el
reproductor se quedó sin audio encolado (underrun) o la referencia se reseteó. No se investigó en esta
sesión; se anota.

**La instrumentación `voice.context.stage` de `b0d0d9d` no emitió nada** (0 líneas en una sesión
completa). Causa verificada: sale por `log.info` de un logger de la app y **ningún `log.info` de la app
llega a la consola** — ni ése ni ningún otro — el nivel efectivo es WARNING. No es un bug de la
instrumentación: es el canal. Dos salidas posibles: emitirla por `trace.event(...)` (JSON, mismo canal
que `gemini.*`, con `session_id` indexado) o subir el nivel del logger `services.gemini_live`.
**Pendiente de decisión del dueño; no se tocó.**

### H2. La discrepancia: la sensación mejoró mucho, la mediana no bajó

Es el hallazgo más importante de esta medición, y hay que decirlo entero: **la métrica que estamos
usando no distingue lo que el dueño sintió.** Hipótesis, en orden de probabilidad:

1. **El proxy de T0 no es comparable entre modelos.** "Última transcripción parcial del alumno" depende
   de cómo y cuándo cada modelo emite `inputTranscription`. Si el 3.1 la emite más temprano o en
   bloques distintos, el gap medido se infla sin que el alumno espere más. **Esto es exactamente por
   lo que D1 (T0 real desde el micrófono) es prioritario**: sin T0 verdadero, comparar modelos por esta
   métrica es comparar relojes distintos.
2. **Varianza y ritmo, no mediana.** 42 turnos con muchos de 0,7–1,8 s intercalados entre otros de 3–4 s
   se perciben como fluidez; 2 turnos de 2,4 s clavados anoche se percibieron como "mucho delay". La
   percepción castiga la rigidez más que el promedio.
3. **Calidad del modelo.** El 3.1 contesta distinto (más corto, más natural, interrumpe mejor con
   `START_OF_ACTIVITY_INTERRUPTS`). "Increíble charla" puede ser calidad conversacional, no latencia.
4. **Sin thinking visible**, la respuesta arranca sin la pausa de razonamiento del 2.5, aunque el total
   hasta el primer chunk no baje: el audio "arranca a hablar" distinto.

Ninguna de las cuatro está medida. Las cuatro se resuelven con D1 + T2b.

### H3. Qué cambia en el plan

- **B4 queda respondido a medias:** el modelo cambia la experiencia (hecho, por el dueño) pero no la
  métrica actual (hecho, por el log). Falta la métrica correcta.
- **E (benchmark de thinking) baja de prioridad para el modelo de prod:** con el 3.1 no hay
  `thinking_dropped`; antes de barrer `thinkingBudget` hay que confirmar si el 3.1 lo honra. Si no lo
  usa, el benchmark es sobre el 2.5, que no corre en producción.
- **D1 sube a primera prioridad absoluta**, por encima de C1/C2: hoy no tenemos forma de saber si una
  mejora mejora.
- **Nuevo ítem:** los backlogs negativos del reproductor (H1) — medir T2b y entender el underrun antes
  de tocar `playbackCushionSeconds` o el catch-up.
- **Nuevo ítem:** la instrumentación de apertura necesita cambiar de canal (`trace.event`) o de nivel
  para emitir. Gate del dueño: es su commit.

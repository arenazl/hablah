# Investigación — Motor de pruebas de voz (bench de engines/modelos)

> Estado: borrador de investigación · 2026-06-15
> Propósito: diseñar un "motorcito" que pruebe distintas combinaciones de
> **engine × modelo × API × config** contra la API real, mida objetivamente la
> calidad del audio (sobre todo el "se come palabras") y rankee cuál suena más
> humano — **sin que un humano tenga que entrar a hablarle a la app**.

---

## 1. El problema

- Lo mejor que encontramos es `gemini-3.1-flash-live-preview` (native-audio, "Flash 1").
- **Bug**: se come palabras / partes de frases del medio (el "tijerazo"). El modelo
  genera texto y audio por separado; cuando el texto saca ventaja, Google hace flush
  del buffer de audio y **omite una frase**. La transcripción llega completa, el audio no.
- **Vertex (`gemini-live-2.5-flash`) quedó descartado por ahora**: en la app no
  andaba el micrófono en ningún caso. Volvimos a Flash Preview.
- Hoy, para evaluar calidad, el dueño tiene que entrar a la app, hablarle al nene en
  vivo y reportar a mano "no anda" / "se cortó". Eso es lento, no es reproducible y no
  deja métrica.

**Lo que queremos:** un banco de pruebas donde Claude (o un cron) corra el ciclo
completo contra la API real, con audio sintético como entrada, y devuelva una tabla:
qué combinación de modelo/tecnología da el audio más completo, más fluido y más humano.

---

## 2. Insight central: separar 3 preguntas que hoy están mezcladas

El fallo de "no anda el micrófono" en Vertex mezcla tres cosas distintas. El harness
las separa:

| Pregunta | Cómo se prueba | Hoy |
|---|---|---|
| ¿La **API/modelo** responde bien (audio completo, sin tijerazo)? | Audio TTS → WS → medir output. **No necesita micrófono.** | No medido |
| ¿La **captura del cliente** (mic 48k→16k, frontend) funciona con ese engine? | Sesión real en la app | Lo único que probamos |
| ¿La clase es **pedagógicamente buena**? | Sesión real con micrófono (única vara) | Manual |

> **Consecuencia directa:** que Vertex fallara en la app **no prueba que la API de
> Vertex sea mala**. Probablemente el wiring del cliente/auth con el engine Vertex está
> roto, no el modelo. El motorcito (TTS, sin mic) puede confirmar si la API de Vertex
> entrega audio completo — y entonces el bug a cazar pasa a ser el del micrófono, no el modelo.

Regla del proyecto que esto respeta: *los tests propios solo sirven para lo mecánico
(latencia, no-freeze, formato).* **"Comerse palabras" es 100% mecánico** → es
exactamente lo que un harness puede y debe medir. La calidad pedagógica sigue siendo
sesión real.

---

## 3. Lo que YA existe (reusar, no reinventar)

`backend/scripts/tune_turntaking.py` ya hace el 60% del trabajo:

- Genera PCM 16k con `gTTS` (audio de alumno sintético, cacheado en disco). **Sin micrófono.**
- Abre el WS de Gemini Live, manda una charla de 12 turnos + silencios para disparar el VAD.
- Mide por turno: `response_latency` (fin de voz → primer audio del coach),
  `turnComplete`, si transcribió el input, turnos mudos, y **cierre de WS con código**.
- Barre combos de `silenceDurationMs × endOfSpeechSensitivity` y rankea por menor latencia
  entre los que no cortaron.
- Tiene una matriz `--pause` que detecta si el VAD corta al chico en su pausa.

`backend/services/voice_engines/` ya tiene la abstracción de engines:
`gemini_live_engine.py`, `gemini_text_eleven_engine.py`, `cascade_engine.py`,
`elevenlabs_pipeline_engine.py`. El switch en prod es la env `VOICE_ENGINE`.

**Lo que le falta a `tune_turntaking.py` para ser el motorcito que se pide:**

1. Está clavado a **un** modelo (`gemini-live-2.5-flash-native-audio` en Vertex). No
   itera engines/modelos/APIs.
2. **No mide el tijerazo.** Cuenta chunks de audio del coach, pero no compara el audio
   contra lo que el modelo *quería* decir. El bug #1 no tiene métrica.
3. No guarda el audio de salida para que un humano escuche el mejor candidato.

---

## 4. La métrica que falta: "% de palabras comidas"

Es la pieza que vuelve esto útil. Cómo medir el tijerazo de forma objetiva y automática:

```
1. El modelo emite, en paralelo:
     - outputTranscription  → el texto que el coach QUISO decir (palabra A B C D E)
     - audio del coach       → lo que REALMENTE sonó
2. Re-transcribir el audio de salida con un STT independiente (Whisper/Groq).
     - audio re-STT          → palabra A B _ _ E   (faltan C, D → tijerazo)
3. Diff alineado (output_transcription) vs (audio re-STT):
     palabras_comidas = palabras en transcript que NO aparecen en el re-STT
     pct_comido = palabras_comidas / palabras_totales
```

- `pct_comido` por turno y promedio por sesión = el indicador duro del problema.
- Bonus: detectar **huecos** (gaps de audio > N ms en medio de un turno) midiendo el
  espaciado entre chunks de audio del modelo — un salto grande = candidato a frase comida.
- El re-STT no necesita ser perfecto: nos importa la *diferencia relativa entre engines*,
  no la transcripción absoluta. Si el engine A come 18% y el B come 3%, gana B.

> Ojo con el STT que ya sabemos que alucina (Whisper/Groq inventó palabras en el cascade).
> Para esta métrica el riesgo es menor: alucinar agrega palabras (falsos negativos de
> "comido"), no las quita. Igual conviene cruzar con la métrica de huecos de audio, que
> no depende del STT.

---

## 5. Arquitectura del motorcito

```
matriz de candidatos           guion de charla            por cada candidato
(engine × modelo × API × cfg)  (N turnos TTS, fijo)        ─────────────────
        │                            │                     1. abrir sesión (auth del engine)
        └──────────┬─────────────────┘                     2. por cada turno: enviar PCM + silencio
                   ▼                                        3. capturar: audio_out, out_transcript,
            run_candidate(candidate, script)                   in_transcript, timings, ws_close
                   │                                        4. re-STT del audio_out
                   ▼                                        5. métricas del turno
            CandidateResult                                 6. guardar WAV del coach (para oír)
                   │
                   ▼
         tabla comparativa + ranking + bundle de audios
```

### Métricas por candidato

| Métrica | Qué mide | Fuente |
|---|---|---|
| `pct_comido` | tijerazo (palabras del transcript ausentes en el audio) | re-STT vs outputTranscription |
| `gaps_audio` | huecos de silencio en medio de un turno | espaciado entre chunks de audio |
| `latency_avg` | fin de voz → primer audio del coach | timing (ya está en tune_turntaking) |
| `mudos` | turnos con turnComplete y 0 audio | ya está |
| `cortes_ws` | cierres de WS (código 1007/1011/etc.) | ya está |
| `transcribió_input` | el engine entendió al alumno | ya está |
| `wav_path` | audio del coach para escucha humana | nuevo |

### Candidatos a barrer (matriz inicial)

| # | Engine | Modelo | API | Modalidad | Nota |
|---|---|---|---|---|---|
| 1 | `gemini_live` | gemini-3.1-flash-live-preview | ai_studio | native-audio | el actual, baseline (come palabras) |
| 2 | `gemini_live` | gemini-live-2.5-flash-native-audio | Vertex | native-audio | ¿también come? (probar API sin mic) |
| 3 | `gemini_text_eleven` | gemini-live-2.5-flash (half-cascade) | Vertex | TEXT → ElevenLabs | la apuesta: TEXT no se corta |
| 4 | `gemini_text_eleven` | half-cascade | Vertex | TEXT → Google Cloud TTS | alternativa de TTS |
| 5 | `cascade` / otros | — | — | — | según lo que valga la pena |

> El guion de charla es **fijo** para todos (mismas 12 frases TTS), así la comparación
> es justa: misma entrada, distinto motor.

---

## 6. "Suena humano" — qué es automatizable y qué no

| Dimensión | ¿Automatizable? | Cómo |
|---|---|---|
| Audio completo (sin comerse frases) | **Sí** | `pct_comido`, `gaps_audio` |
| Fluidez de turnos (no corta al chico, responde rápido) | **Sí** | latencia, matriz de pausa |
| Estabilidad (no freeze, no corte de WS) | **Sí** | cortes_ws, mudos |
| Prosodia / naturalidad de la voz | **Parcial** | guardar WAV → el dueño escucha **un bundle** comparativo, una sola vez, en vez de re-hacer la sesión por cada engine |
| Calidad pedagógica de la clase | **No** | sesión real con micrófono (única vara) |

La ganancia: hoy el dueño prueba **a ciegas, un engine por vez, hablando en vivo**. Con
el motorcito recibe una **tabla rankeada + un puñado de WAVs** y solo escucha el o los 2
finalistas. El ciclo de "probar una tecnología nueva" pasa de "agendar una sesión con el
nene" a "correr un script y leer la tabla".

---

## 7. Plan por fases (propuesta, no ejecutado)

- **F1 — Métrica de tijerazo sobre lo que ya hay.** Agregar a `tune_turntaking.py` (o un
  `bench_engines.py` nuevo) el re-STT del audio de salida + diff vs outputTranscription +
  guardado de WAV. Correr contra el baseline (Flash Preview ai_studio) para tener el número
  de "cuánto come hoy". *Sin esto, todo lo demás es opinión.*
- **F2 — Switch de candidatos.** Parametrizar engine/modelo/API/auth en una lista de
  candidatos y un loop que corra el mismo guion por cada uno. Reusar los adapters de
  `voice_engines/` en vez de duplicar la lógica de WS.
- **F3 — Probar la API de Vertex sin mic.** Correr el candidato Vertex half-cascade (TEXT)
  por el harness. Si entrega audio completo (pct_comido bajo) → confirma que el modelo sirve
  y el bug real es el micrófono del cliente, no la API. Eso reabre Vertex por otra puerta.
- **F4 — Reporte.** Tabla rankeada + bundle de WAVs en una carpeta. Opcional: guardar el run
  en DB/Cloudinary para histórico (se enlaza con la deuda de observabilidad persistida).

---

## 8. Decisiones abiertas (para el dueño)

1. **STT del re-transcribe**: Groq Whisper (ya integrado, rápido) vs otro. Para una métrica
   *relativa* alcanza con Groq.
2. **¿Dónde corre el harness?** Local (Claude lo dispara) vs cron en Heroku. Local primero.
3. **Auth de Vertex**: el `tune_turntaking.py` usa `gcloud auth print-access-token` (token de
   usuario). Para el engine de prod hay que generar el token desde el Service Account
   (env vars), no del metadata server (que en Heroku no existe). Para el harness local, el
   `gcloud` token alcanza.
4. **Guion de charla**: ¿el de 12 turnos genérico de `tune_turntaking.py`, o uno de kids A0
   con mezcla ES+EN para reproducir el caso real?

---

## 9. Nota sobre `TODO_VOZ_VERTEX.md` (queda desactualizado)

Ese doc dice que Vertex half-cascade es "la única salida real". Tras el intento fallido
(micrófono no andaba) eso quedó a medias: **no probamos que la API de Vertex sea mala, solo
que el cliente con Vertex no capturaba**. Propuesta: actualizar ese doc para reflejar el
estado real (Vertex pausado por bug de cliente, no por la API) y enlazarlo a esta
investigación. **No lo toco hasta tu OK.**
```

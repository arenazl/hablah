# Sincronización VOZ ↔ TEXTO ↔ IMÁGENES (modo kids)

Documento de consolidación para rediseñar el circuito visual reactivo de las clases de niños.
Junta los **tres mundos** que hoy corren en paralelo y **no están sincronizados en el tiempo**:

1. **VOZ** — el audio del coach (y el del alumno).
2. **TEXTO** — la transcripción que emite Gemini Live.
3. **IMÁGENES** — el dibujo del vocabulario que aparece en pantalla.

El problema a resolver: **la imagen no cae junto a lo que el nene ESCUCHA**, y se dispara con cualquier
palabra del vocab, no solo con la que la coach está enseñando.

---

## 0. Resumen del flujo end-to-end

```
   NENE habla (mic)                                      COACH responde (audio)
        │                                                        ▲
        ▼                                                        │
  [useLiveVoice]  ── PCM 16kHz ──►  WS  ──►  [gemini_live.py] ──►  Gemini Live API
   captura mic                                (voice_proxy)         (half-cascade)
                                                   │                    │
                                                   │   ◄── audio 24kHz + transcripción ──┘
                                                   ▼
                                          transcript_chunk (texto)  +  audio_chunk (PCM)
                                                   │                        │
                                                   ▼                        ▼
                                          [useLiveVoice]           [useLiveVoice playback]
                                          live.transcript          cola de AudioBuffers
                                                   │                (buffering / cushion)
                                                   ▼                        │
                                          [KidsSession listener]            ▼
                                          matchea vocab → showVisual   AUDIO SUENA (con delay)
                                                   │
                                                   ▼
                                          [KidsVisualCueOverlay]
                                          aparece el dibujo
```

**El nudo:** el `transcript_chunk` (texto) llega **antes** de que el `audio_chunk` correspondiente termine
de reproducirse (el audio va con buffering). Como la imagen se dispara por el **texto**, se **adelanta** al
audio. Un delay fijo intenta compensar, pero el desfase **cambia** durante el turno (depende de cuánto audio
haya en cola).

---

## 1. MUNDO VOZ (audio)

### 1a. Captura del mic (input del alumno)
- `frontend/src/hooks/useLiveVoice.ts` — captura con `AudioWorkletNode` a `captureSampleRate` (16 kHz), manda
  chunks PCM al WebSocket. El mic queda **siempre activo** durante la sesión (no se suspende entre turnos).
- `frontend/src/lib/audioSettings.ts` — knobs: `captureSampleRate: 16000`, `workletBufferSamples: 2048`,
  `vadEnabled: false` (default), `echoCancellation/noiseSuppression/autoGainControl: true`.

### 1b. Config del VAD / turn-taking (backend → Gemini Live)
- `backend/services/voice_engines/gemini_live_engine.py`, `realtimeInputConfig.automaticActivityDetection`:
  - `startOfSpeechSensitivity`: **LOW** para kids (HIGH para adultos) — evita que ruido/respiración corte al coach.
  - `endOfSpeechSensitivity`: HIGH.
  - `prefixPaddingMs`: **700** kids / 200 adultos (calibrable en vivo por query param `prefix_ms`, ver §4).
    Es cuánto audio **previo** al enganche se incluye — para no comerse la primera palabra del alumno.
  - `silenceDurationMs`: piso 1500 kids / 600 adultos, cap 2000.
  - `activityHandling`: **NO_INTERRUPTION** — el alumno no puede cortar al coach (anti-freeze).
- Voz del coach: `speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` (default "Kore").
- Modelo: `gemini-3.1-flash-live-preview` (half-cascade — hace ASR interno antes del LLM; necesita más
  certeza fonética para disparar el start-of-speech, por eso el prefix generoso).

### 1c. Playback del coach (output)
- `frontend/src/hooks/useLiveVoice.ts` — el audio del coach llega en chunks (PCM 24 kHz). Se encolan como
  `AudioBufferSource` y se agendan en `nextStartTimeRef + playbackCushionSeconds`.
- `audioSettings.ts`: `playbackSampleRate: 24000`, `playbackCushionSeconds: 0.10`, `catchUpEnabled: false`.
- **Dato clave para la sync:** existe un **backlog** medible = `nextStartTimeRef.current - playCtx.currentTime`
  (cuánto audio falta por reproducir en ese instante). Hoy NO se usa para las imágenes; sería la señal correcta
  para saber "cuánto atrás va el audio respecto del texto".

---

## 2. MUNDO TEXTO (transcripción)

- Gemini Live emite dos streams de transcripción (ambos activados en `gemini_live_engine.py`):
  - `inputAudioTranscription` → lo que dice el **alumno**.
  - `outputAudioTranscription` → lo que dice el **coach**.
- Llegan en **chunks** mientras el modelo genera. `backend/services/gemini_live.py` (`voice_proxy`) los reenvía
  al front como `transcript_chunk`.
- `frontend/src/hooks/useLiveVoice.ts` los acumula en `live.transcript` — array de `{ who: 'ai' | 'user', text }`.
- **Desfase clave:** el `outputTranscription` del coach se genera/entrega **antes** de que su audio termine de
  sonar (el audio se reproduce con buffering, el texto no). Por eso el texto va **adelantado** respecto de lo
  que el nene escucha.
- El subtítulo `frontend/src/components/LiveSubtitle.tsx` ya sabe detectar la palabra que se está enseñando:
  el patrón **"se dice X"** (regex en `paintEnglish`) + las señales de turno (`TURN_CUES`). Esa lógica se puede
  reusar para el disparo de la imagen (ver §5).

---

## 3. MUNDO IMÁGENES (inserción reactiva)

Todo vive en el **frontend** (no hay Python en esta parte):
`frontend/src/pages/kids/KidsSession.tsx` + `frontend/src/components/kids/KidsVisualCue.tsx`.

### 3a. Precarga (al entrar a la clase) — `KidsSession.tsx`
1. Baja la biblioteca visual completa (`motorAPI.kidsVisualVocabAll()`, ~1000 palabras) + el vocab del tópico.
2. Arma `vocabMapRef`: `Map<palabra_normalizada, VisualCueItem>`. Se normaliza **inglés y español**, sin acentos
   (`normalizeVisualWord`).
3. Precarga assets (Lottie `.json` / `.svg`): primero los del tópico, el resto 2.5 s después.
4. Elige 12 imágenes para **flotar por los bordes** (`floatItems`) — decoración de ambiente, SIN relación con lo
   que se dice.

### 3b. El disparador (corazón del algoritmo) — `KidsSession.tsx`, `useEffect` sobre `live.transcript`
```
cada vez que cambia live.transcript:
  last = último turno
  si last.who != 'ai': return              // solo el coach dispara imágenes
  tokens = normalizar(last.text).split(palabras)
  para cada token:
     canon = token, o singularizeEnglish(token), o quitar plural
     si vocabMap tiene canon Y no se mostró ya en esta línea (matchedInLineRef):
         showVisual(vocabMap.get(canon))
```
- `matchedInLineRef` cuenta ocurrencias ya disparadas para no re-mostrar la misma palabra mientras el texto crece.
- **PROBLEMA 1:** dispara con **CUALQUIER** palabra del vocab que aparezca en el texto — no solo la que la coach
  está enseñando. Si dice *"el elefante vive en la jungla"* y "jungla" está en la colección, muestra jungla.

### 3c. Cómo se muestra — `KidsSession.tsx`, `showVisual`
```
showVisual(item):
  cancela la imagen actual + cualquier show pendiente   // "la última palabra manda"
  setTimeout(VISUAL_SYNC_DELAY_MS):                      // delay fijo, hoy 900ms (slider dev)
      setCue(item)                                       // aparece la imagen
      setTimeout(CUE_SHOW_MS = 2800): fade out
```
- **PROBLEMA 2:** el `VISUAL_SYNC_DELAY_MS` es **fijo**. Compensa un desfase que en realidad **varía**
  (depende del backlog de audio del momento). Nunca cae perfecto en todos los casos.

### 3d. Render — `KidsVisualCue.tsx`
- `normalizeVisualWord(s)`: minúsculas + sin acentos/ñ.
- `singularizeEnglish(w)`: cats→cat, foxes→fox, butterflies→butterfly (lematizador simple).
- `preloadVisualCueAssets(items)`: fetch+cache de Lottie, warm de SVG.
- `CueVisual`: renderiza Lottie (`.json`) / `<img>` (`.svg`) / emoji fallback.
- `KidsVisualCueOverlay`: overlay `fixed` centrado con animación de entrada/salida.

---

## 4. Panel de calibración (dev, temporal)

En `KidsSession.tsx` hay un panel `fixed` abajo-izquierda con 2 sliders (sacar cuando esté calibrado):
- **Sync img** (100–900): escribe `localStorage.kids_sync_delay_ms`; lo lee `showVisual` vía `syncDelayRef`.
- **Prefix 1ª** (100–1000): escribe `localStorage.kids_prefix_ms`; lo lee `buildVoiceWsUrl` (`api.ts`) y lo manda
  como query param `prefix_ms`; `gemini_live.py` lo pasa a `prefix_padding_override` del `VoiceEngineContext`.
- "Aplicar" reinicia la charla. (Calibración observada hasta ahora: prefix bueno ≈ **200-250**, no 700.)

---

## 5. Diagnóstico y direcciones de rediseño

**Los tres mundos corren desacoplados en el tiempo:**
- El AUDIO va **atrasado** (buffering del playback).
- El TEXTO va **adelantado** (llega antes que el audio suene).
- La IMAGEN se dispara por el TEXTO → hereda el adelanto, y encima con cualquier palabra del vocab.

**Direcciones posibles (a evaluar):**

1. **Disparar solo la palabra que se ENSEÑA, no cualquier match.** Usar el patrón `"se dice X"` (ya detectado en
   `LiveSubtitle.tsx`) para mostrar SOLO la palabra objetivo del turno. Ataca el PROBLEMA 1. Cero cambios al motor.

2. **Atar la imagen al AUDIO real en vez de un delay fijo.** Usar el **backlog** del playback
   (`nextStartTimeRef - currentTime`, ya calculado en `useLiveVoice`) como delay dinámico: la imagen espera lo que
   falta de audio → cae cuando el audio llega a esa palabra. Ataca el PROBLEMA 2. Requiere exponer el backlog desde
   `useLiveVoice` (hook crítico — tocar con cuidado).

3. **Señal explícita del coach (`[show:word]`).** El coach emitiría un marcador en su texto y el front lo mostraría.
   Sincronización perfecta, pero **toca el prompt** — y la doctrina del proyecto dice que forzar vocab visual DEGRADA
   la clase (`project_reactive_visual_circuit`). Descartada salvo mejor idea.

**Combinación recomendada a discutir:** #1 (solo la palabra enseñada) + #2 (delay por backlog real). #1 arregla el
"muestra cualquier cosa"; #2 arregla el "cae desincronizado".

---

## 6. Índice de archivos

| Mundo | Archivo | Qué hace |
|---|---|---|
| Voz (captura+playback) | `frontend/src/hooks/useLiveVoice.ts` | mic, WS, cola de audio, `live.transcript`, backlog |
| Voz (settings) | `frontend/src/lib/audioSettings.ts` | sample rates, cushion, catch-up |
| Voz (VAD/config) | `backend/services/voice_engines/gemini_live_engine.py` | `realtimeInputConfig`, transcripción, voz, modelo |
| Texto (WS backend) | `backend/services/gemini_live.py` | `voice_proxy`, reenvío de `transcript_chunk`, override `prefix_ms` |
| Texto (subtítulo) | `frontend/src/components/LiveSubtitle.tsx` | detecta `"se dice X"` — reusar para el disparo |
| Imágenes (disparador) | `frontend/src/pages/kids/KidsSession.tsx` | listener, `showVisual`, precarga, panel dev |
| Imágenes (match+render) | `frontend/src/components/kids/KidsVisualCue.tsx` | normalizar, singularizar, overlay Lottie/SVG |
| URL del WS | `frontend/src/services/api.ts` | `buildVoiceWsUrl` (agrega `prefix_ms`) |

---

## 7. CÓDIGO REAL (para pegar a Gemini)

### 7.1 — Frontend: disparador de imágenes + `showVisual` + precarga
`frontend/src/pages/kids/KidsSession.tsx` (el circuito visual reactivo tal cual está hoy):

```tsx
const vocabMapRef = useRef<Map<string, VisualCueItem>>(new Map())
const [cue, setCue] = useState<{ item: VisualCueItem; leaving: boolean } | null>(null)
const cueTimeoutsRef = useRef<number[]>([])
const pendingShowRef = useRef<number | null>(null)
const CUE_SHOW_MS = 2800
const CUE_EXIT_MS = 300
// DEV (temporal): sync calibrable. syncDelayRef lo lee showVisual; persiste en localStorage.
const syncDelayRef = useRef<number>(Number(localStorage.getItem('kids_sync_delay_ms')) || 900)

// Cada palabra nueva REEMPLAZA a la anterior; aparece VISUAL_SYNC_DELAY_MS después.
const showVisual = useCallback((item: VisualCueItem) => {
  cueTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
  cueTimeoutsRef.current = []
  if (pendingShowRef.current) window.clearTimeout(pendingShowRef.current)
  pendingShowRef.current = window.setTimeout(() => {
    pendingShowRef.current = null
    setCue({ item, leaving: false })
    const hideAt = window.setTimeout(() => {
      setCue((c) => (c ? { ...c, leaving: true } : c))
      const clearAt = window.setTimeout(() => setCue(null), CUE_EXIT_MS)
      cueTimeoutsRef.current.push(clearAt)
    }, CUE_SHOW_MS)
    cueTimeoutsRef.current.push(hideAt)
  }, syncDelayRef.current)
}, [])

// Precarga de TODA la biblioteca visual (~1000 palabras) + vocab del tópico.
const [floatItems, setFloatItems] = useState<VisualCueItem[]>([])
useEffect(() => {
  vocabMapRef.current = new Map()
  let cancelled = false
  Promise.all([
    motorAPI.kidsVisualVocabAll().catch(() => null),
    motorAPI.kidsTopicVocab().catch(() => []),
  ]).then(([libraryOrNull, byTopic]) => {
    const library = libraryOrNull ?? byTopic.flatMap((t) => t.vocab)
    if (cancelled || library.length === 0) return
    const map = new Map<string, VisualCueItem>()
    for (const v of library) {
      const en = normalizeVisualWord(v.word_en)
      const es = normalizeVisualWord(v.word_es || '')
      if (en && !map.has(en)) map.set(en, v)   // matchea INGLÉS y CASTELLANO
      if (es && !map.has(es)) map.set(es, v)
    }
    vocabMapRef.current = map
    const pref = topic?.id ? (byTopic.find((t) => t.topic_id === topic.id)?.vocab ?? []) : []
    preloadVisualCueAssets(pref)
    window.setTimeout(() => { if (!cancelled) preloadVisualCueAssets(library) }, 2500)
    // 12 imágenes decorativas que FLOTAN por los bordes (sin relación con lo que se dice):
    const seen = new Set<string>(); const pick: VisualCueItem[] = []
    for (const v of [...pref, ...library]) {
      if (pick.length >= 12) break
      if (!v.asset_file || !v.asset_file.endsWith('.svg')) continue
      if (seen.has(v.word_en)) continue
      seen.add(v.word_en); pick.push(v)
    }
    setFloatItems(pick)
  }).catch(() => {})
  return () => { cancelled = true }
}, [isFree, topic?.id])

// >>> EL DISPARADOR (acá está el "muestra cualquier palabra del vocab") <<<
const prevTranscriptLenRef = useRef(0)
const matchedInLineRef = useRef<Map<string, number>>(new Map())
useEffect(() => {
  const arr = live.transcript
  if (arr.length !== prevTranscriptLenRef.current) {
    prevTranscriptLenRef.current = arr.length
    matchedInLineRef.current = new Map()   // línea nueva -> reiniciar conteo
  }
  const last = arr[arr.length - 1]
  if (!last || last.who !== 'ai') return    // solo el coach dispara
  const vocabMap = vocabMapRef.current
  if (vocabMap.size === 0) return
  const tokens = normalizeVisualWord(last.text).match(/[a-z']+/g) || []
  const seenThisPass = new Map<string, number>()
  for (const tok of tokens) {               // <-- recorre TODAS las palabras del texto
    let canon = tok
    if (!vocabMap.has(canon)) canon = singularizeEnglish(tok)
    if (!vocabMap.has(canon) && tok.length > 4 && tok.endsWith('es')) canon = tok.slice(0, -2)
    if (!vocabMap.has(canon) && tok.length > 3 && tok.endsWith('s')) canon = tok.slice(0, -1)
    if (!vocabMap.has(canon)) continue
    const n = (seenThisPass.get(canon) ?? 0) + 1
    seenThisPass.set(canon, n)
    if (n > (matchedInLineRef.current.get(canon) ?? 0)) {
      matchedInLineRef.current.set(canon, n)
      showVisual(vocabMap.get(canon)!)       // <-- dispara con CUALQUIER match
    }
  }
}, [live.transcript, showVisual])
```

### 7.2 — Frontend: matching de palabras + render del dibujo
`frontend/src/components/kids/KidsVisualCue.tsx` (completo):

```tsx
import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

export interface VisualCueItem { word_en: string; word_es: string; emoji: string; asset_file: string | null }

const lottieCache = new Map<string, object>()

export function preloadVisualCueAssets(items: VisualCueItem[]): void {
  for (const it of items) {
    const file = it.asset_file
    if (!file) continue
    if (file.endsWith('.json')) {
      if (lottieCache.has(file)) continue
      fetch(file).then((r) => (r.ok ? r.json() : null)).then((json) => { if (json) lottieCache.set(file, json) }).catch(() => {})
    } else if (file.endsWith('.svg')) { const img = new Image(); img.src = file }
  }
}

// Normaliza: minúsculas y SIN acentos/ñ (avión->avion). El coach habla castellano.
export function normalizeVisualWord(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Singulariza simple: cats->cat, foxes->fox, butterflies->butterfly.
export function singularizeEnglish(word: string): string {
  const w = word.toLowerCase()
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 3 && /(?:s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

function CueVisual({ item }: { item: VisualCueItem }) {
  const file = item.asset_file
  const [lottieData, setLottieData] = useState<object | null>(file && file.endsWith('.json') ? lottieCache.get(file) ?? null : null)
  useEffect(() => {
    if (!file || !file.endsWith('.json')) return
    const cached = lottieCache.get(file); if (cached) { setLottieData(cached); return }
    let cancelled = false
    fetch(file).then((r) => (r.ok ? r.json() : null)).then((json) => { if (cancelled || !json) return; lottieCache.set(file, json); setLottieData(json) }).catch(() => {})
    return () => { cancelled = true }
  }, [file])
  if (file && file.endsWith('.json')) {
    if (!lottieData) return <span style={{ fontSize: 64 }}>{item.emoji || '✨'}</span>
    return <Lottie animationData={lottieData} loop autoplay style={{ width: 100, height: 100 }} />
  }
  if (file && file.endsWith('.svg')) return <img src={file} alt={item.word_en} width={92} height={92} loading="eager" />
  return <span style={{ fontSize: 64 }}>{item.emoji || '✨'}</span>
}

export function KidsVisualCueOverlay({ item, leaving }: { item: VisualCueItem | null; leaving: boolean }) {
  if (!item) return null
  return (
    <div className={`kids-cue ${leaving ? 'leaving' : ''}`}>
      <CueVisual item={item} />
      <span className="kids-cue-word">{item.word_en}</span>
      <span className="kids-cue-word-es">{item.word_es}</span>
    </div>
  )
}
```

### 7.3 — Frontend: cómo se RECIBE la transcripción (trasfondo)
`frontend/src/hooks/useLiveVoice.ts` — el estado `transcript` y el handler del WS que arma `live.transcript`.
Los `transcript_chunk` llegan en pedacitos y se van concatenando en el último turno del mismo hablante:

```ts
const [transcript, setTranscript] = useState<TranscriptLine[]>([])
// ...dentro del onmessage del WebSocket:
} else if (msg.type === 'transcript_chunk') {
  setTranscript((prev) => {
    const last = prev[prev.length - 1]
    if (last && last.who === msg.who) {   // mismo hablante -> concatenar al último
      const updated = [...prev]
      const sep = (last.text.endsWith(' ') || msg.text.startsWith(' ')) ? '' : ' '
      updated[updated.length - 1] = { who: last.who, text: last.text + sep + msg.text }
      return updated
    }
    return [...prev, { who: msg.who, text: msg.text }]   // hablante nuevo -> turno nuevo
  })
} else if (msg.type === 'turn_complete') {
  // el coach cerró turno; acá se mide el backlog de la cola de audio:
  const pctx = playCtxRef.current
  if (pctx) {
    const backlogMs = Math.round((nextStartTimeRef.current - pctx.currentTime) * 1000)
    trace('voice.playback.backlog', activeSessionIdRef.current, { backlog_ms: backlogMs })
  }
}
```

### 7.4 — Backend: cómo se GENERA la transcripción desde Gemini Live (trasfondo)
`backend/services/voice_engines/gemini_live_engine.py` — recibe `outputTranscription` (coach) e
`inputTranscription` (alumno) de Gemini Live en chunks y los reenvía al front como `transcript_chunk`:

```python
# out_tr = sc.get("outputTranscription")  (texto del COACH)
if out_tr and out_tr.get("text"):
    if ghost_state["current_turn_is_ghost"]:
        pass  # ghost: no propagar
    elif coach_turn_closed_awaiting_tail[0]:
        _merge_tail_into_last_ai(out_tr["text"])   # cola rezagada post-turnComplete
    else:
        cleaned = _clean_coach_text(out_tr["text"])
        ai_buf.append(cleaned)
        await ws.send_json({"type": "transcript_chunk", "who": "ai", "text": cleaned})

input_tr = sc.get("inputTranscription")           # texto del ALUMNO
if input_tr and input_tr.get("text"):
    user_buf.append(input_tr["text"])
    ghost_state["user_input_since_last_coach"] = True
    coach_turn_closed_awaiting_tail[0] = False
    # detecta OVERLAP: si el input del user llega DESPUÉS de que el coach empezó a hablar
    coach_started = timing.get("current_turn_ai_started_at")
    if coach_started is not None and now_ts > coach_started:
        overlap_ms = int((now_ts - coach_started) * 1000)
    await ws.send_json({"type": "transcript_chunk", "who": "user", "text": input_tr["text"]})
```

**Nota para Gemini:** el `transcript_chunk` del coach (`who: "ai"`) es lo que dispara las imágenes (§7.1). Ese
texto se emite a medida que Gemini **genera**, no a medida que el nene **escucha** el audio — de ahí el
adelanto. El `backlogMs` (§7.3) es la medida de cuánto va atrás el audio y sería la señal para sincronizar.

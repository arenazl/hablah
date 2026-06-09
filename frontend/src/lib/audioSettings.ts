/**
 * Settings configurables del pipeline de audio Live, persistidos en localStorage.
 *
 * Estos settings los lee useLiveVoice + el AudioWorklet al iniciar la sesion.
 * Para que un cambio tenga efecto hay que reiniciar la sesion (stop + start).
 *
 * Los presets son combinaciones predefinidas para testear rapido.
 */

export interface AudioSettings {
  /** Sample rate del mic capture (8000 / 16000 / 24000 / 48000) */
  captureSampleRate: number
  /** Buffer del worklet (samples por chunk al backend). Bajo = mas reactivo, mas overhead. */
  workletBufferSamples: number
  /** Habilitar AudioWorkletNode. Si OFF cae a ScriptProcessorNode (deprecado pero compat). */
  useAudioWorklet: boolean
  /** Habilitar VAD client-side (no enviar chunks silenciosos al backend). */
  vadEnabled: boolean
  /** Umbral de RMS por debajo del cual se considera silencio. */
  vadThreshold: number
  /** Cuantos chunks "tail" mandar despues de un silencio para no truncar palabras. */
  vadTailFrames: number
  /** Sample rate del AudioContext de playback (el browser resamplea automatico). */
  playbackSampleRate: number
  /** Cushion en segundos al schedular cada chunk (mas alto = mas latencia pero menos riesgo de underrun). */
  playbackCushionSeconds: number
  /** Habilitar catch-up del playback (cancela buffers si delay >threshold). */
  catchUpEnabled: boolean
  /** Threshold del catch-up en segundos. */
  catchUpThresholdSeconds: number
  /** Habilitar echo cancellation en getUserMedia. */
  echoCancellation: boolean
  /** Habilitar noise suppression en getUserMedia. */
  noiseSuppression: boolean
  /** Habilitar auto gain control en getUserMedia. */
  autoGainControl: boolean
  /** Volumen del audio del coach (1.0 = original, 0.5 = mas bajo, 2.0 = mas fuerte). */
  coachVolume: number
  /** FPS del orbe visualizer (10 / 15 / 20 / 30 / 60). */
  orbUpdateFps: number
  /** Skipear setStatus speaking redundante (recomendado). */
  skipRedundantStatus: boolean
  /** Intervalo en ms del keepalive ping del WS. */
  wsPingIntervalMs: number
  /** Volumen del audio de OTROS humanos en voice room. */
  participantVolume: number
}

// DEFAULT optimizado para latencia rapida en sesion 1:1.
// VAD OFF para no retener chunks - antes (sin VAD) andaba mas rapido.
export const DEFAULT_SETTINGS: AudioSettings = {
  captureSampleRate: 16000,
  workletBufferSamples: 2048,
  useAudioWorklet: true,
  vadEnabled: false,
  vadThreshold: 0.008,
  vadTailFrames: 3,
  playbackSampleRate: 24000,
  playbackCushionSeconds: 0.02,
  // Catch-up OFF: probamos ON (threshold 6s) pero CORTABA el audio del coach a
  // la mitad (S514: drift_reset a 6s trunco "Hola Timi... ojo se dice EYE").
  // El audio largo no se ataca cortandolo, se ataca en el prompt (turnos cortos
  // TPR sin repeticiones). Volvemos a OFF como estaba originalmente.
  catchUpEnabled: false,
  catchUpThresholdSeconds: 3.0,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  coachVolume: 1.0,
  orbUpdateFps: 20,
  skipRedundantStatus: true,
  wsPingIntervalMs: 25000,
  participantVolume: 1.0,
}

export interface AudioPreset {
  id: string
  name: string
  description: string
  settings: Partial<AudioSettings>
}

export const PRESETS: AudioPreset[] = [
  {
    id: 'voice-room',
    name: 'Voice room (charlas grupales)',
    description: 'Optimizado para conversaciones de 2-3 personas. Buffer mediano, VAD para no saturar el mixer. ES EL DEFAULT.',
    settings: {
      useAudioWorklet: true,
      workletBufferSamples: 2048,
      vadEnabled: true,
      vadThreshold: 0.008,
      vadTailFrames: 3,
      playbackCushionSeconds: 0.03,
      participantVolume: 1.2,
    },
  },
  {
    id: 'min-latency',
    name: 'Mínima latencia (1 a 1, fibra)',
    description: 'Buffer chico, cushion mínimo. Para sesión single con conexión estable y rápida.',
    settings: {
      useAudioWorklet: true,
      workletBufferSamples: 1024,
      vadEnabled: true,
      vadThreshold: 0.003,
      vadTailFrames: 1,
      playbackCushionSeconds: 0.01,
    },
  },
  {
    id: 'noisy-env',
    name: 'Entorno ruidoso (cafe, calle, auto)',
    description: 'Filtros agresivos (NS/AGC/AEC) + VAD con umbral alto y cola larga. Recomendado cuando hay ruido de fondo o conexion 4G.',
    settings: {
      useAudioWorklet: true,
      workletBufferSamples: 2048,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      vadEnabled: true,
      vadThreshold: 0.015,
      vadTailFrames: 5,
      playbackCushionSeconds: 0.06,
      catchUpEnabled: true,
      catchUpThresholdSeconds: 2.0,
    },
  },
  {
    id: 'studio-hifi',
    name: 'Estudio / auriculares hi-fi',
    description: 'Sin AEC/NS/AGC para conservar timbre natural de la voz. Buffer chico, sample rate alto. Solo si usas auriculares cerrados y entorno silencioso.',
    settings: {
      useAudioWorklet: true,
      workletBufferSamples: 1024,
      captureSampleRate: 48000,
      playbackSampleRate: 48000,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      vadEnabled: false,
      playbackCushionSeconds: 0.015,
    },
  },
]

// v4: forzar reset. v3 habia activado el catch-up y eso CORTABA el audio del
// coach a la mitad (S514). v4 vuelve catch-up OFF para todos (no depender del
// localStorage viejo con catch-up ON).
const STORAGE_KEY = 'hablah_audio_settings_v4'

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AudioSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore (quota exceeded, private mode, etc.)
  }
}

export function applyPreset(preset: AudioPreset): AudioSettings {
  const merged: AudioSettings = { ...DEFAULT_SETTINGS, ...preset.settings }
  saveAudioSettings(merged)
  return merged
}

export function resetAudioSettings(): AudioSettings {
  saveAudioSettings(DEFAULT_SETTINGS)
  return { ...DEFAULT_SETTINGS }
}

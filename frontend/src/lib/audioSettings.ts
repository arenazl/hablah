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

export const DEFAULT_SETTINGS: AudioSettings = {
  captureSampleRate: 16000,
  workletBufferSamples: 2048,
  useAudioWorklet: true,
  vadEnabled: true,
  vadThreshold: 0.005,
  vadTailFrames: 2,
  playbackSampleRate: 24000,
  playbackCushionSeconds: 0.02,
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
    id: 'default',
    name: 'Default actual',
    description: 'La config que está en producción ahora (con AudioWorklet, VAD y buffer 2048).',
    settings: { ...DEFAULT_SETTINGS },
  },
  {
    id: 'ayer',
    name: 'Setting de ayer (sin worklet, sin VAD)',
    description: 'La config previa al worklet y VAD - andaba estable en sesión single. Buena base de comparación.',
    settings: {
      useAudioWorklet: false,
      workletBufferSamples: 4096,
      vadEnabled: false,
      playbackCushionSeconds: 0.02,
      catchUpEnabled: false,
      orbUpdateFps: 60,
      skipRedundantStatus: false,
    },
  },
  {
    id: 'voice-room',
    name: 'Voice room (charlas grupales)',
    description: 'Optimizado para conversaciones de 2-3 personas. Buffer mediano, VAD para no saturar el mixer.',
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
    id: 'estabilidad',
    name: 'Máxima estabilidad (conexión inestable)',
    description: 'Buffers grandes, cushion alto, VAD permisivo. Si la conexión se traba, este preset aguanta mejor.',
    settings: {
      useAudioWorklet: true,
      workletBufferSamples: 4096,
      vadEnabled: true,
      vadThreshold: 0.005,
      vadTailFrames: 4,
      playbackCushionSeconds: 0.08,
    },
  },
  {
    id: 'mobile',
    name: 'Mobile (4G / WiFi pública)',
    description: 'Captura 16kHz, buffer grande, VAD estricto para ahorrar bandwidth en redes móviles.',
    settings: {
      captureSampleRate: 16000,
      useAudioWorklet: true,
      workletBufferSamples: 4096,
      vadEnabled: true,
      vadThreshold: 0.01,
      vadTailFrames: 2,
      playbackCushionSeconds: 0.05,
      orbUpdateFps: 15,
    },
  },
]

const STORAGE_KEY = 'hablah_audio_settings_v1'

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

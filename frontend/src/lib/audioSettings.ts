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
    description: 'La config que esta corriendo en produccion ahora.',
    settings: { ...DEFAULT_SETTINGS },
  },
  {
    id: 'min-latency',
    name: 'Mínima latencia',
    description: 'Buffer chico, cushion bajo, VAD agresivo. Para conexiones rápidas.',
    settings: {
      workletBufferSamples: 1024,
      playbackCushionSeconds: 0.005,
      vadThreshold: 0.003,
      vadTailFrames: 1,
    },
  },
  {
    id: 'max-quality',
    name: 'Máxima calidad',
    description: 'Buffer grande, sample rate alto, sin VAD para no perder nada.',
    settings: {
      captureSampleRate: 24000,
      workletBufferSamples: 4096,
      vadEnabled: false,
      playbackCushionSeconds: 0.05,
    },
  },
  {
    id: 'mobile-slow',
    name: 'Mobile / conexión lenta',
    description: 'Optimizado para 4G / WiFi lento. Buffer grande, menos sends.',
    settings: {
      captureSampleRate: 16000,
      workletBufferSamples: 4096,
      vadEnabled: true,
      vadThreshold: 0.008,
      playbackCushionSeconds: 0.05,
      orbUpdateFps: 15,
    },
  },
  {
    id: 'desktop-fast',
    name: 'Desktop / fibra',
    description: 'Buffer chico, cushion mínimo. Para conexiones estables.',
    settings: {
      workletBufferSamples: 1024,
      playbackCushionSeconds: 0.005,
      vadTailFrames: 1,
      orbUpdateFps: 30,
    },
  },
  {
    id: 'loud-env',
    name: 'Entorno ruidoso',
    description: 'VAD más alto + supresión de ruido fuerte. Para café, calle.',
    settings: {
      vadThreshold: 0.02,
      vadTailFrames: 3,
      noiseSuppression: true,
      echoCancellation: true,
    },
  },
  {
    id: 'silent-env',
    name: 'Entorno silencioso',
    description: 'VAD muy bajo para captar voz suave. Casa, oficina tranquila.',
    settings: {
      vadThreshold: 0.001,
      vadTailFrames: 3,
      noiseSuppression: false,
    },
  },
  {
    id: 'no-vad',
    name: 'Sin VAD (siempre enviar)',
    description: 'Manda todo el audio al backend, incluso silencios. Más bandwidth.',
    settings: { vadEnabled: false },
  },
  {
    id: 'no-worklet',
    name: 'Sin AudioWorklet (ScriptProcessor)',
    description: 'Usa ScriptProcessorNode (deprecado) para browsers viejos.',
    settings: { useAudioWorklet: false },
  },
  {
    id: 'no-aec',
    name: 'Sin echo cancellation',
    description: 'Apaga AEC del browser. Útil con auriculares.',
    settings: { echoCancellation: false, autoGainControl: false },
  },
  {
    id: 'big-buffer',
    name: 'Buffer grande (estable)',
    description: 'Buffer 8192 samples (512ms). Menos sends, más latencia.',
    settings: { workletBufferSamples: 8192, playbackCushionSeconds: 0.1 },
  },
  {
    id: 'small-buffer',
    name: 'Buffer chico (responsive)',
    description: 'Buffer 512 samples (32ms). Muy reactivo, mucho overhead.',
    settings: { workletBufferSamples: 512, playbackCushionSeconds: 0.005 },
  },
  {
    id: 'aggressive-catchup',
    name: 'Catch-up agresivo (1.5s)',
    description: 'Si delay >1.5s, corta buffers. Puede causar clicks pero baja latencia.',
    settings: { catchUpEnabled: true, catchUpThresholdSeconds: 1.5 },
  },
  {
    id: 'soft-catchup',
    name: 'Catch-up suave (3s)',
    description: 'Catch-up solo en delays grandes (>3s). Equilibrio.',
    settings: { catchUpEnabled: true, catchUpThresholdSeconds: 3.0 },
  },
  {
    id: 'low-coach-volume',
    name: 'Coach más bajo',
    description: 'Baja el volumen del coach a 0.7x. Útil si suena fuerte.',
    settings: { coachVolume: 0.7 },
  },
  {
    id: 'high-coach-volume',
    name: 'Coach más fuerte',
    description: 'Sube el volumen del coach a 1.5x. Útil si suena bajo.',
    settings: { coachVolume: 1.5 },
  },
  {
    id: 'orb-60fps',
    name: 'Orbe 60fps',
    description: 'Visualizer del orbe a 60fps. Más smooth, más CPU.',
    settings: { orbUpdateFps: 60 },
  },
  {
    id: 'orb-10fps',
    name: 'Orbe 10fps',
    description: 'Orbe a 10fps. Mínimo work del visualizer.',
    settings: { orbUpdateFps: 10 },
  },
  {
    id: 'capture-8k',
    name: 'Captura 8kHz (telefónico)',
    description: 'Sample rate bajo. Mitad de bandwidth, menos inteligible.',
    settings: { captureSampleRate: 8000, workletBufferSamples: 1024 },
  },
  {
    id: 'capture-48k',
    name: 'Captura 48kHz (nativo)',
    description: 'Sample rate nativo del browser. Máxima calidad, doble bandwidth.',
    settings: { captureSampleRate: 48000, workletBufferSamples: 4096 },
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

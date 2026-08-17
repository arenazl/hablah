/**
 * Adaptado de @livekit/agents-ui — versión sin LiveKit ni Framer Motion.
 *
 * Conecta el shader Aura al hook `useLiveVoice` de Habláh:
 *   - status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' | 'ended'
 *   - audioLevel: RMS 0..1 (cómo de fuerte habla el alumno o el tutor)
 *
 * Interpolación manual con rAF. Cero deps externas.
 *
 * POR QUÉ ESTÁ ESCRITO ASÍ (el delay de la charla salía de acá)
 * ------------------------------------------------------------
 * La versión anterior tenía dos cosas que se multiplicaban entre sí:
 *
 *   1. `setVals(next)` en CADA frame -> 60 renders por segundo del visualizador, incluso
 *      cuando la animación ya había convergido y los números no se movían.
 *   2. el efecto del loop dependía de `[status, audioLevel]`, y `audioLevel` late 20 veces
 *      por segundo: el rAF se CANCELABA y se RECREABA 20 veces por segundo.
 *
 * Con la clase en vivo eso dejaba el hilo principal sin aire, y el audio se procesaba tarde
 * — se sentía como un delay de la charla que no era de la red ni del modelo.
 *
 * Ahora: el loop se crea UNA vez, `status` y `audioLevel` entran por ref (no pueden
 * recrearlo), y sólo se publica a React cuando algún valor se movió lo suficiente para que
 * se vea. En estado estable son CERO renders; mientras el nivel cambia, los justos.
 */
import { useEffect, useRef, useState } from 'react'

export type VisualizerStatus =
  | 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' | 'ended'

interface Targets {
  speed: number
  scale: number
  amplitude: number
  frequency: number
  brightness: number
}

const STATE_TARGETS: Record<VisualizerStatus, Targets> = {
  idle:       { speed: 10, scale: 0.20, amplitude: 1.2,  frequency: 0.4,  brightness: 1.0 },
  ended:      { speed: 8,  scale: 0.18, amplitude: 0.8,  frequency: 0.3,  brightness: 0.6 },
  error:      { speed: 4,  scale: 0.20, amplitude: 0.3,  frequency: 0.2,  brightness: 0.5 },
  connecting: { speed: 30, scale: 0.30, amplitude: 0.5,  frequency: 1.0,  brightness: 1.8 },
  listening:  { speed: 20, scale: 0.30, amplitude: 1.0,  frequency: 0.7,  brightness: 1.6 },
  speaking:   { speed: 70, scale: 0.30, amplitude: 0.75, frequency: 1.25, brightness: 1.5 },
}

/** Cuánto tiene que moverse cada valor para que valga la pena un render. Por debajo de esto
 *  el cambio no se ve en el shader, así que publicarlo es trabajo tirado. */
const UMBRAL: Targets = {
  speed: 0.20, scale: 0.0015, amplitude: 0.006, frequency: 0.006, brightness: 0.006,
}

// Interpolación lineal con factor por frame (smoothing exponencial).
function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * t
}

export function useAgentAudioVisualizerAura(
  status: VisualizerStatus,
  audioLevel: number = 0,
): Targets {
  const [vals, setVals] = useState<Targets>(STATE_TARGETS.idle)

  const currentRef = useRef<Targets>(STATE_TARGETS.idle)
  // Lo último que se le pasó a React. Se compara contra esto para no renderizar de gusto.
  const publishedRef = useRef<Targets>(STATE_TARGETS.idle)
  const rafRef = useRef<number | null>(null)
  const tStartRef = useRef<number>(performance.now())

  // status y nivel entran por REF, no por dependencia: así el loop no se recrea nunca.
  // Se asignan en el cuerpo del render a propósito — son el valor más fresco disponible y
  // el loop los lee recién en el próximo frame.
  const statusRef = useRef<VisualizerStatus>(status)
  const levelRef = useRef<number>(audioLevel)
  statusRef.current = status
  levelRef.current = audioLevel

  useEffect(() => {
    let mounted = true

    const tick = () => {
      if (!mounted) return
      const st = statusRef.current
      const base = STATE_TARGETS[st] || STATE_TARGETS.idle

      // El target se calcula ACÁ, con el nivel del momento. Antes esto vivía en un efecto
      // que corría con cada latido del audio; ahora es una lectura más del frame.
      let tgt: Targets = base
      if (st === 'speaking' || st === 'listening') {
        // Boost SUTIL para no romper la forma del shader (valores originales que funcionaban)
        const boost = Math.min(1, levelRef.current * 5)
        tgt = {
          ...base,
          scale: base.scale + boost * 0.12,
          brightness: base.brightness + boost * 0.8,
          amplitude: base.amplitude + boost * 0.4,
        }
      }

      const cur = currentRef.current
      // Smoothing factor: lento para idle, rápido para speaking
      const t = st === 'speaking' || st === 'listening' ? 0.18 : 0.08
      const next: Targets = {
        speed:      lerp(cur.speed,      tgt.speed,      t),
        scale:      lerp(cur.scale,      tgt.scale,      t),
        amplitude:  lerp(cur.amplitude,  tgt.amplitude,  t),
        frequency:  lerp(cur.frequency,  tgt.frequency,  t),
        brightness: lerp(cur.brightness, tgt.brightness, t),
      }

      // Pulso de brightness solo durante connecting (cargando). Quieto = quieto.
      if (st === 'connecting') {
        const elapsed = (performance.now() - tStartRef.current) / 1000
        next.brightness = 0.5 + 1.0 * (0.5 + 0.5 * Math.sin(elapsed * 5))
      }

      currentRef.current = next

      // Publicar SOLO si algo se movió lo suficiente para verse. Cuando la interpolación
      // converge, esto deja de disparar y el visualizador no vuelve a renderizar.
      const pub = publishedRef.current
      const cambio =
        Math.abs(next.speed - pub.speed) > UMBRAL.speed ||
        Math.abs(next.scale - pub.scale) > UMBRAL.scale ||
        Math.abs(next.amplitude - pub.amplitude) > UMBRAL.amplitude ||
        Math.abs(next.frequency - pub.frequency) > UMBRAL.frequency ||
        Math.abs(next.brightness - pub.brightness) > UMBRAL.brightness
      if (cambio) {
        publishedRef.current = next
        setVals(next)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      mounted = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // Vacío A PROPÓSITO: el loop vive una sola vez y lee status/nivel de los refs. Agregar
    // `audioLevel` acá es el bug que recreaba el rAF 20 veces por segundo.
  }, [])

  return vals
}

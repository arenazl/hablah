/**
 * Adaptado de @livekit/agents-ui — versión sin LiveKit ni Framer Motion.
 *
 * Conecta el shader Aura al hook `useLiveVoice` de Habláh:
 *   - status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'error' | 'ended'
 *   - audioLevel: RMS 0..1 (cómo de fuerte habla el alumno o el tutor)
 *
 * Interpolación manual con rAF (~60fps). Cero deps externas.
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

// Interpolación lineal con factor por frame (smoothing exponencial).
function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * t
}

export function useAgentAudioVisualizerAura(
  status: VisualizerStatus,
  audioLevel: number = 0,
): Targets {
  const [vals, setVals] = useState<Targets>(STATE_TARGETS.idle)

  const targetsRef = useRef<Targets>(STATE_TARGETS.idle)
  const currentRef = useRef<Targets>(STATE_TARGETS.idle)
  const rafRef = useRef<number | null>(null)
  const tStartRef = useRef<number>(performance.now())

  // Cuando cambia el status, actualizar targets
  useEffect(() => {
    targetsRef.current = STATE_TARGETS[status] || STATE_TARGETS.idle
  }, [status])

  // Cuando hay nivel de audio (alumno hablando), pulsamos scale + brightness
  useEffect(() => {
    const base = STATE_TARGETS[status] || STATE_TARGETS.idle
    if (status === 'speaking' || status === 'listening') {
      // Mezcla audio level (0..1) → boost de scale y brightness
      const boost = Math.min(1, audioLevel * 5)
      targetsRef.current = {
        ...base,
        scale: base.scale + boost * 0.12,
        brightness: base.brightness + boost * 0.8,
        amplitude: base.amplitude + boost * 0.4,
      }
    } else {
      targetsRef.current = base
    }
  }, [audioLevel, status])

  // Loop de interpolación
  useEffect(() => {
    let mounted = true
    const tick = () => {
      if (!mounted) return
      const cur = currentRef.current
      const tgt = targetsRef.current
      // Smoothing factor: lento para idle, rápido para speaking
      const t = status === 'speaking' || status === 'listening' ? 0.18 : 0.08
      const next: Targets = {
        speed:      lerp(cur.speed,      tgt.speed,      t),
        scale:      lerp(cur.scale,      tgt.scale,      t),
        amplitude:  lerp(cur.amplitude,  tgt.amplitude,  t),
        frequency:  lerp(cur.frequency,  tgt.frequency,  t),
        brightness: lerp(cur.brightness, tgt.brightness, t),
      }
      currentRef.current = next

      // Pulso de brightness para connecting/listening (efecto "respira")
      const now = performance.now()
      const elapsed = (now - tStartRef.current) / 1000
      if (status === 'connecting') {
        const pulse = 0.5 + 1.0 * (0.5 + 0.5 * Math.sin(elapsed * 5))
        next.brightness = pulse
      } else if (status === 'listening' && audioLevel < 0.02) {
        const pulse = 1.5 + 0.4 * (0.5 + 0.5 * Math.sin(elapsed * 3))
        next.brightness = pulse
      }

      setVals(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      mounted = false
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [status, audioLevel])

  return vals
}

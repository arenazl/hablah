/**
 * KidsBuddy — el "amiguito" animado (reemplaza al orbe en la sesión kids).
 *
 * Aro/waveform BICOLOR reactivo alrededor del león:
 *   - speaker 'coach' (Habi habla) -> aro ÁMBAR.
 *   - speaker 'kid'  (turno del nene) -> aro VERDE.
 *   - speaker 'none' (idle) -> aro neutro tenue.
 * El aro y el león pulsan con el volumen (audioLevel) en tiempo real: el león
 * "se mueve cuando alguien habla". Nada de controles sueltos afuera — la escena
 * es el león + su aro.
 */
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { useEffect, useRef } from 'react'
import { useLottieJson, type BuddyDef } from './kidsBuddies'

type Speaker = 'coach' | 'kid' | 'none'

interface KidsBuddyProps {
  buddy: BuddyDef
  status: 'idle' | 'speaking'
  audioLevel: number
  /** Quién tiene el turno de voz — define el color del aro. */
  speaker?: Speaker
  /** Lado del cuadrado en px. */
  size?: number
}

const RING: Record<Speaker, string> = {
  coach: '#FFC93D', // ámbar — Habi habla
  kid: '#22D67A',   // verde — turno del nene
  none: '#4A5A55',  // neutro tenue — en espera
}

export function KidsBuddy({ buddy, status, audioLevel, speaker = 'none', size = 260 }: KidsBuddyProps) {
  const ref = useRef<LottieRefCurrentProps>(null)
  const { data, error } = useLottieJson(buddy.file)

  const level = Math.min(Math.max(audioLevel, 0), 1)
  const talking = speaker !== 'none'
  const color = RING[speaker]

  useEffect(() => {
    const inst = ref.current
    if (!inst) return
    inst.setSpeed(talking ? 1 + level * 1.4 : 0.55)
  }, [talking, level, data])

  // El león pulsa con el volumen (siempre que alguien habla, no solo Habi).
  const lionScale = talking ? 1 + level * 0.09 : 1

  const buddyNode = (error || !data) ? (
    <div style={{ width: '84%', height: '84%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.14), transparent 70%)' }} />
  ) : (
    <div style={{ width: '84%', height: '84%', display: 'grid', placeItems: 'center', transform: `scale(${lionScale})`, transition: 'transform 90ms ease-out', willChange: 'transform' }}>
      <Lottie lottieRef={ref} animationData={data} loop autoplay style={{ width: '100%', height: '100%' }} />
    </div>
  )

  return (
    <div aria-label={buddy.label} style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
      {/* Halo de color (glow suave del hablante) */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: '4%', borderRadius: '50%',
          background: `radial-gradient(circle, ${color}55, transparent 66%)`,
          opacity: talking ? 0.55 + level * 0.4 : 0.16,
          transition: 'opacity 140ms ease-out, background 220ms',
          pointerEvents: 'none',
        }}
      />
      {/* Aro/waveform que respira con el volumen */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: '-4%', borderRadius: '50%',
          border: `3px solid ${color}`,
          opacity: talking ? 0.35 + level * 0.5 : 0.14,
          transform: `scale(${1 + level * 0.13})`,
          boxShadow: talking ? `0 0 ${18 + level * 42}px ${color}` : 'none',
          transition: 'transform 80ms ease-out, opacity 120ms, border-color 220ms, box-shadow 120ms',
          pointerEvents: 'none',
        }}
      />
      {buddyNode}
    </div>
  )
}

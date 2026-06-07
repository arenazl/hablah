/**
 * KidsBuddy — el "amiguito" animado que reemplaza al orbe en la sesión kids.
 * Drop-in: recibe la misma señal { status, audioLevel } que el orbe.
 *
 * Reactividad al audio:
 *   - status 'speaking' (Habi o el chico hablan) -> la animación acelera y el
 *     personaje "palpita" con el volumen.
 *   - status 'idle' -> va lento y tranquilo (como respirando).
 */
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { useEffect, useRef } from 'react'
import { useLottieJson, type BuddyDef } from './kidsBuddies'

interface KidsBuddyProps {
  buddy: BuddyDef
  status: 'idle' | 'speaking'
  audioLevel: number
  /** Lado del cuadrado en px. */
  size?: number
}

export function KidsBuddy({ buddy, status, audioLevel, size = 260 }: KidsBuddyProps) {
  const ref = useRef<LottieRefCurrentProps>(null)
  const { data, error } = useLottieJson(buddy.file)

  const level = Math.min(Math.max(audioLevel, 0), 1)

  useEffect(() => {
    const inst = ref.current
    if (!inst) return
    const speed = status === 'speaking' ? 1 + level * 1.4 : 0.55
    inst.setSpeed(speed)
  }, [status, level, data])

  // Pulso sutil del contenedor con el volumen (sólo al hablar).
  const scale = status === 'speaking' ? 1 + level * 0.08 : 1

  if (error || (!data && false)) {
    // Fallback si el JSON no cargó (no rompe la sesión): halo suave, sin emoji.
    return (
      <div
        aria-label={buddy.label}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,.14), transparent 70%)',
        }}
      />
    )
  }

  return (
    <div
      aria-label={buddy.label}
      style={{
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        transform: `scale(${scale})`,
        transition: 'transform 90ms ease-out',
        willChange: 'transform',
        filter: status === 'speaking' ? 'drop-shadow(0 0 24px rgba(255,255,255,.18))' : 'none',
      }}
    >
      {data && (
        <Lottie
          lottieRef={ref}
          animationData={data}
          loop
          autoplay
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  )
}

/* ABMAvatarClassic — círculo con iniciales para el Template Classic CB.
   Tonos: navy (default, gradient navy con texto dorado), gold (gradient gold con
   texto navy), soft (navy-100 con texto navy). Dot opcional abajo derecha
   para status (success/warning/danger/gold). */
import { CSSProperties } from 'react'

export type AvatarTone = 'navy' | 'gold' | 'soft'
export type AvatarDot = 'success' | 'warning' | 'danger' | 'gold' | null

interface Props {
  initials: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  tone?: AvatarTone
  dot?: AvatarDot
  className?: string
  style?: CSSProperties
  title?: string
}

const SIZE_MAP = {
  xs: { dim: 22, fs: 9,  dotSize: 6 },
  sm: { dim: 28, fs: 10, dotSize: 7 },
  md: { dim: 40, fs: 13, dotSize: 9 },
  lg: { dim: 56, fs: 16, dotSize: 12 },
  xl: { dim: 72, fs: 20, dotSize: 14 },
}

const TONE_BG: Record<AvatarTone, string> = {
  navy: 'linear-gradient(135deg, var(--navy-700), var(--navy-900))',
  gold: 'linear-gradient(135deg, var(--gold-500), var(--gold-700))',
  soft: 'var(--navy-100)',
}

const TONE_COLOR: Record<AvatarTone, string> = {
  navy: 'var(--gold-300)',
  gold: 'var(--navy-900)',
  soft: 'var(--navy-700)',
}

const DOT_COLOR: Record<NonNullable<AvatarDot>, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger:  'var(--color-danger)',
  gold:    'var(--gold-500)',
}

export function ABMAvatarClassic({
  initials, size = 'md', tone = 'navy', dot = null, className = '', style, title,
}: Props) {
  const { dim, fs, dotSize } = SIZE_MAP[size]
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-semibold tracking-wider flex-shrink-0 ${className}`}
      style={{
        width: dim,
        height: dim,
        background: TONE_BG[tone],
        color: TONE_COLOR[tone],
        fontSize: fs,
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
      title={title}
    >
      {initials.toUpperCase().slice(0, 2)}
      {dot && (
        <span
          className="absolute rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            background: DOT_COLOR[dot],
            right: -1,
            bottom: -1,
            boxShadow: '0 0 0 2px var(--surface)',
          }}
        />
      )}
    </div>
  )
}

/* ABMBadgeClassic — pill con icono lucide opcional + label + tone.
   Pensado para temperatura (Caliente/Tibio/Frío), estados (Caliente/Activo),
   etapas (Visita/Reserva), etc. */
import { ComponentType } from 'react'

export type BadgeTone =
  | 'hot' | 'warm' | 'cold'
  | 'success' | 'info' | 'warning' | 'danger'
  | 'gold' | 'navy' | 'neutral'

const TONE: Record<BadgeTone, { bg: string; color: string }> = {
  hot:     { bg: 'rgba(239,68,68,0.10)',  color: 'var(--color-danger)'  },
  warm:    { bg: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)' },
  cold:    { bg: 'rgba(59,130,246,0.10)', color: 'var(--color-blue)'    },
  success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
  info:    { bg: 'rgba(47,90,149,0.10)',  color: 'var(--navy-600)'      },
  warning: { bg: 'rgba(184,114,28,0.12)', color: 'var(--color-warning)' },
  danger:  { bg: 'rgba(181,58,58,0.10)',  color: 'var(--color-danger)'  },
  gold:    { bg: 'var(--gold-100)',       color: 'var(--gold-700)'      },
  navy:    { bg: 'var(--navy-100)',       color: 'var(--navy-700)'      },
  neutral: { bg: 'var(--bg-hover)',       color: 'var(--ink-3)'         },
}

interface Props {
  label: string
  icon?: ComponentType<{ className?: string }>
  tone?: BadgeTone
  /** estilo del badge: pill redondeado / rectangular suave */
  variant?: 'pill' | 'soft'
  className?: string
}

export function ABMBadgeClassic({ label, icon: Icon, tone = 'neutral', variant = 'soft', className = '' }: Props) {
  const t = TONE[tone]
  const radius = variant === 'pill' ? '999px' : '4px'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 h-6 text-xs font-semibold whitespace-nowrap ${className}`}
      style={{
        backgroundColor: t.bg,
        color: t.color,
        borderRadius: radius,
      }}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  )
}

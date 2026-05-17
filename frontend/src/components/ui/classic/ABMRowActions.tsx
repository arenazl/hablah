/* ABMRowActions — grupo de acciones rápidas inline para una fila de tabla.
   Patrón Clientes Claude Design: 💬 chat + 📞 phone + ⋮ kebab. Cada acción es
   opcional. */
import { ComponentType } from 'react'
import { ABMKebabMenu, KebabItem } from './ABMKebabMenu'

export interface QuickAction {
  icon: ComponentType<{ className?: string }>
  onClick?: () => void
  title?: string
  tone?: 'default' | 'success' | 'danger' | 'navy'
}

interface Props {
  quick?: QuickAction[]
  kebabItems?: KebabItem[]
  className?: string
}

const TONE_COLOR: Record<NonNullable<QuickAction['tone']>, string> = {
  default: 'var(--ink-4)',
  success: 'var(--color-success)',
  danger:  'var(--color-danger)',
  navy:    'var(--navy-700)',
}

export function ABMRowActions({ quick, kebabItems, className = '' }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {quick?.map((a, i) => {
        const Icon = a.icon
        return (
          <button
            key={i}
            type="button"
            onClick={a.onClick}
            title={a.title}
            className="p-1.5 rounded transition-all duration-150 active:scale-95"
            style={{ color: TONE_COLOR[a.tone ?? 'default'] }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--navy-700)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = TONE_COLOR[a.tone ?? 'default']
            }}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
      {kebabItems && kebabItems.length > 0 && <ABMKebabMenu items={kebabItems} size="md" />}
    </div>
  )
}

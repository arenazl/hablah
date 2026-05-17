/* ABMKebabMenu — menú de 3 puntos verticales para acciones contextuales en
   filas/cards. Items configurables con icono + label + onClick + tone. */
import { ComponentType, useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'

export interface KebabItem {
  label: string
  icon?: ComponentType<{ className?: string }>
  onClick?: () => void
  tone?: 'default' | 'danger'
  divider?: boolean
}

interface Props {
  items: KebabItem[]
  size?: 'sm' | 'md'
  className?: string
}

export function ABMKebabMenu({ items, size = 'md', className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const btnSize = size === 'sm' ? 'p-1' : 'p-1.5'
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div ref={wrapRef} className={`relative inline-block ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${btnSize} rounded transition-all duration-150 active:scale-95`}
        style={{
          color: open ? 'var(--navy-700)' : 'var(--ink-4)',
          backgroundColor: open ? 'var(--bg-hover)' : 'transparent',
        }}
        title="Más acciones"
      >
        <MoreVertical className={iconSize} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 z-30 rounded-lg overflow-hidden min-w-[180px]"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 24px rgba(14, 43, 79, 0.12)',
          }}
        >
          {items.map((it, i) => {
            const Icon = it.icon
            const isDanger = it.tone === 'danger'
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setOpen(false)
                  it.onClick?.()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
                style={{
                  color: isDanger ? 'var(--color-danger)' : 'var(--text-primary)',
                  borderTop: it.divider ? '1px solid var(--divider)' : 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = isDanger
                    ? 'rgba(239,68,68,0.08)'
                    : 'var(--surface-3)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                }}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {it.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

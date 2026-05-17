import { ReactNode } from 'react'
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react'

type Variant = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: Variant
  loading?: boolean
}

const variantConfig: Record<Variant, { icon: typeof AlertTriangle; color: string }> = {
  danger:  { icon: AlertTriangle,  color: 'var(--color-danger)' },
  warning: { icon: AlertTriangle,  color: 'var(--color-warning)' },
  info:    { icon: Info,           color: 'var(--color-primary)' },
  success: { icon: CheckCircle2,   color: 'var(--color-success)' },
}

export function ConfirmModal(props: ConfirmModalProps) {
  const {
    isOpen, onClose, onConfirm,
    title, message,
    confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
    variant = 'danger', loading = false,
  } = props
  if (!isOpen) return null
  const { icon: Icon, color } = variantConfig[variant]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-[var(--bg-card)] shadow-2xl overflow-hidden">
        <div className="h-1" style={{ backgroundColor: color }} />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 rounded-lg" style={{ backgroundColor: `${color}1A` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[var(--text-primary)]">{title}</h3>
              {message && <div className="mt-1 text-sm text-[var(--text-secondary)]">{message}</div>}
            </div>
            <button onClick={onClose} className="p-1 -mr-1 -mt-1 rounded hover:bg-black/5">
              <X className="h-4 w-4 text-[var(--text-primary)]" />
            </button>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-black/5 transition-all duration-200 active:scale-95"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg text-white transition-all duration-200 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: color }}
            >
              {loading ? 'Procesando...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

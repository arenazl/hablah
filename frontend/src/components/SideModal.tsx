import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface SideModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  stickyFooter?: ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

const widthMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }

export function SideModal({ isOpen, onClose, title, subtitle, children, stickyFooter, width = 'lg' }: SideModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        className={`absolute right-0 top-0 bottom-0 w-full ${widthMap[width]} bg-[var(--bg-card)] shadow-2xl flex flex-col transition-transform duration-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-accent)]" />
        <header className="flex-shrink-0 flex items-start justify-between p-5 border-b border-[var(--border-color)]">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate text-[var(--text-primary)]">{title}</h2>
            {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-black/5 transition-all duration-200 hover:rotate-90 active:scale-95"
          >
            <X className="h-5 w-5 text-[var(--text-primary)]" />
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 text-[var(--text-primary)]">
          {children}
        </div>
        {stickyFooter && (
          <footer className="flex-shrink-0 p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
            {stickyFooter}
          </footer>
        )}
      </aside>
    </div>
  )
}

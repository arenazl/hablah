/* ABMFilterChip — chip pill con label + count interno.
   Activo: fondo navy + texto blanco + count en gold-300 sobre gold soft alpha.
   Inactivo: fondo surface + texto ink-3 + count en bg-hover. */
interface Props {
  label: string
  count?: number
  active?: boolean
  onClick?: () => void
  className?: string
}

export function ABMFilterChip({ label, count, active, onClick, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-sm font-semibold transition-all duration-150 active:scale-95 ${className}`}
      style={{
        backgroundColor: active ? 'var(--navy-800)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--ink-2)',
        border: `1px solid ${active ? 'var(--navy-800)' : 'var(--border-color)'}`,
      }}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className="font-mono-tnum text-[11px] px-1.5 py-0.5 rounded font-bold"
          style={{
            backgroundColor: active ? 'rgba(201,161,88,0.22)' : 'var(--bg-hover)',
            color: active ? 'var(--gold-300)' : 'var(--ink-5)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

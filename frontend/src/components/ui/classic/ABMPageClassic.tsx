/* ABMPageClassic — shell editorial CB (Template Classic).
   Anatomía screenshot Clientes Claude Design:
   - Header sticky: eyebrow dorado + título serif gigante + subtitle inline con
     métricas strong + bullets · + toolbar derecha (Importar/Exportar/+Nuevo).
   - Fila de filtros: chips pill izquierda con count + search + Filtros outline
     + toggle Tabla/Cards.
   - Body scrollable.

   Toggle de vistas: 2 modos (table | cards), persistencia delegada a la página.
*/
import { ComponentType, ReactNode } from 'react'
import {
  Plus, Search, LayoutGrid, List, Calendar,
  Upload, Download, SlidersHorizontal,
} from 'lucide-react'

/* ---------------- Tipos ---------------- */

export interface SubtitlePart {
  strong: string | number
  label: string
}

export interface FilterChipDef {
  key: string
  label: string
  count?: number
}

export interface ToolbarButtonDef {
  label: string
  icon?: ComponentType<{ className?: string }>
  onClick?: () => void
  variant?: 'outline' | 'navy' | 'gold'
}

/** atajos comunes para no importar lucide en cada página */
export const TOOLBAR_IMPORT: Pick<ToolbarButtonDef, 'icon' | 'label'> = { icon: Upload,   label: 'Importar' }
export const TOOLBAR_EXPORT: Pick<ToolbarButtonDef, 'icon' | 'label'> = { icon: Download, label: 'Exportar' }

export type ViewMode = 'table' | 'cards' | 'calendar'

export interface ABMPageClassicProps {
  /** Eyebrow uppercase con barrita dorada antes del título (ej "Cartera · CRM") */
  eyebrow?: string
  /** Título principal (serif Instrument Serif) */
  title: string
  /** Métricas inline bajo el título (strong + label, separadas por ·) */
  subtitleParts?: SubtitlePart[]

  /** Chips de filtro (incluir uno "todos" para reset) */
  filterChips?: FilterChipDef[]
  activeChip?: string
  onChipChange?: (key: string) => void

  /** Búsqueda */
  searchValue: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string

  /** Botón "Filtros" outline (abre modal/popover propio de la página) */
  onOpenFilters?: () => void

  /** Toolbar derecha del header (Importar, Exportar, etc.) */
  toolbar?: ToolbarButtonDef[]
  /** Botón principal "+ Nuevo X" */
  onAdd?: () => void
  addLabel?: string

  /** Toggle de vistas Tabla/Cards (y opcional Calendar) */
  view?: ViewMode
  onViewChange?: (v: ViewMode) => void
  /** Qué vistas estan disponibles. Default: ['table', 'cards'].
   * Agregar 'calendar' solo en pantallas que tengan dimension temporal (ej: Visitas). */
  availableViews?: ViewMode[]

  /** Slot para filtros custom (ModernSelect, DatePicker, etc.) entre los chips y el search */
  extraFilters?: ReactNode

  /** Estados */
  loading?: boolean
  isEmpty?: boolean
  emptyMessage?: string

  /** Contenido principal — típicamente <ABMTableClassic> o un grid de <ABMCardClassic> */
  children: ReactNode
}

/* ---------------- Subcomponentes ---------------- */

import { ABMFilterChip } from './ABMFilterChip'

function ToolbarBtn({ btn }: { btn: ToolbarButtonDef }) {
  const Icon = btn.icon
  const styles =
    btn.variant === 'navy'
      ? { bg: 'var(--navy-800)', color: '#fff',           border: 'var(--navy-800)' }
      : btn.variant === 'gold'
      ? { bg: 'var(--gold-500)', color: 'var(--navy-900)', border: 'var(--gold-600)' }
      : { bg: 'var(--surface)',  color: 'var(--ink-2)',    border: 'var(--border-color)' }
  return (
    <button
      type="button"
      onClick={btn.onClick}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium active:scale-95 transition-all duration-200"
      style={{
        backgroundColor: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
      }}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {btn.label}
    </button>
  )
}

const VIEW_OPTIONS: Record<ViewMode, { label: string; icon: typeof List }> = {
  table:    { label: 'Tabla',     icon: List },
  cards:    { label: 'Cards',     icon: LayoutGrid },
  calendar: { label: 'Calendario', icon: Calendar },
}

function ViewToggle({
  view, onChange, available,
}: {
  view: ViewMode
  onChange: (v: ViewMode) => void
  available: ViewMode[]
}) {
  const n = available.length
  if (n < 2) return null  // un solo modo, no muestra toggle
  const activeIdx = Math.max(0, available.indexOf(view))
  const widthPct = 100 / n

  return (
    <div
      className="inline-flex items-center rounded-lg p-1 relative"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)' }}
    >
      {/* Pill deslizante */}
      <div
        className="absolute top-1 bottom-1 rounded transition-all duration-300 ease-out"
        style={{
          backgroundColor: 'var(--navy-800)',
          width: `calc(${widthPct}% - ${8 / n}px)`,
          left: `calc(${activeIdx * widthPct}% + 4px)`,
          boxShadow: '0 1px 3px rgba(14,43,79,0.15)',
        }}
      />

      {available.map((v) => {
        const opt = VIEW_OPTIONS[v]
        const Icon = opt.icon
        const active = view === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="relative z-10 px-3 py-1.5 rounded inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-200"
            style={{ color: active ? '#fff' : 'var(--ink-4)' }}
            title={`Vista ${opt.label.toLowerCase()}`}
            aria-label={`Vista ${opt.label.toLowerCase()}`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- ABMPageClassic ---------------- */

export function ABMPageClassic(props: ABMPageClassicProps) {
  const {
    eyebrow, title, subtitleParts,
    filterChips, activeChip, onChipChange,
    searchValue, onSearchChange, searchPlaceholder = 'Buscar...',
    onOpenFilters, toolbar, onAdd, addLabel = 'Nuevo',
    view, onViewChange, availableViews,
    extraFilters,
    loading, isEmpty, emptyMessage = 'No hay resultados',
    children,
  } = props

  const _availableViews: ViewMode[] = availableViews && availableViews.length > 0
    ? availableViews
    : ['table', 'cards']

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="flex-shrink-0 sticky top-0 z-20 pb-5"
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        {/* === Header: título + toolbar === */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-1">
          <div className="flex flex-col gap-2 min-w-0">
            {eyebrow && <span className="eyebrow-line">{eyebrow}</span>}
            <h1
              className="font-serif-display leading-none m-0"
              style={{
                fontSize: 'clamp(36px, 5.2vw, 56px)',
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </h1>
            {subtitleParts && subtitleParts.length > 0 && (
              <p
                className="text-sm flex items-center gap-2 flex-wrap m-0 mt-1"
                style={{ color: 'var(--ink-4)' }}
              >
                {subtitleParts.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    {i > 0 && (
                      <span
                        className="inline-block w-1 h-1 rounded-full"
                        style={{ backgroundColor: 'var(--ink-5)' }}
                      />
                    )}
                    <strong
                      style={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    >
                      {p.strong}
                    </strong>
                    <span>{p.label}</span>
                  </span>
                ))}
              </p>
            )}
          </div>

          {(toolbar || onAdd) && (
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              {toolbar?.map((b, i) => <ToolbarBtn key={i} btn={b} />)}
              {onAdd && (
                <button
                  type="button"
                  onClick={onAdd}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-semibold active:scale-95 transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--navy-800)',
                    color: '#fff',
                    border: '1px solid var(--navy-800)',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {addLabel}
                </button>
              )}
            </div>
          )}
        </div>

        {/* === Fila de filtros: chips + search + filtros + view toggle ===
            Mobile: chips en scroll horizontal, search/filtros/toggle abajo en su propia fila.
            Desktop (md+): todo en una sola fila con search a la derecha. */}
        <div className="mt-5 flex flex-col md:flex-row md:items-center gap-2.5">
          {filterChips && filterChips.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto md:flex-wrap -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              {filterChips.map((c) => (
                <div key={c.key} className="flex-shrink-0">
                  <ABMFilterChip
                    label={c.label}
                    count={c.count}
                    active={activeChip === c.key}
                    onClick={() => onChipChange?.(c.key)}
                  />
                </div>
              ))}
            </div>
          )}

          {extraFilters && (
            <div className="flex items-center gap-2 flex-wrap">{extraFilters}</div>
          )}

          <div className="md:ml-auto flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 md:flex-initial">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: 'var(--ink-5)' }}
              />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 pl-9 pr-3 rounded-lg text-sm focus:outline-none w-full md:w-64"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {onOpenFilters && (
              <ToolbarBtn btn={{ label: 'Filtros', icon: SlidersHorizontal, onClick: onOpenFilters, variant: 'outline' }} />
            )}

            {view !== undefined && onViewChange && (
              <ViewToggle view={view} onChange={onViewChange} available={_availableViews} />
            )}
          </div>
        </div>
      </div>

      {/* === Body === */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!loading && isEmpty && (
          <div
            className="py-16 text-center text-sm rounded-xl"
            style={{
              color: 'var(--ink-5)',
              backgroundColor: 'var(--surface)',
              border: '1px dashed var(--border-color)',
            }}
          >
            {emptyMessage}
          </div>
        )}
        {(loading || !isEmpty) && children}
      </div>
    </div>
  )
}

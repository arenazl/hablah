/**
 * CalendarView — vista de calendario mensual, agnóstica y typed.
 *
 * Para integrarse como tercera vista del ABMPageClassic (después de table/cards).
 * Recibe items YA filtrados desde la página y los agrupa por día.
 *
 * Adaptado / simplificado de APP_GUIDE/components/ui/CalendarView.tsx.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface CalendarViewProps<T> {
  items: T[]
  getId: (item: T) => string | number
  getDate: (item: T) => string  // ISO; se trunca a 10 chars (yyyy-mm-dd)
  getLabel: (item: T) => string
  getTime?: (item: T) => string  // HH:mm opcional
  getColor?: (item: T) => string
  onItemClick?: (item: T) => void
  helperText?: ReactNode
  initialDate?: Date
}

const DIAS_CORTOS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function yyyymmdd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Devuelve array de fechas representando todas las celdas del mes (incluye dias del mes anterior y proximo para completar las semanas) */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  // Día 0=Domingo, queremos lunes como inicio (0=lunes)
  const firstWeekday = (first.getDay() + 6) % 7  // lunes=0, domingo=6
  const cells: Date[] = []
  // Días del mes anterior para completar la primera semana
  for (let i = firstWeekday; i > 0; i--) {
    cells.push(new Date(year, month, 1 - i))
  }
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d))
  }
  // Completar hasta múltiplo de 7
  while (cells.length % 7 !== 0) {
    const lastCell = cells[cells.length - 1]
    cells.push(new Date(lastCell.getFullYear(), lastCell.getMonth(), lastCell.getDate() + 1))
  }
  return cells
}

export function CalendarView<T>(props: CalendarViewProps<T>) {
  const { items, getId, getDate, getLabel, getTime, getColor, onItemClick, helperText, initialDate } = props

  const today = new Date()
  const todayISO = yyyymmdd(today)
  const [cursor, setCursor] = useState(() => initialDate || new Date(today.getFullYear(), today.getMonth(), 1))

  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor])

  // Mapa fecha (yyyy-mm-dd) -> items
  const itemsByDate = useMemo(() => {
    const m = new Map<string, T[]>()
    for (const it of items) {
      const d = (getDate(it) || '').slice(0, 10)
      if (!d) continue
      if (!m.has(d)) m.set(d, [])
      m.get(d)!.push(it)
    }
    return m
  }, [items, getDate])

  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)' }}
    >
      {/* Header del calendario */}
      <header
        className="flex items-center justify-between gap-3 p-4 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded hover:bg-black/5 active:scale-95 transition-all"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded hover:bg-black/5 active:scale-95 transition-all"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95"
            style={{ borderColor: 'var(--border-color)', color: 'var(--ink-3)' }}
          >
            Hoy
          </button>
        </div>
        <h2
          className="font-serif-display leading-none m-0 truncate"
          style={{ fontSize: 'clamp(20px, 3vw, 28px)', color: 'var(--text-primary)' }}
        >
          {MESES[cursor.getMonth()]} {cursor.getFullYear()}
        </h2>
        <div className="text-xs" style={{ color: 'var(--ink-5)' }}>
          {helperText ?? `${items.length} eventos`}
        </div>
      </header>

      {/* Header dias */}
      <div
        className="grid grid-cols-7 gap-px border-b"
        style={{ backgroundColor: 'var(--divider)', borderColor: 'var(--border-color)' }}
      >
        {DIAS_CORTOS.map((d) => (
          <div
            key={d}
            className="text-center py-2 text-[10px] uppercase tracking-wider font-semibold"
            style={{ backgroundColor: 'var(--surface-3)', color: 'var(--ink-4)' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      <div
        className="grid grid-cols-7 gap-px"
        style={{ backgroundColor: 'var(--divider)' }}
      >
        {grid.map((d, i) => {
          const dateISO = yyyymmdd(d)
          const isCurrentMonth = d.getMonth() === cursor.getMonth()
          const isToday = dateISO === todayISO
          const dayItems = itemsByDate.get(dateISO) || []
          return (
            <div
              key={i}
              className="min-h-[88px] md:min-h-[110px] p-1.5 flex flex-col gap-1 overflow-hidden"
              style={{
                backgroundColor: isCurrentMonth ? 'var(--surface)' : 'var(--surface-3)',
                opacity: isCurrentMonth ? 1 : 0.5,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold leading-none inline-flex items-center justify-center"
                  style={{
                    color: isToday ? '#fff' : 'var(--text-primary)',
                    backgroundColor: isToday ? 'var(--navy-800)' : 'transparent',
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                  }}
                >
                  {d.getDate()}
                </span>
                {dayItems.length > 2 && (
                  <span className="text-[10px] font-bold" style={{ color: 'var(--ink-5)' }}>
                    +{dayItems.length - 2}
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-0 space-y-1">
                {dayItems.slice(0, 3).map((it) => {
                  const color = getColor?.(it) || 'var(--color-accent)'
                  return (
                    <button
                      key={getId(it)}
                      onClick={() => onItemClick?.(it)}
                      className="w-full text-left rounded-md px-1.5 py-1 text-[10px] truncate active:scale-95 transition-all"
                      style={{
                        backgroundColor: `${color}1f`,
                        color: 'var(--text-primary)',
                        borderLeft: `2px solid ${color}`,
                      }}
                      title={getLabel(it)}
                    >
                      {getTime && (
                        <span className="font-mono-tnum font-semibold mr-1" style={{ color }}>
                          {getTime(it)}
                        </span>
                      )}
                      <span className="truncate">{getLabel(it)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

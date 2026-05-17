/* ABMTableClassic — tabla del Template Classic CB.
   Headers en uppercase-label tracking-wide ink-5 sobre surface-3.
   Filas con borde --divider 1px, hover --surface-3.
   Columnas numéricas: font-mono-tnum auto. */
import { ReactNode, useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface ABMColumnClassic<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  width?: string
  className?: string
  /** numérica → aplica mono-tnum y alinea a la derecha */
  numeric?: boolean
}

interface Props<T> {
  data: T[]
  columns: ABMColumnClassic<T>[]
  keyExtractor: (row: T) => string | number
  onRowClick?: (row: T) => void
  /** acciones a la derecha de cada fila (componente que ya tiene padding/grupo) */
  rowActions?: (row: T) => ReactNode
  emptyMessage?: string
}

export function ABMTableClassic<T>({
  data, columns, keyExtractor, onRowClick, rowActions, emptyMessage,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return data
    const fn = col.sortValue
    return [...data].sort((a, b) => {
      const va = fn(a), vb = fn(b)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortDir, columns])

  const onHeaderClick = (col: ABMColumnClassic<T>) => {
    if (!col.sortable) return
    if (sortKey === col.key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(col.key); setSortDir('asc') }
  }

  if (data.length === 0 && emptyMessage) {
    return (
      <div
        className="py-12 text-center text-sm rounded-xl"
        style={{
          color: 'var(--ink-5)',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-color)',
        }}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: 720 }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-3)' }}>
              {columns.map((c) => {
                const align = c.align ?? (c.numeric ? 'right' : 'left')
                return (
                  <th
                    key={c.key}
                    onClick={() => onHeaderClick(c)}
                    className={`py-3 px-4 ${c.sortable ? 'cursor-pointer select-none' : ''} ${c.className ?? ''}`}
                    style={{
                      textAlign: align,
                      width: c.width,
                      fontSize: '10.5px',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-5)',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.header}
                      {c.sortable && sortKey === c.key && (
                        sortDir === 'asc'
                          ? <ChevronUp className="h-3 w-3" />
                          : <ChevronDown className="h-3 w-3" />
                      )}
                    </span>
                  </th>
                )
              })}
              {rowActions && <th style={{ width: 120 }} />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  borderBottom: '1px solid var(--divider)',
                  transition: 'background-color .12s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-3)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
              >
                {columns.map((c) => {
                  const align = c.align ?? (c.numeric ? 'right' : 'left')
                  return (
                    <td
                      key={c.key}
                      className={`py-3 px-4 ${c.numeric ? 'font-mono-tnum' : ''} ${c.className ?? ''}`}
                      style={{
                        textAlign: align,
                        color: 'var(--text-primary)',
                        verticalAlign: 'middle',
                      }}
                    >
                      {c.render ? c.render(row) : (row as any)[c.key]}
                    </td>
                  )
                })}
                {rowActions && (
                  <td className="py-2 px-3" style={{ textAlign: 'right' }}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

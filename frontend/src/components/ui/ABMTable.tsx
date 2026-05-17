import { ReactNode, useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react'

export interface ABMColumn<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number
  className?: string
}

interface ABMTableProps<T> {
  data: T[]
  columns: ABMColumn<T>[]
  keyExtractor: (row: T) => string | number
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
}

export function ABMTable<T>({ data, columns, keyExtractor, onEdit, onDelete }: ABMTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sorted = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return data
    const sortFn = col.sortValue
    return [...data].sort((a, b) => {
      const va = sortFn(a), vb = sortFn(b)
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortDir, columns])

  const onHeaderClick = (col: ABMColumn<T>) => {
    if (!col.sortable) return
    if (sortKey === col.key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(col.key); setSortDir('asc') }
  }

  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-color)]">
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => onHeaderClick(c)}
                className={`text-left px-4 py-3 font-semibold text-[var(--text-secondary)] ${c.sortable ? 'cursor-pointer select-none' : ''} ${c.className ?? ''}`}
              >
                <div className="inline-flex items-center gap-1">
                  {c.header}
                  {c.sortable && sortKey === c.key && (
                    sortDir === 'asc'
                      ? <ChevronUp className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
            ))}
            {(onEdit || onDelete) && <th className="w-24" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={keyExtractor(row)} className="border-t border-[var(--border-color)] hover:bg-[var(--color-accent)]/10 transition-colors">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2 ${c.className ?? ''}`}>
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="p-1.5 rounded hover:bg-[var(--color-primary)]/10 transition-all duration-200 active:scale-95"
                      >
                        <Pencil className="h-4 w-4 text-[var(--color-primary)]" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="p-1.5 rounded hover:bg-[var(--color-danger)]/10 transition-all duration-200 active:scale-95"
                      >
                        <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

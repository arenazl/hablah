/* AbmTable — ABM genérico (alta/baja/modificación) sobre un endpoint REST.
 * Reutilizable: se le pasa el endpoint, las columnas y un row vacío. */
import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

export interface AbmCol {
  field: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'bool'
  readOnly?: boolean
}

const FIELD: React.CSSProperties = { width: '100%', padding: '7px 9px', borderRadius: 8, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 13 }
const BTN: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }

export function AbmTable({ endpoint, columns, newRow, idField = 'id' }: {
  endpoint: string
  columns: AbmCol[]
  newRow: Record<string, unknown>
  idField?: string
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    api.get(endpoint).then((r) => setRows(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch((e) => setErr(String(e?.response?.data?.detail || e)))
  }, [endpoint])
  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!editing) return
    setErr('')
    try {
      const id = editing[idField]
      if (id) await api.patch(`${endpoint}/${id}`, editing)
      else await api.post(endpoint, editing)
      setEditing(null); load()
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(String(m || 'error al guardar'))
    }
  }
  const del = async (id: unknown) => {
    if (!confirm('¿Borrar este registro?')) return
    try { await api.delete(`${endpoint}/${id}`); load() } catch (e: unknown) {
      setErr(String((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'no se pudo borrar'))
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button style={{ ...BTN, background: '#22c55e', color: '#06120a' }} onClick={() => setEditing({ ...newRow })}>+ Nuevo</button>
      </div>
      {err && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 8 }}>{err}</div>}

      {editing && (
        <div style={{ background: '#0b0e14', border: '1px solid #38bdf8', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {columns.filter((c) => !c.readOnly).map((c) => (
              <div key={c.field}>
                <div style={{ fontSize: 11, color: '#9aa3af', marginBottom: 4 }}>{c.label}</div>
                {c.type === 'textarea' ? (
                  <textarea style={{ ...FIELD, minHeight: 60, resize: 'vertical' }} value={String(editing[c.field] ?? '')} onChange={(e) => setEditing({ ...editing, [c.field]: e.target.value })} />
                ) : c.type === 'bool' ? (
                  <select style={FIELD} value={String(editing[c.field] ?? 'true')} onChange={(e) => setEditing({ ...editing, [c.field]: e.target.value === 'true' })}>
                    <option value="true">Sí</option><option value="false">No</option>
                  </select>
                ) : (
                  <input style={FIELD} type={c.type === 'number' ? 'number' : 'text'} value={String(editing[c.field] ?? '')}
                    onChange={(e) => setEditing({ ...editing, [c.field]: c.type === 'number' ? Number(e.target.value) : e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...BTN, background: '#22c55e', color: '#06120a' }} onClick={save}>Guardar</button>
            <button style={{ ...BTN, background: '#232936', color: '#e6e8ec' }} onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((c) => <th key={c.field} style={{ textAlign: 'left', padding: '8px 10px', color: '#9aa3af', borderBottom: '1px solid #232936', fontWeight: 600 }}>{c.label}</th>)}
              <th style={{ borderBottom: '1px solid #232936' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[idField])} style={{ borderBottom: '1px solid #1c2230' }}>
                {columns.map((c) => (
                  <td key={c.field} style={{ padding: '8px 10px', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1' }}>
                    {c.type === 'bool' ? (row[c.field] ? 'Sí' : 'No') : String(row[c.field] ?? '')}
                  </td>
                ))}
                <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                  <button style={{ ...BTN, background: '#232936', color: '#7dd3fc', padding: '5px 10px', marginRight: 6 }} onClick={() => setEditing({ ...row })}>Editar</button>
                  <button style={{ ...BTN, background: '#232936', color: '#fca5a5', padding: '5px 10px' }} onClick={() => del(row[idField])}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

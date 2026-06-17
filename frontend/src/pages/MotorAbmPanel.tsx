/* MotorAbmPanel — /admin/motor-abms
 *
 * ABM genérico de las tablas-tag del modelo v3 (tutor_identity, behavioral_guard, topic_lexis,
 * language_objective, …). El esquema (columnas, tipos, enums, FK) lo trae el backend desde
 * information_schema, así que el formulario se arma solo. Cargás los tags que el motor usa.
 * Sin texto libre suelto: todo vive como filas reusables del catálogo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { motorAPI, MotorTable, MotorColumn } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

const C = {
  bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1c2230',
  fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686', accent: '#38bdf8', green: '#22c55e', red: '#f87171',
}
const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '7px 9px', borderRadius: 7,
  border: `1px solid ${C.border}`, background: C.bg, color: C.fg, fontSize: 13, fontFamily: 'inherit',
}
const Ico = ({ d }: { d: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

export default function MotorAbmPanel() {
  const isMobile = useIsMobile()
  const [tables, setTables] = useState<MotorTable[]>([])
  const [active, setActive] = useState<string>('behavioral_guard')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Record<string, any> | null>(null)  // fila en edición (o nueva)
  // opciones para FK: { age_band: [{value,label}], level: [...] }
  const [fkOptions, setFkOptions] = useState<Record<string, { value: any; label: string }[]>>({})

  const loadTables = useCallback(() => { motorAPI.tables().then(setTables).catch(() => {}) }, [])
  useEffect(() => { loadTables() }, [loadTables])

  const table = useMemo(() => tables.find((t) => t.name === active), [tables, active])

  const loadRows = useCallback(() => {
    setLoading(true)
    motorAPI.rows(active).then(setRows).catch(() => setRows([])).finally(() => setLoading(false))
  }, [active])
  useEffect(() => { loadRows(); setEditing(null) }, [loadRows])

  // cargar opciones de las FK de la tabla activa
  useEffect(() => {
    if (!table) return
    const refs = Array.from(new Set(table.columns.map((c) => c.fk_ref).filter(Boolean))) as string[]
    Promise.all(refs.map((ref) => motorAPI.rows(ref).then((rs) => [ref, rs] as const))).then((pairs) => {
      const out: Record<string, { value: any; label: string }[]> = {}
      for (const [ref, rs] of pairs) {
        const refTbl = tables.find((t) => t.name === ref)
        const pk = refTbl?.pk[0] || 'id'
        const labelCol = ['label', 'name', 'title', 'code', 'description'].find((c) => rs[0] && c in rs[0]) || pk
        out[ref] = rs.map((r) => ({ value: r[pk], label: `${r[pk]} · ${r[labelCol]}` }))
      }
      setFkOptions(out)
    }).catch(() => {})
  }, [table, tables])

  const groups = useMemo(() => {
    const m: Record<string, MotorTable[]> = {}
    for (const t of tables) (m[t.group] ||= []).push(t)
    return m
  }, [tables])

  const editableCols = (t: MotorTable) => t.columns.filter((c) => !c.auto)
  const pkOf = (row: Record<string, any>): Record<string, any> =>
    Object.fromEntries((table?.pk || []).map((k) => [k, row[k]]))

  const startNew = () => {
    if (!table) return
    const blank: Record<string, any> = {}
    for (const c of editableCols(table)) blank[c.name] = c.enum_options ? c.enum_options[0] : ''
    setEditing(blank)
  }

  const save = async () => {
    if (!table || !editing) return
    const isNew = !editing.__pk
    try {
      if (isNew) {
        const clean: Record<string, any> = {}
        for (const c of editableCols(table)) if (editing[c.name] !== '') clean[c.name] = editing[c.name]
        await motorAPI.insert(table.name, clean)
      } else {
        const set: Record<string, any> = {}
        for (const c of editableCols(table)) set[c.name] = editing[c.name]
        await motorAPI.update(table.name, editing.__pk, set)
      }
      toast.success('Guardado'); setEditing(null); loadRows(); loadTables()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'No se pudo guardar') }
  }

  const del = async (row: Record<string, any>) => {
    if (!table || !confirm('¿Borrar esta fila?')) return
    try { await motorAPI.remove(table.name, pkOf(row)); toast.success('Borrado'); loadRows(); loadTables() }
    catch (e: any) { toast.error(e?.response?.data?.detail || 'No se pudo borrar') }
  }

  const cols = table ? table.columns : []
  const displayCols = cols.filter((c) => c.data_type !== 'text' || true)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '18px 16px 64px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>Tags del modelo · ABM</h1>
        <p style={{ color: C.dim, fontSize: 12.5, margin: '0 0 14px' }}>
          Cargá las filas que alimentan las 9 capas. El formulario se arma solo desde el esquema real. Todo es dato reusable, sin texto libre suelto.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '230px minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
          {/* nav de tablas agrupadas */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 8, maxHeight: isMobile ? 'none' : '84vh', overflowY: 'auto' }}>
            {Object.entries(groups).map(([group, ts]) => (
              <div key={group} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: C.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, padding: '5px 6px' }}>{group}</div>
                {ts.map((t) => {
                  const on = t.name === active
                  return (
                    <button key={t.name} onClick={() => setActive(t.name)}
                      style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 9px', borderRadius: 7, border: `1px solid ${on ? C.accent : 'transparent'}`, background: on ? 'rgba(56,189,248,0.12)' : 'transparent', color: on ? C.accent : C.dim, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginBottom: 2 }}>
                      <span>{t.label}</span>
                      <span style={{ fontSize: 10.5, color: C.faint, fontVariantNumeric: 'tabular-nums' }}>{t.count}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* tabla + editor */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{table?.label} <span style={{ fontSize: 11, color: C.faint, fontFamily: 'monospace', fontWeight: 400 }}>{table?.name}</span></div>
              <button onClick={startNew} style={{ background: C.green, border: 0, color: '#06281a', borderRadius: 8, fontSize: 12.5, fontWeight: 700, padding: '7px 13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Ico d="M12 5v14M5 12h14" /> Nueva fila
              </button>
            </div>

            {/* editor inline */}
            {editing && table && (
              <div style={{ background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, marginBottom: 10 }}>{editing.__pk ? 'Editar fila' : 'Nueva fila'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
                  {editableCols(table).map((c) => (
                    <Field key={c.name} col={c} value={editing[c.name]} fkOptions={fkOptions}
                      onChange={(v) => setEditing((p) => ({ ...p!, [c.name]: v }))} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={save} style={{ background: C.accent, border: 0, color: '#06283a', borderRadius: 8, fontSize: 13, fontWeight: 700, padding: '8px 16px', cursor: 'pointer' }}>Guardar</button>
                  <button onClick={() => setEditing(null)} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.dim, borderRadius: 8, fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}

            {/* tabla */}
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {loading && <div style={{ padding: 24, textAlign: 'center', color: C.dim, fontSize: 13 }}>Cargando…</div>}
              {!loading && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {displayCols.map((c) => (
                          <th key={c.name} style={{ textAlign: 'left', padding: '9px 10px', color: C.faint, fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            {c.name}{c.fk_ref ? ' →' : ''}
                          </th>
                        ))}
                        <th style={{ width: 70 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.soft}` }}>
                          {displayCols.map((c) => (
                            <td key={c.name} style={{ padding: '8px 10px', color: c.is_pk ? C.faint : C.fg, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: c.data_type === 'varchar' && String(r[c.name] || '').length > 40 ? 'normal' : 'nowrap' }}>
                              {String(r[c.name] ?? '')}
                            </td>
                          ))}
                          <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                            <button onClick={() => setEditing({ ...r, __pk: pkOf(r) })} title="editar" style={{ background: 'none', border: 0, color: C.accent, cursor: 'pointer', marginRight: 4 }}><Ico d="M11 4H4v16h16v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></button>
                            <button onClick={() => del(r)} title="borrar" style={{ background: 'none', border: 0, color: C.faint, cursor: 'pointer' }}><Ico d="M3 6h18M8 6V4h8v2m-9 0v14h10V6" /></button>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && <tr><td colSpan={displayCols.length + 1} style={{ padding: 24, textAlign: 'center', color: C.faint }}>Sin filas.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ col, value, fkOptions, onChange }: {
  col: MotorColumn; value: any; fkOptions: Record<string, { value: any; label: string }[]>; onChange: (v: any) => void
}) {
  const label = (
    <label style={{ fontSize: 10.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
      {col.name}{col.is_pk ? ' (PK)' : ''}{col.nullable ? '' : ' *'}
    </label>
  )
  if (col.fk_ref) {
    const opts = fkOptions[col.fk_ref] || []
    return (
      <div>{label}
        <select style={inp} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)))}>
          <option value="">—</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }
  if (col.enum_options) {
    return (
      <div>{label}
        <select style={inp} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {col.enum_options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }
  const isNum = ['int', 'tinyint', 'smallint', 'bigint', 'decimal'].includes(col.data_type)
  const long = col.data_type === 'varchar' || col.data_type === 'text'
  if (long) {
    return (
      <div style={{ gridColumn: '1 / -1' }}>{label}
        <textarea style={{ ...inp, resize: 'vertical', minHeight: 38 }} rows={2} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }
  return (
    <div>{label}
      <input style={inp} type={isNum ? 'number' : 'text'} value={value ?? ''}
        onChange={(e) => onChange(isNum ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
    </div>
  )
}

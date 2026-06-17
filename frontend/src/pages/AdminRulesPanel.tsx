/* AdminRulesPanel — el MOTOR DE REGLAS (catálogo editable, no texto libre).
 *
 * Las 122 reglas predefinidas agrupadas por slot (las 9 capas). Elegís banda + nivel y
 * ves cuáles CAEN en la clase (resaltadas) + el prompt armado. Cada regla la prendés/
 * apagás, corregís el texto o agregás una nueva. Cero string hardcodeado: todo es catálogo.
 * Fuente del modelo: Motor-Learning/catalogo_reglas_motor.xlsx + 04_composer_3inputs.py.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import api from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Rule {
  id: string; bloque: string; categoria: string; eje: string; aplica_a: string
  regla: string; origen: string; editable: boolean; notas: string; sort_order: number; active: boolean
}
interface Resolved { prompt: string; slots: Record<string, string[]>; banda: string; nivel: string }

const EJE_COLOR: Record<string, string> = {
  FIJO: '#9aa3af', EDAD: '#fbbf24', NIVEL: '#7dd3fc', 'TÓPICO': '#86efac',
  'EDAD+TÓPICO': '#c4b5fd', 'TÓPICO+EDAD': '#c4b5fd', RUNTIME: '#f0abfc',
}
const EJE_TIPO: Record<string, string> = {
  FIJO: '[E] estático', EDAD: '[P] preset·edad', NIVEL: '[P] preset·nivel',
  'TÓPICO': '[D] dinámico', 'EDAD+TÓPICO': '[D] dinámico', 'TÓPICO+EDAD': '[D] dinámico', RUNTIME: '[D] runtime',
}
const SEGS = [['mini', 'Mini'], ['junior', 'Junior'], ['tween', 'Tween'], ['adult', 'Adulto']]
const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1']
const FIELD: React.CSSProperties = { padding: '7px 9px', borderRadius: 9, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 13 }

export default function AdminRulesPanel() {
  const [rules, setRules] = useState<Rule[]>([])
  const [res, setRes] = useState<Resolved | null>(null)
  const [seg, setSeg] = useState('mini')
  const [nivel, setNivel] = useState('A1')
  const [onlyActive, setOnlyActive] = useState(false)
  const isMobile = useIsMobile()

  const load = useCallback(() => {
    api.get('/rules').then((r) => setRules(r.data)).catch(() => toast.error('No pude cargar el catálogo'))
  }, [])
  useEffect(() => { load() }, [load])

  const resolve = useCallback(() => {
    api.get('/rules/resolve', { params: { segment: seg, nivel } }).then((r) => setRes(r.data)).catch(() => setRes(null))
  }, [seg, nivel])
  useEffect(() => { resolve() }, [resolve])

  // IDs que caen en la clase actual (todas las slots).
  const selectedIds = useMemo(() => {
    const s = new Set<string>()
    Object.values(res?.slots || {}).forEach((ids) => ids.forEach((id) => s.add(id)))
    return s
  }, [res])

  const groups = useMemo(() => {
    const m: Record<string, Rule[]> = {}
    for (const r of rules) (m[r.bloque] ||= []).push(r)
    return Object.entries(m).sort((a, b) => {
      const na = parseFloat(a[0]) || 99, nb = parseFloat(b[0]) || 99
      return na - nb || a[0].localeCompare(b[0])
    })
  }, [rules])

  const patch = async (id: string, body: Partial<Rule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...body } : r)))
    try { await api.patch(`/rules/${id}`, body); resolve() }
    catch { toast.error('No se pudo guardar'); load() }
  }
  const remove = async (id: string) => {
    if (!window.confirm(`¿Borrar la regla ${id}?`)) return
    try { await api.delete(`/rules/${id}`); load(); resolve() } catch { toast.error('No se pudo borrar') }
  }
  const addRule = async (bloque: string) => {
    const txt = window.prompt('Texto de la nueva regla:')
    if (!txt || !txt.trim()) return
    const slot = bloque.split(' ', 1)[0]
    const id = `CUS-${slot}-${Date.now().toString(36).toUpperCase()}`
    const aplica_a = SEGS.some(([s]) => s === seg) ? `banda:${{ mini: 'early_child', junior: 'child', tween: 'teen', adult: 'adult' }[seg]}` : 'todos'
    try {
      await api.post('/rules', { id, bloque, categoria: 'custom', eje: 'EDAD', aplica_a, regla: txt.trim() })
      load(); resolve()
    } catch { toast.error('No se pudo crear') }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '22px 20px 64px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Motor de reglas · catálogo</h1>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 16px', maxWidth: 820 }}>
          Las reglas predefinidas del motor, por capa. Elegí banda + nivel y mirá cuáles <b>caen</b> en la clase
          (resaltadas en verde) + el prompt armado. Prendé/apagá, corregí el texto o agregá una. Nada es texto libre.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div><div style={{ fontSize: 10, color: '#9aa3af', marginBottom: 4 }}>BANDA</div>
            <select style={{ ...FIELD, width: 150 }} value={seg} onChange={(e) => setSeg(e.target.value)}>
              {SEGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><div style={{ fontSize: 10, color: '#9aa3af', marginBottom: 4 }}>NIVEL</div>
            <select style={{ ...FIELD, width: 110 }} value={nivel} onChange={(e) => setNivel(e.target.value)}>
              {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#cbd5e1', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> solo las que caen
          </label>
          <div style={{ marginLeft: isMobile ? 0 : 'auto', fontSize: 12, color: '#9aa3af' }}>
            {selectedIds.size} reglas en la clase · {rules.length} en el catálogo
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
          {/* catálogo por slot */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {groups.map(([bloque, rs]) => {
              const shown = onlyActive ? rs.filter((r) => selectedIds.has(r.id)) : rs
              if (onlyActive && shown.length === 0) return null
              return (
                <div key={bloque} style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800 }}>{bloque}</div>
                    <button onClick={() => addRule(bloque)} style={{ background: 'none', border: '1px solid #2a3140', color: '#7dd3fc', borderRadius: 8, fontSize: 11.5, padding: '4px 9px', cursor: 'pointer' }}>+ regla</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {shown.map((r) => {
                      const inClass = selectedIds.has(r.id)
                      return (
                        <div key={r.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 9, background: inClass ? 'rgba(34,197,94,0.07)' : '#0b0e14', border: `1px solid ${inClass ? 'rgba(34,197,94,0.3)' : '#1c2230'}` }}>
                          <button onClick={() => patch(r.id, { active: !r.active })} title={r.active ? 'activa' : 'apagada'}
                            style={{ width: 34, height: 19, borderRadius: 999, border: 'none', cursor: 'pointer', background: r.active ? '#22c55e' : '#2a3140', position: 'relative', flexShrink: 0, marginTop: 2 }}>
                            <span style={{ position: 'absolute', top: 2, left: r.active ? 17 : 2, width: 15, height: 15, borderRadius: 999, background: '#fff', transition: 'left .15s' }} />
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <textarea defaultValue={r.regla} onBlur={(e) => e.target.value !== r.regla && patch(r.id, { regla: e.target.value })}
                              rows={1} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'transparent', border: 'none', color: r.active ? '#e6e8ec' : '#6b7280', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.4, padding: 0, outline: 'none', minHeight: 20 }} />
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: EJE_COLOR[r.eje] || '#9aa3af' }}>{EJE_TIPO[r.eje] || r.eje}</span>
                              <span style={{ fontSize: 10, color: '#5b6473', fontFamily: 'monospace' }}>{r.aplica_a}</span>
                              <span style={{ fontSize: 9.5, color: '#3b4250', fontFamily: 'monospace' }}>{r.id}</span>
                            </div>
                          </div>
                          <button onClick={() => remove(r.id)} style={{ background: 'none', border: 0, color: '#5b6473', cursor: 'pointer', fontSize: 15, lineHeight: 1, flexShrink: 0 }}>×</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* prompt armado */}
          <div style={{ position: isMobile ? 'static' : 'sticky', top: 16, background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', fontWeight: 700 }}>Prompt armado ({res?.banda} · {res?.nivel})</div>
              <a href="/llm" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#22c55e', textDecoration: 'none' }}>Probar ↗</a>
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.5, color: '#cbd5e1', maxHeight: '74vh', overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>
              {res?.prompt || '(resolviendo…)'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

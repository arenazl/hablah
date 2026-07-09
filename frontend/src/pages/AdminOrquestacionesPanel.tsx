/* AdminOrquestacionesPanel — /admin/orquestaciones
 *
 * La lista de TODAS las orquestaciones (perfil × nivel), ya configuradas por el motor.
 * Elegís una a la izquierda y a la derecha ves la orquestación RESUELTA: las reglas que
 * caen por slot (editables, se sacan), + al costado "otras del catálogo" (los presets)
 * para sumar/cambiar. El tópico por categoría → subcategoría. El prompt, en vivo.
 * (Layout del doc 09 · motor interactivo.)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import api from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Rule { id: string; bloque: string; categoria: string; eje: string; aplica_a: string; regla: string; active: boolean; sort_order: number }
interface Resolved { prompt: string; slots: Record<string, string[]>; banda: string; nivel: string }
interface Cat { id: number; name: string }
interface Sub { id: number; category_id: number; name: string }
interface Top { id: number; title: string; audience?: string; subcategory_id?: number }

const BANDS = [['mini', 'Mini · 4-7'], ['junior', 'Junior · 8-12'], ['tween', 'Tween · 13+'], ['adult', 'Adulto']]
const NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1']
const EJE_COLOR: Record<string, string> = { FIJO: '#9aa3af', EDAD: '#fbbf24', NIVEL: '#7dd3fc', 'TÓPICO': '#86efac', 'EDAD+TÓPICO': '#c4b5fd', 'TÓPICO+EDAD': '#c4b5fd', RUNTIME: '#f0abfc' }
const slotKey = (b: string) => (b || '').split(' ', 1)[0]

export default function AdminOrquestacionesPanel() {
  const [rules, setRules] = useState<Rule[]>([])
  const [res, setRes] = useState<Resolved | null>(null)
  const [seg, setSeg] = useState('mini')
  const [nivel, setNivel] = useState('A1')
  const [cats, setCats] = useState<Cat[]>([])
  const [subs, setSubs] = useState<Sub[]>([])
  const [topics, setTopics] = useState<Top[]>([])
  const [catId, setCatId] = useState<number | undefined>()
  const [subId, setSubId] = useState<number | undefined>()
  const [topicId, setTopicId] = useState<number | undefined>()
  const [openSlot, setOpenSlot] = useState<string | null>(null)  // slot con el catálogo abierto
  const [tab, setTab] = useState<'orq' | 'prompt'>('orq')
  const isMobile = useIsMobile()

  const loadRules = useCallback(() => { api.get('/rules').then((r) => setRules(r.data)).catch(() => {}) }, [])
  useEffect(() => {
    loadRules()
    api.get('/catalog/public/categories').then((r) => setCats(r.data)).catch(() => {})
    api.get('/catalog/public/subcategories').then((r) => setSubs(r.data)).catch(() => {})
    api.get('/topics').then((r) => setTopics(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch(() => {})
  }, [loadRules])

  const resolve = useCallback(() => {
    api.get('/rules/resolve', { params: { segment: seg, nivel, topic_id: topicId } }).then((r) => setRes(r.data)).catch(() => setRes(null))
  }, [seg, nivel, topicId])
  useEffect(() => { resolve() }, [resolve])

  const audience = ['mini', 'junior', 'tween'].includes(seg) ? 'kid' : 'adult'
  const subsForCat = useMemo(() => subs.filter((s) => s.category_id === catId), [subs, catId])
  const topicsForSub = useMemo(() => topics.filter((t) => (t.audience || 'adult') === audience && (!subId || t.subcategory_id === subId)), [topics, audience, subId])

  const byBloque = useMemo(() => {
    const m: Record<string, Rule[]> = {}
    for (const r of rules) (m[r.bloque] ||= []).push(r)
    return m
  }, [rules])
  const selectedIds = useMemo(() => new Set(Object.values(res?.slots || {}).flat()), [res])
  const slotsOrdered = useMemo(() => Object.keys(byBloque).sort((a, b) => (parseFloat(a) || 99) - (parseFloat(b) || 99) || a.localeCompare(b)), [byBloque])

  const patch = async (id: string, body: Partial<Rule>) => {
    setRules((p) => p.map((r) => (r.id === id ? { ...r, ...body } : r)))
    try { await api.patch(`/rules/${id}`, body); resolve() } catch { toast.error('No se pudo guardar'); loadRules() }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '20px 18px 64px' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto' }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: '0 0 3px' }}>Orquestaciones</h1>
        <p style={{ color: '#9aa3af', fontSize: 12.5, margin: '0 0 14px' }}>
          Cada perfil × nivel, ya armado por el motor. Elegí uno → ves las reglas que caen (editables, se sacan) + los presets al costado para cambiar. Tópico por categoría → subcategoría.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '210px minmax(0,1.5fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
          {/* IZQUIERDA: lista de orquestaciones (perfil × nivel) */}
          <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 12, padding: 8, maxHeight: isMobile ? 'none' : '82vh', overflowY: 'auto' }}>
            {BANDS.map(([b, label]) => (
              <div key={b} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10.5, color: '#6b7686', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, padding: '4px 6px' }}>{label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {NIVELES.map((n) => {
                    const on = seg === b && nivel === n
                    return (
                      <button key={n} onClick={() => { setSeg(b); setNivel(n) }}
                        style={{ flex: '1 1 36px', padding: '6px 0', borderRadius: 7, border: `1px solid ${on ? '#38bdf8' : '#232936'}`, background: on ? 'rgba(56,189,248,0.14)' : '#0b0e14', color: on ? '#7dd3fc' : '#9aa3af', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* CENTRO: la orquestación resuelta (reglas que caen, editables) */}
          <div>
            {/* tópico por categoría → subcategoría */}
            <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 12, padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={catId ?? ''} onChange={(e) => { setCatId(e.target.value ? Number(e.target.value) : undefined); setSubId(undefined); setTopicId(undefined) }} style={{ flex: '1 1 120px', minWidth: 0, padding: '7px 9px', borderRadius: 8, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 12.5 }}>
                <option value="">Categoría…</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={subId ?? ''} disabled={!catId} onChange={(e) => { setSubId(e.target.value ? Number(e.target.value) : undefined); setTopicId(undefined) }} style={{ flex: '1 1 120px', minWidth: 0, padding: '7px 9px', borderRadius: 8, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 12.5 }}>
                <option value="">Subcategoría…</option>
                {subsForCat.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : undefined)} style={{ flex: '1 1 140px', minWidth: 0, padding: '7px 9px', borderRadius: 8, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 12.5 }}>
                <option value="">Tópico (lo elige el sequencer)…</option>
                {topicsForSub.slice(0, 100).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            {isMobile && <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>{(['orq', 'prompt'] as const).map((t) => <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: tab === t ? '#172033' : '#11151d', color: tab === t ? '#7dd3fc' : '#9aa3af', fontWeight: 700, fontSize: 12.5 }}>{t === 'orq' ? 'Orquestación' : 'Prompt'}</button>)}</div>}

            {(!isMobile || tab === 'orq') && slotsOrdered.map((bloque) => {
              const sk = slotKey(bloque)
              const all = byBloque[bloque] || []
              const selected = all.filter((r) => selectedIds.has(r.id))
              const others = all.filter((r) => !selectedIds.has(r.id))
              if (selected.length === 0 && others.length === 0) return null
              const isOpen = openSlot === bloque
              return (
                <div key={bloque} style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{bloque}</div>
                    {others.length > 0 && <button onClick={() => setOpenSlot(isOpen ? null : bloque)} style={{ background: 'none', border: '1px solid #2a3140', color: '#7dd3fc', borderRadius: 7, fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}>{isOpen ? 'ocultar presets' : `+ presets (${others.length})`}</button>}
                  </div>
                  {/* reglas que CAEN */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selected.map((r) => (
                      <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <textarea defaultValue={r.regla} onBlur={(e) => e.target.value !== r.regla && patch(r.id, { regla: e.target.value })} rows={1} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'transparent', border: 'none', color: '#e6e8ec', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.4, outline: 'none', minHeight: 18 }} />
                          <span style={{ fontSize: 9, fontWeight: 700, color: EJE_COLOR[r.eje] || '#9aa3af' }}>{r.eje}</span> <span style={{ fontSize: 9, color: '#3b4250', fontFamily: 'monospace' }}>{r.id}</span>
                        </div>
                        <button onClick={() => patch(r.id, { active: false })} title="sacar de la orquestación" style={{ background: 'none', border: 0, color: '#5b6473', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                    {selected.length === 0 && <div style={{ fontSize: 12, color: '#6b7280' }}>Sin reglas activas — sumá una de los presets →</div>}
                  </div>
                  {/* presets al costado (las otras del catálogo) */}
                  {isOpen && (
                    <div style={{ marginTop: 8, borderTop: '1px dashed #232936', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ fontSize: 10, color: '#6b7686', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Presets disponibles (otras opciones)</div>
                      {others.map((r) => (
                        <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 9px', borderRadius: 8, background: '#0b0e14', border: '1px solid #1c2230' }}>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#9aa3af' }}>{r.regla} <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#3b4250' }}>{r.aplica_a}</span></div>
                          <button onClick={() => patch(r.id, { active: true })} style={{ background: 'rgba(34,197,94,0.14)', border: 0, color: '#22c55e', borderRadius: 6, fontSize: 11, padding: '3px 9px', cursor: 'pointer', flexShrink: 0 }}>usar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* DERECHA: prompt armado */}
          {(!isMobile || tab === 'prompt') && (
            <div style={{ position: isMobile ? 'static' : 'sticky', top: 14, background: '#11151d', border: '1px solid #232936', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', fontWeight: 700 }}>Prompt · {res?.banda} · {res?.nivel}</div>
                <a href="/lab/llm" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#22c55e', textDecoration: 'none' }}>Probar ↗</a>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 10.5, lineHeight: 1.5, color: '#cbd5e1', maxHeight: '76vh', overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>{res?.prompt || '(resolviendo…)'}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

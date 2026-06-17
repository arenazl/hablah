/* MotorPlaygroundPanel — /admin/motor
 *
 * Viewer/editor de la orquestación JIT. Elegís banda + nivel + tópico (+ alumno opcional)
 * y se arma el <system_instruction_stack> EN EL MOMENTO (no se persiste, es JIT) con los 2
 * motores reales (Motor-Learning/motor_prompt.py). Podés jugar con los guards en memoria
 * (sacar uno de la banda / agregar uno propio) y el prompt se rearma en vivo, sin tocar la DB.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motorAPI, MotorResolve, MotorOverride } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Band { band_id: number; code: string; label: string }
interface Level { level_code: string; label: string; sort_order: number }
interface Topic { topic_id: number; subcategory_id: number; title: string }
interface Sub { subcategory_id: number; category_id: number; name: string; topics: Topic[] }
interface Cat { category_id: number; name: string; subcategories: Sub[] }
interface Student { student_id: number; name: string; age: number; level_code: string }

const C = {
  bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1c2230',
  fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686', accent: '#38bdf8', green: '#22c55e', red: '#f87171',
}
const sel: React.CSSProperties = {
  padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`,
  background: C.bg, color: C.fg, fontSize: 13, minWidth: 0,
}
const Ico = ({ d }: { d: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

export default function MotorPlaygroundPanel() {
  const isMobile = useIsMobile()
  const [bands, setBands] = useState<Band[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [catalog, setCatalog] = useState<Cat[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const [band, setBand] = useState('adult')
  const [level, setLevel] = useState('B2')
  const [catId, setCatId] = useState<number | undefined>()
  const [subId, setSubId] = useState<number | undefined>()
  const [topicId, setTopicId] = useState<number | undefined>(7)
  const [studentId, setStudentId] = useState<number | undefined>()

  const [disabled, setDisabled] = useState<Set<number>>(new Set())
  const [added, setAdded] = useState<string[]>([])
  const [newGuard, setNewGuard] = useState('')

  const [res, setRes] = useState<MotorResolve | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'prompt' | 'guards'>('prompt')

  useEffect(() => {
    motorAPI.dimensions().then((d) => {
      setBands(d.bands); setLevels(d.levels); setCatalog(d.catalog); setStudents(d.students)
    }).catch(() => {})
  }, [])

  const overrides = useMemo<MotorOverride[]>(() => [
    ...Array.from(disabled).map((id) => ({ slot: 'behavioral_guard', action: 'disable' as const, target_id: id })),
    ...added.map((b) => ({ slot: 'behavioral_guard', action: 'add' as const, body: b })),
  ], [disabled, added])

  const resolve = useCallback(() => {
    setLoading(true); setErr(null)
    motorAPI.resolve({
      band_code: band, level_code: level, topic_id: topicId ?? null,
      student_id: studentId ?? null, test_overrides: overrides.length ? overrides : undefined,
    }).then(setRes).catch((e) => { setErr(e?.response?.data?.detail || 'Error'); setRes(null) })
      .finally(() => setLoading(false))
  }, [band, level, topicId, studentId, overrides])

  useEffect(() => { resolve() }, [resolve])
  // al cambiar banda/nivel/tópico, los overrides de guards previos dejan de aplicar
  useEffect(() => { setDisabled(new Set()); setAdded([]) }, [band, level, topicId])

  const subs = useMemo(() => catalog.find((c) => c.category_id === catId)?.subcategories || [], [catalog, catId])
  const topics = useMemo(() => {
    if (subId) return subs.find((s) => s.subcategory_id === subId)?.topics || []
    return subs.flatMap((s) => s.topics)
  }, [subs, subId])

  const meta = res?.meta
  const toggleGuard = (id: number) => setDisabled((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '18px 16px 64px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>Playground · Orquestación JIT</h1>
        <p style={{ color: C.dim, fontSize: 12.5, margin: '0 0 14px' }}>
          Elegí banda + nivel + tópico y el prompt se arma en el momento (no se persiste). Jugá con los guards en memoria y mirá cómo cambia.
        </p>

        {/* selectores */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 14, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: 8 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>
            Banda
            <select style={sel} value={band} onChange={(e) => setBand(e.target.value)}>
              {bands.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>
            Nivel
            <select style={sel} value={level} onChange={(e) => setLevel(e.target.value)}>
              {levels.map((l) => <option key={l.level_code} value={l.level_code}>{l.level_code}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>
            Categoría
            <select style={sel} value={catId ?? ''} onChange={(e) => { setCatId(e.target.value ? Number(e.target.value) : undefined); setSubId(undefined) }}>
              <option value="">—</option>
              {catalog.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>
            Subcategoría
            <select style={sel} value={subId ?? ''} disabled={!catId} onChange={(e) => setSubId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">—</option>
              {subs.map((s) => <option key={s.subcategory_id} value={s.subcategory_id}>{s.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>
            Tópico
            <select style={sel} value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">— (sin tópico)</option>
              {topics.map((t) => <option key={t.topic_id} value={t.topic_id}>{t.title}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase' }}>
            Alumno (opc.)
            <select style={sel} value={studentId ?? ''} onChange={(e) => setStudentId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">— (vista neutra)</option>
              {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name} ({s.age}·{s.level_code})</option>)}
            </select>
          </label>
        </div>

        {/* meta strip */}
        {meta && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <Chip label="Tutor" value={meta.tutor_name || '—'} />
            <Chip label="Pacing" value={`${meta.pacing_min} min`} />
            <Chip label="Orquestación" value={meta.orchestration_name || '(ninguna → defaults)'} />
            <Chip label="Léxico" value={`${meta.words.length}w · ${meta.phrases.length}f`} />
            <Chip label="Objetivos hoy" value={String(meta.objectives.length)} />
          </div>
        )}

        {isMobile && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {(['prompt', 'guards'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: tab === t ? C.soft : C.panel, color: tab === t ? C.accent : C.dim, fontWeight: 700, fontSize: 12.5 }}>
                {t === 'prompt' ? 'Prompt' : 'Guards'}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
          {/* PROMPT */}
          {(!isMobile || tab === 'prompt') && (
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1, color: C.dim, fontWeight: 700 }}>
                  &lt;system_instruction_stack&gt; {loading && '· armando…'}
                </div>
                {res && <button onClick={() => navigator.clipboard?.writeText(res.prompt)} style={{ background: 'none', border: `1px solid ${C.soft}`, color: C.accent, borderRadius: 7, fontSize: 11, padding: '3px 9px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Ico d="M9 9h11v11H9zM5 15V4h11" /> copiar</button>}
              </div>
              {err && <div style={{ color: C.red, fontSize: 12.5, padding: 10 }}>{err}</div>}
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: '#cbd5e1', maxHeight: '74vh', overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>
                {res?.prompt || (loading ? '…' : '(elegí banda y nivel)')}
              </pre>
            </div>
          )}

          {/* GUARDS playground */}
          {(!isMobile || tab === 'guards') && (
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>Guards de la banda</div>
              <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 10 }}>
                Sacá uno (override <code style={{ color: C.red }}>disable</code>) o agregá uno propio (<code style={{ color: C.green }}>add</code>). En memoria, sin persistir.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(res?.guards_pool || []).map((g) => {
                  const off = disabled.has(g.guard_id)
                  return (
                    <div key={g.guard_id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 9px', borderRadius: 8, background: off ? 'rgba(248,113,113,0.08)' : C.bg, border: `1px solid ${off ? 'rgba(248,113,113,0.3)' : C.soft}` }}>
                      <span style={{ flex: 1, fontSize: 12.5, color: off ? C.faint : C.fg, textDecoration: off ? 'line-through' : 'none' }}>{g.body}</span>
                      <button onClick={() => toggleGuard(g.guard_id)} title={off ? 'reactivar' : 'sacar'} style={{ background: 'none', border: 0, color: off ? C.green : C.faint, cursor: 'pointer', display: 'flex' }}>
                        <Ico d={off ? 'M20 6L9 17l-5-5' : 'M18 6L6 18M6 6l12 12'} />
                      </button>
                    </div>
                  )
                })}
              </div>

              {added.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {added.map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
                      <span style={{ flex: 1, fontSize: 12.5, color: C.fg }}>{b}</span>
                      <button onClick={() => setAdded((p) => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 0, color: C.faint, cursor: 'pointer', display: 'flex' }}><Ico d="M18 6L6 18M6 6l12 12" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <input value={newGuard} onChange={(e) => setNewGuard(e.target.value)} placeholder="Agregar un guard propio…"
                  onKeyDown={(e) => { if (e.key === 'Enter' && newGuard.trim()) { setAdded((p) => [...p, newGuard.trim()]); setNewGuard('') } }}
                  style={{ ...sel, flex: 1 }} />
                <button disabled={!newGuard.trim()} onClick={() => { setAdded((p) => [...p, newGuard.trim()]); setNewGuard('') }}
                  style={{ background: C.green, border: 0, color: '#06281a', borderRadius: 8, fontSize: 12.5, fontWeight: 700, padding: '0 12px', cursor: 'pointer', opacity: newGuard.trim() ? 1 : 0.4 }}>+</button>
              </div>

              {/* objetivos del día */}
              {meta && meta.objectives.length > 0 && (
                <div style={{ marginTop: 14, borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 11, color: C.faint, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Qué aprende hoy (currículum − dominado)</div>
                  {meta.objectives.map((o, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.fg, padding: '3px 0', display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 9, color: o.estado === 'due' ? C.green : C.faint, fontWeight: 700, textTransform: 'uppercase', minWidth: 38 }}>{o.estado}</span>
                      <span style={{ color: C.dim, minWidth: 70 }}>{o.kind}</span>
                      <span>{o.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 9, padding: '6px 11px' }}>
      <div style={{ fontSize: 9.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.fg, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

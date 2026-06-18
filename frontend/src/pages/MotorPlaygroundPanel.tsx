/* MotorPlaygroundPanel — /admin/motor · PROBADOR DE ORQUESTACIÓN (tuberías del motor).
 *
 * Metés un CONTEXTO de prueba (edad × nivel × tópico [× alumno]) y el motor arma el
 * <system_instruction_stack> JIT (no se persiste). El template por edad×nivel ya viene
 * resuelto. Verificás que las 9 capas caigan bien: clickeás una capa y a la derecha
 * aparecen DINÁMICAMENTE los presets de ESE paso. En la capa de reglas ajustás en vivo
 * (JIT). ▶ probás la clase real. Orquestación agnóstica del alumno: esto prueba tuberías.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motorAPI, MotorResolve, MotorOverride } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Band { band_id: number; code: string; label: string; phase_group?: string }
interface Level { level_code: string; label: string; sort_order: number }
interface Topic { topic_id: number; subcategory_id: number; title: string }
interface Sub { subcategory_id: number; category_id: number; name: string; topics: Topic[] }
interface Cat { category_id: number; name: string; subcategories: Sub[] }
interface Student { student_id: number; name: string; age: number; level_code: string }

const C = {
  bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1c2230',
  fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686', accent: '#38bdf8', green: '#22c55e', red: '#f87171',
}
const NAT = { fijo: '#9aa3af', edad: '#fbbf24', nivel: '#7dd3fc', dinamico: '#818cf8' }
const sel: React.CSSProperties = { width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.fg, fontSize: 13, minWidth: 0 }
const Ico = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

const LAYER: Record<string, { n: number; label: string; nat: keyof typeof NAT; dep: string }> = {
  runtime_context: { n: 1, label: 'Contexto', nat: 'fijo', dep: 'sistema' },
  tutor_identity: { n: 2, label: 'Quién enseña', nat: 'edad', dep: 'por edad' },
  pedagogical_framework: { n: 3, label: 'Cómo enseña', nat: 'edad', dep: 'por edad' },
  lesson_focus_engagement: { n: 4, label: 'La dinámica', nat: 'dinamico', dep: 'tópico + actividad' },
  student_profile: { n: 5, label: 'El alumno', nat: 'dinamico', dep: 'los 3 inputs' },
  learner_state: { n: 5, label: 'Memoria del alumno', nat: 'dinamico', dep: 'post-clase' },
  behavioral_guards: { n: 6, label: 'Las reglas (rieles)', nat: 'edad', dep: 'edad × nivel' },
  current_topic_vocabulary: { n: 7, label: 'Vocabulario del tema', nat: 'dinamico', dep: 'tópico (dormido)' },
  lesson_objectives: { n: 7, label: 'Qué aprende + chunks', nat: 'nivel', dep: 'currículum − dominado' },
  narrative_spine: { n: 8, label: 'Fases + pacing', nat: 'edad', dep: 'edad × nivel' },
  execution_trigger: { n: 9, label: 'Arranque / cierre', nat: 'dinamico', dep: 'plantilla + datos' },
  interaction_state: { n: 9, label: 'Estado de sesión', nat: 'dinamico', dep: 'runtime' },
}

function parseLayers(prompt: string): { tag: string; body: string }[] {
  // saco el wrapper para que el regex capture los bloques INTERNOS (no el externo)
  const inner = prompt.replace(/<\/?system_instruction_stack>/g, '')
  const out: { tag: string; body: string }[] = []
  const re = /<([a-z_]+)>([\s\S]*?)<\/\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(inner))) out.push({ tag: m[1], body: m[2].trim() })
  return out
}

export default function MotorPlaygroundPanel() {
  const isMobile = useIsMobile()
  const [bands, setBands] = useState<Band[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [catalog, setCatalog] = useState<Cat[]>([])
  const [students, setStudents] = useState<Student[]>([])
  // catálogo de presets (para el panel contextual por paso)
  const [cat, setCat] = useState<Record<string, any[]>>({})

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
  const [showXml, setShowXml] = useState(false)
  const [activeLayer, setActiveLayer] = useState('behavioral_guards')

  useEffect(() => {
    motorAPI.dimensions().then((d) => {
      setBands(d.bands); setLevels(d.levels); setCatalog(d.catalog); setStudents(d.students)
    }).catch(() => {})
    const tbls = ['tutor_identity', 'pedagogy', 'activity_type', 'reward', 'behavioral_guard',
      'band_policy', 'level_policy', 'language_objective', 'phase', 'trigger_template', 'app_config', 'universal_policy']
    Promise.all(tbls.map((t) => motorAPI.rows(t).then((rs) => [t, rs] as const).catch(() => [t, []] as const)))
      .then((pairs) => setCat(Object.fromEntries(pairs)))
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
  useEffect(() => { setDisabled(new Set()); setAdded([]) }, [band, level, topicId])

  const subs = useMemo(() => catalog.find((c) => c.category_id === catId)?.subcategories || [], [catalog, catId])
  const topics = useMemo(() => subId ? (subs.find((s) => s.subcategory_id === subId)?.topics || []) : subs.flatMap((s) => s.topics), [subs, subId])
  const bandObj = useMemo(() => bands.find((b) => b.code === band), [bands, band])
  const bandId = bandObj?.band_id
  const phaseGroup = band === 'early_child' || band === 'child' ? 'kid' : 'adult'
  const trigGroup = band === 'early_child' || band === 'child' ? 'kid' : band

  const meta = res?.meta
  const layers = useMemo(() => (res ? parseLayers(res.prompt) : []), [res])
  const toggleGuard = (id: number) => setDisabled((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  // ▶ Probar: abre la prueba de voz con TU circuito (no el genérico de /llm).
  const probarUrl = useMemo(() => {
    const topTitle = topics.find((t) => t.topic_id === topicId)?.title || ''
    const q = new URLSearchParams({ band, level, voice: 'Aoede' })
    if (topicId) q.set('topic', String(topicId))
    if (topTitle) q.set('t', topTitle)
    if (overrides.length) q.set('overrides', JSON.stringify(overrides))
    return `/probar-orq?${q.toString()}`
  }, [band, level, topicId, topics, overrides])

  // presets del catálogo para el paso activo (dinámico por paso)
  const presetsForLayer = (tag: string): { items: { text: string; tag?: string }[]; note?: string } => {
    const byBand = (t: string) => (cat[t] || []).filter((r) => r.band_id === bandId)
    switch (tag) {
      case 'tutor_identity': return { items: byBand('tutor_identity').map((r) => ({ text: `${r.name} — ${r.persona}`, tag: r.tone })) }
      case 'pedagogical_framework': return { items: [...byBand('pedagogy').map((r) => ({ text: r.methodology })), ...byBand('band_policy').map((r) => ({ text: r.body, tag: r.kind }))] }
      case 'lesson_focus_engagement': return { items: [...byBand('activity_type').map((r) => ({ text: r.description, tag: 'actividad' })), ...byBand('reward').map((r) => ({ text: r.description, tag: 'recompensa' }))] }
      case 'lesson_objectives': return { items: (cat['language_objective'] || []).filter((r) => r.cefr_level === level).map((r) => ({ text: r.description, tag: r.kind })), note: 'currículum del nivel (el motor toma los no-dominados)' }
      case 'narrative_spine': return { items: (cat['phase'] || []).filter((r) => r.band_group === phaseGroup).map((r) => ({ text: r.name })) }
      case 'execution_trigger': return { items: (cat['trigger_template'] || []).filter((r) => r.band_group === trigGroup).map((r) => ({ text: r.body, tag: r.kind })) }
      case 'runtime_context': return { items: (cat['app_config'] || []).map((r) => ({ text: r.config_value, tag: r.config_key })) }
      default: return { items: [], note: 'capa dinámica: sale del alumno / tópico en runtime, no hay presets que ajustar acá.' }
    }
  }

  const isGuards = activeLayer === 'behavioral_guards'
  const layerMeta = LAYER[activeLayer] || { label: activeLayer, nat: 'fijo' as const, dep: '', n: 0 }
  const presets = presetsForLayer(activeLayer)

  // panel de presets de la capa activa — desktop: columna derecha; mobile: acordeón bajo la capa
  const presetsBox = () => (
    <div style={{ background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: NAT[layerMeta.nat] }} />
        <div style={{ fontSize: 13, fontWeight: 800 }}>Presets · {layerMeta.label}</div>
      </div>
      <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 10 }}>{layerMeta.dep}{isGuards ? ' · ajustá en vivo (JIT)' : ''}</div>
      {isGuards ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(res?.guards_pool || []).map((g) => {
              const off = disabled.has(g.guard_id)
              return (
                <div key={g.guard_id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 9px', borderRadius: 8, background: off ? 'rgba(248,113,113,0.08)' : C.bg, border: `1px solid ${off ? 'rgba(248,113,113,0.3)' : C.soft}` }}>
                  <span style={{ flex: 1, fontSize: 12.5, color: off ? C.faint : C.fg, textDecoration: off ? 'line-through' : 'none' }}>{g.body}</span>
                  <button onClick={() => toggleGuard(g.guard_id)} title={off ? 'reactivar' : 'sacar'} style={{ background: 'none', border: 0, color: off ? C.green : C.faint, cursor: 'pointer', display: 'flex' }}><Ico d={off ? 'M20 6L9 17l-5-5' : 'M18 6L6 18M6 6l12 12'} /></button>
                </div>
              )
            })}
            {added.map((b, i) => (
              <div key={`a${i}`} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <span style={{ flex: 1, fontSize: 12.5, color: C.fg }}>{b}</span>
                <button onClick={() => setAdded((p) => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 0, color: C.faint, cursor: 'pointer', display: 'flex' }}><Ico d="M18 6L6 18M6 6l12 12" /></button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input value={newGuard} onChange={(e) => setNewGuard(e.target.value)} placeholder="Sumar un guard de prueba…" onKeyDown={(e) => { if (e.key === 'Enter' && newGuard.trim()) { setAdded((p) => [...p, newGuard.trim()]); setNewGuard('') } }} style={{ ...sel, flex: 1 }} />
            <button disabled={!newGuard.trim()} onClick={() => { setAdded((p) => [...p, newGuard.trim()]); setNewGuard('') }} style={{ background: C.green, border: 0, color: '#06281a', borderRadius: 8, fontSize: 14, fontWeight: 700, padding: '0 12px', cursor: 'pointer', opacity: newGuard.trim() ? 1 : 0.4 }}>+</button>
          </div>
        </>
      ) : (
        <>
          {presets.note && <div style={{ fontSize: 11.5, color: C.faint, marginBottom: 8, lineHeight: 1.4 }}>{presets.note}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {presets.items.map((p, i) => (
              <div key={i} style={{ padding: '7px 9px', borderRadius: 8, background: C.bg, border: `1px solid ${C.soft}` }}>
                <div style={{ fontSize: 12.5, color: C.fg, lineHeight: 1.4 }}>{p.text}</div>
                {p.tag && <span style={{ fontSize: 9.5, color: C.faint, fontFamily: 'monospace' }}>{p.tag}</span>}
              </div>
            ))}
            {!presets.items.length && !presets.note && <div style={{ fontSize: 12, color: C.faint }}>Sin presets para este paso.</div>}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '18px 16px 64px' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>Probador de orquestación</h1>
          <p style={{ color: C.dim, fontSize: 12.5, margin: '0 0 14px', maxWidth: 720 }}>
            Contexto de prueba (edad × nivel × tópico) → el template ya viene armado. Clickeá una capa y abajo aparecen sus presets. Ajustás JIT y, cuando revisaste todo, probás la clase (abajo de todo). No se persiste.
          </p>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: 8, alignItems: 'start' }}>
          <Ctx label="Edad"><select style={sel} value={band} onChange={(e) => setBand(e.target.value)}>{bands.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}</select></Ctx>
          <Ctx label="Nivel"><select style={sel} value={level} onChange={(e) => setLevel(e.target.value)}>{levels.map((l) => <option key={l.level_code} value={l.level_code}>{l.level_code}</option>)}</select></Ctx>
          <Ctx label="Categoría"><select style={sel} value={catId ?? ''} onChange={(e) => { setCatId(e.target.value ? Number(e.target.value) : undefined); setSubId(undefined) }}><option value="">—</option>{catalog.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select></Ctx>
          <Ctx label="Subcategoría"><select style={sel} value={subId ?? ''} disabled={!catId} onChange={(e) => setSubId(e.target.value ? Number(e.target.value) : undefined)}><option value="">—</option>{subs.map((s) => <option key={s.subcategory_id} value={s.subcategory_id}>{s.name}</option>)}</select></Ctx>
          <Ctx label="Tópico"><select style={sel} value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : undefined)}><option value="">— (sin tópico)</option>{topics.map((t) => <option key={t.topic_id} value={t.topic_id}>{t.title}</option>)}</select></Ctx>
          <Ctx label="Alumno (opc.)"><select style={sel} value={studentId ?? ''} onChange={(e) => setStudentId(e.target.value ? Number(e.target.value) : undefined)}><option value="">— (neutra)</option>{students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name} ({s.age}·{s.level_code})</option>)}</select></Ctx>
        </div>

        {meta && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <Chip label="Tutor" value={meta.tutor_name || '—'} />
            <Chip label="Pacing" value={`${meta.pacing_min} min`} />
            <Chip label="Objetivos" value={String(meta.objectives.length)} />
            <Chip label="Léxico" value={meta.words.length + meta.phrases.length ? `${meta.words.length}w·${meta.phrases.length}f` : 'en vivo'} />
            <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 10.5, color: C.faint }}>
              {Object.entries({ fijo: 'fijo', edad: 'edad', nivel: 'nivel', dinamico: 'dinámico' }).map(([k, l]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: NAT[k as keyof typeof NAT] }} /> {l}</span>
              ))}
            </div>
          </div>
        )}
        {err && <div style={{ color: C.red, fontSize: 13, padding: 10 }}>{err}</div>}

        {/* ── 9 capas · al tocar una, sus presets se despliegan DEBAJO (acordeón); no hay columna que reserve espacio ── */}
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.dim, fontWeight: 700 }}>Las 9 capas {loading && '· armando…'} · tocá una</div>
              <button onClick={() => setShowXml((v) => !v)} style={{ background: 'none', border: `1px solid ${C.soft}`, color: C.accent, borderRadius: 7, fontSize: 11, padding: '3px 9px', cursor: 'pointer' }}>{showXml ? 'ver capas' : 'ver XML'}</button>
            </div>
            {showXml ? (
              <pre style={{ margin: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: '#cbd5e1', maxHeight: '74vh', overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>{res?.prompt || '(elegí contexto)'}</pre>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {layers.map(({ tag, body }, i) => {
                  const lm = LAYER[tag] || { n: 0, label: tag, nat: 'fijo' as const, dep: '' }
                  const col = NAT[lm.nat]; const on = tag === activeLayer
                  return (
                    <div key={i}>
                      <button onClick={() => setActiveLayer(on ? '' : tag)} style={{ width: '100%', textAlign: 'left', background: on ? 'rgba(56,189,248,0.06)' : C.panel, border: `1px solid ${on ? C.accent : C.border}`, borderLeft: `3px solid ${col}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', color: C.fg }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: col, minWidth: 16 }}>{lm.n || '·'}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{lm.label}</span>
                          {on && <span style={{ marginLeft: 'auto', fontSize: 16, color: C.accent, lineHeight: 1 }}>−</span>}
                          {!on && <span style={{ marginLeft: 'auto', fontSize: 9.5, color: col, fontWeight: 700 }}>{lm.dep}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 130, overflowY: 'auto' }}>{body}</div>
                      </button>
                      {on && <div style={{ marginTop: 8 }}>{presetsBox()}</div>}
                    </div>
                  )
                })}
                {!layers.length && !loading && <div style={{ color: C.faint, fontSize: 13, padding: 12 }}>Elegí edad y nivel para ver el ensamblado.</div>}
              </div>
            )}
          </div>

          {/* desktop: columna derecha sticky; en mobile los presets van inline (acordeón) */}
          {!isMobile && <div style={{ position: 'sticky', top: 14 }}>{presetsBox()}</div>}
        </div>

        {/* ▶ Probar: AL FINAL — lo último, una vez revisada toda la orquestación */}
        <a href={probarUrl} target="_blank" rel="noreferrer"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20,
            background: C.green, color: '#06281a', borderRadius: 12, fontSize: 16, fontWeight: 800, padding: '15px 0', textDecoration: 'none' }}>
          <Ico d="M5 3l14 9-14 9V3z" size={17} /> Probar la clase
        </a>
      </div>
    </div>
  )
}

function Ctx({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase', minWidth: 0 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {children}
    </label>
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

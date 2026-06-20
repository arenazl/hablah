/* MotorPlaygroundPanel — /motor · PROBADOR + EDITOR del circuito (tuberías del motor).
 *
 * Elegís un CONTEXTO de prueba (edad × nivel × tópico [× alumno-perfil]) y el motor arma
 * las 9 capas JIT. Tocás una capa → se despliega su panel (acordeón). En las capas que son
 * PRESET [P] (atadas a edad/nivel) agregás/sacás presets en vivo; las estructurales [E] y
 * dinámicas [D] van read-only. ▶ probás la clase con TU circuito · Grabar settings persiste
 * el circuito de ese edad×nivel (orchestration_override, tópico NULL). Público, sin login.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { motorAPI, MotorResolve, MotorOverride } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Band { band_id: number; code: string; label: string; phase_group?: string }
interface Level { level_code: string; label: string; sort_order: number }
interface Topic { topic_id: number; subcategory_id: number; title: string }
interface Sub { subcategory_id: number; category_id: number; name: string; topics: Topic[] }
interface Cat { category_id: number; name: string; subcategories: Sub[] }
interface Student { student_id: number; name: string; age: number; level_code: string }
interface PItem { id?: number; text: string; tag?: string }
interface PGroup { label: string; slot?: string; editable: boolean; items: PItem[] }

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
  runtime_context: { n: 1, label: 'Contexto', nat: 'fijo', dep: 'global' },
  tutor_identity: { n: 2, label: 'Quién enseña', nat: 'edad', dep: 'por edad' },
  pedagogical_framework: { n: 3, label: 'Cómo enseña', nat: 'edad', dep: 'por edad' },
  lesson_focus_engagement: { n: 4, label: 'La dinámica', nat: 'dinamico', dep: 'tópico + actividad' },
  student_profile: { n: 5, label: 'El alumno', nat: 'dinamico', dep: 'perfil' },
  learner_state: { n: 5, label: 'Memoria del alumno', nat: 'dinamico', dep: 'historial' },
  behavioral_guards: { n: 6, label: 'Las reglas (rieles)', nat: 'edad', dep: 'edad × nivel' },
  current_topic_vocabulary: { n: 7, label: 'Vocabulario', nat: 'dinamico', dep: 'tópico' },
  lesson_objectives: { n: 7, label: 'Qué aprende + chunks', nat: 'nivel', dep: 'currículum del nivel' },
  narrative_spine: { n: 8, label: 'Fases + pacing', nat: 'edad', dep: 'edad × nivel' },
  execution_trigger: { n: 9, label: 'Arranque / cierre', nat: 'dinamico', dep: 'edad × nivel' },
  interaction_state: { n: 9, label: 'Estado de sesión', nat: 'dinamico', dep: 'runtime' },
}

function parseLayers(prompt: string): { tag: string; body: string }[] {
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
  const [cat, setCat] = useState<Record<string, any[]>>({})

  const [band, setBand] = useState('adult')
  const [level, setLevel] = useState('B2')
  const [catId, setCatId] = useState<number | undefined>()
  const [subId, setSubId] = useState<number | undefined>()
  const [topicId, setTopicId] = useState<number | undefined>(7)
  const [studentId, setStudentId] = useState<number | undefined>()

  // overrides generalizados por slot: disabled = Set("slot:id"), added = [{slot, body}]
  const [disabled, setDisabled] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState<{ slot: string; body: string }[]>([])

  const [res, setRes] = useState<MotorResolve | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showXml, setShowXml] = useState(false)
  const [activeLayer, setActiveLayer] = useState('behavioral_guards')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    motorAPI.dimensions().then((d) => {
      setBands(d.bands); setLevels(d.levels); setCatalog(d.catalog); setStudents(d.students)
    }).catch(() => {})
    const tbls = ['tutor_identity', 'pedagogy', 'activity_type', 'reward', 'behavioral_guard',
      'band_policy', 'level_policy', 'language_objective', 'phase', 'trigger_template', 'app_config', 'universal_policy']
    Promise.all(tbls.map((t) => motorAPI.rows(t).then((rs) => [t, rs] as const).catch(() => [t, []] as const)))
      .then((pairs) => setCat(Object.fromEntries(pairs)))
  }, [])

  // al cambiar edad×nivel, cargo el circuito GRABADO de ese nivel (pre-llena los overrides)
  useEffect(() => {
    motorAPI.loadCircuit(band, level).then((r) => {
      const dis = new Set<string>(); const add: { slot: string; body: string }[] = []
      for (const o of (r.overrides || [])) {
        if (o.action === 'disable' && o.target_id != null) dis.add(`${o.slot}:${o.target_id}`)
        else if (o.action === 'add' && o.body) add.push({ slot: o.slot, body: o.body })
      }
      setDisabled(dis); setAdded(add)
    }).catch(() => { setDisabled(new Set()); setAdded([]) })
  }, [band, level])

  const overrides = useMemo<MotorOverride[]>(() => [
    ...[...disabled].map((k) => { const i = k.indexOf(':'); return { slot: k.slice(0, i), action: 'disable' as const, target_id: Number(k.slice(i + 1)) } }),
    ...added.map((a) => ({ slot: a.slot, action: 'add' as const, body: a.body })),
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

  const subs = useMemo(() => catalog.find((c) => c.category_id === catId)?.subcategories || [], [catalog, catId])
  const topics = useMemo(() => subId ? (subs.find((s) => s.subcategory_id === subId)?.topics || []) : subs.flatMap((s) => s.topics), [subs, subId])
  const bandId = useMemo(() => bands.find((b) => b.code === band)?.band_id, [bands, band])
  const phaseGroup = band === 'early_child' || band === 'child' ? 'kid' : 'adult'
  const trigGroup = band === 'early_child' || band === 'child' ? 'kid' : band

  const meta = res?.meta
  const layers = useMemo(() => (res ? parseLayers(res.prompt) : []), [res])
  const probarUrl = useMemo(() => {
    const tt = topics.find((t) => t.topic_id === topicId)?.title || ''
    const q = new URLSearchParams({ band, level, voice: 'Aoede' })
    if (topicId) q.set('topic', String(topicId))
    if (tt) q.set('t', tt)
    if (overrides.length) q.set('overrides', JSON.stringify(overrides))
    return `/probar-orq?${q.toString()}`
  }, [band, level, topicId, topics, overrides])

  const toggleDisable = (slot: string, id?: number) => {
    if (id == null) return
    setDisabled((p) => { const n = new Set(p); const k = `${slot}:${id}`; n.has(k) ? n.delete(k) : n.add(k); return n })
  }
  const addPreset = (slot: string, body: string) => { if (body.trim()) setAdded((p) => [...p, { slot, body: body.trim() }]) }
  const removeAdded = (idx: number) => setAdded((p) => p.filter((_, j) => j !== idx))

  const saveCircuit = async () => {
    setSaving(true)
    try { await motorAPI.saveCircuit({ band_code: band, level_code: level, overrides }); toast.success(`Circuito grabado · ${band} × ${level}`) }
    catch { toast.error('No se pudo grabar el circuito') } finally { setSaving(false) }
  }

  // grupos de presets de cada capa (con su slot editable o read-only)
  const groupsForLayer = (tag: string): { groups: PGroup[]; note?: string } => {
    const byBand = (t: string) => (cat[t] || []).filter((r) => r.band_id === bandId)
    const byLevel = (t: string, col = 'level_code') => (cat[t] || []).filter((r) => r[col] === level)
    switch (tag) {
      case 'behavioral_guards':
        return { groups: [
          { label: 'Por la edad', slot: 'behavioral_guard', editable: true, items: byBand('behavioral_guard').map((g) => ({ id: g.guard_id, text: g.body })) },
          { label: 'Por el nivel', slot: 'level_policy', editable: true, items: byLevel('level_policy').map((p) => ({ id: p.policy_id, text: p.body, tag: p.kind })) },
          { label: 'Universales (seguridad)', editable: false, items: (cat['universal_policy'] || []).map((u) => ({ text: u.body, tag: u.kind })) },
        ] }
      case 'pedagogical_framework':
        return { groups: [
          { label: 'Metodología', editable: false, items: byBand('pedagogy').map((p) => ({ text: p.methodology })) },
          { label: 'Políticas de banda', slot: 'band_policy', editable: true, items: byBand('band_policy').map((p) => ({ id: p.policy_id, text: p.body, tag: p.kind })) },
        ] }
      case 'lesson_objectives':
        return { groups: [{ label: 'Objetivos del nivel', slot: 'objective', editable: true, items: byLevel('language_objective', 'cefr_level').map((o) => ({ id: o.objective_id, text: o.description, tag: o.kind })) }],
          note: 'El motor toma los no-dominados, priorizando los "a repasar".' }
      case 'tutor_identity':
        return { groups: [{ label: 'Tutor de la edad', editable: false, items: byBand('tutor_identity').map((t) => ({ text: `${t.name} — ${t.persona}`, tag: t.tone })) }] }
      case 'lesson_focus_engagement':
        return { groups: [
          { label: 'Actividad', editable: false, items: byBand('activity_type').map((a) => ({ text: a.description })) },
          { label: 'Recompensa', editable: false, items: byBand('reward').map((r) => ({ text: r.description })) },
        ] }
      case 'narrative_spine':
        return { groups: [{ label: 'Fases', editable: false, items: (cat['phase'] || []).filter((p) => p.band_group === phaseGroup).map((p) => ({ text: p.name })) }] }
      case 'execution_trigger':
        return { groups: [{ label: 'Arranque / cierre', editable: false, items: (cat['trigger_template'] || []).filter((t) => t.band_group === trigGroup && (t.level_code == null || t.level_code === level)).map((t) => ({ text: t.body, tag: t.level_code ? `${t.kind}·${t.level_code}` : t.kind })) }] }
      case 'runtime_context':
        return { groups: [{ label: 'Config global', editable: false, items: (cat['app_config'] || []).map((r) => ({ text: r.config_value, tag: r.config_key })) }] }
      default:
        return { groups: [], note: 'Capa dinámica: sale del alumno / tópico en runtime. No hay presets que ajustar acá.' }
    }
  }

  const layerMeta = LAYER[activeLayer] || { label: activeLayer, nat: 'fijo' as const, dep: '', n: 0 }

  const presetsBox = () => {
    const { groups, note } = groupsForLayer(activeLayer)
    return (
      <div style={{ background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: NAT[layerMeta.nat] }} />
          <div style={{ fontSize: 13, fontWeight: 800 }}>{layerMeta.label}</div>
        </div>
        <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 10 }}>{layerMeta.dep}</div>
        {note && <div style={{ fontSize: 11.5, color: C.faint, marginBottom: 8, lineHeight: 1.4 }}>{note}</div>}
        {groups.map((g, gi) => {
          const addedHere = added.map((a, idx) => ({ ...a, idx })).filter((a) => a.slot === g.slot)
          return (
            <div key={gi} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: g.editable ? C.fg : C.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {g.label}{!g.editable && <span style={{ color: C.faint }}><Ico d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" size={11} /></span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.items.map((it, i) => {
                  const off = g.slot && it.id != null && disabled.has(`${g.slot}:${it.id}`)
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 9px', borderRadius: 8, background: off ? 'rgba(248,113,113,0.08)' : C.bg, border: `1px solid ${off ? 'rgba(248,113,113,0.3)' : C.soft}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: off ? C.faint : C.fg, textDecoration: off ? 'line-through' : 'none', lineHeight: 1.4 }}>{it.text}</div>
                        {it.tag && <span style={{ fontSize: 9.5, color: C.faint, fontFamily: 'monospace' }}>{it.tag}</span>}
                      </div>
                      {g.editable && g.slot && it.id != null && (
                        <button onClick={() => toggleDisable(g.slot!, it.id)} title={off ? 'reactivar' : 'sacar'} style={{ background: 'none', border: 0, color: off ? C.green : C.faint, cursor: 'pointer', display: 'flex', flexShrink: 0 }}><Ico d={off ? 'M20 6L9 17l-5-5' : 'M18 6L6 18M6 6l12 12'} /></button>
                      )}
                    </div>
                  )
                })}
                {addedHere.map((a) => (
                  <div key={`add${a.idx}`} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 9px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <span style={{ flex: 1, fontSize: 12.5, color: C.fg }}>{a.body}</span>
                    <button onClick={() => removeAdded(a.idx)} style={{ background: 'none', border: 0, color: C.faint, cursor: 'pointer', display: 'flex' }}><Ico d="M18 6L6 18M6 6l12 12" /></button>
                  </div>
                ))}
              </div>
              {g.editable && g.slot && <AddPreset slot={g.slot} onAdd={addPreset} />}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '18px 16px 64px' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>Probador de orquestación</h1>
          <p style={{ color: C.dim, fontSize: 12.5, margin: '0 0 14px', maxWidth: 760 }}>
            Elegí el perfil (edad × nivel × tópico). Tocá una capa: las de preset las editás (agregás/sacás), las dinámicas/estructurales se ven nomás. <b>Grabás</b> el circuito del nivel o lo <b>probás</b> en vivo (abajo).
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
            {!!overrides.length && <Chip label="Ajustes" value={`${overrides.length}`} />}
            <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 10.5, color: C.faint }}>
              {Object.entries({ fijo: 'fijo', edad: 'edad', nivel: 'nivel', dinamico: 'dinámico' }).map(([k, l]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: NAT[k as keyof typeof NAT] }} /> {l}</span>
              ))}
            </div>
          </div>
        )}
        {err && <div style={{ color: C.red, fontSize: 13, padding: 10 }}>{err}</div>}

        {/* wide (tablet/desktop) = 2 paneles (capas | presets sticky); celular = acordeón */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
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
                    {isMobile && on && <div style={{ marginTop: 8 }}>{presetsBox()}</div>}
                  </div>
                )
              })}
              {!layers.length && !loading && <div style={{ color: C.faint, fontSize: 13, padding: 12 }}>Elegí edad y nivel para ver el ensamblado.</div>}
            </div>
          )}
          </div>

          {/* col derecha (wide): panel de la capa activa, sticky. En celular va inline (acordeón) */}
          {!isMobile && (
            <div style={{ position: 'sticky', top: 14 }}>
              {activeLayer
                ? presetsBox()
                : <div style={{ color: C.faint, fontSize: 12.5, padding: 14, border: `1px dashed ${C.border}`, borderRadius: 12 }}>Tocá una capa de la izquierda para ver y editar sus presets.</div>}
            </div>
          )}
        </div>

        {/* acciones finales: grabar el circuito + probar la clase */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginTop: 20 }}>
          <button onClick={saveCircuit} disabled={saving}
            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 9, background: 'none', color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 12, fontSize: 15, fontWeight: 800, padding: '14px 0', cursor: 'pointer' }}>
            <Ico d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" size={16} /> {saving ? 'Grabando…' : 'Grabar settings (circuito del nivel)'}
          </button>
          <a href={probarUrl} target="_blank" rel="noreferrer"
            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, background: C.green, color: '#06281a', borderRadius: 12, fontSize: 16, fontWeight: 800, padding: '15px 0', textDecoration: 'none' }}>
            <Ico d="M5 3l14 9-14 9V3z" size={17} /> Probar la clase
          </a>
        </div>
      </div>
    </div>
  )
}

function AddPreset({ slot, onAdd }: { slot: string; onAdd: (slot: string, body: string) => void }) {
  const [v, setV] = useState('')
  const submit = () => { if (v.trim()) { onAdd(slot, v); setV('') } }
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Sumar un preset…" onKeyDown={(e) => e.key === 'Enter' && submit()} style={{ ...sel, flex: 1, padding: '6px 9px', fontSize: 12.5 }} />
      <button onClick={submit} disabled={!v.trim()} style={{ background: C.green, border: 0, color: '#06281a', borderRadius: 8, fontSize: 14, fontWeight: 700, padding: '0 12px', cursor: 'pointer', opacity: v.trim() ? 1 : 0.4 }}>+</button>
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

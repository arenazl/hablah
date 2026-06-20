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
import { motorAPI, MotorResolve, MotorOverride, MotorPreset, MotorStageNote } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Band { band_id: number; code: string; label: string; phase_group?: string }
interface Level { level_code: string; label: string; sort_order: number }
interface Topic { topic_id: number; subcategory_id: number; title: string }
interface Sub { subcategory_id: number; category_id: number; name: string; topics: Topic[] }
interface Cat { category_id: number; name: string; subcategories: Sub[] }
interface Student { student_id: number; name: string; age: number; level_code: string }
interface PItem { id?: number; text: string; tag?: string }
interface PGroup { label: string; slot?: string; editable: boolean; items: PItem[] }

// 3 temas (oscuro / azul claro / ámbar claro). Los colores estructurales salen de CSS vars
// que setea el root según el tema; accent/green/red son semánticos y no cambian.
const THEMES: Record<string, { bg: string; panel: string; border: string; soft: string; fg: string; dim: string; faint: string }> = {
  dark: { bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1c2230', fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686' },
  azul: { bg: '#d4e6fb', panel: '#f3f9ff', border: '#a3c8ef', soft: '#c1ddfa', fg: '#13243c', dim: '#3f6190', faint: '#7295c2' },
  ambar: { bg: '#fbecca', panel: '#fff9ee', border: '#e6c98c', soft: '#f6e2b4', fg: '#3a2a0d', dim: '#806a33', faint: '#b3934f' },
}
const themeVars = (t: string): React.CSSProperties => {
  const p = THEMES[t] || THEMES.dark
  return { '--m-bg': p.bg, '--m-panel': p.panel, '--m-border': p.border, '--m-soft': p.soft, '--m-fg': p.fg, '--m-dim': p.dim, '--m-faint': p.faint } as React.CSSProperties
}
const C = {
  bg: 'var(--m-bg)', panel: 'var(--m-panel)', border: 'var(--m-border)', soft: 'var(--m-soft)',
  fg: 'var(--m-fg)', dim: 'var(--m-dim)', faint: 'var(--m-faint)', accent: '#38bdf8', green: '#22c55e', red: '#f87171',
}
const NAT = { fijo: '#9aa3af', edad: '#fbbf24', nivel: '#7dd3fc', dinamico: '#818cf8' }
// jerga técnica -> lenguaje de profe (el profe NO es técnico). '' = no mostrar nada.
const PLAIN_TAG: Record<string, string> = {
  hint_policy: 'cuando se traba', error_policy: 'cuando se equivoca',
  vocabulary: 'vocabulario', grammar: 'gramática', function: 'función', discourse: 'discurso',
  safety: 'seguridad', privacy: 'privacidad', accessibility: 'accesibilidad',
  idle_timeout: 'pausa larga', universal_guard: '',
}
const plainTag = (t?: string) => (t ? (t in PLAIN_TAG ? PLAIN_TAG[t] : t) : '')
// tipo de preset del learned_state -> etiqueta de profe
const KIND_LABEL: Record<string, string> = {
  error: 'error', chunk: 'chunk', comportamiento: 'conducta', motivacion: 'motivación',
}
// qué hace cada sector (grupo) del panel, en una línea
const GROUP_HINT: Record<string, string> = {
  'Por la edad': 'Reglas según la edad del alumno.',
  'Por el nivel': 'Reglas según el nivel (A1–C1).',
  'Universales (seguridad)': 'Reglas fijas de seguridad y privacidad — no se editan.',
  'Metodología': 'El método con el que enseña, según la edad.',
  'Políticas de banda': 'Ajustes de cómo enseña para esta edad.',
  'Objetivos del nivel': 'Lo que se aprende en este nivel.',
  'Tutor de la edad': 'Quién es el profe para esta edad.',
  'Actividad': 'La actividad central de la clase.',
  'Recompensa': 'Cómo se premia el avance.',
  'Fases': 'Los momentos de la clase, en orden.',
  'Arranque / cierre': 'Cómo abre y cierra la clase.',
  'Config global': 'Parámetros fijos de la sesión.',
}
// placeholder del "agregar" según la capa (sin la palabra "preset")
const ADD_PH: Record<string, string> = {
  behavioral_guard: 'Escribí una regla nueva…', level_policy: 'Escribí una regla nueva…',
  band_policy: 'Escribí una política…', objective: 'Escribí un objetivo…',
}
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
// qué hace cada capa, en castellano de profe (lo crudo en inglés queda detrás de "ver XML")
const LAYER_DESC: Record<string, string> = {
  runtime_context: 'Idioma meta, modo de voz y reglas globales de la sesión.',
  tutor_identity: 'Quién es el profe: nombre y tono con el que habla.',
  pedagogical_framework: 'Con qué método enseña y sus políticas, según la edad.',
  lesson_focus_engagement: 'La actividad de la clase y cómo se premia el avance.',
  student_profile: 'Edad, nivel e intereses del alumno.',
  learner_state: 'Su memoria: lo que ya sabe y lo que todavía falla.',
  behavioral_guards: 'Las reglas/rieles que el profe respeta (por edad y por nivel).',
  current_topic_vocabulary: 'El vocabulario del tópico (si el tópico trae).',
  lesson_objectives: 'Qué se aprende en este nivel + frases para poder decirlo.',
  narrative_spine: 'Las fases de la clase y cuánto dura.',
  execution_trigger: 'Cómo arranca y cómo cierra la clase.',
  interaction_state: 'El estado en vivo de la sesión (runtime).',
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
  const [tsb, setTsb] = useState<{ topic_id: number; band_id: number }[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [cat, setCat] = useState<Record<string, any[]>>({})

  const [band, setBand] = useState('adult')
  const [level, setLevel] = useState('B2')
  const [catId, setCatId] = useState<number | undefined>()
  const [subId, setSubId] = useState<number | undefined>()
  const [topicId, setTopicId] = useState<number | undefined>(7)
  const [studentId, setStudentId] = useState<number | undefined>()
  // perfil-molde de este edad×nivel (acumula learned_state); si no se elige alumno, se usa este
  const [profile, setProfile] = useState<{ student_id: number; name: string } | null>(null)

  // overrides generalizados por slot: disabled = Set("slot:id"), added = [{slot, body}],
  // edited = {"slot:id": textoCorregido} (corrección en el lugar de una regla del catálogo)
  const [disabled, setDisabled] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState<{ slot: string; body: string }[]>([])
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  const [res, setRes] = useState<MotorResolve | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showXml, setShowXml] = useState(false)
  const [activeLayer, setActiveLayer] = useState('behavioral_guards')
  const [saving, setSaving] = useState(false)
  const [theme, setTheme] = useState<string>(() => (typeof localStorage !== 'undefined' && localStorage.getItem('motorTheme')) || 'dark')
  useEffect(() => { try { localStorage.setItem('motorTheme', theme) } catch {} }, [theme])

  // loop de aprendizaje: el alumno deja huella -> la misma clase cambia
  const [presets, setPresets] = useState<MotorPreset[]>([])
  const [obsText, setObsText] = useState('')
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<MotorStageNote[]>([])
  const [openRO, setOpenRO] = useState<Set<string>>(new Set())   // grupos read-only abiertos (seguridad colapsada por default)
  const [techTags, setTechTags] = useState<Set<string>>(new Set()) // capas con "texto técnico" visible
  const toggleSet = (set: Set<string>, k: string, fn: (s: Set<string>) => void) => { const n = new Set(set); n.has(k) ? n.delete(k) : n.add(k); fn(n) }

  useEffect(() => {
    motorAPI.dimensions().then((d) => {
      setBands(d.bands); setLevels(d.levels); setCatalog(d.catalog); setStudents(d.students)
      setTsb(d.topic_suggested_band || [])
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
      setDisabled(dis); setAdded(add); setEdited({})
    }).catch(() => { setDisabled(new Set()); setAdded([]); setEdited({}) })
  }, [band, level])

  // perfil-molde de este edad×nivel: lo trae (o crea) para que el loop acumule sobre él
  useEffect(() => {
    motorAPI.profile(band, level).then((p) => setProfile({ student_id: p.student_id, name: p.name })).catch(() => setProfile(null))
  }, [band, level])
  // alumno efectivo: el elegido a mano, o el perfil del nivel por defecto
  const effStudent = useMemo(() => studentId ?? profile?.student_id, [studentId, profile])

  const overrides = useMemo<MotorOverride[]>(() => {
    const out: MotorOverride[] = []
    for (const k of disabled) { const i = k.indexOf(':'); out.push({ slot: k.slice(0, i), action: 'disable', target_id: Number(k.slice(i + 1)) }) }
    for (const [k, body] of Object.entries(edited)) { const i = k.indexOf(':'); const slot = k.slice(0, i); out.push({ slot, action: 'disable', target_id: Number(k.slice(i + 1)) }); out.push({ slot, action: 'add', body }) }
    for (const a of added) out.push({ slot: a.slot, action: 'add', body: a.body })
    return out
  }, [disabled, added, edited])

  const resolve = useCallback(() => {
    setLoading(true); setErr(null)
    motorAPI.resolve({
      band_code: band, level_code: level, topic_id: topicId ?? null,
      student_id: effStudent ?? null, test_overrides: overrides.length ? overrides : undefined,
    }).then(setRes).catch((e) => { setErr(e?.response?.data?.detail || 'Error'); setRes(null) })
      .finally(() => setLoading(false))
  }, [band, level, topicId, effStudent, overrides])
  // resolve MANUAL: solo al inicio y con el botón Actualizar (no en cada uno de los ~10 inputs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { resolve() }, [])

  const bandId = useMemo(() => bands.find((b) => b.code === band)?.band_id, [bands, band])
  // conexión edad→tópico: sólo cat/subcat/tópicos sugeridos para la banda elegida (topic_suggested_band)
  const allowed = useMemo(() => {
    const ids = tsb.filter((r) => r.band_id === bandId).map((r) => r.topic_id)
    return ids.length ? new Set(ids) : null // null = sin data de banda → no filtrar (fallback)
  }, [tsb, bandId])
  const catalogB = useMemo(() => {
    if (!allowed) return catalog
    return catalog
      .map((c) => ({ ...c, subcategories: c.subcategories
        .map((s) => ({ ...s, topics: s.topics.filter((t) => allowed.has(t.topic_id)) }))
        .filter((s) => s.topics.length > 0) }))
      .filter((c) => c.subcategories.length > 0)
  }, [catalog, allowed])
  const subs = useMemo(() => catalogB.find((c) => c.category_id === catId)?.subcategories || [], [catalogB, catId])
  const topics = useMemo(() => subId ? (subs.find((s) => s.subcategory_id === subId)?.topics || []) : subs.flatMap((s) => s.topics), [subs, subId])
  // al cambiar la banda, si la selección actual ya no aplica a esa edad, la reseteo
  useEffect(() => { if (catId != null && !catalogB.some((c) => c.category_id === catId)) { setCatId(undefined); setSubId(undefined) } }, [catalogB, catId])
  useEffect(() => { if (subId != null && !subs.some((s) => s.subcategory_id === subId)) setSubId(undefined) }, [subs, subId])
  useEffect(() => { if (topicId != null && allowed && !allowed.has(topicId)) setTopicId(undefined) }, [allowed, topicId])
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
    const k = `${slot}:${id}`
    setDisabled((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n })
    setEdited((p) => { if (!(k in p)) return p; const n = { ...p }; delete n[k]; return n }) // sacar/reactivar limpia la corrección
  }
  const addPreset = (slot: string, body: string) => { if (body.trim()) setAdded((p) => [...p, { slot, body: body.trim() }]) }
  const removeAdded = (idx: number) => setAdded((p) => p.filter((_, j) => j !== idx))
  // corregir en el lugar una regla del catálogo (se guarda como disable original + add corregido)
  const startEdit = (key: string, current: string) => { setEditKey(key); setEditVal(edited[key] ?? current) }
  const cancelEdit = () => setEditKey(null)
  const saveEdit = (key: string, original: string) => {
    const v = editVal.trim()
    setEdited((p) => { const n = { ...p }; if (!v || v === original) delete n[key]; else n[key] = v; return n })
    setDisabled((p) => { if (!p.has(key)) return p; const n = new Set(p); n.delete(key); return n })
    setEditKey(null)
  }

  const saveCircuit = async () => {
    setSaving(true)
    try { await motorAPI.saveCircuit({ band_code: band, level_code: level, overrides }); toast.success(`Circuito grabado · ${band} × ${level}`) }
    catch { toast.error('No se pudo grabar el circuito') } finally { setSaving(false) }
  }

  // presets que arrastra el alumno (etapa 5 / memoria): se refrescan al elegir alumno o tras la clase
  const loadPresets = useCallback(() => {
    if (effStudent == null) { setPresets([]); return }
    motorAPI.studentPresets(effStudent).then((r) => setPresets(r.presets || [])).catch(() => setPresets([]))
  }, [effStudent])
  useEffect(() => { loadPresets() }, [loadPresets])
  // renovar resultados al cambiar cualquier input: no arrastrar la clase anterior
  useEffect(() => { setAnalysis([]); setLastRun(null) }, [band, level, effStudent, topicId])

  // borrar el historial (learned_state) del perfil/alumno: para ver la clase SIN historial
  const wipeHistory = async () => {
    if (effStudent == null) return
    try {
      await motorAPI.wipeProfile(effStudent)
      setAnalysis([]); setLastRun(null)
      loadPresets(); resolve()
      toast.success('Historial borrado · la clase vuelve a "sin historial"')
    } catch { toast.error('No se pudo borrar el historial') }
  }

  // ACTUALIZAR: re-sincroniza todo desde los inputs actuales (prompt + memoria + perfil)
  const refreshAll = useCallback(() => {
    resolve()
    loadPresets()
    motorAPI.profile(band, level).then((p) => setProfile({ student_id: p.student_id, name: p.name })).catch(() => {})
    toast.success('Actualizado desde los inputs')
  }, [resolve, loadPresets, band, level])

  // correr la clase: texto libre -> protocolo (IA encasilla) -> presets -> la MISMA clase cambia
  const runClass = async () => {
    if (effStudent == null) { toast.error('Elegí edad y nivel (se usa el perfil del nivel)'); return }
    const observations = obsText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!observations.length) { toast.error('Escribí al menos una observación de la clase'); return }
    setRunning(true)
    try {
      const r = await motorAPI.protocolRun({ student_id: effStudent, level_code: level, observations })
      if (r.error) { toast.error(`Protocolo: ${r.error}`); return }
      const nuevos = r.new_presets?.length || 0, ref = r.reinforced?.length || 0, mrg = r.merged?.length || 0
      setLastRun(`${r.applied || 0} aplicados · ${nuevos} nuevos · ${ref} reforzados${mrg ? ` · ${mrg} fusionados` : ''}`)
      setAnalysis(r.stage_analysis || [])
      setObsText('')
      loadPresets(); resolve() // refresca etapa 5 (memoria) y re-arma la clase con el nuevo estado
      toast.success('Clase procesada · la memoria del alumno cambió')
    } catch { toast.error('No se pudo procesar la clase') } finally { setRunning(false) }
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
          const collapsible = !g.editable                       // grupos read-only (seguridad) se pliegan
          const open = !collapsible || openRO.has(g.label)
          return (
            <div key={gi} style={{ marginBottom: 12 }}>
              <div onClick={collapsible ? () => toggleSet(openRO, g.label, setOpenRO) : undefined}
                style={{ fontSize: 10, fontWeight: 700, color: g.editable ? C.fg : C.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: open ? 6 : 0, display: 'flex', alignItems: 'center', gap: 6, cursor: collapsible ? 'pointer' : 'default' }}>
                {collapsible && <Ico d={open ? 'M6 9l6 6 6-6' : 'M9 18l6-6-6-6'} size={11} />}
                {g.label}{!g.editable && <span style={{ color: C.faint }}><Ico d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" size={10} /></span>}
                {collapsible && <span style={{ color: C.faint, fontWeight: 700 }}>· {g.items.length} fijas</span>}
              </div>
              {open && GROUP_HINT[g.label] && <div style={{ fontSize: 10.5, color: C.faint, marginBottom: 6, lineHeight: 1.35 }}>{GROUP_HINT[g.label]}</div>}
              {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.items.map((it, i) => {
                  const key = g.slot && it.id != null ? `${g.slot}:${it.id}` : ''
                  const off = !!key && disabled.has(key)
                  const fixedBody = key ? edited[key] : undefined
                  const canEdit = g.editable && !!g.slot && it.id != null
                  const plain = plainTag(it.tag)
                  if (canEdit && editKey === key) {
                    return (
                      <div key={i} style={{ padding: '8px 9px', borderRadius: 8, background: C.bg, border: `1px solid ${C.accent}` }}>
                        <textarea value={editVal} onChange={(e) => setEditVal(e.target.value)} rows={2} autoFocus
                          style={{ width: '100%', boxSizing: 'border-box', background: C.panel, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12.5, padding: '6px 8px', resize: 'vertical', lineHeight: 1.4 }} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                          <button onClick={cancelEdit} style={{ background: 'none', border: `1px solid ${C.soft}`, color: C.dim, borderRadius: 6, fontSize: 11.5, padding: '4px 10px', cursor: 'pointer' }}>Cancelar</button>
                          <button onClick={() => saveEdit(key, it.text)} style={{ background: C.accent, border: 0, color: '#06281a', borderRadius: 6, fontSize: 11.5, fontWeight: 700, padding: '4px 12px', cursor: 'pointer' }}>Guardar</button>
                        </div>
                      </div>
                    )
                  }
                  const amber = !!fixedBody
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 9px', borderRadius: 8, background: off ? 'rgba(248,113,113,0.08)' : amber ? 'rgba(251,191,36,0.10)' : C.bg, border: `1px solid ${off ? 'rgba(248,113,113,0.3)' : amber ? 'rgba(251,191,36,0.45)' : C.soft}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: off ? C.faint : C.fg, textDecoration: off ? 'line-through' : 'none', lineHeight: 1.4 }}>{fixedBody ?? it.text}</div>
                        {(plain || amber) && (
                          <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 3 }}>
                            {plain && <span style={{ fontSize: 10, color: C.faint }}>{plain}</span>}
                            {amber && <span style={{ fontSize: 9.5, color: '#d4a017', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>corregida</span>}
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <>
                          <button onClick={() => startEdit(key, it.text)} title="corregir" style={{ background: 'none', border: 0, color: amber ? '#d4a017' : C.faint, cursor: 'pointer', display: 'flex', flexShrink: 0 }}><Ico d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></button>
                          <button onClick={() => toggleDisable(g.slot!, it.id)} title={off ? 'reactivar' : 'sacar'} style={{ background: 'none', border: 0, color: off ? C.green : C.faint, cursor: 'pointer', display: 'flex', flexShrink: 0 }}><Ico d={off ? 'M20 6L9 17l-5-5' : 'M18 6L6 18M6 6l12 12'} /></button>
                        </>
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
              </div>}
              {open && g.editable && g.slot && <AddPreset slot={g.slot} placeholder={ADD_PH[g.slot] || 'Agregar…'} onAdd={addPreset} />}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ ...themeVars(theme), minHeight: '100vh', background: C.bg, color: C.fg, padding: '18px 16px 64px' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>Probador de clases</h1>
            <p style={{ color: C.dim, fontSize: 12.5, margin: '0 0 14px', maxWidth: 760 }}>
              Elegí el perfil (edad × nivel × tópico). Tocá una capa para ver qué hace: las reglas las <b>corregís</b> en el lugar, el resto se ve nomás. <b>Grabás</b> el circuito del nivel o <b>probás</b> la clase (abajo).
            </p>
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
            <button onClick={refreshAll} title="recalcular las 9 capas desde los inputs actuales"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', border: `1px solid ${C.accent}`, background: 'rgba(56,189,248,0.14)', color: C.accent, marginRight: 6 }}>
              <Ico d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" size={13} /> Actualizar
            </button>
            {([['dark', 'Oscuro'], ['azul', 'Azul'], ['ambar', 'Ámbar']] as const).map(([t, l]) => (
              <button key={t} onClick={() => setTheme(t)}
                style={{ padding: '6px 11px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${theme === t ? C.accent : C.border}`, background: theme === t ? 'rgba(56,189,248,0.12)' : C.panel, color: theme === t ? C.accent : C.dim }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: 8, alignItems: 'start' }}>
          <Ctx label="Edad"><select style={sel} value={band} onChange={(e) => setBand(e.target.value)}>{bands.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}</select></Ctx>
          <Ctx label="Nivel"><select style={sel} value={level} onChange={(e) => setLevel(e.target.value)}>{levels.map((l) => <option key={l.level_code} value={l.level_code}>{l.level_code}</option>)}</select></Ctx>
          <Ctx label="Categoría"><select style={sel} value={catId ?? ''} onChange={(e) => { setCatId(e.target.value ? Number(e.target.value) : undefined); setSubId(undefined) }}><option value="">—</option>{catalogB.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select></Ctx>
          <Ctx label="Subcategoría"><select style={sel} value={subId ?? ''} disabled={!catId} onChange={(e) => setSubId(e.target.value ? Number(e.target.value) : undefined)}><option value="">—</option>{subs.map((s) => <option key={s.subcategory_id} value={s.subcategory_id}>{s.name}</option>)}</select></Ctx>
          <Ctx label="Tópico"><select style={sel} value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : undefined)}><option value="">— (sin tópico)</option>{topics.map((t) => <option key={t.topic_id} value={t.topic_id}>{t.title}</option>)}</select></Ctx>
          <Ctx label="Alumno (opc.)"><select style={sel} value={studentId ?? ''} onChange={(e) => setStudentId(e.target.value ? Number(e.target.value) : undefined)}><option value="">— Perfil del nivel</option>{students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name} ({s.age}·{s.level_code})</option>)}</select></Ctx>
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
            <pre style={{ margin: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: C.dim, maxHeight: '74vh', overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>{res?.prompt || '(elegí contexto)'}</pre>
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
                      <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{LAYER_DESC[tag] || lm.dep}</div>
                      {on && body && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.soft}` }}>
                          <span onClick={(e) => { e.stopPropagation(); toggleSet(techTags, tag, setTechTags) }}
                            style={{ fontSize: 9, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Ico d={techTags.has(tag) ? 'M6 9l6 6 6-6' : 'M9 18l6-6-6-6'} size={9} /> Texto técnico (lo que recibe la IA)
                          </span>
                          {techTags.has(tag) && <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto', marginTop: 5 }}>{body}</div>}
                        </div>
                      )}
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

        {/* loop de aprendizaje: el alumno deja huella -> la misma clase cambia */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: NAT.dinamico }} />
            <div style={{ fontSize: 14, fontWeight: 800 }}>Loop de aprendizaje</div>
          </div>
          <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 12 }}>
            El alumno deja huella en cada clase y la <b>misma clase cambia</b>. La IA encasilla lo observado en presets (errores / chunks / comportamiento / motivación, con polaridad +/−), nunca texto libre. <b>Borrá el historial</b> para comparar la clase con y sin memoria.
          </div>
          {effStudent == null ? (
            <div style={{ fontSize: 12.5, color: C.faint, padding: '10px 12px', border: `1px dashed ${C.border}`, borderRadius: 10 }}>
              Elegí <b>edad y nivel</b> arriba — se usa el perfil de ese nivel.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Memoria{studentId == null && profile ? ` · ${profile.name}` : ''} · {presets.length} preset{presets.length === 1 ? '' : 's'}
                  </div>
                  {presets.length > 0 && (
                    <button onClick={wipeHistory} title="borrar el learned_state" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, color: C.red, borderRadius: 7, fontSize: 10.5, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}>
                      <Ico d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" size={11} /> Borrar historial
                    </button>
                  )}
                </div>
                {presets.length === 0
                  ? <div style={{ fontSize: 12, color: C.faint }}>(vacía — corré una clase)</div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {presets.map((p) => {
                      const pos = p.polarity === 'positive', neg = p.polarity === 'negative'
                      const col = pos ? C.green : neg ? C.red : C.dim
                      const bg = pos ? 'rgba(34,197,94,0.12)' : neg ? 'rgba(248,113,113,0.12)' : C.soft
                      return (
                        <div key={p.preset_id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 9px', borderRadius: 8, background: C.bg, border: `1px solid ${C.soft}` }}>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, color: col, background: bg, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {pos ? '+' : neg ? '−' : '·'} {KIND_LABEL[p.kind] || p.kind}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, color: C.fg, lineHeight: 1.35 }}>{p.label}</div>
                            {p.directive && <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.35, marginTop: 2, fontStyle: 'italic' }}>→ {p.directive}</div>}
                            <span style={{ fontSize: 9.5, color: C.faint }}>{p.state} · x{p.occurrences}{p.status === 'candidate' ? ' · candidato' : ''}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Correr la clase (observaciones, una por línea)
                </div>
                <textarea value={obsText} onChange={(e) => setObsText(e.target.value)} rows={5}
                  placeholder={'dijo "I have 25 years"\nusó bien "in my opinion"\nconfundió since y for'}
                  style={{ width: '100%', boxSizing: 'border-box', background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12.5, padding: '8px 10px', resize: 'vertical', lineHeight: 1.4 }} />
                <button onClick={runClass} disabled={running}
                  style={{ marginTop: 8, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: NAT.dinamico, color: '#0b0e14', border: 0, borderRadius: 10, fontSize: 14, fontWeight: 800, padding: '11px 0', cursor: 'pointer', opacity: running ? 0.6 : 1 }}>
                  <Ico d="M5 3l14 9-14 9V3z" size={14} /> {running ? 'Procesando…' : 'Procesar clase'}
                </button>
                {lastRun && <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>{lastRun}</div>}
              </div>
            </div>
          )}
        </div>

        {analysis.length > 0 && (
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: C.accent }} />
              <div style={{ fontSize: 14, fontWeight: 800 }}>Análisis de la clase · por etapa</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {analysis.map((a) => (
                <div key={a.stage} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, background: C.bg, border: `1px solid ${C.soft}` }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: C.accent, minWidth: 58, flexShrink: 0, paddingTop: 1 }}>Etapa {a.stage}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.fg }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.4 }}>{a.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

function AddPreset({ slot, onAdd, placeholder = 'Agregar…' }: { slot: string; onAdd: (slot: string, body: string) => void; placeholder?: string }) {
  const [v, setV] = useState('')
  const submit = () => { if (v.trim()) { onAdd(slot, v); setV('') } }
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === 'Enter' && submit()} style={{ ...sel, flex: 1, padding: '6px 9px', fontSize: 12.5 }} />
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

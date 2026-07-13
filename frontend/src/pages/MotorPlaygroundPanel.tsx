/* MotorPlaygroundPanel — /motor · PROBADOR + EDITOR del circuito JIT (Motor V2).
 *
 * Elegís un CONTEXTO de prueba (edad × nivel × tópico [× alumno-perfil]) y el motor arma
 * las 9 capas JIT. Tocás una capa → se despliega su panel (acordeón) con sus reglas.
 * Los placeholders como {expected_production} se pintan como badges editables.
 * Al tocar un placeholder o hacer click en el lápiz, editás la plantilla de origen.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { motorAPI, MotorResolve, MotorOverride, MotorPreset, MotorStageNote } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Band { band_id: number; code: string; label: string; phase_group?: string; max_level_order?: number }
interface Level { level_code: string; label: string; sort_order: number }
interface Topic { topic_id: number; title: string; segmento?: string }
interface Student { student_id: number; name: string; age?: number; level_code: string }

// Temas de interfaz
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

const PLACEHOLDER_SOURCES: Record<string, { table: string; field: string; label: string }> = {
  expected_production: { table: 'levels', field: 'expected_production', label: 'Producción Esperada (del Nivel)' },
  language_rule: { table: 'levels', field: 'language_rule', label: 'Regla de Idioma (del Nivel)' },
  curriculum_grammar: { table: 'levels', field: 'curriculum_grammar', label: 'Gramática (del Nivel)' },
  tutor_mascot: { table: 'student_types', field: 'tutor_mascot', label: 'Nombre de Mascota (de la Edad)' },
  tutor: { table: 'student_types', field: 'tutor_mascot', label: 'Nombre de Mascota (de la Edad)' },
  tutor_identity: { table: 'student_types', field: 'tutor_identity', label: 'Identidad del Tutor (de la Edad)' },
  tutor_tonal_rules: { table: 'student_types', field: 'tutor_tonal_rules', label: 'Reglas de Tono (de la Edad)' },
  pedagogical_rules: { table: 'student_types', field: 'pedagogy', label: 'Reglas Pedagógicas (de la Edad)' },
  universal_closing_rule: { table: 'app_config', field: 'universal_closing_rule', label: 'Regla de Cierre Universal (Config)' },
}

const Ico = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <path d={d} />
  </svg>
)

const Ctx = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: C.dim }}>{label}</span>
    {children}
  </div>
)

const Chip = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', background: C.soft, border: `1px solid ${C.border}`, borderRadius: 8, padding: '3px 8px', fontSize: 11, gap: 5 }}>
    <span style={{ color: C.dim }}>{label}:</span>
    <b style={{ color: C.fg }}>{value}</b>
  </div>
)

export default function MotorPlaygroundPanel() {
  const isMobile = useIsMobile()
  const [bands, setBands] = useState<Band[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [catalog, setCatalog] = useState<any[]>([])
  const [students, setStudents] = useState<Student[]>([])

  // Datos crudos del catálogo para la edición JIT en línea
  const [studentTypesRows, setStudentTypesRows] = useState<any[]>([])
  const [levelsRows, setLevelsRows] = useState<any[]>([])
  const [topicsRows, setTopicsRows] = useState<any[]>([])
  const [appConfigRows, setAppConfigRows] = useState<any[]>([])

  const [band, setBand] = useState('adult')
  const [level, setLevel] = useState('B2')
  const [topicId, setTopicId] = useState<number | undefined>()
  const [studentId, setStudentId] = useState<number | undefined>()
  const [profile, setProfile] = useState<{ student_id: number; name: string } | null>(null)

  const [res, setRes] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showXml, setShowXml] = useState(false)
  const [activeLayer, setActiveLayer] = useState('Contexto')
  const [theme, setTheme] = useState<string>(() => (typeof localStorage !== 'undefined' && localStorage.getItem('motorTheme')) || 'dark')
  
  // Estado del JIT inline editor
  const [editTable, setEditTable] = useState<string | null>(null)
  const [editPk, setEditPk] = useState<any>(null)
  const [editField, setEditField] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState<string>('')
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)

  // loop de aprendizaje
  const [presets, setPresets] = useState<MotorPreset[]>([])
  const [obsText, setObsText] = useState('')
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<MotorStageNote[]>([])

  useEffect(() => { try { localStorage.setItem('motorTheme', theme) } catch {} }, [theme])

  // Carga de dimensiones iniciales
  const loadDimensions = useCallback(() => {
    motorAPI.dimensions().then((d) => {
      setBands(d.bands); setLevels(d.levels); setCatalog(d.catalog); setStudents(d.students)
    }).catch(() => {})
  }, [])

  // Carga de datos crudos del catálogo para la edición en el lugar
  const loadCatalogData = useCallback(() => {
    motorAPI.rows('student_types').then(setStudentTypesRows).catch(() => {})
    motorAPI.rows('levels').then(setLevelsRows).catch(() => {})
    motorAPI.rows('topics').then(setTopicsRows).catch(() => {})
    motorAPI.rows('app_config').then(setAppConfigRows).catch(() => {})
  }, [])

  useEffect(() => {
    loadDimensions()
    loadCatalogData()
  }, [loadDimensions, loadCatalogData])

  // Al cambiar edad/nivel, cargo el perfil del nivel
  useEffect(() => {
    motorAPI.profile(band, level).then((p) => setProfile({ student_id: p.student_id, name: p.name })).catch(() => setProfile(null))
  }, [band, level])

  const effStudent = useMemo(() => studentId ?? profile?.student_id, [studentId, profile])

  // Resolve JIT de orquestación (Motor V2)
  const resolve = useCallback(() => {
    setLoading(true); setErr(null)
    motorAPI.previewV2({
      age_group: band, level: level, topic_id: topicId ?? null, student_id: effStudent ?? null
    }).then((d) => {
      setRes(d)
    }).catch((e) => { setErr(e?.response?.data?.detail || 'Error'); setRes(null) })
      .finally(() => setLoading(false))
  }, [band, level, topicId, effStudent])

  useEffect(() => { resolve() }, [resolve])

  // Lista filtrada de tópicos sugeridos para el segmento actual
  const topics = useMemo<Topic[]>(() => {
    const list = catalog[0]?.subcategories[0]?.topics || []
    return list.filter((t: any) => !t.segmento || t.segmento === band)
  }, [catalog, band])

  useEffect(() => {
    if (topics.length && !topics.some((t) => t.topic_id === topicId)) {
      setTopicId(topics[0].topic_id)
    }
  }, [topics, topicId])

  const levelsForBand = useMemo(() => {
    const mx = bands.find((b) => b.code === band)?.max_level_order ?? 99
    return levels.filter((l) => l.sort_order <= mx)
  }, [levels, bands, band])

  useEffect(() => {
    if (levelsForBand.length && !levelsForBand.some((l) => l.level_code === level)) {
      setLevel(levelsForBand[0].level_code)
    }
  }, [levelsForBand, level])

  // Carga de presets de memoria del alumno
  useEffect(() => {
    if (effStudent) {
      motorAPI.studentPresets(effStudent).then((r) => setPresets(r.presets || [])).catch(() => setPresets([]))
    }
  }, [effStudent])

  const wipeProfile = async () => {
    if (!effStudent) return
    if (!window.confirm('¿Seguro querés borrar el historial y memoria SRS simulados para este perfil?')) return
    try {
      await motorAPI.wipeProfile(effStudent)
      toast.success('Memoria del alumno reseteada')
      resolve()
    } catch { toast.error('No se pudo borrar') }
  }

  // Loop de aprendizaje: correr turno simulado
  const runClass = async () => {
    if (effStudent == null) { toast.error('Elegí edad y nivel'); return }
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
      resolve()
      if (effStudent) motorAPI.studentPresets(effStudent).then((pr) => setPresets(pr.presets || []))
      toast.success('Clase procesada · la memoria cambió')
    } catch { toast.error('No se pudo procesar la clase') } finally { setRunning(false) }
  }

  // JIT Editor: arrancar edición de una celda
  const startEditField = (table: string, field: string) => {
    let pk: any = null
    let val = ''
    let label = `${table}.${field}`

    if (table === 'student_types') {
      pk = { slug: band }
      val = studentTypesRows.find(r => r.slug === band)?.[field] || ''
    } else if (table === 'levels') {
      pk = { code: level }
      val = levelsRows.find(r => r.code === level)?.[field] || ''
    } else if (table === 'topics') {
      pk = { id: topicId }
      val = topicsRows.find(r => r.id === topicId)?.[field] || ''
      if (typeof val === 'object') val = JSON.stringify(val, null, 2)
    } else if (table === 'app_config') {
      pk = { key: field }
      val = appConfigRows.find(r => r.key === field)?.value || ''
    }

    setEditTable(table)
    setEditPk(pk)
    setEditField(field)
    setEditLabel(label)
    setEditVal(val)
  }

  const handleEditEntry = (source: string) => {
    const parts = source.split('.')
    if (parts.length === 2) {
      startEditField(parts[0], parts[1])
    }
  }

  const handlePlaceholderClick = (ph: string) => {
    const src = PLACEHOLDER_SOURCES[ph]
    if (src) {
      startEditField(src.table, src.field)
    } else {
      toast.error(`Placeholder {${ph}} no mapeable a un campo de base directo`)
    }
  }

  const saveEdit = async () => {
    if (!editTable || !editPk || !editField) return
    setSaving(true)
    try {
      let finalVal: any = editVal
      if (editTable === 'topics' && editField === 'keywords') {
        try { finalVal = JSON.parse(editVal) } catch { finalVal = editVal.split(',').map(s => s.trim()).filter(Boolean) }
      }
      
      // Si editamos app_config, el campo destino es 'value'
      const updatePayload = editTable === 'app_config' ? { value: finalVal } : { [editField]: finalVal }
      
      await motorAPI.update(editTable, editPk, updatePayload)
      toast.success('Plantilla del catálogo guardada con éxito')
      setEditTable(null)
      loadCatalogData()
      resolve()
    } catch {
      toast.error('No se pudo guardar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  // Renderizador JIT de texto con resaltado e interacción de placeholders
  const renderBodyWithPlaceholders = (text: string) => {
    if (!text) return null
    const regex = /(\{expected_production\}|\{tutor_mascot\}|\{tutor\}|\{universal_closing_rule\}|\{tutor_identity\}|\{tutor_tonal_rules\}|\{pedagogical_rules\})/g
    const parts = text.split(regex)
    return parts.map((part, i) => {
      const isPh = part.startsWith('{') && part.endsWith('}')
      if (isPh) {
        const cleanPh = part.replace(/[{}]/g, '')
        return (
          <span 
            key={i} 
            onClick={(e) => { e.stopPropagation(); handlePlaceholderClick(cleanPh) }}
            title="Tocar para editar esta plantilla"
            style={{
              background: 'rgba(56,189,248,0.14)',
              color: '#38bdf8',
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 700,
              cursor: 'pointer',
              margin: '0 2px',
              border: '1.2px solid rgba(56,189,248,0.4)',
              fontSize: '11.5px',
              userSelect: 'none',
              display: 'inline-block',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  const sel: React.CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 8, background: C.panel, color: C.fg,
    border: `1px solid ${C.border}`, fontSize: 13, height: 34, outline: 'none'
  }

  const meta = res?.meta
  const steps = res?.steps || []

  return (
    <div style={{ ...themeVars(theme), minHeight: '100vh', background: C.bg, color: C.fg, padding: '18px 16px 64px' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>Probador de clases</h1>
            <p style={{ color: C.dim, fontSize: 12.5, margin: '0 0 14px', maxWidth: 760 }}>
              Elegí el perfil (edad × nivel × tópico). Tocá una capa para desplegarla. Clickeá en los <b>placeholders destacados</b> o en el lápiz para realizar el <b>ajuste fino JIT</b> del catálogo original.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
            <button onClick={resolve} title="Recalcular orquestación desde los inputs actuales"
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

        {/* Dropdowns unificados */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, marginBottom: 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 8, alignItems: 'start' }}>
          <Ctx label="Edad"><select style={sel} value={band} onChange={(e) => setBand(e.target.value)}>{bands.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}</select></Ctx>
          <Ctx label="Nivel"><select style={sel} value={level} onChange={(e) => setLevel(e.target.value)}>{levelsForBand.map((l) => <option key={l.level_code} value={l.level_code}>{l.level_code}</option>)}</select></Ctx>
          <Ctx label="Tópico"><select style={sel} value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : undefined)}><option value="">— (sin tópico)</option>{topics.map((t) => <option key={t.topic_id} value={t.topic_id}>{t.title}</option>)}</select></Ctx>
          <Ctx label="Alumno (opc.)"><select style={sel} value={studentId ?? ''} onChange={(e) => setStudentId(e.target.value ? Number(e.target.value) : undefined)}><option value="">— Perfil del nivel</option>{students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name} ({s.level_code})</option>)}</select></Ctx>
        </div>

        {meta && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <Chip label="Motor" value={meta.engine || '—'} />
            <Chip label="Semilla" value={String(meta.session_seed)} />
            <Chip label="Tópico" value={meta.topic_title || '—'} />
            {meta.has_history && <Chip label="Memoria" value="Activa" />}
            <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 10.5, color: C.faint }}>
              {Object.entries({ fijo: 'fijo', edad: 'edad', nivel: 'nivel', dinamico: 'dinámico' }).map(([k, l]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: NAT[k as keyof typeof NAT] }} /> {l}</span>
              ))}
            </div>
          </div>
        )}
        {err && <div style={{ color: C.red, fontSize: 13, padding: 10 }}>{err}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.6fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }}>
          
          {/* Columna Izquierda: Los 9 Pasos Accordion */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.dim, fontWeight: 700 }}>Las 9 capas reales del Composer JIT {loading && '· armando…'}</div>
              <button onClick={() => setShowXml((v) => !v)} style={{ background: 'none', border: `1px solid ${C.soft}`, color: C.accent, borderRadius: 7, fontSize: 11, padding: '3px 9px', cursor: 'pointer' }}>{showXml ? 'ver capas' : 'ver XML final'}</button>
            </div>
            {showXml ? (
              <pre style={{ margin: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: C.dim, maxHeight: '74vh', overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>{res?.prompt || '(vacío)'}</pre>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {steps.map((st: any, i: number) => {
                  const stepNat = st.step === 'Contexto' ? 'fijo' : ['El profe', 'Método', 'Juego', 'Turno'].includes(st.step) ? 'edad' : ['Rieles', 'Arranque'].includes(st.step) ? 'nivel' : 'dinamico'
                  const col = NAT[stepNat]
                  const on = st.step === activeLayer
                  return (
                    <div key={i}>
                      <button onClick={() => setActiveLayer(on ? '' : st.step)} style={{ width: '100%', textAlign: 'left', background: on ? 'rgba(56,189,248,0.06)' : C.panel, border: `1px solid ${on ? C.accent : C.border}`, borderLeft: `3px solid ${col}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', color: C.fg }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: col, minWidth: 16 }}>{i + 1}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{st.step}</span>
                          {on && <span style={{ marginLeft: 'auto', fontSize: 16, color: C.accent, lineHeight: 1 }}>−</span>}
                          {!on && <span style={{ marginLeft: 'auto', fontSize: 9.5, color: col, fontWeight: 700 }}>{stepNat}</span>}
                        </div>
                        
                        {on && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.soft}` }}>
                            {st.entries.map((ent: any, j: number) => (
                              <div key={j} style={{ background: C.soft, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: C.accent }}>{ent.label}</span>
                                  <span style={{ fontSize: 9.5, color: C.faint }}>{ent.source}</span>
                                </div>
                                <div style={{ fontSize: 12.5, color: C.fg, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                  {renderBodyWithPlaceholders(ent.body)}
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEditEntry(ent.source) }}
                                  title="Editar esta regla en el catálogo"
                                  style={{ position: 'absolute', right: 8, bottom: 6, background: 'none', border: 0, color: C.accent, cursor: 'pointer', opacity: 0.8 }}
                                >
                                  <Ico d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Columna Derecha: JIT Inline Editor */}
          {!isMobile && (
            <div style={{ position: 'sticky', top: 14 }}>
              {editTable ? (
                <div style={{ background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: C.accent }} />
                    <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ajuste fino JIT</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.fg, marginBottom: 4 }}>{editLabel}</div>
                  <div style={{ fontSize: 10, color: C.faint, marginBottom: 12 }}>Origen: <code style={{ background: C.soft, padding: '2px 4px', borderRadius: 4 }}>{editTable}.{editField}</code></div>
                  
                  <textarea 
                    value={editVal} 
                    onChange={(e) => setEditVal(e.target.value)} 
                    rows={8}
                    style={{ width: '100%', background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />

                  <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => setEditTable(null)} 
                      style={{ background: 'none', border: `1px solid ${C.soft}`, color: C.dim, borderRadius: 8, fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={saveEdit} 
                      disabled={saving}
                      style={{ background: C.accent, border: 0, color: C.bg, borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '6px 16px', cursor: 'pointer' }}
                    >
                      {saving ? 'Guardando…' : 'Guardar y Aplicar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ color: C.faint, fontSize: 12.5, padding: 14, border: `1px dashed ${C.border}`, borderRadius: 12, textAlign: 'center' }}>
                  Clickeá en un placeholder pintado en azul o en el lápiz de cualquier regla para editar el catálogo en el lugar.
                </div>
              )}

              {/* Presets activos del alumno */}
              {effStudent && presets.length > 0 && (
                <div style={{ marginTop: 14, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: C.dim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Memoria del Alumno (SRS)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {presets.map((p, idx) => (
                      <span key={idx} style={{ fontSize: 10.5, background: C.soft, border: `1px solid ${C.border}`, color: C.fg, padding: '2px 6px', borderRadius: 6 }}>
                        {p.kind}: <b>{p.label}</b> ({p.occurrences} obs)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Loop de Aprendizaje */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: NAT.dinamico }} />
            <div style={{ fontSize: 14, fontWeight: 800 }}>Simulación y Loop de Aprendizaje</div>
          </div>
          <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 12 }}>
            Simulá observaciones en texto libre para esta clase. La IA mapeará la observación a presets en la memoria (SRS) del alumno.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 14, alignItems: 'start' }}>
            <div>
              <textarea 
                value={obsText} 
                onChange={(e) => setObsText(e.target.value)} 
                rows={3} 
                placeholder="Ej: El alumno dudó al decir que perro se dice dog. Tuvo problemas con el vocabulario del topic."
                style={{ width: '100%', background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.45, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={runClass} disabled={running}
                  style={{ background: 'var(--primary)', border: 0, color: 'white', borderRadius: 8, fontSize: 12.5, fontWeight: 700, padding: '7px 16px', cursor: 'pointer' }}>
                  {running ? 'Procesando…' : 'Simular clase (guardar observación)'}
                </button>
                {effStudent && (
                  <button onClick={wipeProfile}
                    style={{ background: 'none', border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, fontSize: 12, padding: '6px 14px', cursor: 'pointer', marginLeft: 'auto' }}>
                    Resetear Memoria
                  </button>
                )}
              </div>
              {lastRun && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, fontSize: 12, color: C.green }}>
                  <b>Última simulación:</b> {lastRun}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Análisis de la simulación</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8 }}>
                {analysis.length === 0 && <span style={{ color: C.faint, fontSize: 11.5 }}>Sin análisis aún.</span>}
                {analysis.map((a, i) => (
                  <div key={i} style={{ fontSize: 11, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
                    <span style={{ color: C.accent, fontWeight: 700 }}>{a.name}</span>: {a.note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

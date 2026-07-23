/* MotorPlaygroundPanel — /motor · PROBADOR + EDITOR del circuito JIT (Motor V2).
 *
 * Elegís un CONTEXTO de prueba (edad × nivel × tópico [× alumno-perfil]) y el motor arma
 * las 9 capas JIT. Tocás una capa → se despliega su panel (acordeón) con sus reglas.
 * Los placeholders como {expected_production} se pintan como badges editables.
 * Al tocar un placeholder o hacer click en el lápiz, editás la plantilla de origen.
 *
 * Clase en VIVO: botón "Iniciar clase" que abre una charla REAL por voz (solo audio,
 * sin imágenes) contra el motor único (ws_motor → compose_proto) con el MISMO combo que
 * se está previsualizando. Loop: ajustar placeholder → guardar → reiniciar clase.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BACKOFFICE_CSS } from './backoffice.css'
import { motorAPI, buildMotorWsUrl, MotorResolve, MotorOverride, MotorPreset, MotorStageNote } from '../services/api'
import { useLiveVoice } from '../hooks/useLiveVoice'
import { useIsMobile } from '../hooks/useIsMobile'

interface Band { band_id: number; code: string; label: string; phase_group?: string; max_level_order?: number }
interface Level { level_code: string; label: string; sort_order: number }
interface Topic { topic_id: number; title: string; segmento?: string }
interface Student { student_id: number; name: string; age?: number; level_code: string }

const C = {
  bg: 'var(--bg-1)',
  panel: 'var(--surface)',
  border: 'var(--border-2)',
  soft: 'var(--bg-2)',
  fg: 'var(--fg-1)',
  dim: 'var(--fg-2)',
  faint: 'var(--fg-3)',
  accent: 'var(--primary)',
  green: 'var(--primary)',
  red: 'var(--danger)',
}

const NAT = {
  fijo: 'var(--fg-3)',
  edad: 'var(--accent)',
  nivel: 'var(--info)',
  dinamico: 'var(--violet)'
}

// Los placeholders se resuelven dinámicamente inspeccionando las propiedades del catálogo cargado.

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

/* Wrapper para la ruta pública /motor (sin AuthGate): el panel usa las CSS vars del
 * backoffice (--bg-1, --surface, ...) que viven scopeadas bajo .bo-root — acá se
 * inyectan standalone. Bajo /admin/motor el Backoffice ya las provee. */
export function MotorPlaygroundStandalone() {
  return (
    <div className="bo-root">
      <style>{BACKOFFICE_CSS}</style>
      <MotorPlaygroundPanel />
    </div>
  )
}

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

  const [band, setBand] = useState('mini')
  const [level, setLevel] = useState('A0')
  const [topicId, setTopicId] = useState<number | undefined>()
  const [studentId, setStudentId] = useState<number | undefined>(14)
  const [profile, setProfile] = useState<{ student_id: number; name: string } | null>(null)

  const [res, setRes] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showXml, setShowXml] = useState(false)
  const [activeLayer, setActiveLayer] = useState('Contexto')
  
  // Estado del JIT inline editor
  const [editTable, setEditTable] = useState<string | null>(null)
  const [editPk, setEditPk] = useState<any>(null)
  const [editField, setEditField] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState<string>('')
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [editIsArray, setEditIsArray] = useState(false)
  const [editRuleId, setEditRuleId] = useState<number | null>(null)

  // loop de aprendizaje
  const [presets, setPresets] = useState<MotorPreset[]>([])
  const [obsText, setObsText] = useState('')
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<MotorStageNote[]>([])

  // Simulación Gemini Real
  const [simulatingGemini, setSimulatingGemini] = useState(false)
  const [geminiStartResponse, setGeminiStartResponse] = useState<string | null>(null)
  const [geminiClosingResponse, setGeminiClosingResponse] = useState<string | null>(null)

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

  // Clase en VIVO — charla REAL por voz (solo audio, sin imágenes) contra el motor
  // único (ws_motor → compose_proto), con el MISMO combo que se está previsualizando.
  const live = useLiveVoice({ onError: (e) => toast.error(`Voz: ${e.message}`) })
  const isLive = live.status === 'connecting' || live.status === 'listening' || live.status === 'speaking'
  const liveTranscriptEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => { liveTranscriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [live.transcript])
  // Cortar la sesión de voz si el usuario navega fuera del panel con la clase abierta.
  const liveStopRef = useRef(live.stop)
  liveStopRef.current = live.stop
  useEffect(() => () => { liveStopRef.current() }, [])

  const startLiveClass = useCallback(async () => {
    const url = buildMotorWsUrl({
      age_group: band, level_code: level, topic_id: topicId ?? 0, student_id: effStudent ?? 0,
      engine: 'gemini_live', model: 'models/gemini-3.1-flash-live-preview', voice: 'Aoede',
    })
    await live.start(0, undefined, 'Aoede', url)
  }, [live, band, level, topicId, effStudent])

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
    const allTopics: Topic[] = []
    catalog.forEach((cat: any) => {
      cat.subcategories?.forEach((sub: any) => {
        sub.topics?.forEach((t: any) => {
          allTopics.push({
            topic_id: t.id || t.topic_id,
            title: t.title,
            segmento: t.segmento
          })
        })
      })
    })
    // Filtrar por segmento y ordenar alfabéticamente
    return allTopics
      .filter((t: any) => {
        if (!t.segmento) return true
        const normSegmento = t.segmento === 'adultos' ? 'adult' : t.segmento
        return normSegmento === band
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [catalog, band])

  // Al cambiar la banda de edad (band) o el nivel, verificar si el tópico sigue siendo válido o seleccionar el primero
  useEffect(() => {
    if (topics.length) {
      const exists = topics.some((t) => t.topic_id === topicId)
      if (!exists) {
        setTopicId(topics[0].topic_id)
      }
    } else {
      setTopicId(undefined)
    }
  }, [band, level, topics, topicId])

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

  const handleSimulateGemini = async (mode: 'start' | 'closing') => {
    if (!res?.prompt) {
      toast.error('No hay prompt compilado para simular')
      return
    }
    setSimulatingGemini(true)
    if (mode === 'start') setGeminiStartResponse(null)
    else setGeminiClosingResponse(null)
    
    try {
      const data = await motorAPI.simulatePreview(res.prompt, mode)
      if (mode === 'start') {
        setGeminiStartResponse(data.response)
      } else {
        setGeminiClosingResponse(data.response)
      }
      toast.success('Respuesta de Gemini recibida')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || `No se pudo simular con Gemini (${mode})`)
    } finally {
      setSimulatingGemini(false)
    }
  }

  const parseAllUniversalRules = (rawText: string): Record<number, string> => {
    if (!rawText) return {}
    const cleanText = rawText.replace(/<\/?(conversation_rules)>/g, '').trim()
    const parsed: Record<number, string> = {}
    let currentNum: number | null = null
    let currentText: string[] = []
    
    const lines = cleanText.split('\n')
    for (let line of lines) {
      const lineStripped = line.trim()
      if (!lineStripped) continue
      
      const m = lineStripped.match(/^(\d+)\.\s*(.*)$/)
      if (m) {
        if (currentNum !== null) {
          parsed[currentNum] = currentText.join('\n').trim()
        }
        currentNum = parseInt(m[1])
        currentText = [m[2]]
      } else {
        if (currentNum !== null) {
          currentText.push(lineStripped)
        }
      }
    }
    if (currentNum !== null) {
      parsed[currentNum] = currentText.join('\n').trim()
    }
    return parsed
  }

  const reconstructUniversalRules = (rawText: string, ruleId: number, newBody: string): string => {
    const parsed = parseAllUniversalRules(rawText)
    parsed[ruleId] = newBody.trim()
    
    const keys = Object.keys(parsed).map(Number).sort((a, b) => a - b)
    const maxKey = keys.length > 0 ? Math.max(...keys) : 16
    
    const lines: string[] = []
    lines.push('<conversation_rules>')
    for (let i = 1; i <= maxKey; i++) {
      const body = parsed[i]
      if (body) {
        const bodyLines = body.split('\n')
        const firstLine = bodyLines[0]
        const restLines = bodyLines.slice(1)
        lines.push(`  ${i}. ${firstLine}`)
        for (let rl of restLines) {
          lines.push(`     ${rl}`)
        }
      }
    }
    lines.push('</conversation_rules>')
    return lines.join('\n')
  }

  const startEditUniversalRule = (ruleId: number) => {
    const row = appConfigRows.find(r => r.config_key === 'universal_conversation_rules')
    const rawRules = row ? row.config_value : ''
    
    const parsed = parseAllUniversalRules(rawRules)
    const ruleBody = parsed[ruleId] || ''
    
    setEditTable('app_config')
    setEditPk({ config_key: 'universal_conversation_rules' })
    setEditField('universal_conversation_rules')
    setEditRuleId(ruleId)
    setEditLabel(`Regla Universal DB #${ruleId}`)
    setEditVal(ruleBody)
    setEditIsArray(false)
  }

  // JIT Editor: arrancar edición de una celda
  const startEditField = (table: string, field: string) => {
    let pk: any = null
    let val: any = ''
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
    } else if (table === 'app_config') {
      pk = { config_key: field }
      val = appConfigRows.find(r => r.config_key === field)?.config_value || ''
    }

    // Si el valor original es un array de Strings o números, lo mostramos uno por línea para facilidad de edición
    const isArr = Array.isArray(val)
    setEditIsArray(isArr)
    if (isArr) {
      val = val.map((item: any) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join('\n')
    } else if (typeof val === 'object' && val !== null) {
      val = JSON.stringify(val, null, 2)
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
    // 1. Mapear alias comunes a nombres reales de columnas/campos de BD
    let field = ph
    if (ph === 'tutor') field = 'tutor_mascot'
    if (ph === 'pedagogical_rules') field = 'pedagogy'

    // 2. Inspeccionar dinámicamente si el campo pertenece a alguna tabla del catálogo
    const hasInStudentTypes = studentTypesRows.length > 0 && field in studentTypesRows[0]
    if (hasInStudentTypes) {
      startEditField('student_types', field)
      return
    }

    const hasInLevels = levelsRows.length > 0 && field in levelsRows[0]
    if (hasInLevels) {
      startEditField('levels', field)
      return
    }

    const hasInTopics = topicsRows.length > 0 && field in topicsRows[0]
    if (hasInTopics) {
      startEditField('topics', field)
      return
    }

    const hasInConfig = appConfigRows.some(r => r.config_key === ph || r.config_key === field)
    if (hasInConfig) {
      startEditField('app_config', field)
      return
    }

    // 3. Fallback para variables de contexto dinámico (no editables en BD)
    if (['name', 'topic', 'first_vocab', 'word'].includes(ph)) {
      toast.info(`El placeholder {${ph}} se calcula dinámicamente en tiempo de ejecución para cada sesión.`)
    } else {
      toast.error(`El placeholder {${ph}} no coincide con ningún campo editable en la base de datos.`)
    }
  }

  const saveEdit = async () => {
    if (!editTable || !editPk || !editField) return
    setSaving(true)
    try {
      let finalVal: any = editVal
      if (editIsArray) {
        // Si el valor era originalmente un Array, convertimos cada línea en un elemento del Array
        finalVal = editVal.split('\n').map(s => s.trim()).filter(Boolean)
        finalVal = finalVal.map((item: string) => {
          if (item.startsWith('{') || item.startsWith('[')) {
            try { return JSON.parse(item) } catch { return item }
          }
          return item
        })
      } else {
        // Fallbacks heredados
        if (editTable === 'topics' && editField === 'keywords') {
          try { finalVal = JSON.parse(editVal) } catch { finalVal = editVal.split(',').map(s => s.trim()).filter(Boolean) }
        }
      }
      
      // Si editamos una regla universal individual, la reconstruimos en la cadena completa de la BD
      if (editTable === 'app_config' && editField === 'universal_conversation_rules' && editRuleId !== null) {
        const row = appConfigRows.find(r => r.config_key === 'universal_conversation_rules')
        const currentRaw = row ? row.config_value : ''
        finalVal = reconstructUniversalRules(currentRaw, editRuleId, editVal)
      }

      // Si editamos app_config, el campo destino es 'config_value'
      const updatePayload = editTable === 'app_config' ? { config_value: finalVal } : { [editField]: finalVal }
      
      await motorAPI.update(editTable, editPk, updatePayload)
      toast.success('Plantilla del catálogo guardada con éxito')
      setEditTable(null)
      setEditRuleId(null)
      loadCatalogData()
      resolve()
    } catch {
      toast.error('No se pudo guardar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  const cleanXmlTags = (text: string) => {
    if (!text) return ''
    return text.replace(/<\/?(conversation_rules|start_execution_command|behavioral_guards|session_actions|output_rules|learner_state|interaction_state|lesson_approach|session_rails)>/g, '').trim()
  }

  // Renderizador JIT de texto con resaltado e interacción de placeholders
  const renderBodyWithPlaceholders = (rawText: string) => {
    if (!rawText) return null
    const text = cleanXmlTags(rawText)
    const regex = /(\{[a-zA-Z0-9_-]+\})/g
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

  const renderUniversalRules = (bodyText: string) => {
    if (!bodyText) return null
    const cleanText = bodyText.replace(/<\/?(conversation_rules)>/g, '').trim()
    const isBloqueA = cleanText.includes("Never repeat your own phrasing") || cleanText.includes("Build each turn")
    const targetIds = isBloqueA ? [1, 2, 3, 12, 16] : [1, 4, 13, 15, 16]
    
    const normalized = cleanText.replace(/(?:^|\n)\s*\d+\.\s*/g, "||RULE_SEP||")
    const rules = normalized.split("||RULE_SEP||").map(r => r.trim()).filter(Boolean)
    
    const blockTitle = isBloqueA 
      ? `Bloque A (Activo porque Edad es "Mini" o Nivel es "A0"/"A1")` 
      : `Bloque B (Activo porque Edad es "${band.toUpperCase()}" y Nivel es "${level}" >= A2)`
      
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
        <div style={{ 
          background: isBloqueA ? 'rgba(124,58,237,0.1)' : 'rgba(59,130,246,0.1)', 
          border: `1px solid ${isBloqueA ? 'var(--violet)' : 'var(--info)'}33`,
          borderRadius: 8, 
          padding: '8px 12px', 
          fontSize: 12, 
          fontWeight: 700,
          color: isBloqueA ? 'var(--violet)' : 'var(--info)'
        }}>
          {blockTitle}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map((ruleText, idx) => {
            const originalId = targetIds[idx] || '?'
            return (
              <div key={idx} style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderLeft: `3px solid ${isBloqueA ? 'var(--violet)' : 'var(--info)'}`,
                borderRight: '1px solid var(--border-2)',
                borderTop: '1px solid var(--border-2)',
                borderBottom: '1px solid var(--border-2)',
                borderRadius: '0 8px 8px 0',
                padding: '10px 12px',
                fontSize: 12.5,
                lineHeight: 1.5
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, color: 'var(--fg-1)', fontSize: 11.5 }}>Regla #{idx + 1} del prompt</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ 
                      fontSize: 9.5, 
                      fontWeight: 700, 
                      background: 'rgba(255,255,255,0.04)', 
                      border: '1px solid var(--border-2)', 
                      padding: '1px 5px', 
                      borderRadius: 4,
                      color: 'var(--fg-2)',
                      fontFamily: 'monospace'
                    }}>
                      Regla DB original: #{originalId}
                    </span>
                    {typeof originalId === 'number' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditUniversalRule(originalId) }}
                        title="Editar esta regla individual en el catálogo"
                        style={{ background: 'none', border: 0, color: C.accent, cursor: 'pointer', opacity: 0.8, padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                      >
                        <Ico d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ color: 'var(--fg-2)' }}>
                  {renderBodyWithPlaceholders(ruleText)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const sel: React.CSSProperties = {
    width: '100%', padding: '6px 8px', borderRadius: 8, background: C.panel, color: C.fg,
    border: `1px solid ${C.border}`, fontSize: 13, height: 34, outline: 'none'
  }

  const meta = res?.meta
  const steps = res?.steps || []

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '18px 16px 64px' }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', border: `1px solid ${C.accent}`, background: 'rgba(0,179,126,0.14)', color: C.accent, marginRight: 6 }}>
              <Ico d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" size={13} /> Actualizar
            </button>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <pre style={{ margin: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.55, color: C.dim, maxHeight: '55vh', overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>
                  {(() => {
                    const prompt = res?.prompt || ''
                    if (!prompt) return '(vacío)'
                    const regex = /(<\/?[a-zA-Z0-9_]+>|[a-zA-Z0-9_-]+:)/g
                    const parts = prompt.split(regex)
                    return parts.map((part: string, idx: number) => {
                      if (part.startsWith('<') && part.endsWith('>')) {
                        return <span key={idx} style={{ color: '#38bdf8', fontWeight: 700 }}>{part}</span>
                      }
                      if (part.endsWith(':') && part.length > 2 && !part.startsWith('http') && !part.startsWith('file')) {
                        return <span key={idx} style={{ color: '#fbbf24', fontWeight: 600 }}>{part}</span>
                      }
                      return part
                    })
                  })()}
                </pre>
                
                {/* Nodo final en la vista XML */}
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, borderLeft: `3px solid ${C.accent}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.fg, marginBottom: 4 }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>&lt;final_prompt&gt;</span>
                    <span>Resultado de la Orquestación</span>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>&lt;/final_prompt&gt;</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.dim, maxHeight: 120, overflowY: 'auto', background: C.soft, padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}>
                    {res?.prompt || '(vacío)'}
                  </div>
                </div>
              </div>
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: C.accent }}>{ent.label}</span>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                    {ent.source && (() => {
                                      const parts = ent.source.split('.')
                                      if (parts.length === 2) {
                                        return (
                                          <div style={{ fontSize: 9.5, color: C.dim }}>
                                            Tabla: <b style={{ fontFamily: 'monospace', color: C.fg }}>{parts[0]}</b> · Campo: <b style={{ fontFamily: 'monospace', color: C.fg }}>{parts[1]}</b>
                                          </div>
                                        )
                                      }
                                      return <span style={{ fontSize: 9.5, color: C.faint }}>{ent.source}</span>
                                    })()}
                                    {(() => {
                                      const src = ent.source || ''
                                      let coupling = ''
                                      let color = C.faint
                                      if (src.startsWith('topics.')) {
                                        coupling = `Acoplamiento: TÓPICO ("${res?.meta?.topic_title || 'este tópico'}")`
                                        color = 'var(--color-blue)'
                                      } else if (src.startsWith('student_types.')) {
                                        coupling = `Acoplamiento: EDAD ("${band.toUpperCase()}")`
                                        color = 'var(--color-warning)'
                                      } else if (src.startsWith('levels.')) {
                                        coupling = `Acoplamiento: NIVEL ("${level}")`
                                        color = 'var(--color-accent)'
                                      } else if (src === 'app_config.universal_conversation_rules') {
                                        coupling = 'Acoplamiento: EDAD / NIVEL (Filtro JIT)'
                                        color = 'var(--violet)'
                                      } else if (src === 'composer_proto._get_behavioral_guards') {
                                        coupling = 'Bloque Estructurado (No editable)'
                                        color = 'var(--violet)'
                                      } else if (src.startsWith('app_config.')) {
                                        coupling = 'Acoplamiento: GLOBAL (Toda la app)'
                                        color = 'var(--danger)'
                                      }
                                      if (!coupling) return null
                                      return (
                                        <span style={{ fontSize: 8.5, fontWeight: 800, color: color, background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}33`, padding: '1px 4px', borderRadius: 4, textTransform: 'uppercase' }}>
                                          {coupling}
                                        </span>
                                      )
                                    })()}
                                  </div>
                                </div>
                                <div style={{ fontSize: 12.5, color: C.fg, lineHeight: 1.55, whiteSpace: 'pre-wrap', paddingRight: 16 }}>
                                  {ent.source === 'app_config.universal_conversation_rules'
                                    ? renderUniversalRules(ent.body)
                                    : renderBodyWithPlaceholders(ent.body)}
                                </div>
                                {ent.source && ent.source.split('.').length === 2 && ent.source !== 'app_config.universal_conversation_rules' && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleEditEntry(ent.source) }}
                                    title="Editar esta regla en el catálogo"
                                    style={{ position: 'absolute', right: 8, bottom: 6, background: 'none', border: 0, color: C.accent, cursor: 'pointer', opacity: 0.8 }}
                                  >
                                    <Ico d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" size={13} />
                                  </button>
                                )}
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
            
            {/* Prompt final compilado abajo de las capas */}
            {res?.prompt && (
              <div style={{ marginTop: 20, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: C.accent }} />
                    <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prompt Final Compilado (Gemini Live)</div>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(res.prompt)
                      toast.success('Prompt copiado al portapapeles')
                    }}
                    style={{ background: 'none', border: `1px solid ${C.soft}`, color: C.accent, borderRadius: 7, fontSize: 11, padding: '3px 9px', cursor: 'pointer' }}
                  >
                    Copiar Prompt
                  </button>
                </div>
                <textarea 
                  readOnly 
                  value={res.prompt} 
                  rows={12}
                  style={{ width: '100%', background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12, lineHeight: 1.5, fontFamily: 'ui-monospace, monospace', resize: 'vertical', boxSizing: 'border-box' }}
                />
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
                  
                  {/* Indicador de acoplamiento dinámico */}
                  {(() => {
                    let typeLabel = ''
                    let desc = ''
                    let badgeBg = ''
                    let badgeFg = ''
                    
                    if (editTable === 'topics') {
                      typeLabel = 'Tópico'
                      desc = `Afecta únicamente al tópico seleccionado: "${res?.meta?.topic_title || 'este tópico'}"`
                      badgeBg = 'rgba(129,140,248,0.15)'
                      badgeFg = '#818cf8'
                    } else if (editTable === 'student_types') {
                      typeLabel = 'Segmento de Edad'
                      desc = `Afecta a todos los alumnos del segmento de edad: "${band.toUpperCase()}"`
                      badgeBg = 'rgba(251,191,36,0.15)'
                      badgeFg = '#fbbf24'
                    } else if (editTable === 'levels') {
                      typeLabel = 'Nivel de Idioma'
                      desc = `Afecta a todas las clases del nivel de idioma: "${level}"`
                      badgeBg = 'rgba(125,211,252,0.15)'
                      badgeFg = '#7dd3fc'
                    } else if (editTable === 'app_config') {
                      if (editField === 'universal_conversation_rules') {
                        typeLabel = 'EDAD / NIVEL (Filtro JIT)'
                        desc = 'Se almacena globalmente pero se filtra y curte al vuelo dinámicamente según la edad y nivel del alumno.'
                        badgeBg = 'rgba(168,85,247,0.15)'
                        badgeFg = '#a855f7'
                      } else {
                        typeLabel = 'Configuración Global'
                        desc = 'Afecta de forma cruzada a toda la aplicación independientemente de la edad o el nivel'
                        badgeBg = 'rgba(248,113,113,0.15)'
                        badgeFg = '#f87171'
                      }
                    }
                    
                    if (!typeLabel) return null
                    
                    return (
                      <div style={{ background: C.soft, borderLeft: `3px solid ${badgeFg}`, padding: '8px 10px', borderRadius: '4px 8px 8px 4px', marginBottom: 12, fontSize: 11.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: badgeFg, background: badgeBg, padding: '1px 5px', borderRadius: 4 }}>
                            Acoplamiento: {typeLabel}
                          </span>
                        </div>
                        <div style={{ color: C.dim, lineHeight: 1.4 }}>{desc}</div>
                      </div>
                    )
                  })()}
                  
                  <textarea 
                    value={editVal} 
                    onChange={(e) => setEditVal(e.target.value)} 
                    rows={8}
                    style={{ width: '100%', background: C.bg, color: C.fg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />

                  <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => { setEditTable(null); setEditRuleId(null); }} 
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Memoria del Alumno (SRS)</div>
                    <button 
                      onClick={wipeProfile}
                      style={{ 
                        background: 'none', border: `1px solid ${C.red}`, color: C.red, 
                        borderRadius: 6, fontSize: 10, fontWeight: 700, padding: '2px 8px', cursor: 'pointer' 
                      }}
                    >
                      Borrar Memoria
                    </button>
                  </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
            {/* Col 1: Loop de aprendizaje (SRS) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: NAT.dinamico }} />
                <div style={{ fontSize: 14, fontWeight: 800 }}>Simulación y Loop de Aprendizaje (SRS)</div>
              </div>
              <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 12 }}>
                Simulá observaciones en texto libre para esta clase. La IA mapeará la observación a presets en la memoria (SRS) del alumno.
              </div>
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

            {/* Col 2: Gemini real start/closing simulator */}
            <div style={{ borderLeft: isMobile ? 'none' : `1px dashed ${C.border}`, paddingLeft: isMobile ? 0 : 20, paddingTop: isMobile ? 20 : 0 }}>
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: C.accent }} />
                <div style={{ fontSize: 14, fontWeight: 800 }}>Simulador de la Charla (Gemini Real)</div>
              </div>
              <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 12 }}>
                Envía el prompt a Gemini para generar la frase de bienvenida inicial o el resumen y feedback de cierre de la clase.
              </div>
              
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button 
                  onClick={() => handleSimulateGemini('start')} 
                  disabled={simulatingGemini || !res?.prompt}
                  style={{ 
                    background: C.accent, border: 0, color: C.bg, borderRadius: 8, 
                    fontSize: 12, fontWeight: 700, padding: '8px 16px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  {simulatingGemini ? (
                    <>
                      <span style={{ border: `2px solid ${C.bg}`, borderTopColor: 'transparent', borderRadius: '50%', width: 12, height: 12, display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      Cargando…
                    </>
                  ) : '▶ Simular Inicio / Bienvenida'}
                </button>

                <button 
                  onClick={() => handleSimulateGemini('closing')} 
                  disabled={simulatingGemini || !res?.prompt}
                  style={{ 
                    background: 'none', border: `1px solid #10b981`, color: '#10b981', borderRadius: 8, 
                    fontSize: 12, fontWeight: 700, padding: '8px 16px', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  {simulatingGemini ? (
                    <>
                      <span style={{ border: `2px solid #10b981`, borderTopColor: 'transparent', borderRadius: '50%', width: 12, height: 12, display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      Cargando…
                    </>
                  ) : '⏹ Simular Cierre / Wrap-up'}
                </button>
              </div>

              {geminiStartResponse && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Frase de bienvenida generada:</div>
                  <div style={{ 
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
                    fontSize: 13, lineHeight: 1.5, color: C.fg, whiteSpace: 'pre-wrap', fontStyle: 'italic'
                  }}>
                    {geminiStartResponse}
                  </div>
                </div>
              )}

              {geminiClosingResponse && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Cierre / Resumen de clase generado:</div>
                  <div style={{ 
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
                    fontSize: 13, lineHeight: 1.5, color: C.fg, whiteSpace: 'pre-wrap', fontStyle: 'italic'
                  }}>
                    {geminiClosingResponse}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clase en VIVO — la prueba real: HABLAR con la orquestación tal cual está */}
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: isLive ? C.red : C.accent }} />
              <div style={{ fontSize: 14, fontWeight: 800 }}>Clase en VIVO (voz real · solo audio)</div>
              {isLive && (
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: live.status === 'speaking' ? C.accent : C.dim, border: `1px solid ${C.border}`, borderRadius: 999, padding: '2px 8px' }}>
                  {live.status === 'connecting' ? 'Conectando…' : live.status === 'speaking' ? 'El profe habla' : 'Te escucha'}
                </span>
              )}
              {isLive && (
                <span style={{ width: 60, height: 6, background: C.soft, borderRadius: 999, overflow: 'hidden', display: 'inline-block' }}>
                  <span style={{ display: 'block', height: '100%', width: `${Math.round(live.audioLevel * 100)}%`, background: C.accent, transition: 'width 80ms linear' }} />
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 10 }}>
              Arranca una charla real por el motor único (ws_motor → compose_proto) con el combo de arriba:{' '}
              <b style={{ color: C.fg }}>{band.toUpperCase()} · {level} · {meta?.topic_title || 'sin tópico'}</b>.
              Los ajustes de placeholders se aplican al iniciar la <b>próxima</b> clase — la que está en curso mantiene su prompt.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {!isLive ? (
                <button onClick={startLiveClass} disabled={loading || !!err}
                  title={err ? 'Este cruce no compone (dato faltante en el catálogo)' : 'Iniciar una clase real por voz con esta orquestación'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.accent, border: 0, color: C.bg, borderRadius: 8, fontSize: 12.5, fontWeight: 800, padding: '8px 18px', cursor: 'pointer', opacity: loading || err ? 0.5 : 1 }}>
                  <Ico d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3" size={14} /> Iniciar clase
                </button>
              ) : (
                <button onClick={live.stop}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, fontSize: 12.5, fontWeight: 800, padding: '8px 18px', cursor: 'pointer' }}>
                  <Ico d="M6 6h12v12H6z" size={13} /> Terminar clase
                </button>
              )}
              {!isLive && live.status === 'ended' && live.transcript.length > 0 && (
                <span style={{ fontSize: 11.5, color: C.dim }}>Clase terminada — ajustá lo que haga falta y volvé a iniciar.</span>
              )}
            </div>
            {(isLive || live.transcript.length > 0) && (
              <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {live.transcript.length === 0 && <div style={{ fontSize: 12, color: C.faint, fontStyle: 'italic' }}>Esperando al profe…</div>}
                {live.transcript.map((l, i) => (
                  <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    <b style={{ color: l.who === 'ai' ? C.accent : 'var(--info)' }}>{l.who === 'ai' ? 'Profe' : 'Vos'}:</b>{' '}
                    <span style={{ color: C.fg }}>{l.text}</span>
                  </div>
                ))}
                <div ref={liveTranscriptEndRef} />
              </div>
            )}
          </div>

          {/* Fila de análisis de SRS */}
          {analysis.length > 0 && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Análisis de la simulación de memoria</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8 }}>
                {analysis.map((a, i) => (
                  <div key={i} style={{ fontSize: 11, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
                    <span style={{ color: C.accent, fontWeight: 700 }}>{a.name}</span>: {a.note}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

/* AdminTimelinePanel — la MESA DE CONTROL del motor de 9 pasos.
 *
 * Una sola pantalla = editor + preview en vivo. Elegís segmento + nivel (+ coach,
 * tópico) y ves los 9 pasos como un timeline VERTICAL. Cada paso:
 *   - estático (pedagogía, forma, currículum, idioma, seeds, toggles) → editás la línea ahí mismo;
 *   - multi-elemento (tópico) → lo elegís arriba; el vocab se edita en el editor de tópicos.
 * Al costado, un panel de GUÍA PEDAGÓGICA por paso (qué es, por qué importa, ejemplo, tip)
 * y, en la otra pestaña, el PROMPT compuesto en vivo (se recalcula al guardar).
 *
 * La orquestación NO se persiste: es función pura del catálogo + memoria del alumno,
 * calculada en tiempo real. Acá editás el CATÁLOGO; el prompt se compone solo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Play } from 'lucide-react'
import api from '../services/api'
import ClassTester from './ClassTester'
import { useIsMobile } from '../hooks/useIsMobile'

/* ── tipos ── */
interface St {
  slug: string; name: string; tutor_mascot: string; tutor_identity: string; tutor_tonal_rules: string
  session_focus: string; pedagogy: string; form_rules: string
  opening_seed: string; continuation_seed: string; closing_seed: string
}
interface Lvl {
  id: number; code: string; friendly_name: string; language_rule: string
  curriculum_grammar: string; expected_production: string; vocab_depth: string; duration_base_minutes: number | null
}
interface Cfg { key: string; value: string; kind: string; section: string; label: string }
interface Coach { id: number; name: string; gender: string; voice_name: string }
interface Top { id: number; title: string }
interface Block { n: number | string; name: string; source: string; loaded: boolean; preview: string }
interface Resolved {
  prompt: string; blocks: Block[]; loaded_count: number; total: number
  resolved: { student_type: string; coach: string | null; level: string; level_name: string | null; topic: string | null }
}

/* ── guía pedagógica por paso (módulo de consejos) ── */
interface Guide { title: string; what: string; why: string; example?: string; tip: string }
const GUIDE: Record<string, Guide> = {
  '1': {
    title: 'Contexto de runtime',
    what: 'La fecha de hoy, el idioma que aprende el alumno, su lengua materna y que es voz/móvil.',
    why: 'Le da al modelo el marco mínimo. La fecha evita que invente otra; el par de idiomas fija la mezcla ES/EN.',
    example: 'Target_Language: English · Native_Language: Spanish',
    tip: 'No se edita: sale del sistema y del perfil del alumno.',
  },
  '2': {
    title: 'Perfil del tutor (quién enseña)',
    what: 'El personaje del tutor para este segmento: nombre/mascota, identidad y reglas de tono.',
    why: 'Un personaje cálido y coherente sostiene el vínculo. Mismo nivel, distinta voz según la edad.',
    example: 'Name: HABI · Identity: profe amiga, cálida y paciente',
    tip: 'Es PERSONALIDAD, no pedagogía (el cómo enseña va en el paso 3). Si elegís un coach, su persona pisa esto.',
  },
  '3': {
    title: 'Reglas pedagógicas (cómo enseña)',
    what: 'El método del segmento: gamificación, manejo del error, gramática explícita o implícita.',
    why: 'El mismo contenido se entrega distinto a un nene que a un adulto. Acá vive ESE cómo (eje EDAD).',
    example: '0% gramática explícita; celebrá el esfuerzo real, nunca mientas; modelá y volvé a pedir.',
    tip: 'Nada de conducta puntual con "if". Si una regla es del nivel, va en el paso 6.1; si es de forma, en el 6.',
  },
  '4': {
    title: 'Foco / dinámica de la sesión',
    what: 'El mundo lúdico del segmento (aventura, misión con opciones A/B, challenges, charla real).',
    why: 'Le da una forma de juego apropiada a la edad para sostener la atención.',
    example: 'Aventura en el mundo del tópico: el chico y el tutor exploran juntos.',
    tip: 'Es la envoltura lúdica; el contenido (qué se aprende) lo fija el nivel, no esto.',
  },
  '5': {
    title: 'Perfil del alumno',
    what: 'El alumno concreto: nombre, segmento y nivel.',
    why: 'Personaliza el saludo y ancla edad/nivel. Sale de la ficha del alumno (users).',
    tip: 'Acá previsualizás con un alumno ficticio; en vivo sale del perfil real. No se edita en esta pantalla.',
  },
  '6': {
    title: 'Reglas de forma (por edad)',
    what: 'Cómo produce y se corrige el alumno según su edad, sin infantilizar de más.',
    why: 'Apila con el nivel. Ej (mini A0): "el alumno repite la frase completa, perro se dice dog", no la palabra suelta.',
    tip: 'La regla de la frase-puente A0 vive sobre todo en el paso 6.1 (nivel); acá va la forma del segmento.',
  },
  '6.1': {
    title: 'Currículum del nivel (qué se aprende)',
    what: 'El QUÉ del nivel: idioma ES/EN, gramática del nivel, producción esperada y profundidad de vocab.',
    why: 'Universal por nivel: un B2 aprende voz pasiva tenga 8 o 90 años. Acá vive la regla A0 de la frase-puente (>1s).',
    example: 'A0 → "el alumno produce SIEMPRE la frase-puente perro se dice dog, nunca la palabra suelta (el ASR no la capta)".',
    tip: 'Si una regla aplica a CUALQUIER edad en este nivel, va acá. La regresión de A0 se arregla en expected_production.',
  },
  '6.2': {
    title: 'Reglas de salida / seguridad',
    what: 'Blindajes de runtime: emojis solo a pantalla, tolerancia al ASR, guard de seguridad infantil, cierre sin contenido nuevo.',
    why: 'Reglas transversales que no dependen de edad ni nivel. Se prenden/apagan sin tocar código.',
    tip: 'El cierre suave universal (no abrir tema nuevo al cerrar) vive acá: closing_no_new_content.',
  },
  '7': {
    title: 'Vocabulario de la clase',
    what: 'El léxico del tópico: palabras y frases-ancla, recortadas por la profundidad del nivel.',
    why: 'El tópico es agnóstico al nivel; la dosis la pone vocab_depth (basic = solo la 1ª frase clave).',
    tip: 'Elegí el tópico arriba. Para editar su vocab/keywords, andá al editor de tópicos.',
  },
  '8': {
    title: 'Hilo narrativo (opcional)',
    what: 'La espina de la historia curada para el tópico. Opcional: si no hay curaduría, se omite.',
    why: 'Da hilo narrativo a las clases de kids cuando existe; nunca se inventa un fallback.',
    tip: 'Hoy se omite salvo tópicos curados. No bloquea la clase.',
  },
  '9': {
    title: 'Comando de arranque',
    what: 'Cómo abre la clase: saludo + presentación del tópico + gancho.',
    why: 'La primera frase marca el tono. Usa placeholders {name}, {topic}, {first_vocab}.',
    example: 'Saludá a {name} con energía y presentá el mundo de hoy ({topic}) con un gancho corto.',
    tip: 'Es semilla, no verbatim: el modelo la adapta. Es del segmento (eje EDAD).',
  },
  '9.1': {
    title: 'Desarrollo y cierre',
    what: 'La regla de cada turno (desarrollo) y la acción de cierre suave.',
    why: 'El cierre nunca corta de golpe: reconoce lo hecho y ofrece seguir un rato o descansar.',
    tip: 'El cierre suave es principio universal; la forma concreta la pone el segmento.',
  },
}

/* ── qué edita cada paso (por n) y contra qué tabla ── */
type FieldKind = 'input' | 'textarea' | 'select'
interface EditField { key: string; label: string; kind: FieldKind; options?: { v: string; l: string }[] }
interface EditSpec { target: 'segment' | 'level' | 'config' | 'topic' | 'readonly'; fields?: EditField[]; note?: string }
const EDIT: Record<string, EditSpec> = {
  '1': { target: 'readonly', note: 'Sale del sistema + perfil del alumno.' },
  '2': { target: 'segment', fields: [
    { key: 'tutor_mascot', label: 'Nombre / mascota', kind: 'input' },
    { key: 'tutor_identity', label: 'Identidad (quién es)', kind: 'textarea' },
    { key: 'tutor_tonal_rules', label: 'Reglas tonales (cómo habla)', kind: 'textarea' },
  ] },
  '3': { target: 'segment', fields: [{ key: 'pedagogy', label: 'Método pedagógico', kind: 'textarea' }] },
  '4': { target: 'segment', fields: [{ key: 'session_focus', label: 'Foco / mundo de la sesión', kind: 'textarea' }] },
  '5': { target: 'readonly', note: 'Sale del perfil del alumno (users). No se edita acá.' },
  '6': { target: 'segment', fields: [{ key: 'form_rules', label: 'Reglas de forma (por edad)', kind: 'textarea' }] },
  '6.1': { target: 'level', fields: [
    { key: 'language_rule', label: 'Regla de idioma (ES/EN)', kind: 'textarea' },
    { key: 'curriculum_grammar', label: 'Currículum gramatical', kind: 'textarea' },
    { key: 'expected_production', label: 'Producción esperada', kind: 'textarea' },
    { key: 'vocab_depth', label: 'Profundidad de vocab', kind: 'select', options: [{ v: 'basic', l: 'basic (solo 1ª frase)' }, { v: 'full', l: 'full (todas)' }] },
  ] },
  '6.2': { target: 'config' },
  '7': { target: 'topic', note: 'Elegí el tópico arriba. El vocab se edita en el editor de tópicos.' },
  '8': { target: 'readonly', note: 'Curaduría por tópico (opcional). Se omite si no hay.' },
  '9': { target: 'segment', fields: [{ key: 'opening_seed', label: 'Semilla de apertura', kind: 'textarea' }] },
  '9.1': { target: 'segment', fields: [
    { key: 'continuation_seed', label: 'Desarrollo (regla de cada turno)', kind: 'textarea' },
    { key: 'closing_seed', label: 'Cierre suave', kind: 'textarea' },
  ] },
}

const CFG_KEYS = ['voice_emojis_screen_only', 'asr_low_confidence_retry', 'kid_safety_guard', 'adult_stay_on_frame', 'closing_no_new_content']

/* ── estilos ── */
const FIELD: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 9, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 13, fontFamily: 'inherit' }
const LBL: React.CSSProperties = { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 5 }
const SAVE: React.CSSProperties = { padding: '7px 14px', borderRadius: 999, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#22c55e', color: '#06120a' }
const GHOST: React.CSSProperties = { padding: '8px 12px', borderRadius: 9, border: '1px solid #232936', background: '#11151d', color: '#9aa3af', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }

function nKey(n: number | string): string { return String(n) }

export default function AdminTimelinePanel() {
  const [studentTypes, setStudentTypes] = useState<St[]>([])
  const [levels, setLevels] = useState<Lvl[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [topics, setTopics] = useState<Top[]>([])
  const [config, setConfig] = useState<Cfg[]>([])

  const [seg, setSeg] = useState('mini')
  const [level, setLevel] = useState('A0')
  const [coachId, setCoachId] = useState<number | undefined>(undefined)
  const [topicId, setTopicId] = useState<number | undefined>(undefined)

  const [res, setRes] = useState<Resolved | null>(null)
  const [focus, setFocus] = useState<string>('6.1')
  const [tab, setTab] = useState<'guia' | 'prompt' | 'probar'>('guia')
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  // Crear nivel / segmento nuevo (queda vacío → el timeline lo marca en rojo para llenar).
  const [creating, setCreating] = useState<'level' | 'segment' | null>(null)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const isMobile = useIsMobile()

  const segData = useMemo(() => studentTypes.find((s) => s.slug === seg), [studentTypes, seg])
  const lvlData = useMemo(() => levels.find((l) => l.code === level), [levels, level])

  const loadMasters = useCallback(() => {
    api.get('/methodology-modules/student-types').then((r) => setStudentTypes(r.data)).catch(() => {})
    api.get('/levels').then((r) => setLevels(r.data)).catch(() => {})
    api.get('/topics').then((r) => setTopics(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch(() => {})
    api.get('/config').then((r) => setConfig(r.data)).catch(() => {})
  }, [])
  useEffect(() => { loadMasters() }, [loadMasters])

  useEffect(() => {
    api.get('/coaches', { params: { student_type: seg } }).then((r) => { setCoaches(r.data); setCoachId(r.data[0]?.id) }).catch(() => setCoaches([]))
  }, [seg])

  const resolve = useCallback(() => {
    api.get('/orchestrator/resolve', { params: { student_type: seg, coach_id: coachId, level, topic_id: topicId } })
      .then((r) => setRes(r.data)).catch(() => setRes(null))
  }, [seg, coachId, level, topicId])
  useEffect(() => { resolve() }, [resolve])

  // Seed de los drafts editables cuando cambia el segmento/nivel/config seleccionado.
  useEffect(() => {
    const d: Record<string, string> = {}
    if (segData) for (const k of ['tutor_mascot', 'tutor_identity', 'tutor_tonal_rules', 'session_focus', 'pedagogy', 'form_rules', 'opening_seed', 'continuation_seed', 'closing_seed'])
      d[`segment:${k}`] = (segData as unknown as Record<string, string>)[k] || ''
    if (lvlData) for (const k of ['language_rule', 'curriculum_grammar', 'expected_production', 'vocab_depth'])
      d[`level:${k}`] = (lvlData as unknown as Record<string, string>)[k] || ''
    setDrafts(d)
  }, [segData, lvlData])

  const cfgVal = (key: string) => config.find((c) => c.key === key)?.value === 'true'

  const saveSegment = async (fields: EditField[]) => {
    if (!segData) return
    const body: Record<string, string> = {}
    for (const f of fields) body[f.key] = drafts[`segment:${f.key}`] ?? ''
    try {
      await api.patch(`/methodology-modules/student-types/${segData.slug}`, body)
      toast.success('Guardado'); loadMasters(); resolve()
    } catch { toast.error('No se pudo guardar') }
  }
  const saveLevel = async (fields: EditField[]) => {
    if (!lvlData) return
    const body: Record<string, string> = {}
    for (const f of fields) body[f.key] = drafts[`level:${f.key}`] ?? ''
    try {
      await api.patch(`/levels/${lvlData.id}`, body)
      toast.success('Guardado'); loadMasters(); resolve()
    } catch { toast.error('No se pudo guardar') }
  }
  const toggleCfg = async (key: string) => {
    const next = cfgVal(key) ? 'false' : 'true'
    setConfig((prev) => prev.map((c) => (c.key === key ? { ...c, value: next } : c)))
    try { await api.patch(`/config/${key}`, { value: next }); resolve() }
    catch { toast.error('No se pudo guardar'); loadMasters() }
  }

  const createNew = async () => {
    const code = newCode.trim(); const name = newName.trim()
    if (!code || !name) { toast.error('Completá código y nombre'); return }
    try {
      if (creating === 'level') {
        await api.post('/levels', { code, friendly_name: name })
        api.get('/levels').then((r) => setLevels(r.data)).catch(() => {})
        setLevel(code)
      } else {
        const slug = code.toLowerCase()
        await api.post('/methodology-modules/student-types', { slug, name })
        api.get('/methodology-modules/student-types').then((r) => setStudentTypes(r.data)).catch(() => {})
        setSeg(slug)
      }
      toast.success('Creado — ahora completá sus campos en rojo en el timeline')
      setCreating(null); setNewCode(''); setNewName('')
    } catch { toast.error('No se pudo crear (¿ya existe ese código?)') }
  }

  const blocks = res?.blocks ?? []
  const guide = GUIDE[focus]

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '22px 20px 64px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Mesa de control · orquestación de 9 pasos</h1>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 16px', maxWidth: 820 }}>
          Editás el <b>catálogo</b> de cada paso y el prompt se <b>compone solo</b> (no se persiste: es tiempo real, depende del catálogo + la memoria del alumno).
          Elegí segmento y nivel; tocá un paso para ver su guía al costado.
        </p>

        {/* selectores */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 150px', minWidth: 0 }}><div style={LBL}>Segmento (edad)</div>
            <select style={{ ...FIELD, width: '100%' }} value={seg} onChange={(e) => setSeg(e.target.value)}>
              {studentTypes.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select></div>
          <div style={{ flex: '1 1 120px', minWidth: 0 }}><div style={LBL}>Nivel</div>
            <select style={{ ...FIELD, width: '100%' }} value={level} onChange={(e) => setLevel(e.target.value)}>
              {levels.map((l) => <option key={l.code} value={l.code}>{l.code} — {l.friendly_name}</option>)}
            </select></div>
          <div style={{ flex: '1 1 140px', minWidth: 0 }}><div style={LBL}>Coach</div>
            <select style={{ ...FIELD, width: '100%' }} value={coachId ?? ''} onChange={(e) => setCoachId(Number(e.target.value))}>
              {coaches.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.gender})</option>)}
            </select></div>
          <div style={{ flex: '2 1 200px', minWidth: 0 }}><div style={LBL}>Tópico (preview bloque 7)</div>
            <select style={{ ...FIELD, width: '100%' }} value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">(sin tópico)</option>
              {topics.slice(0, 200).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select></div>
          {res && <div style={{ marginLeft: isMobile ? 0 : 'auto', fontSize: 12, color: '#9aa3af' }}>
            Cargados <b style={{ color: '#22c55e' }}>{res.loaded_count}</b>/{res.total}
          </div>}
        </div>

        {/* crear nivel / segmento nuevo */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          {creating === null ? (
            <>
              <button style={GHOST} onClick={() => { setCreating('segment'); setNewCode(''); setNewName('') }}>+ Nuevo segmento</button>
              <button style={GHOST} onClick={() => { setCreating('level'); setNewCode(''); setNewName('') }}>+ Nuevo nivel</button>
            </>
          ) : (
            <>
              <input style={{ ...FIELD, flex: '1 1 130px', minWidth: 0 }} placeholder={creating === 'level' ? 'Código (ej C3)' : 'Slug (ej senior)'} value={newCode} onChange={(e) => setNewCode(e.target.value)} />
              <input style={{ ...FIELD, flex: '2 1 180px', minWidth: 0 }} placeholder={creating === 'level' ? 'Nombre amigable (ej Sabio)' : 'Nombre (ej Senior 65+)'} value={newName} onChange={(e) => setNewName(e.target.value)} />
              <button style={SAVE} onClick={createNew}>Crear {creating === 'level' ? 'nivel' : 'segmento'}</button>
              <button style={GHOST} onClick={() => setCreating(null)}>Cancelar</button>
              <span style={{ fontSize: 11.5, color: '#6b7280' }}>Queda vacío; lo completás en los pasos (en rojo).</span>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.55fr) minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
          {/* ── TIMELINE VERTICAL ── */}
          <div style={{ position: 'relative', paddingLeft: 26 }}>
            <div style={{ position: 'absolute', left: 9, top: 8, bottom: 8, width: 2, background: '#1c2230' }} />
            {blocks.map((b) => {
              const k = nKey(b.n)
              const spec = EDIT[k] || { target: 'readonly' as const }
              const active = focus === k
              return (
                <div key={k} style={{ position: 'relative', marginBottom: 12 }}>
                  <div style={{ position: 'absolute', left: -22, top: 16, width: 12, height: 12, borderRadius: 999, background: b.loaded ? '#22c55e' : '#ef4444', border: '2px solid #0b0e14', boxShadow: active ? '0 0 0 3px rgba(56,189,248,.4)' : 'none' }} />
                  <div onClick={() => { setFocus(k); setTab('guia') }}
                    style={{ background: '#11151d', border: `1px solid ${active ? '#38bdf8' : '#232936'}`, borderRadius: 12, padding: 14, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>{b.n}</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{(GUIDE[k]?.title) || b.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: b.loaded ? '#22c55e' : '#fca5a5' }}>{b.loaded ? 'CARGADO' : 'FALTA'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#5b6473', fontFamily: 'monospace', marginBottom: spec.fields || spec.target === 'config' ? 10 : 0 }}>{b.source}</div>

                    {/* editor inline según el tipo de paso */}
                    {spec.fields && (
                      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {spec.fields.map((f) => {
                          const dk = `${spec.target}:${f.key}`
                          return (
                            <div key={f.key}>
                              <div style={LBL}>{f.label}</div>
                              {f.kind === 'textarea' ? (
                                <textarea style={{ ...FIELD, minHeight: 60, resize: 'vertical' }} value={drafts[dk] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [dk]: e.target.value }))} />
                              ) : f.kind === 'select' ? (
                                <select style={FIELD} value={drafts[dk] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [dk]: e.target.value }))}>
                                  <option value="">—</option>
                                  {f.options?.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                                </select>
                              ) : (
                                <input style={FIELD} value={drafts[dk] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [dk]: e.target.value }))} />
                              )}
                            </div>
                          )
                        })}
                        <div>
                          <button style={SAVE} onClick={() => (spec.target === 'level' ? saveLevel(spec.fields!) : saveSegment(spec.fields!))}>Guardar paso</button>
                        </div>
                      </div>
                    )}

                    {spec.target === 'config' && (
                      <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {CFG_KEYS.map((key) => {
                          const c = config.find((x) => x.key === key)
                          const on = cfgVal(key)
                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                              <span style={{ fontSize: 12.5, color: '#cbd5e1' }}>{c?.label || key}</span>
                              <button onClick={() => toggleCfg(key)} style={{ width: 42, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? '#22c55e' : '#232936', position: 'relative', flexShrink: 0 }}>
                                <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 18, height: 18, borderRadius: 999, background: '#fff', transition: 'left .15s' }} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {spec.target === 'readonly' && spec.note && <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{spec.note}</div>}
                    {spec.target === 'topic' && <div style={{ fontSize: 12, color: '#6b7280' }}>{spec.note} <a href="/admin/topicos" style={{ color: '#38bdf8' }}>Ir al editor ↗</a></div>}
                  </div>
                </div>
              )
            })}
            {blocks.length > 0 && (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{ position: 'absolute', left: -22, top: 16, width: 12, height: 12, borderRadius: 999, background: '#22c55e', border: '2px solid #0b0e14' }} />
                <div onClick={() => setTab('probar')}
                  style={{ background: 'linear-gradient(180deg, #0e2a1c, #11151d)', border: '1px solid #22c55e', borderRadius: 12, padding: 14, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Play size={15} color="#22c55e" />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Paso final · Ejecución — probar la clase</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#22c55e', fontWeight: 700 }}>abrir probador →</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Corré la clase real (voz) para {seg} · {level} con lo último que guardaste, sin salir de acá.
                  </div>
                </div>
              </div>
            )}
            {blocks.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>Resolviendo…</div>}
          </div>

          {/* ── PANEL DERECHO: guía pedagógica / prompt en vivo ── */}
          <div style={{ position: 'sticky', top: 16 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {([['guia', 'Guía'], ['prompt', 'Prompt'], ['probar', 'Probar clase']] as const).map(([tk, lbl]) => (
                <button key={tk} onClick={() => setTab(tk)} style={{ flex: 1, padding: '8px 8px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: tab === tk ? (tk === 'probar' ? '#0e2a1c' : '#172033') : '#11151d', color: tab === tk ? (tk === 'probar' ? '#22c55e' : '#7dd3fc') : '#9aa3af' }}>
                  {lbl}
                </button>
              ))}
            </div>

            {tab === 'probar' && <ClassTester ageGroup={seg} level={level} />}

            {tab === 'guia' && guide && (
              <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Paso {focus}</div>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>{guide.title}</div>
                <Sect label="¿Qué es?" text={guide.what} />
                <Sect label="¿Por qué importa?" text={guide.why} />
                {guide.example && <Sect label="Ejemplo" text={guide.example} mono />}
                <div style={{ background: 'rgba(56,189,248,.08)', border: '1px solid rgba(56,189,248,.2)', borderRadius: 10, padding: '10px 12px', marginTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#7dd3fc', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Tip</div>
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{guide.tip}</div>
                </div>
              </div>
            )}

            {tab === 'prompt' && (
              <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: '#9aa3af' }}>{res?.resolved.student_type} · {res?.resolved.level} · {res?.resolved.topic ?? 'sin tópico'}</div>
                  <a href="/lab/llm" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#22c55e', textDecoration: 'none' }}>Probar en /lab/llm ↗</a>
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.5, color: '#cbd5e1', background: '#0b0e14', border: '1px solid #1c2230', borderRadius: 10, padding: 12, maxHeight: '70vh', overflowY: 'auto', fontFamily: 'monospace' }}>
                  {res?.prompt || '(resolviendo…)'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Sect({ label, text, mono }: { label: string; text: string; mono?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#9aa3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.55, fontFamily: mono ? 'monospace' : 'inherit' }}>{text}</div>
    </div>
  )
}

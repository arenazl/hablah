/**
 * /admin/orquestador — El CENTRO de la app: editor visual de la orquestación.
 *
 * El profe ARRASTRA piezas (coach, enfoque, nivel, tópico) desde la paleta a las
 * ranuras de la clase. El motor arma los 9 pasos (orden FIJO = determinismo) y el
 * prompt se ve en vivo a la derecha. Lenguaje de profe, nunca tabla.columna.
 * (doc 11 §0/§2 — preview en vivo, E/P/D, conversación-first)
 */
import { useCallback, useEffect, useState } from 'react'
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import api from '../services/api'

interface St { slug: string; name: string }
interface Coach { id: number; name: string; gender: string; voice_name: string }
interface Lvl { code: string; friendly_name: string }
interface Top { id: number; title: string }
interface Block { n: number; name: string; source: string; loaded: boolean; preview: string }
interface Resolved { prompt: string; blocks: Block[]; loaded_count: number; total: number }

/* nombre técnico del bloque -> lenguaje de profe + dónde se edita */
const STEP_LABEL: Record<string, { label: string; help: string; edit?: string }> = {
  runtime_context: { label: 'Contexto', help: 'Fecha e idiomas de la clase' },
  tutor_profile: { label: 'Quién enseña', help: 'El coach: nombre, tono, personalidad', edit: '/admin/abms' },
  pedagogical_rules: { label: 'Cómo enseña', help: 'El estilo pedagógico del segmento', edit: '/admin/metodologia' },
  gamification_focus: { label: 'La dinámica', help: 'El juego/enfoque de la sesión', edit: '/admin/metodologia' },
  student_profile: { label: 'El alumno', help: 'Nombre, edad, nivel' },
  'behavioral_guards (riel)': { label: 'Las reglas del nivel', help: 'Qué puede y qué no decir el coach', edit: '/admin/metodologia' },
  language_rule: { label: 'Idioma por nivel', help: 'El "ahora vos" vs "now you"', edit: '/admin/abms' },
  output_rules: { label: 'Reglas de salida', help: 'Voz, ASR, seguridad, validador', edit: '/admin/reglas' },
  current_lesson_vocabulary: { label: 'De qué se habla', help: 'El tópico y sus palabras ancla', edit: '/admin/topicos' },
  story_timeline: { label: 'La historia', help: 'El escenario de la clase' },
  start_execution_command: { label: 'Cómo arranca', help: 'La apertura de la clase', edit: '/admin/metodologia' },
  session_actions: { label: 'Desarrollo y cierre', help: 'La regla de cada turno + el cierre', edit: '/admin/metodologia' },
}

/* ── estilos ─────────────────────────────────────────────────────────────── */
const COL: React.CSSProperties = { background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 14 }
const LBL: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 10, fontWeight: 700 }

/* ── pieza arrastrable ───────────────────────────────────────────────────── */
function Piece({ id, kind, label, sub }: { id: string; kind: string; label: string; sub?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { kind } })
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      style={{
        padding: '8px 10px', borderRadius: 9, border: '1px solid #2a3140', background: isDragging ? '#1c2740' : '#0b0e14',
        color: '#e6e8ec', fontSize: 12.5, cursor: 'grab', marginBottom: 6, opacity: isDragging ? 0.5 : 1, userSelect: 'none',
      }}
    >
      <div style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9aa3af', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

/* ── ranura que recibe una pieza ─────────────────────────────────────────── */
function Slot({ id, kind, title, value, onClear }: { id: string; kind: string; title: string; value?: string; onClear: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { kind } })
  return (
    <div ref={setNodeRef} style={{
      border: `1.5px dashed ${isOver ? '#38bdf8' : value ? '#2a7d5f' : '#2a3140'}`,
      background: isOver ? 'rgba(56,189,248,0.10)' : value ? 'rgba(34,197,94,0.06)' : '#0b0e14',
      borderRadius: 10, padding: '10px 12px', marginBottom: 8, transition: 'all .12s',
    }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, color: '#9aa3af' }}>{title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 3 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: value ? '#e6e8ec' : '#5b6473' }}>{value || 'arrastrá una pieza acá'}</div>
        {value && <button onClick={onClear} style={{ background: 'none', border: 0, color: '#9aa3af', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>}
      </div>
    </div>
  )
}

export default function AdminPromptBuilderPanel() {
  const [studentTypes, setStudentTypes] = useState<St[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [levels, setLevels] = useState<Lvl[]>([])
  const [topics, setTopics] = useState<Top[]>([])
  const [topicQ, setTopicQ] = useState('')

  const [st, setSt] = useState<string | undefined>(undefined)
  const [coachId, setCoachId] = useState<number | undefined>(undefined)
  const [level, setLevel] = useState<string | undefined>(undefined)
  const [topicId, setTopicId] = useState<number | undefined>(undefined)
  const [res, setRes] = useState<Resolved | null>(null)
  const [saved, setSaved] = useState<{ id: number; name: string; student_type: string; coach_id: number | null; level: string; topic_id: number | null }[]>([])
  const [orchName, setOrchName] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    api.get('/methodology-modules/student-types').then((r) => setStudentTypes(r.data)).catch(() => {})
    api.get('/levels').then((r) => setLevels(r.data)).catch(() => {})
    api.get('/topics').then((r) => setTopics(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!st) { setCoaches([]); return }
    api.get('/coaches', { params: { student_type: st } }).then((r) => setCoaches(r.data)).catch(() => setCoaches([]))
  }, [st])

  const resolve = useCallback(() => {
    if (!st || !level) { setRes(null); return }
    api.get('/orchestrator/resolve', { params: { student_type: st, coach_id: coachId, level, topic_id: topicId } })
      .then((r) => setRes(r.data)).catch(() => setRes(null))
  }, [st, coachId, level, topicId])
  useEffect(() => { resolve() }, [resolve])

  const loadSaved = useCallback(() => {
    api.get('/orchestrator/saved').then((r) => setSaved(r.data)).catch(() => {})
  }, [])
  useEffect(() => { loadSaved() }, [loadSaved])

  const saveCurrent = () => {
    if (!orchName.trim() || !st || !level) return
    api.post('/orchestrator/saved', { name: orchName.trim(), student_type: st, coach_id: coachId ?? null, level, topic_id: topicId ?? null })
      .then(() => { setOrchName(''); loadSaved() }).catch(() => {})
  }
  const applySaved = (o: { student_type: string; coach_id: number | null; level: string; topic_id: number | null }) => {
    setSt(o.student_type); setCoachId(o.coach_id ?? undefined); setLevel(o.level); setTopicId(o.topic_id ?? undefined)
  }
  const deleteSaved = (id: number) => {
    api.delete(`/orchestrator/saved/${id}`).then(() => loadSaved()).catch(() => {})
  }

  const onDragEnd = (e: DragEndEvent) => {
    const overKind = e.over?.data?.current?.kind
    const dragKind = e.active?.data?.current?.kind
    if (!e.over || overKind !== dragKind) return
    const [kind, val] = String(e.active.id).split(':')
    if (kind === 'segment') { setSt(val); setCoachId(undefined) }
    else if (kind === 'coach') setCoachId(Number(val))
    else if (kind === 'level') setLevel(val)
    else if (kind === 'topic') setTopicId(Number(val))
  }

  const stName = studentTypes.find((s) => s.slug === st)?.name
  const coachName = coaches.find((c) => c.id === coachId)?.name
  const lvlName = levels.find((l) => l.code === level)?.friendly_name
  const topName = topics.find((t) => t.id === topicId)?.title
  const ql = topicQ.trim().toLowerCase()
  const topFiltered = (ql ? topics.filter((t) => t.title.toLowerCase().includes(ql)) : topics).slice(0, 40)

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '22px 20px 64px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Orquestador — armá la clase</h1>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 14px' }}>
          Arrastrá las piezas a la clase. El motor arma los 9 pasos (en orden fijo) y el prompt se ve en vivo a la derecha.
        </p>

        {/* Guardar / reusar clases armadas */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16, padding: '10px 12px', background: '#11151d', border: '1px solid #232936', borderRadius: 12 }}>
          <input value={orchName} onChange={(e) => setOrchName(e.target.value)} placeholder="Nombre de la clase…"
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 12.5, minWidth: 180 }} />
          <button onClick={saveCurrent} disabled={!orchName.trim() || !st || !level}
            style={{ padding: '7px 12px', borderRadius: 8, border: 0, background: (!orchName.trim() || !st || !level) ? '#26303f' : '#22c55e', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: (!orchName.trim() || !st || !level) ? 'default' : 'pointer' }}>
            Guardar clase
          </button>
          {saved.length > 0 && <span style={{ fontSize: 11, color: '#6b7686', marginLeft: 4 }}>guardadas:</span>}
          {saved.map((o) => (
            <span key={o.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 999, background: '#0b0e14', border: '1px solid #2a3140', fontSize: 12 }}>
              <button onClick={() => applySaved(o)} style={{ background: 'none', border: 0, color: '#7dd3fc', cursor: 'pointer', fontSize: 12, padding: 0 }}>{o.name}</button>
              <button onClick={() => deleteSaved(o.id)} style={{ background: 'none', border: 0, color: '#9aa3af', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>

        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr', gap: 14, alignItems: 'start' }}>

            {/* ── PALETA ── */}
            <div style={COL}>
              <div style={LBL}>Piezas</div>
              <div style={{ fontSize: 11, color: '#9aa3af', marginBottom: 4 }}>Segmento (enfoque)</div>
              {studentTypes.map((s) => <Piece key={s.slug} id={`segment:${s.slug}`} kind="segment" label={s.name} sub={s.slug} />)}
              <div style={{ fontSize: 11, color: '#9aa3af', margin: '10px 0 4px' }}>Coach{st ? '' : ' (elegí segmento)'}</div>
              {coaches.map((c) => <Piece key={c.id} id={`coach:${c.id}`} kind="coach" label={c.name} sub={`${c.gender} · ${c.voice_name}`} />)}
              <div style={{ fontSize: 11, color: '#9aa3af', margin: '10px 0 4px' }}>Nivel (reglas)</div>
              {levels.map((l) => <Piece key={l.code} id={`level:${l.code}`} kind="level" label={l.code} sub={l.friendly_name} />)}
              <div style={{ fontSize: 11, color: '#9aa3af', margin: '10px 0 4px' }}>Tópico</div>
              <input value={topicQ} onChange={(e) => setTopicQ(e.target.value)} placeholder="Buscar tópico…"
                style={{ width: '100%', padding: '6px 9px', borderRadius: 8, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 12, marginBottom: 6 }} />
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {topFiltered.map((t) => <Piece key={t.id} id={`topic:${t.id}`} kind="topic" label={t.title} />)}
              </div>
            </div>

            {/* ── CANVAS (la clase) ── */}
            <div style={COL}>
              <div style={LBL}>La clase</div>
              <Slot id="slot:segment" kind="segment" title="Segmento (cómo enseña)" value={stName} onClear={() => { setSt(undefined); setCoachId(undefined) }} />
              <Slot id="slot:coach" kind="coach" title="Coach (quién enseña)" value={coachName} onClear={() => setCoachId(undefined)} />
              <Slot id="slot:level" kind="level" title="Nivel (las reglas)" value={lvlName ? `${level} — ${lvlName}` : undefined} onClear={() => setLevel(undefined)} />
              <Slot id="slot:topic" kind="topic" title="Tópico (de qué se habla)" value={topName} onClear={() => setTopicId(undefined)} />

              {res && (
                <>
                  <div style={{ ...LBL, marginTop: 16 }}>Los 9 pasos · <span style={{ color: '#22c55e' }}>{res.loaded_count}</span>/{res.total} listos</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {res.blocks.map((b) => {
                      const meta = STEP_LABEL[b.name] || { label: b.name, help: b.source }
                      return (
                        <div key={b.n} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '7px 9px', borderRadius: 9, background: '#0b0e14', border: '1px solid #1c2230' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 999, marginTop: 5, flexShrink: 0, background: b.loaded ? '#22c55e' : '#ef4444' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{meta.label}</div>
                            <div style={{ fontSize: 11, color: '#9aa3af' }}>{meta.help}</div>
                            {b.preview && <div style={{ fontSize: 10.5, color: '#6b7686', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.preview}</div>}
                          </div>
                          {meta.edit && <a href={meta.edit} style={{ fontSize: 10.5, color: '#7dd3fc', textDecoration: 'none', flexShrink: 0 }}>editar →</a>}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              {!res && <div style={{ color: '#5b6473', fontSize: 13, marginTop: 10 }}>Arrastrá al menos un Segmento y un Nivel para ver la clase armarse.</div>}
            </div>

            {/* ── PREVIEW ── */}
            <div style={COL}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={LBL}>Prompt en vivo</div>
                <a href="/llm" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#22c55e', textDecoration: 'none' }}>Probar ↗</a>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.5, color: '#cbd5e1', maxHeight: 560, overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>
                {res ? res.prompt : '(armá la clase para ver el prompt)'}
              </pre>
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  )
}

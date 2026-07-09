/* AdminFlowPanel — Mapa visual (ReactFlow) de la orquestación.
 *
 * Elegís (segmento · coach · nivel · tópico) y ves el GRAFO de cómo se arma el
 * prompt: a la izquierda las entradas (los 3 datos), en el medio los pasos del
 * motor (verde=cargado, rojo=fallback), y a la derecha el PROMPT. Los edges
 * muestran qué entrada alimenta cada paso. Abajo, el prompt final.
 *
 * Reusa GET /orchestrator/resolve. No ejecuta IA.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, { Background, Controls, MarkerType, Position, type Node, type Edge } from 'reactflow'
import 'reactflow/dist/style.css'
import api from '../services/api'

interface St { slug: string; name: string }
interface Coach { id: number; name: string; gender: string; voice_name: string }
interface Lvl { code: string; friendly_name: string }
interface Top { id: number; title: string }
interface Block { n: number | string; name: string; source: string; loaded: boolean; preview: string }
interface Resolved { prompt: string; blocks: Block[]; loaded_count: number; total: number }

const CARD: React.CSSProperties = { background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 14 }
const LBL: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 6 }
const FIELD: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 13 }

// Qué ENTRADA alimenta cada paso (por su tag). Define los edges entrada → paso.
const DEPS: Record<string, string[]> = {
  tutor_profile: ['seg', 'coach'],
  pedagogical_rules: ['seg'],
  gamification_focus: ['seg'],
  behavioral_guards: ['seg', 'level'],
  current_lesson_vocabulary: ['topic', 'level'],
  story_timeline: ['topic', 'seg'],
  start_execution_command: ['seg'],
  session_actions: ['seg'],
  student_profile: ['alumno'],
  learner_state: ['alumno'],
  interaction_state: ['alumno'],
}
const tagOf = (name: string) => name.split(/[ ·(]/)[0].trim()

const INPUTS = [
  { id: 'seg', label: 'Segmento (edad)', y: 20 },
  { id: 'coach', label: 'Coach', y: 110 },
  { id: 'level', label: 'Nivel', y: 200 },
  { id: 'topic', label: 'Tópico', y: 290 },
  { id: 'alumno', label: 'Alumno (runtime)', y: 380 },
]

export default function AdminFlowPanel() {
  const [studentTypes, setStudentTypes] = useState<St[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [levels, setLevels] = useState<Lvl[]>([])
  const [topics, setTopics] = useState<Top[]>([])
  const [st, setSt] = useState('mini')
  const [coachId, setCoachId] = useState<number | undefined>(undefined)
  const [level, setLevel] = useState('A0')
  const [topicId, setTopicId] = useState<number | undefined>(undefined)
  const [res, setRes] = useState<Resolved | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/methodology-modules/student-types').then((r) => setStudentTypes(r.data)).catch(() => {})
    api.get('/levels').then((r) => setLevels(r.data)).catch(() => {})
    api.get('/topics').then((r) => setTopics(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch(() => {})
  }, [])
  useEffect(() => {
    api.get('/coaches', { params: { student_type: st } }).then((r) => { setCoaches(r.data); setCoachId(r.data[0]?.id) }).catch(() => setCoaches([]))
  }, [st])

  const resolve = useCallback(() => {
    setErr('')
    api.get('/orchestrator/resolve', { params: { student_type: st, coach_id: coachId, level, topic_id: topicId } })
      .then((r) => setRes(r.data)).catch((e) => setErr(e?.response?.data?.detail || 'error al resolver'))
  }, [st, coachId, level, topicId])
  useEffect(() => { resolve() }, [resolve])

  const { nodes, edges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(() => {
    const n: Node[] = []
    const e: Edge[] = []
    // Entradas (columna izquierda)
    for (const inp of INPUTS) {
      n.push({
        id: inp.id, position: { x: 0, y: inp.y }, data: { label: inp.label },
        style: { background: '#172033', color: '#7dd3fc', border: '1px solid #38bdf8', borderRadius: 10, fontSize: 12, width: 150 },
        sourcePosition: Position.Right, targetPosition: Position.Left,
      })
    }
    const blocks = res?.blocks ?? []
    blocks.forEach((b, i) => {
      const tag = tagOf(b.name)
      n.push({
        id: `b-${tag}-${i}`, position: { x: 240, y: i * 64 },
        data: { label: `${b.n}. ${b.name}` },
        style: {
          background: '#11151d', color: '#e6e8ec',
          border: `1px solid ${b.loaded ? '#22c55e' : '#ef4444'}`, borderRadius: 10, fontSize: 11, width: 230,
        },
        sourcePosition: Position.Right, targetPosition: Position.Left,
      })
      for (const dep of (DEPS[tag] ?? [])) {
        e.push({ id: `e-${dep}-${i}`, source: dep, target: `b-${tag}-${i}`, animated: b.loaded,
          style: { stroke: b.loaded ? '#22c55e' : '#3a4150' } })
      }
      e.push({ id: `e-${i}-prompt`, source: `b-${tag}-${i}`, target: 'prompt',
        markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#2a3140' } })
    })
    // Nodo prompt (derecha)
    const midY = Math.max(120, (blocks.length * 64) / 2)
    n.push({
      id: 'prompt', position: { x: 560, y: midY }, data: { label: 'PROMPT\n(systemInstruction)' },
      style: { background: '#0b2a1a', color: '#22c55e', border: '1px solid #22c55e', borderRadius: 12, fontSize: 12, fontWeight: 700, width: 170, whiteSpace: 'pre-line' },
      sourcePosition: Position.Right, targetPosition: Position.Left,
    })
    return { nodes: n, edges: e }
  }, [res])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '20px 18px 48px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Flujo del motor (mapa)</h1>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 16px' }}>
          Elegí una combinación y mirá el grafo: izquierda = las entradas, medio = los pasos (verde cargado, rojo fallback), derecha = el prompt. Las flechas muestran qué entrada alimenta cada paso.
        </p>

        <div style={{ ...CARD, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            <div><div style={LBL}>Segmento</div>
              <select style={FIELD} value={st} onChange={(e) => setSt(e.target.value)}>
                {studentTypes.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.slug})</option>)}
              </select></div>
            <div><div style={LBL}>Coach</div>
              <select style={FIELD} value={coachId ?? ''} onChange={(e) => setCoachId(Number(e.target.value))}>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><div style={LBL}>Nivel</div>
              <select style={FIELD} value={level} onChange={(e) => setLevel(e.target.value)}>
                {levels.map((l) => <option key={l.code} value={l.code}>{l.code} — {l.friendly_name}</option>)}
              </select></div>
            <div><div style={LBL}>Tópico</div>
              <select style={FIELD} value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">(sin tópico)</option>
                {topics.slice(0, 200).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select></div>
          </div>
          {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 10 }}>{err}</div>}
        </div>

        <div style={{ ...CARD, height: 540, padding: 0, overflow: 'hidden' }}>
          <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}
            nodesDraggable nodesConnectable={false} elementsSelectable={false}>
            <Background color="#1c2230" gap={18} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {res && (
          <div style={{ ...CARD, marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={LBL}>Prompt final — cargados <b style={{ color: '#22c55e' }}>{res.loaded_count}</b>/{res.total}</div>
              <a href="/lab/llm" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#22c55e', textDecoration: 'none' }}>Probar en /lab/llm ↗</a>
            </div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.5, color: '#cbd5e1', maxHeight: 320, overflowY: 'auto', fontFamily: 'monospace' }}>
              {res.prompt}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

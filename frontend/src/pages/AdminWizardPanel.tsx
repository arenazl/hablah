/* AdminWizardPanel — Wizard de orquestación (modal/stepper de etapas).
 *
 * Etapa 0: elegís los parámetros de entrada (segmento · coach · nivel · tópico).
 * Etapas 1..N: recorrés CADA uno de los pasos del motor — de dónde sale el dato
 *   (tabla.columna), si es estático o dependiente, y el contenido resuelto.
 * Etapa final: el PROMPT generado completo (lo que recibe el modelo).
 *
 * Reusa GET /orchestrator/resolve (mismo que la consola). No ejecuta IA.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

interface St { slug: string; name: string }
interface Coach { id: number; name: string; gender: string; voice_name: string }
interface Lvl { code: string; friendly_name: string }
interface Top { id: number; title: string }
interface Block { n: number | string; name: string; source: string; loaded: boolean; preview: string }
interface Resolved {
  prompt: string
  blocks: Block[]
  loaded_count: number
  total: number
  resolved: { student_type: string; coach: string | null; level: string; level_name: string | null; topic: string | null }
}

const CARD: React.CSSProperties = { background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 18 }
const LBL: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 6 }
const FIELD: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 10, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 14 }
const BTN: React.CSSProperties = { padding: '11px 20px', borderRadius: 999, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }

// Eje del que depende cada paso, por su tag (para mostrar estático vs dependencia).
const AXIS: Record<string, string> = {
  runtime_context: 'ESTÁTICO', tutor_profile: 'EDAD', pedagogical_rules: 'EDAD',
  gamification_focus: 'EDAD', student_profile: 'ALUMNO', learner_state: 'ALUMNO (post-clase)',
  behavioral_guards: 'NIVEL + EDAD', output_rules: 'CONFIG', current_lesson_vocabulary: 'TÓPICO + NIVEL',
  story_timeline: 'TÓPICO', start_execution_command: 'EDAD', session_actions: 'EDAD', interaction_state: 'VIVO',
}

function tagOf(name: string): string {
  return name.split(/[ ·(]/)[0].trim()
}

function extractBlock(prompt: string, name: string): string {
  const tag = tagOf(name)
  const a = prompt.indexOf(`<${tag}>`)
  const b = prompt.indexOf(`</${tag}>`)
  if (a >= 0 && b >= 0) return prompt.slice(a, b + tag.length + 3)
  return ''
}

function TopicPicker({ topics, value, onChange }: { topics: Top[]; value?: number; onChange: (id?: number) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = topics.find((t) => t.id === value)
  const q = query.trim().toLowerCase()
  const matches = (q ? topics.filter((t) => t.title.toLowerCase().includes(q)) : topics).slice(0, 60)
  const pick = (id?: number) => { onChange(id); setQuery(''); setOpen(false) }
  return (
    <div style={{ position: 'relative' }}>
      <input style={FIELD} placeholder={selected ? selected.title : 'Buscar tópico…'} value={query}
        onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && (
        <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 280, overflowY: 'auto', background: '#0b0e14', border: '1px solid #232936', borderRadius: 10 }}>
          <div onMouseDown={() => pick(undefined)} style={{ padding: '8px 10px', fontSize: 13, color: '#9aa3af', cursor: 'pointer' }}>(sin tópico)</div>
          {matches.map((t) => (
            <div key={t.id} onMouseDown={() => pick(t.id)}
              style={{ padding: '8px 10px', fontSize: 13, color: '#e6e8ec', cursor: 'pointer', borderTop: '1px solid #1c2230', background: t.id === value ? '#172033' : 'transparent' }}>
              {t.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminWizardPanel() {
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
  const [step, setStep] = useState(0)   // 0 = parámetros · 1..blocks = pasos · last = prompt

  useEffect(() => {
    api.get('/methodology-modules/student-types').then((r) => setStudentTypes(r.data)).catch(() => {})
    api.get('/levels').then((r) => setLevels(r.data)).catch(() => {})
    api.get('/topics').then((r) => setTopics(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/coaches', { params: { student_type: st } }).then((r) => { setCoaches(r.data); setCoachId(r.data[0]?.id) }).catch(() => setCoaches([]))
  }, [st])

  const resolve = useCallback(async () => {
    setErr('')
    try {
      const r = await api.get('/orchestrator/resolve', { params: { student_type: st, coach_id: coachId, level, topic_id: topicId } })
      setRes(r.data)
      setStep(1)
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(String(m || 'error al resolver'))
    }
  }, [st, coachId, level, topicId])

  const blocks = res?.blocks ?? []
  const totalSteps = blocks.length + 2          // 0 params + N pasos + 1 prompt
  const isParams = step === 0
  const isPrompt = res != null && step === blocks.length + 1
  const currentBlock = !isParams && !isPrompt && res ? blocks[step - 1] : null

  const stepLabel = useMemo(() => {
    if (isParams) return 'Parámetros de entrada'
    if (isPrompt) return 'Prompt generado'
    return `Paso ${currentBlock?.n} · ${currentBlock?.name}`
  }, [isParams, isPrompt, currentBlock])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '24px 20px 64px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Wizard de orquestación</h1>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 18px' }}>
          Elegí los parámetros y recorré paso a paso cómo se arma el prompt: qué trae cada capa, de dónde sale y si es estático o depende del alumno. La última etapa es el prompt final.
        </p>

        {/* Stepper (barra de etapas) */}
        {res && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button key={i} onClick={() => i <= (res ? totalSteps - 1 : 0) && setStep(i)}
                title={i === 0 ? 'Parámetros' : i === totalSteps - 1 ? 'Prompt' : `Paso ${i}`}
                style={{
                  flex: 1, minWidth: 18, height: 6, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
                  background: i === step ? '#38bdf8' : i < step ? '#22c55e' : '#232936',
                }} />
            ))}
          </div>
        )}

        <div style={{ ...CARD }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{stepLabel}</div>
            {res && <div style={{ fontSize: 12, color: '#9aa3af' }}>Etapa {step + 1} / {totalSteps}</div>}
          </div>

          {/* ── Etapa 0: parámetros ── */}
          {isParams && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div>
                  <div style={LBL}>Segmento (edad)</div>
                  <select style={FIELD} value={st} onChange={(e) => setSt(e.target.value)}>
                    {studentTypes.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.slug})</option>)}
                  </select>
                </div>
                <div>
                  <div style={LBL}>Coach</div>
                  <select style={FIELD} value={coachId ?? ''} onChange={(e) => setCoachId(Number(e.target.value))}>
                    {coaches.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.gender} · {c.voice_name})</option>)}
                  </select>
                </div>
                <div>
                  <div style={LBL}>Nivel</div>
                  <select style={FIELD} value={level} onChange={(e) => setLevel(e.target.value)}>
                    {levels.map((l) => <option key={l.code} value={l.code}>{l.code} — {l.friendly_name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={LBL}>Tópico</div>
                  <TopicPicker topics={topics} value={topicId} onChange={setTopicId} />
                </div>
              </div>
              {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 12 }}>{err}</div>}
              <div style={{ marginTop: 18 }}>
                <button style={{ ...BTN, background: '#22c55e', color: '#06120a' }} onClick={resolve}>Armar la orquestación →</button>
              </div>
            </div>
          )}

          {/* ── Etapas 1..N: un paso del motor ── */}
          {currentBlock && (
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: currentBlock.loaded ? '#22c55e' : '#ef4444' }} />
                <span style={{ fontSize: 12, color: currentBlock.loaded ? '#22c55e' : '#fca5a5', fontWeight: 600 }}>
                  {currentBlock.loaded ? 'CARGADO (dato real)' : 'FALTA / fallback'}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#7dd3fc', background: 'rgba(56,189,248,0.12)', padding: '3px 10px', borderRadius: 999 }}>
                  {AXIS[tagOf(currentBlock.name)] ?? 'DEPENDE'}
                </span>
              </div>
              <div style={LBL}>De dónde sale</div>
              <div style={{ fontSize: 13, color: '#7dd3fc', fontFamily: 'monospace', marginBottom: 14 }}>{currentBlock.source}</div>
              <div style={LBL}>Lo que quedó en el prompt</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.55, color: '#cbd5e1', background: '#0b0e14', border: '1px solid #1c2230', borderRadius: 10, padding: 12, maxHeight: 320, overflowY: 'auto', fontFamily: 'monospace' }}>
                {extractBlock(res!.prompt, currentBlock.name) || currentBlock.preview || '(bloque omitido — sin dato; opcional)'}
              </pre>
            </div>
          )}

          {/* ── Etapa final: prompt completo ── */}
          {isPrompt && res && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#9aa3af' }}>
                  {res.resolved.student_type} · {res.resolved.level} · {res.resolved.topic ?? 'sin tópico'} — cargados <b style={{ color: '#22c55e' }}>{res.loaded_count}</b>/{res.total}
                </div>
                <a href="/llm" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#22c55e', textDecoration: 'none' }}>Probar en /llm ↗</a>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, lineHeight: 1.55, color: '#cbd5e1', background: '#0b0e14', border: '1px solid #1c2230', borderRadius: 10, padding: 12, maxHeight: 460, overflowY: 'auto', fontFamily: 'monospace' }}>
                {res.prompt}
              </pre>
            </div>
          )}

          {/* Navegación */}
          {res && (
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button style={{ ...BTN, background: '#232936', color: '#e6e8ec' }}
                onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>← Anterior</button>
              {!isPrompt && (
                <button style={{ ...BTN, background: '#38bdf8', color: '#06121a' }}
                  onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}>
                  {step === blocks.length ? 'Ver prompt →' : 'Siguiente →'}
                </button>
              )}
              {isPrompt && (
                <button style={{ ...BTN, background: '#22c55e', color: '#06120a' }} onClick={() => setStep(0)}>Nueva orquestación</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

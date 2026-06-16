/* AdminConsolaPanel — Orquestador del motor.
 *
 * Selectores (Segmento · Coach · Nivel · Tópico) → /api/orchestrator/resolve →
 * muestra los 9 pasos resueltos (cada uno con su tag a tabla/campo + cargado/falta)
 * y el PROMPT final en vivo. Es la pantalla para ver/entender qué está cargado.
 */
import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

interface St { slug: string; name: string }
interface Coach { id: number; name: string; gender: string; voice_name: string }
interface Lvl { code: string; friendly_name: string }
interface Top { id: number; title: string }
interface Block { n: number; name: string; source: string; loaded: boolean; preview: string }
interface Resolved {
  prompt: string
  blocks: Block[]
  loaded_count: number
  total: number
  resolved: { student_type: string; coach: string | null; level: string; level_name: string | null; topic: string | null }
}

const CARD: React.CSSProperties = { background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 16 }
const LBL: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 6 }
const FIELD: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 13 }

function TopicAutocomplete({ topics, value, onChange }: { topics: Top[]; value?: number; onChange: (id?: number) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = topics.find((t) => t.id === value)
  const q = query.trim().toLowerCase()
  const matches = (q ? topics.filter((t) => t.title.toLowerCase().includes(q)) : topics).slice(0, 60)
  const pick = (id?: number) => { onChange(id); setQuery(''); setOpen(false) }
  return (
    <div style={{ position: 'relative' }}>
      <input
        style={FIELD}
        placeholder={selected ? selected.title : 'Buscar tópico…'}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 280, overflowY: 'auto', background: '#0b0e14', border: '1px solid #232936', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}>
          <div onMouseDown={() => pick(undefined)} style={{ padding: '8px 10px', fontSize: 13, color: '#9aa3af', cursor: 'pointer' }}>(sin tópico)</div>
          {matches.map((t) => (
            <div
              key={t.id}
              onMouseDown={() => pick(t.id)}
              style={{ padding: '8px 10px', fontSize: 13, color: '#e6e8ec', cursor: 'pointer', borderTop: '1px solid #1c2230', background: t.id === value ? '#172033' : 'transparent' }}
            >
              {t.title}
            </div>
          ))}
          {matches.length === 0 && <div style={{ padding: '8px 10px', fontSize: 12, color: '#9aa3af' }}>sin resultados</div>}
        </div>
      )}
    </div>
  )
}

export default function AdminConsolaPanel() {
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
    api.get('/coaches', { params: { student_type: st } }).then((r) => {
      setCoaches(r.data)
      setCoachId(r.data[0]?.id)
    }).catch(() => setCoaches([]))
  }, [st])

  const resolve = useCallback(() => {
    setErr('')
    api.get('/orchestrator/resolve', { params: { student_type: st, coach_id: coachId, level, topic_id: topicId } })
      .then((r) => setRes(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || 'error al resolver'))
  }, [st, coachId, level, topicId])

  useEffect(() => { resolve() }, [resolve])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '24px 20px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Orquestador del motor</h1>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 20px' }}>
          Elegí una combinación y mirá cómo se arman los 9 pasos: verde = cargado de la BD, rojo = cae a fallback. A la derecha, el prompt final.
        </p>

        {/* Selectores */}
        <div style={{ ...CARD, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <div style={LBL}>Segmento</div>
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
              <TopicAutocomplete topics={topics} value={topicId} onChange={setTopicId} />
            </div>
          </div>
          {err && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 10 }}>{err}</div>}
        </div>

        {res && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Bloques */}
            <div style={CARD}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={LBL}>9 pasos — fuente y estado</div>
                <div style={{ fontSize: 12, color: '#9aa3af' }}>
                  cargados <b style={{ color: '#22c55e' }}>{res.loaded_count}</b>/{res.total}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
                {res.blocks.map((b) => (
                  <div key={b.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: '#0b0e14', border: '1px solid #1c2230' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, marginTop: 5, flexShrink: 0, background: b.loaded ? '#22c55e' : '#ef4444' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{b.n}. {b.name}</div>
                      <div style={{ fontSize: 11, color: '#7dd3fc', fontFamily: 'monospace', margin: '2px 0' }}>{b.source}</div>
                      {b.preview && <div style={{ fontSize: 11, color: '#9aa3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.preview}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt final */}
            <div style={CARD}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={LBL}>Prompt final (lo que recibe el modelo)</div>
                <a href="/llm" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#22c55e', textDecoration: 'none' }}>Probar en /llm ↗</a>
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.5, color: '#cbd5e1', maxHeight: 460, overflowY: 'auto', fontFamily: 'monospace' }}>
                {res.prompt}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

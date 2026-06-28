/* MiniTestPanel — Prueba real (micrófono) del módulo de niños por el MOTOR ÚNICO (v2/compose_proto).
 * Elegís EDAD + NIVEL + TÓPICO (dinámicos desde la BD) y ves, en vivo, cómo se arma la orquestación
 * paso por paso — con color por DUEÑO (qué es fijo/estático y qué cambia por edad/nivel/tópico/historia).
 * La orquestación NO se persiste: se genera al vuelo apilando presets.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Square, CheckCircle, Layers } from 'lucide-react'
import { useLiveVoice } from '../hooks/useLiveVoice'
import { buildMiniWsUrl, finaltestAPI, miniAPI, type MiniTopic, type MiniStep } from '../services/api'

const AGES: { slug: string; label: string }[] = [
  { slug: 'mini', label: 'Mini (4-7)' },
  { slug: 'junior', label: 'Junior (8-12)' },
]
const BAND_BY_AGE: Record<string, string> = { mini: 'early_child', junior: 'child' }
const LEVEL_ORDER = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function scoreColor(s: number | null | undefined) {
  if (s == null) return '#6b7280'
  if (s >= 8) return '#22c55e'
  if (s >= 6.5) return '#fbbf24'
  return '#ef4444'
}
// Color por DUEÑO del preset: qué es fijo y qué cambia con cada pilar.
function dueColor(d: string) {
  if (d.includes('+')) return '#ec4899'        // mixto (2 pilares)
  if (d.startsWith('EDAD')) return '#3b82f6'
  if (d.startsWith('NIVEL')) return '#22c55e'
  if (d.startsWith('TÓPICO')) return '#f59e0b'
  if (d.startsWith('HISTORIA')) return '#a78bfa'
  return '#6b7280'                              // estático / runtime
}

export default function MiniTestPanel() {
  const [ageGroup, setAgeGroup] = useState('mini')
  const [level, setLevel] = useState('A0')
  const [topicId, setTopicId] = useState(0)
  const [allTopics, setAllTopics] = useState<MiniTopic[]>([])
  const [steps, setSteps] = useState<MiniStep[] | null>(null)
  const [loadingSteps, setLoadingSteps] = useState(false)
  const [result, setResult] = useState<{ score: number; verdict: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const live = useLiveVoice({ onError: (e) => setErr(e.message) })
  const isLive = live.status === 'connecting' || live.status === 'listening' || live.status === 'speaking'
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [live.transcript])

  // tópicos kids dinámicos desde la BD
  useEffect(() => { miniAPI.topics().then(setAllTopics).catch(e => setErr(String(e))) }, [])

  const bandTopics = useMemo(() => allTopics.filter(t => t.segmento === ageGroup), [allTopics, ageGroup])
  const levelOptions = useMemo(() => {
    const s = new Set<string>()
    bandTopics.forEach(t => t.levels.forEach(l => s.add(l)))
    return LEVEL_ORDER.filter(l => s.has(l))
  }, [bandTopics])
  const topics = useMemo(() => bandTopics.filter(t => t.levels.includes(level)), [bandTopics, level])
  const topicTitle = topics.find(t => t.id === topicId)?.title ?? ''

  // mantener nivel y tópico válidos cuando cambia edad/nivel
  useEffect(() => {
    if (levelOptions.length && !levelOptions.includes(level)) setLevel(levelOptions[0])
  }, [levelOptions, level])
  useEffect(() => {
    if (topics.length && !topics.find(t => t.id === topicId)) setTopicId(topics[0].id)
  }, [topics, topicId])

  // los combos refrescan la orquestación en vivo
  const loadSteps = useCallback(async () => {
    if (!topicId) { setSteps(null); return }
    setLoadingSteps(true)
    try {
      const r = await miniAPI.preview(ageGroup, level, topicId)
      if (r.error) { setErr(r.error); setSteps(null) } else setSteps(r.steps ?? [])
    } catch (e) { setErr(String(e)) } finally { setLoadingSteps(false) }
  }, [ageGroup, level, topicId])
  useEffect(() => { if (!isLive) void loadSteps() }, [loadSteps, isLive])

  const startClass = useCallback(async () => {
    if (!topicId) return
    setErr(''); setResult(null)
    const url = buildMiniWsUrl({
      age_group: ageGroup, level_code: level, topic_id: topicId,
      engine: 'gemini_live', model: 'models/gemini-3.1-flash-live-preview', voice: 'Aoede',
    })
    await live.start(0, undefined, 'Aoede', url)
  }, [live, ageGroup, level, topicId])

  const endClass = useCallback(async () => {
    const transcript = live.transcript.map(l => ({ who: l.who, text: l.text }))
    live.stop()
    if (!transcript.length) return
    setSaving(true)
    try {
      const res = await finaltestAPI.save({
        band_code: BAND_BY_AGE[ageGroup] ?? 'early_child', level_code: level,
        topic_id: topicId, topic_title: topicTitle, student_id: 0, transcript,
      })
      setResult({ score: res.score ?? 0, verdict: res.verdict ?? '' })
    } catch (e) { setErr(String(e)) } finally { setSaving(false) }
  }, [live, ageGroup, level, topicId, topicTitle])

  const card = { background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 18, marginBottom: 14 } as const
  const sel = { padding: '8px 12px', borderRadius: 10, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 14 } as const

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px 60px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>MOTOR ÚNICO</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Orquestación de la clase</h1>
          </div>
          <p style={{ color: '#9aa3af', fontSize: 13, margin: 0 }}>
            Determinística: se genera apilando presets (no se persiste). Cambiá los combos y mirá qué paso se mueve.
          </p>
        </div>

        {/* Combos */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: 1, marginBottom: 14 }}>EDAD · NIVEL · TÓPICO</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select disabled={isLive} value={ageGroup} onChange={e => setAgeGroup(e.target.value)} style={sel}>
              {AGES.map(a => <option key={a.slug} value={a.slug}>{a.label}</option>)}
            </select>
            <select disabled={isLive} value={level} onChange={e => setLevel(e.target.value)} style={sel}>
              {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select disabled={isLive} value={topicId} onChange={e => setTopicId(Number(e.target.value))} style={{ ...sel, flex: 1, minWidth: 180 }}>
              {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        </div>

        {/* Los pasos de la orquestación */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Layers size={15} color="#7c3aed" />
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: 1 }}>LOS PASOS — {loadingSteps ? 'armando…' : `${steps?.length ?? 0} bloques`}</div>
          </div>
          {/* leyenda */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, fontSize: 11 }}>
            {[['estático', 'estático'], ['EDAD', 'EDAD'], ['NIVEL', 'NIVEL'], ['TÓPICO', 'TÓPICO'], ['HISTORIA', 'HISTORIA'], ['EDAD +', 'mixto']].map(([k, lbl]) => (
              <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: dueColor(k) }} />{lbl}
              </span>
            ))}
          </div>
          {steps?.map((s, i) => (
            <div key={s.step} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{s.step}</span>
              </div>
              {s.entries.map((en) => (
                <div key={en.label} style={{ borderLeft: `3px solid ${dueColor(en.dueno)}`, padding: '4px 0 6px 12px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{en.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0b0e14', background: dueColor(en.dueno), padding: '2px 7px', borderRadius: 10 }}>{en.dueno}</span>
                    <code style={{ fontSize: 10, color: '#6b7280' }}>{en.source}</code>
                  </div>
                  <div style={{ fontSize: 12, color: '#9aa3af', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{en.body}</div>
                </div>
              ))}
            </div>
          ))}
          {!steps && !loadingSteps && <div style={{ fontSize: 13, color: '#6b7280' }}>Elegí un tópico para ver la orquestación.</div>}
        </div>

        {/* Probar por voz */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: 1, marginBottom: 12 }}>PROBAR POR VOZ (actuá de alumno)</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {!isLive ? (
              <button onClick={startClass} disabled={!topicId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, border: 'none', cursor: topicId ? 'pointer' : 'not-allowed', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 15 }}>
                <Mic size={18} /> Iniciar clase
              </button>
            ) : (
              <button onClick={endClass} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 15 }}>
                <Square size={18} /> Terminar
              </button>
            )}
            {isLive && <span style={{ color: '#22c55e', fontSize: 13 }}>{live.status === 'connecting' ? 'Conectando…' : live.status === 'speaking' ? 'Coach hablando…' : 'Escuchando…'}</span>}
            {saving && <span style={{ color: '#fbbf24', fontSize: 13 }}>Puntuando…</span>}
          </div>
        </div>

        {(live.transcript.length > 0 || isLive) && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9aa3af', letterSpacing: 1, marginBottom: 12 }}>TRANSCRIPCIÓN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
              {live.transcript.map((l, i) => {
                const isAi = l.who === 'ai'
                return (
                  <div key={i} style={{ alignSelf: isAi ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2, textAlign: isAi ? 'left' : 'right' }}>{isAi ? 'Coach' : 'Vos (alumno)'}</div>
                    <div style={{ padding: '9px 13px', borderRadius: 12, fontSize: 14, lineHeight: 1.45, background: isAi ? '#0b1f33' : '#0b2a1a', border: `1px solid ${isAi ? '#1e3a5f' : '#1e4d33'}` }}>{l.text}</div>
                  </div>
                )
              })}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}

        {result && (
          <div style={{ ...card, border: `2px solid ${scoreColor(result.score)}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <CheckCircle size={20} color={scoreColor(result.score)} />
              <span style={{ fontSize: 28, fontWeight: 800, color: scoreColor(result.score) }}>{result.score?.toFixed(1)}</span>
              <span style={{ fontSize: 13, color: '#9aa3af' }}>/ 10</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#e6e8ec', lineHeight: 1.5 }}>{result.verdict}</p>
          </div>
        )}

        {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#1f0000', border: '1px solid #dc2626', color: '#fca5a5', fontSize: 13 }}>{err}</div>}
      </div>
    </div>
  )
}

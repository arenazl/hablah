/* TestFinalConsole — Consola /finaltest: circuito ENTERO de clase REAL por voz.
 *
 * MOTOR ÚNICO v2 (compose_proto) — el MISMO que produce (F0-01). El usuario elige perfil(edad =
 * age_group) × nivel × tópico, arranca una clase HABLANDO al coach (mic + Gemini Live, vía
 * /voice/ws_motor → motor_engine.resolve_v2). Al terminar: se puntúa con el panel de jueces SLA,
 * se genera un .md y queda en el tab "Análisis" con su score. La historia v2 (learner_state) llega
 * en F2-01 — hoy la clase corre sin historia, igual que /mini-test. Reusa useLiveVoice de /llm.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, RotateCcw, ChevronDown, ChevronRight, FileText, Loader2, History } from 'lucide-react'

import { useLiveVoice } from '../hooks/useLiveVoice'
import {
  buildMotorWsUrl, finaltestAPI,
  type FtBand, type FtTopic, type FtClassRow, type FtClassDetail, type FtDims, type FtPanelVote,
} from '../services/api'

// ── estilos (tema oscuro técnico, consistente con /llm) ──
const CARD: React.CSSProperties = { background: '#11151d', border: '1px solid #232936', borderRadius: 16, padding: 16 }
const LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#9aa3af', marginBottom: 6 }
const FIELD: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 13 }
const DIM_KEYS = ['naturalidad', 'afecto', 'i1', 'reciclado', 'recast', 'continuity'] as const

function scoreColor(s: number | null | undefined): string {
  if (s == null) return '#6b7280'
  if (s >= 8) return '#22c55e'
  if (s >= 6.5) return '#fbbf24'
  return '#ef4444'
}

function ChatLog({ lines, aiLabel = 'Profe', minHeight = 320 }: {
  lines: { who: string; text: string }[]; aiLabel?: string; minHeight?: number
}) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight, maxHeight: 460, overflowY: 'auto', padding: 4 }}>
      {lines.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>Todavía no se dijo nada. Arrancá la clase y hablá.</div>}
      {lines.map((l, i) => {
        const isAi = l.who === 'ai'
        return (
          <div key={i} style={{ alignSelf: isAi ? 'flex-start' : 'flex-end', maxWidth: '82%' }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2, textAlign: isAi ? 'left' : 'right' }}>
              {isAi ? aiLabel : 'Vos (alumno)'}
            </div>
            <div style={{
              padding: '9px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.4,
              background: isAi ? '#0b1f33' : '#0b2a1a',
              border: `1px solid ${isAi ? '#1e3a5f' : '#1e4d33'}`, color: '#e6e8ec',
            }}>{l.text}</div>
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}

function DimsBar({ dims }: { dims: FtDims }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
      {DIM_KEYS.map((k) => (
        <div key={k} style={{ fontSize: 12, color: '#9aa3af' }}>
          {k} <b style={{ color: scoreColor(dims[k]) }}>{dims[k] ?? '—'}</b>
        </div>
      ))}
    </div>
  )
}

function PanelBar({ panel }: { panel?: FtPanelVote[] }) {
  if (!panel || panel.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, alignItems: 'center', paddingTop: 8, borderTop: '1px dashed #232936' }}>
      <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>panel de jueces</span>
      {panel.map((p, i) => (
        <span key={i} style={{ fontSize: 12, color: '#9aa3af' }}>
          {p.model.replace(':', ' ')} <b style={{ color: scoreColor(p.score) }}>{p.score ?? '—'}</b>
        </span>
      ))}
    </div>
  )
}

export function TestFinalConsole() {
  const [bands, setBands] = useState<FtBand[]>([])
  const [levels, setLevels] = useState<string[]>([])
  const [topics, setTopics] = useState<FtTopic[]>([])
  const [band, setBand] = useState('')
  const [level, setLevel] = useState('')
  const [topicId, setTopicId] = useState<number>(0)
  const [studentId, setStudentId] = useState(0)
  const [hist, setHist] = useState<{ obj: number; items: number }>({ obj: 0, items: 0 })
  const [prompt, setPrompt] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)

  const [tab, setTab] = useState<'clase' | 'analisis'>('clase')
  const [classes, setClasses] = useState<FtClassRow[]>([])
  const [detail, setDetail] = useState<FtClassDetail | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState<{ score: number | null; verdict: string | null; dims: FtDims } | null>(null)
  const [err, setErr] = useState('')

  const live = useLiveVoice({ onError: (e) => setErr(e.message) })
  const isLive = live.status === 'connecting' || live.status === 'listening' || live.status === 'speaking'
  const topicTitle = topics.find((t) => t.id === topicId)?.title ?? ''

  // carga inicial de combos
  useEffect(() => {
    finaltestAPI.options().then((o) => {
      setBands(o.bands); setLevels(o.levels)
      if (o.bands[0]) setBand(o.bands[0].code)
      if (o.levels[0]) setLevel(o.levels[0])
    }).catch((e) => setErr(String(e)))
  }, [])

  // tópicos al cambiar de banda
  useEffect(() => {
    if (!band) return
    finaltestAPI.topics(band).then((ts) => {
      setTopics(ts); setTopicId(ts[0]?.id ?? 0)
    }).catch((e) => setErr(String(e)))
  }, [band])

  // resolver orquestación + historia al cambiar perfil/nivel/tópico
  const refreshResolve = useCallback(async () => {
    if (!band || !level || !topicId) return
    try {
      const r = await finaltestAPI.resolve({ band_code: band, level_code: level, topic_id: topicId })
      setStudentId(r.student_id); setHist({ obj: r.hist_obj, items: r.hist_items })
      setPrompt(r.prompt ?? (r.error ? `(error resolviendo: ${r.error})` : ''))
    } catch (e) { setErr(String(e)) }
  }, [band, level, topicId])

  useEffect(() => { if (!isLive) void refreshResolve() }, [refreshResolve, isLive])

  const refreshList = useCallback(() => {
    finaltestAPI.list().then(setClasses).catch(() => {})
  }, [])
  useEffect(() => { refreshList() }, [refreshList])

  const startClass = useCallback(async () => {
    if (!topicId) return
    setErr(''); setLastResult(null)
    // Motor v2: age_group (= band, slug de student_types) + nivel + tópico. Sin student/historia (F2-01).
    const url = buildMotorWsUrl({
      age_group: band, level_code: level, topic_id: topicId,
      engine: 'gemini_live', model: 'models/gemini-3.1-flash-live-preview', voice: 'Aoede',
    })
    await live.start(0, undefined, 'Aoede', url)
  }, [live, band, level, topicId])

  const endClass = useCallback(async () => {
    const transcript = live.transcript.map((l) => ({ who: l.who, text: l.text }))
    live.stop()
    if (transcript.length === 0) return
    setSaving(true)
    try {
      const res = await finaltestAPI.save({
        band_code: band, level_code: level, topic_id: topicId,
        topic_title: topicTitle, student_id: studentId, transcript,
      })
      setLastResult({ score: res.score, verdict: res.verdict, dims: res.dims })
      refreshList()
      void refreshResolve()
    } catch (e) { setErr(String(e)) } finally { setSaving(false) }
  }, [live, band, level, topicId, topicTitle, studentId, refreshList, refreshResolve])

  const resetHistory = useCallback(async () => {
    if (isLive) return
    try {
      await finaltestAPI.reset({ band_code: band, level_code: level })
      setHist({ obj: 0, items: 0 })
      void refreshResolve()
    } catch (e) { setErr(String(e)) }
  }, [isLive, band, level, refreshResolve])

  const openDetail = useCallback((id: number) => {
    finaltestAPI.getClass(id).then(setDetail).catch((e) => setErr(String(e)))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 20px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Mic size={22} color="#7dd3fc" />
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Consola de clases reales</h1>
        </div>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 18px' }}>
          Elegí perfil · nivel · tópico, arrancá la clase y hablale al coach actuando el alumno.
          Al terminar se puntúa con el juez y queda guardada con su transcripción y score.
        </p>

        {/* ── BARRA DE CONTROL (combos + historia + botones) ── */}
        <div style={{ ...CARD, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            <div>
              <div style={LABEL}>Perfil (edad)</div>
              <select style={FIELD} value={band} disabled={isLive} onChange={(e) => setBand(e.target.value)}>
                {bands.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <div style={LABEL}>Nivel</div>
              <select style={FIELD} value={level} disabled={isLive} onChange={(e) => setLevel(e.target.value)}>
                {levels.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <div style={LABEL}>Tópico</div>
              <select style={FIELD} value={topicId} disabled={isLive} onChange={(e) => setTopicId(Number(e.target.value))}>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <div style={LABEL}>Historia del alumno</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38 }}>
                <History size={15} color="#7dd3fc" />
                <span style={{ fontSize: 13 }}>{hist.obj} obj · {hist.items} ítems</span>
                <button onClick={resetHistory} disabled={isLive} title="Resetear historia"
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 9px', borderRadius: 9, border: '1px solid #232936', background: '#0b0e14', color: '#9aa3af', fontSize: 12, cursor: isLive ? 'not-allowed' : 'pointer' }}>
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* botón arrancar/terminar + estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
            <button onClick={isLive ? endClass : startClass} disabled={saving || !topicId}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '13px 22px', borderRadius: 999,
                border: 'none', fontSize: 15, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
                background: isLive ? '#ef4444' : '#22c55e', color: '#06120a', whiteSpace: 'nowrap',
                opacity: !topicId ? 0.5 : 1,
              }}>
              {isLive ? <Square size={17} /> : <Mic size={17} />}
              {isLive ? 'Terminar y puntuar' : 'Iniciar clase'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: live.status === 'speaking' ? '#38bdf8' : live.status === 'listening' ? '#22c55e' : live.status === 'error' ? '#ef4444' : '#6b7280' }} />
              <span style={{ fontSize: 13, color: '#9aa3af' }}>{live.status}</span>
            </div>
            {saving && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#7dd3fc' }}><Loader2 size={14} className="spin" /> puntuando con el panel de jueces…</span>}
          </div>

          {/* orquestación colapsable */}
          <button onClick={() => setShowPrompt((s) => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, padding: 0, background: 'none', border: 'none', color: '#7dd3fc', fontSize: 13, cursor: 'pointer' }}>
            {showPrompt ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            Ver orquestación (el prompt real de 9 pasos para {band} · {level})
          </button>
          {showPrompt && (
            <pre style={{ marginTop: 10, padding: 12, background: '#0b0e14', border: '1px solid #232936', borderRadius: 10, fontSize: 11, lineHeight: 1.45, color: '#cbd5e1', maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
              {prompt || '(elegí perfil/nivel/tópico)'}
            </pre>
          )}
          {err && <div style={{ marginTop: 10, color: '#fca5a5', fontSize: 12 }}>⚠ {err}</div>}
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {([['clase', 'Clase en vivo'], ['analisis', `Análisis (${classes.length})`]] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${tab === k ? '#38bdf8' : '#232936'}`, background: tab === k ? 'rgba(56,189,248,0.12)' : '#0b0e14', color: '#e6e8ec', fontSize: 13, fontWeight: tab === k ? 700 : 400, cursor: 'pointer' }}>
              {lbl}
            </button>
          ))}
        </div>

        {tab === 'clase' && (
          <div style={CARD}>
            <div style={{ ...LABEL, marginBottom: 12 }}>Transcripción en vivo · {band} · {level} · {topicTitle}</div>
            <ChatLog lines={live.transcript} />
            {lastResult && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: '#0b1424', border: '1px solid #1e3a5f' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#9aa3af' }}>Score del juez:</span>
                  <span style={{ fontSize: 26, fontWeight: 800, color: scoreColor(lastResult.score) }}>{lastResult.score ?? '—'}</span>
                </div>
                {lastResult.verdict && <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 6 }}>{lastResult.verdict}</div>}
                <DimsBar dims={lastResult.dims} />
                <PanelBar panel={lastResult.dims.panel} />
              </div>
            )}
          </div>
        )}

        {tab === 'analisis' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
            <div style={{ ...CARD, padding: 10, maxHeight: 560, overflowY: 'auto' }}>
              {classes.length === 0 && <div style={{ color: '#6b7280', fontSize: 13, padding: 8 }}>Sin clases todavía.</div>}
              {classes.map((c) => (
                <button key={c.id} onClick={() => openDetail(c.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 6, borderRadius: 10, border: `1px solid ${detail?.id === c.id ? '#38bdf8' : '#232936'}`, background: detail?.id === c.id ? 'rgba(56,189,248,0.10)' : '#0b0e14', color: '#e6e8ec', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: scoreColor(c.score), minWidth: 26 }}>{c.score ?? '—'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.topic_title}</div>
                      <div style={{ fontSize: 11, color: '#9aa3af' }}>{c.band_code} · {c.level_code} · hist {c.hist_obj}o/{c.hist_items}i</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div style={CARD}>
              {!detail && <div style={{ color: '#6b7280', fontSize: 13 }}>Elegí una clase de la lista para ver su transcripción y score.</div>}
              {detail && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: scoreColor(detail.score) }}>{detail.score ?? '—'}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{detail.topic_title}</div>
                      <div style={{ fontSize: 12, color: '#9aa3af' }}>{detail.band_code} · {detail.level_code} · historia previa {detail.hist_obj}obj/{detail.hist_items}it · {new Date(detail.created_at).toLocaleString()}</div>
                    </div>
                    {detail.md_path && <FileText size={16} color="#6b7280" style={{ marginLeft: 'auto' }} />}
                  </div>
                  {detail.verdict && <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>{detail.verdict}</div>}
                  <DimsBar dims={detail.dims} />
                  <PanelBar panel={detail.dims.panel} />
                  <div style={{ borderTop: '1px solid #232936', margin: '12px 0' }} />
                  <ChatLog lines={detail.transcript} minHeight={200} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default TestFinalConsole

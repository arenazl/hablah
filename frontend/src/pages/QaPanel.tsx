/**
 * /app/qa — Panel admin para correr la QA suite automatizada.
 *
 * Botones para disparar smoke / quality. Stream en vivo de los eventos
 * via SSE. Cada scenario se renderea como una card con:
 * - Estado (running / scored / error)
 * - Score overall + por categoria
 * - Issues, strengths
 * - Conversacion completa (toggle)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../services/api'

interface RubricItem { pass: boolean; score: number; note: string }
interface ScenarioState {
  name: string
  persona: string
  topic: string
  description: string
  status: 'pending' | 'running' | 'scoring' | 'done' | 'error'
  sessionId?: number
  durationSeconds?: number
  firstCoachAudioMs?: number
  nCoachTurns?: number
  nStudentTurns?: number
  scoreOverall?: number
  rubric?: Record<string, RubricItem>
  issues?: string[]
  strengths?: string[]
  conversation?: string
  errors?: string[]
  turns: Array<{ n: number; speaker: string; text: string }>
}

interface RunState {
  runId: string
  startedAt: number
  scenarios: Record<string, ScenarioState>
  order: string[]
  done: boolean
  summary?: { nPassed: number; nFailed: number; avgScore: number; totalSeconds: number }
}

const CSS = `
.qa-root { padding: 24px 32px 80px; max-width: 1200px; margin: 0 auto; color: var(--fg-1); }
.qa-h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 6px; }
.qa-sub { color: var(--fg-3); font-size: 14px; margin-bottom: 24px; }
.qa-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.qa-btn { padding: 10px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; border: 0; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: 8px; }
.qa-btn-primary { background: var(--primary); color: white; }
.qa-btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
.qa-btn-secondary { background: var(--bg-2); color: var(--fg-1); border: 1px solid var(--border-2); }
.qa-btn-secondary:hover { background: var(--bg-3); }
.qa-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.qa-summary { padding: 14px 18px; border-radius: 12px; background: var(--bg-2); border: 1px solid var(--border-1); margin-bottom: 16px; display: flex; gap: 24px; flex-wrap: wrap; font-size: 14px; }
.qa-summary b { font-size: 18px; }
.qa-summary .ok { color: #22D67A; }
.qa-summary .ko { color: #E5484D; }
.qa-card { padding: 16px 18px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border-1); margin-bottom: 12px; }
.qa-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.qa-card-title { font-size: 15px; font-weight: 800; letter-spacing: -.01em; }
.qa-card-meta { font-size: 11.5px; color: var(--fg-3); }
.qa-status { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.qa-status-pending { background: rgba(255,255,255,.1); color: var(--fg-3); }
.qa-status-running { background: rgba(255,184,0,.18); color: #FFB800; animation: qa-pulse 1.4s ease-in-out infinite; }
.qa-status-scoring { background: rgba(59,130,246,.18); color: #3B82F6; animation: qa-pulse 1.4s ease-in-out infinite; }
.qa-status-done { background: rgba(34,214,122,.18); color: #22D67A; }
.qa-status-error { background: rgba(229,72,77,.18); color: #E5484D; }
@keyframes qa-pulse { 0%,100% { opacity: 1 } 50% { opacity: .5 } }
.qa-score-big { font-size: 22px; font-weight: 900; letter-spacing: -.02em; }
.qa-score-big.ok { color: #22D67A; } .qa-score-big.warn { color: #FFB800; } .qa-score-big.ko { color: #E5484D; }
.qa-rubric { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px 16px; margin: 10px 0; padding: 10px; border-radius: 10px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05); }
.qa-rubric-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
.qa-rubric-row .ok { color: #22D67A; } .qa-rubric-row .ko { color: #E5484D; }
.qa-rubric-row .num { font-variant-numeric: tabular-nums; font-weight: 700; min-width: 28px; }
.qa-rubric-row .cat { color: var(--fg-2); }
.qa-rubric-row .note { color: var(--fg-3); font-size: 11px; margin-left: auto; max-width: 50%; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qa-issues, .qa-strengths { margin-top: 8px; }
.qa-issues h5, .qa-strengths h5 { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3); margin: 0 0 4px; font-weight: 700; }
.qa-issues li { color: #FFAA8F; font-size: 12.5px; margin-bottom: 2px; }
.qa-strengths li { color: #9CFCD2; font-size: 12.5px; margin-bottom: 2px; }
.qa-conv-toggle { font-size: 12px; color: var(--primary); cursor: pointer; margin-top: 8px; user-select: none; font-weight: 600; }
.qa-conv-body { margin-top: 8px; padding: 12px; border-radius: 8px; background: var(--bg-2); border: 1px solid var(--border-1); font-size: 12.5px; line-height: 1.55; white-space: pre-wrap; font-family: 'JetBrains Mono', ui-monospace, monospace; max-height: 320px; overflow-y: auto; }
.qa-turn-stream { margin-top: 8px; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,.02); border-left: 2px solid rgba(255,255,255,.1); font-size: 11.5px; font-family: 'JetBrains Mono', ui-monospace, monospace; max-height: 200px; overflow-y: auto; }
.qa-turn-stream .who-coach { color: #9CFCD2; }
.qa-turn-stream .who-student { color: #FFC83D; }
`

interface RecentRunMeta {
  run_id: string
  started_at: number
  done: boolean
  n_scenarios: number
  scenarios: Array<{ name: string; persona: string; topic: string; description: string }>
}

export default function QaPanel() {
  const [run, setRun] = useState<RunState | null>(null)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [recent, setRecent] = useState<RecentRunMeta[]>([])
  const esRef = useRef<EventSource | null>(null)

  const loadRecent = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const r = await fetch(`${API_BASE_URL}/qa/runs`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        const j = await r.json()
        setRecent(j.runs || [])
      }
    } catch {}
  }, [])
  useEffect(() => { loadRecent() }, [loadRecent])

  const startRun = useCallback(async (suite: string) => {
    setRun(null)
    setExpanded({})
    setRunning(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE_URL}/qa/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ suite }),
      })
      if (!res.ok) {
        const txt = await res.text()
        alert(`Error iniciando run: ${res.status} ${txt}`)
        setRunning(false)
        return
      }
      const data = await res.json()
      const order: string[] = data.scenarios.map((s: any) => s.name)
      const scenarios: Record<string, ScenarioState> = {}
      for (const s of data.scenarios) {
        scenarios[s.name] = {
          name: s.name, persona: s.persona, topic: s.topic,
          description: s.description, status: 'pending', turns: [],
        }
      }
      const newRun: RunState = {
        runId: data.run_id, startedAt: Date.now(),
        scenarios, order, done: false,
      }
      setRun(newRun)
      openStream(data.run_id)
    } catch (e: any) {
      alert(`No pude arrancar: ${e?.message || e}`)
      setRunning(false)
    }
  }, [])

  const openStream = useCallback((runId: string) => {
    if (esRef.current) try { esRef.current.close() } catch {}
    // EventSource no soporta Bearer header — usamos auth via query param custom
    // Mejor: usamos fetch streaming. Pero EventSource es más simple para SSE.
    // Workaround: el endpoint requiere admin → la cookie/session no aplica acá,
    // entonces hacemos fetch streaming manualmente.
    const token = localStorage.getItem('token')
    const ctrl = new AbortController()
    fetch(`${API_BASE_URL}/qa/run/${runId}/stream`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
    }).then(async (resp) => {
      if (!resp.ok || !resp.body) {
        alert(`Stream error: ${resp.status}`)
        setRunning(false)
        return
      }
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        // SSE: eventos separados por \n\n; cada uno tiene "data: ..."
        let idx
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, idx)
          buf = buf.slice(idx + 2)
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6)
              try {
                const ev = JSON.parse(payload)
                handleEvent(ev)
              } catch {}
            } else if (line.startsWith('event: done')) {
              setRunning(false)
            }
          }
        }
      }
    }).catch((e) => {
      if (e?.name !== 'AbortError') console.error(e)
      setRunning(false)
    })
    // store close handle pseudo
    esRef.current = { close: () => ctrl.abort() } as any
  }, [])

  const handleEvent = useCallback((ev: any) => {
    setRun((prev) => {
      if (!prev) return prev
      const next = { ...prev, scenarios: { ...prev.scenarios } }
      const sName = ev.scenario
      if (ev.event === 'scenario.start' && sName) {
        next.scenarios[sName] = { ...next.scenarios[sName], status: 'running' }
      } else if (ev.event === 'scenario.session_started' && sName) {
        next.scenarios[sName] = { ...next.scenarios[sName], sessionId: ev.session_id }
      } else if (ev.event === 'scenario.turn' && sName) {
        const sc = next.scenarios[sName]
        next.scenarios[sName] = {
          ...sc,
          turns: [...sc.turns, { n: ev.n, speaker: ev.speaker, text: ev.text }],
        }
      } else if (ev.event === 'scenario.scoring' && sName) {
        next.scenarios[sName] = { ...next.scenarios[sName], status: 'scoring' }
      } else if (ev.event === 'scenario.end' && sName) {
        next.scenarios[sName] = {
          ...next.scenarios[sName],
          status: 'done',
          sessionId: ev.session_id,
          durationSeconds: ev.duration_seconds,
          firstCoachAudioMs: ev.first_coach_audio_ms,
          nCoachTurns: ev.n_coach_turns,
          nStudentTurns: ev.n_student_turns,
          scoreOverall: ev.score_overall,
          rubric: ev.score_rubric,
          issues: ev.score_issues,
          strengths: ev.score_strengths,
          conversation: ev.conversation,
          errors: ev.errors,
        }
      } else if (ev.event === 'scenario.error' && sName) {
        next.scenarios[sName] = {
          ...next.scenarios[sName],
          status: 'error',
          errors: [...(next.scenarios[sName].errors || []), `${ev.stage}: ${ev.error}`],
        }
      } else if (ev.event === 'run.complete') {
        next.done = true
        next.summary = {
          nPassed: ev.n_passed, nFailed: ev.n_failed,
          avgScore: ev.avg_score, totalSeconds: ev.total_seconds,
        }
      }
      return next
    })
  }, [])

  useEffect(() => () => {
    if (esRef.current) try { esRef.current.close() } catch {}
  }, [])

  const downloadReport = () => {
    if (!run) return
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qa-run-${run.runId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="qa-root">
      <style>{CSS}</style>
      <h1 className="qa-h1">QA Harness</h1>
      <p className="qa-sub">
        Tests automáticos del coach. Las personas simulan al alumno con texto (bypass audio).
        Cada conversación la evalúa Gemini Flash contra 8 reglas del prompt.
      </p>

      <div className="qa-actions">
        <button className="qa-btn qa-btn-primary" disabled={running} onClick={() => startRun('smoke')}>
          ▶ Smoke (3 escenarios · ~1 min)
        </button>
        <button className="qa-btn qa-btn-primary" disabled={running} onClick={() => startRun('quality')}>
          ▶ Quality (8 escenarios · ~3 min)
        </button>
        <button className="qa-btn qa-btn-secondary" disabled={running} onClick={() => startRun('stress:1')}>
          ▶ Stress topic_1
        </button>
        {run && run.done && (
          <button className="qa-btn qa-btn-secondary" onClick={downloadReport}>
            ⬇ Descargar reporte JSON
          </button>
        )}
      </div>

      {run?.summary && (
        <div className="qa-summary">
          <div><b>{run.summary.avgScore.toFixed(1)}/10</b><br /><span style={{ color: 'var(--fg-3)' }}>Avg score</span></div>
          <div><b className="ok">{run.summary.nPassed}</b><br /><span style={{ color: 'var(--fg-3)' }}>Passed (≥6.5)</span></div>
          <div><b className="ko">{run.summary.nFailed}</b><br /><span style={{ color: 'var(--fg-3)' }}>Failed</span></div>
          <div><b>{run.summary.totalSeconds.toFixed(1)}s</b><br /><span style={{ color: 'var(--fg-3)' }}>Duración total</span></div>
        </div>
      )}

      {run && run.order.map((name) => {
        const s = run.scenarios[name]
        const score = s.scoreOverall
        const scoreClass = score === undefined ? '' : score >= 7 ? 'ok' : score >= 5 ? 'warn' : 'ko'
        return (
          <div key={name} className="qa-card">
            <div className="qa-card-head">
              <div>
                <div className="qa-card-title">{s.name}</div>
                <div className="qa-card-meta">{s.persona} · {s.topic} · {s.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {score !== undefined && (
                  <div className={`qa-score-big ${scoreClass}`}>{score.toFixed(1)}<span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>/10</span></div>
                )}
                <span className={`qa-status qa-status-${s.status}`}>{s.status}</span>
              </div>
            </div>

            {s.status === 'done' && s.rubric && (
              <div className="qa-rubric">
                {Object.entries(s.rubric).map(([cat, info]) => (
                  <div key={cat} className="qa-rubric-row">
                    <span className={info.pass ? 'ok' : 'ko'}>{info.pass ? '✓' : '✕'}</span>
                    <span className="num">{info.score}</span>
                    <span className="cat">{cat}</span>
                    <span className="note" title={info.note}>{info.note}</span>
                  </div>
                ))}
              </div>
            )}

            {(s.firstCoachAudioMs !== undefined || s.durationSeconds !== undefined) && (
              <div className="qa-card-meta">
                {s.firstCoachAudioMs !== undefined && <>1er audio coach: <b>{s.firstCoachAudioMs}ms</b> · </>}
                {s.durationSeconds !== undefined && <>duración: <b>{s.durationSeconds.toFixed(1)}s</b> · </>}
                {s.nCoachTurns !== undefined && <>{s.nCoachTurns} coach / {s.nStudentTurns} student turnos</>}
              </div>
            )}

            {s.errors && s.errors.length > 0 && (
              <div className="qa-issues">
                <h5>Errores runtime</h5>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {s.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {s.issues && s.issues.length > 0 && (
              <div className="qa-issues">
                <h5>Issues</h5>
                <ul style={{ margin: 0, paddingLeft: 18 }}>{s.issues.map((i, n) => <li key={n}>{i}</li>)}</ul>
              </div>
            )}

            {s.strengths && s.strengths.length > 0 && (
              <div className="qa-strengths">
                <h5>Strengths</h5>
                <ul style={{ margin: 0, paddingLeft: 18 }}>{s.strengths.map((st, n) => <li key={n}>{st}</li>)}</ul>
              </div>
            )}

            {(s.status === 'running' || s.status === 'scoring') && s.turns.length > 0 && (
              <div className="qa-turn-stream">
                {s.turns.slice(-6).map((t) => (
                  <div key={t.n}>
                    <span className={t.speaker === 'coach' ? 'who-coach' : 'who-student'}>
                      [{t.speaker === 'coach' ? 'COACH' : 'STUDENT'}]
                    </span>{' '}
                    {t.text.slice(0, 140)}{t.text.length > 140 ? '…' : ''}
                  </div>
                ))}
              </div>
            )}

            {s.conversation && (
              <>
                <div className="qa-conv-toggle" onClick={() => setExpanded((e) => ({ ...e, [name]: !e[name] }))}>
                  {expanded[name] ? '▾ Ocultar conversación' : '▸ Ver conversación completa'}
                </div>
                {expanded[name] && <div className="qa-conv-body">{s.conversation}</div>}
              </>
            )}
          </div>
        )
      })}

      {!run && !running && recent.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 13, color: 'var(--fg-3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Corridas recientes</h3>
          {recent.map((r) => {
            const date = new Date(r.started_at * 1000)
            return (
              <div key={r.run_id} className="qa-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.run_id.slice(0, 8)}…</div>
                  <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>
                    {date.toLocaleString()} · {r.n_scenarios} escenarios · {r.done ? 'completo' : 'en curso'}
                  </div>
                </div>
                <button className="qa-btn qa-btn-ghost" onClick={() => { openStream(r.run_id); setRun({ runId: r.run_id, startedAt: r.started_at * 1000, scenarios: Object.fromEntries(r.scenarios.map(s => [s.name, { ...s, status: 'pending', turns: [] } as ScenarioState])), order: r.scenarios.map(s => s.name), done: r.done }); }}>
                  Ver
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!run && !running && recent.length === 0 && (
        <div style={{ color: 'var(--fg-3)', fontStyle: 'italic', marginTop: 40 }}>
          Tocá un botón arriba para arrancar una corrida automática.
        </div>
      )}
    </div>
  )
}

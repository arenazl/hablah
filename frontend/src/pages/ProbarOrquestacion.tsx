/* ProbarOrquestacion — /probar-orq · prueba de voz de UNA ORQUESTACIÓN v3 COMPLETA.
 *
 * Se abre desde el ▶ Probar del Probador con el circuito en la query (banda × nivel ×
 * tópico + overrides del fine-tuning). Conecta al WS /voice/ws_orchestration, que
 * resuelve TU circuito con el motor v3 y conversa con ESE prompt (no el genérico).
 * Voz real + transcript del coach y del alumno. Sin login.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveVoice } from '../hooks/useLiveVoice'
import { buildWsBase } from '../services/api'

const C = {
  bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1c2230',
  fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686', green: '#22c55e', blue: '#38bdf8', red: '#f87171',
}
const STATUS: Record<string, { l: string; c: string }> = {
  idle: { l: 'Detenido', c: C.faint }, connecting: { l: 'Conectando…', c: '#fbbf24' },
  listening: { l: 'Escuchando', c: C.green }, speaking: { l: 'Hablando el coach', c: C.blue },
  error: { l: 'Error', c: C.red }, ended: { l: 'Terminado', c: C.faint },
}

export default function ProbarOrquestacion() {
  const [sp] = useSearchParams()
  const band = sp.get('band') || 'adult'
  const level = sp.get('level') || 'B2'
  const topic = sp.get('topic') || ''
  const topicTitle = sp.get('t') || ''
  const overrides = sp.get('overrides') || ''
  const voice = sp.get('voice') || 'Aoede'

  const live = useLiveVoice({})
  const isLive = ['connecting', 'listening', 'speaking'].includes(live.status)

  const wsUrl = useMemo(() => {
    const q = new URLSearchParams({ band_code: band, level_code: level, topic_id: topic || '0', voice })
    if (overrides) q.set('overrides', overrides)
    return `${buildWsBase()}/voice/ws_orchestration?${q.toString()}`
  }, [band, level, topic, overrides, voice])

  const st = STATUS[live.status] || STATUS.idle

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '24px 18px 64px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: '0 0 2px' }}>Probar la clase</h1>
        <p style={{ color: C.dim, fontSize: 13, margin: '0 0 4px' }}>
          Esta es <b>tu orquestación completa</b> (el circuito de {band} · {level}{topicTitle ? ` · ${topicTitle}` : ''}{overrides ? ' · con tus ajustes' : ''}) corriendo de verdad. Hablá y escuchá al coach.
        </p>
        <p style={{ color: C.faint, fontSize: 11.5, margin: '0 0 18px' }}>Permití el micrófono cuando lo pida el navegador.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <button onClick={() => (isLive ? live.stop() : live.start(0, undefined, voice, wsUrl))}
            style={{ background: isLive ? C.red : C.green, color: isLive ? '#fff' : '#06281a', border: 0, borderRadius: 12, fontSize: 15, fontWeight: 800, padding: '13px 26px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {isLive ? <rect x="6" y="6" width="12" height="12" rx="2" /> : <path d="M5 3l14 9-14 9V3z" />}
            </svg>
            {isLive ? 'Cortar' : 'Hablar con el coach'}
          </button>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: st.c }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: st.c }} /> {st.l}
          </span>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, minHeight: 320 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.dim, fontWeight: 700, marginBottom: 12 }}>Transcript</div>
          {live.transcript.length === 0 && <div style={{ color: C.faint, fontSize: 13 }}>Cuando arranques, acá vas a ver lo que dice el coach y lo que decís vos.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {live.transcript.map((line, i) => {
              const isCoach = line.who === 'ai'
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isCoach ? 'flex-start' : 'flex-end' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: isCoach ? C.blue : C.green, marginBottom: 2 }}>{isCoach ? 'Coach' : 'Vos'}</span>
                  <div style={{ maxWidth: '85%', background: isCoach ? C.soft : 'rgba(34,197,94,0.10)', border: `1px solid ${isCoach ? C.border : 'rgba(34,197,94,0.3)'}`, borderRadius: 12, padding: '8px 12px', fontSize: 13.5, lineHeight: 1.5 }}>{line.text}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

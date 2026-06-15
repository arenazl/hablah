/* LlmTestPage — Banco de pruebas AISLADO de tecnología de voz (ruta /llm).
 *
 * Módulo independiente: NO toca el resto de la app. Corre una mini-clase A0
 * (prompt 9-bloques ESTÁTICO armado en el backend) por el WS de test
 * `/voice/ws_llm_test` (sin login, sin BD). Permite switchear modelo/voz para
 * comparar latencia, cortes y "palabras comidas" — escuchando con el mic real.
 */
import { useCallback, useMemo, useState } from 'react'
import { Mic, Square, AlertTriangle, Zap, Radio } from 'lucide-react'

import { useLiveVoice } from '../hooks/useLiveVoice'
import { buildLlmTestWsUrl } from '../services/api'

interface VoiceCombo {
  id: string
  label: string
  engine: string
  model: string
  voice: string
  note?: string
}

// Combinaciones que CORREN HOY (ai_studio native-audio, sin auth Vertex).
// Half-cascade (Vertex TEXT -> ElevenLabs) y OpenAI Realtime entran cuando se
// resuelva la auth de Vertex — se agregan como filas nuevas acá.
const COMBOS: VoiceCombo[] = [
  {
    id: 'flash31-kore',
    label: 'Flash 3.1 Live · Kore',
    engine: 'gemini_live',
    model: 'models/gemini-3.1-flash-live-preview',
    voice: 'Kore',
    note: 'baseline prod (se come palabras)',
  },
  {
    id: 'flash31-aoede',
    label: 'Flash 3.1 Live · Aoede',
    engine: 'gemini_live',
    model: 'models/gemini-3.1-flash-live-preview',
    voice: 'Aoede',
  },
  {
    id: 'flash31-puck',
    label: 'Flash 3.1 Live · Puck',
    engine: 'gemini_live',
    model: 'models/gemini-3.1-flash-live-preview',
    voice: 'Puck',
  },
  {
    id: 'na25-kore',
    label: 'Flash 2.5 Native Audio · Kore',
    engine: 'gemini_live',
    model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
    voice: 'Kore',
  },
  {
    id: 'na25-aoede',
    label: 'Flash 2.5 Native Audio · Aoede',
    engine: 'gemini_live',
    model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
    voice: 'Aoede',
  },
  {
    id: 'live20-kore',
    label: 'Flash 2.0 Live · Kore',
    engine: 'gemini_live',
    model: 'models/gemini-2.0-flash-live-001',
    voice: 'Kore',
  },
]

type LogKind = 'info' | 'warn' | 'error'
interface LogEntry {
  t: string
  kind: LogKind
  msg: string
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'Detenido',
  connecting: 'Conectando…',
  listening: 'Escuchando',
  speaking: 'Hablando',
  error: 'Error',
  ended: 'Terminado',
}

function nowHms(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function LlmTestPage() {
  const [comboId, setComboId] = useState<string>(COMBOS[0].id)
  const [log, setLog] = useState<LogEntry[]>([])
  const [micLevel, setMicLevel] = useState(0)

  const combo = useMemo(
    () => COMBOS.find((c) => c.id === comboId) ?? COMBOS[0],
    [comboId],
  )

  const addLog = useCallback((kind: LogKind, msg: string) => {
    setLog((prev) => [{ t: nowHms(), kind, msg }, ...prev].slice(0, 200))
  }, [])

  const live = useLiveVoice({
    onError: (e) => addLog('error', e.message),
    onMicLevel: (l) => setMicLevel(l),
    onAudioGlitch: ({ reason, delayMs }) => addLog('warn', `glitch: ${reason} (+${delayMs}ms)`),
    onSessionRenewing: () => addLog('warn', 'renovando sesión Gemini…'),
    onSessionRenewed: () => addLog('info', 'sesión renovada'),
  })

  const isLive =
    live.status === 'connecting' || live.status === 'listening' || live.status === 'speaking'

  const start = useCallback(async () => {
    setLog([])
    addLog('info', `arranca · ${combo.label}`)
    addLog('info', `model=${combo.model}`)
    const url = buildLlmTestWsUrl(combo.engine, combo.model, combo.voice)
    await live.start(0, undefined, combo.voice, url)
  }, [combo, live, addLog])

  const stop = useCallback(() => {
    live.stop()
    addLog('info', 'sesión terminada')
    setMicLevel(0)
  }, [live, addLog])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 20px 64px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Radio size={22} color="#7dd3fc" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Banco de pruebas de voz</h1>
        </div>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 22px' }}>
          Mini-clase A0 estática (9 bloques) — switcheá modelo y escuchá. Mide latencia, cortes y
          palabras comidas. Módulo aislado, no afecta la app.
        </p>

        {/* Selector de combinación */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 10 }}>
            Combinación de tecnología
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {COMBOS.map((c) => {
              const active = c.id === comboId
              return (
                <button
                  key={c.id}
                  onClick={() => !isLive && setComboId(c.id)}
                  disabled={isLive}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1px solid ${active ? '#38bdf8' : '#232936'}`,
                    background: active ? 'rgba(56,189,248,0.10)' : '#11151d',
                    color: '#e6e8ec',
                    cursor: isLive ? 'not-allowed' : 'pointer',
                    opacity: isLive && !active ? 0.45 : 1,
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: '#7dd3fc', marginTop: 4, fontFamily: 'monospace' }}>
                    {c.model.replace('models/', '')}
                  </div>
                  {c.note && (
                    <div style={{ fontSize: 11, color: '#9aa3af', marginTop: 4 }}>{c.note}</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Control + estado */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '18px 20px',
            borderRadius: 16,
            background: '#11151d',
            border: '1px solid #232936',
            marginBottom: 22,
          }}
        >
          <button
            onClick={isLive ? stop : start}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 22px',
              borderRadius: 999,
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              background: isLive ? '#ef4444' : '#22c55e',
              color: '#06120a',
            }}
          >
            {isLive ? <Square size={18} /> : <Mic size={18} />}
            {isLive ? 'Terminar' : 'Arrancar clase'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background:
                    live.status === 'speaking'
                      ? '#38bdf8'
                      : live.status === 'listening'
                        ? '#22c55e'
                        : live.status === 'error'
                          ? '#ef4444'
                          : '#6b7280',
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {STATUS_LABEL[live.status] ?? live.status}
              </span>
            </div>
            {/* Mic level */}
            <div style={{ height: 6, borderRadius: 999, background: '#232936', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(micLevel * 100)}%`,
                  background: '#22c55e',
                  transition: 'width .05s',
                }}
              />
            </div>
          </div>
        </div>

        {/* Transcript + Log */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Transcript */}
          <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 12 }}>
              Transcripción
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
              {live.transcript.length === 0 && (
                <div style={{ color: '#6b7280', fontSize: 13 }}>Sin transcripción todavía.</div>
              )}
              {live.transcript.map((line, i) => (
                <div key={i} style={{ fontSize: 14, lineHeight: 1.4 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: line.who === 'ai' ? '#7dd3fc' : '#86efac',
                      marginRight: 8,
                    }}
                  >
                    {line.who === 'ai' ? 'Coach' : 'Alumno'}
                  </span>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Event log */}
          <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 12 }}>
              Eventos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
              {log.length === 0 && <div style={{ color: '#6b7280' }}>Sin eventos.</div>}
              {log.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: '#6b7280' }}>{e.t}</span>
                  {e.kind === 'warn' && <AlertTriangle size={13} color="#fbbf24" style={{ marginTop: 1, flexShrink: 0 }} />}
                  {e.kind === 'error' && <AlertTriangle size={13} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />}
                  {e.kind === 'info' && <Zap size={13} color="#7dd3fc" style={{ marginTop: 1, flexShrink: 0 }} />}
                  <span style={{ color: e.kind === 'error' ? '#fca5a5' : e.kind === 'warn' ? '#fde68a' : '#cbd5e1' }}>
                    {e.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

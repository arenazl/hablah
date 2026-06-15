/* LlmTestPage — Banco de tuneo de voz / turn-taking AISLADO (ruta /llm).
 *
 * Módulo independiente: NO toca el resto de la app. Corre una mini-clase A0
 * (prompt 9-bloques ESTÁTICO armado en el backend) por el WS de test
 * `/voice/ws_llm_test` (sin login, sin BD). Expone TODOS los knobs de VAD /
 * turn-taking para tunear EN VIVO qué config toma mejor la voz. Cada "Aplicar"
 * reinicia la sesión con la config elegida (no hace falta refrescar la página).
 */
import { useCallback, useState } from 'react'
import { Mic, Square, AlertTriangle, Zap, SlidersHorizontal } from 'lucide-react'

import { useLiveVoice } from '../hooks/useLiveVoice'
import { buildLlmTestWsUrl } from '../services/api'

interface ModelOption {
  value: string
  label: string
  note?: string
}

const MODELS: ModelOption[] = [
  { value: 'models/gemini-3.1-flash-live-preview', label: 'Flash 3.1 Live', note: 'baseline · transcribe input' },
  { value: 'models/gemini-2.5-flash-native-audio-preview-09-2025', label: 'Flash 2.5 Native Audio', note: 'NO transcribe tu palabra' },
  { value: 'models/gemini-2.0-flash-live-001', label: 'Flash 2.0 Live', note: 'experimental' },
]

const VOICES = ['Aoede', 'Kore', 'Puck', 'Charon', 'Fenrir', 'Leda', 'Orus', 'Zephyr']

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

// ── estilos compartidos ──────────────────────────────────────────────
const CARD: React.CSSProperties = { background: '#11151d', border: '1px solid #232936', borderRadius: 16, padding: 16 }
const LABEL: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 6 }
const FIELD: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 13 }

function Segmented({ value, onChange, options, disabled }: {
  value: string
  onChange: (v: string) => void
  options: { v: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((o) => {
        const active = o.v === value
        return (
          <button
            key={o.v}
            onClick={() => !disabled && onChange(o.v)}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 10,
              border: `1px solid ${active ? '#38bdf8' : '#232936'}`,
              background: active ? 'rgba(56,189,248,0.12)' : '#0b0e14',
              color: '#e6e8ec',
              fontSize: 13,
              fontWeight: active ? 700 : 400,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function LlmTestPage() {
  // Config (todos los knobs). Defaults = VAD responsivo sobre Flash 3.1.
  const [model, setModel] = useState(MODELS[0].value)
  const [voice, setVoice] = useState('Aoede')
  const [startSens, setStartSens] = useState('START_SENSITIVITY_HIGH')
  const [endSens, setEndSens] = useState('END_SENSITIVITY_HIGH')
  const [silenceMs, setSilenceMs] = useState(500)
  const [prefixMs, setPrefixMs] = useState(200)
  const [activity, setActivity] = useState('START_OF_ACTIVITY_INTERRUPTS')
  const [thinking, setThinking] = useState(256)

  const [log, setLog] = useState<LogEntry[]>([])
  const [micLevel, setMicLevel] = useState(0)

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

  const apply = useCallback(async () => {
    live.stop() // cierra cualquier sesión previa: cada Aplicar arranca limpio
    setLog([])
    setMicLevel(0)
    const cfg = {
      engine: 'gemini_live',
      model,
      voice,
      start_sens: startSens,
      end_sens: endSens,
      silence_ms: silenceMs,
      prefix_ms: prefixMs,
      activity,
      thinking,
    }
    addLog('info', `aplicar · ${model.replace('models/', '')} · ${voice}`)
    addLog('info', `start=${startSens.replace('START_SENSITIVITY_', '')} end=${endSens.replace('END_SENSITIVITY_', '')} sil=${silenceMs}ms prefix=${prefixMs}ms act=${activity === 'NO_INTERRUPTION' ? 'no-int' : 'interrumpe'} think=${thinking}`)
    const url = buildLlmTestWsUrl(cfg)
    await live.start(0, undefined, voice, url)
  }, [live, addLog, model, voice, startSens, endSens, silenceMs, prefixMs, activity, thinking])

  const stop = useCallback(() => {
    live.stop()
    addLog('info', 'sesión terminada')
    setMicLevel(0)
  }, [live, addLog])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 20px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <SlidersHorizontal size={22} color="#7dd3fc" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Banco de tuneo de voz</h1>
        </div>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 20px' }}>
          Mini-clase A0 estática (9 bloques). Tuneá VAD / turn-taking en vivo y encontrá qué config
          toma mejor tu voz. Cada "Aplicar" reinicia la sesión. Módulo aislado.
        </p>

        {/* Panel de config */}
        <div style={{ ...CARD, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <div style={LABEL}>Modelo</div>
              <select style={FIELD} value={model} disabled={isLive} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}{m.note ? ` — ${m.note}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={LABEL}>Voz (Gemini)</div>
              <select style={FIELD} value={voice} disabled={isLive} onChange={(e) => setVoice(e.target.value)}>
                {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <div style={LABEL}>Start sensitivity (detectar que hablás)</div>
              <Segmented
                value={startSens}
                disabled={isLive}
                onChange={setStartSens}
                options={[
                  { v: 'START_SENSITIVITY_HIGH', label: 'HIGH (sensible)' },
                  { v: 'START_SENSITIVITY_LOW', label: 'LOW (sordo)' },
                ]}
              />
            </div>
            <div>
              <div style={LABEL}>End sensitivity (detectar que terminaste)</div>
              <Segmented
                value={endSens}
                disabled={isLive}
                onChange={setEndSens}
                options={[
                  { v: 'END_SENSITIVITY_HIGH', label: 'HIGH' },
                  { v: 'END_SENSITIVITY_LOW', label: 'LOW' },
                ]}
              />
            </div>
            <div>
              <div style={LABEL}>Silencio para cerrar turno (ms)</div>
              <input type="number" style={FIELD} value={silenceMs} disabled={isLive} min={100} max={2000} step={100}
                onChange={(e) => setSilenceMs(Number(e.target.value))} />
            </div>
            <div>
              <div style={LABEL}>Prefix padding (ms)</div>
              <input type="number" style={FIELD} value={prefixMs} disabled={isLive} min={0} max={1000} step={50}
                onChange={(e) => setPrefixMs(Number(e.target.value))} />
            </div>
            <div>
              <div style={LABEL}>Activity handling</div>
              <Segmented
                value={activity}
                disabled={isLive}
                onChange={setActivity}
                options={[
                  { v: 'START_OF_ACTIVITY_INTERRUPTS', label: 'Interrumpe' },
                  { v: 'NO_INTERRUPTION', label: 'No interrumpe' },
                ]}
              />
            </div>
            <div>
              <div style={LABEL}>Thinking budget</div>
              <input type="number" style={FIELD} value={thinking} disabled={isLive} min={0} max={2048} step={128}
                onChange={(e) => setThinking(Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Control + estado */}
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
          <button
            onClick={isLive ? stop : apply}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', borderRadius: 999,
              border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              background: isLive ? '#ef4444' : '#22c55e', color: '#06120a', whiteSpace: 'nowrap',
            }}
          >
            {isLive ? <Square size={18} /> : <Mic size={18} />}
            {isLive ? 'Terminar' : 'Aplicar y arrancar'}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 9, height: 9, borderRadius: 999,
                background: live.status === 'speaking' ? '#38bdf8'
                  : live.status === 'listening' ? '#22c55e'
                    : live.status === 'error' ? '#ef4444' : '#6b7280',
              }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{STATUS_LABEL[live.status] ?? live.status}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: '#232936', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(micLevel * 100)}%`, background: '#22c55e', transition: 'width .05s' }} />
            </div>
          </div>
        </div>

        {/* Transcript + Log */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={CARD}>
            <div style={LABEL}>Transcripción</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
              {live.transcript.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>Sin transcripción todavía.</div>}
              {live.transcript.map((line, i) => (
                <div key={i} style={{ fontSize: 14, lineHeight: 1.4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: line.who === 'ai' ? '#7dd3fc' : '#86efac', marginRight: 8 }}>
                    {line.who === 'ai' ? 'Coach' : 'Vos'}
                  </span>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={CARD}>
            <div style={LABEL}>Eventos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
              {log.length === 0 && <div style={{ color: '#6b7280' }}>Sin eventos.</div>}
              {log.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: '#6b7280' }}>{e.t}</span>
                  {e.kind === 'warn' && <AlertTriangle size={13} color="#fbbf24" style={{ marginTop: 1, flexShrink: 0 }} />}
                  {e.kind === 'error' && <AlertTriangle size={13} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />}
                  {e.kind === 'info' && <Zap size={13} color="#7dd3fc" style={{ marginTop: 1, flexShrink: 0 }} />}
                  <span style={{ color: e.kind === 'error' ? '#fca5a5' : e.kind === 'warn' ? '#fde68a' : '#cbd5e1' }}>{e.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

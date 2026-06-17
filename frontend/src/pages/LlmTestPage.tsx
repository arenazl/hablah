/* LlmTestPage — Banco de tuneo de voz AISLADO (ruta /llm).
 *
 * Módulo independiente: NO toca el resto de la app. Corre una mini-clase A0
 * (prompt 9-bloques estático con FRASE-PUENTE) por el WS de test
 * `/voice/ws_llm_test` (sin login, sin BD). Panel SIMPLE: 5 controles claros con
 * botones + defaults; lo técnico queda plegado en "ajustes finos". Cada "Aplicar"
 * reinicia la sesión.
 */
import { useCallback, useState } from 'react'
import { Mic, Square, AlertTriangle, Zap, SlidersHorizontal, ChevronDown, ChevronRight } from 'lucide-react'

import { useLiveVoice } from '../hooks/useLiveVoice'
import { buildLlmTestWsUrl } from '../services/api'
import LiveSubtitle from '../components/LiveSubtitle'

interface ModelOption { value: string; label: string; note?: string }

const MODELS: ModelOption[] = [
  { value: 'models/gemini-3.1-flash-live-preview', label: 'Flash 3.1 (recomendado)', note: 'transcribe tu palabra' },
  { value: 'models/gemini-2.5-flash-native-audio-preview-09-2025', label: 'Flash 2.5 Native Audio', note: 'NO transcribe tu palabra' },
  { value: 'models/gemini-2.0-flash-live-001', label: 'Flash 2.0 Live', note: 'experimental' },
]
const VOICES = ['Aoede', 'Kore', 'Puck', 'Charon', 'Fenrir', 'Leda', 'Orus', 'Zephyr']

type LogKind = 'info' | 'warn' | 'error'
interface LogEntry { t: string; kind: LogKind; msg: string }

const STATUS_LABEL: Record<string, string> = {
  idle: 'Detenido', connecting: 'Conectando…', listening: 'Escuchando',
  speaking: 'Hablando', error: 'Error', ended: 'Terminado',
}

function nowHms(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// ── estilos ──────────────────────────────────────────────
const CARD: React.CSSProperties = { background: '#11151d', border: '1px solid #232936', borderRadius: 16, padding: 16 }
const LABEL: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#e6e8ec', marginBottom: 6 }
const HELP: React.CSSProperties = { fontSize: 11, color: '#6b7280', marginTop: 5, lineHeight: 1.35 }
const FIELD: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 13 }

function Control({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={LABEL}>{label}</div>
      {children}
      {help && <div style={HELP}>{help}</div>}
    </div>
  )
}

function Segmented({ value, onChange, options, disabled }: {
  value: string; onChange: (v: string) => void
  options: { v: string; label: string }[]; disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((o) => {
        const active = o.v === value
        return (
          <button key={o.v} onClick={() => !disabled && onChange(o.v)} disabled={disabled}
            style={{
              flex: 1, padding: '9px 8px', borderRadius: 10,
              border: `1px solid ${active ? '#38bdf8' : '#232936'}`,
              background: active ? 'rgba(56,189,248,0.12)' : '#0b0e14',
              color: '#e6e8ec', fontSize: 13, fontWeight: active ? 700 : 400,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function LlmTestPage() {
  // Config. Defaults = lo que funcionó 10/10 (AGC off + VAD responsivo + frase-puente).
  const [ageGroup, setAgeGroup] = useState('mini')
  const [level, setLevel] = useState('A0')
  const [model, setModel] = useState(MODELS[0].value)
  const [voice, setVoice] = useState('Aoede')
  const [startSens, setStartSens] = useState('START_SENSITIVITY_HIGH')
  const [endSens, setEndSens] = useState('END_SENSITIVITY_HIGH')
  const [silenceMs, setSilenceMs] = useState(700)
  const [prefixMs, setPrefixMs] = useState(200)
  const [activity, setActivity] = useState('START_OF_ACTIVITY_INTERRUPTS')
  const [thinking, setThinking] = useState(256)
  const [agc, setAgc] = useState(false)
  const [ns, setNs] = useState(false)
  const [aec, setAec] = useState(true)
  const [captureSr, setCaptureSr] = useState(16000)
  const [workletBuf, setWorkletBuf] = useState(2048)
  const [showAdvanced, setShowAdvanced] = useState(false)

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

  const isLive = live.status === 'connecting' || live.status === 'listening' || live.status === 'speaking'

  const apply = useCallback(async () => {
    live.stop()
    setLog([]); setMicLevel(0)
    const cfg = {
      engine: 'gemini_live', model, voice, age_group: ageGroup, level,
      start_sens: startSens, end_sens: endSens, silence_ms: silenceMs,
      prefix_ms: prefixMs, activity, thinking,
    }
    addLog('info', `aplicar · ${model.replace('models/', '')} · ${voice}`)
    addLog('info', `mic AGC=${agc ? 'on' : 'off'} ruido=${ns ? 'on' : 'off'} · rapidez=${silenceMs}ms · oído=${startSens.replace('START_SENSITIVITY_', '')} · interrumpir=${activity === 'NO_INTERRUPTION' ? 'no' : 'sí'}`)
    const audioOverride = {
      autoGainControl: agc, noiseSuppression: ns, echoCancellation: aec,
      captureSampleRate: captureSr, workletBufferSamples: workletBuf,
    }
    const url = buildLlmTestWsUrl(cfg)
    await live.start(0, undefined, voice, url, audioOverride)
  }, [live, addLog, ageGroup, level, model, voice, startSens, endSens, silenceMs, prefixMs, activity, thinking, agc, ns, aec, captureSr, workletBuf])

  const stop = useCallback(() => { live.stop(); addLog('info', 'sesión terminada'); setMicLevel(0) }, [live, addLog])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 20px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <SlidersHorizontal size={22} color="#7dd3fc" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Banco de tuneo de voz</h1>
        </div>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 20px' }}>
          Cambiá un par de cosas, tocá "Aplicar y arrancar" y hablale al coach. Probá decir
          la frase-puente entera ("perro se dice dog"). Cada cambio reinicia la sesión.
        </p>

        {/* Selector del prompt del motor (los 28: segmento × nivel) */}
        <div style={{ ...CARD, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18 }}>
            <Control label="Segmento (edad)" help="Perfil del alumno: define tutor, pedagogía y forma.">
              <Segmented value={ageGroup} disabled={isLive} onChange={setAgeGroup}
                options={[{ v: 'mini', label: 'Mini' }, { v: 'junior', label: 'Junior' }, { v: 'tween', label: 'Tween' }, { v: 'adult', label: 'Adulto' }]} />
            </Control>
            <Control label="Nivel de inglés" help="Define currículum, idioma ES/EN y profundidad. El prompt cambia con esto.">
              <select style={FIELD} value={level} disabled={isLive} onChange={(e) => setLevel(e.target.value)}>
                {['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Control>
          </div>
          <div style={{ ...HELP, marginTop: 12 }}>
            El motor arma el prompt real de 9 pasos para <b>{ageGroup} · {level}</b> desde la BD
            (el mismo que ves en <code>test-prompts/{level}/{ageGroup}.md</code>). Cambiá segmento/nivel y "Aplicar" para probar otro.
          </div>
        </div>

        {/* Panel simple */}
        <div style={{ ...CARD, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18 }}>
            <Control label="Ajuste automático del mic" help="El navegador retoca tu volumen solo. Sospechoso de comerse palabras cortas.">
              <Segmented value={agc ? 'on' : 'off'} disabled={isLive} onChange={(v) => setAgc(v === 'on')}
                options={[{ v: 'off', label: 'Apagado (recom.)' }, { v: 'on', label: 'Encendido' }]} />
            </Control>
            <Control label="Filtro de ruido de fondo" help="A veces recorta el arranque de una palabra.">
              <Segmented value={ns ? 'on' : 'off'} disabled={isLive} onChange={(v) => setNs(v === 'on')}
                options={[{ v: 'off', label: 'Apagado' }, { v: 'on', label: 'Encendido' }]} />
            </Control>
            <Control label="Rapidez de respuesta" help="Cuánto silencio espera antes de contestarte.">
              <Segmented value={String(silenceMs)} disabled={isLive} onChange={(v) => setSilenceMs(Number(v))}
                options={[{ v: '400', label: 'Rápido' }, { v: '700', label: 'Normal' }, { v: '1200', label: 'Paciente' }]} />
            </Control>
            <Control label="Oído del coach" help="Qué tan fácil registra que arrancaste a hablar.">
              <Segmented value={startSens} disabled={isLive} onChange={setStartSens}
                options={[{ v: 'START_SENSITIVITY_HIGH', label: 'Fino (recom.)' }, { v: 'START_SENSITIVITY_LOW', label: 'Normal' }]} />
            </Control>
            <Control label="¿Te puede interrumpir?" help="Si podés cortar al coach mientras habla.">
              <Segmented value={activity} disabled={isLive} onChange={setActivity}
                options={[{ v: 'START_OF_ACTIVITY_INTERRUPTS', label: 'Sí' }, { v: 'NO_INTERRUPTION', label: 'No' }]} />
            </Control>
          </div>

          {/* Ajustes finos (plegado) */}
          <button onClick={() => setShowAdvanced((s) => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16, padding: 0, background: 'none', border: 'none', color: '#7dd3fc', fontSize: 13, cursor: 'pointer' }}>
            {showAdvanced ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            Ajustes finos (técnicos)
          </button>
          {showAdvanced && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 14, borderTop: '1px solid #232936', paddingTop: 16 }}>
              <Control label="Motor de voz">
                <select style={FIELD} value={model} disabled={isLive} onChange={(e) => setModel(e.target.value)}>
                  {MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}{m.note ? ` — ${m.note}` : ''}</option>)}
                </select>
              </Control>
              <Control label="Voz del coach">
                <select style={FIELD} value={voice} disabled={isLive} onChange={(e) => setVoice(e.target.value)}>
                  {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </Control>
              <Control label="Cancelar eco" help="Necesario si usás parlantes; con auriculares no hace falta.">
                <Segmented value={aec ? 'on' : 'off'} disabled={isLive} onChange={(v) => setAec(v === 'on')}
                  options={[{ v: 'on', label: 'Sí' }, { v: 'off', label: 'No' }]} />
              </Control>
              <Control label="Detectar fin de turno">
                <Segmented value={endSens} disabled={isLive} onChange={setEndSens}
                  options={[{ v: 'END_SENSITIVITY_HIGH', label: 'Fino' }, { v: 'END_SENSITIVITY_LOW', label: 'Normal' }]} />
              </Control>
              <Control label="Reflexión del coach" help="Cuánto 'piensa' antes de hablar. Más = mejor pero más lento.">
                <input type="number" style={FIELD} value={thinking} disabled={isLive} min={0} max={2048} step={128}
                  onChange={(e) => setThinking(Number(e.target.value))} />
              </Control>
              <Control label="Margen previo (ms)" help="Audio que conserva justo antes de tu voz.">
                <input type="number" style={FIELD} value={prefixMs} disabled={isLive} min={0} max={1000} step={50}
                  onChange={(e) => setPrefixMs(Number(e.target.value))} />
              </Control>
              <Control label="Calidad de captura">
                <select style={FIELD} value={captureSr} disabled={isLive} onChange={(e) => setCaptureSr(Number(e.target.value))}>
                  <option value={16000}>16000 (Gemini)</option>
                  <option value={48000}>48000 (resample backend)</option>
                </select>
              </Control>
              <Control label="Buffer del mic">
                <select style={FIELD} value={workletBuf} disabled={isLive} onChange={(e) => setWorkletBuf(Number(e.target.value))}>
                  <option value={1024}>1024 (reactivo)</option>
                  <option value={2048}>2048</option>
                  <option value={4096}>4096</option>
                </select>
              </Control>
            </div>
          )}
        </div>

        {/* Control + estado */}
        <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
          <button onClick={isLive ? stop : apply}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', borderRadius: 999,
              border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              background: isLive ? '#ef4444' : '#22c55e', color: '#06120a', whiteSpace: 'nowrap',
            }}>
            {isLive ? <Square size={18} /> : <Mic size={18} />}
            {isLive ? 'Terminar' : 'Aplicar y arrancar'}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 9, height: 9, borderRadius: 999,
                background: live.status === 'speaking' ? '#38bdf8' : live.status === 'listening' ? '#22c55e' : live.status === 'error' ? '#ef4444' : '#6b7280',
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
            <div style={{ ...LABEL, marginBottom: 12 }}>Transcripción (subtítulo)</div>
            <LiveSubtitle transcript={live.transcript} aiLabel="Coach" minHeight={300} />
          </div>
          <div style={CARD}>
            <div style={{ ...LABEL, marginBottom: 12 }}>Eventos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
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

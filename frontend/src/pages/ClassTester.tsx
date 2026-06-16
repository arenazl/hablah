/* ClassTester — probador de clase EMBEBIDO (voz real) para la Mesa de control.
 *
 * Reusa el banco de voz aislado: WS `/voice/ws_llm_test` (sin login/BD) que
 * RECOMPONE el prompt del catálogo por (segmento, nivel) al conectar — así prueba
 * SIEMPRE lo último que guardaste, sin ir a la app del cliente. Defaults 10/10
 * (AGC off, VAD responsivo, frase-puente); el tuneo fino vive en /llm.
 */
import { useCallback, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { useLiveVoice } from '../hooks/useLiveVoice'
import { buildLlmTestWsUrl } from '../services/api'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Detenido', connecting: 'Conectando…', listening: 'Escuchando',
  speaking: 'Hablando', error: 'Error', ended: 'Terminado',
}

export default function ClassTester({ ageGroup, level, voice = 'Aoede' }: { ageGroup: string; level: string; voice?: string }) {
  const [micLevel, setMicLevel] = useState(0)
  const [err, setErr] = useState('')
  const live = useLiveVoice({
    onError: (e) => setErr(e.message),
    onMicLevel: (l) => setMicLevel(l),
  })
  const isLive = live.status === 'connecting' || live.status === 'listening' || live.status === 'speaking'

  const start = useCallback(async () => {
    setErr('')
    const url = buildLlmTestWsUrl({
      engine: 'gemini_live', model: 'models/gemini-3.1-flash-live-preview', voice,
      age_group: ageGroup, level,
      start_sens: 'START_SENSITIVITY_HIGH', end_sens: 'END_SENSITIVITY_HIGH',
      silence_ms: 700, prefix_ms: 200, activity: 'START_OF_ACTIVITY_INTERRUPTS', thinking: 256,
    })
    await live.start(0, undefined, voice, url, {
      autoGainControl: false, noiseSuppression: false, echoCancellation: true,
      captureSampleRate: 16000, workletBufferSamples: 2048,
    })
  }, [live, ageGroup, level, voice])

  const stop = useCallback(() => { live.stop(); setMicLevel(0) }, [live])

  return (
    <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 12, color: '#9aa3af', marginBottom: 12 }}>
        Probás la clase REAL para <b style={{ color: '#e6e8ec' }}>{ageGroup} · {level}</b> con lo último que guardaste.
        Hablale al coach (probá la frase-puente: "perro se dice dog"). No toca la app de los clientes.
      </div>

      <button onClick={isLive ? stop : start}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '12px 20px', borderRadius: 999,
          border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', justifyContent: 'center',
          background: isLive ? '#ef4444' : '#22c55e', color: '#06120a',
        }}>
        {isLive ? <Square size={17} /> : <Mic size={17} />}
        {isLive ? 'Terminar clase' : 'Arrancar la clase'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 6px' }}>
        <span style={{
          width: 9, height: 9, borderRadius: 999,
          background: live.status === 'speaking' ? '#38bdf8' : live.status === 'listening' ? '#22c55e' : live.status === 'error' ? '#ef4444' : '#6b7280',
        }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{STATUS_LABEL[live.status] ?? live.status}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: '#232936', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${Math.round(micLevel * 100)}%`, background: '#22c55e', transition: 'width .05s' }} />
      </div>
      {err && <div style={{ color: '#fca5a5', fontSize: 12, marginBottom: 10 }}>{err}</div>}

      <div style={{ fontSize: 10, fontWeight: 800, color: '#9aa3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Transcripción</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: '46vh', overflowY: 'auto' }}>
        {live.transcript.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>Arrancá la clase y hablá. Acá aparece lo que decís vos y el coach.</div>}
        {live.transcript.map((line, i) => (
          <div key={i} style={{ fontSize: 13.5, lineHeight: 1.4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: line.who === 'ai' ? '#7dd3fc' : '#86efac', marginRight: 8 }}>
              {line.who === 'ai' ? 'Coach' : 'Vos'}
            </span>
            <span>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

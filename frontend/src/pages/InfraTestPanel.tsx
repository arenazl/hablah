/* /infra — prueba de cañerías Heroku vs Google Cloud usando el MOTOR REAL.
 *
 * Grabás tu voz UNA vez. Cada botón abre una sesión de voz real (/voice/ws_llm_test,
 * sin auth, prompt real del motor + Gemini Live) contra ese host, reproduce tu clip
 * como ~11 turnos, mide el round-trip de cada uno (fin de tu clip -> primer audio del
 * coach) y lo guarda en la tabla. Se descarta el turno #1 (cold start). Mismo clip,
 * mismo motor, mismo Gemini -> la diferencia es la red del host.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motorAPI, type InfraSummary } from '../services/api'

const HOSTS: Record<string, { label: string; wss: string }> = {
  heroku: { label: 'Heroku', wss: 'wss://hablah-api-abcaf6c43a5d.herokuapp.com/api' },
  gcloud: { label: 'Google Cloud', wss: 'wss://hablah-api-test-233354572460.us-central1.run.app/api' },
}
const WS_PATH = '/voice/ws_llm_test?age_group=mini&level=A0&voice=Aoede'
const TURNS = 8 // se descarta el #1
const SILENCE_MS = 1300 // cola de silencio: dispara el VAD de Gemini para cerrar el turno
const MAX_CLIP_MS = 4000 // recorta el clip (medimos latencia, no charla larga; cuida el límite de sesión)
const RESP_TIMEOUT_MS = 20000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
function ab2b64(ab: ArrayBuffer): string {
  let bin = ''; const bytes = new Uint8Array(ab)
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export default function InfraTestPanel() {
  const [recording, setRecording] = useState(false)
  const [hasClip, setHasClip] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [logLines, setLogLines] = useState<string[]>([])
  const [summary, setSummary] = useState<Record<string, InfraSummary>>({})

  const clipRef = useRef<ArrayBuffer[]>([])
  const srRef = useRef<number>(48000)
  const recCtxRef = useRef<AudioContext | null>(null)
  const recStreamRef = useRef<MediaStream | null>(null)

  const log = useCallback((s: string) => setLogLines((p) => [...p.slice(-200), s]), [])
  const refreshSummary = useCallback(() => {
    motorAPI.infraResults().then((r) => setSummary(r.summary)).catch(() => {})
  }, [])
  useEffect(() => { refreshSummary() }, [refreshSummary])

  // ---- grabar el clip (una vez) ----
  async function startRec() {
    clipRef.current = []
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    const ctx = new AudioContext()
    srRef.current = ctx.sampleRate
    await ctx.audioWorklet.addModule('/audio-worklet/mic-processor.js')
    const src = ctx.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(ctx, 'mic-processor', { processorOptions: { samples: 2048 } })
    node.port.onmessage = (ev: MessageEvent) => {
      if (ev.data?.pcm) clipRef.current.push(ev.data.pcm as ArrayBuffer)
    }
    src.connect(node); node.connect(ctx.destination)
    recCtxRef.current = ctx; recStreamRef.current = stream
    setRecording(true); log('Grabando… hablá una frase corta y tocá Detener.')
  }
  function stopRec() {
    recStreamRef.current?.getTracks().forEach((t) => t.stop())
    recCtxRef.current?.close()
    recCtxRef.current = null; recStreamRef.current = null
    setRecording(false); setHasClip(clipRef.current.length > 0)
    const ms = Math.round((clipRef.current.length * 2048 / srRef.current) * 1000)
    log(`Clip listo: ${clipRef.current.length} chunks (~${ms}ms @ ${srRef.current}Hz)`)
  }

  // ---- correr la tanda contra un host ----
  async function runTest(serverKey: string) {
    if (!clipRef.current.length) { log('Primero grabá tu voz.'); return }
    const host = HOSTS[serverKey]
    setRunning(serverKey); log(`\n=== ${host.label}: abriendo sesión… ===`)
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(host.wss + WS_PATH)
      ws.binaryType = 'arraybuffer'
      let respResolve: ((t: number) => void) | null = null
      let tcResolve: (() => void) | null = null
      ws.onmessage = (ev) => {
        let msg: { type?: string }
        try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '') } catch { return }
        if (msg.type === 'audio' && respResolve) { respResolve(performance.now()); respResolve = null }
        else if (msg.type === 'turn_complete' && tcResolve) { tcResolve(); tcResolve = null }
      }
      await new Promise<void>((res, rej) => {
        ws!.onopen = () => res()
        ws!.onerror = () => rej(new Error('WS error'))
        setTimeout(() => rej(new Error('timeout open')), 10000)
      })
      const ping = setInterval(() => { try { ws!.send(JSON.stringify({ type: 'ping' })) } catch {} }, 5000)
      const chunkMs = (2048 / srRef.current) * 1000

      for (let turn = 0; turn < TURNS; turn++) {
        // reproducir el clip ~realtime
        for (const ab of clipRef.current) {
          ws.send(JSON.stringify({ type: 'audio', data: ab2b64(ab), sample_rate: srRef.current }))
          await sleep(chunkMs)
        }
        const tSendEnd = performance.now()
        const rtt = await new Promise<number | null>((resolve) => {
          respResolve = (t) => resolve(Math.round(t - tSendEnd))
          setTimeout(() => { respResolve = null; resolve(null) }, RESP_TIMEOUT_MS)
        })
        const ok = rtt !== null
        const counted = turn > 0 // descartar #1
        if (counted) {
          await motorAPI.infraResult({ server: serverKey, turn_index: turn, rtt_ms: rtt, ok }).catch(() => {})
        }
        log(`${host.label} turno ${turn}${turn === 0 ? ' (descartado, cold)' : ''}: ${ok ? rtt + ' ms' : 'SIN RESPUESTA'}`)
        // esperar que el coach termine antes del próximo turno
        await new Promise<void>((resolve) => { tcResolve = () => resolve(); setTimeout(resolve, 4000) })
        await sleep(600)
      }
      clearInterval(ping)
      log(`=== ${host.label}: tanda completa ===`)
    } catch (e) {
      log(`${host.label}: ERROR ${(e as Error).message}`)
    } finally {
      try { ws?.close() } catch {}
      setRunning(null); refreshSummary()
    }
  }

  const card: React.CSSProperties = { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 18 }
  return (
    <div style={{ minHeight: '100vh', background: '#0b0e2e', color: '#fff', fontFamily: 'Nunito, system-ui, sans-serif', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 4px' }}>Prueba de infra — latencia del motor real</h1>
          <p style={{ color: '#9aa6e0', margin: 0 }}>Heroku vs Google Cloud · mismo clip, mismo motor, mismo Gemini · {TURNS - 1} turnos medidos (se descarta el #1)</p>
        </div>

        {/* 1. grabar */}
        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>1 · Grabá tu voz (una vez)</div>
          {!recording ? (
            <button onClick={startRec} disabled={!!running} style={{ ...btn, background: '#ef4444' }}>● Grabar</button>
          ) : (
            <button onClick={stopRec} style={{ ...btn, background: '#f59e0b' }}>■ Detener</button>
          )}
          {hasClip && !recording && <span style={{ marginLeft: 12, color: '#22c55e' }}>✓ clip guardado</span>}
        </div>

        {/* 2. correr */}
        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>2 · Corré la tanda en cada host</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(HOSTS).map(([k, h]) => (
              <button key={k} onClick={() => runTest(k)} disabled={!hasClip || !!running}
                style={{ ...btn, background: running === k ? '#475569' : '#3b82f6', minWidth: 180 }}>
                {running === k ? `Corriendo ${h.label}…` : `Probar ${h.label}`}
              </button>
            ))}
          </div>
        </div>

        {/* 3. resultados */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>3 · Resultados</div>
            <button onClick={refreshSummary} style={{ ...btn, padding: '6px 12px', fontSize: 13, background: 'rgba(255,255,255,.12)' }}>↻ Actualizar</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ color: '#9aa6e0', textAlign: 'left' }}>
              {['Host', 'n', 'p50', 'p95', 'min', 'max', 'avg', 'fallos'].map((h) => <th key={h} style={{ padding: '6px 8px' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {Object.entries(summary).map(([srv, s]) => (
                <tr key={srv} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                  <td style={{ padding: '8px', fontWeight: 800 }}>{HOSTS[srv]?.label ?? srv}</td>
                  <td style={{ padding: '8px' }}>{s.n}</td>
                  <td style={{ padding: '8px', fontWeight: 800, color: '#22c55e' }}>{s.p50 ?? '-'} ms</td>
                  <td style={{ padding: '8px' }}>{s.p95 ?? '-'} ms</td>
                  <td style={{ padding: '8px' }}>{s.min ?? '-'}</td>
                  <td style={{ padding: '8px' }}>{s.max ?? '-'}</td>
                  <td style={{ padding: '8px' }}>{s.avg ?? '-'}</td>
                  <td style={{ padding: '8px', color: s.fails ? '#ef4444' : '#9aa6e0' }}>{s.fails}</td>
                </tr>
              ))}
              {!Object.keys(summary).length && <tr><td colSpan={8} style={{ padding: 12, color: '#9aa6e0' }}>Sin datos todavía.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* log en vivo */}
        <div style={{ ...card, fontFamily: 'monospace', fontSize: 12.5, maxHeight: 260, overflowY: 'auto', whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
          {logLines.length ? logLines.join('\n') : 'Log de la prueba…'}
        </div>
      </div>
    </div>
  )
}

const btn: React.CSSProperties = {
  border: 0, color: '#fff', borderRadius: 12, fontSize: 16, fontWeight: 800, padding: '12px 20px', cursor: 'pointer',
}

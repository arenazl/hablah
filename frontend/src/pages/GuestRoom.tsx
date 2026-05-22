/**
 * /charla/:token -- Pantalla publica para invitados.
 *
 * Sin auth. El amigo abre el link, escribe su nombre, y entra a la charla.
 * Se conecta al backend via WS /api/voice/ws_room con el room_token + pid devuelto.
 *
 * El layout es minimal: muestra orb del host (otro lado), orb de Habi al centro
 * y orb propio. Transcripcion en vivo. Boton de salir.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mic, Square, Users, AlertTriangle } from 'lucide-react'
import { AgentAudioVisualizerAura } from '../components/agents-ui/agent-audio-visualizer-aura'

interface RoomParticipant {
  pid: string
  name: string
  is_host: boolean
}

interface RoomInfo {
  token: string
  host_name: string
  topic_title: string | null
  free_topic: string | null
  template_name: string | null
  status: string
  participants: RoomParticipant[]
}

interface TranscriptLine {
  who: 'ai' | 'user'
  text: string
  from_name?: string
}

const PARTICIPANT_PALETTE = ['#FF5E7E', '#22D3EE', '#A8E60E', '#FFC83D', '#7C5CFF', '#FF8A4C']
function colorFor(pid: string): `#${string}` {
  let h = 0
  for (let i = 0; i < pid.length; i++) h = (h * 31 + pid.charCodeAt(i)) >>> 0
  return PARTICIPANT_PALETTE[h % PARTICIPANT_PALETTE.length] as `#${string}`
}

const CSS = `
.guest-root { min-height:100vh; background:radial-gradient(ellipse at 50% 30%, #1a2b26 0%, #050A09 75%); color:#fff; display:flex; flex-direction:column; padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom); font-family:'Sora','Inter',ui-sans-serif,system-ui,sans-serif; }
.guest-top { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; }
.guest-pill { display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:99px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#9CFCD2; }
.guest-back { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:99px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:#fff; font-size:13px; font-weight:700; cursor:pointer; }

.guest-form { max-width:440px; margin:0 auto; padding:32px 28px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10); border-radius:24px; text-align:center; }
.guest-form .ico { width:64px; height:64px; border-radius:20px; background:rgba(0,179,126,.18); color:#9CFCD2; display:grid; place-items:center; margin:0 auto 16px; }
.guest-form h1 { font-weight:800; font-size:24px; margin:0 0 8px; }
.guest-form h1 em { font-style:normal; color:#9CFCD2; }
.guest-form p { font-size:14px; color:rgba(255,255,255,.7); margin:0 0 20px; line-height:1.5; }
.guest-form p b { color:#fff; }
.guest-form label { display:block; font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.5); margin-bottom:8px; text-align:left; }
.guest-form input { width:100%; padding:14px 16px; border-radius:14px; border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.04); color:#fff; font-size:16px; font-family:inherit; outline:none; }
.guest-form input:focus { border-color:#00B37E; box-shadow:0 0 0 3px rgba(0,179,126,.2); }
.guest-form .btn { width:100%; margin-top:16px; padding:0 24px; height:54px; border-radius:14px; background:linear-gradient(180deg,#FFB800,#F09D00); color:#3A2A00; font-weight:800; font-size:16px; border:0; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:10px; font-family:inherit; }
.guest-form .btn:disabled { opacity:.5; cursor:not-allowed; }

.guest-stage { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:16px 24px; gap:24px; }
.guest-h1 { font-weight:800; font-size:clamp(24px, 4vw, 36px); letter-spacing:-0.02em; margin:0; text-align:center; }
.guest-h1 em { font-style:normal; color:#9CFCD2; }

.guest-orbs { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; max-width:760px; width:100%; align-items:end; }
@media (max-width:600px) { .guest-orbs { grid-template-columns:1fr; gap:18px; } }
.guest-orb-card { display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px 12px; border-radius:20px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); transition:all .2s; }
.guest-orb-card.center { background:rgba(0,179,126,.10); border-color:rgba(0,179,126,.30); transform:scale(1.05); }
.guest-orb-card.you { background:rgba(255,184,0,.10); border-color:rgba(255,184,0,.30); }
.guest-orb-card .name { font-size:13px; font-weight:700; }
.guest-orb-card .role { font-size:10px; color:rgba(255,255,255,.6); letter-spacing:.1em; text-transform:uppercase; }
.guest-orb-card .orb-box { width:120px; height:120px; }

.guest-transcript { width:100%; max-width:680px; max-height:200px; overflow-y:auto; padding:14px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:16px; display:flex; flex-direction:column; gap:6px; }
.guest-transcript-line { font-size:14px; line-height:1.45; padding:6px 12px; border-radius:10px; max-width:90%; }
.guest-transcript-line.ai { align-self:flex-start; background:rgba(0,179,126,.18); color:#9CFCD2; }
.guest-transcript-line.user { align-self:flex-end; background:rgba(255,255,255,.08); color:#fff; }
.guest-transcript-line .who { font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.12em; text-transform:uppercase; opacity:.6; display:block; margin-bottom:2px; }

.guest-actions { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; padding:16px 24px 24px; position:sticky; bottom:0; background:linear-gradient(180deg, transparent, rgba(5,10,9,.85) 50%); backdrop-filter:blur(8px); }
.guest-btn-primary { display:inline-flex; align-items:center; gap:10px; padding:0 28px; height:58px; border-radius:99px; background:linear-gradient(180deg,#FFB800,#F09D00); color:#3A2A00; font-weight:800; font-size:16px; border:0; cursor:pointer; font-family:inherit; }
.guest-btn-danger { display:inline-flex; align-items:center; gap:10px; padding:0 24px; height:54px; border-radius:99px; background:linear-gradient(180deg,#EF4444,#B91C1C); color:#fff; font-weight:800; font-size:14px; border:0; cursor:pointer; font-family:inherit; }

.guest-error { padding:32px 24px; text-align:center; color:rgba(255,255,255,.7); }
.guest-error h2 { color:#fff; font-weight:800; font-size:22px; margin:0 0 8px; }
`

export function GuestRoom() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<RoomInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [pid, setPid] = useState<string | null>(null)
  const [participants, setParticipants] = useState<RoomParticipant[]>([])
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'ended'>('idle')

  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const playCtxRef = useRef<AudioContext | null>(null)
  const procRef = useRef<ScriptProcessorNode | null>(null)
  const nextStartTimeRef = useRef(0)
  const [orbAudio, setOrbAudio] = useState(0.15)

  useEffect(() => {
    if (!token) return
    fetch(`/api/rooms/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: RoomInfo) => {
        setInfo(data)
        setParticipants(data.participants)
      })
      .catch((s) => {
        if (s === 404) setError('La sala no existe o el link es invalido')
        else if (s === 410) setError('La sala ya termino')
        else setError('No pudimos cargar la sala')
      })
      .finally(() => setLoading(false))
  }, [token])

  const cleanup = () => {
    try { wsRef.current?.close() } catch {}
    wsRef.current = null
    try { procRef.current?.disconnect() } catch {}
    procRef.current = null
    if (audioCtxRef.current) { try { audioCtxRef.current.close() } catch {} }
    audioCtxRef.current = null
    if (playCtxRef.current) { try { playCtxRef.current.close() } catch {} }
    playCtxRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => () => cleanup(), [])

  const playPCMChunk = (b64: string) => {
    try {
      const bytes = atob(b64)
      const buf = new ArrayBuffer(bytes.length)
      const view = new Uint8Array(buf)
      for (let i = 0; i < bytes.length; i++) view[i] = bytes.charCodeAt(i)
      const samples = new Int16Array(buf)
      const floats = new Float32Array(samples.length)
      for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 32768
      if (!playCtxRef.current) playCtxRef.current = new AudioContext({ sampleRate: 24000 })
      const ctx = playCtxRef.current
      const audioBuf = ctx.createBuffer(1, floats.length, 24000)
      audioBuf.getChannelData(0).set(floats)
      const src = ctx.createBufferSource()
      src.buffer = audioBuf
      src.connect(ctx.destination)
      const startAt = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.02)
      src.start(startAt)
      nextStartTimeRef.current = startAt + audioBuf.duration
    } catch (e) {
      console.error('playPCMChunk', e)
    }
  }

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !name.trim()) return
    setStatus('connecting')
    try {
      const res = await fetch(`/api/rooms/${token}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error('No pude entrar')
      const data = await res.json()
      setPid(data.guest_pid)
      setInfo(data.info)
      setParticipants(data.info.participants)
      setJoined(true)
      await openVoice(data.guest_pid)
    } catch (e: any) {
      setError(e?.message || 'Error al entrar')
      setStatus('idle')
    }
  }

  const openVoice = async (myPid: string) => {
    // Mic
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      })
    } catch {
      setError('Necesitamos acceso al microfono')
      setStatus('idle')
      return
    }
    streamRef.current = stream

    // WS
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/api/voice/ws_room?room_token=${token}&pid=${myPid}`)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('live')
      // Audio capture loop
      const ctx = new AudioContext({ sampleRate: 16000 })
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const proc = ctx.createScriptProcessor(2048, 1, 1)
      procRef.current = proc
      proc.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return
        const input = e.inputBuffer.getChannelData(0)
        // RMS para audioLevel
        let sum = 0
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
        const rms = Math.sqrt(sum / input.length)
        setOrbAudio(Math.max(0.15, Math.min(1, rms * 4)))
        // Convertir a int16 LE
        const pcm = new Int16Array(input.length)
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]))
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }
        // base64
        const u8 = new Uint8Array(pcm.buffer)
        let bin = ''
        for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i])
        const b64 = btoa(bin)
        ws.send(JSON.stringify({ type: 'audio', data: b64 }))
      }
      source.connect(proc)
      proc.connect(ctx.destination)
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'audio') {
          playPCMChunk(msg.data)
        } else if (msg.type === 'participant_audio') {
          // Audio de otro participante (16kHz, NO 24kHz)
          try {
            const bytes = atob(msg.data)
            const buf = new ArrayBuffer(bytes.length)
            const view = new Uint8Array(buf)
            for (let i = 0; i < bytes.length; i++) view[i] = bytes.charCodeAt(i)
            const samples = new Int16Array(buf)
            const floats = new Float32Array(samples.length)
            for (let i = 0; i < samples.length; i++) floats[i] = samples[i] / 32768
            // playback @ 16kHz
            if (!playCtxRef.current) playCtxRef.current = new AudioContext({ sampleRate: 24000 })
            const ctx = playCtxRef.current
            const audioBuf = ctx.createBuffer(1, floats.length, 16000)
            audioBuf.getChannelData(0).set(floats)
            const src = ctx.createBufferSource()
            src.buffer = audioBuf
            src.connect(ctx.destination)
            const startAt = Math.max(nextStartTimeRef.current, ctx.currentTime + 0.02)
            src.start(startAt)
            nextStartTimeRef.current = startAt + audioBuf.duration
          } catch (e) { console.error(e) }
        } else if (msg.type === 'transcript_chunk') {
          setTranscript((prev) => {
            const last = prev[prev.length - 1]
            if (last && last.who === msg.who) {
              const updated = [...prev]
              updated[updated.length - 1] = { ...last, text: last.text + msg.text }
              return updated
            }
            return [...prev, { who: msg.who, text: msg.text }]
          })
        } else if (msg.type === 'participant_joined' || msg.type === 'room_joined') {
          if (msg.participants) setParticipants(msg.participants)
        } else if (msg.type === 'participant_left') {
          setParticipants((prev) => prev.filter((p) => p.pid !== msg.pid))
        } else if (msg.type === 'room_closed') {
          setStatus('ended')
        }
      } catch {}
    }

    ws.onclose = () => {
      if (status !== 'ended') setStatus('ended')
    }
    ws.onerror = () => setError('Se perdio la conexion')
  }

  const onLeave = () => {
    try { wsRef.current?.send(JSON.stringify({ type: 'end' })) } catch {}
    cleanup()
    setStatus('ended')
  }

  if (loading) {
    return <div className="guest-root"><style>{CSS}</style><div className="guest-error">Cargando…</div></div>
  }
  if (error || !info) {
    return (
      <div className="guest-root">
        <style>{CSS}</style>
        <div className="guest-error">
          <AlertTriangle size={40} style={{ margin: '0 auto 12px', display: 'block', color: '#FF8A4C' }} />
          <h2>{error ?? 'Error'}</h2>
          <p>Pedile a tu amigo que te mande el link de nuevo.</p>
        </div>
      </div>
    )
  }

  if (status === 'ended') {
    return (
      <div className="guest-root">
        <style>{CSS}</style>
        <div className="guest-error">
          <h2>La charla termino</h2>
          <p>Gracias por participar. <Link to="/" style={{ color: '#9CFCD2', fontWeight: 700 }}>Volver al inicio</Link></p>
        </div>
      </div>
    )
  }

  // FORM
  if (!joined) {
    return (
      <div className="guest-root">
        <style>{CSS}</style>
        <div className="guest-top">
          <Link to="/" className="guest-back"><ArrowLeft size={14} /> Salir</Link>
          <span className="guest-pill"><Users size={12} /> Charla de {info.host_name}</span>
          <div style={{ width: 70 }} />
        </div>
        <div className="guest-stage">
          <form className="guest-form" onSubmit={onJoin}>
            <div className="ico"><Users size={28} /></div>
            <h1>Te invitaron a <em>una charla</em></h1>
            <p>
              <b>{info.host_name}</b> te invito a una charla con su tutor de IA{info.topic_title ? <> sobre <b>{info.topic_title.toLowerCase()}</b></> : ''}.
              <br />Escribi tu nombre y entra.
            </p>
            <label>¿Cómo te llamás?</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" maxLength={40} />
            <button type="submit" className="btn" disabled={!name.trim() || status === 'connecting'}>
              <Mic size={20} />
              {status === 'connecting' ? 'Entrando…' : 'Unirme a la charla'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // LIVE
  return (
    <div className="guest-root">
      <style>{CSS}</style>
      <div className="guest-top">
        <Link to="/" className="guest-back" onClick={(e) => { e.preventDefault(); onLeave() }}><ArrowLeft size={14} /> Salir</Link>
        <span className="guest-pill"><Users size={12} /> {participants.length} en la charla</span>
        <div style={{ width: 70 }} />
      </div>

      <div className="guest-stage">
        <h2 className="guest-h1">
          {info.topic_title ? <>Hablando de <em>{info.topic_title.toLowerCase()}</em></> : <em>Charla con Habi</em>}
        </h2>

        <div className="guest-orbs">
          {participants.filter((p) => p.is_host).map((p) => (
            <div key={p.pid} className={`guest-orb-card ${p.pid === pid ? 'you' : ''}`}>
              <div className="orb-box">
                <AgentAudioVisualizerAura status="speaking" audioLevel={0.3} color={colorFor(p.pid)} colorShift={0.12} themeMode="dark" size="md" />
              </div>
              <span className="name">{p.name}</span>
              <span className="role">Anfitrión</span>
            </div>
          ))}
          <div className="guest-orb-card center">
            <div className="orb-box">
              <AgentAudioVisualizerAura status="speaking" audioLevel={0.5} color={'#00B37E'} colorShift={0.14} themeMode="dark" size="md" />
            </div>
            <span className="name" style={{ color: '#9CFCD2' }}>Tutor</span>
            <span className="role">IA</span>
          </div>
          {participants.filter((p) => !p.is_host).map((p) => (
            <div key={p.pid} className={`guest-orb-card ${p.pid === pid ? 'you' : ''}`}>
              <div className="orb-box">
                <AgentAudioVisualizerAura status="speaking" audioLevel={p.pid === pid ? orbAudio : 0.3} color={colorFor(p.pid)} colorShift={0.12} themeMode="dark" size="md" />
              </div>
              <span className="name">{p.name}{p.pid === pid ? ' (vos)' : ''}</span>
              <span className="role">Invitado</span>
            </div>
          ))}
        </div>

        {transcript.length > 0 && (
          <div className="guest-transcript">
            {transcript.map((l, i) => (
              <div key={i} className={`guest-transcript-line ${l.who}`}>
                <span className="who">{l.who === 'ai' ? 'Tutor' : 'Alguien'}</span>
                {l.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="guest-actions">
        <button className="guest-btn-danger" onClick={onLeave}>
          <Square size={16} fill="white" /> Salir de la charla
        </button>
      </div>
    </div>
  )
}

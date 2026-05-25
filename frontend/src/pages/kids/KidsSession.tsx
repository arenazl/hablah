/**
 * /kids/sesion/:topicId -- Sesion REAL con Habi (audio + transcripcion).
 *
 * Cableado:
 * - POST /api/sessions/start con kids_token Bearer -> obtiene session_id
 * - useLiveVoice abre WebSocket /voice/ws con el kid_token -> audio bidireccional
 * - Orb gigante refleja status (idle/connecting/listening/speaking) con color real-time
 * - Transcripcion en vivo (alterna AI/user)
 * - Boton "Terminar" cierra WS, POST /sessions/{id}/end, vuelve a /kids
 *
 * Si no hay kids_token (modo demo) muestra mensaje pidiendo al padre crear perfil.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Mic, RefreshCw, Square, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { AgentAudioVisualizerAura } from '../../components/agents-ui/agent-audio-visualizer-aura'
import { useLiveVoice } from '../../hooks/useLiveVoice'
import { useKid, KIDS_TOKEN_KEY } from './KidsContext'
import { InviteFriendButton } from '../../components/InviteFriendButton'

interface TopicData {
  id: number
  slug: string
  title: string
  keywords?: string[]
}

const SESSION_PALETTE = [
  '#FF5E7E', '#FF8A4C', '#FFC83D', '#A8E60E',
  '#22D67A', '#1AC5A0', '#22D3EE', '#3B82F6',
  '#7C5CFF', '#C026D3', '#EC4899', '#FF4D6D',
]
function colorForTopic(topicId: number): `#${string}` {
  const idx = Math.abs((topicId * 2654435761) >>> 0) % SESSION_PALETTE.length
  return SESSION_PALETTE[idx] as `#${string}`
}

const CSS = `
.kids-session-root { min-height:100vh; background:radial-gradient(ellipse at 50% 30%, #1a2b26 0%, #050A09 75%); color:#fff; display:flex; flex-direction:column; padding-top:env(safe-area-inset-top); padding-bottom:env(safe-area-inset-bottom); font-family:'Sora',ui-sans-serif,system-ui,sans-serif; }
.kids-session-top { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; }
.kids-session-back { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:99px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:#fff; font-size:13px; font-weight:700; backdrop-filter:blur(8px); cursor:pointer; }
.kids-session-back:hover { background:rgba(255,255,255,.16); }
.kids-session-topic-pill { display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:99px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#9CFCD2; }
.kids-session-topic-pill .dot { width:8px; height:8px; border-radius:50%; }

.kids-session-content { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px 24px 12px; text-align:center; gap:18px; }
.kids-session-h1 { font-weight:800; font-size:clamp(28px, 5vw, 44px); letter-spacing:-0.03em; line-height:1.05; margin:0; max-width:680px; }
.kids-session-h1 em { font-style:normal; color:#9CFCD2; }
.kids-session-sub { font-size:15px; color:rgba(255,255,255,.65); margin:0; max-width:520px; line-height:1.5; }
.kids-session-sub b { color:#fff; font-weight:600; }

.kids-orb-wrap { width:min(280px, 55vw); height:min(280px, 55vw); position:relative; display:grid; place-items:center; }
.kids-orb-wrap::before { content:""; position:absolute; inset:-20px; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,.06), transparent 65%); }

.kids-session-actions { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; padding:16px 24px 24px; position:sticky; bottom:0; background:linear-gradient(180deg, transparent 0%, rgba(5,10,9,.85) 50%); backdrop-filter:blur(8px); z-index:5; }
.kids-session-btn-primary { display:inline-flex; align-items:center; gap:10px; padding:0 32px; height:64px; border-radius:99px; background:linear-gradient(180deg,#FFB800,#F09D00); color:#3A2A00; font-weight:800; font-size:17px; letter-spacing:-0.01em; box-shadow:0 12px 30px rgba(240,157,0,.45), 0 4px 12px rgba(0,0,0,.2); border:0; cursor:pointer; transition:transform .15s; font-family:inherit; }
.kids-session-btn-primary:hover { transform:translateY(-2px) scale(1.02); }
.kids-session-btn-primary:active { transform:scale(.97); }
.kids-session-btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
.kids-session-btn-primary svg { width:24px; height:24px; }
.kids-session-btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:0 22px; height:54px; border-radius:99px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); color:#fff; font-weight:600; font-size:14px; cursor:pointer; transition:all .15s; font-family:inherit; text-decoration:none; }
.kids-session-btn-ghost:hover { background:rgba(255,255,255,.12); }

.kids-session-status { font-family:'JetBrains Mono', ui-monospace, monospace; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:rgba(232,236,234,.6); display:inline-flex; align-items:center; gap:8px; }
.kids-session-status .pulse { width:8px; height:8px; border-radius:50%; background:#22C55E; box-shadow:0 0 0 0 rgba(34,197,94,.6); animation:kids-pulse 1.5s ease-out infinite; }
@keyframes kids-pulse { 0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)} 100%{box-shadow:0 0 0 12px rgba(34,197,94,0)} }

.kids-transcript { width:100%; max-width:680px; max-height:200px; overflow-y:auto; padding:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:16px; display:flex; flex-direction:column; gap:6px; }
.kids-transcript-line { font-size:14px; line-height:1.45; padding:6px 12px; border-radius:10px; max-width:90%; }
.kids-transcript-line.ai { align-self:flex-start; background:rgba(0,179,126,.18); color:#9CFCD2; }
.kids-transcript-line.user { align-self:flex-end; background:rgba(255,255,255,.08); color:#fff; }
.kids-transcript-line .who { font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.12em; text-transform:uppercase; opacity:.6; display:block; margin-bottom:2px; }

.kids-renew-banner { position:fixed; top:env(safe-area-inset-top); left:50%; transform:translateX(-50%); margin-top:12px; padding:10px 16px; border-radius:99px; font-size:13px; font-weight:700; z-index:60; display:inline-flex; align-items:center; gap:8px; backdrop-filter:blur(8px); box-shadow:0 8px 24px rgba(0,0,0,.3); animation:kids-banner-in .4s cubic-bezier(.2,.8,.2,1); }
.kids-renew-banner.warn { background:rgba(255,184,0,.92); color:#3A2A00; border:1px solid #FFB800; }
.kids-renew-banner.renewing { background:rgba(59,130,246,.92); color:#fff; border:1px solid #3B82F6; }
.kids-renew-banner.renewed { background:rgba(34,197,94,.92); color:#fff; border:1px solid #22C55E; }
.kids-renew-banner .ico { width:18px; height:18px; }
.kids-renew-banner.renewing .ico { animation:kids-spin 1s linear infinite; }
@keyframes kids-spin { to { transform:rotate(360deg); } }
@keyframes kids-banner-in { from { opacity:0; transform:translateX(-50%) translateY(-12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

.kids-session-locked { max-width:480px; margin:0 auto; padding:32px 28px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.10); border-radius:24px; text-align:center; }
.kids-session-locked .ico { width:64px; height:64px; border-radius:18px; background:rgba(255,184,0,.18); color:#FFB800; display:grid; place-items:center; margin:0 auto 16px; }
.kids-session-locked h3 { font-weight:800; font-size:22px; margin:0 0 8px; }
.kids-session-locked p { font-size:14px; color:rgba(255,255,255,.7); margin:0 0 20px; line-height:1.5; }
.kids-session-locked p b { color:#fff; }
`

export function KidsSession() {
  const navigate = useNavigate()
  const { topicId } = useParams<{ topicId: string }>()
  const location = useLocation()
  const { kid } = useKid()

  const [topic, setTopic] = useState<TopicData | null>(
    (location.state as { topic?: TopicData } | null)?.topic ?? null,
  )
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [audioLevel, setAudioLevel] = useState(0.2)
  const [renewBanner, setRenewBanner] = useState<{ kind: 'warn' | 'renewing' | 'renewed'; msg: string } | null>(null)
  const startedRef = useRef(false)

  const live = useLiveVoice({
    onAudioLevel: (lvl) => setAudioLevel(lvl),
    onError: (e) => {
      console.error('[kids-voice]', e)
      alert('Hubo un problema con el micrófono. Asegurate de permitir el acceso.')
    },
    onSessionEndingSoon: ({ message }) => {
      setRenewBanner({ kind: 'warn', msg: message })
    },
    onSessionRenewing: () => {
      setRenewBanner({ kind: 'renewing', msg: 'Renovando charla… seguí hablando como siempre.' })
    },
    onSessionRenewed: (message) => {
      setRenewBanner({ kind: 'renewed', msg: message })
      setTimeout(() => setRenewBanner(null), 3500)
    },
    onParticipantJoined: (info) => {
      if (!info.isHost) toast.success(`${info.name} se sumó a la charla`)
    },
    onParticipantLeft: (info) => {
      toast(`${info.name} salió`)
    },
    onRoomClosed: () => {
      toast('La sala se cerró')
    },
  })

  const isFree = topicId === 'free'
  const freeQ = new URLSearchParams(location.search).get('q') ?? ''
  const displayTitle = isFree ? freeQ : topic?.title ?? 'Cargando...'
  const topicNumericId = topic?.id ?? (topicId ? parseInt(topicId, 10) : 1)
  const color = colorForTopic(isNaN(topicNumericId) ? 1 : topicNumericId)

  // Si no vino del state (deeplink), fetchear topico
  useEffect(() => {
    if (topic || !topicId || topicId === 'free') return
    fetch(`/api/kids/topics?age_group=${kid.age_group}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: TopicData[]) => {
        const found = list.find((t) => String(t.id) === topicId)
        if (found) setTopic(found)
      })
      .catch(() => {})
  }, [topic, topicId, kid.age_group])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      try { live.stop() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasKidsToken = typeof window !== 'undefined' && !!localStorage.getItem(KIDS_TOKEN_KEY)

  const beginSession = async () => {
    if (startedRef.current) return
    const kidsToken = localStorage.getItem(KIDS_TOKEN_KEY)
    if (!kidsToken) return  // bloqueado, no debería llegar acá

    startedRef.current = true
    try {
      const body: Record<string, unknown> = {}
      if (!isFree && topic?.id) body.topic_id = topic.id
      else if (isFree && freeQ) body.free_topic = freeQ

      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kidsToken}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.text()
        alert(`No pudimos arrancar la sesión: ${err}`)
        startedRef.current = false
        return
      }
      const data = await res.json()
      setSessionId(data.session_id)
      await live.start(data.session_id, kidsToken)
    } catch (e) {
      console.error(e)
      alert('Error de conexión. Probá de nuevo.')
      startedRef.current = false
    }
  }

  const endSession = async () => {
    live.stop()
    const kidsToken = localStorage.getItem(KIDS_TOKEN_KEY)
    if (sessionId && kidsToken) {
      try {
        await fetch(`/api/sessions/${sessionId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kidsToken}` },
          body: JSON.stringify({ transcript: live.transcript }),
        })
      } catch {}
    }
    navigate('/kids')
  }

  // Status visual del orb: 'speaking' siempre que haya audio activo
  // (tanto cuando Habi habla COMO cuando el chico habla — el audioLevel
  // del mic hace palpitar el orb en tiempo real).
  const orbStatus: 'idle' | 'speaking' =
    live.status === 'speaking' || live.status === 'listening' ? 'speaking' : 'idle'

  // Cuando el chico habla, usamos su audioLevel real (RMS del mic).
  // Cuando Habi habla, usamos un valor más alto para que el orb palpite fuerte.
  const orbAudio =
    live.status === 'speaking'
      ? Math.max(0.5, audioLevel)
      : live.status === 'listening'
      ? Math.max(0.15, audioLevel * 1.4) // amplificamos un poco la voz del chico
      : 0.15

  const isActive = live.status === 'listening' || live.status === 'speaking' || live.status === 'connecting'

  return (
    <div className="kids-session-root">
      <style>{CSS}</style>

      {renewBanner && (
        <div className={`kids-renew-banner ${renewBanner.kind}`}>
          {renewBanner.kind === 'warn' && (
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          )}
          {renewBanner.kind === 'renewing' && (
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 4v8h8"/></svg>
          )}
          {renewBanner.kind === 'renewed' && (
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
          )}
          {renewBanner.msg}
        </div>
      )}

      <div className="kids-session-top">
        <button className="kids-session-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} strokeWidth={2.4} />
          Volver
        </button>
        <div className="kids-session-topic-pill">
          <span className="dot" style={{ background: color }} />
          {isFree ? 'Tema libre' : 'Hablando con Habi'}
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div className="kids-session-content">
        {!hasKidsToken ? (
          <div className="kids-session-locked">
            <div className="ico"><Lock size={28} strokeWidth={2.2} /></div>
            <h3>Para hablar con Habi necesitás tu perfil</h3>
            <p>
              Pedile a tu <b>mamá o papá</b> que entren a su cuenta y te creen el perfil desde <b>"Modo Kids"</b>.
              Después vas a poder hablar con Habi por micrófono.
            </p>
            <Link to="/login" className="kids-session-btn-ghost" style={{ display: 'inline-flex' }}>
              Entrar como adulto
            </Link>
          </div>
        ) : (
          <>
            <p className="kids-session-status">
              {live.status === 'idle' && (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  {isFree ? 'Tema que vos elegiste' : 'Tema del día'}
                </>
              )}
              {live.status === 'connecting' && (
                <>
                  <span className="pulse" />
                  Conectando con Habi...
                </>
              )}
              {live.status === 'listening' && (
                <>
                  <span className="pulse" />
                  Habi te está escuchando
                </>
              )}
              {live.status === 'speaking' && (
                <>
                  <span className="pulse" />
                  Habi te está hablando
                </>
              )}
              {live.status === 'error' && (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                  Hubo un error
                </>
              )}
            </p>

            <h1 className="kids-session-h1">
              {live.status === 'idle' ? <>¡Hablemos de <em>{displayTitle.toLowerCase()}</em>!</> : displayTitle}
            </h1>

            {live.status === 'idle' && (
              <p className="kids-session-sub">
                Cuando estés <b>listo</b>, tocá el botón amarillo. Habi te va a escuchar y te responde en voz alta.
              </p>
            )}

            <div className="kids-orb-wrap">
              <AgentAudioVisualizerAura
                status={orbStatus}
                audioLevel={orbAudio}
                color={color}
                colorShift={0.14}
                themeMode="dark"
                size="lg"
              />
            </div>

            {live.status === 'idle' && topic?.keywords && topic.keywords.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 480 }}>
                {topic.keywords.slice(0, 5).map((k) => (
                  <span key={k} style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 99,
                    background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)',
                    color: '#9CFCD2', fontWeight: 600,
                  }}>{k}</span>
                ))}
              </div>
            )}

            {/* Transcripción */}
            {live.transcript.length > 0 && (
              <div className="kids-transcript">
                {live.transcript.map((line, i) => (
                  <div key={i} className={`kids-transcript-line ${line.who}`}>
                    <span className="who">{line.who === 'ai' ? 'Habi' : kid.name}</span>
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="kids-session-actions">
        {hasKidsToken && !isActive && (
          <>
            <button className="kids-session-btn-primary" onClick={beginSession}>
              <Mic size={22} strokeWidth={2.4} />
              ¡Empezar a hablar!
            </button>
            <Link to="/kids/topicos" className="kids-session-btn-ghost">
              <RefreshCw size={16} strokeWidth={2.2} />
              Cambiar tema
            </Link>
            {topic && (
              <InviteFriendButton
                topicId={topic.id}
                variant="light"
                label="Invitar amigo"
                authToken={localStorage.getItem(KIDS_TOKEN_KEY) ?? undefined}
                onRoomCreated={(roomToken, hostPid) => {
                  live.upgradeToRoom(roomToken, hostPid)
                  toast.success('Sala lista — mandá el link y esperá al amigo')
                }}
              />
            )}
          </>
        )}
        {hasKidsToken && isActive && (
          <button className="kids-session-btn-primary" onClick={endSession} style={{ background: 'linear-gradient(180deg,#EF4444,#B91C1C)', color: '#fff' }}>
            <Square size={20} strokeWidth={2.4} fill="white" />
            Terminar charla
          </button>
        )}
      </div>
    </div>
  )
}

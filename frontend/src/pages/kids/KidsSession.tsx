/**
 * /kids/sesion/:topicId -- Pantalla de sesion kid (UI funcional, audio fase 2)
 *
 * Hoy: muestra el orb gigante del topico, hero del topico, botones grandes
 * de "Empezar" y "Cambiar tema". El audio real (Gemini Live + ElevenLabs)
 * queda para proxima iteracion - aca se cabea con useLiveVoice del adulto.
 *
 * Reutiliza AgentAudioVisualizerAura para el orb visual.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Mic, RefreshCw, Square } from 'lucide-react'
import { AgentAudioVisualizerAura } from '../../components/agents-ui/agent-audio-visualizer-aura'
import { useKid } from './KidsContext'

interface TopicData {
  id: number
  slug: string
  title: string
  keywords?: string[]
}

// Color por hash de id (sin marcas, vibe alegre)
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
.kids-session-root { position:fixed; inset:0; z-index:50; background:radial-gradient(ellipse at 50% 30%, #1a2b26 0%, #050A09 75%); color:#fff; display:flex; flex-direction:column; padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom); overflow:hidden; font-family:'Sora',ui-sans-serif,system-ui,sans-serif; }
.kids-session-top { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; }
.kids-session-back { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:99px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:#fff; font-size:13px; font-weight:700; backdrop-filter:blur(8px); cursor:pointer; }
.kids-session-back:hover { background:rgba(255,255,255,.16); }
.kids-session-topic-pill { display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:99px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#9CFCD2; }
.kids-session-topic-pill .dot { width:8px; height:8px; border-radius:50%; }

.kids-session-content { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; text-align:center; gap:24px; }
.kids-session-h1 { font-weight:800; font-size:clamp(32px, 6vw, 56px); letter-spacing:-0.03em; line-height:1.05; margin:0; max-width:680px; }
.kids-session-h1 em { font-style:normal; color:#9CFCD2; }
.kids-session-sub { font-size:16px; color:rgba(255,255,255,.65); margin:0; max-width:520px; line-height:1.5; }
.kids-session-sub b { color:#fff; font-weight:600; }

.kids-orb-wrap { width:min(360px, 70vw); height:min(360px, 70vw); position:relative; display:grid; place-items:center; }
.kids-orb-wrap::before { content:""; position:absolute; inset:-20px; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,.06), transparent 65%); }

.kids-session-actions { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; padding:24px; padding-bottom:32px; }
.kids-session-btn-primary { display:inline-flex; align-items:center; gap:10px; padding:0 32px; height:64px; border-radius:99px; background:linear-gradient(180deg,#FFB800,#F09D00); color:#3A2A00; font-weight:800; font-size:17px; letter-spacing:-0.01em; box-shadow:0 12px 30px rgba(240,157,0,.45), 0 4px 12px rgba(0,0,0,.2); border:0; cursor:pointer; transition:transform .15s; font-family:inherit; }
.kids-session-btn-primary:hover { transform:translateY(-2px) scale(1.02); }
.kids-session-btn-primary:active { transform:scale(.97); }
.kids-session-btn-primary svg { width:24px; height:24px; }
.kids-session-btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:0 22px; height:54px; border-radius:99px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); color:#fff; font-weight:600; font-size:14px; cursor:pointer; transition:all .15s; font-family:inherit; }
.kids-session-btn-ghost:hover { background:rgba(255,255,255,.12); }

/* Estado: speaking (placeholder de audio futuro) */
.kids-session-status { font-family:'JetBrains Mono', ui-monospace, monospace; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:rgba(232,236,234,.5); display:inline-flex; align-items:center; gap:8px; }
.kids-session-status .pulse { width:8px; height:8px; border-radius:50%; background:#22C55E; box-shadow:0 0 0 0 rgba(34,197,94,.6); animation:pulse 1.5s ease-out infinite; }
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)} 100%{box-shadow:0 0 0 12px rgba(34,197,94,0)} }

.kids-session-banner { background:rgba(255,184,0,.12); border:1px solid rgba(255,184,0,.30); color:#FFE9A6; font-size:13px; padding:10px 16px; border-radius:14px; max-width:520px; margin:0 auto; text-align:center; }
.kids-session-banner b { color:#fff; font-weight:600; }
`

export function KidsSession() {
  const navigate = useNavigate()
  const { topicId } = useParams<{ topicId: string }>()
  const location = useLocation()
  const { kid } = useKid()

  const [topic, setTopic] = useState<TopicData | null>(
    (location.state as { topic?: TopicData } | null)?.topic ?? null,
  )
  const [status, setStatus] = useState<'idle' | 'starting' | 'speaking'>('idle')

  // Si no vino del state (deeplink), fetcheamos la lista y filtramos
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

  // Soportar tópico libre via ?q=
  const isFree = topicId === 'free'
  const freeQ = new URLSearchParams(location.search).get('q') ?? ''
  const displayTitle = isFree ? freeQ : topic?.title ?? 'Cargando...'

  const topicNumericId = topic?.id ?? (topicId ? parseInt(topicId, 10) : 1)
  const color = colorForTopic(isNaN(topicNumericId) ? 1 : topicNumericId)

  const start = () => {
    setStatus('starting')
    setTimeout(() => setStatus('speaking'), 600)
  }

  const stop = () => {
    setStatus('idle')
  }

  return (
    <div className="kids-session-root">
      <style>{CSS}</style>

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
        {status === 'idle' && (
          <>
            <p className="kids-session-status">
              <span className="dot" style={{ background: color, width: 8, height: 8, borderRadius: '50%' }} />
              {isFree ? 'Tema que vos elegiste' : 'Tema del día'}
            </p>
            <h1 className="kids-session-h1">
              ¡Hablemos de <em>{displayTitle.toLowerCase()}</em>!
            </h1>
            <p className="kids-session-sub">
              Cuando estés <b>listo</b>, tocá el botón amarillo y empezá a hablar. Habi te escucha y te responde en voz alta.
            </p>
          </>
        )}

        {status !== 'idle' && (
          <>
            <p className="kids-session-status">
              <span className="pulse" />
              {status === 'starting' ? 'Conectando con Habi...' : 'Habi te está escuchando'}
            </p>
            <h1 className="kids-session-h1">
              {isFree ? freeQ : displayTitle}
            </h1>
          </>
        )}

        <div className="kids-orb-wrap">
          <AgentAudioVisualizerAura
            status={status === 'speaking' ? 'speaking' : 'idle'}
            audioLevel={status === 'speaking' ? 0.7 : 0.2}
            color={color}
            colorShift={0.14}
            themeMode="dark"
            size="lg"
          />
        </div>

        {status === 'idle' && topic?.keywords && topic.keywords.length > 0 && (
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

        <div className="kids-session-banner">
          <b>Próximamente</b>: cuando tu mamá o papá lo habiliten, vas a hablar de verdad con Habi por micrófono.
        </div>
      </div>

      <div className="kids-session-actions">
        {status === 'idle' ? (
          <>
            <button className="kids-session-btn-primary" onClick={start}>
              <Mic size={22} strokeWidth={2.4} />
              ¡Empezar a hablar!
            </button>
            <Link to="/kids/topicos" className="kids-session-btn-ghost">
              <RefreshCw size={16} strokeWidth={2.2} />
              Cambiar tema
            </Link>
          </>
        ) : (
          <button className="kids-session-btn-primary" onClick={stop} style={{ background: 'linear-gradient(180deg,#EF4444,#B91C1C)', color: '#fff' }}>
            <Square size={20} strokeWidth={2.4} fill="white" />
            Terminar charla
          </button>
        )}
      </div>
    </div>
  )
}

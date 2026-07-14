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
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Mic, RefreshCw, Square, Lock } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { useLiveVoice } from '../../hooks/useLiveVoice'
import LiveSubtitle from '../../components/LiveSubtitle'
import { useKid, KIDS_TOKEN_KEY } from './KidsContext'
import { InviteFriendButton } from '../../components/InviteFriendButton'
import { BuddyPicker } from '../../components/kids/BuddyPicker'
import { KidsBuddy } from '../../components/kids/KidsBuddy'
import { getBuddyById, getSavedBuddyId, saveBuddyId } from '../../components/kids/kidsBuddies'
import {
  KidsVisualCueOverlay, normalizeVisualWord, preloadVisualCueAssets, singularizeEnglish, type VisualCueItem,
} from '../../components/kids/KidsVisualCue'
import { motorAPI } from '../../services/api'

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

// Posiciones de los objetos flotantes: por los COSTADOS y esquinas, lejos del
// centro (ahí vive el león). [left%, top%, width px]
const FLOAT_SPOTS: Array<[number, number, number]> = [
  [4, 14, 48], [88, 10, 42], [7, 42, 40], [90, 38, 50],
  [3, 68, 44], [89, 64, 40], [12, 86, 42], [82, 84, 46],
  [24, 6, 38], [68, 5, 40], [30, 90, 36], [58, 92, 38],
]


const CSS = `
.kids-session-root { position:relative; height:100vh; height:100dvh; overflow:hidden; background:radial-gradient(ellipse at 50% 30%, #1a2b26 0%, #050A09 75%); color:#fff; display:flex; flex-direction:column; padding-top:env(safe-area-inset-top); padding-bottom:env(safe-area-inset-bottom); font-family:'Sora',ui-sans-serif,system-ui,sans-serif; }

/* Ambiente colorido en los costados: blobs difusos PRECARGADOS (CSS puro, cero red),
   con drift lento compositor-friendly. El color principal sale del tópico. */
.kids-amb { position:absolute; border-radius:50%; filter:blur(70px); pointer-events:none; z-index:0; will-change:transform; }
.kids-amb-a { left:-120px; top:14%; width:400px; height:400px; opacity:.5; animation:kids-amb-a 8s ease-in-out infinite; }
.kids-amb-b { right:-120px; top:40%; width:360px; height:360px; opacity:.44; background:#7C5CFF; animation:kids-amb-b 10s ease-in-out infinite; }
.kids-amb-c { left:28%; bottom:-130px; width:340px; height:340px; opacity:.34; background:#22D3EE; animation:kids-amb-c 12s ease-in-out infinite; }
@keyframes kids-amb-a { 0%,100%{ transform:translate(0,0) scale(1) } 50%{ transform:translate(34px,-26px) scale(1.12) } }
@keyframes kids-amb-b { 0%,100%{ transform:translate(0,0) scale(1) } 50%{ transform:translate(-30px,24px) scale(1.09) } }
@keyframes kids-amb-c { 0%,100%{ transform:translate(0,0) scale(1) } 50%{ transform:translate(26px,-18px) scale(1.07) } }
@media (prefers-reduced-motion: reduce){ .kids-amb { animation:none !important; } }

/* Objetos de la colección flotando por la pantalla (precargados, solo SVG). */
.kids-float { position:absolute; z-index:0; opacity:.55; pointer-events:none; filter:drop-shadow(0 6px 14px rgba(0,0,0,.35)); will-change:transform; animation:kids-float-1 20s ease-in-out infinite; }
@keyframes kids-float-1 { 0%,100%{ transform:translate(0,0) rotate(-6deg) } 50%{ transform:translate(28px,-36px) rotate(9deg) } }
@keyframes kids-float-2 { 0%,100%{ transform:translate(0,0) rotate(7deg) } 50%{ transform:translate(-32px,28px) rotate(-8deg) } }
@keyframes kids-float-3 { 0%,100%{ transform:translate(0,0) rotate(-4deg) } 33%{ transform:translate(20px,24px) rotate(7deg) } 66%{ transform:translate(-22px,-20px) rotate(-9deg) } }
@media (prefers-reduced-motion: reduce){ .kids-float { animation:none !important; } }
.kids-session-top, .kids-session-content, .kids-start-bar { position:relative; z-index:1; }
.kids-session-top { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; }
.kids-session-back { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:99px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:#fff; font-size:13px; font-weight:700; backdrop-filter:blur(8px); cursor:pointer; }
.kids-session-back:hover { background:rgba(255,255,255,.16); }
.kids-session-topic-pill { display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:99px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#9CFCD2; }
.kids-session-topic-pill .dot { width:8px; height:8px; border-radius:50%; }

.kids-session-content { flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; align-items:center; justify-content:safe center; padding:20px 24px 12px; text-align:center; gap:18px; }
.kids-session-h1 { font-weight:800; font-size:clamp(28px, 5vw, 44px); letter-spacing:-0.03em; line-height:1.05; margin:0; max-width:680px; }
.kids-session-h1 em { font-style:normal; color:#9CFCD2; }
.kids-session-sub { font-size:15px; color:rgba(255,255,255,.65); margin:0; max-width:520px; line-height:1.5; }
.kids-session-sub b { color:#fff; font-weight:600; }

.kids-orb-wrap { width:min(280px, 55vw); height:min(280px, 55vw); position:relative; display:grid; place-items:center; }
.kids-orb-wrap::before { content:""; position:absolute; inset:-20px; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,.06), transparent 65%); }

.kids-session-actions { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; padding:16px 24px 24px; position:sticky; bottom:0; background:linear-gradient(180deg, transparent 0%, rgba(5,10,9,.85) 50%); backdrop-filter:blur(8px); z-index:5; }
.kids-session-actions:empty { display:none; }
.kids-session-btn-primary { display:inline-flex; align-items:center; gap:10px; padding:0 32px; height:64px; border-radius:99px; background:linear-gradient(180deg,#FFB800,#F09D00); color:#3A2A00; font-weight:800; font-size:17px; letter-spacing:-0.01em; box-shadow:0 12px 30px rgba(240,157,0,.45), 0 4px 12px rgba(0,0,0,.2); border:0; cursor:pointer; transition:transform .15s; font-family:inherit; }
.kids-session-btn-primary:hover { transform:translateY(-2px) scale(1.02); }
.kids-session-btn-primary:active { transform:scale(.97); }
.kids-session-btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
.kids-session-btn-primary svg { width:24px; height:24px; }
.kids-session-btn-ghost { display:inline-flex; align-items:center; gap:8px; padding:0 22px; height:54px; border-radius:99px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); color:#fff; font-weight:600; font-size:14px; cursor:pointer; transition:all .15s; font-family:inherit; text-decoration:none; }
.kids-session-btn-ghost:hover { background:rgba(255,255,255,.12); }
.kids-end-btn { display:inline-flex; align-items:center; gap:8px; padding:0 18px; height:44px; border-radius:99px; background:rgba(239,68,68,.16); color:#FF9D9D; border:1px solid rgba(239,68,68,.45); font-family:inherit; font-weight:700; font-size:14px; cursor:pointer; transition:transform .15s, background .15s; }
.kids-end-btn:hover { transform:translateY(-1px); background:rgba(239,68,68,.26); }

/* Inicio kids: palabras del día en card */
.kids-words-card { display:flex; flex-direction:column; align-items:center; gap:10px; padding:14px 18px; border-radius:20px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.16); max-width:440px; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); box-shadow:inset 0 1px 0 rgba(255,255,255,.12), 0 14px 40px rgba(0,0,0,.25); }
.kids-words-card .wc-title { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10.5px; letter-spacing:.16em; text-transform:uppercase; color:rgba(232,236,234,.55); }
.kids-words-card .wc-chips { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
.kids-word-chip { font-size:13px; padding:6px 14px; border-radius:99px; background:rgba(0,179,126,.14); border:1px solid rgba(0,179,126,.3); color:#9CFCD2; font-weight:700; }

/* Inicio kids: bottom bar con FAB central titilante + secundarias a los lados */
.kids-start-bar { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:10px; padding:14px 20px calc(20px + env(safe-area-inset-bottom)); position:sticky; bottom:0; background:linear-gradient(180deg, transparent 0%, rgba(5,10,9,.9) 45%); backdrop-filter:blur(10px); z-index:5; }
.kids-start-bar .side-left { justify-self:end; }
.kids-start-bar .side-right { justify-self:start; }
.kids-start-fab { position:relative; width:104px; height:104px; border-radius:50%; border:0; cursor:pointer; background:linear-gradient(180deg,#FFC93D,#F09D00); color:#3A2A00; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; box-shadow:0 14px 34px rgba(240,157,0,.5), 0 4px 12px rgba(0,0,0,.28); animation:kids-fab-breathe 1.7s ease-in-out infinite; transition:transform .15s; font-family:inherit; }
.kids-start-fab::before { content:""; position:absolute; inset:0; border-radius:50%; box-shadow:0 0 0 0 rgba(255,201,61,.55); animation:kids-fab-ping 1.7s ease-out infinite; }
.kids-start-fab:active { transform:scale(.94); }
.kids-start-fab svg { width:38px; height:38px; }
.kids-start-fab .fab-lbl { font-size:12px; font-weight:800; letter-spacing:-.01em; }
@keyframes kids-fab-breathe { 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.06) } }
@keyframes kids-fab-ping { 0%{ box-shadow:0 0 0 0 rgba(255,201,61,.55) } 70%,100%{ box-shadow:0 0 0 22px rgba(255,201,61,0) } }
.kids-secondary-btn { display:inline-flex; flex-direction:column; align-items:center; gap:4px; padding:8px 10px; border:0; background:transparent; color:rgba(255,255,255,.72); font-family:inherit; font-size:11px; font-weight:700; cursor:pointer; text-decoration:none; transition:color .15s; }
.kids-secondary-btn:hover { color:#fff; }
.kids-secondary-btn svg { width:24px; height:24px; }

/* Botón-semáforo de la charla: el MISMO botón redondo, cambia de color según quién habla.
   Ámbar = habla Habi (no hay que tocar). Verde TITILANDO = tu turno, tocalo y hablá.
   Verde fijo = te está escuchando. Un TOQUE alcanza (mantener no hace nada extra). */
.kids-talk-fab { position:relative; width:96px; height:96px; border-radius:50%; border:0; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:inherit; color:#0B1512; transition:background .25s, transform .15s, box-shadow .25s; }
.kids-talk-fab:active { transform:scale(.94); }
.kids-talk-fab svg { width:36px; height:36px; }
.kids-talk-fab[data-state="coach"] { background:linear-gradient(180deg,#FFC93D,#F09D00); box-shadow:0 12px 30px rgba(240,157,0,.4); animation:kids-fab-breathe 2.6s ease-in-out infinite; }
.kids-talk-fab[data-state="your-turn"] { background:linear-gradient(180deg,#34E38A,#17B569); box-shadow:0 12px 30px rgba(23,181,105,.5); animation:kids-fab-breathe 1.2s ease-in-out infinite; }
.kids-talk-fab[data-state="your-turn"]::before { content:""; position:absolute; inset:0; border-radius:50%; box-shadow:0 0 0 0 rgba(52,227,138,.6); animation:kids-fab-ping 1.2s ease-out infinite; }
/* TALKING = feedback INSTANTÁNEO al toque: pop + queda OUTLINED (vacío con borde verde).
   El nene ve al instante que ya lo tocó — no hace falta dejarlo apretado. */
.kids-talk-fab[data-state="talking"] { background:rgba(52,227,138,.1); border:4px solid #34E38A; color:#34E38A; box-shadow:0 0 22px rgba(52,227,138,.35); animation:kids-fab-pop .3s cubic-bezier(.2,.8,.2,1); }
@keyframes kids-fab-pop { 0%{ transform:scale(.86) } 55%{ transform:scale(1.1) } 100%{ transform:scale(1) } }
.kids-talk-fab[data-state="connecting"] { background:rgba(255,255,255,.14); color:rgba(255,255,255,.7); animation:kids-fab-breathe 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce){ .kids-start-fab, .kids-start-fab::before, .kids-talk-fab, .kids-talk-fab::before { animation:none !important; } }

.kids-session-status { font-family:'JetBrains Mono', ui-monospace, monospace; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:rgba(232,236,234,.6); display:inline-flex; align-items:center; gap:8px; }
.kids-session-status .pulse { width:8px; height:8px; border-radius:50%; background:#22C55E; box-shadow:0 0 0 0 rgba(34,197,94,.6); animation:kids-pulse 1.5s ease-out infinite; }
@keyframes kids-pulse { 0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)} 100%{box-shadow:0 0 0 12px rgba(34,197,94,0)} }
.kids-mic-wave { display:inline-flex; align-items:center; gap:3px; height:16px; }
.kids-mic-wave i { width:3px; border-radius:2px; background:#22C55E; height:calc(4px + var(--lvl,0) * 18px); transition:height 80ms ease-out; animation:kids-mic-bar .7s ease-in-out infinite alternate; }
.kids-mic-wave i:nth-child(2){ animation-delay:.12s } .kids-mic-wave i:nth-child(3){ animation-delay:.24s } .kids-mic-wave i:nth-child(4){ animation-delay:.16s } .kids-mic-wave i:nth-child(5){ animation-delay:.06s }
@keyframes kids-mic-bar { from { transform:scaleY(.5) } to { transform:scaleY(1) } }
.kids-mic-big { display:inline-flex; align-items:center; gap:14px; padding:11px 22px; border-radius:99px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); transition:background .25s, border-color .25s; }
.kids-mic-big.live { background:rgba(34,197,94,.12); border-color:rgba(34,197,94,.38); }
.kids-mic-big .bars { display:inline-flex; align-items:center; gap:4px; height:28px; }
.kids-mic-big .bars i { width:4px; border-radius:99px; background:rgba(255,255,255,.32); height:5px; transition:height 80ms ease-out, background .25s; }
.kids-mic-big.live .bars i { background:#22C55E; height:calc(5px + var(--lvl,0) * 22px); }
.kids-mic-big .lbl { font-size:14px; font-weight:700; color:rgba(255,255,255,.55); transition:color .25s; white-space:nowrap; }
.kids-mic-big.live .lbl { color:#22C55E; }

.kids-transcript { width:100%; max-width:680px; padding:12px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.16); border-radius:20px; display:flex; flex-direction:column; gap:6px; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); box-shadow:inset 0 1px 0 rgba(255,255,255,.12), 0 14px 40px rgba(0,0,0,.25); }
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
  // Personaje elegido UNA vez por nene, persistido en BD (el padre lo cambia desde el panel).
  // Prioridad: perfil (BD) -> cache local -> null (muestra el picker).
  const kidBuddyKey = String(kid.id ?? kid.name)
  const [buddyId, setBuddyId] = useState<string | null>(() => kid.buddy_id ?? getSavedBuddyId(kidBuddyKey))

  // El perfil carga async: cuando llega el personaje de la BD, lo aplicamos
  // (salvo que el nene ya haya elegido otro en esta misma sesión).
  useEffect(() => {
    if (kid.buddy_id && !buddyId) setBuddyId(kid.buddy_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kid.buddy_id])
  const [audioLevel, setAudioLevel] = useState(0.2)
  const pendingLevelRef = useRef(0.2)
  const [micLevel, setMicLevel] = useState(0)  // nivel del MIC del nene (feedback "estás hablando")
  const pendingMicRef = useRef(0)
  const [renewBanner, setRenewBanner] = useState<{ kind: 'warn' | 'renewing' | 'renewed'; msg: string } | null>(null)
  const startedRef = useRef(false)

  // Throttle audioLevel a 20fps (50ms): cada chunk del mic actualiza el ref,
  // y el orbe se re-renderiza solo a 20fps en vez de a la frecuencia de los
  // chunks. Reduce re-renders sin perdida visual perceptible.
  useEffect(() => {
    const id = window.setInterval(() => {
      setAudioLevel((prev) => Math.max(prev * 0.7, pendingLevelRef.current))
      pendingLevelRef.current *= 0.7  // decay del pending
      setMicLevel((prev) => Math.max(prev * 0.6, pendingMicRef.current))
      pendingMicRef.current *= 0.6
    }, 50)
    return () => clearInterval(id)
  }, [])

  const live = useLiveVoice({
    onAudioLevel: (lvl) => { pendingLevelRef.current = Math.max(pendingLevelRef.current, lvl) },
    onMicLevel: (lvl) => { pendingMicRef.current = Math.max(pendingMicRef.current, lvl) },
    onError: (e) => {
      console.error('[kids-voice]', e)
      toast.error('Hubo un problema con el micrófono. Asegurate de permitir el acceso.')
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
    onAudioGlitch: (info) => {
      // Solo log, NUNCA toast (decision del usuario - el toast molestaba
      // cuando se disparaba en uso normal de Gemini Live).
      console.warn(`[kids-voice] glitch ${info.reason}: ${info.delayMs}ms`)
    },
  })

  const isFree = topicId === 'free'
  const freeQ = new URLSearchParams(location.search).get('q') ?? ''
  const displayTitle = isFree ? freeQ : topic?.title ?? 'Cargando...'
  const topicNumericId = topic?.id ?? (topicId ? parseInt(topicId, 10) : 1)
  const color = colorForTopic(isNaN(topicNumericId) ? 1 : topicNumericId)

  // ── F4-06: circuito visual REACTIVO (slice mínimo) ─────────────────────
  // Precarga los assets de kids_visual_vocab que aplican a ESTE tópico, y
  // escucha la transcripción del coach (ya la expone useLiveVoice en
  // live.transcript) para mostrar el visual cuando el coach nombra la
  // palabra. Nunca al revés: si no la nombra, no aparece nada. Cero
  // cambios al prompt/motor -- esto es puro listener sobre texto ya emitido.
  const vocabMapRef = useRef<Map<string, VisualCueItem>>(new Map())
  const [cue, setCue] = useState<{ item: VisualCueItem; leaving: boolean } | null>(null)
  const cueTimeoutsRef = useRef<number[]>([])
  const pendingShowRef = useRef<number | null>(null)
  // La imagen se queda hasta que aparece la PRÓXIMA palabra (reemplazo). En iniciales hay una
  // palabra por turno, así que acompaña todo el ciclo (coach enseña -> nene dice -> próxima).
  // CUE_SHOW_MS es solo el colchón de seguridad por si la clase se frena (que no quede pegada).
  const CUE_SHOW_MS = 12000
  const CUE_EXIT_MS = 300
  // El TEXTO del coach (transcripción) llega ANTES de que su AUDIO suene, porque el
  // playback va con buffering. Por eso el dibujo se adelantaba. Lo retrasamos un toque
  // para alinearlo con lo que el nene ESCUCHA. Tuneable: si sigue adelantado, subir;
  // si queda atrasado, bajar. (El de INPUT "se come la 1ra palabra" es otro tema.)
  // DEV (temporal): OFFSET de sync + prefix, calibrables desde el panel de abajo. El offset
  // corrige un desfase crónico SOBRE el delay dinámico (backlog del audio): 0 = sin corrección,
  // negativo = imagen más temprano, positivo = más tarde. Se aplica en vivo. Sacar cuando calibre.
  const syncOffsetRef = useRef<number>(Number(localStorage.getItem('kids_sync_offset_ms')) || 0)
  const [syncSlider, setSyncSlider] = useState<number>(Number(localStorage.getItem('kids_sync_offset_ms')) || 0)
  const [prefixSlider, setPrefixSlider] = useState<number>(Number(localStorage.getItem('kids_prefix_ms')) || 700)

  // Cada palabra nueva REEMPLAZA a la anterior (la última que dice el coach manda), y
  // recién aparece VISUAL_SYNC_DELAY_MS después para caer junto al audio.
  const showVisual = useCallback((item: VisualCueItem, delayMs: number) => {
    cueTimeoutsRef.current.forEach((id) => window.clearTimeout(id))
    cueTimeoutsRef.current = []
    if (pendingShowRef.current) window.clearTimeout(pendingShowRef.current)
    pendingShowRef.current = window.setTimeout(() => {
      pendingShowRef.current = null
      setCue({ item, leaving: false })
      const hideAt = window.setTimeout(() => {
        setCue((c) => (c ? { ...c, leaving: true } : c))
        const clearAt = window.setTimeout(() => setCue(null), CUE_EXIT_MS)
        cueTimeoutsRef.current.push(clearAt)
      }, CUE_SHOW_MS)
      cueTimeoutsRef.current.push(hideAt)
    }, delayMs)
  }, [])

  // Carga + precarga de TODA la biblioteca visual kids (no solo el tópico):
  // no sabemos qué palabra va a nombrar el coach, así que cargamos todas de
  // antemano y matcheamos en INGLÉS y en CASTELLANO (sin acentos). El texto
  // de la transcripción llega antes que el audio termine de sonar, así el
  // visual aparece justo cuando Habi lo dice.
  const [floatItems, setFloatItems] = useState<VisualCueItem[]>([])
  useEffect(() => {
    vocabMapRef.current = new Map()
    let cancelled = false
    // Biblioteca COMPLETA (~1000 palabras) + vocab del tópico (solo para priorizar flotantes).
    // Fallback: si el endpoint nuevo aún no está deployado, se arma del endpoint por-tópico.
    Promise.all([
      motorAPI.kidsVisualVocabAll().catch(() => null),
      motorAPI.kidsTopicVocab().catch(() => []),
    ])
      .then(([libraryOrNull, byTopic]) => {
        const library = libraryOrNull ?? byTopic.flatMap((t) => t.vocab)
        if (cancelled || library.length === 0) return
        const map = new Map<string, VisualCueItem>()
        for (const v of library) {
          const en = normalizeVisualWord(v.word_en)
          const es = normalizeVisualWord(v.word_es || '')
          if (en && !map.has(en)) map.set(en, v)
          if (es && !map.has(es)) map.set(es, v)
        }
        vocabMapRef.current = map
        // Precarga escalonada: el vocab del TÓPICO ya (es lo más probable que nombre
        // primero); el resto de la biblioteca 2.5s después para no competir con el
        // arranque del WebSocket de voz en mobile. Todo queda en memoria igual.
        const pref = topic?.id ? (byTopic.find((t) => t.topic_id === topic.id)?.vocab ?? []) : []
        preloadVisualCueAssets(pref)
        window.setTimeout(() => { if (!cancelled) preloadVisualCueAssets(library) }, 2500)
        // Flotantes de ambiente: primero los del tópico actual, se completa con el
        // resto de la colección. Solo SVG (12 Lottie flotando queman CPU en mobile).
        const seen = new Set<string>()
        const pick: VisualCueItem[] = []
        for (const v of [...pref, ...library]) {
          if (pick.length >= 12) break
          if (!v.asset_file || !v.asset_file.endsWith('.svg')) continue
          if (seen.has(v.word_en)) continue
          seen.add(v.word_en)
          pick.push(v)
        }
        setFloatItems(pick)
      })
      .catch(() => {})  // fail-soft: sin vocab precargado, la clase sigue igual (solo sin visual reactivo)
    return () => { cancelled = true }
  }, [isFree, topic?.id])

  // Listener sobre la transcripción del coach (live.transcript, acumulada por
  // useLiveVoice desde los transcript_chunk que manda el backend). Re-tokeniza
  // SIEMPRE el texto completo del turno AI actual (no solo lo nuevo) porque
  // los chunks pueden cortar una palabra a la mitad -- así nunca se pierde un
  // match por el corte. matchedInLineRef cuenta ocurrencias ya disparadas
  // para no re-mostrar la misma mención mientras el texto sigue creciendo.
  // >>> DISPARADOR REDISEÑADO — filtro semántico + delay dinámico <<<
  // (1) FILTRO: muestra SOLO la palabra que la coach está ENSEÑANDO, detectada por el patrón
  //     "<algo> se dice <word>" (el mismo del Expected_Production A0 y del subtítulo). Antes
  //     disparaba con CUALQUIER palabra del vocab -> si decía "mundo" en la clase de colores,
  //     aparecía un mundo. Ahora solo aparece lo que el nene tiene que DECIR = asistencia, no ruido.
  // (2) SYNC: el delay lo da el backlog REAL del audio (cuánto falta por sonar), no un número
  //     fijo. El slider de sync queda como OFFSET global (corrige un desfase crónico de la charla).
  const prevTranscriptLenRef = useRef(0)
  const matchedInLineRef = useRef<Map<string, number>>(new Map())
  const liveTranscript = live.transcript
  const getAudioBacklogMs = live.getAudioBacklogMs
  useEffect(() => {
    const arr = liveTranscript
    if (arr.length !== prevTranscriptLenRef.current) {
      prevTranscriptLenRef.current = arr.length
      matchedInLineRef.current = new Map()  // turno nuevo -> reiniciar conteo
    }
    const last = arr[arr.length - 1]
    if (!last || last.who !== 'ai') return
    const vocabMap = vocabMapRef.current
    if (vocabMap.size === 0) return
    // Texto normalizado (sin acentos) para matchear con las keys del vocabMap.
    const norm = normalizeVisualWord(last.text)
    // Palabra objetivo = la que sigue a "se dice" (ej: "elefante se dice elephant" -> elephant).
    const re = /se dice\s+([a-z'’-]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(norm)) !== null) {
      let canon = m[1].replace(/['’-]+$/, '')
      if (!vocabMap.has(canon)) canon = singularizeEnglish(canon)
      if (!vocabMap.has(canon) && canon.length > 3 && canon.endsWith('s')) canon = canon.slice(0, -1)
      if (!vocabMap.has(canon)) continue
      if ((matchedInLineRef.current.get(canon) ?? 0) > 0) continue  // ya disparada este turno
      matchedInLineRef.current.set(canon, 1)
      // Delay dinámico: espera lo que falta de audio + el offset del slider (0 = sin corrección).
      const backlog = getAudioBacklogMs ? getAudioBacklogMs() : 0
      const delay = Math.max(0, backlog + syncOffsetRef.current)
      showVisual(vocabMap.get(canon)!, delay)
    }
  }, [liveTranscript, getAudioBacklogMs, showVisual])

  // Limpieza de timers pendientes al desmontar (no es el cleanup de la
  // sesión de voz -- ese ya existe más abajo).
  useEffect(() => {
    return () => { cueTimeoutsRef.current.forEach((id) => window.clearTimeout(id)); cueTimeoutsRef.current = []; if (pendingShowRef.current) window.clearTimeout(pendingShowRef.current) }
  }, [])

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
        toast.error(`No pudimos arrancar la sesión: ${err}`)
        startedRef.current = false
        return
      }
      const data = await res.json()
      setSessionId(data.session_id)
      await live.start(data.session_id, kidsToken, getBuddyById(buddyId).voice)
    } catch (e) {
      console.error(e)
      toast.error('Error de conexión. Probá de nuevo.')
      startedRef.current = false
    }
  }

  // DEV (temporal): "Aplicar" del panel reinicia la charla para tomar los valores nuevos.
  const restartCharla = () => {
    try { live.stop() } catch {}
    startedRef.current = false
    window.setTimeout(() => { beginSession() }, 350)
  }
  const applySync = () => {
    // El offset se aplica EN VIVO (no reinicia): la próxima imagen ya usa el valor nuevo.
    localStorage.setItem('kids_sync_offset_ms', String(syncSlider))
    syncOffsetRef.current = syncSlider
  }
  const applyPrefix = () => {
    localStorage.setItem('kids_prefix_ms', String(prefixSlider))
    restartCharla()
  }

  const [showSuccess, setShowSuccess] = useState(false)
  // F4-04: badge visual minimo ("suma a la coleccion") — cantidad REAL de
  // clases terminadas de este nene. Sale de /api/sessions/ (mismo endpoint
  // que usa el adulto, ya funciona con el kid_token porque get_current_user
  // resuelve por sub del JWT sea cual sea el perfil). Fail-soft: si falla,
  // el overlay de exito se muestra igual, solo sin el numero.
  const [starsCount, setStarsCount] = useState<number | null>(null)
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
      try {
        const res = await fetch('/api/sessions/', { headers: { Authorization: `Bearer ${kidsToken}` } })
        if (res.ok) {
          const list = await res.json()
          if (Array.isArray(list)) {
            setStarsCount(list.filter((s: { status?: string }) => s.status && s.status !== 'active').length)
          }
        }
      } catch {}
    }
    // Mostramos overlay de exito con confetti kid-style antes de volver.
    setShowSuccess(true)
    const colors = ['#FF5E7E', '#FFC83D', '#22D67A', '#22D3EE', '#7C5CFF', '#FF8A4C']
    const burst = (origin: { x: number; y: number }) => confetti({
      particleCount: 90, spread: 90, startVelocity: 50,
      origin, colors, ticks: 320, gravity: 0.85, scalar: 1.3,
      shapes: ['circle', 'square'],
    })
    burst({ x: 0.5, y: 0.55 })
    setTimeout(() => burst({ x: 0.2, y: 0.6 }), 220)
    setTimeout(() => burst({ x: 0.8, y: 0.6 }), 380)
    setTimeout(() => navigate('/kids'), 3200)
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
      ? Math.max(0.12, micLevel * 1.6) // voz REAL del nene (RMS del mic)
      : 0.15

  // Quién tiene el turno de voz → color del aro del león (ámbar Habi / verde nene).
  const speaker: 'coach' | 'kid' | 'none' =
    live.status === 'speaking' ? 'coach' : live.status === 'listening' ? 'kid' : 'none'

  const isActive = live.status === 'listening' || live.status === 'speaking' || live.status === 'connecting'

  // TAP-to-talk (prueba mic inalámbrico que se come las primeras palabras): el modo PTT
  // del hook gatea el envío de audio. Un TOQUE (pttPress) abre el gate; NUNCA llamamos
  // pttRelease al soltar → el gate queda abierto y el VAD de Gemini cierra el turno por
  // silencio (conversacional, no walkie-talkie). Cuando Habi arranca a hablar, rearmamos
  // el gate (pttRelease) para que el próximo turno pida un toque fresco: así el primer
  // audio que ve el VAD arranca justo cuando el nene tocó (onset limpio, mic despierto).
  // Push-to-talk DESACTIVADO a propósito → las clases kids corren en modo VAD
  // conversacional (Gemini cierra el turno por el silencio del alumno), IGUAL que la
  // app adulta, que funciona. Estaba prendido pero sin el gesto que abre el gate
  // (pttPress no se llamaba nunca) y con el flush de cierre armado al EMPEZAR a hablar
  // el coach; para cuando le tocaba al nene el gate ya estaba cerrado y su voz no
  // llegaba a Gemini (por eso el coach no respondía). El PTT sigue implementado en
  // useLiveVoice + PushToTalkControl como alternativa (mics BT que comen las primeras
  // palabras). Reactivarlo = volver a setPushToTalk(isActive) + conectar pttPress a un
  // botón. DEUDA TÉCNICA (hacerlo ajustable por config): docs/05-deuda-tecnica/01-push-to-talk-kids.md
  const setPushToTalk = live.setPushToTalk
  useEffect(() => {
    setPushToTalk(false)
    return () => setPushToTalk(false)
  }, [setPushToTalk])

  const talkState: 'coach' | 'your-turn' | 'talking' | 'connecting' =
    live.status === 'speaking' ? 'coach'
    : live.status === 'listening' ? (live.pttHeld ? 'talking' : 'your-turn')
    : 'connecting'

  return (
    <div className="kids-session-root">
      <style>{CSS}</style>

      {/* Ambiente colorido precargado (CSS puro): el blob principal toma el color del tópico */}
      <div className="kids-amb kids-amb-a" style={{ background: color }} aria-hidden />
      <div className="kids-amb kids-amb-b" aria-hidden />
      <div className="kids-amb kids-amb-c" aria-hidden />

      {/* La colección flotando por los costados (precargada, nada se busca en vivo) */}
      {floatItems.map((it, i) => (
        <img
          key={it.word_en}
          src={it.asset_file!}
          alt=""
          aria-hidden
          className="kids-float"
          style={{
            left: `${FLOAT_SPOTS[i % FLOAT_SPOTS.length][0]}%`,
            top: `${FLOAT_SPOTS[i % FLOAT_SPOTS.length][1]}%`,
            width: FLOAT_SPOTS[i % FLOAT_SPOTS.length][2],
            animationName: `kids-float-${(i % 3) + 1}`,
            animationDuration: `${14 + (i % 5) * 4}s`,
            animationDelay: `${-(i * 2.7)}s`,
          }}
        />
      ))}

      <KidsVisualCueOverlay item={cue?.item ?? null} leaving={cue?.leaving ?? false} />

      {/* DEV (temporal): panel de calibración — sacar cuando esté ajustado. */}
      <div style={{ position: 'fixed', bottom: 8, left: 8, zIndex: 9999, background: 'rgba(0,0,0,.82)', color: '#fff', padding: '9px 11px', borderRadius: 10, fontSize: 11, fontFamily: 'ui-monospace, monospace', display: 'flex', flexDirection: 'column', gap: 8, width: 258 }}>
        <div style={{ opacity: .55, letterSpacing: .5 }}>DEV · calibración (temporal)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 58, flexShrink: 0 }}>Offset img</span>
          <input type="range" min={-1500} max={1500} step={50} value={syncSlider} onChange={(e) => setSyncSlider(Number(e.target.value))} style={{ flex: 1, minWidth: 0 }} />
          <span style={{ width: 44, textAlign: 'right', flexShrink: 0 }}>{syncSlider > 0 ? '+' : ''}{syncSlider}</span>
          <button onClick={applySync} style={{ padding: '2px 7px', borderRadius: 5, border: '1px solid #4ade80', background: 'transparent', color: '#4ade80', cursor: 'pointer', fontSize: 10, flexShrink: 0 }}>OK</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 58, flexShrink: 0 }}>Prefix 1ª</span>
          <input type="range" min={100} max={1000} step={50} value={prefixSlider} onChange={(e) => setPrefixSlider(Number(e.target.value))} style={{ flex: 1, minWidth: 0 }} />
          <span style={{ width: 40, textAlign: 'right', flexShrink: 0 }}>{prefixSlider}</span>
          <button onClick={applyPrefix} style={{ padding: '2px 7px', borderRadius: 5, border: '1px solid #fbbf24', background: 'transparent', color: '#fbbf24', cursor: 'pointer', fontSize: 10, flexShrink: 0 }}>OK</button>
        </div>
        <div style={{ opacity: .4, fontSize: 9 }}>Offset img: en vivo · Prefix: reinicia.</div>
      </div>

      {showSuccess && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'radial-gradient(circle at 50% 40%, rgba(124,92,255,.35) 0%, rgba(10,12,28,.96) 60%, rgba(5,7,16,1) 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, animation: 'kidsuccess-in .35s cubic-bezier(.2,.8,.2,1)',
        }}>
          <style>{`
            @keyframes kidsuccess-in { from { opacity:0; transform: scale(.85); } to { opacity:1; transform: scale(1); } }
            @keyframes kidsuccess-pop { 0%{transform:scale(0) rotate(-12deg);opacity:0} 60%{transform:scale(1.1) rotate(6deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
            @keyframes kidsuccess-wobble { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
          `}</style>
          <div style={{
            width: 140, height: 140, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFC83D 0%, #FF8A4C 60%, #FF5E7E 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(255,138,76,.5), inset 0 4px 0 rgba(255,255,255,.35)',
            animation: 'kidsuccess-pop .8s cubic-bezier(.34,1.56,.64,1)',
            marginBottom: 24,
          }}>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="9"/>
            </svg>
          </div>
          <div style={{
            fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900, color: 'white',
            textAlign: 'center', letterSpacing: '-.02em', lineHeight: 1.1,
            animation: 'kidsuccess-wobble 1.4s ease-in-out infinite',
            textShadow: '0 4px 24px rgba(0,0,0,.5)', marginBottom: 8,
          }}>
            ¡Bien hecho, {kid.name}!
          </div>
          <div style={{
            fontSize: 18, color: 'rgba(255,255,255,.85)', textAlign: 'center',
            fontWeight: 600, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFC83D" stroke="none" aria-hidden>
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>
            </svg>
            Terminaste la clase. ¡Sos un crack!
          </div>
          {starsCount !== null && (
            <div style={{
              marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 20px', borderRadius: 999,
              background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)',
              animation: 'kidsuccess-pop .8s cubic-bezier(.34,1.56,.64,1) .15s both',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFC83D" stroke="none" aria-hidden>
                <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>
              </svg>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>
                {starsCount} estrella{starsCount === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>
      )}

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
              {live.status === 'listening' && (live.pttHeld ? (
                <>
                  <span className="pulse" />
                  Te escucho — hablá tranquilo
                </>
              ) : (
                <>
                  <span className="pulse" />
                  Tu turno — tocá el botón verde y hablá
                </>
              ))}
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

            {live.participants.length > 0 && (
              <div style={{
                display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8,
                justifyContent: 'center',
              }}>
                {live.participants.map((p) => (
                  <span
                    key={p.pid}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                      background: p.isHost ? 'rgba(255,255,255,.12)' : 'rgba(0,179,126,.18)',
                      color: p.isHost ? '#E8ECEA' : '#5EE0B0',
                      border: `1px solid ${p.isHost ? 'rgba(255,255,255,.18)' : 'rgba(0,179,126,.32)'}`,
                    }}
                  >
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: p.isHost ? '#E8ECEA' : '#5EE0B0',
                    }} aria-hidden />
                    {p.name}
                  </span>
                ))}
              </div>
            )}

            {live.status === 'idle' && (
              <p className="kids-session-sub">
                Cuando estés <b>listo</b>, tocá el botón amarillo. <b>Hablá despacio y pausado</b> para que Habi te escuche súper bien.
              </p>
            )}

            {(!isActive && !buddyId) ? (
              <BuddyPicker
                selectedId={buddyId}
                onPick={(b) => {
                  setBuddyId(b.id)
                  saveBuddyId(kidBuddyKey, b.id)
                  const tok = localStorage.getItem(KIDS_TOKEN_KEY)
                  if (tok) {
                    fetch('/api/kids/me/buddy', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
                      body: JSON.stringify({ buddy_id: b.id }),
                    }).catch(() => {})
                  }
                }}
              />
            ) : (
              <div className="kids-orb-wrap">
                <KidsBuddy
                  buddy={getBuddyById(buddyId)}
                  status={orbStatus}
                  audioLevel={orbAudio}
                  speaker={speaker}
                  size={240}
                />
              </div>
            )}

            {/* Charla 100% conversacional: sin controles sueltos afuera. El mic es
                automático (default del OS) y el fin de turno lo maneja el VAD por
                silencios. El aro bicolor del león da el feedback de quién habla.
                (Push-to-talk quedó fuera de la escena; si se necesita, va en configuración.) */}

            {live.status === 'idle' && topic?.keywords && topic.keywords.length > 0 && (
              <div className="kids-words-card">
                <span className="wc-title">Hoy vas a practicar</span>
                <div className="wc-chips">
                  {topic.keywords.slice(0, 5).map((k) => (
                    <span key={k} className="kids-word-chip">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Transcripción EN VIVO: solo lo que dice el COACH (Habi).
               Lo que dice el chico se acumula en live.transcript pero NO
               se muestra en pantalla durante la sesion - el chico ya escucha
               su propia voz. Decision del usuario para reducir distraccion
               y reforzar el aprendizaje leyendo lo que dice Habi. El
               transcript completo (habi + chico) se manda al backend al
               cerrar la clase para el reporte/analisis. */}
            {/* Subtítulo en vivo: el turno ACTUAL grande, el anterior tenue. No es un
               chat que scrollea y se pierde abajo: cuando llega texto nuevo, reemplaza. */}
            {live.transcript.length > 0 ? (
              <div className="kids-transcript">
                <LiveSubtitle
                  transcript={live.transcript}
                  aiLabel={getBuddyById(buddyId).label}
                  minHeight={96}
                  highlightWords={topic?.keywords ?? []}
                />
              </div>
            ) : (
              isActive && (
                <div className="kids-transcript" style={{ opacity: 0.85, fontSize: 18, fontWeight: 700, color: '#9CFCD2', animation: 'kids-fab-breathe 2s infinite', minHeight: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {talkState === 'your-turn' ? '¡Tu turno! Hablá despacio y pausado 🎙️' : 'Escuchando a tu tutor...'}
                </div>
              )
            )}
          </>
        )}
      </div>

      {hasKidsToken && !isActive && (
        <div className="kids-start-bar">
          <Link to="/kids/topicos" className="kids-secondary-btn side-left">
            <RefreshCw size={22} strokeWidth={2.2} />
            Cambiar tema
          </Link>
          <button className="kids-start-fab" onClick={beginSession} aria-label="Empezar a hablar con Habi">
            <Mic size={38} strokeWidth={2.4} />
            <span className="fab-lbl">¡Hablar!</span>
          </button>
          <div className="side-right">
            {topic && (
              <InviteFriendButton
                topicId={topic.id}
                variant="light"
                label="Invitar"
                authToken={localStorage.getItem(KIDS_TOKEN_KEY) ?? undefined}
                onBeforeCreate={async () => {
                  // Antes de crear la room, arrancamos la sesion Live y esperamos
                  // a que el WS este OPEN. Sin esto, upgradeToRoom no tiene a que
                  // atacharse y el guest queda en limbo (bug real, sesion 14:14).
                  await beginSession()
                  for (let i = 0; i < 80; i++) {
                    if (live.status === 'listening' || live.status === 'speaking') return
                    await new Promise((r) => setTimeout(r, 100))
                  }
                  throw new Error('La clase no inició a tiempo, intentá de nuevo')
                }}
                onRoomCreated={(roomToken, hostPid) => {
                  live.upgradeToRoom(roomToken, hostPid)
                  toast.success('Sala lista — mandá el link y esperá al amigo')
                }}
              />
            )}
          </div>
        </div>
      )}
      {/* Charla activa: el mismo botón redondo, ahora semáforo del turno.
          Ámbar = habla Habi · verde titilando = tu turno (tocá y hablá) · verde fijo = te escucho. */}
      {hasKidsToken && isActive && (
        <div className="kids-start-bar">
          <div className="side-left">
            {topic && (
              <InviteFriendButton
                topicId={topic.id}
                variant="light"
                label="Invitar"
                authToken={localStorage.getItem(KIDS_TOKEN_KEY) ?? undefined}
                onRoomCreated={(roomToken, hostPid) => {
                  live.upgradeToRoom(roomToken, hostPid)
                  toast.success('Sala lista — mandá el link y esperá al amigo')
                }}
              />
            )}
          </div>
          <button
            className="kids-talk-fab"
            data-state={talkState}
            onClick={live.pttPress}
            aria-label={talkState === 'your-turn' ? 'Tu turno: tocá y hablá' : talkState === 'coach' ? 'Habi está hablando' : 'Te escucho'}
          >
            <Mic strokeWidth={2.4} />
          </button>
          <div className="side-right">
            <button className="kids-end-btn" onClick={endSession}>
              <Square size={16} strokeWidth={2.4} fill="currentColor" />
              Terminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

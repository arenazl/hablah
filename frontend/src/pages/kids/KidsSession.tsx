/**
 * /kids/sesion/:topicId -- Sesion REAL con Habi (audio + transcripcion).
 *
 * Cableado (SIN CAMBIOS de logica en el rediseno de UI):
 * - POST /api/sessions/start con kids_token Bearer -> obtiene session_id
 * - useLiveVoice abre WebSocket /voice/ws con el kid_token -> audio bidireccional
 * - El buddy (leon) refleja status; transcripcion en vivo; boton mic (PTT) / terminar.
 *
 * UI: rediseño Claude Design "Hablah Mobile" — 2 zonas fijas (leon centrado + subtitulo
 * de altura constante), fondo azul-violeta, animales por los bordes. Sin scroll.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Mic, Square, Lock, ArrowLeft, UserPlus } from 'lucide-react'
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

// Objetos de la colección flotando por los BORDES (lejos del centro, ahí vive el león).
// [left%, top px desde el header, size px]
const FLOAT_SPOTS: Array<[number, number, number]> = [
  [6, 150, 30], [86, 130, 32], [4, 300, 30], [88, 280, 28],
  [8, 250, 26], [90, 210, 28], [3, 360, 28], [85, 350, 30],
]

const CSS = `
.kids-session-root { position:relative; height:100vh; height:100dvh; overflow:hidden; display:flex; flex-direction:column;
  background:radial-gradient(120% 80% at 50% 30%, #2a4b8f 0%, #2a3a7a 40%, #3a2c66 75%, #241f52 100%);
  color:#fff; font-family:'Sora',ui-sans-serif,system-ui,sans-serif;
  padding-top:env(safe-area-inset-top); }

/* Animales de la colección flotando por los bordes (precargados, solo SVG). */
.kids-float { position:absolute; z-index:0; pointer-events:none; opacity:.5; filter:drop-shadow(0 8px 20px rgba(0,0,0,.4)); animation:kids-floatY 5.5s ease-in-out infinite; }
@keyframes kids-floatY { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-10px) } }
@media (prefers-reduced-motion: reduce){ .kids-float, .kids-buddy-anim { animation:none !important; } }

.kids-session-top, .kids-session-content, .kids-start-bar { position:relative; z-index:1; }

/* Header: Volver + pill "hablando con Habi" */
.kids-session-top { display:flex; align-items:center; gap:10px; padding:8px 18px 0; flex-shrink:0; }
.kids-session-back { display:inline-flex; align-items:center; gap:7px; padding:9px 15px; border-radius:99px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.18); color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
.kids-session-back:active { transform:scale(.96); }
.kids-session-topic-pill { display:inline-flex; align-items:center; gap:8px; padding:9px 16px; border-radius:99px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#7ee9c9; min-width:0; }
.kids-session-topic-pill .dot { width:8px; height:8px; border-radius:50%; background:#7ee9c9; box-shadow:0 0 8px #7ee9c9; flex:none; }
.kids-session-topic-pill span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Contenido: zonas fijas, sin scroll. Texto arriba, león centrado (flex:1), card abajo. */
.kids-session-content { flex:1; min-height:0; overflow:hidden; display:flex; flex-direction:column; align-items:center; text-align:center; }
.kids-session-lead { flex-shrink:0; padding:22px 26px 0; }
.kids-session-eyebrow { display:inline-flex; align-items:center; gap:7px; color:#9db4de; font-size:12px; letter-spacing:.16em; font-weight:700; text-transform:uppercase; }
.kids-session-eyebrow .dot { width:8px; height:8px; border-radius:50%; }
.kids-session-h1 { font-family:'Sora'; font-weight:800; font-size:clamp(26px,7vw,32px); line-height:1.1; color:#fff; margin:12px 0 0; }
.kids-session-h1 em { font-style:normal; color:#7ee9c9; }
.kids-session-sub { font-size:15px; line-height:1.5; color:#c6d4ec; margin:14px 0 0; }
.kids-session-sub b { color:#fff; }

/* León centrado: ocupa el espacio del medio y NUNCA se mueve; cede tamaño por alto. */
.kids-orb-wrap { flex:1 1 auto; min-height:0; width:100%; display:grid; place-items:center; position:relative; }
.kids-orb-ring { position:absolute; width:min(270px,72vw,34dvh); height:min(270px,72vw,34dvh); border-radius:50%; border:1px solid rgba(126,233,201,.25); }
.kids-orb-inner { position:relative; width:min(230px,58vw,30dvh); height:min(230px,58vw,30dvh); display:grid; place-items:center; }
.kids-orb-inner > * { max-width:100%; max-height:100%; }
.kids-buddy-anim { animation:kids-floatY 4s ease-in-out infinite; }

/* Card inferior: subtítulo / "hoy vas a practicar" — altura constante, no empuja al león. */
.kids-session-panel { flex-shrink:0; width:100%; background:rgba(11,20,40,.5); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border-top:1px solid rgba(255,255,255,.12); border-radius:24px 24px 0 0; padding:18px 20px calc(16px + env(safe-area-inset-bottom)); }
.kids-panel-title { font-size:12px; letter-spacing:.16em; font-weight:700; text-transform:uppercase; color:#9db4de; margin-bottom:14px; }
.kids-words { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
.kids-word-chip { background:rgba(126,233,201,.12); border:1px solid rgba(126,233,201,.35); color:#aef2d9; border-radius:99px; padding:9px 17px; font-size:16px; font-weight:600; }

/* Card de la charla (subtítulo peli): frase + "tu turno". Altura acotada. */
.kids-talk-card { width:100%; background:rgba(11,20,40,.55); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,.14); border-radius:24px; padding:20px 20px 22px; text-align:center; max-height:34dvh; overflow:hidden; }
.kids-talk-card .turn-badge { margin-top:14px; font-size:12px; letter-spacing:.14em; font-weight:700; text-transform:uppercase; color:#7ee9c9; }

/* Barra de control: Invitar / mic amarillo grande / Terminar */
.kids-start-bar { flex-shrink:0; display:flex; align-items:center; justify-content:space-between; padding:12px 26px calc(14px + env(safe-area-inset-bottom)); gap:12px; }
.kids-side-btn { display:flex; flex-direction:column; align-items:center; gap:6px; border-radius:16px; padding:12px 14px; min-width:86px; font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); color:#fff; }
.kids-side-btn.danger { background:rgba(229,72,77,.16); border-color:rgba(229,72,77,.35); color:#ff9a9d; }
.kids-side-btn:active { transform:scale(.95); }
.kids-side-btn svg { width:20px; height:20px; }
.kids-mic-fab { width:88px; height:88px; border-radius:50%; border:none; cursor:pointer; flex:none; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; font-family:inherit; color:#3a2b06;
  background:radial-gradient(circle at 50% 35%, #ffd869, #f4c53f); box-shadow:0 10px 30px rgba(244,197,63,.5); transition:transform .15s; }
.kids-mic-fab:active { transform:scale(.94); }
.kids-mic-fab .lbl { font-size:12px; font-weight:800; }
.kids-mic-fab.your-turn { animation:kids-mic-gold 2s ease-out infinite; }
.kids-mic-fab.coach { background:radial-gradient(circle at 50% 35%, #cfe0ff, #9db4de); color:#20305a; animation:none; }
.kids-mic-fab.talking { background:rgba(126,233,201,.14); border:4px solid #34E38A; color:#7ee9c9; animation:none; }
@keyframes kids-mic-gold { 0%{ box-shadow:0 0 0 0 rgba(244,197,63,.5) } 100%{ box-shadow:0 0 0 26px rgba(244,197,63,0) } }
@media (prefers-reduced-motion: reduce){ .kids-mic-fab.your-turn { animation:none !important; } }

/* Estado bloqueado (sin perfil) */
.kids-session-locked { max-width:340px; margin:auto; padding:32px 26px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:24px; text-align:center; }
.kids-session-locked .ico { width:60px; height:60px; border-radius:18px; background:rgba(244,197,63,.18); color:#f4c53f; display:grid; place-items:center; margin:0 auto 16px; }
.kids-session-locked h3 { font-weight:800; font-size:20px; margin:0 0 8px; }
.kids-session-locked p { font-size:14px; color:rgba(255,255,255,.72); margin:0 0 18px; line-height:1.5; }
.kids-session-locked p b { color:#fff; }

.kids-renew-banner { position:fixed; top:calc(env(safe-area-inset-top) + 12px); left:50%; transform:translateX(-50%); padding:10px 16px; border-radius:99px; font-size:13px; font-weight:700; z-index:60; display:inline-flex; align-items:center; gap:8px; box-shadow:0 8px 24px rgba(0,0,0,.3); }
.kids-renew-banner.warn { background:rgba(244,197,63,.94); color:#3a2b06; }
.kids-renew-banner.renewing { background:rgba(59,130,246,.94); color:#fff; }
.kids-renew-banner.renewed { background:rgba(34,197,94,.94); color:#fff; }
.kids-renew-banner .ico { width:18px; height:18px; }
.kids-renew-banner.renewing .ico { animation:kids-spin 1s linear infinite; }
@keyframes kids-spin { to { transform:rotate(360deg); } }
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
  const kidBuddyKey = String(kid.id ?? kid.name)
  const [buddyId, setBuddyId] = useState<string | null>(() => kid.buddy_id ?? getSavedBuddyId(kidBuddyKey))

  useEffect(() => {
    if (kid.buddy_id && !buddyId) setBuddyId(kid.buddy_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kid.buddy_id])
  const [audioLevel, setAudioLevel] = useState(0.2)
  const pendingLevelRef = useRef(0.2)
  const [micLevel, setMicLevel] = useState(0)
  const pendingMicRef = useRef(0)
  const [renewBanner, setRenewBanner] = useState<{ kind: 'warn' | 'renewing' | 'renewed'; msg: string } | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setAudioLevel((prev) => Math.max(prev * 0.7, pendingLevelRef.current))
      pendingLevelRef.current *= 0.7
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
      alert('Hubo un problema con el micrófono. Asegurate de permitir el acceso.')
    },
    onSessionEndingSoon: ({ message }) => { setRenewBanner({ kind: 'warn', msg: message }) },
    onSessionRenewing: () => { setRenewBanner({ kind: 'renewing', msg: 'Renovando charla… seguí hablando como siempre.' }) },
    onSessionRenewed: (message) => {
      setRenewBanner({ kind: 'renewed', msg: message })
      setTimeout(() => setRenewBanner(null), 3500)
    },
    onParticipantJoined: (info) => { if (!info.isHost) toast.success(`${info.name} se sumó a la charla`) },
    onParticipantLeft: (info) => { toast(`${info.name} salió`) },
    onRoomClosed: () => { toast('La sala se cerró') },
    onAudioGlitch: (info) => { console.warn(`[kids-voice] glitch ${info.reason}: ${info.delayMs}ms`) },
  })

  const isFree = topicId === 'free'
  const freeQ = new URLSearchParams(location.search).get('q') ?? ''
  const displayTitle = isFree ? freeQ : topic?.title ?? 'Cargando...'

  // ── Circuito visual REACTIVO (cue): listener sobre la transcripción del coach ──
  const vocabMapRef = useRef<Map<string, VisualCueItem>>(new Map())
  const [cue, setCue] = useState<{ item: VisualCueItem; leaving: boolean } | null>(null)
  const cueQueueRef = useRef<VisualCueItem[]>([])
  const cueBusyRef = useRef(false)
  const cueTimeoutsRef = useRef<number[]>([])
  const CUE_SHOW_MS = 3600
  const CUE_EXIT_MS = 300

  const advanceCueQueue = useCallback(() => {
    if (cueBusyRef.current) return
    const next = cueQueueRef.current.shift()
    if (!next) return
    cueBusyRef.current = true
    setCue({ item: next, leaving: false })
    const hideAt = window.setTimeout(() => {
      setCue((c) => (c ? { ...c, leaving: true } : c))
      const clearAt = window.setTimeout(() => {
        setCue(null)
        cueBusyRef.current = false
        advanceCueQueue()
      }, CUE_EXIT_MS)
      cueTimeoutsRef.current.push(clearAt)
    }, CUE_SHOW_MS)
    cueTimeoutsRef.current.push(hideAt)
  }, [])

  const enqueueVisual = useCallback((item: VisualCueItem) => {
    if (cueQueueRef.current.length >= 4) return
    cueQueueRef.current.push(item)
    advanceCueQueue()
  }, [advanceCueQueue])

  const [floatItems, setFloatItems] = useState<VisualCueItem[]>([])
  useEffect(() => {
    vocabMapRef.current = new Map()
    let cancelled = false
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
        const pref = topic?.id ? (byTopic.find((t) => t.topic_id === topic.id)?.vocab ?? []) : []
        preloadVisualCueAssets(pref)
        window.setTimeout(() => { if (!cancelled) preloadVisualCueAssets(library) }, 2500)
        const seen = new Set<string>()
        const pick: VisualCueItem[] = []
        for (const v of [...pref, ...library]) {
          if (pick.length >= FLOAT_SPOTS.length) break
          if (!v.asset_file || !v.asset_file.endsWith('.svg')) continue
          if (seen.has(v.word_en)) continue
          seen.add(v.word_en)
          pick.push(v)
        }
        setFloatItems(pick)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isFree, topic?.id])

  const prevTranscriptLenRef = useRef(0)
  const matchedInLineRef = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    const arr = live.transcript
    if (arr.length !== prevTranscriptLenRef.current) {
      prevTranscriptLenRef.current = arr.length
      matchedInLineRef.current = new Map()
    }
    const last = arr[arr.length - 1]
    if (!last || last.who !== 'ai') return
    const vocabMap = vocabMapRef.current
    if (vocabMap.size === 0) return
    const tokens = normalizeVisualWord(last.text).match(/[a-z']+/g) || []
    const seenThisPass = new Map<string, number>()
    for (const tok of tokens) {
      let canon = tok
      if (!vocabMap.has(canon)) canon = singularizeEnglish(tok)
      if (!vocabMap.has(canon) && tok.length > 4 && tok.endsWith('es')) canon = tok.slice(0, -2)
      if (!vocabMap.has(canon) && tok.length > 3 && tok.endsWith('s')) canon = tok.slice(0, -1)
      if (!vocabMap.has(canon)) continue
      const n = (seenThisPass.get(canon) ?? 0) + 1
      seenThisPass.set(canon, n)
      if (n > (matchedInLineRef.current.get(canon) ?? 0)) {
        matchedInLineRef.current.set(canon, n)
        enqueueVisual(vocabMap.get(canon)!)
      }
    }
  }, [live.transcript, enqueueVisual])

  useEffect(() => {
    return () => { cueTimeoutsRef.current.forEach((id) => window.clearTimeout(id)); cueTimeoutsRef.current = [] }
  }, [])

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

  useEffect(() => {
    return () => { try { live.stop() } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasKidsToken = typeof window !== 'undefined' && !!localStorage.getItem(KIDS_TOKEN_KEY)

  const beginSession = async () => {
    if (startedRef.current) return
    const kidsToken = localStorage.getItem(KIDS_TOKEN_KEY)
    if (!kidsToken) return
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
      await live.start(data.session_id, kidsToken, getBuddyById(buddyId).voice)
    } catch (e) {
      console.error(e)
      alert('Error de conexión. Probá de nuevo.')
      startedRef.current = false
    }
  }

  const [showSuccess, setShowSuccess] = useState(false)
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
      } catch { /* noop */ }
      try {
        const res = await fetch('/api/sessions/', { headers: { Authorization: `Bearer ${kidsToken}` } })
        if (res.ok) {
          const list = await res.json()
          if (Array.isArray(list)) {
            setStarsCount(list.filter((s: { status?: string }) => s.status && s.status !== 'active').length)
          }
        }
      } catch { /* noop */ }
    }
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

  const orbStatus: 'idle' | 'speaking' =
    live.status === 'speaking' || live.status === 'listening' ? 'speaking' : 'idle'
  const orbAudio =
    live.status === 'speaking' ? Math.max(0.5, audioLevel)
    : live.status === 'listening' ? Math.max(0.12, micLevel * 1.6)
    : 0.15
  const speaker: 'coach' | 'kid' | 'none' =
    live.status === 'speaking' ? 'coach' : live.status === 'listening' ? 'kid' : 'none'
  const isActive = live.status === 'listening' || live.status === 'speaking' || live.status === 'connecting'

  const setPushToTalk = live.setPushToTalk
  const pttRelease = live.pttRelease
  useEffect(() => {
    setPushToTalk(isActive)
    return () => setPushToTalk(false)
  }, [isActive, setPushToTalk])
  useEffect(() => {
    if (live.status === 'speaking') pttRelease()
  }, [live.status, pttRelease])

  const talkState: 'coach' | 'your-turn' | 'talking' | 'connecting' =
    live.status === 'speaking' ? 'coach'
    : live.status === 'listening' ? (live.pttHeld ? 'talking' : 'your-turn')
    : 'connecting'

  const kidsToken = (typeof window !== 'undefined' && localStorage.getItem(KIDS_TOKEN_KEY)) || undefined
  const micClass = !isActive ? 'your-turn' : talkState === 'coach' ? 'coach' : talkState === 'talking' ? 'talking' : 'your-turn'
  const micLabel = !isActive ? '¡Hablar!' : talkState === 'coach' ? 'Escucho' : talkState === 'talking' ? 'Hablá' : 'Tu turno'
  const onMic = () => { if (!isActive) beginSession(); else live.pttPress() }

  return (
    <div className="kids-session-root">
      <style>{CSS}</style>

      {/* Animales de la colección flotando por los bordes */}
      {floatItems.map((it, i) => {
        const [left, top, size] = FLOAT_SPOTS[i % FLOAT_SPOTS.length]
        return (
          <img
            key={it.word_en} src={it.asset_file!} alt="" aria-hidden className="kids-float"
            style={{ left: `${left}%`, top, width: size, animationDelay: `${-(i * 0.6)}s`, animationDuration: `${5 + (i % 4)}s` }}
          />
        )
      })}

      <KidsVisualCueOverlay item={cue?.item ?? null} leaving={cue?.leaving ?? false} />

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
            animation: 'kidsuccess-pop .8s cubic-bezier(.34,1.56,.64,1)', marginBottom: 24,
          }}>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <div style={{
            fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900, color: 'white', textAlign: 'center',
            letterSpacing: '-.02em', lineHeight: 1.1, animation: 'kidsuccess-wobble 1.4s ease-in-out infinite',
            textShadow: '0 4px 24px rgba(0,0,0,.5)', marginBottom: 8,
          }}>
            ¡Bien hecho, {kid.name}!
          </div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,.85)', textAlign: 'center', fontWeight: 600, maxWidth: 360 }}>
            Terminaste la clase. ¡Sos un crack!
          </div>
          {starsCount !== null && (
            <div style={{
              marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 999,
              background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.22)',
              animation: 'kidsuccess-pop .8s cubic-bezier(.34,1.56,.64,1) .15s both',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFC83D" stroke="none" aria-hidden><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{starsCount} estrella{starsCount === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>
      )}

      {renewBanner && (
        <div className={`kids-renew-banner ${renewBanner.kind}`}>
          {renewBanner.kind === 'warn' && (
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          )}
          {renewBanner.kind === 'renewing' && (
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 4v8h8" /></svg>
          )}
          {renewBanner.kind === 'renewed' && (
            <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          )}
          {renewBanner.msg}
        </div>
      )}

      <div className="kids-session-top">
        <button className="kids-session-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} strokeWidth={2.4} /> Volver
        </button>
        <div className="kids-session-topic-pill">
          <span className="dot" />
          <span>{isFree ? 'Tema libre' : 'Hablando con Habi'}</span>
        </div>
      </div>

      {!hasKidsToken ? (
        <div className="kids-session-content" style={{ justifyContent: 'center' }}>
          <div className="kids-session-locked">
            <div className="ico"><Lock size={26} strokeWidth={2.2} /></div>
            <h3>Para hablar con Habi necesitás tu perfil</h3>
            <p>Pedile a tu <b>mamá o papá</b> que entren a su cuenta y te creen el perfil desde <b>"Modo Kids"</b>.</p>
            <button className="kids-side-btn" style={{ width: '100%' }} onClick={() => navigate('/login')}>Entrar como adulto</button>
          </div>
        </div>
      ) : (!isActive && !buddyId) ? (
        <div className="kids-session-content" style={{ justifyContent: 'center', padding: '0 20px' }}>
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
        </div>
      ) : (
        <>
          <div className="kids-session-content">
            {/* Texto guía SOLO en idle (deja el escenario limpio en charla) */}
            {live.status === 'idle' && (
              <div className="kids-session-lead">
                <div className="kids-session-eyebrow"><span className="dot" style={{ background: '#5b8dd6' }} />{isFree ? 'Tema libre' : 'Tema del día'}</div>
                <h1 className="kids-session-h1">¡Hablemos de <em>{displayTitle.toLowerCase()}</em>!</h1>
                <p className="kids-session-sub">Cuando estés <b>listo</b>, tocá el botón amarillo. Habi te escucha y responde en voz alta.</p>
              </div>
            )}

            {/* LEÓN centrado, siempre en el medio */}
            <div className="kids-orb-wrap">
              <div className="kids-orb-ring" />
              <div className="kids-orb-inner kids-buddy-anim">
                <KidsBuddy buddy={getBuddyById(buddyId)} status={orbStatus} audioLevel={orbAudio} speaker={speaker} size={230} />
              </div>
            </div>

            {/* CARD inferior: idle = "hoy vas a practicar"; charla = subtítulo peli */}
            {live.status === 'idle' ? (
              (topic?.keywords && topic.keywords.length > 0) && (
                <div className="kids-session-panel">
                  <div className="kids-panel-title">Hoy vas a practicar</div>
                  <div className="kids-words">
                    {topic.keywords.slice(0, 6).map((k) => (<span key={k} className="kids-word-chip">{k}</span>))}
                  </div>
                </div>
              )
            ) : (
              <div className="kids-session-panel">
                <div className="kids-talk-card">
                  {live.transcript.length > 0 ? (
                    <LiveSubtitle transcript={live.transcript} aiLabel="Habi" minHeight={72} highlightWords={topic?.keywords ?? []} />
                  ) : (
                    <div style={{ fontSize: 16, color: '#c6d4ec', padding: '12px 0' }}>
                      {live.status === 'connecting' ? 'Conectando con Habi…' : 'Escuchá a Habi…'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Barra de control: Invitar / mic amarillo / Terminar */}
          <div className="kids-start-bar">
            {topic ? (
              <InviteFriendButton
                topicId={topic.id} variant="light" label="Invitar" authToken={kidsToken}
                onBeforeCreate={!isActive ? (async () => {
                  await beginSession()
                  for (let i = 0; i < 80; i++) {
                    if (live.status === 'listening' || live.status === 'speaking') return
                    await new Promise((r) => setTimeout(r, 100))
                  }
                  throw new Error('La clase no inició a tiempo, intentá de nuevo')
                }) : undefined}
                onRoomCreated={(roomToken, hostPid) => {
                  live.upgradeToRoom(roomToken, hostPid)
                  toast.success('Sala lista — mandá el link y esperá al amigo')
                }}
              />
            ) : (
              <button className="kids-side-btn" onClick={() => navigate('/kids/topicos')}>
                <UserPlus /> Invitar
              </button>
            )}

            <button className={`kids-mic-fab ${micClass}`} onClick={onMic} aria-label={micLabel}>
              <Mic size={30} strokeWidth={2.4} />
              <span className="lbl">{micLabel}</span>
            </button>

            {isActive ? (
              <button className="kids-side-btn danger" onClick={endSession}>
                <Square size={18} strokeWidth={2.4} fill="currentColor" /> Terminar
              </button>
            ) : (
              <button className="kids-side-btn" onClick={() => navigate('/kids/topicos')}>
                <ArrowLeft /> Cambiar tema
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

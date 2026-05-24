/**
 * 6 variantes EXTRA del hero del Login (V7-V12) — más creativas,
 * mostrando "como es una clase de Habláh por dentro".
 *
 * V7  Clase Live      - dashboard mockup de sesion real (orb + transcript + waveform + reto + topico)
 * V8  Chat Burbujas   - burbujas de mensajes alternando saliendo del orb
 * V9  Pizarra         - chalkboard retro con orb + palabras tiza flotando
 * V10 Now Playing     - card Spotify-like, orb como cover art
 * V11 Newsroom        - transmisión TV con ticker
 * V12 Cinema          - subtitulos peli con orb gigante
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Mic, Globe, BookOpen, Tv, Film, MessageCircle, Music, Sparkles, Award, Play, Pause, SkipForward } from 'lucide-react'
import { AgentAudioVisualizerAura } from '../components/agents-ui/agent-audio-visualizer-aura'

const GREEN = '#00B37E'
const GREEN_DARK = '#008F63'
const INK = '#0E1614'

// Hook que tipea texto letra por letra
function useTypewriter(text: string, speed = 35, loopGap = 2000): string {
  const [out, setOut] = useState('')
  useEffect(() => {
    let i = 0
    let cancelled = false
    let restartTimer: number | undefined
    const tick = () => {
      if (cancelled) return
      i++
      setOut(text.slice(0, i))
      if (i < text.length) {
        window.setTimeout(tick, speed)
      } else {
        restartTimer = window.setTimeout(() => {
          if (!cancelled) {
            i = 0
            setOut('')
            window.setTimeout(tick, speed)
          }
        }, loopGap)
      }
    }
    window.setTimeout(tick, speed)
    return () => {
      cancelled = true
      if (restartTimer) window.clearTimeout(restartTimer)
    }
  }, [text, speed, loopGap])
  return out
}

// Loop por array de items (cambia uno cada N ms)
function useRotatingItem<T>(items: T[], intervalMs = 3500): T {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setIdx((i) => (i + 1) % items.length), intervalMs)
    return () => window.clearInterval(id)
  }, [items.length, intervalMs])
  return items[idx]
}

const SHARED = `
.lhv-root { position: relative; flex: 1; overflow: hidden; padding: 40px 48px; background: ${INK}; color: white; display: flex; flex-direction: column; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; }
.lhv-glow-a { position: absolute; top: -200px; right: -200px; width: 600px; height: 600px; border-radius: 50%; filter: blur(80px); background: radial-gradient(circle, ${GREEN}55, transparent); pointer-events: none; }
.lhv-glow-b { position: absolute; bottom: -180px; left: -180px; width: 500px; height: 500px; border-radius: 50%; filter: blur(80px); background: radial-gradient(circle, ${GREEN}33, transparent); pointer-events: none; }
.lhv-brand { position: relative; display: flex; align-items: center; gap: 12px; z-index: 5; }
.lhv-brand-mark { width: 40px; height: 40px; border-radius: 11px; background: ${GREEN}; display: grid; place-items: center; box-shadow: 0 6px 18px ${GREEN}55; }
.lhv-brand-name { font-weight: 800; font-size: 18px; letter-spacing: -.01em; }
.lhv-brand-sub { font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: rgba(232,236,234,.5); font-weight: 700; margin-top: 1px; }
.lhv-footer { position: relative; margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(232,236,234,.4); padding-top: 24px; z-index: 5; }
.lhv-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; border-radius: 99px; background: rgba(0,179,126,.16); color: ${GREEN}; font-size: 10.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.lhv-eyebrow svg { width: 13px; height: 13px; }

/* ===== V7: Clase Live - dashboard mockup ===== */
.lhv-v7-stage { flex: 1; position: relative; display: flex; flex-direction: column; gap: 16px; padding-top: 14px; }
.lhv-v7-window { background: linear-gradient(180deg, #0a1311, #050b09); border: 1px solid rgba(255,255,255,.10); border-radius: 18px; box-shadow: 0 30px 60px rgba(0,0,0,.5); overflow: hidden; flex: 1; display: flex; flex-direction: column; }
.lhv-v7-titlebar { background: rgba(255,255,255,.04); padding: 10px 14px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,.06); }
.lhv-v7-titlebar i { width: 11px; height: 11px; border-radius: 50%; }
.lhv-v7-titlebar i:nth-child(1) { background: #FF5F57; }
.lhv-v7-titlebar i:nth-child(2) { background: #FEBC2E; }
.lhv-v7-titlebar i:nth-child(3) { background: #28C840; }
.lhv-v7-titlebar .url { margin-left: 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(232,236,234,.55); }
.lhv-v7-content { padding: 18px; display: grid; grid-template-columns: 220px 1fr; grid-template-rows: 1fr auto; gap: 14px; flex: 1; }
.lhv-v7-orb-card { grid-row: span 2; background: linear-gradient(160deg, rgba(0,179,126,.18), rgba(0,179,126,.04)); border: 1px solid rgba(0,179,126,.3); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.lhv-v7-orb-card .label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: ${GREEN}; display: inline-flex; align-items: center; gap: 6px; }
.lhv-v7-orb-card .label .dot { width: 7px; height: 7px; border-radius: 50%; background: ${GREEN}; box-shadow: 0 0 8px ${GREEN}; animation: lhv-pulse 1s ease-out infinite; }
.lhv-v7-orb-card .orb { width: 130px; height: 130px; }
.lhv-v7-orb-card .topic { text-align: center; font-size: 13px; font-weight: 700; color: white; }
.lhv-v7-orb-card .topic small { display: block; font-weight: 500; color: rgba(232,236,234,.55); font-size: 11px; margin-top: 2px; }
.lhv-v7-transcript { background: rgba(255,255,255,.03); border-radius: 12px; padding: 14px; overflow: hidden; }
.lhv-v7-transcript .head { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: ${GREEN}; margin-bottom: 8px; }
.lhv-v7-transcript .line { font-size: 13.5px; line-height: 1.5; color: rgba(232,236,234,.92); font-style: italic; }
.lhv-v7-transcript .line::after { content: '▎'; color: ${GREEN}; margin-left: 2px; animation: lhv-blink 1s steps(2) infinite; }
.lhv-v7-challenge { background: linear-gradient(135deg, rgba(255,184,0,.15), rgba(255,184,0,.03)); border: 1px solid rgba(255,184,0,.30); border-radius: 12px; padding: 12px 14px; display: flex; gap: 10px; align-items: center; }
.lhv-v7-challenge .ic { width: 32px; height: 32px; border-radius: 9px; background: rgba(255,184,0,.22); display: grid; place-items: center; color: #FFB800; flex-shrink: 0; }
.lhv-v7-challenge .body { flex: 1; }
.lhv-v7-challenge .body .lbl { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: #FFB800; text-transform: uppercase; }
.lhv-v7-challenge .body .txt { font-size: 13px; color: white; margin-top: 2px; }
.lhv-v7-challenge .body .txt b { color: #FFB800; }
.lhv-v7-headline { padding: 0 4px; }
.lhv-v7-headline h1 { font-size: clamp(28px, 3vw, 36px); font-weight: 800; letter-spacing: -.02em; line-height: 1.1; margin: 0 0 6px; }
.lhv-v7-headline h1 em { font-style: normal; color: ${GREEN}; }
.lhv-v7-headline p { font-size: 13.5px; color: rgba(232,236,234,.65); margin: 0; max-width: 540px; }

@keyframes lhv-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: .5; } }
@keyframes lhv-blink { 50% { opacity: 0; } }

/* ===== V8: Chat Burbujas ===== */
.lhv-v8-stage { flex: 1; display: flex; flex-direction: column; gap: 20px; padding-top: 18px; }
.lhv-v8-headline h1 { font-size: clamp(32px, 4vw, 46px); font-weight: 900; letter-spacing: -.025em; line-height: 1.05; margin: 14px 0 8px; }
.lhv-v8-headline h1 em { font-style: normal; color: ${GREEN}; }
.lhv-v8-headline p { font-size: 14.5px; color: rgba(232,236,234,.65); margin: 0; max-width: 480px; }
.lhv-v8-chat-zone { position: relative; flex: 1; display: grid; grid-template-columns: 180px 1fr; gap: 24px; align-items: center; }
.lhv-v8-orb { width: 180px; height: 180px; position: relative; }
.lhv-v8-orb::after { content: ''; position: absolute; top: 50%; right: -12px; width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-left: 12px solid ${GREEN}; opacity: 0; animation: lhv-v8-arrow 4s ease-in-out infinite; }
@keyframes lhv-v8-arrow { 0%, 40%, 100% { opacity: 0; } 10%, 30% { opacity: 1; } }
.lhv-v8-bubbles { display: flex; flex-direction: column; gap: 10px; }
.lhv-v8-bubble { padding: 10px 14px; border-radius: 16px; font-size: 13.5px; line-height: 1.45; max-width: 90%; animation: lhv-v8-pop .4s cubic-bezier(.2,.8,.2,1) backwards; }
.lhv-v8-bubble.ai { background: rgba(0,179,126,.20); border: 1px solid rgba(0,179,126,.35); color: white; align-self: flex-start; border-bottom-left-radius: 4px; animation-delay: 0s; }
.lhv-v8-bubble.user { background: rgba(255,255,255,.10); border: 1px solid rgba(255,255,255,.15); color: white; align-self: flex-end; border-bottom-right-radius: 4px; animation-delay: 1.5s; }
.lhv-v8-bubble.ai-2 { background: rgba(0,179,126,.20); border: 1px solid rgba(0,179,126,.35); color: white; align-self: flex-start; border-bottom-left-radius: 4px; animation-delay: 3s; }
.lhv-v8-bubble.user-2 { background: rgba(255,255,255,.10); border: 1px solid rgba(255,255,255,.15); color: white; align-self: flex-end; border-bottom-right-radius: 4px; animation-delay: 4.5s; }
@keyframes lhv-v8-pop { from { opacity: 0; transform: translateY(8px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
.lhv-v8-bubble small { display: block; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; opacity: .6; margin-bottom: 3px; }

/* ===== V9: Pizarra ===== */
.lhv-v9-stage { flex: 1; position: relative; background: repeating-linear-gradient(45deg, #1d2625 0px, #1d2625 2px, #1a2322 2px, #1a2322 4px); border-radius: 16px; border: 6px solid #6B4F2A; border-top-color: #8B6939; border-left-color: #8B6939; box-shadow: inset 0 0 80px rgba(0,0,0,.5), 0 20px 50px rgba(0,0,0,.6); margin-top: 18px; padding: 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; overflow: hidden; }
.lhv-v9-orb { width: 200px; height: 200px; filter: drop-shadow(0 0 30px ${GREEN}88); }
.lhv-v9-title { font-family: 'Caveat', 'Brush Script MT', cursive; font-size: clamp(40px, 5vw, 64px); color: white; text-align: center; line-height: 1; transform: rotate(-1deg); text-shadow: 0 0 10px rgba(255,255,255,.15); }
.lhv-v9-title em { font-style: normal; color: ${GREEN}; }
.lhv-v9-sub { font-family: 'Caveat', cursive; font-size: 22px; color: rgba(255,255,255,.7); transform: rotate(.5deg); }
.lhv-v9-word { position: absolute; font-family: 'Caveat', cursive; color: rgba(255,255,255,.5); font-size: 22px; animation: lhv-v9-float 8s ease-in-out infinite; }
.lhv-v9-word.w1 { top: 12%; left: 8%; transform: rotate(-8deg); animation-delay: 0s; }
.lhv-v9-word.w2 { top: 18%; right: 10%; transform: rotate(5deg); animation-delay: 1s; color: rgba(94,224,176,.6); }
.lhv-v9-word.w3 { bottom: 18%; left: 12%; transform: rotate(3deg); animation-delay: 2s; color: rgba(255,184,0,.6); }
.lhv-v9-word.w4 { bottom: 14%; right: 8%; transform: rotate(-4deg); animation-delay: 3s; }
.lhv-v9-word.w5 { top: 50%; left: 4%; transform: rotate(-12deg); animation-delay: 4s; color: rgba(94,224,176,.6); }
.lhv-v9-word.w6 { top: 45%; right: 4%; transform: rotate(8deg); animation-delay: 5s; }
@keyframes lhv-v9-float { 0%, 100% { transform: translateY(0) rotate(var(--r, -5deg)); opacity: .5; } 50% { transform: translateY(-12px) rotate(var(--r, -5deg)); opacity: .9; } }

/* ===== V10: Now Playing ===== */
.lhv-v10-stage { flex: 1; display: flex; flex-direction: column; gap: 20px; padding-top: 14px; }
.lhv-v10-card { background: linear-gradient(160deg, rgba(0,179,126,.20), rgba(0,179,126,.05)); border: 1px solid rgba(0,179,126,.3); border-radius: 20px; padding: 22px; display: flex; gap: 22px; align-items: center; }
.lhv-v10-cover { width: 180px; height: 180px; border-radius: 16px; background: rgba(0,0,0,.45); display: grid; place-items: center; flex-shrink: 0; position: relative; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,.45); }
.lhv-v10-cover .orb { width: 100%; height: 100%; }
.lhv-v10-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.lhv-v10-info .now { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: ${GREEN}; display: inline-flex; align-items: center; gap: 6px; }
.lhv-v10-info .now .dot { width: 7px; height: 7px; border-radius: 50%; background: ${GREEN}; box-shadow: 0 0 8px ${GREEN}; animation: lhv-pulse 1s infinite; }
.lhv-v10-info .topic { font-size: 26px; font-weight: 800; letter-spacing: -.02em; color: white; line-height: 1.1; }
.lhv-v10-info .tutor { font-size: 13px; color: rgba(232,236,234,.65); }
.lhv-v10-info .tutor span { color: ${GREEN}; font-weight: 700; }
.lhv-v10-progress { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
.lhv-v10-bar { height: 4px; border-radius: 99px; background: rgba(255,255,255,.10); overflow: hidden; }
.lhv-v10-bar i { display: block; height: 100%; background: ${GREEN}; border-radius: 99px; animation: lhv-v10-progress 12s linear infinite; }
@keyframes lhv-v10-progress { 0% { width: 0; } 100% { width: 100%; } }
.lhv-v10-times { display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: rgba(232,236,234,.55); }
.lhv-v10-controls { display: flex; gap: 14px; align-items: center; margin-top: 14px; }
.lhv-v10-controls button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: rgba(255,255,255,.10); color: white; display: grid; place-items: center; cursor: pointer; }
.lhv-v10-controls button.play { width: 54px; height: 54px; background: ${GREEN}; color: ${INK}; }
.lhv-v10-headline { padding: 0 4px; }
.lhv-v10-headline h1 { font-size: clamp(28px, 3.4vw, 38px); font-weight: 800; letter-spacing: -.02em; line-height: 1.1; margin: 6px 0 4px; }
.lhv-v10-headline h1 em { font-style: normal; color: ${GREEN}; }
.lhv-v10-headline p { font-size: 13.5px; color: rgba(232,236,234,.65); margin: 0; }

/* ===== V11: Newsroom TV ===== */
.lhv-v11-stage { flex: 1; display: flex; flex-direction: column; padding-top: 16px; gap: 16px; }
.lhv-v11-screen { position: relative; flex: 1; background: linear-gradient(180deg, #0a1816, #050a08); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; justify-content: center; }
.lhv-v11-live-badge { position: absolute; top: 14px; left: 14px; background: #DC2626; color: white; padding: 4px 10px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; font-weight: 800; letter-spacing: .14em; display: inline-flex; align-items: center; gap: 6px; animation: lhv-v11-live-blink 2s ease-in-out infinite; }
.lhv-v11-live-badge .d { width: 7px; height: 7px; border-radius: 50%; background: white; }
@keyframes lhv-v11-live-blink { 0%, 50% { opacity: 1; } 75% { opacity: .55; } }
.lhv-v11-time { position: absolute; top: 14px; right: 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: rgba(255,255,255,.7); background: rgba(0,0,0,.6); padding: 4px 10px; border-radius: 4px; }
.lhv-v11-anchor { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.lhv-v11-orb { width: 220px; height: 220px; }
.lhv-v11-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: rgba(255,255,255,.85); background: rgba(0,0,0,.6); padding: 6px 14px; border-radius: 4px; }
.lhv-v11-ticker { background: ${GREEN}; color: ${INK}; padding: 10px 0; overflow: hidden; position: relative; }
.lhv-v11-ticker-track { white-space: nowrap; font-weight: 700; font-size: 14px; letter-spacing: -.01em; animation: lhv-v11-ticker 25s linear infinite; padding-left: 100%; }
.lhv-v11-ticker-track span { margin-right: 40px; }
.lhv-v11-ticker-track span::before { content: '●'; margin-right: 12px; color: ${INK}; font-size: 10px; vertical-align: middle; }
@keyframes lhv-v11-ticker { from { transform: translateX(0); } to { transform: translateX(-100%); } }
.lhv-v11-bottom { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.lhv-v11-stat { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.10); border-radius: 10px; padding: 10px 12px; }
.lhv-v11-stat .l { font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.5); font-weight: 700; }
.lhv-v11-stat .v { font-size: 16px; font-weight: 800; color: white; margin-top: 2px; }
.lhv-v11-stat .v em { font-style: normal; color: ${GREEN}; }

/* ===== V12: Cinema ===== */
.lhv-v12-stage { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; }
.lhv-v12-bands { position: absolute; left: 0; right: 0; background: #000; pointer-events: none; }
.lhv-v12-bands.top { top: 0; height: 50px; }
.lhv-v12-bands.bottom { bottom: 0; height: 50px; }
.lhv-v12-orb-mega { width: min(380px, 40vh); height: min(380px, 40vh); position: relative; animation: lhv-v12-zoom 8s ease-in-out infinite; }
@keyframes lhv-v12-zoom { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
.lhv-v12-orb-mega::after { content: ''; position: absolute; inset: -40%; border-radius: 50%; background: radial-gradient(circle, ${GREEN}33, transparent 60%); pointer-events: none; filter: blur(40px); }
.lhv-v12-subtitle { position: absolute; bottom: 70px; left: 50%; transform: translateX(-50%); padding: 8px 18px; background: rgba(0,0,0,.85); border-radius: 4px; font-size: 18px; line-height: 1.4; color: white; text-align: center; max-width: 90%; font-weight: 500; font-family: 'Georgia', serif; }
.lhv-v12-subtitle .who { display: block; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; color: ${GREEN}; margin-bottom: 4px; }
.lhv-v12-title { position: absolute; top: 80px; left: 50%; transform: translateX(-50%); text-align: center; font-family: 'Georgia', serif; font-style: italic; font-size: clamp(28px, 3.4vw, 42px); font-weight: 400; color: rgba(255,255,255,.9); letter-spacing: -.02em; line-height: 1; }
.lhv-v12-title em { font-style: normal; font-weight: 700; color: ${GREEN}; }

@media (prefers-reduced-motion: reduce) {
  .lhv-v8-bubble, .lhv-v9-word, .lhv-v10-bar i, .lhv-v11-ticker-track, .lhv-v12-orb-mega, .lhv-v11-live-badge {
    animation: none !important;
  }
}
`

function BrandBlock(): ReactNode {
  return (
    <div className="lhv-brand">
      <div className="lhv-brand-mark">
        <img src="/logos/hablah-mark.svg" alt="" width="26" height="26" />
      </div>
      <div>
        <div className="lhv-brand-name">habláh</div>
        <div className="lhv-brand-sub">Hablás. Aprendés.</div>
      </div>
    </div>
  )
}

function FooterBlock(): ReactNode {
  return (
    <div className="lhv-footer">
      <div>Habláh · v0.1 MVP</div>
      <div>Hecho en LatAm</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// V7: Clase Live - mockup de sesion real con grid
// ─────────────────────────────────────────────────────────────
const TRANSCRIPT_LINES = [
  '"Oh, you went to Barcelona? What did you eat there?"',
  '"Yeah! Try saying \'I devoured a paella\' instead of \'I ate.\'"',
  '"Great accent on \'churros\'! Now tell me about the architecture."',
  '"Wait, you saw Sagrada Familia? How did it make you feel?"',
]
const CHALLENGES = [
  { label: 'Reto · vocab', text: ['Incorporá ', 'nevertheless', ' en tu próxima idea.'] },
  { label: 'Reto · gramática', text: ['Usá ', 'past perfect', ' al contar la anécdota.'] },
  { label: 'Reto · pronunciación', text: ['Ojo con la "th" en ', 'thoroughly', '.'] },
  { label: 'Reto · expresión', text: ['Probá decir ', "I'd rather", ' en lugar de "I prefer".'] },
]
const TOPICS_V7 = [
  { title: 'Viajes', sub: 'aeropuertos, culturas' },
  { title: 'Música electrónica', sub: 'UK Garage, two-step' },
  { title: 'Cocina', sub: 'recetas, sabores' },
  { title: 'Tecnología', sub: 'arquitectura, IA' },
]
function VariantClaseLive({ level }: { level: number }) {
  const line = useRotatingItem(TRANSCRIPT_LINES, 4500)
  const challenge = useRotatingItem(CHALLENGES, 4500)
  const topic = useRotatingItem(TOPICS_V7, 4500)
  const typed = useTypewriter(line, 22, 1200)
  return (
    <>
      <BrandBlock />
      <div className="lhv-v7-stage">
        <div className="lhv-v7-headline">
          <span className="lhv-eyebrow"><Mic /> Así se ve una clase</span>
          <h1 style={{ marginTop: 10 }}>Mirá una <em>charla real</em> en acción.</h1>
          <p>Esto es lo que pasa dentro de Habláh. Audio del tutor en vivo, transcripción al instante, retos en pantalla que te empujan a usar palabras nuevas.</p>
        </div>
        <div className="lhv-v7-window">
          <div className="lhv-v7-titlebar">
            <i /><i /><i />
            <span className="url">hablah.app/practicar/sesion · en vivo</span>
          </div>
          <div className="lhv-v7-content">
            <div className="lhv-v7-orb-card">
              <span className="label"><span className="dot" /> Tu turno</span>
              <div className="orb">
                <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.10} themeMode="dark" size="md" />
              </div>
              <div className="topic">
                {topic.title}
                <small>{topic.sub}</small>
              </div>
            </div>
            <div className="lhv-v7-transcript">
              <div className="head">Te dijo el tutor</div>
              <div className="line">{typed || '"…"'}</div>
            </div>
            <div className="lhv-v7-challenge">
              <div className="ic"><Sparkles size={16} /></div>
              <div className="body">
                <div className="lbl">{challenge.label}</div>
                <div className="txt">{challenge.text[0]}<b>"{challenge.text[1]}"</b>{challenge.text[2]}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V8: Chat Burbujas
// ─────────────────────────────────────────────────────────────
function VariantChatBurbujas({ level }: { level: number }) {
  return (
    <>
      <BrandBlock />
      <div className="lhv-v8-stage">
        <span className="lhv-eyebrow"><MessageCircle /> Conversación natural</span>
        <div className="lhv-v8-headline">
          <h1>No es un curso.<br/>Es una <em>charla con sentido</em>.</h1>
          <p>Hablás, te entiende, te responde. Sin lecciones, sin guion. El tutor adapta cada respuesta a lo que estás contando.</p>
        </div>
        <div className="lhv-v8-chat-zone">
          <div className="lhv-v8-orb">
            <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.10} themeMode="dark" size="md" />
          </div>
          <div className="lhv-v8-bubbles">
            <div className="lhv-v8-bubble ai">
              <small>Habi</small>
              "So you're from Argentina! What's your favorite asado cut?"
            </div>
            <div className="lhv-v8-bubble user">
              <small>Vos</small>
              "I think… how do you say 'vacío'? Is something like flank?"
            </div>
            <div className="lhv-v8-bubble ai-2">
              <small>Habi</small>
              "Yes, 'flank steak'! Perfect. So you'd say 'I love grilled flank steak.'"
            </div>
            <div className="lhv-v8-bubble user-2">
              <small>Vos</small>
              "I love grilled flank steak with chimichurri sauce."
            </div>
          </div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V9: Pizarra
// ─────────────────────────────────────────────────────────────
function VariantPizarra({ level }: { level: number }) {
  return (
    <>
      <BrandBlock />
      <div className="lhv-v9-stage">
        <span className="lhv-v9-word w1">nevertheless</span>
        <span className="lhv-v9-word w2">fluffy</span>
        <span className="lhv-v9-word w3">overthink</span>
        <span className="lhv-v9-word w4">two-step</span>
        <span className="lhv-v9-word w5">brick by brick</span>
        <span className="lhv-v9-word w6">go for it</span>
        <div className="lhv-v9-orb">
          <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.10} themeMode="dark" size="md" />
        </div>
        <div className="lhv-v9-title">Tu pizarra,<br/><em>en inglés</em>.</div>
        <div className="lhv-v9-sub">Las palabras nuevas se quedan en el aula.</div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V10: Now Playing
// ─────────────────────────────────────────────────────────────
const NOW_PLAYING = [
  { topic: 'Música electrónica', sub: 'UK Garage · two-step', tutor: 'The Sincerist' },
  { topic: 'Arquitectura', sub: 'hormigón visto · plantas', tutor: 'The Mentor' },
  { topic: 'Viajes', sub: 'aeropuertos · culturas', tutor: 'The Charlatán' },
]
function VariantNowPlaying({ level }: { level: number }) {
  const np = useRotatingItem(NOW_PLAYING, 5000)
  return (
    <>
      <BrandBlock />
      <div className="lhv-v10-stage">
        <div className="lhv-v10-headline">
          <span className="lhv-eyebrow"><Music /> Sesión en vivo</span>
          <h1 style={{ marginTop: 10 }}>Tu charla <em>ya empezó</em>.</h1>
          <p>Como Spotify, pero hablás vos. Apretás play y arrancás. El tutor sabe en qué quedaste.</p>
        </div>
        <div className="lhv-v10-card">
          <div className="lhv-v10-cover">
            <div className="orb">
              <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.10} themeMode="dark" size="md" />
            </div>
          </div>
          <div className="lhv-v10-info">
            <div className="now"><span className="dot" /> Ahora hablando</div>
            <div className="topic">{np.topic}</div>
            <div className="tutor">{np.sub} · con <span>{np.tutor}</span></div>
            <div className="lhv-v10-progress">
              <div className="lhv-v10-bar"><i /></div>
              <div className="lhv-v10-times"><span>02:14</span><span>05:00</span></div>
            </div>
            <div className="lhv-v10-controls">
              <button><SkipForward size={16} style={{ transform: 'rotate(180deg)' }} /></button>
              <button className="play"><Play size={18} fill="currentColor" /></button>
              <button><Pause size={16} /></button>
              <button><SkipForward size={16} /></button>
            </div>
          </div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V11: Newsroom TV
// ─────────────────────────────────────────────────────────────
function VariantNewsroom({ level }: { level: number }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <>
      <BrandBlock />
      <div className="lhv-v11-stage">
        <span className="lhv-eyebrow"><Tv /> Transmisión en vivo · IA conversacional</span>
        <div className="lhv-v11-screen">
          <div className="lhv-v11-live-badge"><span className="d" /> LIVE</div>
          <div className="lhv-v11-time">{time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div className="lhv-v11-anchor">
            <div className="lhv-v11-orb">
              <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.10} themeMode="dark" size="lg" />
            </div>
            <div className="lhv-v11-label">EL TUTOR HABLA</div>
          </div>
        </div>
        <div className="lhv-v11-ticker">
          <div className="lhv-v11-ticker-track">
            <span>5 minutos por día</span>
            <span>Tutor de IA con voz nativa</span>
            <span>Inglés · Portugués · Italiano</span>
            <span>Sin exámenes · sin lecciones lineales</span>
            <span>El tutor se adapta a tu nivel</span>
            <span>Cargá tus intereses, charlá de lo que querés</span>
            <span>Cero juicio · errores bienvenidos</span>
          </div>
        </div>
        <div className="lhv-v11-bottom">
          <div className="lhv-v11-stat"><div className="l">Idiomas</div><div className="v"><em>3</em> activos</div></div>
          <div className="lhv-v11-stat"><div className="l">Tópicos</div><div className="v"><em>96</em> curados</div></div>
          <div className="lhv-v11-stat"><div className="l">Sesión típica</div><div className="v"><em>5</em> minutos</div></div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V12: Cinema
// ─────────────────────────────────────────────────────────────
const CINEMA_LINES = [
  { who: 'Habi', text: '"Tell me about a moment when you felt completely lost in another country."' },
  { who: 'Habi', text: '"What if you only had three sentences to convince someone to visit your hometown?"' },
  { who: 'Habi', text: '"Describe a smell from your childhood. Just the smell — make me see it."' },
]
function VariantCinema({ level }: { level: number }) {
  const line = useRotatingItem(CINEMA_LINES, 5500)
  return (
    <>
      <BrandBlock />
      <div className="lhv-v12-stage">
        <div className="lhv-v12-bands top" />
        <div className="lhv-v12-bands bottom" />
        <div className="lhv-v12-title">El idioma como<br/><em>una conversación</em>.</div>
        <div className="lhv-v12-orb-mega">
          <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.08} themeMode="dark" size="lg" />
        </div>
        <div className="lhv-v12-subtitle">
          <span className="who">{line.who}</span>
          {line.text}
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Render selector
// ─────────────────────────────────────────────────────────────
export function LoginHeroPlus({ variant, level }: { variant: number; level: number }): ReactNode {
  return (
    <>
      <style>{SHARED}</style>
      <div className="lhv-glow-a" />
      <div className="lhv-glow-b" />
      {variant === 7 && <VariantClaseLive level={level} />}
      {variant === 8 && <VariantChatBurbujas level={level} />}
      {variant === 9 && <VariantPizarra level={level} />}
      {variant === 10 && <VariantNowPlaying level={level} />}
      {variant === 11 && <VariantNewsroom level={level} />}
      {variant === 12 && <VariantCinema level={level} />}
    </>
  )
}

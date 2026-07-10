// Variante 3 — "Presencia · retrato abstracto".
// Portada desde docs/03-rework/propuestas/clase-variante-3.html. Blob orgánico (2 formas
// que driftan) + core con glint. El core escala con el nivel de voz real del tutor.
//
// CSS scopeado bajo .clase-v3-root. Dark cuelga del data-theme (o prefers-color-scheme).
import type { ClaseVariantProps } from './types'
import { ExitIcon, TranscriptIcon, MicIcon } from './icons'

const CSS = `
.clase-v3-root {
  --font-sans: -apple-system, 'Trebuchet MS', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --bg: oklch(96.5% 0.014 90); --surface: oklch(99.3% 0.006 90); --surface-2: oklch(93% 0.02 90);
  --ink: oklch(24% 0.03 40); --ink-soft: oklch(44% 0.035 45); --ink-faint: oklch(60% 0.03 50);
  --border: oklch(88% 0.02 70); --primary: oklch(70% 0.145 163); --primary-dark: oklch(52% 0.11 163);
  --warm: oklch(80% 0.14 70); --warm-dark: oklch(62% 0.15 45);
  --radius-lg: 32px; --radius-pill: 999px; --dur-slow: 9s; --dur-fast: 180ms; --ease: cubic-bezier(.22,.85,.32,1);
  background: var(--bg); color: var(--ink); font-family: var(--font-sans);
}
:root[data-theme="dark"] .clase-v3-root {
  --bg: oklch(17% 0.025 50); --surface: oklch(21% 0.025 50); --surface-2: oklch(25% 0.03 50);
  --ink: oklch(95% 0.012 80); --ink-soft: oklch(78% 0.02 75); --ink-faint: oklch(58% 0.02 70);
  --border: oklch(32% 0.03 55); --primary: oklch(75% 0.15 163); --primary-dark: oklch(58% 0.13 163);
  --warm: oklch(78% 0.15 72); --warm-dark: oklch(66% 0.16 50);
}
.clase-v3-root * { box-sizing: border-box; }
.clase-v3-root .stage-outer { padding: max(env(safe-area-inset-top), 14px) 18px 18px; min-height: 100dvh; display: flex; }
.clase-v3-root .stage { flex: 1; border-radius: var(--radius-lg); background: var(--surface); box-shadow: 0 30px 70px -30px oklch(0% 0 0 / 22%);
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: 26px 22px calc(26px + env(safe-area-inset-bottom, 0px)); position: relative; overflow: hidden; }
.clase-v3-root .stage::before { content: ""; position: absolute; inset: 0; background: radial-gradient(900px 420px at 50% 108%, oklch(80% 0.14 70 / 14%) 0%, transparent 60%); pointer-events: none; }
.clase-v3-root .top-row { width: 100%; max-width: 640px; display: flex; align-items: center; justify-content: space-between; z-index: 1; }
.clase-v3-root .topic-chip { display: flex; flex-direction: column; gap: 2px; }
.clase-v3-root .topic-eyebrow { font-size: 11px; font-weight: 700; color: var(--warm-dark); }
.clase-v3-root .topic-title { font-size: 19px; font-weight: 800; letter-spacing: -.01em; color: var(--ink); }
.clase-v3-root .exit-btn { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 14px;
  border: none; background: var(--surface-2); color: var(--ink-soft); cursor: pointer; transition: all var(--dur-fast) var(--ease); }
.clase-v3-root .exit-btn:hover { background: var(--border); color: var(--ink); }
.clase-v3-root .aura-zone { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; z-index: 1; }
.clase-v3-root .blob-wrap { position: relative; width: 260px; height: 260px; display: grid; place-items: center; }
.clase-v3-root .blob { position: absolute; border-radius: 50%; filter: blur(20px); opacity: .55; }
.clase-v3-root .blob-a { width: 200px; height: 200px; background: var(--primary); animation: drift-a-v3 var(--dur-slow) ease-in-out infinite; }
.clase-v3-root .blob-b { width: 160px; height: 160px; background: var(--warm); animation: drift-b-v3 calc(var(--dur-slow) * 1.2) ease-in-out infinite; }
.clase-v3-root .presence-scale { transition: transform 120ms linear; }
.clase-v3-root .core-presence { position: relative; width: 132px; height: 132px; border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, oklch(88% 0.09 130) 0%, var(--primary) 45%, var(--primary-dark) 100%);
  box-shadow: 0 20px 44px -16px var(--primary-dark); animation: presence-breathe-v3 4.5s ease-in-out infinite; }
.clase-v3-root .glint { position: absolute; width: 26px; height: 26px; border-radius: 50%; background: oklch(98% 0.02 100 / 70%); top: 26%; left: 30%; filter: blur(2px); animation: glint-move-v3 6s ease-in-out infinite; }
@keyframes drift-a-v3 { 0%,100% { transform: translate(-18px,-6px) scale(1); } 50% { transform: translate(14px,10px) scale(1.08); } }
@keyframes drift-b-v3 { 0%,100% { transform: translate(20px,10px) scale(1); } 50% { transform: translate(-16px,-12px) scale(1.06); } }
@keyframes presence-breathe-v3 { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes glint-move-v3 { 0%,100% { transform: translate(0,0); opacity: .7; } 50% { transform: translate(6px,4px); opacity: .95; } }
.clase-v3-root .blob-wrap[data-state="pensando"] .core-presence { background: radial-gradient(circle at 36% 30%, oklch(92% 0.08 90) 0%, var(--warm) 45%, var(--warm-dark) 100%); animation-duration: 2.6s; }
.clase-v3-root .blob-wrap[data-state="pensando"] .blob-a, .clase-v3-root .blob-wrap[data-state="pensando"] .blob-b { animation-duration: 2.6s; }
.clase-v3-root .blob-wrap[data-state="hablando"] .core-presence { animation-duration: 1.3s; }
.clase-v3-root .blob-wrap[data-state="hablando"] .glint { animation-duration: 1.3s; }
.clase-v3-root .state-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--ink-soft); }
.clase-v3-root .state-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); }
.clase-v3-root .prompt-line { max-width: 440px; text-align: center; font-size: 17px; font-weight: 500; line-height: 1.5; color: var(--ink); padding: 14px 20px; border-radius: 20px; background: var(--surface-2); }
.clase-v3-root .bottom-row { width: 100%; max-width: 640px; display: flex; align-items: center; justify-content: center; gap: 16px; z-index: 1; }
.clase-v3-root .mic-btn { display: inline-flex; align-items: center; gap: 10px; padding: 15px 28px; border-radius: var(--radius-pill); background: var(--primary); color: white; border: none;
  font-family: var(--font-sans); font-size: 16px; font-weight: 800; cursor: pointer; transition: transform var(--dur-fast) var(--ease); box-shadow: 0 12px 28px -10px var(--primary-dark); }
.clase-v3-root .mic-btn:hover { transform: translateY(-2px) scale(1.02); }
.clase-v3-root .transcript-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-pill); background: var(--surface-2); border: none; color: var(--ink-soft);
  font-size: 13px; font-weight: 700; cursor: pointer; transition: all var(--dur-fast) var(--ease); }
.clase-v3-root .transcript-btn:hover { background: var(--border); color: var(--ink); }
@media (prefers-reduced-motion: reduce) { .clase-v3-root .blob-a, .clase-v3-root .blob-b, .clase-v3-root .core-presence, .clase-v3-root .glint { animation: none !important; } }
@media (max-width: 480px) { .clase-v3-root .blob-wrap { width: 210px; height: 210px; } .clase-v3-root .core-presence { width: 106px; height: 106px; } .clase-v3-root .topic-title { font-size: 16px; } }
`

export default function ClaseVariant3({ state, topicTitle, promptLine, stateLabel, audioLevel, onEnd }: ClaseVariantProps) {
  const liveScale = state === 'hablando' ? 1 + Math.min(audioLevel, 1) * 0.12 : 1
  return (
    <div className="clase-v3-root">
      <style>{CSS}</style>
      <div className="stage-outer">
        <div className="stage">
          <div className="top-row">
            <div className="topic-chip">
              <span className="topic-eyebrow">Hoy con Coach</span>
              <span className="topic-title">{topicTitle}</span>
            </div>
            <button className="exit-btn" aria-label="Salir de la clase" title="Salir" onClick={onEnd}><ExitIcon /></button>
          </div>
          <div className="aura-zone">
            <div className="blob-wrap" data-state={state}>
              <div className="blob blob-a" />
              <div className="blob blob-b" />
              <div className="presence-scale" style={{ transform: `scale(${liveScale})` }}>
                <div className="core-presence"><div className="glint" /></div>
              </div>
            </div>
            <div className="state-label"><span className="state-dot" />{stateLabel}</div>
            <p className="prompt-line">{promptLine}</p>
          </div>
          <div className="bottom-row">
            <button className="transcript-btn"><TranscriptIcon /> Transcripción</button>
            <button className="mic-btn"><MicIcon /> Mantené para hablar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

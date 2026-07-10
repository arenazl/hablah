// Variante 1 — "Aura orgánica · calma editorial".
// Portada 1:1 desde docs/03-rework/propuestas/clase-variante-1.html, ahora conectada al
// audio real: el core respira por CSS y además escala con el nivel de voz del tutor.
//
// CSS scopeado bajo .clase-v1-root (vars + keyframes con sufijo -v1) para que las 3
// variantes puedan convivir en /lab sin pisarse. Dark/light cuelga del data-theme que
// ThemeContext ya escribe en <html>.
import type { ClaseVariantProps } from './types'
import { ExitIcon, TranscriptIcon, MicIcon } from './icons'

const CSS = `
.clase-v1-root {
  --font-serif: Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --bg: oklch(98.5% 0.004 145); --surface: oklch(99.2% 0.002 145); --surface-2: oklch(96% 0.008 145);
  --ink: oklch(18.3% 0.011 176); --ink-soft: oklch(42% 0.02 176); --ink-faint: oklch(62% 0.015 176);
  --border: oklch(88% 0.012 145); --primary: oklch(67.8% 0.146 163); --primary-dark: oklch(50% 0.11 163);
  --primary-soft: oklch(92% 0.05 163); --accent: oklch(78% 0.15 75); --accent-dark: oklch(52% 0.13 65);
  --radius-pill: 999px; --dur-slow: 6s; --dur-med: 420ms; --dur-fast: 180ms; --ease: cubic-bezier(.22,.85,.32,1);
  background: var(--bg); color: var(--ink); font-family: var(--font-sans);
}
:root[data-theme="dark"] .clase-v1-root {
  --bg: oklch(15% 0.018 176); --surface: oklch(19% 0.02 176); --surface-2: oklch(23% 0.022 176);
  --ink: oklch(96% 0.006 145); --ink-soft: oklch(80% 0.016 145); --ink-faint: oklch(58% 0.018 176);
  --border: oklch(30% 0.02 176); --primary: oklch(74% 0.15 163); --primary-dark: oklch(60% 0.13 163);
  --primary-soft: oklch(30% 0.05 163); --accent: oklch(80% 0.15 78); --accent-dark: oklch(70% 0.14 72);
}
.clase-v1-root * { box-sizing: border-box; }
.clase-v1-root .stage {
  min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: max(env(safe-area-inset-top), 20px) 20px calc(28px + env(safe-area-inset-bottom, 0px));
}
.clase-v1-root .top-row { width: 100%; max-width: 640px; display: flex; align-items: center; justify-content: space-between; }
.clase-v1-root .topic-chip { display: flex; flex-direction: column; gap: 2px; }
.clase-v1-root .topic-eyebrow { font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-faint); font-weight: 600; }
.clase-v1-root .topic-title { font-family: var(--font-serif); font-size: 20px; font-weight: 500; letter-spacing: -.01em; color: var(--ink); }
.clase-v1-root .exit-btn { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid var(--border); background: var(--surface); color: var(--ink-soft); cursor: pointer; transition: all var(--dur-fast) var(--ease); }
.clase-v1-root .exit-btn:hover { border-color: var(--ink-faint); color: var(--ink); background: var(--surface-2); }
.clase-v1-root .aura-zone { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px; }
.clase-v1-root .aura-wrap { position: relative; width: 260px; height: 260px; display: grid; place-items: center; }
.clase-v1-root .aura-halo { position: absolute; inset: -30px; border-radius: 50%;
  background: radial-gradient(circle, var(--primary-soft) 0%, transparent 68%); filter: blur(2px); animation: breathe-v1 var(--dur-slow) ease-in-out infinite; }
.clase-v1-root .aura-ring { position: absolute; inset: 18px; border-radius: 50%; border: 1.5px solid var(--border); }
.clase-v1-root .aura-ring::before { content: ""; position: absolute; inset: -1.5px; border-radius: 50%;
  border: 1.5px solid transparent; border-top-color: var(--primary); border-right-color: var(--primary); opacity: .55; animation: spin-v1 14s linear infinite; }
.clase-v1-root .aura-scale { transition: transform 120ms linear; }
.clase-v1-root .aura-core { position: relative; width: 168px; height: 168px; border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, var(--primary) 0%, var(--primary) 55%, var(--primary-dark) 100%);
  background: radial-gradient(circle at 34% 30%, oklch(from var(--primary) calc(l + 0.12) c h) 0%, var(--primary) 55%, var(--primary-dark) 100%);
  box-shadow: 0 18px 48px -12px var(--primary-dark);
  box-shadow: 0 18px 48px -12px oklch(from var(--primary) l c h / 45%);
  animation: breathe-core-v1 var(--dur-slow) ease-in-out infinite; display: grid; place-items: center; }
.clase-v1-root .aura-core::after { content: ""; position: absolute; inset: 14%; border-radius: 50%;
  background: radial-gradient(circle at 40% 34%, rgba(255,255,255,.35), transparent 60%); }
@keyframes breathe-v1 { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes breathe-core-v1 { 0%,100% { transform: scale(1); } 50% { transform: scale(1.045); } }
@keyframes spin-v1 { to { transform: rotate(360deg); } }
.clase-v1-root .aura-wrap[data-state="pensando"] .aura-core {
  background: radial-gradient(circle at 34% 30%, oklch(from var(--accent) calc(l + 0.1) c h) 0%, var(--accent) 55%, var(--accent-dark) 100%); animation-duration: 2.4s; }
.clase-v1-root .aura-wrap[data-state="pensando"] .aura-halo { background: radial-gradient(circle, oklch(from var(--accent) l c h / 30%) 0%, transparent 68%); animation-duration: 2.4s; }
.clase-v1-root .aura-wrap[data-state="hablando"] .aura-core { animation-duration: 1.1s; }
.clase-v1-root .aura-wrap[data-state="hablando"] .aura-halo { animation-duration: 1.1s; }
.clase-v1-root .aura-wrap[data-state="hablando"] .aura-ring::before { animation-duration: 4s; }
.clase-v1-root .state-label { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink-soft); font-weight: 500; }
.clase-v1-root .state-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--primary); }
.clase-v1-root .aura-wrap[data-state="pensando"] ~ .state-label .state-dot { background: var(--accent-dark); }
.clase-v1-root .prompt-line { max-width: 460px; text-align: center; font-family: var(--font-serif); font-style: italic; font-size: 17px; line-height: 1.5; color: var(--ink-soft); padding: 0 12px; }
.clase-v1-root .bottom-row { width: 100%; max-width: 640px; display: flex; align-items: center; justify-content: center; gap: 18px; }
.clase-v1-root .mic-btn { display: inline-flex; align-items: center; gap: 10px; padding: 14px 26px; border-radius: var(--radius-pill);
  background: var(--ink); color: var(--bg); border: none; font-family: var(--font-sans); font-size: 16px; font-weight: 600; cursor: pointer; transition: transform var(--dur-fast) var(--ease); }
.clase-v1-root .mic-btn:hover { transform: translateY(-1px); }
.clase-v1-root .transcript-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-pill);
  background: transparent; border: 1px solid var(--border); color: var(--ink-soft); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--dur-fast) var(--ease); }
.clase-v1-root .transcript-btn:hover { border-color: var(--ink-faint); color: var(--ink); }
@media (prefers-reduced-motion: reduce) { .clase-v1-root .aura-halo, .clase-v1-root .aura-core, .clase-v1-root .aura-ring::before { animation: none !important; } }
@media (max-width: 480px) { .clase-v1-root .aura-wrap { width: 210px; height: 210px; } .clase-v1-root .aura-core { width: 136px; height: 136px; } .clase-v1-root .topic-title { font-size: 17px; } }
`

export default function ClaseVariant1({ state, topicTitle, promptLine, stateLabel, audioLevel, onEnd }: ClaseVariantProps) {
  const liveScale = state === 'hablando' ? 1 + Math.min(audioLevel, 1) * 0.14 : 1
  return (
    <div className="clase-v1-root">
      <style>{CSS}</style>
      <div className="stage">
        <div className="top-row">
          <div className="topic-chip">
            <span className="topic-eyebrow">Hoy · con Coach</span>
            <span className="topic-title">{topicTitle}</span>
          </div>
          <button className="exit-btn" aria-label="Salir de la clase" title="Salir" onClick={onEnd}><ExitIcon /></button>
        </div>
        <div className="aura-zone">
          <div className="aura-wrap" data-state={state}>
            <div className="aura-halo" />
            <div className="aura-ring" />
            <div className="aura-scale" style={{ transform: `scale(${liveScale})` }}>
              <div className="aura-core" />
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
  )
}

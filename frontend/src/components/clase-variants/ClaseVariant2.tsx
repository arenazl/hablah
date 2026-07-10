// Variante 2 — "Estudio en vivo · waveform".
// Portada desde docs/03-rework/propuestas/clase-variante-2.html. Las 40 barras del anillo,
// que en la maqueta eran una animación fija, acá reaccionan a las frecuencias REALES del
// audio del tutor cuando está hablando (por eso esta variante es la que más gana con
// audio en vivo). Sin audio, cae a la animación de respiración CSS.
//
// CSS scopeado bajo .clase-v2-root. Piel oscura por default, clara con data-theme="light".
import type { ClaseVariantProps } from './types'
import { ExitIcon, TranscriptIcon, MicIcon } from './icons'

const BAR_COUNT = 40
const RADIUS = 78

const CSS = `
.clase-v2-root {
  --font-mono: ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --bg: oklch(13.5% 0.016 200); --surface: oklch(18% 0.02 200); --surface-2: oklch(22% 0.022 200);
  --ink: oklch(95% 0.01 175); --ink-soft: oklch(74% 0.03 180); --ink-faint: oklch(50% 0.03 195);
  --border: oklch(30% 0.03 195); --primary: oklch(74% 0.15 172); --primary-glow: oklch(74% 0.15 172 / 45%);
  --primary-dim: oklch(45% 0.09 172); --accent: oklch(80% 0.16 78); --radius-pill: 999px;
  --dur-fast: 160ms; --ease: cubic-bezier(.22,.85,.32,1);
  background: var(--bg); color: var(--ink); font-family: var(--font-sans);
}
:root[data-theme="light"] .clase-v2-root {
  --bg: oklch(95% 0.006 200); --surface: oklch(99% 0.003 200); --surface-2: oklch(92% 0.01 200);
  --ink: oklch(18% 0.02 200); --ink-soft: oklch(38% 0.03 195); --ink-faint: oklch(55% 0.02 195);
  --border: oklch(82% 0.015 195); --primary: oklch(56% 0.14 172); --primary-dim: oklch(70% 0.1 172);
}
.clase-v2-root * { box-sizing: border-box; }
.clase-v2-root .stage {
  min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: max(env(safe-area-inset-top), 18px) 20px calc(26px + env(safe-area-inset-bottom, 0px));
  background: radial-gradient(1100px 500px at 50% -10%, oklch(74% 0.15 172 / 12%) 0%, transparent 60%), var(--bg); }
.clase-v2-root .top-row { width: 100%; max-width: 680px; display: flex; align-items: center; justify-content: space-between; }
.clase-v2-root .topic-chip { display: flex; flex-direction: column; gap: 3px; }
.clase-v2-root .topic-eyebrow { font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); }
.clase-v2-root .topic-eyebrow::before { content: '// '; color: var(--primary); }
.clase-v2-root .topic-title { font-family: var(--font-sans); font-size: 19px; font-weight: 700; letter-spacing: -.01em; color: var(--ink); }
.clase-v2-root .rec-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: var(--radius-pill);
  background: var(--surface-2); border: 1px solid var(--border); font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-soft); letter-spacing: .04em; }
.clase-v2-root .rec-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); animation: blink-v2 1.6s ease-in-out infinite; }
@keyframes blink-v2 { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
.clase-v2-root .exit-btn { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--surface); color: var(--ink-soft); cursor: pointer; transition: all var(--dur-fast) var(--ease); }
.clase-v2-root .exit-btn:hover { border-color: var(--ink-faint); color: var(--ink); background: var(--surface-2); }
.clase-v2-root .aura-zone { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; }
.clase-v2-root .bars-wrap { position: relative; width: 260px; height: 260px; display: grid; place-items: center; }
.clase-v2-root .bars-ring { position: absolute; inset: 0; }
.clase-v2-root .bar { position: absolute; left: 50%; top: 50%; width: 3px; border-radius: 2px; background: var(--primary-dim);
  transform-origin: 50% 0%; animation: bar-pulse-v2 1.6s ease-in-out infinite; transition: height 90ms linear; }
@keyframes bar-pulse-v2 { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
.clase-v2-root .core { position: relative; width: 128px; height: 128px; border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, var(--primary) 0%, var(--primary-dim) 60%, transparent 100%);
  box-shadow: 0 0 60px 6px var(--primary-glow), inset 0 0 30px oklch(0% 0 0 / 25%); display: grid; place-items: center; animation: core-breathe-v2 3.2s ease-in-out infinite; }
@keyframes core-breathe-v2 { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
.clase-v2-root .bars-wrap[data-state="pensando"] .bar { background: var(--accent); animation-duration: 2.6s; }
.clase-v2-root .bars-wrap[data-state="pensando"] .core { background: radial-gradient(circle at 38% 32%, var(--accent) 0%, oklch(55% 0.1 78) 60%, transparent 100%); animation-duration: 2.6s; }
.clase-v2-root .bars-wrap[data-state="hablando"] .bar { animation-duration: .55s; }
.clase-v2-root .bars-wrap[data-state="hablando"] .core { animation-duration: 1s; }
.clase-v2-root .state-label { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
.clase-v2-root .state-dot2 { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary-glow); }
.clase-v2-root .prompt-line { max-width: 460px; text-align: center; font-family: var(--font-sans); font-size: 16px; line-height: 1.5; color: var(--ink-soft); padding: 0 12px; }
.clase-v2-root .bottom-row { width: 100%; max-width: 680px; display: flex; align-items: center; justify-content: center; gap: 16px; }
.clase-v2-root .mic-btn { display: inline-flex; align-items: center; gap: 10px; padding: 13px 24px; border-radius: 10px; background: var(--primary); color: var(--bg); border: none;
  font-family: var(--font-mono); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; cursor: pointer; transition: transform var(--dur-fast) var(--ease); }
.clase-v2-root .mic-btn:hover { transform: translateY(-1px); }
.clase-v2-root .transcript-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border);
  color: var(--ink-soft); font-family: var(--font-mono); font-size: 12px; cursor: pointer; transition: all var(--dur-fast) var(--ease); }
.clase-v2-root .transcript-btn:hover { border-color: var(--primary); color: var(--ink); }
@media (prefers-reduced-motion: reduce) { .clase-v2-root .bar, .clase-v2-root .core, .clase-v2-root .rec-dot { animation: none !important; } }
@media (max-width: 480px) { .clase-v2-root .bars-wrap { width: 210px; height: 210px; } .clase-v2-root .core { width: 100px; height: 100px; } .clase-v2-root .topic-title { font-size: 16px; } }
`

export default function ClaseVariant2({ state, topicTitle, promptLine, stateLabel, frequencies, onEnd }: ClaseVariantProps) {
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const deg = (360 / BAR_COUNT) * i
    // Altura base "orgánica" (misma fórmula sinusoidal de la maqueta) + boost por frecuencia real.
    const base = 10 + Math.round(Math.sin(i * 1.3) * 6 + 6)
    let height = base
    if (frequencies && frequencies.length > 0 && state === 'hablando') {
      const f = frequencies[Math.floor((i / BAR_COUNT) * frequencies.length)] ?? 0
      height = base + Math.min(f, 1) * 46
    }
    return (
      <i
        key={i}
        className="bar"
        style={{
          height: `${height}px`,
          transform: `translate(-50%, ${-RADIUS}px) rotate(${deg}deg)`,
          transformOrigin: `50% ${RADIUS}px`,
          animationDelay: `${i * 0.045}s`,
        }}
      />
    )
  })

  return (
    <div className="clase-v2-root">
      <style>{CSS}</style>
      <div className="stage">
        <div className="top-row">
          <div className="topic-chip">
            <span className="topic-eyebrow">sesión · Coach</span>
            <span className="topic-title">{topicTitle}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="rec-pill"><span className="rec-dot" /> live</span>
            <button className="exit-btn" aria-label="Salir de la clase" title="Salir" onClick={onEnd}><ExitIcon size={17} /></button>
          </div>
        </div>
        <div className="aura-zone">
          <div className="bars-wrap" data-state={state}>
            <div className="bars-ring">{bars}</div>
            <div className="core" />
          </div>
          <div className="state-label"><span className="state-dot2" />{stateLabel}</div>
          <p className="prompt-line">{promptLine}</p>
        </div>
        <div className="bottom-row">
          <button className="transcript-btn"><TranscriptIcon size={14} /> log</button>
          <button className="mic-btn"><MicIcon size={15} /> Push to talk</button>
        </div>
      </div>
    </div>
  )
}

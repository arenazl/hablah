// Variante 3 — "Presencia · tarjeta cálida".
// El MISMO orbe real reactivo, sobre una tarjeta flotante de esquinas muy redondeadas, con
// un halo cálido inferior y el prompt dentro de una burbuja. Tono humano y suave — la base
// más natural para que la piel kids cuelgue después sin sentirse un salto.
import { AgentAudioVisualizerAura } from '../agents-ui/agent-audio-visualizer-aura'
import type { ClaseVariantProps } from './types'
import { ExitIcon } from './icons'

const CSS = `
.clase-v3-root {
  --font-sans: -apple-system, 'Trebuchet MS', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --bg: oklch(94% 0.02 90); --surface: oklch(99.3% 0.006 90); --surface-2: oklch(93% 0.02 90);
  --ink: oklch(24% 0.03 40); --ink-soft: oklch(44% 0.035 45); --ink-faint: oklch(60% 0.03 50);
  --border: oklch(88% 0.02 70); --primary: oklch(52% 0.11 163); --warm-dark: oklch(62% 0.15 45);
  height: 100%; background: var(--bg); color: var(--ink); font-family: var(--font-sans);
}
:root[data-theme="dark"] .clase-v3-root {
  --bg: oklch(15% 0.025 50); --surface: oklch(21% 0.025 50); --surface-2: oklch(25% 0.03 50);
  --ink: oklch(95% 0.012 80); --ink-soft: oklch(78% 0.02 75); --ink-faint: oklch(58% 0.02 70);
  --border: oklch(32% 0.03 55); --primary: oklch(75% 0.15 163); --warm-dark: oklch(72% 0.16 55);
}
.clase-v3-root * { box-sizing: border-box; }
.clase-v3-root .stage-outer { height: 100%; padding: max(env(safe-area-inset-top), 14px) 16px 16px; display: flex; }
.clase-v3-root .stage {
  flex: 1; min-height: 0; border-radius: 32px; background: var(--surface); box-shadow: 0 30px 70px -30px oklch(0% 0 0 / 22%);
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: 26px 22px calc(30px + env(safe-area-inset-bottom, 0px)); position: relative; overflow: hidden;
}
.clase-v3-root .stage::before { content: ""; position: absolute; inset: 0; background: radial-gradient(900px 420px at 50% 108%, oklch(80% 0.14 70 / 16%) 0%, transparent 60%); pointer-events: none; }
.clase-v3-root .top-row { width: 100%; max-width: 640px; display: flex; align-items: flex-start; justify-content: space-between; z-index: 1; }
.clase-v3-root .topic-eyebrow { font-size: 11px; font-weight: 700; color: var(--warm-dark); }
.clase-v3-root .topic-title { font-size: 20px; font-weight: 800; letter-spacing: -.01em; color: var(--ink); margin-top: 2px; }
.clase-v3-root .exit-btn { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 14px;
  border: none; background: var(--surface-2); color: var(--ink-soft); cursor: pointer; transition: all 180ms ease; }
.clase-v3-root .exit-btn:hover { background: var(--border); color: var(--ink); }
.clase-v3-root .aura-zone { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; z-index: 1; min-height: 0; }
.clase-v3-root .state-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--ink-soft); }
.clase-v3-root .state-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); }
.clase-v3-root .prompt-line { max-width: 440px; text-align: center; font-size: 18px; font-weight: 500; line-height: 1.5; color: var(--ink); padding: 14px 22px; border-radius: 20px; background: var(--surface-2); }
`

export default function ClaseVariant3({ status, topicTitle, promptLine, stateLabel, themeMode, audioLevel, onEnd }: ClaseVariantProps) {
  return (
    <div className="clase-v3-root">
      <style>{CSS}</style>
      <div className="stage-outer">
        <div className="stage">
          <div className="top-row">
            <div>
              <div className="topic-eyebrow">Hoy con Coach</div>
              <div className="topic-title">{topicTitle}</div>
            </div>
            <button className="exit-btn" aria-label="Salir de la clase" title="Salir" onClick={onEnd}><ExitIcon /></button>
          </div>
          <div className="aura-zone">
            <AgentAudioVisualizerAura status={status} audioLevel={audioLevel} color="#00B37E" themeMode={themeMode} size="lg" />
            <div className="state-label"><span className="state-dot" />{stateLabel}</div>
            <p className="prompt-line">{promptLine}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

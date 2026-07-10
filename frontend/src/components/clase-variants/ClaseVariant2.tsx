// Variante 2 — "Estudio en vivo".
// El MISMO orbe real reactivo, sobre el vestido más cercano a la landing: fondo oscuro con
// grilla sutil, tipografía mono tipo consola, labels de estado en mayúsculas. Tono técnico
// con presencia — comunica que el audio es real.
import { AgentAudioVisualizerAura } from '../agents-ui/agent-audio-visualizer-aura'
import type { ClaseVariantProps } from './types'
import { ExitIcon } from './icons'

const CSS = `
.clase-v2-root {
  --font-mono: ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --bg: oklch(13.5% 0.016 200); --surface: oklch(18% 0.02 200); --surface-2: oklch(22% 0.022 200);
  --ink: oklch(95% 0.01 175); --ink-soft: oklch(74% 0.03 180); --ink-faint: oklch(50% 0.03 195);
  --border: oklch(30% 0.03 195); --primary: oklch(74% 0.15 172); --primary-glow: oklch(74% 0.15 172 / 45%);
  height: 100%; background: var(--bg); color: var(--ink); font-family: var(--font-sans);
}
:root[data-theme="light"] .clase-v2-root {
  --bg: oklch(95% 0.006 200); --surface: oklch(99% 0.003 200); --surface-2: oklch(92% 0.01 200);
  --ink: oklch(18% 0.02 200); --ink-soft: oklch(38% 0.03 195); --ink-faint: oklch(55% 0.02 195);
  --border: oklch(82% 0.015 195); --primary: oklch(56% 0.14 172);
}
.clase-v2-root * { box-sizing: border-box; }
.clase-v2-root .stage {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: max(env(safe-area-inset-top), 18px) 20px calc(30px + env(safe-area-inset-bottom, 0px));
  background:
    linear-gradient(oklch(74% 0.15 172 / 6%) 1px, transparent 1px) 0 0 / 100% 44px,
    linear-gradient(90deg, oklch(74% 0.15 172 / 6%) 1px, transparent 1px) 0 0 / 44px 100%,
    radial-gradient(1100px 500px at 50% -8%, oklch(74% 0.15 172 / 14%) 0%, transparent 60%),
    var(--bg);
}
.clase-v2-root .top-row { width: 100%; max-width: 680px; display: flex; align-items: flex-start; justify-content: space-between; }
.clase-v2-root .topic-eyebrow { font-family: var(--font-mono); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); }
.clase-v2-root .topic-eyebrow::before { content: '// '; color: var(--primary); }
.clase-v2-root .topic-title { font-family: var(--font-sans); font-size: 20px; font-weight: 700; letter-spacing: -.01em; color: var(--ink); margin-top: 3px; }
.clase-v2-root .exit-btn { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--surface); color: var(--ink-soft); cursor: pointer; transition: all 160ms ease; }
.clase-v2-root .exit-btn:hover { border-color: var(--ink-faint); color: var(--ink); background: var(--surface-2); }
.clase-v2-root .aura-zone { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px; min-height: 0; }
.clase-v2-root .state-label { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); }
.clase-v2-root .state-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 8px var(--primary-glow); }
.clase-v2-root .prompt-line { max-width: 460px; text-align: center; font-family: var(--font-sans); font-size: 16px; line-height: 1.5; color: var(--ink-soft); padding: 0 12px; }
`

export default function ClaseVariant2({ status, topicTitle, promptLine, stateLabel, themeMode, audioLevel, onEnd }: ClaseVariantProps) {
  return (
    <div className="clase-v2-root">
      <style>{CSS}</style>
      <div className="stage">
        <div className="top-row">
          <div>
            <div className="topic-eyebrow">sesión · Coach</div>
            <div className="topic-title">{topicTitle}</div>
          </div>
          <button className="exit-btn" aria-label="Salir de la clase" title="Salir" onClick={onEnd}><ExitIcon size={17} /></button>
        </div>
        <div className="aura-zone">
          <AgentAudioVisualizerAura status={status} audioLevel={audioLevel} color="#00B37E" themeMode={themeMode} size="lg" />
          <div className="state-label"><span className="state-dot" />{stateLabel}</div>
          <p className="prompt-line">{promptLine}</p>
        </div>
      </div>
    </div>
  )
}

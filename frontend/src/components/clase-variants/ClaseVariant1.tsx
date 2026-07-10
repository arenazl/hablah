// Variante 1 — "Editorial · calma en papel".
// El orbe es EL MISMO orbe real de producción (AgentAudioVisualizerAura, reacciona a la voz).
// Lo que define esta variante es el VESTIDO: fondo papel claro, tipografía serif, prompt en
// itálica — un tono editorial, cálido, de revista.
import { AgentAudioVisualizerAura } from '../agents-ui/agent-audio-visualizer-aura'
import type { ClaseVariantProps } from './types'
import { ExitIcon } from './icons'

const CSS = `
.clase-v1-root {
  --font-serif: 'Fraunces', Georgia, 'Iowan Old Style', 'Palatino Linotype', serif;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --bg: oklch(98.5% 0.004 145); --surface-2: oklch(96% 0.008 145);
  --ink: oklch(18.3% 0.011 176); --ink-soft: oklch(42% 0.02 176); --ink-faint: oklch(62% 0.015 176);
  --border: oklch(88% 0.012 145); --primary: oklch(50% 0.11 163);
  height: 100%; background: var(--bg); color: var(--ink); font-family: var(--font-sans);
}
:root[data-theme="dark"] .clase-v1-root {
  --bg: oklch(15% 0.018 176); --surface-2: oklch(23% 0.022 176);
  --ink: oklch(96% 0.006 145); --ink-soft: oklch(80% 0.016 145); --ink-faint: oklch(58% 0.018 176);
  --border: oklch(30% 0.02 176); --primary: oklch(74% 0.15 163);
}
.clase-v1-root * { box-sizing: border-box; }
.clase-v1-root .stage {
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: max(env(safe-area-inset-top), 20px) 20px calc(32px + env(safe-area-inset-bottom, 0px));
}
.clase-v1-root .top-row { width: 100%; max-width: 640px; display: flex; align-items: flex-start; justify-content: space-between; }
.clase-v1-root .topic-eyebrow { font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-faint); font-weight: 600; }
.clase-v1-root .topic-title { font-family: var(--font-serif); font-size: 22px; font-weight: 500; letter-spacing: -.01em; color: var(--ink); margin-top: 2px; }
.clase-v1-root .exit-btn { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid var(--border); background: transparent; color: var(--ink-soft); cursor: pointer; transition: all 180ms ease; }
.clase-v1-root .exit-btn:hover { border-color: var(--ink-faint); color: var(--ink); background: var(--surface-2); }
.clase-v1-root .aura-zone { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 30px; min-height: 0; }
.clase-v1-root .state-label { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink-soft); font-weight: 500; }
.clase-v1-root .state-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--primary); }
.clase-v1-root .prompt-line { max-width: 460px; text-align: center; font-family: var(--font-serif); font-style: italic; font-size: 19px; line-height: 1.5; color: var(--ink-soft); padding: 0 12px; }
`

export default function ClaseVariant1({ status, topicTitle, promptLine, stateLabel, themeMode, audioLevel, onEnd }: ClaseVariantProps) {
  return (
    <div className="clase-v1-root">
      <style>{CSS}</style>
      <div className="stage">
        <div className="top-row">
          <div>
            <div className="topic-eyebrow">Hoy · con Coach</div>
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
  )
}

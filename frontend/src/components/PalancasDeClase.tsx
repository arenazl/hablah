/* PalancasDeClase — las perillas que se mueven MIENTRAS la clase pasa.
 *
 * Estaban en el header de la clase real (WebApp), detrás de feature flags y sin etiquetas
 * ("SIEMPRE icon-only" en convo-bg.css). Nunca fueron del alumno: son para ver qué preset
 * funciona mejor, y eso es trabajo de laboratorio. Por eso se mudan al /motor.
 *
 * Las dos hacen lo mismo por debajo — mandan un SILENT_SYSTEM_UPDATE al coach en vivo — con
 * una diferencia que importa al comparar: el ESTILO entra en el próximo turno; el AUDIO es
 * de la cadena de voz y recién aplica en la sesión siguiente.
 *
 * `onMarca` es lo que convierte "probé un preset" en "este preset funciona mejor": sin
 * registro de qué se tocó y en qué turno, después no hay con qué decidir.
 */
import { useState, type ReactNode } from 'react'
import { PRESETS, applyPreset, loadAudioSettings, type AudioPreset } from '../lib/audioSettings'

export type PedagogyId = 'entrevistador' | 'balanced' | 'charlatan' | 'mentor' | 'provocador' | 'ludico'

export interface PedagogyOption {
  id: PedagogyId
  label: string
  short: string
  desc: string
  color: string
  icon: ReactNode
}

const PED_ICON_SIZE = 14
const pedIcon = (path: ReactNode): ReactNode => (
  <svg width={PED_ICON_SIZE} height={PED_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
)

export const PEDAGOGY_OPTIONS: PedagogyOption[] = [
  { id: 'entrevistador', label: 'Entrevistador', short: 'E', desc: 'Habla poco, pregunta mucho', color: '#4A90E2',
    icon: pedIcon(<><path d="M9.1 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><circle cx="12" cy="17" r=".5" fill="currentColor" /></>) },
  { id: 'balanced',      label: 'Equilibrado',   short: 'B', desc: 'Conversación 50/50',          color: '#00B37E',
    icon: pedIcon(<><path d="M12 3v18" /><path d="M5 8h14" /><path d="M5 8l-2 6a3 3 0 0 0 6 0L7 8" /><path d="M19 8l-2 6a3 3 0 0 0 6 0l-2-6" /></>) },
  { id: 'charlatan',     label: 'Charlatán',     short: 'C', desc: 'Cuenta y pregunta',           color: '#A874E8',
    icon: pedIcon(<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></>) },
  { id: 'mentor',        label: 'Mentor',        short: 'M', desc: 'Info + pregunta concreta',    color: '#E6A23C',
    icon: pedIcon(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>) },
  { id: 'provocador',    label: 'Provocador',    short: 'P', desc: 'Discrepa, te desafía',        color: '#E5484D',
    icon: pedIcon(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />) },
  { id: 'ludico',        label: 'Lúdico',        short: 'L', desc: 'Juegos verbales',             color: '#EC4899',
    icon: pedIcon(<><path d="M12 3v3" /><path d="M12 18v3" /><path d="M5.6 5.6l2.1 2.1" /><path d="M16.3 16.3l2.1 2.1" /><path d="M3 12h3" /><path d="M18 12h3" /><path d="M5.6 18.4l2.1-2.1" /><path d="M16.3 7.7l2.1-2.1" /></>) },
]

export const PEDAGOGY_INSTRUCTIONS: Record<PedagogyId, string> = {
  entrevistador: 'Hablá muy poco. Máximo 1 oración por turno + 1 pregunta corta. Dejá que el alumno se extienda.',
  balanced: 'Conversación equilibrada. 1-2 oraciones aportando + 1 pregunta abierta.',
  charlatan: 'Contá data concreta o anécdota breve sobre el tema. Después pedí opinión personal con 1 pregunta.',
  mentor: 'Contá 2-3 datos relevantes + 1 pregunta ESPECÍFICA. PROHIBIDO preguntas tipo "cuál es el mejor X" o "cuál es tu favorito".',
  provocador: 'Discrepá, contradecí, pedí al alumno que defienda sus ideas con datos. Tono exigente pero respetuoso.',
  ludico: 'Usá juegos verbales, micro-roleplays, humor liviano. Cero rigidez.',
}

const VOICE_PRESET_META: Record<string, { icon: JSX.Element; short: string; color: string }> = {
  'voice-room':   { short: 'Grupal',  color: '#22D67A', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  'min-latency':  { short: '1:1',     color: '#FFB800', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  'noisy-env':    { short: 'Ruido',   color: '#7C5CFF', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="2" x2="22" y2="22"/></svg> },
  'studio-hifi':  { short: 'Hi-Fi',   color: '#22D3EE', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg> },
}

export function VoicePresetsBar({ onPick }: { onPick: (preset: AudioPreset) => void | Promise<void> }) {
  const [active, setActive] = useState<string>(() => {
    const s = loadAudioSettings()
    const match = PRESETS.find((p) =>
      Object.keys(p.settings).every((k) => (s as never)[k] === (p.settings as never)[k]),
    )
    return match?.id || ''
  })
  return (
    <div className="voice-presets" role="toolbar" aria-label="Presets de audio">
      <span className="voice-presets-label">Audio</span>
      {PRESETS.map((p) => {
        const meta = VOICE_PRESET_META[p.id]
        if (!meta) return null
        const isActive = active === p.id
        return (
          <button
            key={p.id}
            type="button"
            className={`vp-chip${isActive ? ' active' : ''}`}
            onClick={() => { setActive(p.id); onPick(p) }}
            title={`${p.name} — ${p.description}`}
            aria-label={`Preset de audio: ${p.name}`}
            aria-pressed={isActive}
            style={{ ['--c' as string]: meta.color }}
          >
            {meta.icon}
            <span className="vp-chip-txt">{meta.short}</span>
          </button>
        )
      })}
    </div>
  )
}

export function PedagogyPicker({ value, onChange }: { value: string; onChange: (id: PedagogyId, label: string) => void }) {
  return (
    <div className="ped-picker" role="radiogroup" aria-label="Estilo del tutor">
      <span className="ped-picker-label">Estilo</span>
      <div className="ped-picker-chips">
        {PEDAGOGY_OPTIONS.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              className={`ped-chip${active ? ' active' : ''}`}
              onClick={() => onChange(o.id, o.label)}
              title={`${o.label} — ${o.desc}`}
              aria-label={`${o.label}: ${o.desc}`}
              aria-pressed={active}
              style={{ ['--c' as string]: o.color }}
            >
              <span className="ped-chip-ico" aria-hidden="true">{o.icon}</span>
              <span className="ped-chip-txt">{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* En la clase real estos chips son icon-only y viven sobre fondo oscuro. En el motor hacen
 * falta las dos cosas al revés: el NOMBRE visible —si estás comparando presets tenés que
 * poder leer cuál probás— y contraste sobre el panel claro. Se revierte acá y no en
 * convo-bg.css para no tocar cómo se ve la clase del alumno. */
export const PALANCAS_MOTOR_CSS = `
.palancas-motor .ped-picker, .palancas-motor .voice-presets { padding: 0; margin: 0; }
.palancas-motor .ped-chip-txt, .palancas-motor .vp-chip-txt { display: inline !important; font-size: 11px; font-weight: 700; }
.palancas-motor .ped-picker-label, .palancas-motor .voice-presets-label {
  display: inline !important; width: auto; font-size: 10.5px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .5px; opacity: .6;
}
.palancas-motor .ped-chip, .palancas-motor .vp-chip {
  display: inline-flex; align-items: center; gap: 5px; width: auto; height: 26px;
  padding: 0 10px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--motor-border, rgba(0,0,0,.14));
  background: var(--motor-soft, rgba(0,0,0,.03)); color: inherit;
}
.palancas-motor .ped-chip.active, .palancas-motor .vp-chip.active {
  border-color: var(--c); color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent);
}
.palancas-motor .ped-picker-chips { display: flex; gap: 6px; flex-wrap: wrap; }
`

export interface MarcaPalanca {
  /** Turnos del coach transcurridos cuando se tocó. Es la coordenada para leerlo después. */
  turno: number
  que: 'estilo' | 'audio'
  valor: string
}

export interface PalancasDeClaseProps {
  /** Manda el update silencioso al coach. Devuelve false si no hay sesión viva. */
  onSystemUpdate: (msg: string) => boolean
  /** Turno actual, para fechar la marca. */
  turno: number
  /** Se llama con cada movimiento, para poder comparar después. */
  onMarca?: (m: MarcaPalanca) => void
  /** Aviso al usuario. Cada superficie usa el suyo (toast en la app, texto en el motor). */
  onAviso?: (texto: string, ok: boolean) => void
}

/* Las dos palancas juntas, con el envío al coach adentro: así el motor y la app no pueden
 * quedar mandando instrucciones distintas al mismo modelo. */
export function PalancasDeClase({ onSystemUpdate, turno, onMarca, onAviso }: PalancasDeClaseProps) {
  const [pedagogy, setPedagogy] = useState<PedagogyId>('balanced')

  return (
    <>
      <PedagogyPicker
        value={pedagogy}
        onChange={(id, label) => {
          setPedagogy(id)
          const ok = onSystemUpdate(
            `[SILENT_SYSTEM_UPDATE] DO NOT acknowledge this message verbally. From now on adopt this style internally: ${label.toUpperCase()}. Rules: ${PEDAGOGY_INSTRUCTIONS[id]}. Continue the conversation in the same language and topic you were in. Just answer the next user message with the new style.`,
          )
          if (ok) onMarca?.({ turno, que: 'estilo', valor: label })
          onAviso?.(ok ? `Tutor ahora: ${label}` : 'Conectá primero', ok)
        }}
      />
      <VoicePresetsBar
        onPick={(preset) => {
          applyPreset(preset)
          // No hay update al coach: esto es cadena de voz, no conducta. Y no aplica ya.
          onMarca?.({ turno, que: 'audio', valor: preset.name })
          onAviso?.(`Audio: ${preset.name} (aplica en la próxima sesión)`, true)
        }}
      />
    </>
  )
}

// /lab/clase — Comparador de las 3 direcciones visuales de la pantalla de Clase (WO F4-05).
//
// Las 3 variantes montan EL MISMO orbe real (AgentAudioVisualizerAura) que ya usa producción:
// reacciona a la voz en vivo. Lo único que cambia entre variantes es el vestido (fondo,
// tipografía, paleta, layout). Tocás "Hablar en vivo", le hablás al coach, y comparás cómo
// se siente cada dirección con el orbe vivo — no una maqueta estática.
//
// Vive en /lab (WO F0-04): no toca producto. Cuando el dueño elija una, se aplica ese vestido
// a PracticarView y las otras dos se borran.
import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { useLiveVoice } from '../../hooks/useLiveVoice'
import { useTheme } from '../../contexts/ThemeContext'
import { sessionsAPI } from '../../services/api'
import ClaseVariant1 from '../../components/clase-variants/ClaseVariant1'
import ClaseVariant2 from '../../components/clase-variants/ClaseVariant2'
import ClaseVariant3 from '../../components/clase-variants/ClaseVariant3'
import type { VariantState } from '../../components/clase-variants/types'
import type { VisualizerStatus } from '../../hooks/agents-ui/use-agent-audio-visualizer-aura'

const TOPIC = 'Tu primer día en la oficina'
const DEFAULT_PROMPT = '"Contá — ¿de qué querés hablar hoy?"'

// status crudo → estado legible (label + copy)
function toState(status: VisualizerStatus): { state: VariantState; label: string } {
  if (status === 'speaking') return { state: 'hablando', label: 'Hablando' }
  if (status === 'connecting') return { state: 'pensando', label: 'Conectando…' }
  if (status === 'listening') return { state: 'escuchando', label: 'Te estoy escuchando' }
  if (status === 'error') return { state: 'pensando', label: 'Reintentando…' }
  if (status === 'ended') return { state: 'escuchando', label: 'Clase terminada' }
  return { state: 'escuchando', label: 'Tocá "Hablar en vivo" para probar' }
}

export default function LabClase() {
  const [params, setParams] = useSearchParams()
  const { theme, toggle } = useTheme()

  const [sessionId, setSessionId] = useState<number | null>(null)
  const [topicTitle, setTopicTitle] = useState(TOPIC)
  const [starting, setStarting] = useState(false)
  const startedRef = useRef(false)

  const live = useLiveVoice({ onError: (e) => toast.error(e.message) })

  const begin = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    setStarting(true)
    try {
      const start = await sessionsAPI.start(undefined, undefined, TOPIC)
      setSessionId(start.session_id)
      setTopicTitle(start.topic?.title || TOPIC)
      await live.start(start.session_id)
    } catch {
      toast.error('No pudimos iniciar la sesión')
      startedRef.current = false
    } finally {
      setStarting(false)
    }
  }, [live])

  const end = useCallback(() => {
    // Lab: solo cortamos la voz, NO llamamos sessionsAPI.end (no queremos disparar el analyzer
    // ni persistir el reporte de una clase de prueba).
    live.stop()
    setSessionId(null)
    startedRef.current = false
  }, [live])

  const isLive = sessionId !== null
  const status: VisualizerStatus = isLive ? live.status : 'idle'
  const { state, label } = toState(status)
  const lastAi = [...live.transcript].reverse().find((l) => l.who === 'ai')
  const promptLine = lastAi?.text || DEFAULT_PROMPT

  const variant = params.get('variant') || '1'
  const variantProps = {
    status,
    state,
    themeMode: theme,
    topicTitle,
    promptLine,
    stateLabel: label,
    audioLevel: live.audioLevel,
    onEnd: end,
  }

  const selectVariant = (v: string) => {
    const next = new URLSearchParams(params)
    next.set('variant', v)
    setParams(next, { replace: true })
  }

  return (
    <div style={shell}>
      <div style={bar}>
        <div style={pills}>
          {['1', '2', '3'].map((v) => (
            <button key={v} onClick={() => selectVariant(v)} style={variant === v ? pillOn : pill}>
              {v}
            </button>
          ))}
          <span style={barLabel}>dirección visual</span>
        </div>
        <div style={pills}>
          <button onClick={toggle} style={ghostBtn}>{theme === 'dark' ? 'Claro' : 'Oscuro'}</button>
          {isLive ? (
            <>
              <span style={statusChip}>{live.status}</span>
              <button onClick={end} style={endBtn}>Terminar</button>
            </>
          ) : (
            <button onClick={begin} disabled={starting} style={talkBtn}>
              {starting ? 'Conectando…' : 'Hablar en vivo'}
            </button>
          )}
        </div>
      </div>

      <div style={canvas}>
        {variant === '2' ? (
          <ClaseVariant2 {...variantProps} />
        ) : variant === '3' ? (
          <ClaseVariant3 {...variantProps} />
        ) : (
          <ClaseVariant1 {...variantProps} />
        )}
      </div>
    </div>
  )
}

const shell: React.CSSProperties = { height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
const canvas: React.CSSProperties = { flex: 1, minHeight: 0 }
const bar: React.CSSProperties = {
  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  padding: '10px 16px', background: 'rgba(13, 20, 18, 0.92)', backdropFilter: 'blur(8px)',
  borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#c9d6d0',
  fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace", fontSize: 12,
}
const pills: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
const barLabel: React.CSSProperties = { fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(201,214,208,0.45)', marginLeft: 4 }
const pill: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
  border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(201,214,208,0.75)', cursor: 'pointer',
}
const pillOn: React.CSSProperties = { ...pill, background: '#00B37E', borderColor: '#00B37E', color: '#04120d' }
const ghostBtn: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: 12, padding: '6px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(201,214,208,0.8)', cursor: 'pointer',
}
const talkBtn: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 8,
  border: 'none', background: '#00B37E', color: '#04120d', cursor: 'pointer',
}
const endBtn: React.CSSProperties = { ...talkBtn, background: '#e5484d', color: '#fff' }
const statusChip: React.CSSProperties = {
  fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(201,214,208,0.6)',
  padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)',
}

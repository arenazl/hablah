// /lab/clase — Comparador de las 3 variantes visuales de la pantalla de Clase (WO F4-05).
//
// Herramienta de decisión del dueño: monta la MISMA pantalla de clase (aura + tópico + salir)
// en 3 direcciones visuales, seleccionables por ?variant=1|2|3 o por los botones de la barra.
// Corre la voz REAL (useLiveVoice) para poder "hablar 5 minutos y sentir" cada una — que es lo
// que el propio doc dice que pesa más que el vistazo estático. Sin arrancar, hay un modo demo
// para ver los 3 estados (escuchando/pensando/hablando) sin micrófono.
//
// Vive en /lab a propósito (WO F0-04): no toca el producto. Cuando el dueño elija una, se
// aplica a PracticarView real y las otras dos se borran sin arrastrar lógica (son puro render).
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

const STATE_LABEL: Record<VariantState, string> = {
  escuchando: 'Te estoy escuchando',
  pensando: 'Pensando la respuesta',
  hablando: 'Hablando',
}

const DEFAULT_PROMPT = '"Contá — ¿de qué querés hablar hoy?"'

export default function LabClase() {
  const [params, setParams] = useSearchParams()
  const { theme, toggle } = useTheme()

  const [freeTopic, setFreeTopic] = useState('Tu primer día en la oficina')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [topicTitle, setTopicTitle] = useState('Tu primer día en la oficina')
  const [starting, setStarting] = useState(false)
  // Estado forzado para el modo demo (sin micrófono). En modo live se ignora.
  const [demoState, setDemoState] = useState<VariantState>('escuchando')

  const freqBinsRef = useRef<Float32Array | null>(null)
  const rerenderRafRef = useRef<number | null>(null)
  const startedRef = useRef(false)
  const [, forceRerender] = useState(0)

  const live = useLiveVoice({
    onAudioFrequencies: (bins) => {
      freqBinsRef.current = bins
      if (rerenderRafRef.current === null) {
        rerenderRafRef.current = requestAnimationFrame(() => {
          rerenderRafRef.current = null
          forceRerender((n) => (n + 1) % 1000)
        })
      }
    },
    onError: (e) => toast.error(e.message),
  })

  const begin = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    setStarting(true)
    try {
      const topic = freeTopic.trim() || 'Tema libre'
      const start = await sessionsAPI.start(undefined, undefined, topic)
      setSessionId(start.session_id)
      setTopicTitle(start.topic?.title || topic)
      await live.start(start.session_id)
    } catch {
      toast.error('No pudimos iniciar la sesión')
      startedRef.current = false
    } finally {
      setStarting(false)
    }
  }, [freeTopic, live])

  const end = useCallback(() => {
    // Lab: NO llamamos sessionsAPI.end (no queremos disparar el analyzer ni persistir un
    // reporte de una clase de prueba). Solo cortamos la voz y volvemos al estado inicial.
    live.stop()
    setSessionId(null)
    startedRef.current = false
    setDemoState('escuchando')
  }, [live])

  const isLive = sessionId !== null

  // Estado visible: en live sale del status real; en demo, del botón elegido.
  const derivedState: VariantState = (() => {
    if (!isLive) return demoState
    if (live.status === 'speaking') return 'hablando'
    if (live.status === 'connecting') return 'pensando'
    return 'escuchando'
  })()

  const lastAi = [...live.transcript].reverse().find((l) => l.who === 'ai')
  const promptLine = lastAi?.text || DEFAULT_PROMPT

  const variant = (params.get('variant') || '1') as '1' | '2' | '3'
  const variantProps = {
    state: derivedState,
    topicTitle,
    promptLine,
    stateLabel: STATE_LABEL[derivedState],
    audioLevel: live.audioLevel,
    frequencies: freqBinsRef.current,
    onEnd: end,
  }

  const selectVariant = (v: string) => {
    const next = new URLSearchParams(params)
    next.set('variant', v)
    setParams(next, { replace: true })
  }

  return (
    <div>
      {/* Barra de control del lab — deliberadamente "de herramienta" (monospace, oscura),
          para que se lea como chrome del laboratorio y no como parte del diseño evaluado. */}
      <div style={barStyle}>
        <span style={{ fontWeight: 700, letterSpacing: '.04em' }}>LAB · CLASE F4-05</span>
        <div style={groupStyle}>
          {(['1', '2', '3'] as const).map((v) => (
            <button
              key={v}
              onClick={() => selectVariant(v)}
              style={variant === v ? btnActiveStyle : btnStyle}
            >
              Variante {v}
            </button>
          ))}
        </div>
        <div style={groupStyle}>
          <button onClick={toggle} style={btnStyle}>Tema: {theme === 'dark' ? 'oscuro' : 'claro'}</button>
          {!isLive ? (
            <>
              {(['escuchando', 'pensando', 'hablando'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setDemoState(s)}
                  style={demoState === s ? btnActiveStyle : btnStyle}
                >
                  {s}
                </button>
              ))}
              <input
                value={freeTopic}
                onChange={(e) => setFreeTopic(e.target.value)}
                placeholder="Tópico de la charla"
                style={inputStyle}
              />
              <button onClick={begin} disabled={starting} style={primaryBtnStyle}>
                {starting ? 'Conectando…' : 'Hablar en vivo'}
              </button>
            </>
          ) : (
            <>
              <span style={{ opacity: 0.8 }}>estado: {live.status}</span>
              <button onClick={end} style={primaryBtnStyle}>Terminar</button>
            </>
          )}
        </div>
      </div>

      {variant === '2' ? (
        <ClaseVariant2 {...variantProps} />
      ) : variant === '3' ? (
        <ClaseVariant3 {...variantProps} />
      ) : (
        <ClaseVariant1 {...variantProps} />
      )}
    </div>
  )
}

const barStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 50,
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  padding: '8px 14px', background: '#0d1412', color: '#c9d6d0',
  fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace", fontSize: 11,
  borderBottom: '1px solid #1e2a26',
}
const groupStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }
const btnStyle: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: 11, padding: '5px 10px', borderRadius: 6,
  border: '1px solid #2a3a34', background: '#141d1a', color: '#9fb3ab', cursor: 'pointer',
}
const btnActiveStyle: React.CSSProperties = { ...btnStyle, background: '#00b37e', borderColor: '#00b37e', color: '#04120d' }
const primaryBtnStyle: React.CSSProperties = { ...btnStyle, background: '#00b37e', borderColor: '#00b37e', color: '#04120d', fontWeight: 700 }
const inputStyle: React.CSSProperties = {
  fontFamily: 'inherit', fontSize: 12, padding: '5px 8px', borderRadius: 6,
  border: '1px solid #2a3a34', background: '#0a110f', color: '#c9d6d0', width: 180,
}

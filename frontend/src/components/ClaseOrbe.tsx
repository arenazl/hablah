/* ClaseOrbe — el orbe + el panel de turno de una clase en vivo.
 *
 * Estaba escrito INLINE dentro de PracticarView (WebApp.tsx). Se saca acá para que el
 * probador /motor pueda mostrar la clase EXACTAMENTE como la ve el alumno, en vez de
 * reimplementarla: si se copia, mañana hay dos clases distintas y lo que se refina en una
 * no llega a la otra.
 *
 * No sabe nada de sesiones ni de APIs: recibe lo que `useLiveVoice` ya expone. Eso es lo que
 * le permite servir a la app de producción y al banco de pruebas con el mismo código.
 */
import { AgentAudioVisualizerAura } from './agents-ui/agent-audio-visualizer-aura'
import type { LiveStatus, TranscriptLine } from '../hooks/useLiveVoice'

export interface ClaseOrbeProps {
  status: LiveStatus
  audioLevel: number
  transcript: TranscriptLine[]
  /** Rótulo de estado ("Escuchando tu voz", "El profe habla"…). Lo arma el que llama,
   *  porque cada superficie tiene su vocabulario. */
  statusLabel?: string
  /** Nivel del alumno. En A0 el panel muestra la frase-modelo a repetir y el contador,
   *  que es la pedagogía de ese nivel; en el resto muestra lo último que dijo el tutor. */
  nivel?: string | null
  /** Pedirle al coach que repita la frase modelo. Sin esto no se muestra el botón. */
  onRepetir?: (frase: string) => void
}

const A0_META = 10

export function ClaseOrbe({
  status, audioLevel, transcript, statusLabel, nivel, onRepetir,
}: ClaseOrbeProps) {
  const ultimoDelTutor = [...transcript].reverse().find((l) => l.who === 'ai')
  const esA0 = nivel === 'A0'
  // En A0 la frase entre comillas es el modelo a repetir — es el ejercicio, no una cita.
  const fraseModelo = ultimoDelTutor?.text?.match(/['"“”]([^'"“”]+)['"“”]/)?.[1]?.trim()
  const dichas = transcript.filter((l) => l.who === 'user' && l.text.trim().length > 0).length

  return (
    <>
      <div className="convo-orb-wrap">
        <AgentAudioVisualizerAura
          status={status}
          audioLevel={audioLevel}
          color="#00B37E"
          colorShift={0.18}
          themeMode="dark"
          size="xl"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="convo-turn">
        {statusLabel && <div className="l">{statusLabel}</div>}

        {esA0 && fraseModelo ? (
          <div style={{ textAlign: 'center', padding: '10px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: 'rgba(232,236,234,.6)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 700 }}>
                Frases logradas
              </span>
              <span style={{ fontSize: 13, color: 'white', fontWeight: 800 }}>{dichas} / {A0_META}</span>
              <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (dichas / A0_META) * 100)}%`, height: '100%', background: '#00B37E', transition: 'width 320ms ease' }} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(232,236,234,.55)', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 12, fontWeight: 700 }}>
              Repetí esta frase
            </div>
            <div style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, letterSpacing: '-.02em', color: 'white', lineHeight: 1.2, marginBottom: 14, fontFamily: 'Inter, sans-serif' }}>
              &quot;{fraseModelo}&quot;
            </div>
            {onRepetir && (
              <button
                type="button"
                onClick={() => onRepetir(fraseModelo)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(0,179,126,.18)', color: '#9CFCD2',
                  border: '1px solid rgba(156,252,210,.3)', borderRadius: 999,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                Escuchar de nuevo
              </button>
            )}
          </div>
        ) : ultimoDelTutor ? (
          <div className="q" style={{ fontStyle: 'normal', color: 'white' }}>
            <div style={{ fontSize: 11, color: 'rgba(232,236,234,.5)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
              Te dijo el tutor:
            </div>
            &quot;{ultimoDelTutor.text}&quot;
          </div>
        ) : (
          <div className="q">Esperá unos segundos — el tutor te va a saludar y arrancar la charla.</div>
        )}
      </div>
    </>
  )
}

export default ClaseOrbe

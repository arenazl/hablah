/**
 * PushToTalkControl — fallback de UI para A0-A2 (F3-02).
 *
 * El VAD de Gemini (basado en amplitud) puede no captar monosílabos <1s
 * ("yes", "no") y sus umbrales pueden cambiar en updates silenciosos de
 * Google. Este control da un mecanismo de turno que NO depende de eso: el
 * alumno mantiene apretado mientras habla y suelta cuando termina. El
 * "soltar" no corta en seco -- useLiveVoice sigue mandando audio real (ya
 * silencio) durante un colchón corto para que el VAD de Gemini cierre el
 * turno con datos reales (ver el comentario largo en useLiveVoice.ts).
 *
 * Aparece SOLO en A0-A2 (ahí es donde el problema es agudo). El modo VAD
 * sigue siendo el default; push-to-talk es un toggle opt-in persistido en
 * localStorage. En B1+ este componente no renderiza nada.
 */
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Mic, Radio } from 'lucide-react'
import { loadPushToTalkPref, savePushToTalkPref, isLowLevelForPushToTalk } from '../lib/pushToTalk'

export interface PushToTalkControlProps {
  /** Nivel CEFR del alumno (A0..C2). Si no es A0-A2, el componente no renderiza nada. */
  level: string | null | undefined
  /** Hay una sesión de voz activa (listening/speaking/connecting). El botón de mantener-apretado solo tiene sentido ahí. */
  isSessionActive: boolean
  /** Reactivo: true mientras el alumno tiene el botón apretado (viene de useLiveVoice). */
  pttHeld: boolean
  /** Prende/apaga el modo en useLiveVoice (live.setPushToTalk). */
  onSetMode: (enabled: boolean) => void
  /** live.pttPress */
  onPress: () => void
  /** live.pttRelease */
  onRelease: () => void
  /** Paleta: 'dark' (fondos oscuros, app adulta/kids) o 'light'. */
  variant?: 'dark' | 'light'
}

export function PushToTalkControl({
  level, isSessionActive, pttHeld, onSetMode, onPress, onRelease, variant = 'dark',
}: PushToTalkControlProps) {
  const [enabled, setEnabled] = useState(() => loadPushToTalkPref())

  // Sincroniza la preferencia con el hook cada vez que cambia (incluido el
  // mount inicial, para que la sesión arranque ya en el modo elegido antes).
  useEffect(() => {
    onSetMode(enabled)
    savePushToTalkPref(enabled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  if (!isLowLevelForPushToTalk(level)) return null

  const isDark = variant === 'dark'
  const dim = isDark ? 'rgba(255,255,255,.62)' : 'rgba(17,17,17,.62)'
  const trackOff = isDark ? 'rgba(255,255,255,.12)' : 'rgba(17,17,17,.10)'

  const handlePress = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    onPress()
  }
  const handleRelease = () => onRelease()
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && !pttHeld) {
      e.preventDefault()
      onPress()
    }
  }
  const handleKeyUp = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onRelease()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <button
        type="button"
        onClick={() => setEnabled((v) => !v)}
        aria-pressed={enabled}
        title="Modo VAD: hablás y el sistema detecta solo cuándo empezás/terminás. Push-to-talk: mantenés apretado mientras hablás."
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: enabled ? '#22C55E' : trackOff,
          color: enabled ? '#052e13' : dim,
          fontSize: 12, fontWeight: 700, letterSpacing: '.01em',
          fontFamily: 'inherit',
        }}
      >
        <Radio size={14} strokeWidth={2.4} />
        {enabled ? 'Push-to-talk activado' : 'Activar push-to-talk'}
      </button>

      {enabled && isSessionActive && (
        <>
          <button
            type="button"
            aria-label={pttHeld ? 'Soltá para terminar de hablar' : 'Mantené apretado para hablar'}
            aria-pressed={pttHeld}
            onPointerDown={handlePress}
            onPointerUp={handleRelease}
            onPointerLeave={handleRelease}
            onPointerCancel={handleRelease}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            style={{
              width: 92, height: 92, borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'grid', placeItems: 'center', touchAction: 'none', userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              background: pttHeld
                ? 'radial-gradient(circle at 35% 30%, #4ADE80, #16A34A)'
                : 'radial-gradient(circle at 35% 30%, #FFB800, #F09D00)',
              boxShadow: pttHeld
                ? '0 0 0 10px rgba(34,197,94,.22), 0 10px 26px rgba(22,163,74,.4)'
                : '0 10px 26px rgba(240,157,0,.4)',
              transition: 'box-shadow .15s ease, transform .1s ease',
              transform: pttHeld ? 'scale(0.96)' : 'scale(1)',
            }}
          >
            <Mic size={36} strokeWidth={2.4} color="#052e13" />
          </button>
          <span style={{ fontSize: 12, color: dim, fontWeight: 600, textAlign: 'center' }}>
            {pttHeld ? 'Te escucho — soltá cuando termines' : 'Mantené apretado para hablar'}
          </span>
        </>
      )}
    </div>
  )
}

/**
 * Indicador de entrada de audio activa + selector de mic (Android/desktop).
 *
 * En iOS el selector se OCULTA (deuda tecnica #1): WebKit no deja elegir
 * dispositivo, un <select> ahi seria un control muerto que confunde. Solo
 * mostramos que entrada esta usando el navegador. En Android/desktop se
 * puede elegir de verdad (enumerateDevices + getUserMedia({deviceId})).
 */
import { Mic } from 'lucide-react'
import { isIOSDevice } from '../lib/deviceDetect'

interface MicSelectorProps {
  devices: MediaDeviceInfo[]
  activeLabel: string | null
  onSelect: (deviceId: string) => void
  style?: React.CSSProperties
}

export function MicSelector({ devices, activeLabel, onSelect, style }: MicSelectorProps) {
  const label = activeLabel || 'Micrófono'
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'rgba(255,255,255,.55)',
    ...style,
  }

  // iOS: solo indicador, sin control (no tiene efecto elegir mic ahi).
  if (isIOSDevice()) {
    return (
      <span style={baseStyle} title="En iOS el sistema elige el micrófono automáticamente">
        <Mic size={12} strokeWidth={2.4} />
        {label}
      </span>
    )
  }

  // Android/desktop: si hay más de un mic detectado, mostramos el <select>
  // real. Con 0-1 dispositivos (todavía no hay permiso, o solo hay uno) el
  // selector no aportaría nada -- mostramos solo el indicador.
  if (devices.length <= 1) {
    return (
      <span style={baseStyle}>
        <Mic size={12} strokeWidth={2.4} />
        {label}
      </span>
    )
  }

  return (
    <span style={baseStyle}>
      <Mic size={12} strokeWidth={2.4} />
      <select
        value=""
        onChange={(e) => { if (e.target.value) onSelect(e.target.value) }}
        aria-label="Elegir micrófono"
        title="Cambiar micrófono"
        style={{
          background: 'transparent',
          color: 'inherit',
          border: 'none',
          font: 'inherit',
          fontSize: 11,
          cursor: 'pointer',
          maxWidth: 160,
        }}
      >
        <option value="" disabled>{label}</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId} style={{ color: '#111' }}>
            {d.label || 'Micrófono'}
          </option>
        ))}
      </select>
    </span>
  )
}

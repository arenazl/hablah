/**
 * /tune - Panel de tuning del audio Live.
 *
 * Permite cambiar settings en vivo (sample rates, buffers, VAD, etc.) y
 * probarlos con:
 *   1. Audio de prueba pregrabado (tono local generado por AudioContext).
 *   2. Sesion Live real (con tu user) para conversar con el coach con
 *      los settings actuales y oir como suena.
 *
 * Sin auth especial - cualquiera con el link puede usarla. La idea es
 * uso interno para vos para encontrar el sweet spot.
 */
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  AudioSettings,
  AudioPreset,
  DEFAULT_SETTINGS,
  PRESETS,
  loadAudioSettings,
  saveAudioSettings,
  applyPreset,
  resetAudioSettings,
} from '../lib/audioSettings'
import { useLiveVoice } from '../hooks/useLiveVoice'
import { sessionsAPI } from '../services/api'

const CSS = `
.tune-root { min-height: 100vh; background: #0F1714; color: #E8ECEA; padding: 24px; font-family: Inter, system-ui, sans-serif; }
.tune-wrap { max-width: 1200px; margin: 0 auto; }
.tune-h1 { font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: -.02em; }
.tune-sub { color: rgba(232,236,234,.55); font-size: 13px; margin-bottom: 24px; }
.tune-grid { display: grid; grid-template-columns: 320px 1fr; gap: 24px; }
@media (max-width: 880px) { .tune-grid { grid-template-columns: 1fr; } }
.tune-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 16px; }
.tune-card h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; margin: 0 0 12px; color: #00B37E; }
.preset-btn { width: 100%; text-align: left; padding: 10px 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 10px; color: #E8ECEA; cursor: pointer; margin-bottom: 6px; transition: all .15s; }
.preset-btn:hover { background: rgba(0,179,126,.12); border-color: rgba(0,179,126,.4); }
.preset-btn.active { background: rgba(0,179,126,.18); border-color: #00B37E; }
.preset-name { font-weight: 700; font-size: 13px; }
.preset-desc { font-size: 11px; color: rgba(232,236,234,.55); margin-top: 2px; line-height: 1.3; }
.setting-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,.05); }
.setting-row:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
.setting-label { flex: 1; }
.setting-name { font-size: 13px; font-weight: 600; }
.setting-hint { font-size: 11px; color: rgba(232,236,234,.5); margin-top: 2px; }
.setting-value { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #00B37E; min-width: 80px; text-align: right; font-weight: 700; }
.setting-input { padding: 6px 8px; background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.12); border-radius: 6px; color: #E8ECEA; font-family: 'JetBrains Mono', monospace; font-size: 12px; min-width: 90px; text-align: center; }
.setting-input:focus { border-color: #00B37E; outline: none; }
.tune-actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.tune-btn { padding: 10px 16px; border-radius: 10px; border: 0; font-weight: 700; font-size: 13px; cursor: pointer; transition: all .15s; }
.tune-btn.primary { background: #00B37E; color: #0F1714; }
.tune-btn.primary:hover { background: #00C98A; }
.tune-btn.secondary { background: rgba(255,255,255,.08); color: #E8ECEA; }
.tune-btn.secondary:hover { background: rgba(255,255,255,.14); }
.tune-btn.danger { background: rgba(239,68,68,.18); color: #FF8080; border: 1px solid rgba(239,68,68,.3); }
.tune-status { padding: 8px 12px; background: rgba(0,0,0,.3); border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 12px; margin-top: 8px; }
.tune-status.live { color: #00B37E; }
.tune-status.error { color: #FF8080; }
.toggle { position: relative; width: 36px; height: 20px; background: rgba(255,255,255,.15); border-radius: 999px; cursor: pointer; transition: background .15s; flex-shrink: 0; }
.toggle.on { background: #00B37E; }
.toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform .15s; }
.toggle.on::after { transform: translateX(16px); }
`

interface Row {
  key: keyof AudioSettings
  name: string
  hint?: string
  kind: 'number' | 'select' | 'toggle' | 'float'
  options?: number[]
  min?: number
  max?: number
  step?: number
}

const ROWS: Row[] = [
  { key: 'captureSampleRate', name: 'Sample rate captura', hint: 'Hz del mic', kind: 'select', options: [8000, 16000, 24000, 48000] },
  { key: 'workletBufferSamples', name: 'Buffer worklet', hint: 'samples por chunk', kind: 'select', options: [256, 512, 1024, 2048, 4096, 8192] },
  { key: 'useAudioWorklet', name: 'AudioWorkletNode', hint: 'OFF = ScriptProcessor (deprecado)', kind: 'toggle' },
  { key: 'vadEnabled', name: 'VAD client-side', hint: 'no enviar silencios al backend', kind: 'toggle' },
  { key: 'vadThreshold', name: 'VAD threshold', hint: 'RMS por debajo = silencio', kind: 'float', min: 0.0005, max: 0.05, step: 0.0005 },
  { key: 'vadTailFrames', name: 'VAD tail frames', hint: 'frames extra tras voz', kind: 'number', min: 0, max: 10, step: 1 },
  { key: 'playbackSampleRate', name: 'Sample rate playback', hint: 'AudioContext del coach', kind: 'select', options: [16000, 24000, 48000] },
  { key: 'playbackCushionSeconds', name: 'Cushion playback', hint: 'safety en segundos', kind: 'float', min: 0.005, max: 0.2, step: 0.005 },
  { key: 'catchUpEnabled', name: 'Catch-up audio', hint: 'cancela buffers si delay >threshold', kind: 'toggle' },
  { key: 'catchUpThresholdSeconds', name: 'Catch-up threshold', hint: 'segs antes de cortar', kind: 'float', min: 0.5, max: 10, step: 0.5 },
  { key: 'echoCancellation', name: 'Echo cancellation', hint: 'AEC del browser', kind: 'toggle' },
  { key: 'noiseSuppression', name: 'Noise suppression', hint: 'NS del browser', kind: 'toggle' },
  { key: 'autoGainControl', name: 'Auto gain control', hint: 'AGC del browser', kind: 'toggle' },
  { key: 'coachVolume', name: 'Volumen coach', hint: '1.0 = original', kind: 'float', min: 0.1, max: 3.0, step: 0.1 },
  { key: 'participantVolume', name: 'Volumen participantes', hint: 'voice room', kind: 'float', min: 0.1, max: 3.0, step: 0.1 },
  { key: 'orbUpdateFps', name: 'Orbe FPS', hint: 'updates por segundo', kind: 'select', options: [5, 10, 15, 20, 30, 60] },
  { key: 'skipRedundantStatus', name: 'Skip status redundante', hint: 'evita re-renders', kind: 'toggle' },
  { key: 'wsPingIntervalMs', name: 'WS ping interval (ms)', hint: 'keepalive', kind: 'select', options: [10000, 25000, 60000] },
]

export function AudioTuningPage() {
  const [settings, setSettings] = useState<AudioSettings>(() => loadAudioSettings())
  const [activePresetId, setActivePresetId] = useState<string>('default')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const testAudioRef = useRef<{ ctx: AudioContext | null; osc: OscillatorNode | null }>({ ctx: null, osc: null })

  const live = useLiveVoice({
    onError: (e) => toast.error(e.message),
    onAudioGlitch: (info) => {
      console.warn('[tune]', info)
    },
  })

  // Persistir cualquier cambio
  useEffect(() => {
    saveAudioSettings(settings)
  }, [settings])

  const update = (key: keyof AudioSettings, value: number | boolean): void => {
    setSettings((s) => ({ ...s, [key]: value }))
    setActivePresetId('')  // cambio custom, ya no estoy en preset
  }

  const choosePreset = (preset: AudioPreset): void => {
    const merged = applyPreset(preset)
    setSettings(merged)
    setActivePresetId(preset.id)
    toast.success(`Preset aplicado: ${preset.name}`)
  }

  const reset = (): void => {
    setSettings(resetAudioSettings())
    setActivePresetId('default')
    toast('Settings reseteados al default')
  }

  // Audio de prueba: barrido de tonos (220Hz -> 880Hz) por 3s. Sirve para
  // testear el AudioContext de playback con los settings actuales.
  const playTestTone = async (): Promise<void> => {
    try {
      // Cerrar anterior si existia
      if (testAudioRef.current.osc) {
        try { testAudioRef.current.osc.stop() } catch {}
        testAudioRef.current.osc = null
      }
      const ctx = testAudioRef.current.ctx ?? new AudioContext({ sampleRate: settings.playbackSampleRate })
      testAudioRef.current.ctx = ctx
      if (ctx.state === 'suspended') await ctx.resume()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      const t0 = ctx.currentTime
      osc.frequency.setValueAtTime(220, t0)
      osc.frequency.linearRampToValueAtTime(880, t0 + 3)
      gain.gain.value = settings.coachVolume * 0.3
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0)
      osc.stop(t0 + 3)
      testAudioRef.current.osc = osc
      toast.success('Sonando tono de prueba (3s)')
    } catch (e) {
      toast.error(`No pude reproducir: ${(e as Error).message}`)
    }
  }

  // Audio prerendered del coach: usa Web Speech API local del browser.
  // No depende del backend ni de la red. Para escuchar voz humana con
  // los settings de playback aplicados.
  const playTestVoice = (): void => {
    if (!('speechSynthesis' in window)) {
      toast.error('Web Speech no soportado en este browser')
      return
    }
    const u = new SpeechSynthesisUtterance(
      'Hello! This is a test of the audio system. ' +
      'Can you hear me clearly? Try adjusting the settings on the left panel ' +
      'and play this again to compare.'
    )
    u.lang = 'en-US'
    u.rate = 1.0
    u.volume = Math.min(1, settings.coachVolume)
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
    toast.success('Reproduciendo voz de prueba')
  }

  const startTestSession = async (): Promise<void> => {
    try {
      // Crea una sesion normal y conecta. Los settings actuales se aplican
      // al iniciar el WS.
      const start = await sessionsAPI.start(undefined, undefined, 'audio tuning test')
      setSessionId(start.session_id)
      await live.start(start.session_id)
      toast.success(`Sesión iniciada (id ${start.session_id}). Hablale al mic.`)
    } catch (e: unknown) {
      toast.error(`No pude iniciar: ${(e as Error).message}`)
    }
  }

  const stopTestSession = async (): Promise<void> => {
    try { live.stop() } catch {}
    if (sessionId) {
      try { await sessionsAPI.end(sessionId, []) } catch {}
    }
    setSessionId(null)
    toast('Sesión cerrada')
  }

  const renderRow = (row: Row) => {
    const val = settings[row.key]
    let control: JSX.Element

    if (row.kind === 'toggle') {
      control = (
        <div
          className={`toggle ${val ? 'on' : ''}`}
          onClick={() => update(row.key, !val)}
        />
      )
    } else if (row.kind === 'select') {
      control = (
        <select
          className="setting-input"
          value={String(val)}
          onChange={(e) => update(row.key, Number(e.target.value))}
        >
          {row.options!.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )
    } else {
      control = (
        <input
          type="number"
          className="setting-input"
          value={String(val)}
          min={row.min}
          max={row.max}
          step={row.step}
          onChange={(e) => update(row.key, Number(e.target.value))}
        />
      )
    }

    return (
      <div className="setting-row" key={row.key}>
        <div className="setting-label">
          <div className="setting-name">{row.name}</div>
          {row.hint && <div className="setting-hint">{row.hint}</div>}
        </div>
        <span className="setting-value">{typeof val === 'boolean' ? (val ? 'ON' : 'OFF') : val}</span>
        {control}
      </div>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="tune-root">
        <div className="tune-wrap">
          <h1 className="tune-h1">Audio Tuning · Hablah</h1>
          <p className="tune-sub">
            Cambiá settings en vivo, escuchá el efecto. Los settings se persisten en
            localStorage y se aplican la PRÓXIMA vez que iniciás una sesión Live.
            Si ya estás en sesión, cerrá y reiniciá para ver el cambio.
          </p>

          <div className="tune-grid">
            <div>
              <div className="tune-card" style={{ marginBottom: 16 }}>
                <h3>Presets ({PRESETS.length})</h3>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`preset-btn${activePresetId === p.id ? ' active' : ''}`}
                    onClick={() => choosePreset(p)}
                  >
                    <div className="preset-name">{p.name}</div>
                    <div className="preset-desc">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="tune-card" style={{ marginBottom: 16 }}>
                <h3>Settings</h3>
                {ROWS.map(renderRow)}

                <div className="tune-actions">
                  <button className="tune-btn primary" onClick={() => saveAudioSettings(settings)}>
                    Guardar settings
                  </button>
                  <button className="tune-btn secondary" onClick={reset}>
                    Reset default
                  </button>
                </div>
              </div>

              <div className="tune-card" style={{ marginBottom: 16 }}>
                <h3>Probar audio</h3>
                <p style={{ fontSize: 12, color: 'rgba(232,236,234,.55)', margin: '0 0 12px' }}>
                  No requiere sesión Live. Usa solo el AudioContext con los settings
                  actuales para reproducir.
                </p>
                <div className="tune-actions">
                  <button className="tune-btn secondary" onClick={playTestTone}>
                    🎵 Tono de prueba (3s)
                  </button>
                  <button className="tune-btn secondary" onClick={playTestVoice}>
                    🗣️ Voz de prueba (Web Speech)
                  </button>
                </div>
              </div>

              <div className="tune-card">
                <h3>Sesión Live de prueba</h3>
                <p style={{ fontSize: 12, color: 'rgba(232,236,234,.55)', margin: '0 0 12px' }}>
                  Arranca una sesión real con tu user. Los settings ACTUALES se aplican al
                  iniciar. Hacele una pregunta y escuchá la respuesta para comparar.
                </p>
                <div className="tune-actions">
                  {!sessionId ? (
                    <button className="tune-btn primary" onClick={startTestSession}>
                      ▶ Iniciar sesión de prueba
                    </button>
                  ) : (
                    <button className="tune-btn danger" onClick={stopTestSession}>
                      ■ Terminar sesión
                    </button>
                  )}
                </div>
                {sessionId && (
                  <div className={`tune-status ${live.status === 'error' ? 'error' : 'live'}`}>
                    session_id={sessionId} · status={live.status}
                    {live.transcript.length > 0 && (() => {
                      const lastAi = [...live.transcript].reverse().find((l) => l.who === 'ai')
                      return lastAi ? (
                        <div style={{ marginTop: 8, color: '#E8ECEA' }}>
                          <b>Tutor:</b> {lastAi.text}
                        </div>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

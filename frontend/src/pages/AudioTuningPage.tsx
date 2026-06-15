/**
 * /tune - Panel compacto de tuning del audio Live.
 *
 * Layout 3-columnas SIN scroll del body. Cada columna scrollea internamente.
 * Permite cambiar settings en vivo, probarlos con tono/voz/sesion real,
 * y ver los presets con sus valores.
 */
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Volume2, Mic, Music, Settings as SettingsIcon, Play, Square, RotateCcw, Copy, Check } from 'lucide-react'

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

const CSS = `
.tune-root {
  height: 100vh; width: 100vw; overflow: hidden;
  background: #0F1714; color: #E8ECEA;
  font-family: Inter, system-ui, sans-serif;
  display: flex; flex-direction: column;
}
.tune-header {
  flex-shrink: 0;
  /* safe-area-inset-top respeta el notch / Dynamic Island del iPhone para
     que el header no quede tapado. Fallback a 10px en browsers que no
     soportan env() (todos los modernos sí lo soportan). */
  padding: max(10px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 10px max(16px, env(safe-area-inset-left));
  border-bottom: 1px solid rgba(255,255,255,.08);
  display: flex; align-items: center; gap: 16px;
}
.tune-h1 { font-size: 15px; font-weight: 800; margin: 0; letter-spacing: -.01em; }
.tune-header-sub { font-size: 11px; color: rgba(232,236,234,.5); }
.tune-header-actions { margin-left: auto; display: flex; gap: 6px; }

.tune-body {
  flex: 1; display: grid; grid-template-columns: 240px 1fr 280px;
  min-height: 0; overflow: hidden;
}
@media (max-width: 980px) {
  .tune-body { grid-template-columns: 200px 1fr; }
  .col-right { display: none; }
}
@media (max-width: 720px) {
  .tune-body { grid-template-columns: 1fr; }
  .col-left { display: none; }
}

.col {
  overflow-y: auto; padding: 10px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.15) transparent;
}
.col::-webkit-scrollbar { width: 6px; }
.col::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 3px; }
.col-left { border-right: 1px solid rgba(255,255,255,.06); }
.col-right { border-left: 1px solid rgba(255,255,255,.06); }

.section-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em;
  color: rgba(0,179,126,.85); margin: 0 0 6px; padding: 0 2px;
}
.section-title + .section-title { margin-top: 14px; }

.preset-btn {
  width: 100%; text-align: left; padding: 6px 8px;
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06);
  border-radius: 6px; color: #E8ECEA; cursor: pointer; margin-bottom: 4px;
  transition: all .12s;
  display: block;
}
.preset-btn:hover { background: rgba(0,179,126,.10); border-color: rgba(0,179,126,.3); }
.preset-btn.active { background: rgba(0,179,126,.18); border-color: #00B37E; }
.preset-name { font-weight: 700; font-size: 11px; line-height: 1.2; }
.preset-desc { font-size: 9.5px; color: rgba(232,236,234,.45); margin-top: 2px; line-height: 1.25; }
.preset-overrides { font-size: 9px; color: #00B37E; margin-top: 3px;
  font-family: 'JetBrains Mono', monospace; line-height: 1.3; }

.settings-card {
  background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.06);
  border-radius: 8px; padding: 8px 10px; margin-bottom: 8px;
}
.settings-card-h {
  display: flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: #00B37E; margin-bottom: 6px;
}
.setting-row {
  display: grid; grid-template-columns: 1fr auto;
  align-items: center; gap: 10px;
  padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,.04);
}
.setting-row:last-child { border-bottom: none; }
.setting-name { font-size: 11.5px; font-weight: 500; }
.setting-hint { font-size: 9.5px; color: rgba(232,236,234,.4); margin-top: 1px; }
.setting-changed { color: #FFB800 !important; }
.setting-input {
  padding: 3px 6px; background: rgba(0,0,0,.35);
  border: 1px solid rgba(255,255,255,.1); border-radius: 5px;
  color: #E8ECEA; font-family: 'JetBrains Mono', monospace;
  font-size: 11px; min-width: 78px; text-align: center;
}
.setting-input:focus { border-color: #00B37E; outline: none; }
select.setting-input { padding-right: 18px; cursor: pointer; }

.toggle {
  position: relative; width: 30px; height: 16px;
  background: rgba(255,255,255,.15); border-radius: 999px;
  cursor: pointer; transition: background .12s; flex-shrink: 0;
}
.toggle.on { background: #00B37E; }
.toggle::after {
  content: ''; position: absolute; top: 2px; left: 2px;
  width: 12px; height: 12px; background: #fff; border-radius: 50%;
  transition: transform .12s;
}
.toggle.on::after { transform: translateX(14px); }

.tune-btn {
  padding: 7px 12px; border-radius: 7px; border: 0; cursor: pointer;
  font-weight: 700; font-size: 11.5px; font-family: inherit;
  display: inline-flex; align-items: center; gap: 5px;
  transition: all .12s;
}
.tune-btn.primary { background: #00B37E; color: #0F1714; }
.tune-btn.primary:hover { background: #00C98A; }
.tune-btn.secondary { background: rgba(255,255,255,.08); color: #E8ECEA; }
.tune-btn.secondary:hover { background: rgba(255,255,255,.14); }
.tune-btn.danger { background: rgba(239,68,68,.18); color: #FF8080; border: 1px solid rgba(239,68,68,.3); }
.tune-btn:disabled { opacity: .5; cursor: not-allowed; }

.test-card {
  background: rgba(255,255,255,.025); border: 1px solid rgba(255,255,255,.06);
  border-radius: 8px; padding: 10px; margin-bottom: 8px;
}
.test-card h4 {
  font-size: 10.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: #00B37E; margin: 0 0 6px;
}
.test-card p { font-size: 10.5px; color: rgba(232,236,234,.55); margin: 0 0 8px; line-height: 1.35; }

.live-status {
  margin-top: 8px; padding: 6px 8px;
  background: rgba(0,0,0,.3); border-radius: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
}
.live-status.error { color: #FF8080; }
.live-status.live { color: #00B37E; }
.live-status .transcript-line { color: #E8ECEA; margin-top: 4px; font-family: Inter, sans-serif; font-size: 11px; line-height: 1.4; }
`

interface Row {
  key: keyof AudioSettings
  name: string
  hint?: string
  kind: 'number' | 'select' | 'toggle' | 'float'
  options?: (number | string)[]
  min?: number
  max?: number
  step?: number
}

const GROUPS: { title: string; icon: 'mic' | 'volume' | 'music' | 'settings'; rows: Row[] }[] = [
  {
    title: 'Captura (mic)',
    icon: 'mic',
    rows: [
      { key: 'captureSampleRate', name: 'Sample rate', hint: 'Hz', kind: 'select', options: [8000, 16000, 24000, 48000] },
      { key: 'workletBufferSamples', name: 'Buffer', hint: 'samples por chunk', kind: 'select', options: [256, 512, 1024, 2048, 4096, 8192] },
      { key: 'useAudioWorklet', name: 'AudioWorklet', hint: 'OFF = ScriptProcessor', kind: 'toggle' },
      { key: 'echoCancellation', name: 'Echo cancel', hint: 'AEC', kind: 'toggle' },
      { key: 'noiseSuppression', name: 'Noise suppress', hint: 'NS', kind: 'toggle' },
      { key: 'autoGainControl', name: 'Auto gain', hint: 'AGC', kind: 'toggle' },
    ],
  },
  {
    title: 'VAD',
    icon: 'mic',
    rows: [
      { key: 'vadEnabled', name: 'VAD activo', hint: 'no enviar silencios', kind: 'toggle' },
      { key: 'vadThreshold', name: 'Threshold', hint: 'RMS de silencio', kind: 'float', min: 0.0005, max: 0.05, step: 0.0005 },
      { key: 'vadTailFrames', name: 'Tail frames', hint: 'extra tras voz', kind: 'number', min: 0, max: 10, step: 1 },
    ],
  },
  {
    title: 'Playback',
    icon: 'volume',
    rows: [
      { key: 'playbackSampleRate', name: 'Sample rate', hint: 'Hz', kind: 'select', options: [16000, 24000, 48000] },
      { key: 'playbackCushionSeconds', name: 'Cushion (s)', hint: 'safety scheduling', kind: 'float', min: 0.005, max: 0.2, step: 0.005 },
      { key: 'catchUpEnabled', name: 'Catch-up', hint: 'cancela buffers si delay alto', kind: 'toggle' },
      { key: 'catchUpThresholdSeconds', name: 'Catch threshold (s)', kind: 'float', min: 0.5, max: 10, step: 0.5 },
      { key: 'coachVolume', name: 'Vol. coach', hint: '1.0 = original', kind: 'float', min: 0.1, max: 3.0, step: 0.1 },
      { key: 'participantVolume', name: 'Vol. participantes', hint: 'voice room', kind: 'float', min: 0.1, max: 3.0, step: 0.1 },
    ],
  },
  {
    title: 'Voz (Gemini)',
    icon: 'volume',
    rows: [
      { key: 'geminiVoice', name: 'Voz del coach', hint: 'override global; vacio = la del personaje', kind: 'select', options: ['', 'Aoede', 'Puck', 'Kore', 'Charon', 'Fenrir', 'Leda', 'Orus', 'Zephyr'] },
    ],
  },
  {
    title: 'UI / Otros',
    icon: 'settings',
    rows: [
      { key: 'orbUpdateFps', name: 'Orbe FPS', kind: 'select', options: [5, 10, 15, 20, 30, 60] },
      { key: 'skipRedundantStatus', name: 'Skip status redundante', kind: 'toggle' },
      { key: 'wsPingIntervalMs', name: 'WS ping (ms)', kind: 'select', options: [10000, 25000, 60000] },
    ],
  },
]

function diffFromDefault(s: AudioSettings): string {
  const overrides: string[] = []
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AudioSettings)[]) {
    if (s[key] !== DEFAULT_SETTINGS[key]) {
      const v = typeof s[key] === 'boolean' ? (s[key] ? 'on' : 'off') : s[key]
      overrides.push(`${key}=${v}`)
    }
  }
  return overrides.join(' · ')
}

function presetOverrides(p: AudioPreset): string {
  const items: string[] = []
  for (const [k, v] of Object.entries(p.settings)) {
    const short = typeof v === 'boolean' ? (v ? 'on' : 'off') : v
    items.push(`${k.replace(/([A-Z])/g, (m) => m.toLowerCase())}=${short}`)
  }
  return items.slice(0, 4).join(' · ') + (items.length > 4 ? ` · +${items.length - 4}` : '')
}

const FIXED_TOPIC = 'Vida cotidiana, alimentación y deporte'
// Idioma fijo para charlas de /tune. El backend acepta override via query
// param ?lang= para no tocar el target_language del user.
const TUNE_LANG = 'es'

export function AudioTuningPage() {
  const [settings, setSettings] = useState<AudioSettings>(() => loadAudioSettings())
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    const cur = loadAudioSettings()
    const match = PRESETS.find((p) => {
      const merged = { ...DEFAULT_SETTINGS, ...p.settings }
      return JSON.stringify(merged) === JSON.stringify(cur)
    })
    return match?.id ?? ''
  })
  // Sesion activa: si es null no hay charla. Si tiene valor, es una room
  // compartida con su token + host_pid para reconectar al mismo room al
  // cambiar settings (asi el guest no pierde su conexion).
  const [activeRoom, setActiveRoom] = useState<{ token: string; hostPid: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const testAudioRef = useRef<{ ctx: AudioContext | null; osc: OscillatorNode | null }>({ ctx: null, osc: null })

  const live = useLiveVoice({
    onError: (e) => toast.error(e.message),
    onAudioGlitch: (info) => console.warn('[tune]', info),
  })

  useEffect(() => { saveAudioSettings(settings) }, [settings])

  const updateTimerRef = useRef<number | null>(null)
  const update = (key: keyof AudioSettings, value: number | boolean | string): void => {
    setSettings((s) => ({ ...s, [key]: value }))
    setActivePresetId('')
    // Debounce: si hay charla activa, reconectar al mismo room tras 600ms
    if (activeRoom) {
      if (updateTimerRef.current) window.clearTimeout(updateTimerRef.current)
      updateTimerRef.current = window.setTimeout(() => {
        void reconnectToRoom()
      }, 600)
    }
  }

  const choosePreset = async (preset: AudioPreset): Promise<void> => {
    const merged = applyPreset(preset)
    setSettings(merged)
    setActivePresetId(preset.id)
    toast.success(`Preset: ${preset.name}`)
    // Si hay sesion activa, reconectar al MISMO room con los nuevos settings
    if (activeRoom) {
      await reconnectToRoom()
    }
  }

  const reset = async (): Promise<void> => {
    setSettings(resetAudioSettings())
    setActivePresetId('default')
    toast('Default aplicado')
    if (activeRoom) await reconnectToRoom()
  }

  /** Reconecta al mismo room sin destruirlo. El guest mantiene su conexion. */
  const reconnectToRoom = async (): Promise<void> => {
    if (!activeRoom) return
    try { live.stop() } catch {}
    // Pequeño delay para que el WS cierre limpio
    await new Promise((r) => setTimeout(r, 250))
    try {
      await live.startInRoom(activeRoom.token, activeRoom.hostPid, TUNE_LANG)
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
  }

  /** Crea una room NUEVA y conecta como host. */
  const startRoom = async (): Promise<void> => {
    try {
      const tok = localStorage.getItem('token')
      if (!tok) {
        toast.error('Necesitás estar logueado')
        return
      }
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ free_topic: FIXED_TOPIC }),
      })
      if (!res.ok) throw new Error('No pude crear la sala')
      const data = await res.json() as { token: string; host_pid: string }
      setActiveRoom({ token: data.token, hostPid: data.host_pid })
      await live.startInRoom(data.token, data.host_pid, TUNE_LANG)
      toast.success('Sala lista — copiá el link y mandalo a tu amigo')
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
  }

  const stopRoom = async (): Promise<void> => {
    try { live.stop() } catch {}
    setActiveRoom(null)
  }

  const copyRoomLink = async (): Promise<void> => {
    if (!activeRoom) return
    const link = `${window.location.origin}/charla/${activeRoom.token}`
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      ta.remove()
    }
    setLinkCopied(true)
    toast.success('Link copiado')
    setTimeout(() => setLinkCopied(false), 2500)
  }

  const playTestTone = async (): Promise<void> => {
    try {
      if (testAudioRef.current.osc) {
        try { testAudioRef.current.osc.stop() } catch {}
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
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const playTestVoice = (): void => {
    if (!('speechSynthesis' in window)) {
      toast.error('Web Speech no soportado')
      return
    }
    const u = new SpeechSynthesisUtterance(
      'Hello! This is a test. Can you hear me clearly?'
    )
    u.lang = 'en-US'
    u.rate = 1.0
    u.volume = Math.min(1, settings.coachVolume)
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }

  const renderRow = (row: Row) => {
    const val = settings[row.key]
    const isChanged = settings[row.key] !== DEFAULT_SETTINGS[row.key]
    let control: JSX.Element

    if (row.kind === 'toggle') {
      control = (
        <div className={`toggle ${val ? 'on' : ''}`} onClick={() => update(row.key, !val)} />
      )
    } else if (row.kind === 'select') {
      const isStrOpts = typeof row.options![0] === 'string'
      control = (
        <select className="setting-input" value={String(val)} onChange={(e) => update(row.key, isStrOpts ? e.target.value : Number(e.target.value))}>
          {row.options!.map((o) => <option key={String(o)} value={o}>{o === '' ? 'Auto (personaje)' : o}</option>)}
        </select>
      )
    } else {
      control = (
        <input
          type="number" className="setting-input" value={String(val)}
          min={row.min} max={row.max} step={row.step}
          onChange={(e) => update(row.key, Number(e.target.value))}
        />
      )
    }

    return (
      <div className="setting-row" key={row.key}>
        <div>
          <div className={`setting-name${isChanged ? ' setting-changed' : ''}`}>{row.name}</div>
          {row.hint && <div className="setting-hint">{row.hint}</div>}
        </div>
        {control}
      </div>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="tune-root">
        <div className="tune-header">
          <h1 className="tune-h1">Audio Tuning</h1>
          <span className="tune-header-sub">{diffFromDefault(settings) || 'default · sin cambios'}</span>
          <div className="tune-header-actions">
            <button className="tune-btn secondary" onClick={reset}>
              <RotateCcw size={12} /> Reset default
            </button>
            {!activeRoom ? (
              <button className="tune-btn primary" onClick={startRoom}>
                <Play size={12} /> Iniciar charla compartida
              </button>
            ) : (
              <>
                <button
                  className={`tune-btn ${linkCopied ? 'primary' : 'secondary'}`}
                  onClick={copyRoomLink}
                >
                  {linkCopied ? <Check size={12} /> : <Copy size={12} />}
                  {linkCopied ? 'Copiado' : 'Copiar link'}
                </button>
                <button className="tune-btn danger" onClick={stopRoom}>
                  <Square size={12} /> Terminar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="tune-body">
          {/* COL LEFT — PRESETS */}
          <div className="col col-left">
            <div className="section-title">Presets ({PRESETS.length})</div>
            {PRESETS.map((p) => (
              <div
                key={p.id}
                className={`preset-btn${activePresetId === p.id ? ' active' : ''}`}
                onClick={() => choosePreset(p)}
              >
                <div className="preset-name">{p.name}</div>
                <div className="preset-desc">{p.description}</div>
                {Object.keys(p.settings).length > 0 && (
                  <div className="preset-overrides">{presetOverrides(p)}</div>
                )}
              </div>
            ))}
          </div>

          {/* COL CENTER — SETTINGS */}
          <div className="col">
            {GROUPS.map((g) => (
              <div className="settings-card" key={g.title}>
                <div className="settings-card-h">
                  {g.icon === 'mic' && <Mic size={11} />}
                  {g.icon === 'volume' && <Volume2 size={11} />}
                  {g.icon === 'music' && <Music size={11} />}
                  {g.icon === 'settings' && <SettingsIcon size={11} />}
                  {g.title}
                </div>
                {g.rows.map(renderRow)}
              </div>
            ))}
          </div>

          {/* COL RIGHT — CHARLA COMPARTIDA */}
          <div className="col col-right">
            <div className="section-title">Charla compartida</div>
            <div className="test-card">
              {!activeRoom ? (
                <>
                  <p>
                    <b>Tópico fijo:</b> {FIXED_TOPIC}
                  </p>
                  <p style={{ marginTop: 6 }}>
                    Tocá <b>Iniciar charla compartida</b>. Te genera un link
                    para mandar a un amigo. Cuando entren, son <b>3 voces</b>
                    (vos + amigo + coach IA).
                  </p>
                  <p style={{ marginTop: 6 }}>
                    Cambiás cualquier setting o preset durante la charla y
                    <b> tu sesión se reconecta</b> automáticamente. Tu amigo
                    sigue en la misma sala, no tiene que volver a entrar.
                  </p>
                </>
              ) : (
                <>
                  <div style={{
                    padding: '8px 10px', background: 'rgba(0,179,126,.08)',
                    border: '1px solid rgba(0,179,126,.25)', borderRadius: 8,
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
                    wordBreak: 'break-all', marginBottom: 8,
                  }}>
                    {window.location.origin}/charla/{activeRoom.token}
                  </div>
                  <div className={`live-status ${live.status === 'error' ? 'error' : 'live'}`}>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>
                      {live.status} · {live.participants.length} participante{live.participants.length === 1 ? '' : 's'}
                    </div>
                    {live.participants.length > 0 && (
                      <div style={{ marginTop: 4, fontSize: 10.5, color: 'rgba(232,236,234,.7)' }}>
                        {live.participants.map((p) => `${p.isHost ? '👤' : '👋'} ${p.name}`).join(' · ')}
                      </div>
                    )}
                    {(() => {
                      const lastAi = [...live.transcript].reverse().find((l) => l.who === 'ai')
                      return lastAi ? (
                        <div className="transcript-line">
                          <b>Coach:</b> {lastAi.text}
                        </div>
                      ) : (
                        <div className="transcript-line" style={{ opacity: 0.5 }}>
                          Esperando al coach...
                        </div>
                      )
                    })()}
                  </div>
                </>
              )}
            </div>

            <div className="section-title">Probar playback (sin sesión)</div>
            <div className="test-card">
              <p>Solo testea el AudioContext de salida con tus settings.</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="tune-btn secondary" onClick={playTestTone}>
                  <Music size={11} /> Tono 3s
                </button>
                <button className="tune-btn secondary" onClick={playTestVoice}>
                  <Volume2 size={11} /> Voz local
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

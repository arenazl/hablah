import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { API_BASE_URL } from '../services/api'

interface ConfigRow {
  key: string
  value: string
  kind: 'bool' | 'int' | 'text'
  section: string
  label: string
}

const tok = () => localStorage.getItem('token')

const PRESETS = [
  {
    name: "Default (Paciente / Niños)",
    desc: "1.5s de silencio. Ideal para niños pequeños o que hablan lento.",
    values: {
      vad_silence_duration_ms_kid: "1500",
      vad_prefix_padding_ms_kid: "700",
      vad_start_sensitivity_kid: "START_SENSITIVITY_LOW",
      vad_end_sensitivity_kid: "END_SENSITIVITY_HIGH",
      vad_activity_handling: "NO_INTERRUPTION"
    }
  },
  {
    name: "Ultra-Rápido (Sin delay)",
    desc: "0.8s de silencio. Para niños ágiles que responden con una sola palabra rápida.",
    values: {
      vad_silence_duration_ms_kid: "800",
      vad_prefix_padding_ms_kid: "400",
      vad_start_sensitivity_kid: "START_SENSITIVITY_HIGH",
      vad_end_sensitivity_kid: "END_SENSITIVITY_HIGH",
      vad_activity_handling: "NO_INTERRUPTION"
    }
  },
  {
    name: "Inmune a Ruido (Aulas / Fondo)",
    desc: "1.2s de silencio y baja sensibilidad al inicio para filtrar ruido ambiental.",
    values: {
      vad_silence_duration_ms_kid: "1200",
      vad_prefix_padding_ms_kid: "500",
      vad_start_sensitivity_kid: "START_SENSITIVITY_LOW",
      vad_end_sensitivity_kid: "END_SENSITIVITY_LOW",
      vad_activity_handling: "NO_INTERRUPTION"
    }
  },
  {
    name: "Conversacional / Interrumpible",
    desc: "0.6s de silencio y Gemini se interrumpe si el alumno vuelve a hablar.",
    values: {
      vad_silence_duration_ms_kid: "600",
      vad_prefix_padding_ms_kid: "200",
      vad_start_sensitivity_kid: "START_SENSITIVITY_HIGH",
      vad_end_sensitivity_kid: "END_SENSITIVITY_HIGH",
      vad_activity_handling: "START_OF_ACTIVITY_INTERRUPTS"
    }
  }
]

export default function AdminVozPanel() {
  const [rows, setRows] = useState<ConfigRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Local state copy for form editing
  const [silenceDuration, setSilenceDuration] = useState("1500")
  const [prefixPadding, setPrefixPadding] = useState("700")
  const [startSensitivity, setStartSensitivity] = useState("START_SENSITIVITY_LOW")
  const [endSensitivity, setEndSensitivity] = useState("END_SENSITIVITY_HIGH")
  const [activityHandling, setActivityHandling] = useState("NO_INTERRUPTION")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/config`, { headers: { Authorization: `Bearer ${tok()}` } })
      if (!res.ok) throw new Error()
      const data: ConfigRow[] = await res.json()
      setRows(data)

      // Initialize state values from db
      const sd = data.find(r => r.key === 'vad_silence_duration_ms_kid')?.value || "1500"
      const pp = data.find(r => r.key === 'vad_prefix_padding_ms_kid')?.value || "700"
      const ss = data.find(r => r.key === 'vad_start_sensitivity_kid')?.value || "START_SENSITIVITY_LOW"
      const es = data.find(r => r.key === 'vad_end_sensitivity_kid')?.value || "END_SENSITIVITY_HIGH"
      const ah = data.find(r => r.key === 'vad_activity_handling')?.value || "NO_INTERRUPTION"

      setSilenceDuration(sd)
      setPrefixPadding(pp)
      setStartSensitivity(ss)
      setEndSensitivity(es)
      setActivityHandling(ah)
    } catch {
      toast.error('Error cargando la configuración de voz')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const applyPreset = (presetValues: typeof PRESETS[0]["values"]) => {
    setSilenceDuration(presetValues.vad_silence_duration_ms_kid)
    setPrefixPadding(presetValues.vad_prefix_padding_ms_kid)
    setStartSensitivity(presetValues.vad_start_sensitivity_kid)
    setEndSensitivity(presetValues.vad_end_sensitivity_kid)
    setActivityHandling(presetValues.vad_activity_handling)
    toast.success('Preset aplicado (recordá guardar cambios)')
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const updates = [
        { key: 'vad_silence_duration_ms_kid', value: silenceDuration },
        { key: 'vad_prefix_padding_ms_kid', value: prefixPadding },
        { key: 'vad_start_sensitivity_kid', value: startSensitivity },
        { key: 'vad_end_sensitivity_kid', value: endSensitivity },
        { key: 'vad_activity_handling', value: activityHandling }
      ]

      for (const item of updates) {
        const res = await fetch(`${API_BASE_URL}/config/${item.key}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
          body: JSON.stringify({ value: item.value }),
        })
        if (!res.ok) throw new Error(`Error en ${item.key}`)
      }
      toast.success('Configuración de voz grabada correctamente')
      load()
    } catch (err) {
      toast.error('No se pudieron guardar todos los parámetros')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 32, color: 'var(--fg-3)' }}>
        <p>Cargando configuración de voz...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px 80px', maxWidth: 880, margin: '0 auto', color: 'var(--fg-1)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Calibración de Voz y VAD</h1>
      <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '.04em', padding: '3px 9px', borderRadius: 999, background: 'rgba(120,120,120,.16)', color: 'var(--fg-3)', marginBottom: 20 }}>
        ESTÁTICO (E) · runtime · aplica a TODAS las clases
      </div>
      <p style={{ color: 'var(--fg-3)', fontSize: 13.5, marginBottom: 24, maxWidth: 660, lineHeight: 1.5 }}>
        Ajustá el comportamiento de detección de silencio (VAD) de Gemini Live para niños. Podés elegir un preset preconfigurado o tunear los parámetros con los botones.
      </p>

      {/* PRESETS SECTION */}
      <h2 style={{ fontSize: 12.5, fontWeight: 800, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--fg-2)' }}>Presets del Motor</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
        {PRESETS.map((p) => {
          const isSelected =
            silenceDuration === p.values.vad_silence_duration_ms_kid &&
            prefixPadding === p.values.vad_prefix_padding_ms_kid &&
            startSensitivity === p.values.vad_start_sensitivity_kid &&
            endSensitivity === p.values.vad_end_sensitivity_kid &&
            activityHandling === p.values.vad_activity_handling

          return (
            <div
              key={p.name}
              onClick={() => applyPreset(p.values)}
              style={{
                padding: '14px 16px',
                background: isSelected ? 'rgba(0,179,126,.08)' : 'var(--surface)',
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-1)',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--fg-1)', marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.4 }}>{p.desc}</div>
            </div>
          )
        })}
      </div>

      {/* TUNING PANEL */}
      <h2 style={{ fontSize: 12.5, fontWeight: 800, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--fg-2)' }}>Ajustes de Voz</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
        
        {/* silence duration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Duración del Silencio (Turn-taking)</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{silenceDuration} ms</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6 }}>Cuánto tiempo de silencio espera Gemini Live para asumir que el niño terminó de hablar.</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {["600", "800", "1000", "1200", "1500", "1800"].map((v) => (
              <button
                key={v}
                onClick={() => setSilenceDuration(v)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-2)',
                  background: silenceDuration === v ? 'var(--primary)' : 'var(--bg-2)',
                  color: silenceDuration === v ? '#fff' : 'var(--fg-1)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {v} ms
              </button>
            ))}
          </div>
        </div>

        {/* prefix padding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Padding de audio previo</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{prefixPadding} ms</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6 }}>Buffer hacia el pasado que se envía a Gemini para que no se pierda la consonante inicial.</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {["200", "400", "500", "700", "900"].map((v) => (
              <button
                key={v}
                onClick={() => setPrefixPadding(v)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-2)',
                  background: prefixPadding === v ? 'var(--primary)' : 'var(--bg-2)',
                  color: prefixPadding === v ? '#fff' : 'var(--fg-1)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {v} ms
              </button>
            ))}
          </div>
        </div>

        {/* start sensitivity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Sensibilidad al inicio de la voz</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{startSensitivity.replace("START_SENSITIVITY_", "")}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6 }}>Umbral para activar el micrófono. LOW es menos sensible a ruidos incidentales.</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {["START_SENSITIVITY_LOW", "START_SENSITIVITY_NORMAL", "START_SENSITIVITY_HIGH"].map((v) => (
              <button
                key={v}
                onClick={() => setStartSensitivity(v)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-2)',
                  background: startSensitivity === v ? 'var(--primary)' : 'var(--bg-2)',
                  color: startSensitivity === v ? '#fff' : 'var(--fg-1)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {v.replace("START_SENSITIVITY_", "")}
              </button>
            ))}
          </div>
        </div>

        {/* end sensitivity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Sensibilidad al final de la voz</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{endSensitivity.replace("END_SENSITIVITY_", "")}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6 }}>Umbral para decretar silencio. HIGH corta rápido cuando cesa el volumen alto.</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {["END_SENSITIVITY_LOW", "END_SENSITIVITY_NORMAL", "END_SENSITIVITY_HIGH"].map((v) => (
              <button
                key={v}
                onClick={() => setEndSensitivity(v)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-2)',
                  background: endSensitivity === v ? 'var(--primary)' : 'var(--bg-2)',
                  color: endSensitivity === v ? '#fff' : 'var(--fg-1)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {v.replace("END_SENSITIVITY_", "")}
              </button>
            ))}
          </div>
        </div>

        {/* interruption toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Interrumpible por voz del alumno</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Permite interrumpir a Gemini si el niño vuelve a hablar a mitad de la respuesta.</div>
          </div>
          <button
            onClick={() => setActivityHandling(prev => prev === 'NO_INTERRUPTION' ? 'START_OF_ACTIVITY_INTERRUPTS' : 'NO_INTERRUPTION')}
            style={{
              width: 50,
              height: 26,
              borderRadius: 999,
              border: 0,
              cursor: 'pointer',
              position: 'relative',
              background: activityHandling === 'START_OF_ACTIVITY_INTERRUPTS' ? 'var(--primary)' : 'rgba(120,120,120,.35)',
              transition: 'background .15s ease'
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: activityHandling === 'START_OF_ACTIVITY_INTERRUPTS' ? 27 : 3,
                width: 20,
                height: 20,
                borderRadius: 999,
                background: '#fff',
                transition: 'left .15s ease'
              }}
            />
          </button>
        </div>

      </div>

      {/* SAVE BUTTON */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={saveAll}
          disabled={saving}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 0,
            background: 'var(--primary)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
            transition: 'background 0.15s ease',
          }}
        >
          {saving ? 'Grabando...' : 'Grabar configuración'}
        </button>
      </div>

    </div>
  )
}

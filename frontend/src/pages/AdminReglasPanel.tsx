/**
 * /admin/reglas — Reglas de salida y seguridad (doc 11 §1.5).
 *
 * La capa de runtime como DATO (tabla app_config): regla de voz, tolerancia de
 * ASR, guardas de seguridad y los umbrales del validador determinista.
 * Toggles + umbrales, editable sin tocar código.
 */
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { API_BASE_URL } from '../services/api'

interface ConfigRow { key: string; value: string; kind: 'bool' | 'int' | 'text'; section: string; label: string }

const tok = () => localStorage.getItem('token')

export default function AdminReglasPanel() {
  const [rows, setRows] = useState<ConfigRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/config`, { headers: { Authorization: `Bearer ${tok()}` } })
      if (!res.ok) throw new Error()
      setRows(await res.json())
    } catch { toast.error('Error cargando la configuración') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (key: string, value: string) => {
    setSaving(key)
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, value } : r)))
    try {
      const res = await fetch(`${API_BASE_URL}/config/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ value }),
      })
      if (!res.ok) throw new Error()
      toast.success('Guardado')
    } catch { toast.error('No se pudo guardar'); load() }
    finally { setSaving(null) }
  }

  const sections = [...new Set(rows.map((r) => r.section))]

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px 80px', maxWidth: 880, margin: '0 auto', color: 'var(--fg-1)' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>Reglas de salida y seguridad</h1>
      <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '.04em', padding: '3px 9px', borderRadius: 999, background: 'rgba(120,120,120,.16)', color: 'var(--fg-3)', marginBottom: 12 }}>
        ESTÁTICO (E) · runtime · aplica a TODAS las clases
      </div>
      <p style={{ color: 'var(--fg-3)', fontSize: 13, marginBottom: 22, maxWidth: 620 }}>
        La capa de runtime, configurable sin tocar código: regla de voz, tolerancia del reconocimiento de voz,
        guardas de seguridad y los umbrales del validador determinista.
      </p>

      {loading ? (
        <p style={{ color: 'var(--fg-3)' }}>Cargando…</p>
      ) : sections.map((section) => (
        <div key={section} style={{ marginBottom: 26 }}>
          <h2 style={{ fontSize: 12.5, fontWeight: 800, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--fg-2)' }}>{section}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.filter((r) => r.section === section).map((r) => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border-1)', borderRadius: 10 }}>
                <div style={{ fontSize: 13.5, color: 'var(--fg-1)' }}>{r.label}</div>
                {r.kind === 'bool' ? (
                  <button
                    onClick={() => save(r.key, r.value === 'true' ? 'false' : 'true')}
                    disabled={saving === r.key}
                    style={{ width: 46, height: 26, borderRadius: 999, border: 0, cursor: 'pointer', position: 'relative', background: r.value === 'true' ? 'var(--primary)' : 'rgba(120,120,120,.35)', transition: 'background .15s', flexShrink: 0 }}
                    aria-label={r.label}
                  >
                    <span style={{ position: 'absolute', top: 3, left: r.value === 'true' ? 23 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', transition: 'left .15s' }} />
                  </button>
                ) : (
                  <input
                    type={r.kind === 'int' ? 'number' : 'text'}
                    defaultValue={r.value}
                    onBlur={(e) => { if (e.target.value !== r.value) save(r.key, e.target.value) }}
                    style={{ width: r.kind === 'int' ? 80 : 220, height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'var(--bg-2)', color: 'var(--fg-1)', fontSize: 14, flexShrink: 0 }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

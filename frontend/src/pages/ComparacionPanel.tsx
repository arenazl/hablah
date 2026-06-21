/* /comparacion — orquestación ANTES vs DESPUÉS del especialista, por las 15 combos.
 * Solo muestra las etapas que cambiaron. Página React (se ve en escritorio remoto).
 */
import { useEffect, useState } from 'react'
import { motorAPI, CompareCombo } from '../services/api'

const C = { bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1a1f2a', fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686', green: '#22c55e' }

export default function ComparacionPanel() {
  const [combos, setCombos] = useState<CompareCombo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    motorAPI.comparison().then((r) => setCombos(r.combos || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '22px 18px 64px', fontFamily: 'system-ui, Segoe UI, sans-serif', lineHeight: 1.4 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Orquestación: antes vs después del especialista</h1>
        <p style={{ color: C.dim, fontSize: 13, margin: '0 0 18px' }}>
          15 combos. <span style={{ color: C.faint }}>Izquierda = ANTES (snapshot 1)</span> · <span style={{ color: C.green }}>Derecha = DESPUÉS (aplicado)</span>. Solo las etapas que cambiaron. Smoke verde en ambos. Rollback: <code style={{ color: C.faint }}>snapshot_catalog.py restore 1</code>.
        </p>
        {loading && <div style={{ color: C.faint }}>Cargando…</div>}
        {combos.map((c, i) => (
          <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>{c.band} · {c.level} <span style={{ color: C.faint, fontSize: 12 }}>({c.etapas.length} etapas cambiaron)</span></h2>
            {c.etapas.length === 0 && <div style={{ color: C.faint, fontSize: 12, fontStyle: 'italic' }}>sin cambios</div>}
            {c.etapas.map((e, j) => (
              <div key={j} style={{ marginTop: 9, borderTop: `1px solid ${C.soft}`, paddingTop: 9 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{e.title}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ fontSize: 11.5, whiteSpace: 'pre-wrap', background: C.bg, border: `1px solid ${C.border}`, color: C.faint, borderRadius: 8, padding: 8, maxHeight: 200, overflow: 'auto' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 }}>antes</div>{e.antes || '(vacío)'}
                  </div>
                  <div style={{ fontSize: 11.5, whiteSpace: 'pre-wrap', background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.3)', color: '#cbd5e1', borderRadius: 8, padding: 8, maxHeight: 200, overflow: 'auto' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 3, color: C.green }}>después</div>{e.despues || '(vacío)'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

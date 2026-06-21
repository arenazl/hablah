/* /transcripciones — clases REALES de 3 perfiles: ANTES (snapshot 1) vs DESPUÉS (especialista).
 * El coach lo manejó el motor, el alumno la IA. Cero invento. Página React.
 */
import { useEffect, useState } from 'react'
import { motorAPI, ClassTranscript } from '../services/api'

const C = { bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1a1f2a', fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686', green: '#22c55e', accent: '#38bdf8' }

function Chat({ t }: { t?: ClassTranscript }) {
  if (!t) return <div style={{ color: C.faint, fontSize: 12 }}>(sin datos)</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {t.history.map((h, i) => {
        const coach = h.who === 'Profe'
        return (
          <div key={i} style={{ alignSelf: coach ? 'flex-start' : 'flex-end', maxWidth: '88%',
            background: coach ? C.soft : 'rgba(56,189,248,0.10)', border: `1px solid ${coach ? C.border : 'rgba(56,189,248,0.3)'}`,
            borderRadius: 10, padding: '7px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: coach ? C.faint : C.accent, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{coach ? 'Profe (motor)' : 'Alumno (IA)'}</div>
            <div style={{ fontSize: 12.5, color: C.fg, lineHeight: 1.4 }}>{h.text}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function TranscripcionesPanel() {
  const [data, setData] = useState<{ antes: ClassTranscript[]; despues: ClassTranscript[] }>({ antes: [], despues: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    motorAPI.transcripts().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const profiles = data.despues.length ? data.despues : data.antes
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '22px 18px 64px', fontFamily: 'system-ui, Segoe UI, sans-serif', lineHeight: 1.4 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Clases reales — antes vs después del especialista</h1>
        <p style={{ color: C.dim, fontSize: 13, margin: '0 0 18px' }}>
          3 perfiles, ~5 min cada uno. El <b>coach lo manejó el motor</b> (su prompt de 9 etapas); el <b>alumno la IA</b>. Cero invento.
          <span style={{ color: C.faint }}> Izquierda = ANTES (snapshot 1)</span> · <span style={{ color: C.green }}>Derecha = DESPUÉS (aplicado)</span>.
        </p>
        {loading && <div style={{ color: C.faint }}>Cargando… (si recién corrió, puede tardar)</div>}
        {profiles.map((p, i) => (
          <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, margin: '0 0 12px' }}>{p.band} · {p.level} <span style={{ color: C.accent, fontSize: 13 }}>· {p.theme}</span></h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Antes</div>
                <Chat t={data.antes[i]} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.green, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Después</div>
                <Chat t={data.despues[i]} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* /transcripciones-vocab — análisis: la MISMA clase de kids SIN vocab vs CON vocab
 * (mismo motor nuevo). Para ver si obligar al coach a seguir la lista de palabras del
 * tópico mejora la clase o la pone rígida. Lado a lado por perfil.
 */
import { useEffect, useState } from 'react'
import { motorAPI, type VocabTranscriptProfile } from '../services/api'

function Bubbles({ conv }: { conv: { who: string; text: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {conv.map((l, i) => {
        const profe = l.who.toLowerCase().startsWith('profe')
        return (
          <div key={i} style={{ alignSelf: profe ? 'flex-start' : 'flex-end', maxWidth: '88%' }}>
            <div style={{ fontSize: 10, color: '#9aa6e0', margin: profe ? '0 0 2px 4px' : '0 4px 2px 0', textAlign: profe ? 'left' : 'right' }}>
              {profe ? 'Profe (motor)' : 'Alumno (IA)'}
            </div>
            <div style={{ background: profe ? 'rgba(56,189,248,.14)' : 'rgba(34,197,94,.14)', border: `1px solid ${profe ? 'rgba(56,189,248,.3)' : 'rgba(34,197,94,.3)'}`, borderRadius: 12, padding: '8px 12px', fontSize: 13.5, lineHeight: 1.4 }}>
              {l.text}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function TranscripcionesVocabPanel() {
  const [profiles, setProfiles] = useState<VocabTranscriptProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    motorAPI.vocabTranscripts().then((r) => setProfiles(r.profiles || [])).catch(() => setProfiles([])).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e2e', color: '#fff', fontFamily: 'Nunito, system-ui, sans-serif', padding: '24px 20px 60px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 4px' }}>Clases kids — SIN vocab vs CON vocab</h1>
        <p style={{ color: '#9aa6e0', margin: '0 0 20px' }}>
          Misma clase, mismo motor nuevo. Izquierda: como hoy (sin lista). Derecha: el coach OBLIGADO a usar el vocab del tópico. ¿Mejora o se pone rígida?
        </p>
        {loading && <p style={{ color: '#9aa6e0' }}>Cargando… (el análisis puede seguir generándose)</p>}
        {!loading && !profiles.length && <p style={{ color: '#9aa6e0' }}>Todavía no hay análisis. Esperá a que termine la corrida.</p>}

        {profiles.map((p, idx) => (
          <section key={idx} style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{p.band} · {p.level} · {p.title}</h2>
            </div>
            <div style={{ fontSize: 12, color: '#c7d2fe', marginBottom: 12 }}>
              vocab obligatorio ({p.vocab.length}): {p.vocab.join(', ')}
            </div>
            {p.eval && (
              <div style={{ background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.3)', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 18, color: '#c084fc' }}>Especialista: {p.eval.score ?? '-'}/10</span>
                  <span style={{ fontSize: 12, color: '#9aa6e0' }}>integración: <b>{p.eval.integration ?? '-'}</b> · reciclado: <b>{p.eval.recycling ?? '-'}</b> · ¿vocab ayudó?: <b>{p.eval.vocab_helped ? 'sí' : 'no'}</b></span>
                </div>
                {p.eval.verdict && <div style={{ fontSize: 13.5, marginBottom: 8 }}>{p.eval.verdict}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                  {!!p.eval.strengths?.length && (
                    <div><div style={{ fontSize: 11, fontWeight: 800, color: '#22c55e', marginBottom: 3 }}>FORTALEZAS</div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#cbd5e1' }}>{p.eval.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                  )}
                  {!!p.eval.issues?.length && (
                    <div><div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', marginBottom: 3 }}>PROBLEMAS</div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: '#cbd5e1' }}>{p.eval.issues.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800, color: '#94a3b8', marginBottom: 10 }}>SIN vocab (como hoy)</div>
                <Bubbles conv={p.sin} />
              </div>
              <div style={{ background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800, color: '#22c55e', marginBottom: 10 }}>CON vocab (obligado a la lista)</div>
                <Bubbles conv={p.con} />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

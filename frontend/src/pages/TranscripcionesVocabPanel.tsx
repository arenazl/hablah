/* /transcripciones-vocab — el DIAL del vocabulario en kids, PROMEDIADO sobre 3 charlas
 * por condición (el LLM varía; 1 sola es ruido). Por banda: SIN vocab (libre) vs dosis del
 * especialista (early 2-3 / child 3-4). Muestra el promedio + las 3 notas + una charla de muestra.
 */
import { useEffect, useState } from 'react'
import { motorAPI, type VocabTranscriptProfile, type VocabRun } from '../services/api'

function Bubbles({ conv }: { conv: { who: string; text: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {conv.map((l, i) => {
        const profe = l.who.toLowerCase().startsWith('profe')
        return (
          <div key={i} style={{ alignSelf: profe ? 'flex-start' : 'flex-end', maxWidth: '90%' }}>
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

function RunCard({ run }: { run: VocabRun }) {
  const libre = run.key === 'libre'
  const avg = run.avg_score
  const col = (avg ?? 0) >= 8 ? '#22c55e' : (avg ?? 0) >= 6.5 ? '#f59e0b' : '#ef4444'
  const sample = run.charlas?.[0]
  const e = sample?.eval
  return (
    <div style={{ background: libre ? 'rgba(148,163,184,.05)' : 'rgba(34,197,94,.05)', border: `1px solid ${libre ? 'rgba(148,163,184,.2)' : 'rgba(34,197,94,.25)'}`, borderRadius: 14, padding: 14 }}>
      <div style={{ fontWeight: 800, color: libre ? '#94a3b8' : '#22c55e', marginBottom: 8 }}>{run.label}</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontWeight: 900, fontSize: 30, color: col }}>{avg ?? '-'}</span>
        <span style={{ fontSize: 12, color: '#9aa6e0' }}>promedio · 3 charlas: {(run.scores || []).join(', ') || '—'}</span>
      </div>
      {e?.verdict && <div style={{ fontSize: 12.5, marginBottom: 6, lineHeight: 1.35, color: '#c7d2fe' }}>{e.verdict}</div>}
      {!!e?.issues?.length && (
        <ul style={{ margin: '0 0 10px', paddingLeft: 16, fontSize: 11.5, color: '#f3c98b' }}>
          {e.issues.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
      <details>
        <summary style={{ cursor: 'pointer', fontSize: 12, color: '#9aa6e0', marginBottom: 8 }}>ver una charla de muestra</summary>
        {sample && <Bubbles conv={sample.transcript} />}
      </details>
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
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 4px' }}>El dial del vocabulario — kids (promediado)</h1>
        <p style={{ color: '#9aa6e0', margin: '0 0 20px' }}>
          Promedio de 3 charlas por condición (el LLM varía). Por banda: improvisación LIBRE vs dosis del especialista (primera infancia 2-3 / infancia 3-4). ¿La dosis chica mantiene la magia o la degrada?
        </p>
        {loading && <p style={{ color: '#9aa6e0' }}>Cargando…</p>}
        {!loading && !profiles.length && <p style={{ color: '#9aa6e0' }}>Todavía no hay análisis.</p>}

        {profiles.map((p, idx) => (
          <section key={idx} style={{ marginBottom: 30 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 2px' }}>{p.band} · {p.level} · {p.title}</h2>
            <div style={{ fontSize: 12, color: '#c7d2fe', marginBottom: 12 }}>pozo del tópico ({p.vocab.length}): {p.vocab.join(', ')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
              {p.runs.map((run) => <RunCard key={run.key} run={run} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

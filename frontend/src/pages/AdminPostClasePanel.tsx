/* AdminPostClasePanel — revisión y aprobación del post-clase (human-in-the-loop).
 *
 * Lista los insights cualitativos (Mitad B del post-clase) que esperan tu OK. Al
 * APROBAR, se propagan a la memoria del alumno (intereses, rasgos, cola de refuerzo)
 * y la próxima clase los usa. Al descartar, no escriben nada.
 */
import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'

interface Trait { trait: string; confidence: number }
interface Insight {
  id: number; session_id: number; student_id: number; student_name: string
  summary?: string; affective?: string
  new_interests: string[]; items_to_reinforce: string[]; traits: Trait[]; suggested_topic?: string
}

const CARD: React.CSSProperties = { background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 16 }
const CHIP: React.CSSProperties = { display: 'inline-block', fontSize: 12, padding: '3px 9px', borderRadius: 999, background: '#172033', color: '#7dd3fc', margin: '2px 4px 2px 0' }
const BTN: React.CSSProperties = { padding: '8px 16px', borderRadius: 999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const AFF: Record<string, string> = { engaged: '#22c55e', neutral: '#9aa3af', frustrated: '#ef4444' }

export default function AdminPostClasePanel() {
  const [items, setItems] = useState<Insight[]>([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(() => {
    api.get('/memory/insights/pending').then((r) => setItems(r.data)).catch((e) => setErr(String(e?.response?.data?.detail || e)))
  }, [])
  useEffect(() => { load() }, [load])

  const act = async (id: number, action: 'approve' | 'discard') => {
    setBusy(id)
    try { await api.post(`/memory/insights/${id}/${action}`); load() }
    catch (e: unknown) { setErr(String((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'error')) }
    finally { setBusy(null) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '24px 20px 64px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Post-clase — revisión</h1>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 18px' }}>
          Lo que la IA sacó de cada clase (intereses, rasgos, ítems a reforzar). <b>Vos aprobás</b> antes de que entre a la memoria del alumno. El SRS (qué domina/falla) ya se actualiza solo.
        </p>
        {err && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        {items.length === 0 && <div style={{ ...CARD, color: '#9aa3af', fontSize: 14 }}>No hay insights pendientes. Cuando termine una clase, el análisis aparece acá para tu OK.</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map((it) => (
            <div key={it.id} style={CARD}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{it.student_name} <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 400 }}>· sesión #{it.session_id}</span></div>
                {it.affective && <span style={{ fontSize: 12, fontWeight: 600, color: AFF[it.affective] || '#9aa3af' }}>{it.affective}</span>}
              </div>
              {it.summary && <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 10, lineHeight: 1.5 }}>{it.summary}</div>}

              {it.new_interests.length > 0 && <div style={{ marginBottom: 8 }}><span style={{ fontSize: 11, color: '#9aa3af' }}>Intereses: </span>{it.new_interests.map((x, i) => <span key={i} style={CHIP}>{x}</span>)}</div>}
              {it.traits.length > 0 && <div style={{ marginBottom: 8 }}><span style={{ fontSize: 11, color: '#9aa3af' }}>Rasgos: </span>{it.traits.map((t, i) => <span key={i} style={{ ...CHIP, background: '#1c1830', color: '#c4b5fd' }}>{t.trait} ({Math.round((t.confidence || 0) * 100)}%)</span>)}</div>}
              {it.items_to_reinforce.length > 0 && <div style={{ marginBottom: 8 }}><span style={{ fontSize: 11, color: '#9aa3af' }}>A reforzar: </span>{it.items_to_reinforce.map((x, i) => <span key={i} style={{ ...CHIP, background: '#2a1a1a', color: '#fca5a5' }}>{x}</span>)}</div>}
              {it.suggested_topic && <div style={{ fontSize: 12, color: '#9aa3af', marginBottom: 10 }}>Próximo tópico sugerido: <b style={{ color: '#e6e8ec' }}>{it.suggested_topic}</b></div>}

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button disabled={busy === it.id} style={{ ...BTN, background: '#22c55e', color: '#06120a' }} onClick={() => act(it.id, 'approve')}>Aprobar → memoria</button>
                <button disabled={busy === it.id} style={{ ...BTN, background: '#232936', color: '#fca5a5' }} onClick={() => act(it.id, 'discard')}>Descartar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* AdminMemoriaPanel — la memoria de un alumno (lo que el motor inyecta en el bloque 5b).
 *
 * Elegís un alumno y ves: SRS (qué domina/aprende/debe repasar), intereses y rasgos
 * detectados, cola de refuerzo, y la sugerencia del sequencer para la próxima clase.
 * Es read-mostly: lo escribe el post-clase; acá es tu contexto antes de operar.
 */
import { useEffect, useState } from 'react'
import api from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Vp { item: string; status: string; seen: number; ok: number; fail: number; next_review: string | null; due: boolean }
interface Mem {
  vocab_progress: Vp[]
  reinforcement_queue: { item: string; reason: string }[]
  interests: { interest: string; source: string; weight: number }[]
  traits: { trait: string; confidence: number }[]
}
interface NextT { due_items: string[]; reinforce_items: string[]; suggested_topic: string | null; reason: string }

const CARD: React.CSSProperties = { background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 16 }
const LBL: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa3af', marginBottom: 8 }
const FIELD: React.CSSProperties = { width: '100%', maxWidth: 380, padding: '9px 11px', borderRadius: 10, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 14 }
const CHIP: React.CSSProperties = { display: 'inline-block', fontSize: 12, padding: '3px 9px', borderRadius: 999, margin: '2px 4px 2px 0' }
const STATUS_COLOR: Record<string, string> = { mastered: '#22c55e', learning: '#fbbf24', new: '#9aa3af' }

export default function AdminMemoriaPanel() {
  const [alumnos, setAlumnos] = useState<{ id: number; name: string }[]>([])
  const [uid, setUid] = useState<number | undefined>(undefined)
  const [mem, setMem] = useState<Mem | null>(null)
  const [next, setNext] = useState<NextT | null>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    api.get('/alumnos').then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data?.items || [])
      setAlumnos(list.map((a: Record<string, unknown>) => ({
        id: Number(a.id), name: String(a.nombre || a.name || a.email || `#${a.id}`),
      })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!uid) { setMem(null); setNext(null); return }
    api.get(`/memory/student/${uid}`).then((r) => setMem(r.data)).catch(() => setMem(null))
    api.get('/memory/suggest-next-topic', { params: { user_id: uid } }).then((r) => setNext(r.data)).catch(() => setNext(null))
  }, [uid])

  const empty = mem && !mem.vocab_progress.length && !mem.interests.length && !mem.traits.length

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', padding: '24px 20px 64px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Memoria del alumno</h1>
        <p style={{ color: '#9aa3af', fontSize: 13, margin: '0 0 18px' }}>
          Lo que el motor sabe del alumno y le inyecta en el prompt (bloque 5b). Lo llena el post-clase; acá lo mirás.
        </p>

        <div style={{ ...CARD, marginBottom: 16 }}>
          <div style={LBL}>Alumno</div>
          <select style={FIELD} value={uid ?? ''} onChange={(e) => setUid(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Elegí un alumno…</option>
            {alumnos.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {uid && empty && <div style={{ ...CARD, color: '#9aa3af', fontSize: 14 }}>Este alumno todavía no tiene memoria cargada. Aparece a medida que da clases (y vos aprobás los insights).</div>}

        {uid && mem && !empty && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            {/* SRS */}
            <div style={{ ...CARD, gridColumn: '1 / -1' }}>
              <div style={LBL}>SRS — vocabulario</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>{['Ítem', 'Estado', 'OK', 'Fallos', 'Próx. repaso'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#9aa3af', borderBottom: '1px solid #232936' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {mem.vocab_progress.map((v, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1c2230' }}>
                        <td style={{ padding: '6px 8px', color: '#cbd5e1' }}>{v.item}</td>
                        <td style={{ padding: '6px 8px', color: STATUS_COLOR[v.status] || '#9aa3af', fontWeight: 600 }}>{v.status}</td>
                        <td style={{ padding: '6px 8px', color: '#22c55e' }}>{v.ok}</td>
                        <td style={{ padding: '6px 8px', color: '#fca5a5' }}>{v.fail}</td>
                        <td style={{ padding: '6px 8px', color: v.due ? '#fbbf24' : '#9aa3af' }}>{v.next_review || '—'}{v.due ? ' (hoy)' : ''}</td>
                      </tr>
                    ))}
                    {mem.vocab_progress.length === 0 && <tr><td colSpan={5} style={{ padding: '8px', color: '#6b7280' }}>Sin ítems aún.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={CARD}>
              <div style={LBL}>Intereses</div>
              {mem.interests.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>—</div>}
              {mem.interests.map((it, i) => <span key={i} style={{ ...CHIP, background: '#172033', color: '#7dd3fc' }}>{it.interest} <span style={{ opacity: 0.6 }}>({it.source})</span></span>)}
            </div>
            <div style={CARD}>
              <div style={LBL}>Rasgos</div>
              {mem.traits.length === 0 && <div style={{ color: '#6b7280', fontSize: 13 }}>—</div>}
              {mem.traits.map((t, i) => <span key={i} style={{ ...CHIP, background: '#1c1830', color: '#c4b5fd' }}>{t.trait}</span>)}
            </div>

            {next && (
              <div style={{ ...CARD, gridColumn: '1 / -1' }}>
                <div style={LBL}>Sequencer — próxima clase</div>
                <div style={{ fontSize: 13, color: '#cbd5e1' }}>
                  {next.suggested_topic && <div style={{ marginBottom: 6 }}>Tópico sugerido: <b style={{ color: '#e6e8ec' }}>{next.suggested_topic}</b></div>}
                  {next.due_items.length > 0 && <div style={{ marginBottom: 6 }}>A repasar (SRS hoy): {next.due_items.map((x, i) => <span key={i} style={{ ...CHIP, background: '#2a2410', color: '#fbbf24' }}>{x}</span>)}</div>}
                  {next.reinforce_items.length > 0 && <div>A reforzar: {next.reinforce_items.map((x, i) => <span key={i} style={{ ...CHIP, background: '#2a1a1a', color: '#fca5a5' }}>{x}</span>)}</div>}
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>{next.reason}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

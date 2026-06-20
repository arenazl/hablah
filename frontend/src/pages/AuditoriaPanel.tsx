/* /auditoria — auditoría pedagógica del catálogo POR NIVEL (no tópicos).
 * El especialista (SLA/CEFR) propone mejoras a variables/objetivos/reglas de cada nivel.
 * El profe adopta o rechaza. Página React (se ve en escritorio remoto, sin líos de static).
 */
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { motorAPI, AuditLevel, AuditProposal } from '../services/api'

const C = {
  bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1a1f2a',
  fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686', accent: '#38bdf8', green: '#22c55e', red: '#f87171', amber: '#fbbf24',
}
const ACT: Record<string, { label: string; col: string; bg: string }> = {
  add: { label: 'agregar', col: C.green, bg: 'rgba(34,197,94,.14)' },
  change: { label: 'cambiar', col: C.amber, bg: 'rgba(251,191,36,.14)' },
  remove: { label: 'sacar', col: C.red, bg: 'rgba(248,113,113,.14)' },
  keep: { label: 'mantener', col: C.dim, bg: '#1c2230' },
}

export default function AuditoriaPanel() {
  const [levels, setLevels] = useState<AuditLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [decided, setDecided] = useState<Record<number, string>>({})

  useEffect(() => {
    motorAPI.catalogProposals().then((r) => setLevels(r.levels || [])).catch(() => toast.error('No se pudo cargar')).finally(() => setLoading(false))
  }, [])

  const decide = async (id: number, action: 'adopt' | 'reject') => {
    setDecided((p) => ({ ...p, [id]: action === 'adopt' ? 'adopted' : 'rejected' }))
    try { await motorAPI.decideProposal(id, action); toast.success(action === 'adopt' ? 'Adoptada' : 'Rechazada') }
    catch { toast.error('No se pudo guardar'); setDecided((p) => { const n = { ...p }; delete n[id]; return n }) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '22px 18px 64px', fontFamily: 'system-ui, Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Auditoría pedagógica por nivel</h1>
        <p style={{ color: C.dim, fontSize: 13, margin: '0 0 18px', maxWidth: 900, lineHeight: 1.5 }}>
          Especialista en SLA/CEFR sobre las <b>variables, objetivos y reglas de cada nivel</b> (no los tópicos).
          Adoptás o rechazás cada propuesta. <span style={{ color: C.green }}>agregar</span> · <span style={{ color: C.amber }}>cambiar</span> · <span style={{ color: C.red }}>sacar</span> · <span style={{ color: C.dim }}>mantener</span>
        </p>
        {loading && <div style={{ color: C.faint }}>Cargando…</div>}
        {levels.map((lv) => (
          <div key={lv.level_code} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderBottom: `1px solid ${C.border}`, paddingBottom: 10, marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Nivel {lv.level_code}</h2>
              <span style={{ color: C.dim, fontSize: 12.5 }}>{lv.label}</span>
              <span style={{ marginLeft: 'auto', color: C.faint, fontSize: 11.5 }}>español: {lv.spanish_mirror} · vocab: {lv.vocab_depth} · pacing +{lv.pacing_bonus_min}min</span>
            </div>
            <div style={{ fontSize: 11.5, color: C.faint, marginBottom: 12, borderLeft: `2px solid ${C.soft}`, paddingLeft: 10 }}>
              <b style={{ color: C.dim }}>Objetivos hoy:</b> {lv.objectives.map((o) => `${o.kind}: ${o.description}`).join(' · ') || '—'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lv.proposals.length === 0 && <div style={{ color: C.faint, fontSize: 12.5 }}>(sin propuestas)</div>}
              {lv.proposals.map((p: AuditProposal) => {
                const a = ACT[p.action] || ACT.change
                const st = decided[p.proposal_id] || (p.status !== 'proposed' ? p.status : '')
                return (
                  <div key={p.proposal_id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 11px' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5, color: a.col, background: a.bg, whiteSpace: 'nowrap', marginTop: 2 }}>{a.label}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.scope} · {p.area}</div>
                      {p.current_value && p.current_value !== '-' && <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}><span style={{ color: C.faint }}>actual:</span> {p.current_value}</div>}
                      <div style={{ fontSize: 13, color: C.fg, marginTop: 2 }}><span style={{ color: C.green }}>→</span> {p.proposed_value}</div>
                      {p.rationale && <div style={{ fontSize: 11.5, color: C.dim, marginTop: 4, lineHeight: 1.4 }}>{p.rationale}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                      {st ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: st === 'adopted' ? C.green : C.red }}>{st === 'adopted' ? '✓ adoptada' : '✕ rechazada'}</span>
                      ) : (
                        <>
                          <button onClick={() => decide(p.proposal_id, 'adopt')} style={{ background: 'rgba(34,197,94,.14)', border: `1px solid ${C.green}`, color: C.green, borderRadius: 7, fontSize: 11.5, fontWeight: 700, padding: '4px 10px', cursor: 'pointer' }}>Adoptar</button>
                          <button onClick={() => decide(p.proposal_id, 'reject')} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.faint, borderRadius: 7, fontSize: 11.5, padding: '4px 10px', cursor: 'pointer' }}>Rechazar</button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

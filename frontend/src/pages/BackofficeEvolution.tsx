import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'

import { adminDirectivesAPI, AdminDirective } from '../services/api'

interface EvolutionViewProps {
  onMenu: () => void
}

export function EvolutionView({ onMenu }: EvolutionViewProps) {
  const { id } = useParams<{ id: string }>()
  const templateId = Number(id)

  const [templateName, setTemplateName] = useState<string>('')
  const [directives, setDirectives] = useState<AdminDirective[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    if (!templateId) return
    setLoading(true)
    adminDirectivesAPI.list(templateId)
      .then((data) => {
        setTemplateName(data.template.name)
        setDirectives(data.directives)
      })
      .catch(() => toast.error('No pude cargar el historial de directivas'))
      .finally(() => setLoading(false))
  }, [templateId])

  const handleToggle = async (d: AdminDirective) => {
    try {
      const updated = await adminDirectivesAPI.toggle(d.id, !d.active)
      setDirectives((prev) => prev.map((x) => (x.id === d.id ? updated : x)))
      toast.success(updated.active ? 'Directiva reactivada' : 'Directiva pausada')
    } catch {
      toast.error('No pude actualizar la directiva')
    }
  }

  const handleDelete = async (d: AdminDirective) => {
    if (!confirm(`Borrar esta directiva del historial?\n\n"${d.directive_text}"`)) return
    try {
      await adminDirectivesAPI.remove(d.id)
      setDirectives((prev) => prev.filter((x) => x.id !== d.id))
      toast.success('Directiva borrada')
    } catch {
      toast.error('No pude borrar')
    }
  }

  return (
    <>
      <style>{`
        .evo-page { padding: 16px; max-width: 1100px; margin: 0 auto; }
        .evo-head {
          display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
          padding: 16px 0; border-bottom: 1px solid var(--border-color, #e2e8f0);
        }
        .evo-back { font-size: 13px; color: var(--fg-3, #64748b); text-decoration: none; }
        .evo-back:hover { color: var(--color-primary, #00B37E); }
        .evo-title { font-size: 22px; font-weight: 700; margin: 0; }
        .evo-sub { font-size: 13px; color: var(--fg-3, #64748b); margin-top: 4px; }
        .evo-count { margin-left: auto; padding: 4px 10px; border-radius: 999px;
          background: rgba(0,179,126,.12); color: var(--color-primary, #00B37E);
          font-size: 12px; font-weight: 600; }
        .evo-empty {
          padding: 40px; text-align: center; color: var(--fg-3, #64748b);
          background: var(--bg-2, #f8fafc); border-radius: 12px;
        }
        .evo-empty-title { font-size: 16px; font-weight: 600; margin-bottom: 8px;
          color: var(--fg-1, #0f172a); }
        .evo-empty-hint { font-size: 13px; max-width: 520px; margin: 0 auto;
          line-height: 1.5; }
        .evo-empty-code { display: inline-block; padding: 2px 8px;
          background: var(--bg-3, #e2e8f0); border-radius: 6px;
          font-family: 'JetBrains Mono', monospace; font-size: 12px; margin-top: 8px; }
        .evo-card {
          background: var(--bg-card, #fff); border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 12px; padding: 16px; margin-bottom: 12px;
          transition: all .2s ease;
        }
        .evo-card.inactive { opacity: .55; }
        .evo-card-head {
          display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;
        }
        .evo-date { font-size: 12px; color: var(--fg-3, #64748b); font-weight: 500; }
        .evo-status {
          margin-left: auto; display: flex; align-items: center; gap: 8px;
        }
        .evo-badge {
          padding: 2px 8px; border-radius: 999px; font-size: 11px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;
        }
        .evo-badge.on { background: rgba(0,179,126,.15); color: var(--color-primary, #00B37E); }
        .evo-badge.off { background: rgba(100,116,139,.15); color: var(--fg-3, #64748b); }
        .evo-btn {
          padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-color, #e2e8f0);
          background: var(--bg-card, #fff); cursor: pointer; font-size: 12px;
          font-weight: 500; color: var(--fg-2, #334155);
          transition: all .15s ease;
        }
        .evo-btn:hover { background: var(--bg-2, #f8fafc); }
        .evo-btn.danger { color: #dc2626; }
        .evo-btn.danger:hover { background: #fef2f2; }
        .evo-block { margin-top: 10px; }
        .evo-block-label {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.4px; color: var(--fg-3, #64748b); margin-bottom: 4px;
        }
        .evo-quote {
          padding: 12px 14px; border-radius: 8px; font-size: 14px;
          line-height: 1.55;
        }
        .evo-quote.raw {
          background: rgba(100,116,139,.08); color: var(--fg-2, #334155);
          font-style: italic; border-left: 3px solid var(--fg-3, #64748b);
        }
        .evo-quote.directive {
          background: rgba(0,179,126,.08); color: var(--fg-1, #0f172a);
          border-left: 3px solid var(--color-primary, #00B37E); font-weight: 500;
        }
        .evo-snapshots { margin-top: 14px; }
        .evo-snap-toggle {
          font-size: 12px; color: var(--fg-3, #64748b); cursor: pointer;
          background: none; border: none; padding: 4px 0; font-weight: 500;
        }
        .evo-snap-toggle:hover { color: var(--color-primary, #00B37E); }
        .evo-snap-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;
        }
        @media (max-width: 768px) {
          .evo-snap-grid { grid-template-columns: 1fr; }
        }
        .evo-snap-panel {
          background: #0f172a; color: #cbd5e1; border-radius: 8px; padding: 12px;
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          line-height: 1.5; white-space: pre-wrap; word-break: break-word;
          max-height: 360px; overflow-y: auto;
        }
        .evo-snap-title { font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;
          color: var(--fg-3, #64748b); }
      `}</style>
      <div className="evo-page">
        <div className="evo-head">
          <button className="menu-toggle" onClick={onMenu}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div>
            <Link to="/admin/templates" className="evo-back">← Templates</Link>
            <h1 className="evo-title">Evolución del coach: {templateName || '...'}</h1>
            <div className="evo-sub">
              Historial de directivas dictadas por el super-admin durante sesiones Live
            </div>
          </div>
          <span className="evo-count">{directives.length} entradas</span>
        </div>

        {loading && <div className="evo-empty">Cargando...</div>}

        {!loading && directives.length === 0 && (
          <div className="evo-empty">
            <div className="evo-empty-title">Sin directivas todavía</div>
            <div className="evo-empty-hint">
              Durante una charla con este coach, decí en voz:
              <br />
              <span className="evo-empty-code">"Hola soy el super admin Luquitas, &lt;tu feedback&gt;"</span>
              <br />
              <br />
              El coach va a registrar tu feedback, refinarlo en una regla concreta y
              aplicarla en todas las charlas futuras.
            </div>
          </div>
        )}

        {!loading && directives.map((d) => (
          <div key={d.id} className={`evo-card${d.active ? '' : ' inactive'}`}>
            <div className="evo-card-head">
              <div>
                <div className="evo-date">
                  {d.created_at ? new Date(d.created_at).toLocaleString('es-AR') : '—'}
                </div>
              </div>
              <div className="evo-status">
                <span className={`evo-badge ${d.active ? 'on' : 'off'}`}>
                  {d.active ? 'Activa' : 'Pausada'}
                </span>
                <button className="evo-btn" onClick={() => handleToggle(d)}>
                  {d.active ? 'Pausar' : 'Reactivar'}
                </button>
                <button className="evo-btn danger" onClick={() => handleDelete(d)}>
                  Borrar
                </button>
              </div>
            </div>

            <div className="evo-block">
              <div className="evo-block-label">Dijiste literal</div>
              <div className="evo-quote raw">"{d.raw_feedback}"</div>
            </div>

            <div className="evo-block">
              <div className="evo-block-label">Regla aplicada al prompt</div>
              <div className="evo-quote directive">{d.directive_text}</div>
            </div>

            <div className="evo-snapshots">
              <button
                className="evo-snap-toggle"
                onClick={() => setOpenId(openId === d.id ? null : d.id)}
              >
                {openId === d.id ? '▼' : '▶'} Ver snapshot antes / después del prompt
              </button>
              {openId === d.id && (
                <div className="evo-snap-grid">
                  <div>
                    <div className="evo-snap-title">Prompt antes</div>
                    <div className="evo-snap-panel">{d.prompt_before}</div>
                  </div>
                  <div>
                    <div className="evo-snap-title">Prompt después</div>
                    <div className="evo-snap-panel">{d.prompt_after}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

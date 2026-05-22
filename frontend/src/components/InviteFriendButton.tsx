/**
 * Boton "Invitar amigo" reutilizable. Crea una room via POST /api/rooms
 * y abre un modal con el link para copiar/compartir.
 *
 * Uso:
 *   <InviteFriendButton topicId={topic.id} variant="dark" />
 *
 * El topicId es opcional. Si no se pasa, la sala se crea sin topico (tema libre).
 */
import { useEffect, useState } from 'react'
import { UserPlus, X, Copy, Check, Share2 } from 'lucide-react'

const CSS = `
.inv-btn { display:inline-flex; align-items:center; gap:8px; padding:0 18px; height:44px; border-radius:99px; border:0; cursor:pointer; font-family:inherit; font-weight:700; font-size:14px; transition:transform .15s; }
.inv-btn:hover { transform:translateY(-1px); }
.inv-btn:disabled { opacity:.5; cursor:wait; transform:none; }
.inv-btn.light { background:rgba(255,255,255,.10); color:#fff; border:1px solid rgba(255,255,255,.18); }
.inv-btn.light:hover { background:rgba(255,255,255,.16); }
.inv-btn.dark { background:#0D1412; color:#fff; }
.inv-btn.dark:hover { background:#000; }
.inv-btn.amber { background:#FFB800; color:#3A2A00; }

.inv-modal-backdrop { position:fixed; inset:0; background:rgba(13,20,18,.7); backdrop-filter:blur(8px); z-index:9000; display:grid; place-items:center; padding:24px; }
.inv-modal { width:100%; max-width:480px; background:#fff; border-radius:24px; padding:28px 24px; position:relative; animation:inv-pop .25s cubic-bezier(.2,.8,.2,1); font-family:'Sora','Inter',ui-sans-serif,system-ui,sans-serif; color:#0D1412; }
@keyframes inv-pop { from { transform:scale(.92); opacity:0; } to { transform:scale(1); opacity:1; } }
.inv-modal .close { position:absolute; top:14px; right:14px; width:36px; height:36px; border-radius:50%; background:rgba(13,20,18,.06); color:#3A4441; display:grid; place-items:center; border:0; cursor:pointer; }
.inv-modal .close:hover { background:rgba(13,20,18,.10); }
.inv-modal .ico { width:56px; height:56px; border-radius:18px; background:#FFF7DD; color:#FFB800; display:grid; place-items:center; margin:0 0 12px; }
.inv-modal h2 { font-weight:800; font-size:22px; letter-spacing:-0.02em; margin:0 0 6px; }
.inv-modal p { font-size:14px; color:#3A4441; margin:0 0 16px; line-height:1.5; }
.inv-link { display:flex; align-items:center; gap:8px; padding:12px 14px; background:#F2EAD9; border:1px solid #E8DFCA; border-radius:14px; margin-bottom:12px; }
.inv-link .url { flex:1; font-family:'JetBrains Mono', ui-monospace, monospace; font-size:13px; color:#0D1412; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.inv-link .copy-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:10px; background:#0D1412; color:#fff; border:0; cursor:pointer; font-size:12px; font-weight:700; font-family:inherit; }
.inv-link .copy-btn.copied { background:#22C55E; }
.inv-meta { font-size:12px; color:#6B7672; line-height:1.5; }
.inv-meta b { color:#0D1412; }
.inv-actions { display:flex; gap:8px; margin-top:16px; }
.inv-actions button { flex:1; padding:0 16px; height:44px; border-radius:12px; border:0; cursor:pointer; font-weight:700; font-size:13px; font-family:inherit; }
.inv-actions .primary { background:#00B37E; color:#fff; }
.inv-actions .secondary { background:transparent; color:#3A4441; border:1px solid #E8DFCA; }
`

interface InviteFriendButtonProps {
  topicId?: number | null
  freeTopic?: string | null
  variant?: 'light' | 'dark' | 'amber'
  label?: string
  authToken?: string  // si no se pasa, usa el token global del adulto
}

export function InviteFriendButton({
  topicId,
  freeTopic,
  variant = 'light',
  label = 'Invitar amigo',
  authToken,
}: InviteFriendButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRoom = async () => {
    setLoading(true)
    setError(null)
    try {
      const tok = authToken ?? localStorage.getItem('kids_token') ?? localStorage.getItem('token')
      if (!tok) {
        setError('Necesitás estar logueado para invitar a un amigo')
        setLoading(false)
        return
      }
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          topic_id: topicId ?? null,
          free_topic: freeTopic ?? null,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'No pudimos crear la sala')
      }
      const data = await res.json()
      const url = `${window.location.origin}/charla/${data.token}`
      setLink(url)
    } catch (e: any) {
      setError(e?.message || 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && !link && !loading && !error) {
      createRoom()
    }
    if (!open) {
      setCopied(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      ta.remove()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const share = async () => {
    if (!link) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Te invito a una charla en hablah',
          text: 'Vení a hablar conmigo y con el tutor de IA',
          url: link,
        })
      } catch {}
    } else {
      copy()
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <button className={`inv-btn ${variant}`} onClick={() => setOpen(true)} type="button">
        <UserPlus size={16} strokeWidth={2.2} />
        {label}
      </button>

      {open && (
        <div className="inv-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            <div className="ico"><UserPlus size={26} strokeWidth={2.2} /></div>
            <h2>Invitar a un amigo</h2>
            <p>Compartí este link. Tu amigo lo abre, escribe su nombre y entra a la charla — no necesita usuario.</p>

            {loading && <p style={{ color: '#6B7672', textAlign: 'center' }}>Creando sala…</p>}
            {error && <p style={{ color: '#B42127' }}>{error}</p>}

            {link && (
              <>
                <div className="inv-link">
                  <span className="url">{link}</span>
                  <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>

                <div className="inv-meta">
                  <b>Importante:</b> el link queda activo mientras tu charla esté abierta. Si termina la sesión, el link deja de funcionar.
                </div>

                <div className="inv-actions">
                  <button className="primary" onClick={share}>
                    <Share2 size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Compartir
                  </button>
                  <button className="secondary" onClick={() => setOpen(false)}>
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

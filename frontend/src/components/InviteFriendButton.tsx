/**
 * Boton "Invitar amigo" reutilizable.
 *
 * Flow simple (sin modal):
 *   1. Tap -> crea room via POST /api/rooms (loading state)
 *   2. Si navigator.share esta disponible (mobile) -> abre el sheet
 *      nativo (WhatsApp, Telegram, Mail, etc).
 *   3. Si no (desktop) -> copia al portapapeles + toast "Copiado".
 *
 * Asi el usuario hace un solo tap y ya tiene el link listo para mandar.
 *
 * Uso:
 *   <InviteFriendButton topicId={topic.id} variant="dark" />
 *
 * El topicId es opcional. Si no se pasa, la sala se crea sin topico
 * (tema libre).
 */
import { useState } from 'react'
import { UserPlus, Check } from 'lucide-react'
import { toast } from 'sonner'

const CSS = `
.inv-btn { display:inline-flex; align-items:center; gap:8px; padding:0 18px; height:44px; border-radius:99px; border:0; cursor:pointer; font-family:inherit; font-weight:700; font-size:14px; transition:transform .15s, background .15s; }
.inv-btn:hover { transform:translateY(-1px); }
.inv-btn:disabled { opacity:.6; cursor:wait; transform:none; }
.inv-btn.light { background:rgba(255,255,255,.10); color:#fff; border:1px solid rgba(255,255,255,.18); }
.inv-btn.light:hover { background:rgba(255,255,255,.16); }
.inv-btn.dark { background:#0D1412; color:#fff; }
.inv-btn.dark:hover { background:#000; }
.inv-btn.amber { background:#FFB800; color:#3A2A00; }
.inv-btn.amber:hover { background:#FFC833; }
.inv-btn.icon-only { width:36px; height:36px; padding:0; gap:0; border-radius:50%; justify-content:center; }
.inv-btn .spinner { width:14px; height:14px; border-radius:50%; border:2px solid currentColor; border-right-color:transparent; animation:inv-spin .6s linear infinite; }
@keyframes inv-spin { to { transform:rotate(360deg); } }
.inv-btn.copied { background:#22C55E !important; color:#fff !important; border-color:#22C55E !important; }
`

interface InviteFriendButtonProps {
  topicId?: number | null
  freeTopic?: string | null
  variant?: 'light' | 'dark' | 'amber'
  label?: string
  authToken?: string
}

export function InviteFriendButton({
  topicId,
  freeTopic,
  variant = 'light',
  label = 'Invitar amigo',
  authToken,
}: InviteFriendButtonProps) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const iconOnly = !label

  const handleClick = async (): Promise<void> => {
    if (loading) return
    setLoading(true)
    try {
      const tok = authToken ?? localStorage.getItem('kids_token') ?? localStorage.getItem('token')
      if (!tok) {
        toast.error('Necesitás estar logueado para invitar')
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
      if (!res.ok) throw new Error('No pudimos crear la sala')
      const data = await res.json()
      const link = `${window.location.origin}/charla/${data.token}`

      // En mobile (iOS/Android): abre el share sheet nativo - WhatsApp,
      // Telegram, Mail, copy, etc. UX ideal.
      // navigator.share solo funciona en contextos seguros (https).
      const canShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        window.isSecureContext

      if (canShare) {
        try {
          await navigator.share({
            title: 'Te invito a una charla en hablah',
            text: 'Sumate a esta charla en hablah',
            url: link,
          })
          toast.success('Link compartido')
          return
        } catch (err: unknown) {
          // Usuario cancelo el sheet - copiamos como fallback
          if (err instanceof Error && err.name === 'AbortError') {
            await copyToClipboard(link)
            return
          }
          // Otro error -> seguir a clipboard fallback
        }
      }
      await copyToClipboard(link)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de red'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (link: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = link
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      ta.remove()
    }
    setCopied(true)
    toast.success('Link copiado — pegalo en WhatsApp y mandalo')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <>
      <style>{CSS}</style>
      <button
        className={`inv-btn ${variant}${iconOnly ? ' icon-only' : ''}${copied ? ' copied' : ''}`}
        onClick={handleClick}
        type="button"
        disabled={loading}
        aria-label={iconOnly ? 'Invitar amigo' : undefined}
        title={iconOnly ? 'Invitar amigo' : undefined}
      >
        {loading ? (
          <span className="spinner" aria-hidden />
        ) : copied ? (
          <Check size={iconOnly ? 18 : 16} strokeWidth={2.4} />
        ) : (
          <UserPlus size={iconOnly ? 18 : 16} strokeWidth={2.2} />
        )}
        {!iconOnly && (loading ? 'Creando…' : copied ? 'Copiado' : label)}
      </button>
    </>
  )
}

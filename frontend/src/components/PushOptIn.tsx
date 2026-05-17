import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff, X } from 'lucide-react'
import { pushAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// Convierte base64url → Uint8Array (formato que pide PushManager.subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0))
}

const DISMISS_KEY = 'pwa_push_dismissed_until'

export function PushOptIn() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    // Solo para vendedores/coordinadores/gerentes que reciben leads
    if (user.role === 'admin') return

    // Verificar soporte
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }
    if (Notification.permission === 'denied') return
    if (Notification.permission === 'granted') {
      // Ya dio permiso: chequear si estamos suscritos al server
      verifyAndSubscribe()
      return
    }

    // Pendiente de permiso → mostrar banner salvo que el user lo haya descartado
    const dismissedUntil = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10)
    if (dismissedUntil > Date.now()) return

    setShow(true)
  }, [user])

  const verifyAndSubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        // Re-mandarla al server por idempotencia
        const json = existing.toJSON() as any
        await pushAPI.subscribe({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        })
      } else {
        await activarPush()
      }
    } catch (e) {
      console.warn('[push] verifyAndSubscribe:', e)
    }
  }

  const activarPush = async () => {
    if (busy) return
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.info('Permiso de notificaciones rechazado')
        setShow(false)
        // Recordar dismiss por 7 dias
        localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 86400000))
        return
      }

      const reg = await navigator.serviceWorker.ready
      const vapidR = await pushAPI.vapidKey()
      const vapidKey = vapidR.data.public_key
      if (!vapidKey) {
        toast.error('El servidor no tiene VAPID configurada')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      const json = sub.toJSON() as any
      await pushAPI.subscribe({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      })

      toast.success('Notificaciones activadas')
      setShow(false)
    } catch (e: any) {
      console.error('[push] activar error:', e)
      toast.error('No se pudieron activar las notificaciones')
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 86400000))
    setShow(false)
  }

  if (!show || !user) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 rounded-xl border shadow-2xl p-4 animate-fade-in-up"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--color-accent)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Bell className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm mb-0.5">Activá las notificaciones</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            Te avisamos al instante cuando te asignamos un lead o el cliente responde, aunque tengas la app cerrada.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={activarPush}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {busy ? 'Activando...' : 'Activar'}
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 rounded-lg text-xs border"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Después
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="p-1 rounded hover:bg-black/10"
        >
          <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </div>
  )
}

export function PushTestButton() {
  const test = async () => {
    try {
      await pushAPI.test()
      toast.success('Test enviado, esperá la notificación')
    } catch { toast.error('Error al enviar test') }
  }
  return (
    <button
      onClick={test}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border"
      style={{ borderColor: 'var(--border-color)' }}
    >
      <Bell className="h-3.5 w-3.5" />
      Test push
    </button>
  )
}

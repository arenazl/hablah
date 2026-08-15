// Auto-update de la PWA (kit compartido: base-compartida/6-GUIA-PWA.md).
//
// ESTÁNDAR (dueño, 2026-08-15): NUNCA auto-recargar mientras el usuario usa la app —
// romperle la operatoria en el medio de una carga es un desastre. Al detectar un build
// nuevo se muestra un POPUP abajo a la derecha ("Actualizar") y la recarga la dispara
// EL USUARIO al tocar. Única excepción: el chunk-guard (la app ya está rota, recargar
// es rescate, no interrupción).
//
// Se dispara: al arrancar, al volver a foco, y por polling (pestaña abierta y quieta
// no genera eventos — sin intervalo el aviso no aparece nunca).
import { toast } from 'sonner'

const POLL_MS = 60_000
const NOTIFY_GUARD_PREFIX = 'hablah-update-toast-' // un aviso por versión por pestaña
const CHUNK_GUARD_KEY = 'hablah-chunk-reload-at'
const CHUNK_GUARD_WINDOW_MS = 2 * 60_000

declare global {
  interface Window {
    /** true mientras hay una clase de voz activa: el popup de update se difiere
     * hasta que la clase termina (lo setea useLiveVoice). */
    __hablahBusy?: boolean
  }
}

async function fetchServerVersion(): Promise<string | null> {
  try {
    const r = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return null
    const data = (await r.json()) as { version?: string }
    return data.version ?? null
  } catch {
    return null // offline / error: no hacemos nada
  }
}

let pendingVersion: string | null = null

function tryNotify(): void {
  if (!pendingVersion) return
  // En medio de una clase de voz ni molestamos: el drain lo reintenta al colgar.
  if (typeof window !== 'undefined' && window.__hablahBusy) return
  const guard = NOTIFY_GUARD_PREFIX + pendingVersion
  if (sessionStorage.getItem(guard)) return
  sessionStorage.setItem(guard, '1')
  toast('Hay una versión nueva de Habláh', {
    description: 'Actualizá cuando quieras — hasta que toques, seguís trabajando tranquilo.',
    action: { label: 'Actualizar', onClick: () => location.reload() },
    duration: Infinity,
    position: 'bottom-right',
  })
}

/* Chunk-guard: tras un deploy, un lazy chunk viejo puede dar 404 y la app queda ROTA
 * (pantalla en blanco al navegar). Ahí recargar no interrumpe nada: rescata. Una sola
 * vez por ventana de tiempo (anti-loop si el server está mal de verdad). */
function setupChunkGuard(): void {
  const isChunkError = (msg: string) =>
    /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .+ failed/i.test(msg)
  const rescue = () => {
    const last = Number(sessionStorage.getItem(CHUNK_GUARD_KEY) || 0)
    if (Date.now() - last < CHUNK_GUARD_WINDOW_MS) return
    sessionStorage.setItem(CHUNK_GUARD_KEY, String(Date.now()))
    location.reload()
  }
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as { message?: string } | string | undefined
    const m = typeof reason === 'string' ? reason : String(reason?.message || '')
    if (isChunkError(m)) rescue()
  })
  window.addEventListener('error', (e) => {
    if (isChunkError(String(e.message || ''))) rescue()
  })
}

export function setupVersionCheck(): void {
  const current = __APP_VERSION__

  const check = async () => {
    if (document.visibilityState !== 'visible') return
    const server = await fetchServerVersion()
    if (!server || server === current) return
    pendingVersion = server
    tryNotify()
  }

  void check() // al arrancar
  document.addEventListener('visibilitychange', () => void check()) // al volver a foco (PWA)
  window.addEventListener('focus', () => void check())
  setInterval(() => void check(), POLL_MS) // pestaña quieta: sin esto el aviso no aparece
  setInterval(tryNotify, 3_000) // drain: muestra el aviso apenas termina la clase de voz
  setupChunkGuard()
}

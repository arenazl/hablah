// Auto-actualización de la PWA: compara la versión del build con /version.json del server
// y recarga SOLA si cambió — sin que el usuario tenga que hacer nada (jamás Ctrl+Shift+R).
//
// Se dispara: al arrancar, al volver a foco, Y por POLLING periódico (para el caso en que la
// app queda abierta y el usuario navega dentro sin cambiar de pestaña — ahí foco/visibility
// no alcanzan). Guard clave: NO recarga en medio de una clase de voz (window.__hablahBusy),
// porque cortaría el WebSocket; deja la recarga PENDIENTE y la aplica apenas la clase termina.
const RELOAD_GUARD_PREFIX = 'hablah-reloaded-'
const POLL_MS = 20000 // chequeo periódico de versión
const DRAIN_MS = 3000 // reintento de recarga pendiente (espera a que termine la clase)

declare global {
  interface Window {
    /** true mientras hay una clase de voz activa: bloquea la recarga automática. */
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

function tryReload(): void {
  if (!pendingVersion) return
  // No cortar una clase de voz en curso: esperamos a que termine (el drain lo reintenta).
  if (typeof window !== 'undefined' && window.__hablahBusy) return
  const guard = RELOAD_GUARD_PREFIX + pendingVersion // recargamos UNA vez por versión nueva
  if (sessionStorage.getItem(guard)) return
  sessionStorage.setItem(guard, '1')
  location.reload()
}

export function setupVersionCheck(): void {
  const current = __APP_VERSION__

  const check = async () => {
    if (document.visibilityState !== 'visible') return
    const server = await fetchServerVersion()
    if (!server || server === current) return
    pendingVersion = server
    tryReload()
  }

  void check() // al arrancar
  document.addEventListener('visibilitychange', () => void check()) // al volver a foco (PWA)
  window.addEventListener('focus', () => void check())
  setInterval(() => void check(), POLL_MS) // polling: detecta versión nueva sin depender del foco
  setInterval(tryReload, DRAIN_MS) // aplica la recarga pendiente apenas la clase de voz termina
}

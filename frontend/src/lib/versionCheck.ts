// Auto-actualización de la PWA: compara la versión del build con /version.json del server
// y recarga sola si cambió (con guard anti-loop). Resuelve el "tengo que hacer Ctrl+Shift+R".
const RELOAD_GUARD_PREFIX = 'hablah-reloaded-'

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

export function setupVersionCheck(): void {
  const current = __APP_VERSION__
  const check = async () => {
    if (document.visibilityState !== 'visible') return
    const server = await fetchServerVersion()
    if (!server || server === current) return
    const guard = RELOAD_GUARD_PREFIX + server // recargamos UNA vez por versión nueva
    if (sessionStorage.getItem(guard)) return
    sessionStorage.setItem(guard, '1')
    location.reload()
  }
  void check() // al arrancar
  document.addEventListener('visibilitychange', () => void check()) // al volver a foco (PWA)
  window.addEventListener('focus', () => void check())
}

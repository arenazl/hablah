/**
 * Trace helper para emitir eventos estructurados desde el frontend hacia el
 * backend, donde quedan correlacionados por session_id con los eventos del
 * engine de voz, grammar, topic_brief, etc.
 *
 * Uso:
 *   trace('ws.client.opened', sessionId, { url })
 *   trace('audio.playback.started', sessionId)
 *   trace('audio.playback.error', sessionId, { error: e.message })
 *
 * Fire-and-forget: el fetch nunca falla user-facing. Si el backend no
 * responde, simplemente se pierde el evento (no afecta la sesion).
 */
import { API_BASE_URL } from '../services/api'

let inFlight = 0
const MAX_IN_FLIGHT = 4
const queue: Array<{ event: string; session_id?: number; data?: Record<string, unknown> }> = []

async function flush() {
  while (queue.length > 0 && inFlight < MAX_IN_FLIGHT) {
    const item = queue.shift()
    if (!item) break
    inFlight++
    try {
      // No-auth: el endpoint de trace es publico igual que /errors/frontend
      await fetch(`${API_BASE_URL}/errors/trace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
        keepalive: true,
      })
    } catch {
      // ignore
    } finally {
      inFlight--
    }
  }
}

export function trace(
  event: string,
  sessionId?: number | null,
  data?: Record<string, unknown>,
) {
  queue.push({
    event,
    session_id: sessionId ?? undefined,
    data: data ? { ...data, ts_client: Date.now() } : { ts_client: Date.now() },
  })
  // Disparamos asincrono — no bloqueamos al caller
  void flush()
}

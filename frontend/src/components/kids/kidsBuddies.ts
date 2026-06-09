/**
 * Catálogo de "amiguitos" (personajes animados) que el chico elige al inicio
 * de la sesión kids. Reemplazan al orbe: el elegido acompaña la clase y
 * reacciona al audio.
 *
 * Los Lottie JSON viven en /public/animals/ y se cargan por fetch (lazy, fuera
 * del bundle). El hook useLottieJson cachea cada animación en memoria.
 */
import { useEffect, useState } from 'react'

export interface BuddyDef {
  id: string
  /** Nombre cariñoso que ve el chico (no lee, pero lo escucha el adulto). */
  label: string
  /** Ruta al Lottie JSON en /public/animals/. */
  file: string
  /** Voz prebuilt de Gemini Live para este personaje (Nivel 1: voz por animal). */
  voice: string
}

export const KIDS_BUDDIES: BuddyDef[] = [
  { id: 'perro', label: 'Perrito', file: '/animals/perro.json', voice: 'Puck' },
  { id: 'dino', label: 'Dino', file: '/animals/dino.json', voice: 'Charon' },
  { id: 'conejo', label: 'Conejito', file: '/animals/conejo.json', voice: 'Leda' },
  { id: 'leon', label: 'León', file: '/animals/leon.json', voice: 'Fenrir' },
  { id: 'oso', label: 'Osito', file: '/animals/oso.json', voice: 'Aoede' },
  { id: 'superheroe', label: 'Súper Héroe', file: '/animals/superheroe.json', voice: 'Orus' },
]

export const BUDDY_STORAGE_KEY = 'hablah_kids_buddy_v1'

/** Clave de storage del personaje, por perfil de nene (el padre maneja varios). */
function buddyKey(kidKey: string): string {
  return `${BUDDY_STORAGE_KEY}_${kidKey}`
}

export function getSavedBuddyId(kidKey: string): string | null {
  try {
    return localStorage.getItem(buddyKey(kidKey))
  } catch {
    return null
  }
}

export function saveBuddyId(kidKey: string, id: string): void {
  try {
    localStorage.setItem(buddyKey(kidKey), id)
  } catch {
    /* localStorage no disponible: la elección dura solo esta sesión */
  }
}

/** Reset: el padre vuelve a dejar que el nene elija (muestra el picker de nuevo). */
export function clearSavedBuddyId(kidKey: string): void {
  try {
    localStorage.removeItem(buddyKey(kidKey))
  } catch {
    /* noop */
  }
}

export function getBuddyById(id: string | null | undefined): BuddyDef {
  return KIDS_BUDDIES.find((b) => b.id === id) ?? KIDS_BUDDIES[0]
}

// Cache en memoria de los JSON ya cargados (evita refetch al re-renderizar).
const jsonCache = new Map<string, object>()

/**
 * Carga (y cachea) un Lottie JSON desde /public/animals/.
 * Devuelve { data, error } — data null mientras carga o si falló.
 */
export function useLottieJson(file: string): { data: object | null; error: boolean } {
  const [data, setData] = useState<object | null>(jsonCache.get(file) ?? null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cached = jsonCache.get(file)
    if (cached) {
      setData(cached)
      setError(false)
      return
    }
    setData(null)
    setError(false)
    fetch(file)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json: object) => {
        if (cancelled) return
        jsonCache.set(file, json)
        setData(json)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [file])

  return { data, error }
}

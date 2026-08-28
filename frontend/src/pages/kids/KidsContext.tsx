/**
 * KidsContext: provee el perfil kid actual (real desde /api/kids/me o fallback mock).
 *
 * Si hay token kid en localStorage 'kids_token' -> fetch /api/kids/me con ese Bearer.
 * Si falla o no hay token -> usa MOCK_KID y el age_group elegido en KidsAgeSelect.
 *
 * Estrategia: el flow de adulto-cambiando-a-perfil-hijo guarda 'kids_token' en
 * localStorage y eso desbloquea datos reales. La pantalla de seleccion de edad
 * es solo para preview/demo sin login.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { KidsAgeGroup } from './KidsAgeSelect'
import { KIDS_AGE_KEY } from './KidsAgeSelect'
import { API_BASE_URL } from '../../services/api'

export const KIDS_TOKEN_KEY = 'kids_token'

export interface KidProfile {
  id: number | null
  name: string
  age_group: KidsAgeGroup
  avatar_color: string
  coins: number
  rank_slug: string
  charlas_count: number
  is_real: boolean // false = mock/preview
  buddy_id: string | null // personaje elegido, persistido en BD (users.kid_buddy_id)
}

const FALLBACK_KID: KidProfile = {
  id: null,
  name: 'Explorador',
  age_group: 'mini',
  avatar_color: '#FF6AA9',
  coins: 0,
  rank_slug: 'curioso',
  charlas_count: 0,
  is_real: false,
  buddy_id: null,
}

interface KidsContextValue {
  kid: KidProfile
  loading: boolean
  reload: () => Promise<void>
  logoutKid: () => void
}

const Ctx = createContext<KidsContextValue | null>(null)

export function KidsProvider({ children }: { children: ReactNode }) {
  const [kid, setKid] = useState<KidProfile>(FALLBACK_KID)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const storedAge = (localStorage.getItem(KIDS_AGE_KEY) as KidsAgeGroup) || 'mini'
      const token = localStorage.getItem(KIDS_TOKEN_KEY)

      if (token) {
        const res = await fetch(`${API_BASE_URL}/kids/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setKid({
            id: data.id,
            name: data.name,
            age_group: (data.age_group as KidsAgeGroup) || storedAge,
            avatar_color: data.avatar_color,
            coins: data.coins,
            rank_slug: data.rank_slug,
            charlas_count: data.charlas_count,
            is_real: true,
            buddy_id: data.buddy_id ?? null,
          })
          return
        }
        // token invalido: lo borramos
        localStorage.removeItem(KIDS_TOKEN_KEY)
      }

      // Fallback: usar age_group del localStorage + mock data
      setKid({
        ...FALLBACK_KID,
        age_group: storedAge,
      })
    } catch (e) {
      setKid({ ...FALLBACK_KID })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const logoutKid = () => {
    localStorage.removeItem(KIDS_TOKEN_KEY)
    localStorage.removeItem(KIDS_AGE_KEY)
    load()
  }

  return (
    <Ctx.Provider value={{ kid, loading, reload: load, logoutKid }}>
      {children}
    </Ctx.Provider>
  )
}

export function useKid(): KidsContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useKid debe usarse dentro de KidsProvider')
  return ctx
}

// Niveles narrativos centralizados
export const KIDS_RANKS = [
  { slug: 'curioso', name: 'Curioso', minCharlas: 0 },
  { slug: 'explorador', name: 'Explorador', minCharlas: 10 },
  { slug: 'aventurero', name: 'Aventurero', minCharlas: 25 },
  { slug: 'capitan', name: 'Capitán', minCharlas: 50 },
  { slug: 'embajador', name: 'Embajador', minCharlas: 100 },
]

export function rankInfo(slug: string) {
  const idx = KIDS_RANKS.findIndex((r) => r.slug === slug)
  const current = KIDS_RANKS[idx] ?? KIDS_RANKS[0]
  const next = KIDS_RANKS[idx + 1] ?? null
  return { current, next, idx }
}

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import api, { authAPI } from '../services/api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cada cuánto pedirle al backend que reconfirme el user (datos pueden cambiar
// vía PATCH /users/{id} desde Configuración, gerente cambiando metas, etc.).
const REFRESH_INTERVAL_MS = 5 * 60 * 1000  // 5 min

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const r = await authAPI.me()
      setUser(r.data)
    } catch {
      // 401 cleanup ya lo maneja el interceptor de axios.
      // Otros errores: ignorar y reintentar en el próximo tick.
    }
  }, [])

  // Carga inicial al montar la app
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`
      authAPI.me()
        .then((r) => setUser(r.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  // Auto-refresh periódico + cuando la pestaña vuelve a tener foco
  useEffect(() => {
    if (!user) return
    const interval = setInterval(refreshUser, REFRESH_INTERVAL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') refreshUser() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refreshUser)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refreshUser)
    }
  }, [user, refreshUser])

  const login = async (email: string, password: string) => {
    const r = await authAPI.login(email, password)
    const token = r.data.access_token
    localStorage.setItem('token', token)
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    setUser(r.data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common.Authorization
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, isLoading, login, logout, refreshUser, isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

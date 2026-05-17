import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type ThemeMode = 'light' | 'dark'
const STORAGE_KEY = 'beyker-theme'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    if (saved === 'light' || saved === 'dark') return saved
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: setThemeState,
      toggle: () => setThemeState((t) => (t === 'light' ? 'dark' : 'light')),
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}

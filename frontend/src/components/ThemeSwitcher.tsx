import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeSwitcher() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-all duration-200 active:scale-95"
      title={theme === 'light' ? 'Pasar a oscuro' : 'Pasar a claro'}
    >
      {theme === 'light'
        ? <Moon className="h-5 w-5" />
        : <Sun className="h-5 w-5" />}
    </button>
  )
}

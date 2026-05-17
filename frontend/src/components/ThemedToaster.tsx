import { Toaster } from 'sonner'
import { useTheme } from '../contexts/ThemeContext'

export function ThemedToaster() {
  const { theme } = useTheme()
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      theme={theme}
      toastOptions={{
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
        },
      }}
    />
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemedToaster } from './components/ThemedToaster'
import { useAuth } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { Landing } from './pages/Landing'
import { WebApp } from './pages/WebApp'
import { Backoffice } from './pages/Backoffice'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-app)' }}
      >
        <div className="flex flex-col items-center gap-3 animate-fade-in-up">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold animate-pulse-glow"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-accent)',
              fontFamily: 'Georgia, serif',
              fontSize: 22,
            }}
          >
            h
          </div>
          <div
            className="w-32 h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--border-color)' }}
          >
            <div className="h-full animate-shimmer" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/app" replace />
  return <Landing />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/app/*"
          element={
            <AuthGate>
              <WebApp />
            </AuthGate>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AuthGate>
              <Backoffice />
            </AuthGate>
          }
        />
      </Routes>
      <ThemedToaster />
    </>
  )
}

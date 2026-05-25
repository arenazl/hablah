import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemedToaster } from './components/ThemedToaster'
import { useAuth } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { Home as Landing } from './pages/landing/Home'
import { HowItWorks } from './pages/landing/HowItWorks'
import { Tutors } from './pages/landing/Tutors'
import { Topics } from './pages/landing/Topics'
import { Pricing } from './pages/landing/Pricing'
import { Faq } from './pages/landing/Faq'
import { KidsHome } from './pages/kids/KidsHome'
import { KidsAgeSelect } from './pages/kids/KidsAgeSelect'
import { KidsTopicsAll, KidsCollection, KidsAdventures, KidsProfile } from './pages/kids/KidsPages'
import { KidsSession } from './pages/kids/KidsSession'
import { KidsProvider } from './pages/kids/KidsContext'
import { GuestRoom } from './pages/GuestRoom'
import { WebApp } from './pages/WebApp'
import { Backoffice } from './pages/Backoffice'
import { AudioTuningPage } from './pages/AudioTuningPage'

function AuthGate({ children, allowKidMode = false }: { children: React.ReactNode; allowKidMode?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth()

  // Si hay un kid_token activo y NO estamos en una ruta que permita modo kid,
  // redirigir al modo kids para no salir del entorno seguro
  if (!allowKidMode && typeof window !== 'undefined' && localStorage.getItem('kids_token')) {
    return <Navigate to="/kids" replace />
  }

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
  // Si hay perfil hijo activo, "/" siempre devuelve a /kids
  if (typeof window !== 'undefined' && localStorage.getItem('kids_token')) {
    return <Navigate to="/kids" replace />
  }
  // Si ya confirmamos sesión, ir a la app
  if (isAuthenticated) return <Navigate to="/app" replace />
  // Mientras carga el auth: solo esperamos (sin pintar) si HAY token, porque
  // probablemente sea un usuario logueado que va a ser redirigido a /app.
  // Si NO hay token (visitante anónimo, Googlebot, crawler de IA), mostramos
  // la landing pública de inmediato para que el contenido esté en el HTML.
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token')
  if (isLoading && hasToken) return null
  return <Landing />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/como-funciona" element={<HowItWorks />} />
        <Route path="/tutores" element={<Tutors />} />
        <Route path="/topicos" element={<Topics />} />
        <Route path="/precios" element={<Pricing />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/kids" element={<KidsProvider><KidsHome /></KidsProvider>} />
        <Route path="/kids/seleccionar-edad" element={<KidsAgeSelect />} />
        <Route path="/kids/topicos" element={<KidsProvider><KidsTopicsAll /></KidsProvider>} />
        <Route path="/kids/coleccion" element={<KidsProvider><KidsCollection /></KidsProvider>} />
        <Route path="/kids/aventuras" element={<KidsProvider><KidsAdventures /></KidsProvider>} />
        <Route path="/kids/perfil" element={<KidsProvider><KidsProfile /></KidsProvider>} />
        <Route path="/kids/sesion/:topicId" element={<KidsProvider><KidsSession /></KidsProvider>} />
        <Route path="/kids/*" element={<KidsProvider><KidsHome /></KidsProvider>} />
        <Route path="/charla/:token" element={<GuestRoom />} />
        <Route path="/tune" element={<AudioTuningPage />} />
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

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemedToaster } from './components/ThemedToaster'
import { useAuth } from './contexts/AuthContext'
import { Home as Landing } from './pages/landing/Home'
import { HowItWorks } from './pages/landing/HowItWorks'
import { Tutors } from './pages/landing/Tutors'
import { Topics } from './pages/landing/Topics'
import { Pricing } from './pages/landing/Pricing'
import { Faq } from './pages/landing/Faq'
import { KidsProvider } from './pages/kids/KidsContext'

// Code-split: rutas pesadas se cargan on-demand para acelerar el first paint
// de la landing publica (SEO / visitantes anonimos). Las rutas de
// landing/marketing se mantienen sincronicas porque son las que necesitan
// renderizar de inmediato.
const TopicDetail = lazy(() =>
  import('./pages/landing/TopicDetail').then(m => ({ default: m.TopicDetail })),
)
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const WebApp = lazy(() => import('./pages/WebApp').then(m => ({ default: m.WebApp })))
const Backoffice = lazy(() => import('./pages/Backoffice').then(m => ({ default: m.Backoffice })))
const GuestRoom = lazy(() => import('./pages/GuestRoom').then(m => ({ default: m.GuestRoom })))
// F0-01: rutas públicas de test del motor v3 RETIRADAS (/training, /probar-orq,
// /orquestacion). ProbarOrquestacion y OrquestacionPanel se archivaron en pages/_attic/.
// 2026-07-23: /motor VUELVE como ruta pública SIN AuthGate (prod=QA pre-lanzamiento) —
// es el Probador de clases v2 (MotorPlaygroundPanel, el mismo de /admin/motor) con la
// clase en VIVO por voz. Re-poner el guard al lanzar.
const MotorPlayground = lazy(() =>
  import('./pages/MotorPlaygroundPanel').then(m => ({ default: m.MotorPlaygroundStandalone })),
)
// F0-04: TODO el laboratorio (/llm, /finaltest, /mini-test, /auditoria, /comparacion,
// /transcripciones*, /infra, /tune, /kids/kit, /kids/galeria, /kids/curar) vive ahora en UN
// solo arbol lazy montado en /lab/* (ver pages/lab/LabRoutes.tsx) — no se importa acá.
const LabRoutes = lazy(() => import('./pages/lab/LabRoutes'))
const KidsHome = lazy(() => import('./pages/kids/KidsHome').then(m => ({ default: m.KidsHome })))
const KidsAgeSelect = lazy(() =>
  import('./pages/kids/KidsAgeSelect').then(m => ({ default: m.KidsAgeSelect })),
)
const KidsSession = lazy(() =>
  import('./pages/kids/KidsSession').then(m => ({ default: m.KidsSession })),
)
const KidsTopicsAll = lazy(() =>
  import('./pages/kids/KidsPages').then(m => ({ default: m.KidsTopicsAll })),
)
const KidsCollection = lazy(() =>
  import('./pages/kids/KidsPages').then(m => ({ default: m.KidsCollection })),
)
const KidsAdventures = lazy(() =>
  import('./pages/kids/KidsPages').then(m => ({ default: m.KidsAdventures })),
)
const KidsProfile = lazy(() =>
  import('./pages/kids/KidsPages').then(m => ({ default: m.KidsProfile })),
)

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
        className="h-[100dvh] flex items-center justify-center"
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
  // "/" es la APLICACIÓN, no la landing comercial. Mientras el motor madura, el
  // único usuario es el dueño y entrar por la home a la página de ventas es una
  // molestia. La landing sigue publicada en /landing.
  // OJO: esto saca la landing del index, así que la home deja de tener contenido
  // indexable. Revertir cuando la app salga a la calle.
  if (typeof window !== 'undefined' && localStorage.getItem('kids_token')) {
    return <Navigate to="/kids" replace />
  }
  // Si no hay sesión, /app ya redirige solo a /login.
  return <Navigate to="/app" replace />
}

export default function App() {
  return (
    <>
      <Suspense fallback={null}>
        <Routes>
          {/* ═══ PRODUCTO ═══ */}
          <Route path="/" element={<RootRedirect />} />
          {/* La landing comercial dejó de ser el index: vive acá hasta el lanzamiento */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/como-funciona" element={<HowItWorks />} />
          <Route path="/tutores" element={<Tutors />} />
          <Route path="/topicos" element={<Topics />} />
          <Route path="/topicos/:slug" element={<TopicDetail />} />
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
          {/* Probador de clases del motor único, PÚBLICO sin login (prod=QA pre-lanzamiento):
              preview de las 9 capas + edición de placeholders + clase en VIVO por voz. */}
          <Route path="/motor" element={<MotorPlayground />} />

          {/* ═══ LABORATORIO (/lab/*) ═══
              Mesa de trabajo del motor (probar clases, ver el prompt armado, comparar modelos,
              curar vocab visual). Separado del producto: un solo arbol lazy (no entra al bundle
              inicial) + un solo guard de sesión (AuthGate, igual mecanismo que /admin/*) — sin
              login redirige a /login, nunca 404. Ver pages/lab/LabRoutes.tsx. */}
          <Route
            path="/lab/*"
            element={
              <AuthGate>
                <LabRoutes />
              </AuthGate>
            }
          />

          {/* Redirects de bookmarks viejos (rutas top-level pre-F0-04) → su equivalente /lab/*.
              Publicas a propósito: el redirect en sí no exige sesión, pero el destino /lab/* sí
              (AuthGate arriba), así que sin login terminan igual en /login. */}
          <Route path="/llm" element={<Navigate to="/lab/llm" replace />} />
          <Route path="/finaltest" element={<Navigate to="/lab/finaltest" replace />} />
          <Route path="/mini-test" element={<Navigate to="/lab/mini-test" replace />} />
          <Route path="/auditoria" element={<Navigate to="/lab/auditoria" replace />} />
          <Route path="/auditoría" element={<Navigate to="/lab/auditoria" replace />} />
          <Route path="/comparacion" element={<Navigate to="/lab/comparacion" replace />} />
          <Route path="/comparación" element={<Navigate to="/lab/comparacion" replace />} />
          <Route path="/transcripciones" element={<Navigate to="/lab/transcripciones" replace />} />
          <Route
            path="/transcripciones-vocab"
            element={<Navigate to="/lab/transcripciones-vocab" replace />}
          />
          <Route
            path="/transcripciones-vocab/"
            element={<Navigate to="/lab/transcripciones-vocab" replace />}
          />
          <Route path="/infra" element={<Navigate to="/lab/infra" replace />} />
          <Route path="/tune" element={<Navigate to="/lab/tune" replace />} />
          <Route path="/kids/kit" element={<Navigate to="/lab/kids/kit" replace />} />
          <Route path="/kids/galeria" element={<Navigate to="/lab/kids/galeria" replace />} />
          <Route path="/kids/galería" element={<Navigate to="/lab/kids/galeria" replace />} />
          <Route path="/kids/curar" element={<Navigate to="/lab/kids/curar" replace />} />
        </Routes>
      </Suspense>
      <ThemedToaster />
    </>
  )
}

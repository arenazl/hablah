import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, Mic, Languages, Flame } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const HABLAH_GREEN = '#00B37E'
const HABLAH_GREEN_DARK = '#008F63'
const HABLAH_INK = '#0E1614'
const HABLAH_TINT = '#E6F7F1'

export function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@hablah.app')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (document.getElementById('hablah-google-fonts')) return
    const link = document.createElement('link')
    link.id = 'hablah-google-fonts'
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
    document.head.appendChild(link)
  }, [])

  if (isAuthenticated) return <Navigate to="/" replace />

  const doLogin = async (emailToUse: string, passwordToUse: string) => {
    setLoading(true)
    try {
      await login(emailToUse, passwordToUse)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await doLogin(email, password)
  }

  const quickLoginAsAdmin = () => doLogin('admin@hablah.app', 'admin123')
  const quickLoginAsStudent = () => doLogin('demo@hablah.app', 'demo123')

  return (
    <div
      className="h-screen w-full flex overflow-hidden"
      style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif' }}
    >
      {/* IZQUIERDA: branding Habláh */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden p-12 xl:p-16"
        style={{ backgroundColor: HABLAH_INK, color: 'white' }}
      >
        {/* Green glow accents */}
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${HABLAH_GREEN}55, transparent)` }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${HABLAH_GREEN}33, transparent)` }}
        />

        {/* Logo header */}
        <div className="relative flex items-center gap-3 mb-auto">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: HABLAH_GREEN, color: 'white', fontWeight: 900, fontStyle: 'italic', fontSize: 24 }}
          >
            h
          </div>
          <div>
            <div className="font-extrabold text-xl text-white leading-tight">habláh</div>
            <div className="text-xs uppercase tracking-widest" style={{ color: 'rgba(232,236,234,.5)' }}>
              Hablás. Aprendés.
            </div>
          </div>
        </div>

        {/* Headline central */}
        <div className="relative my-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-6"
            style={{ backgroundColor: `${HABLAH_GREEN}26`, color: HABLAH_GREEN }}
          >
            <Flame className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">5 minutos por día</span>
          </div>
          <h1
            className="text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight"
            style={{ letterSpacing: '-0.025em' }}
          >
            Tu próxima<br />
            charla te está<br />
            <span style={{ color: HABLAH_GREEN }}>esperando.</span>
          </h1>
          <p
            className="mt-6 text-base xl:text-lg max-w-md leading-relaxed"
            style={{ color: 'rgba(232,236,234,.75)' }}
          >
            Conversaciones reales con un tutor de IA que se adapta a tu nivel, tus intereses y tus errores. Sin exámenes, sin lecciones lineales.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            <Feature icon={Mic} label="Práctica" value="por voz" />
            <Feature icon={Languages} label="Idiomas" value="3 activos" />
            <Feature icon={Flame} label="Racha" value="diaria" />
          </div>
        </div>

        {/* Footer */}
        <div className="relative mt-auto text-xs flex items-center justify-between" style={{ color: 'rgba(232,236,234,.45)' }}>
          <div>Habláh · v0.1 MVP</div>
          <div>Hecho en LatAm</div>
        </div>
      </div>

      {/* DERECHA: form */}
      <div
        className="flex-1 lg:flex-none lg:w-[480px] xl:w-[520px] flex items-center justify-center p-6"
        style={{ background: '#FAFBFA' }}
      >
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: HABLAH_GREEN, color: 'white', fontWeight: 900, fontStyle: 'italic', fontSize: 24 }}
            >
              h
            </div>
            <div>
              <div className="font-extrabold text-lg leading-tight" style={{ color: '#0D1412' }}>habláh</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: '#5A625F' }}>
                Hablás. Aprendés.
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-extrabold mb-1" style={{ color: '#0D1412', letterSpacing: '-0.02em' }}>
            Bienvenido de vuelta
          </h2>
          <p className="text-sm mb-8" style={{ color: '#5A625F' }}>
            Entrá para seguir tu charla diaria.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs uppercase tracking-wider font-bold mb-1.5"
                style={{ color: '#5A625F' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border transition-all"
                style={{
                  borderColor: 'rgba(13,20,18,.14)',
                  background: 'white',
                  color: '#0D1412',
                  fontSize: 15,
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = HABLAH_GREEN
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${HABLAH_TINT}`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(13,20,18,.14)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs uppercase tracking-wider font-bold mb-1.5"
                style={{ color: '#5A625F' }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border transition-all"
                style={{
                  borderColor: 'rgba(13,20,18,.14)',
                  background: 'white',
                  color: '#0D1412',
                  fontSize: 15,
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = HABLAH_GREEN
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${HABLAH_TINT}`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(13,20,18,.14)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: HABLAH_GREEN,
                color: 'white',
                fontSize: 15,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = HABLAH_GREEN_DARK
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = `0 8px 22px ${HABLAH_GREEN}4D`
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = HABLAH_GREEN
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(13,20,18,.14)' }} />
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#5A625F' }}>
                Acceso rápido demo
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(13,20,18,.14)' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={quickLoginAsStudent}
                disabled={loading}
                className="group flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                style={{ background: 'white', borderColor: 'rgba(13,20,18,.14)' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold"
                  style={{ background: HABLAH_GREEN }}
                >
                  L
                </div>
                <div className="text-sm font-bold" style={{ color: '#0D1412' }}>Usuario</div>
                <div className="text-[11px]" style={{ color: '#5A625F' }}>Lautaro · B2</div>
              </button>
              <button
                onClick={quickLoginAsAdmin}
                disabled={loading}
                className="group flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                style={{ background: 'white', borderColor: 'rgba(13,20,18,.14)' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold"
                  style={{ background: HABLAH_INK }}
                >
                  A
                </div>
                <div className="text-sm font-bold" style={{ color: '#0D1412' }}>Admin</div>
                <div className="text-[11px]" style={{ color: '#5A625F' }}>App + Backoffice</div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs" style={{ color: '#5A625F' }}>
            ¿Todavía no tenés cuenta?{' '}
            <a href="/" className="font-semibold" style={{ color: HABLAH_GREEN_DARK }}>
              Empezá gratis
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3 border"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderColor: `${HABLAH_GREEN}33`,
      }}
    >
      <Icon className="h-4 w-4 mb-2" style={{ color: HABLAH_GREEN }} />
      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'rgba(232,236,234,.55)' }}>
        {label}
      </div>
      <div className="text-sm font-bold text-white mt-0.5">{value}</div>
    </div>
  )
}

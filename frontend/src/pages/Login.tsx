import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { LoginHero, VariantPicker } from './LoginHeroVariants'

const LOGIN_VARIANT_KEY = 'login_hero_variant'

const HABLAH_GREEN = '#00B37E'
const HABLAH_GREEN_DARK = '#008F63'
const HABLAH_TINT = '#E6F7F1'

export function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Variante del hero panel - persistida en localStorage para que el user
  // mantenga su preferencia entre sesiones.
  const [variant, setVariant] = useState<number>(() => {
    if (typeof window === 'undefined') return 1
    const stored = parseInt(localStorage.getItem(LOGIN_VARIANT_KEY) || '1', 10)
    return Number.isFinite(stored) && stored >= 1 && stored <= 6 ? stored : 1
  })
  const handleVariantChange = (v: number) => {
    setVariant(v)
    localStorage.setItem(LOGIN_VARIANT_KEY, String(v))
  }

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
      // Permitir usuario sin "@" → completamos con @hablah.app
      const normalized = emailToUse.includes('@') ? emailToUse : `${emailToUse.trim()}@hablah.app`
      await login(normalized, passwordToUse)
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

  return (
    <div
      className="h-screen w-full flex overflow-hidden"
      style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif' }}
    >
      {/* Botonera flotante para elegir variante del hero */}
      <div className="hidden lg:block">
        <VariantPicker variant={variant} onChange={handleVariantChange} />
      </div>

      {/* IZQUIERDA: hero panel (6 variantes intercambiables) */}
      <div className="hidden lg:flex flex-col flex-1 min-w-0">
        <LoginHero variant={variant} />
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
                Email o usuario
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="username"
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

          <div className="mt-6 text-center text-xs" style={{ color: '#5A625F' }}>
            ¿Todavía no tenés cuenta?{' '}
            <a href="/" className="font-semibold" style={{ color: HABLAH_GREEN_DARK }}>
              Empezá gratis
            </a>
          </div>

          <div className="mt-5 pt-5" style={{ borderTop: '1px dashed rgba(13,20,18,.12)' }}>
            <button
              type="button"
              onClick={() => navigate('/kids')}
              className="w-full py-3 rounded-xl font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
              style={{
                background: '#FFF7DD',
                color: '#7A5800',
                border: '2px solid #FFB800',
                fontSize: 14,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFE9A6'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFF7DD'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <span style={{ background: '#FFB800', color: '#3A2A00', padding: '2px 8px', borderRadius: 6, fontSize: 10, letterSpacing: '.08em' }}>KIDS</span>
              Entrar al modo Habi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


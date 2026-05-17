import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Home, ArrowRight, ClipboardList, GitBranch, Users, Sparkles, Briefcase, UserCheck, UserCog } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { BeykerLogo } from '../components/BeykerLogo'

const DEMO_USERS = [
  { email: 'gerente@beyker.demo', label: 'Patricio', role: 'Gerente', icon: Briefcase },
  { email: 'belen@beyker.demo',   label: 'Belen',    role: 'Coordinadora', icon: UserCog },
  { email: 'lucas@beyker.demo',   label: 'Lucas',    role: 'Vendedor', icon: UserCheck },
]

export function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('gerente@beyker.demo')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const doLogin = async (emailToUse: string, passwordToUse: string) => {
    setLoading(true)
    try {
      await login(emailToUse, passwordToUse)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Error al iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await doLogin(email, password)
  }

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail)
    await doLogin(demoEmail, 'admin123')
  }

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* IZQUIERDA: branding + storytelling */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden p-12 xl:p-16"
        style={{ backgroundColor: '#002554' }}
      >
        {/* Gold glow accents */}
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #c9a45a, transparent)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #c9a45a, transparent)' }}
        />

        {/* Logo header */}
        <div className="relative flex items-center gap-3 mb-auto">
          <BeykerLogo size={48} rounded={10} bg="#c9a45a" fg="#002554" />
          <div>
            <div className="font-bold text-lg text-white leading-tight">Coldwell Banker Beyker</div>
            <div className="text-xs text-slate-300">Plataforma de gestion</div>
          </div>
        </div>

        {/* Headline central */}
        <div className="relative my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
               style={{ backgroundColor: 'rgba(201, 164, 90, 0.15)', color: '#c9a45a' }}>
            <Sparkles className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Mayo 2026</span>
          </div>
          <h1 className="text-5xl xl:text-6xl font-bold leading-tight text-white tracking-tight">
            El metodo<br />
            de tu equipo,<br />
            <span style={{ color: '#c9a45a' }}>medido cada dia.</span>
          </h1>
          <p className="mt-6 text-base xl:text-lg text-slate-300 max-w-md leading-relaxed">
            La hoja de ruta diaria de cada asesor, configurable por rol, con analisis del cumplimiento en tiempo real. Sin opiniones, con datos.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            <Feature icon={ClipboardList} label="Rutina diaria" value="por rol" />
            <Feature icon={GitBranch} label="Pipeline AR" value="6 etapas" />
            <Feature icon={Users} label="Equipo" value="en vivo" />
          </div>
        </div>

        {/* Footer */}
        <div className="relative mt-auto text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Home className="h-3.5 w-3.5" />
            <span>Florida 826, CABA</span>
          </div>
          <div>v1.0 · MVP Beyker</div>
        </div>
      </div>

      {/* DERECHA: form */}
      <div className="flex-1 lg:flex-none lg:w-[480px] xl:w-[520px] flex items-center justify-center p-6 bg-[var(--bg-app)]">
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Logo mobile (solo se ve cuando el panel izq desaparece) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <BeykerLogo size={48} rounded={10} bg="#002554" fg="#c9a45a" />
            <div>
              <div className="font-bold text-base text-[var(--text-primary)] leading-tight">Coldwell Banker Beyker</div>
              <div className="text-xs text-[var(--text-secondary)]">Plataforma de gestion</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Iniciar sesion</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-8">Ingresa con tus credenciales del equipo.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold mb-1.5 text-[var(--text-secondary)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-lg border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--border-color)',
                  // @ts-ignore
                  '--tw-ring-color': '#c9a45a',
                }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold mb-1.5 text-[var(--text-secondary)]">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-lg border bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 transition-all"
                style={{
                  borderColor: 'var(--border-color)',
                  // @ts-ignore
                  '--tw-ring-color': '#c9a45a',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 relative overflow-hidden group flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #002554, #003876)',
                color: '#c9a45a',
              }}
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <span className="relative">{loading ? 'Ingresando...' : 'Ingresar'}</span>
              {!loading && <ArrowRight className="h-4 w-4 relative" />}
            </button>
          </form>

          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Acceso rápido demo
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={() => quickLogin(u.email)}
                  disabled={loading}
                  className="group flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                    style={{ backgroundColor: '#002554' }}
                  >
                    <u.icon className="h-4 w-4" style={{ color: '#c9a45a' }} />
                  </div>
                  <div className="text-xs font-semibold text-center leading-tight text-[var(--text-primary)]">
                    {u.label}
                  </div>
                  <div className="text-[10px] text-center leading-none" style={{ color: 'var(--text-secondary)' }}>
                    {u.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(201, 164, 90, 0.2)' }}>
      <Icon className="h-4 w-4 mb-2" style={{ color: '#c9a45a' }} />
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
      <div className="text-sm font-bold text-white mt-0.5">{value}</div>
    </div>
  )
}

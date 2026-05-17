/* BottomNav — barra de navegación inferior estilo iOS/Android para mobile.
   Solo visible en pantallas < lg. En desktop sigue mandando el sidebar lateral. */
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ClipboardList, MessageSquare, GitBranch, Users, LayoutDashboard,
  MoreHorizontal, X as XIcon, Building2, Calendar, FileText,
  GraduationCap, Layers, UserCog, Brain, UserCircle, Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface BottomItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

/** Items principales del bottom bar. El último siempre es "Más" (drawer).
   Dejamos 4 fijos + "Más" para que dé 5 items, óptimo para tap targets. */
const PRIMARY_ITEMS: BottomItem[] = [
  { label: 'DMO',      to: '/dmo',       icon: ClipboardList },
  { label: 'Inbox',    to: '/inbox',     icon: MessageSquare },
  { label: 'Clientes', to: '/clientes',  icon: Users },
  { label: 'Pipeline', to: '/pipeline',  icon: GitBranch },
]

/** Items que van al drawer cuando se toca "Más". Filtrado por rol después. */
const MORE_ITEMS: Array<BottomItem & { roles?: string[] }> = [
  { label: 'Dashboard',         to: '/',                  icon: LayoutDashboard },
  { label: 'Propiedades',       to: '/propiedades',       icon: Building2 },
  { label: 'Visitas',           to: '/visitas',           icon: Calendar },
  { label: 'Autorizaciones',    to: '/autorizaciones',    icon: FileText },
  { label: 'Coaches',           to: '/coaches',           icon: GraduationCap, roles: ['admin', 'gerente'] },
  { label: 'Templates DMO',     to: '/dmo-templates',     icon: Layers, roles: ['admin', 'gerente'] },
  { label: 'Asignaciones DMO',  to: '/asignaciones-dmo',  icon: UserCog, roles: ['admin', 'gerente'] },
  { label: 'Equipo',            to: '/equipo',            icon: Users, roles: ['admin', 'gerente'] },
  { label: 'Datos IA',          to: '/datos-ia',          icon: Brain, roles: ['admin', 'gerente'] },
  { label: 'Mi perfil',         to: '/mi-perfil',         icon: UserCircle },
  { label: 'Configuración',     to: '/configuracion',     icon: Settings },
]

export function BottomNav() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()

  const moreVisible = MORE_ITEMS.filter((n) => !n.roles || n.roles.includes(user?.role ?? ''))

  // Una pestaña del drawer está activa cuando matchea el path
  const moreIsActive = MORE_ITEMS.some((m) => location.pathname === m.to)

  return (
    <>
      <nav
        className="lg:hidden fixed left-0 right-0 z-40 flex items-stretch border-t"
        style={{
          bottom: 0,
          backgroundColor: 'var(--bg-topbar)',
          borderColor: 'var(--border-color)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -2px 8px rgba(14,43,79,0.06)',
        }}
      >
        {PRIMARY_ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-2.5 transition-all duration-200 active:scale-95 ${
                isActive ? 'font-semibold' : ''
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-accent)' : 'var(--text-secondary)',
              minHeight: 56,
            })}
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <it.icon className="h-5 w-5" />
                  {isActive && (
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    />
                  )}
                </div>
                <span className="text-[10px] leading-none">{it.label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-2.5 transition-all duration-200 active:scale-95"
          style={{
            color: moreIsActive ? 'var(--color-accent)' : 'var(--text-secondary)',
            minHeight: 56,
          }}
          aria-label="Más opciones"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] leading-none">Más</span>
        </button>
      </nav>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl animate-fade-in-up overflow-hidden flex flex-col"
            style={{
              backgroundColor: 'var(--bg-card)',
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
              maxHeight: '85vh',
            }}
          >
            {/* Handle visual */}
            <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }} />
            </div>

            <div className="flex-shrink-0 flex items-center justify-between px-5 pt-2 pb-3">
              <div>
                <h3 className="font-bold text-lg leading-tight">Menú completo</h3>
                {user && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {user.nombre} {user.apellido} · {user.role}
                  </p>
                )}
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 -mr-1 rounded-lg hover:bg-black/5">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
              <div className="grid grid-cols-3 gap-2">
                {moreVisible.map((it) => {
                  const isActive = location.pathname === it.to
                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end
                      onClick={() => setDrawerOpen(false)}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95"
                      style={{
                        backgroundColor: isActive ? 'var(--color-accent)' : 'var(--bg-card)',
                        borderColor: isActive ? 'var(--color-accent)' : 'var(--border-color)',
                        color: isActive ? 'var(--color-primary)' : 'var(--text-primary)',
                        minHeight: 72,
                      }}
                    >
                      <it.icon className="h-5 w-5" />
                      <span className="text-[11px] text-center leading-tight font-medium">{it.label}</span>
                    </NavLink>
                  )
                })}
              </div>

              {/* Cerrar sesión al final */}
              <button
                onClick={() => { logout(); setDrawerOpen(false) }}
                className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium active:scale-95 transition-all"
                style={{
                  borderColor: 'var(--color-danger)',
                  color: 'var(--color-danger)',
                  backgroundColor: 'transparent',
                }}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

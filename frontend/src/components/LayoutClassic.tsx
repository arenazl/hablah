/* LayoutClassic — shell editorial CB (Template Classic).
   Convive en paralelo con Layout.tsx — para revertir cambiar el import en App.tsx.
   - Topbar: brand-mark con BeykerLogo + título + omnibox (⌘K) + theme + user pill.
   - Sidebar: secciones agrupadas (Operación / Cartera / Equipo / Sistema) con
     header H6 uppercase, active rail dorado lateral + fondo navy + count pill,
     collapse a 68px persistido. Mobile: drawer overlay.
*/
import { ReactNode, useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, ChevronDown,
  LayoutDashboard, ClipboardList, Users, Building2, Calendar,
  GitBranch, FileText, Settings, LogOut, GraduationCap, Layers, UserCog,
  MessageSquare, Brain, UserCircle, Search, Bell,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeSwitcher } from './ThemeSwitcher'
import { BeykerLogo } from './BeykerLogo'
import { BottomNav } from './BottomNav'

interface NavItemDef {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
  count?: number
}

interface NavSection {
  label: string
  items: NavItemDef[]
}

const SECTIONS: NavSection[] = [
  {
    label: 'Operación',
    items: [
      { label: 'Dashboard',      to: '/',       icon: LayoutDashboard },
      { label: 'Mi DMO',         to: '/dmo',    icon: ClipboardList, count: 3 },
      { label: 'Inbox WhatsApp', to: '/inbox',  icon: MessageSquare,  count: 12 },
      { label: 'Pipeline',       to: '/pipeline', icon: GitBranch },
    ],
  },
  {
    label: 'Cartera',
    items: [
      { label: 'Clientes',       to: '/clientes',       icon: Users },
      { label: 'Propiedades',    to: '/propiedades',    icon: Building2 },
      { label: 'Visitas',        to: '/visitas',        icon: Calendar, count: 4 },
      { label: 'Autorizaciones', to: '/autorizaciones', icon: FileText },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { label: 'Coaches',          to: '/coaches',          icon: GraduationCap, roles: ['admin', 'gerente'] },
      { label: 'Templates DMO',    to: '/dmo-templates',    icon: Layers,        roles: ['admin', 'gerente'] },
      { label: 'Asignaciones DMO', to: '/asignaciones-dmo', icon: UserCog,       roles: ['admin', 'gerente'] },
      { label: 'Equipo',           to: '/equipo',           icon: Users,         roles: ['admin', 'gerente'] },
      { label: 'Datos IA',         to: '/datos-ia',         icon: Brain,         roles: ['admin', 'gerente'] },
      { label: 'Mi perfil',        to: '/mi-perfil',        icon: UserCircle },
    ],
  },
]

const FOOTER_ITEM: NavItemDef = {
  label: 'Configuración',
  to: '/configuracion',
  icon: Settings,
}

/* ---------------- NavItem ---------------- */

function NavItem({
  item, collapsed, onClick,
}: { item: NavItemDef; collapsed: boolean; onClick?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end
      onClick={onClick}
      className="group relative flex items-center gap-3 h-9 rounded-lg transition-all duration-150"
      style={{ paddingLeft: collapsed ? 0 : 10, paddingRight: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start' }}
    >
      {({ isActive }) => (
        <>
          {/* Active rail dorado lateral */}
          {isActive && (
            <span
              className="absolute pointer-events-none"
              style={{
                left: -14,
                top: 6,
                bottom: 6,
                width: 3,
                background: 'var(--gold-500)',
                borderRadius: '0 2px 2px 0',
              }}
            />
          )}
          {/* Fondo nav-item */}
          <span
            className="absolute inset-0 rounded-lg transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--navy-800)' : 'transparent',
              opacity: isActive ? 1 : 0,
            }}
          />
          {/* Hover overlay (visible solo cuando no está active) */}
          {!isActive && (
            <span
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            />
          )}
          <span
            className="relative flex-shrink-0"
            style={{ color: isActive ? '#fff' : 'rgba(248, 250, 252, 0.78)' }}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          {!collapsed && (
            <>
              <span
                className="text-sm font-medium relative truncate flex-1 min-w-0"
                style={{ color: isActive ? '#fff' : 'rgba(248, 250, 252, 0.92)' }}
              >
                {item.label}
              </span>
              {item.count != null && (
                <span
                  className="font-mono-tnum text-[11px] font-bold px-1.5 py-0.5 rounded-full relative"
                  style={{
                    backgroundColor: isActive ? 'var(--gold-500)' : 'rgba(255, 255, 255, 0.1)',
                    color: isActive ? 'var(--navy-900)' : 'var(--gold-300)',
                  }}
                >
                  {item.count}
                </span>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  )
}

/* ---------------- Sidebar contenido ---------------- */

function SidebarContent({
  collapsed, visibleSections, onItemClick,
}: {
  collapsed: boolean
  visibleSections: NavSection[]
  onItemClick?: () => void
}) {
  return (
    <>
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-3.5 space-y-1">
        {visibleSections.map((section, si) => (
          <div key={si} className="mb-2">
            {!collapsed && (
              <h6
                className="px-2.5 mt-3 mb-1.5 uppercase font-semibold"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'rgba(248, 250, 252, 0.45)',
                }}
              >
                {section.label}
              </h6>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((it) => (
                <NavItem key={it.to} item={it} collapsed={collapsed} onClick={onItemClick} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div
        className="flex-shrink-0 p-3"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <NavItem item={FOOTER_ITEM} collapsed={collapsed} onClick={onItemClick} />
      </div>
    </>
  )
}

/* ---------------- LayoutClassic ---------------- */

export function LayoutClassic({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem('layout:collapsed') === '1')

  useEffect(() => { localStorage.setItem('layout:collapsed', collapsed ? '1' : '0') }, [collapsed])

  const visibleSections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((n) => !n.roles || n.roles.includes(user?.role ?? '')),
  })).filter((s) => s.items.length > 0)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebarWidth = collapsed ? 68 : 248

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-app)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      {/* === Topbar === */}
      <header
        className="flex-shrink-0 h-16 flex items-stretch z-30"
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {/* Brand */}
        <div
          className="hidden lg:flex items-center gap-3 flex-shrink-0"
          style={{
            width: sidebarWidth,
            paddingLeft: collapsed ? 14 : 20,
            paddingRight: 14,
            borderRight: '1px solid var(--border-color)',
            transition: 'width .15s',
          }}
        >
          <BeykerLogo size={36} rounded={4} />
          {!collapsed && (
            <div className="flex flex-col leading-tight min-w-0">
              <strong
                className="text-[13px] font-semibold truncate"
                style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}
              >
                Coldwell Banker Beyker
              </strong>
              <small
                className="uppercase mt-0.5 truncate"
                style={{ fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '0.04em' }}
              >
                Plataforma de gestión
              </small>
            </div>
          )}
        </div>

        {/* Mobile brand (sin hamburguesa — la nav mobile vive en BottomNav) */}
        <div className="lg:hidden flex items-center gap-2 px-4">
          <BeykerLogo size={32} rounded={4} />
        </div>

        {/* Centro: collapse + omnibox */}
        <div className="flex items-center gap-3 flex-1 min-w-0 px-3 md:px-5">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:inline-flex p-2 rounded-lg transition-all duration-150 active:scale-95"
            style={{ color: 'var(--ink-3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-3)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? <ChevronRight className="h-[18px] w-[18px]" /> : <ChevronLeft className="h-[18px] w-[18px]" />}
          </button>

          <div
            className="hidden md:flex items-center gap-2.5 flex-1 max-w-xl h-9 px-3.5 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--surface-3)',
              border: '1px solid var(--border-color)',
              color: 'var(--ink-4)',
            }}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 truncate">Buscar clientes, propiedades, leads…</span>
            <span
              className="font-mono-tnum text-[11px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--ink-4)',
              }}
            >
              ⌘K
            </span>
          </div>
        </div>

        {/* Right cluster: notif + availability + theme + user pill + logout */}
        <div className="flex items-center gap-1.5 px-3 md:px-4 flex-shrink-0">
          <button
            className="relative p-2 rounded-lg transition-all duration-150"
            style={{ color: 'var(--ink-3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-3)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
            title="Notificaciones"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span
              className="absolute rounded-full"
              style={{
                width: 7,
                height: 7,
                top: 7,
                right: 7,
                background: 'var(--gold-500)',
                boxShadow: '0 0 0 2px var(--surface)',
              }}
            />
          </button>
          <ThemeSwitcher />
          {user && (
            <>
              <div
                className="hidden md:inline-flex items-center gap-2.5 h-9 pl-1 pr-2.5 rounded-full ml-1"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, var(--navy-700), var(--navy-900))',
                    color: 'var(--gold-300)',
                  }}
                >
                  {user.nombre[0]}{user.apellido[0]}
                </div>
                <div className="flex flex-col leading-tight min-w-0">
                  <strong className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {user.nombre} {user.apellido}
                  </strong>
                  <small className="text-[10.5px] capitalize truncate" style={{ color: 'var(--ink-4)' }}>
                    {user.role} · Beyker AR
                  </small>
                </div>
                <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--ink-5)' }} />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg transition-all duration-150 active:scale-95"
                style={{ color: 'var(--ink-3)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-3)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                title="Salir"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* === Body: sidebar + main === */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar desktop */}
        <aside
          className="hidden lg:flex flex-shrink-0 flex-col"
          style={{
            width: sidebarWidth,
            backgroundColor: 'var(--bg-sidebar)',
            color: 'var(--text-sidebar)',
            borderRight: '1px solid var(--border-color)',
            transition: 'width .15s',
          }}
        >
          <SidebarContent collapsed={collapsed} visibleSections={visibleSections} />
        </aside>

        {/* Main. En mobile reserva padding-bottom para el BottomNav (56px + safe-area).
            En lg+ no hace falta porque el sidebar lateral toma su lugar. */}
        <main
          className="flex-1 flex flex-col min-w-0 overflow-hidden pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0"
          style={{ backgroundColor: 'var(--bg-app)' }}
        >
          {children}
        </main>
      </div>

      {/* Bottom navigation SOLO en mobile (oculta en lg+) */}
      <BottomNav />
    </div>
  )
}

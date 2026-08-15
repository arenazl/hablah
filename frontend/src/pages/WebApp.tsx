import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { NavLink, Routes, Route, useLocation, Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { WEBAPP_CSS } from './webapp.css'
import { HOY_CSS } from './hoy.css'
import { MAPA_CSS } from './mapa.css'
import { PRACTICAR_CSS } from './practicar.css'
import { HISTORIAL_CSS } from './historial.css'
import { CONVO_BG_CSS } from './convo-bg.css'
import { meAPI, sessionsAPI, topicsAPI, templatesAPI, onboardingAPI, MeProfile, SessionData, Topic, Template, HeatmapCell, LevelProgress, TodayPayload } from '../services/api'
import { useLiveVoice } from '../hooks/useLiveVoice'
import { AgentAudioVisualizerAura } from '../components/agents-ui/agent-audio-visualizer-aura'
import CategorySelector from '../components/CategorySelector'
import { PracticarGalaxy } from '../components/PracticarGalaxy'
import { CoachPhrasePanels } from '../components/CoachPhrasePanels'
import QaPanel from './QaPanel'
import AdminUsersPanel from './AdminUsersPanel'
import { PRESETS, applyPreset, loadAudioSettings, type AudioPreset } from '../lib/audioSettings'
import confetti from 'canvas-confetti'
import { Gate, useFeatureFlag, type FeatureKey } from '../hooks/useFeatureFlag'
import { KidsParentSwitch } from './kids/KidsParentSwitch'
import { InviteFriendButton } from '../components/InviteFriendButton'
import { MicSelector } from '../components/MicSelector'
import { PushToTalkControl } from '../components/PushToTalkControl'

function KidsParentSwitchLazy() {
  return <KidsParentSwitch />
}

function ensureFont() {
  if (document.getElementById('hablah-google-fonts')) return
  const link = document.createElement('link')
  link.id = 'hablah-google-fonts'
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap'
  document.head.appendChild(link)
}

/* ──────── ICONS ──────── */
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
  </svg>
)
const MicIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v4" />
  </svg>
)
const MapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6" />
    <line x1="8" y1="3" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="21" />
  </svg>
)
const ClockIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const KidsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3" /><circle cx="16" cy="9" r="2.5" />
    <path d="M3 21a6 6 0 0 1 12 0" /><path d="M14 21a4 4 0 0 1 8 0" />
  </svg>
)
const UserIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

const VIEW_TITLES: Record<string, string> = {
  '/app': 'Hoy', '/app/practicar': 'Practicar',
  '/app/mapa': 'Mapa de progreso', '/app/historial': 'Historial', '/app/perfil': 'Perfil',
}

/**
 * Skeleton de pantalla mientras carga data. Aparece dentro del .main del AppShell
 * (la TopBar y Sidebar ya están renderizadas) → cero pantallazo blanco.
 */
function PageSkel({ variant = 'default' }: { variant?: 'default' | 'hero' | 'list' | 'grid' }) {
  return (
    <div className="skel-page">
      {variant !== 'list' && <div className="skel skel-hero" />}
      <div className="skel skel-line-lg" />
      {variant === 'grid' ? (
        <div className="skel-row">
          <div className="skel skel-card" /><div className="skel skel-card" /><div className="skel skel-card" />
        </div>
      ) : (
        <>
          <div className="skel skel-line" style={{ width: '92%' }} />
          <div className="skel skel-line" style={{ width: '78%' }} />
          <div className="skel skel-line" style={{ width: '65%' }} />
          <div className="skel-row" style={{ marginTop: 8 }}>
            <div className="skel skel-card" /><div className="skel skel-card" />
          </div>
        </>
      )}
    </div>
  )
}

/* ──────── ROOT ──────── */
export function WebApp() {
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [onboardingSkipped, setOnboardingSkipped] = useState(false)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem('hablah-theme') as 'light' | 'dark') || 'dark'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
    document.body.setAttribute('data-theme', themeMode)
    localStorage.setItem('hablah-theme', themeMode)
  }, [themeMode])
  const toggleTheme = useCallback(() => {
    setThemeMode(m => m === 'dark' ? 'light' : 'dark')
  }, [])
  const loc = useLocation()

  const refresh = useCallback(async () => {
    try {
      const p = await meAPI.profile()
      setProfile(p)
      // Si volvió a 0 intereses (ej. después de Reset), reactivar onboarding
      if (p.interests.length === 0) setOnboardingSkipped(false)
    } catch (e: any) {
      toast.error('No pudimos cargar tu perfil')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ensureFont()
    refresh()
  }, [refresh])

  // Cerrar drawer al cambiar de ruta
  useEffect(() => { setDrawerOpen(false) }, [loc.pathname])

  const navigate = useNavigate()
  // Onboarding solo si user nuevo (sin intereses) y no lo saltó en esta sesión
  const shouldOnboard = !loading && profile && profile.interests.length === 0 && !onboardingSkipped

  return (
    <div className="webapp-root" data-theme={themeMode}>
      <style>{WEBAPP_CSS}</style>
      <style>{HOY_CSS}</style>
      <style>{MAPA_CSS}</style>
      <style>{PRACTICAR_CSS}</style>
      <style>{HISTORIAL_CSS}</style>
      <style>{CONVO_BG_CSS}</style>
      <TopBar profile={profile} onMenuClick={() => setDrawerOpen(true)} themeMode={themeMode} onToggleTheme={toggleTheme} />
      <div className="shell">
        <Sidebar profile={profile} mobileOpen={drawerOpen} />
        {drawerOpen && <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />}
        <main className="main">
          <Routes>
            <Route path="/" element={<HoyView profile={profile} loading={loading} />} />
            <Route path="/practicar" element={<PracticarView profile={profile} onSessionEnd={refresh} />} />
            <Route path="/mapa" element={<MapaView profile={profile} />} />
            <Route path="/historial" element={<HistorialView />} />
            <Route path="/sesiones/:id" element={<SessionDetailView />} />
            <Route path="/perfil" element={<PerfilView profile={profile} onChange={refresh} />} />
            <Route path="/kids" element={<KidsParentSwitchLazy />} />
            <Route path="/qa" element={<QaPanel />} />
            <Route path="/admin/users" element={<AdminUsersPanel />} />
          </Routes>
        </main>
      </div>
      <MobileBar />
      {shouldOnboard && (
        <CategorySelector
          onStart={async () => { await refresh(); navigate('/app/practicar') }}
          onSkip={() => setOnboardingSkipped(true)}
        />
      )}
    </div>
  )
}

/* ──────── SIDEBAR ──────── */
function Sidebar({ profile, mobileOpen }: { profile: MeProfile | null; mobileOpen?: boolean }) {
  const user = profile?.user
  const initial = user?.nombre?.[0] || 'U'
  const pct = user?.cefr_level ? cefrPct(user.cefr_level) : 0
  const [auditOpen, setAuditOpen] = useState(false)
  return (
    <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="brand">
        <img src="/logos/hablah-mark.svg" alt="habláh" className="brand-mark-img" width="32" height="32" />
        <div className="brand-name">habláh</div>
      </div>
      <nav className="sidebar-nav">
        <SidebarItem to="/app" icon={<HomeIcon />} label="Hoy" exact />
        <SidebarItem to="/app/practicar" icon={<MicIcon />} label="Practicar" badge="DAILY" />
        {(profile as MeProfile & { feature_flags?: Record<string, { unlocked: boolean }> })?.feature_flags?.mapa_basico?.unlocked && (
          <SidebarItem to="/app/mapa" icon={<MapIcon />} label="Mapa de progreso" />
        )}
        <SidebarItem to="/app/historial" icon={<ClockIcon />} label="Historial" />
        <SidebarItem to="/app/kids" icon={<KidsIcon />} label="Modo Kids" badge="HABI" />
      </nav>

      <div className="sidebar-section">Tu progreso</div>
      <div style={{ padding: '0 18px' }}>
        <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)' }}>Nivel</span>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>{user?.cefr_level || '—'}</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,.1)', borderRadius: 3 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(232,236,234,.5)', marginTop: 6 }}>{pct}% hasta el siguiente nivel</div>
        </div>
      </div>

      {/* Tópicos activos (design handoff Hoy.html): el del día en verde, el resto neutro */}
      {(profile?.interests?.length ?? 0) > 0 && (
        <>
          <div className="sidebar-section">Tópicos activos</div>
          <div style={{ padding: '0 18px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {profile!.interests.slice(0, 5).map((t, i) => (
              <span key={t.id} style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 999, fontWeight: i === 0 ? 600 : 400,
                background: i === 0 ? 'rgba(0,179,126,.14)' : 'rgba(255,255,255,.04)',
                color: i === 0 ? '#7CE7BD' : 'rgba(232,236,234,.72)',
              }}>{t.title}</span>
            ))}
          </div>
        </>
      )}

      {user?.role === 'admin' && (
        <>
          <div className="sidebar-section">Administración</div>
          <nav className="sidebar-nav">
            <SidebarItem 
              to="/admin" 
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>} 
              label="Backoffice" 
            />
          </nav>
        </>
      )}
      <div className="sidebar-foot">
        <Link to="/app/perfil" className="user-card" style={{ textDecoration: 'none' }}>
          <div className="av">{initial.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name">{user?.nombre} {user?.apellido?.[0]}.</div>
            <div className="meta">Plan {user?.plan || 'free'}</div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation()
              localStorage.clear()
              window.location.href = '/login'
            }}
            title="Cerrar sesión"
            style={{
              background: 'transparent', border: 0, color: 'rgba(232,236,234,.5)',
              cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </Link>
      </div>
    </aside>
  )
}

function SidebarItem({ to, icon, label, badge, exact }: { to: string; icon: React.ReactNode; label: string; badge?: string; exact?: boolean }) {
  return (
    <NavLink to={to} end={exact} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      {icon}{label}{badge && <span className="badge">{badge}</span>}
    </NavLink>
  )
}

function TopBar({ profile, onMenuClick, themeMode, onToggleTheme }: { profile: MeProfile | null; onMenuClick?: () => void; themeMode: 'light' | 'dark'; onToggleTheme: () => void }) {
  const loc = useLocation()
  const nav = useNavigate()
  const title = VIEW_TITLES[loc.pathname] ?? 'Hoy'
  const streak = profile?.user?.streak_days ?? 0
  const user = profile?.user
  const initial = user?.nombre?.[0]?.toUpperCase() || 'U'
  const isDark = loc.pathname.startsWith('/app/practicar')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <header
      className="topbar"
      style={isDark ? {
        background: 'rgba(14,22,20,.92)',
        borderBottom: '1px solid rgba(255,255,255,.06)',
        color: 'white',
      } : undefined}
    >
      <div className="topbar-inner">
        <button
          className="hamburger-btn"
          aria-label="Abrir menú"
          onClick={onMenuClick}
          style={isDark ? { color: 'white' } : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <h1 style={isDark ? { color: 'white' } : undefined}>{title}</h1>
        <div className="topbar-right">
          {streak > 0 && (
            <div className="streak-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFB800"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17h2.4a2.6 2.6 0 0 0 2.6-2.6c0-1.6-1-3-2-4-2-2-1.5-4 .5-6-3.5 0-7 3-7 7 0 1 .5 2.5 1 3.1z" /></svg>
              <span><span className="tnum">{streak}</span><span className="l"> días</span></span>
            </div>
          )}
          <button
            className="settings-btn"
            aria-label={themeMode === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            onClick={onToggleTheme}
            style={isDark ? { color: 'white' } : undefined}
          >
            {themeMode === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/><path d="M12 20v2"/>
                <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
                <path d="M2 12h2"/><path d="M20 12h2"/>
                <path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="av-btn"
              aria-label="Perfil"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
              style={isDark ? { background: 'rgba(255,255,255,.08)', color: 'white' } : undefined}
            >
              {initial}
            </button>
            {menuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  minWidth: 240, background: 'var(--surface)',
                  border: '1px solid var(--border-1)', borderRadius: 12,
                  boxShadow: '0 14px 32px rgba(13,20,18,.16)',
                  padding: 6, zIndex: 50,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 999,
                    background: 'var(--primary-tint)', color: 'var(--primary-dark)',
                    display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14,
                  }}>{initial}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.nombre} {user?.apellido?.[0]}.
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Plan {user?.plan || 'free'}</div>
                  </div>
                </div>
                <div style={{ height: 1, background: 'var(--border-1)', margin: '4px 0' }} />
                <button
                  onClick={() => { setMenuOpen(false); nav('/app/perfil') }}
                  style={menuItemStyle}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                  Mi perfil
                </button>
                <div style={{ height: 1, background: 'var(--border-1)', margin: '4px 0' }} />
                <button
                  onClick={() => { localStorage.clear(); window.location.href = '/login' }}
                  style={{ ...menuItemStyle, color: 'var(--danger)' }}
                  role="menuitem"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent',
  cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)',
  textAlign: 'left',
}

/* Mancuerna para CTA "Entrenar" */
const DumbbellIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="9" width="3" height="6" rx="1" />
    <rect x="19" y="9" width="3" height="6" rx="1" />
    <rect x="6" y="7" width="3" height="10" rx="1" />
    <rect x="15" y="7" width="3" height="10" rx="1" />
    <line x1="9" y1="12" x2="15" y2="12" />
  </svg>
)
const PlusIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

function MobileBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMoreOpen(false) }, [loc.pathname])
  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [moreOpen])

  const go = (path: string) => { setMoreOpen(false); nav(path) }
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return (
    <>
      {moreOpen && <div className="more-backdrop" onClick={() => setMoreOpen(false)} />}
      <nav className="mobile-bar">
        <NavLink to="/app" end className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}><HomeIcon /><span>Hoy</span></NavLink>
        <NavLink to="/app/mapa" className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}><MapIcon /><span>Mapa</span></NavLink>
        <NavLink to="/app/practicar" className="mb-item cta" aria-label="Entrenar"><DumbbellIcon size={24} /><span>Entrenar</span></NavLink>
        <NavLink to="/app/historial" className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}><ClockIcon /><span>Historial</span></NavLink>
        <div ref={moreRef} className="mb-more-wrap">
          <button
            className={`mb-item${moreOpen ? ' active' : ''}`}
            onClick={() => setMoreOpen(v => !v)}
            aria-label="Más opciones"
            aria-expanded={moreOpen}
          >
            <PlusIcon /><span>Más</span>
          </button>
          {moreOpen && (
            <div className="more-sheet" role="menu">
              <button className="more-item" onClick={() => go('/app/perfil')}>
                <UserIcon size={18} /><span>Perfil</span>
              </button>
              <button className="more-item" onClick={() => go('/app/historial')}>
                <ClockIcon size={18} /><span>Historial</span>
              </button>
              <button className="more-item" onClick={() => go('/app/mapa')}>
                <MapIcon /><span>Mapa de progreso</span>
              </button>
              <div className="more-sep" />
              <button className="more-item danger" onClick={logout}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/></svg>
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

/* ──────── HOY · onboarding hero (modo cero) ──────── */
function HoyOnboardingHero({
  userName, langLabel, minutes, onStart,
}: { userName: string; langLabel: string; minutes: number; onStart: () => void }) {
  return (
    <div style={{
      minHeight: 'calc(100dvh - 64px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', textAlign: 'center', gap: 16,
      background: 'radial-gradient(ellipse at 50% 30%, rgba(0,179,126,.12) 0%, transparent 60%)',
    }}>
      <div style={{
        fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 800,
        color: 'var(--primary)', marginBottom: 4, animation: 'pg-fade-in .5s ease-out',
      }}>
        Bienvenido, {userName}
      </div>
      <h1 style={{
        fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900,
        letterSpacing: '-.03em', lineHeight: 1.05, margin: 0,
        maxWidth: 680, color: 'var(--fg-1)',
        animation: 'pg-fade-in .5s ease-out .05s backwards',
      }}>
        Tu primera charla en <span style={{ color: 'var(--primary)' }}>{langLabel}</span><br />
        son solo {minutes} minutos.
      </h1>
      <p style={{
        fontSize: 17, color: 'var(--fg-3)', maxWidth: 540, lineHeight: 1.5, margin: '8px 0 24px',
        animation: 'pg-fade-in .5s ease-out .15s backwards',
      }}>
        Tocá el botón. El tutor te va a saludar y te va a preguntar de qué querés hablar.
        Vos respondé como puedas — no hay errores que cuesten nada.
      </p>
      <button
        onClick={onStart}
        style={{
          padding: '20px 44px', fontSize: 18, fontWeight: 800,
          background: 'linear-gradient(135deg, #00B37E 0%, #008F63 100%)',
          color: 'white', border: 0, borderRadius: 999, cursor: 'pointer',
          boxShadow: '0 14px 36px rgba(0,179,126,.45), inset 0 1px 0 rgba(255,255,255,.2)',
          transition: 'transform .15s cubic-bezier(.2,.8,.2,1), box-shadow .25s',
          display: 'inline-flex', alignItems: 'center', gap: 12,
          animation: 'pg-fade-in .5s ease-out .25s backwards',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)' }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(.97)' }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="9" y="3" width="6" height="11" rx="3"/>
          <path d="M5 11a7 7 0 0 0 14 0"/>
          <path d="M12 18v3"/>
        </svg>
        Empezar mi primera charla
      </button>
      <div style={{
        fontSize: 13, color: 'var(--fg-4)', marginTop: 16,
        animation: 'pg-fade-in .5s ease-out .35s backwards',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
        </svg>
        {minutes} minutos · 1 sola sesión por día
      </div>
    </div>
  )
}

/* ──────── HOY ──────── */
function HoyView({ profile, loading }: { profile: MeProfile | null; loading: boolean }) {
  const nav = useNavigate()
  const [recent, setRecent] = useState<SessionData[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([])
  const [levelProg, setLevelProg] = useState<LevelProgress | null>(null)
  const [today, setToday] = useState<TodayPayload | null>(null)
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({})
  // Indice del tema sugerido. Si el user da dislike, avanzamos a la siguiente
  // sugerencia. Se persiste por dia en localStorage para no resetear en refresh.
  const todayKey = `hoy_topic_idx_${new Date().toISOString().slice(0, 10)}`
  const [topicIdx, setTopicIdx] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(todayKey) || '0', 10) || 0 } catch { return 0 }
  })
  useEffect(() => {
    sessionsAPI.list().then(setRecent).catch(() => {})
    meAPI.streakHeatmap(28).then(setHeatmap).catch(() => {})
    meAPI.levelProgress().then(setLevelProg).catch(() => {})
    meAPI.today().then(setToday).catch(() => {})
  }, [])

  if (loading) return <PageSkel variant="hero" />
  if (!profile) return <div className="view"><div style={{ color: 'var(--danger)' }}>Error cargando perfil</div></div>

  const u = profile.user
  const tpl = profile.active_template
  const safeIdx = profile.interests.length > 0 ? topicIdx % profile.interests.length : 0
  const firstInterest = profile.interests[safeIdx]
  const greeting = `Buen día, ${u.nombre}`
  const minutes = u.target_minutes_per_session
  const topicTitle = firstInterest?.title || 'Tema libre'
  const topicCategory = firstInterest?.category || ''

  const handleDislike = async () => {
    if (profile.interests.length <= 1) {
      toast('No hay otros temas disponibles')
      return
    }
    const removed = profile.interests[safeIdx]
    if (!removed) return
    // Borrar el topic de los intereses del user — no vuelve a aparecer.
    try {
      await topicsAPI.removeInterest(removed.id)
      toast.success(`"${removed.title}" eliminado de tus temas`)
    } catch {
      toast.error('No pudimos eliminarlo, intentá de nuevo')
      return
    }
    // Mover indice al siguiente (el ARRAY del profile aun no se refresca hasta
    // el proximo /me/profile, asi que rotamos local).
    const next = (safeIdx + 1) % Math.max(1, profile.interests.length - 1)
    setTopicIdx(next)
    try { localStorage.setItem(todayKey, String(next)) } catch {}
  }
  const handleLike = () => {
    toast.success('¡Dale!')
  }
  const tutorName = tpl?.name || 'Habláh'
  const tutorRigor = (tpl as any)?.rigor ?? 3
  const tutorWarmth = (tpl as any)?.warmth_level ?? 3
  const tutorInitial = (tutorName.split(' ')[1] || tutorName)[0] || 'T'
  const langLabel = u.target_language === 'en' ? 'inglés' : u.target_language === 'pt' ? 'portugués' : u.target_language === 'it' ? 'italiano' : u.target_language
  const cefrPctVal = cefrPct(u.cefr_level || 'B1')
  const nextLevel = nextCefr(u.cefr_level || 'B1')
  const totalSessions = levelProg?.sessions_total ?? profile.total_sessions ?? 0
  const hoursSpoken = levelProg ? levelProg.hours_spoken.toFixed(1) : ((recent.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)) / 3600).toFixed(1)
  const fluencyDelta30 = levelProg?.fluency_delta_30d ?? null
  const heatmapCells = heatmap.length > 0 ? heatmapFromBackend(heatmap) : buildHeatmap(recent)

  // Streak / mejor racha
  const streak = u.streak_days || 0
  const best = Math.max(u.streak_best || 0, streak)
  const daysToBeat = Math.max(0, best - streak)

  // In-context prompts según el foco del día
  const focusKeyword = (firstInterest as any)?.keywords?.[0] || 'nevertheless'

  // MEMORIA — "tu profe se acuerda" (F4-04): la clase más reciente ya
  // analizada, si dejó un consejo puntual para la próxima (report.next_session_tip,
  // ya lo escribe el post-clase). Se omite si el rescue de abajo está activo
  // (errores repetidos 3+ veces) para no mostrar dos avisos que compiten.
  const lastAnalyzed = recent.find((s) => s.status === 'analyzed' && (s.report as any)?.next_session_tip)
  const memoryTip: string | null = !today?.rescue?.active && lastAnalyzed
    ? ((lastAnalyzed.report as any).next_session_tip as string)
    : null

  // ─── MODO ONBOARDING: 0 sesiones ─────────────────────────────────
  // Para el primer ingreso del user (sin sesiones todavia), reemplazamos
  // toda la home complicada por un CTA gigante sin distracciones.
  // Cero KPIs, cero progreso, cero opciones — solo "empezá tu primera clase".
  if (totalSessions === 0) {
    return <HoyOnboardingHero
      userName={u.nombre}
      langLabel={langLabel}
      minutes={minutes}
      onStart={() => nav('/app/practicar')}
    />
  }

  return (
    <div className="hoy-page">
      <section className="hp-greet">
        <div className="hp-eyebrow">{greeting}</div>
        <h1 className="hp-title">Hoy te toca una charla de <em>{minutes} minutos</em>.</h1>
        <p className="hp-sub">
          Tu tutor activo es <b>{tutorName}</b>. Foco del día: <b>{topicTitle}</b>
          {topicCategory ? <> · {topicCategory}</> : null}.
        </p>
        {memoryTip && (
          <div className="hp-memory">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-4 12.7c.6.4 1 1.2 1 2.05V17h6v-2.25c0-.85.4-1.65 1-2.05A7 7 0 0 0 12 2Z" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>
            <span><b>Tu profe se acuerda:</b> {memoryTip}</span>
          </div>
        )}
      </section>

      <div className="hp-grid">
        {/* LEFT COLUMN */}
        <div className="hp-col-l">

          {/* HERO MISSION */}
          <div className="hp-hero">
            <div className="hp-hero-l">
              <div className="hp-hero-chips">
                <span className="hp-chip solid">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
                  Misión del día
                </span>
                <span className="hp-chip">{topicTitle}{topicCategory ? ` · ${topicCategory}` : ''}</span>
                <span className="hp-chip">{u.cefr_level}</span>
                <span className="hp-chip amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  {minutes} min sugeridos
                </span>
                {/* Like / Dislike — dislike rota al siguiente interest del user */}
                <span className="hp-feedback" role="group" aria-label="Te gusta este tema?">
                  <button className="hp-fb hp-fb-like" onClick={handleLike} aria-label="Me gusta este tema" title="Me gusta">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4.34-8.66A1.5 1.5 0 0 1 13 2c.7 0 1.4.4 1.7 1.06.16.39.4 1.2.3 2.82z"/></svg>
                  </button>
                  <button className="hp-fb hp-fb-dislike" onClick={handleDislike} aria-label="Otro tema, por favor" title="Otro tema">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17v12l-4.34 8.66A1.5 1.5 0 0 1 11 22c-.7 0-1.4-.4-1.7-1.06-.16-.39-.4-1.2-.3-2.82z"/></svg>
                  </button>
                </span>
              </div>

              <h2>
                {topicTitle}
                <small>Empezá la charla cuando quieras. Hablás en {langLabel}; el tutor te corrige al cierre — sin interrupciones.</small>
              </h2>

              <div className="hp-hero-meta">
                <div className="hp-row"><span className="hp-mic-dot"></span><b>Tutor listo</b></div>
                <span className="hp-dot"></span>
                <div className="hp-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                  <span>{tutorName}</span>
                </div>
                <span className="hp-dot"></span>
                <div className="hp-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>
                  <span>Rigurosidad <b>{tutorRigor} / 5</b></span>
                </div>
              </div>

              <div className="hp-hero-cta">
                <button
                  className="hp-btn hp-btn-primary"
                  onClick={() => nav(firstInterest ? `/app/practicar?topic=${firstInterest.id}` : '/app/practicar')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>
                  Empezar charla
                </button>
                <button className="hp-btn hp-btn-secondary hp-btn-lg" onClick={() => nav('/app/practicar')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                  </svg>
                  Más temas
                </button>
              </div>
            </div>

            <div className="hp-hero-r">
              <div className="hp-label">Desafíos en pantalla</div>

              {(today?.in_context_prompts || [
                { kind: 'vocab' as const, label: 'Vocabulario', text: `Intentá usar **${focusKeyword}** en alguna idea sobre ${topicTitle.toLowerCase()}.` },
                { kind: 'gram' as const, label: 'Gramática', text: 'Contá cómo **empezó** el tema usando **pasado simple**.' },
                { kind: 'restr' as const, label: 'Restricción', text: 'El tutor va a discrepar. Expresá **desacuerdo formal**.' },
              ]).map((p, i) => (
                <div key={i} className={`hp-prompt ${p.kind}`}>
                  <span className="hp-pgl">{p.kind === 'vocab' ? 'V' : p.kind === 'gram' ? 'G' : 'R'}</span>
                  <div className="hp-pt">
                    <span className="hp-small">{p.label}</span>
                    {renderPromptText(p.text)}
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 6, lineHeight: 1.4 }}>
                Aparecen como tarjetas durante la charla. No tenés que cumplir todas.
              </div>
            </div>
          </div>

          {/* RESCUE — visible solo si el backend detectó un error recurrente real */}
          {today?.rescue?.active && (
            <div className="hp-card hp-rescue">
              <div className="hp-rescue-head">
                <div>
                  <div className="hp-rescue-eye"><span className="hp-pulse"></span> Punto a pulir · misión de rescate activa</div>
                  <h3>{today.rescue.label}</h3>
                  <p>Repetiste el mismo patrón en las últimas <b>{today.rescue.sessions_count} sesiones</b>. La próxima charla va a forzar contextos para que pelees con este tema hasta consolidarlo.</p>
                </div>
              </div>

              <div className="hp-rescue-body">
                <div className="hp-rescue-examples">
                  {today.rescue.examples.map((ex, i) => (
                    <div key={i} className="hp-ex">
                      <span className="hp-bad">{ex.wrong || '—'}</span>
                      <span className="hp-arr">→</span>
                      <span className="hp-good">{ex.correct || '—'}</span>
                    </div>
                  ))}
                </div>

                <div className="hp-rescue-aside">
                  <div>
                    <div style={{ fontSize: 11, color: '#8A6A00', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Detectado en {today.rescue.sessions_count} sesiones</div>
                    <div className="hp-freq">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <i key={i} style={{ height: `${30 + i * 12}%`, opacity: 0.4 + i * 0.1, background: i === 5 ? '#E5484D' : undefined }} />
                      ))}
                    </div>
                  </div>
                  <div className="hp-rescue-cta">
                    <button className="hp-btn-amber" onClick={() => nav('/app/practicar')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
                      Empezar misión de rescate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SESSIONS */}
          <div className="hp-card">
            <div className="hp-card-head">
              <h3>Últimas sesiones</h3>
              <Link className="hp-link" to="/app/historial">Ver historial completo →</Link>
            </div>
            <div className="hp-sessions">
              <div className="hp-sess active">
                <div className="hp-sess-date">Hoy<b>—</b></div>
                <div className="hp-sess-body">
                  <div className="hp-topic">{topicTitle}{topicCategory ? ` · ${topicCategory}` : ''} <span className={`hp-tutor${tutorName.toLowerCase().includes('sincerist') ? ' sincerist' : ''}`}>{tutorName}</span></div>
                  <div className="hp-meta">
                    <span className="hp-row"><span className="hp-live-dot"></span>en cola</span>
                    <span>·</span><span>{minutes} min sugeridos</span>
                    <span>·</span><span>3 desafíos en pantalla</span>
                  </div>
                </div>
                <div className="hp-fluency"><span className="hp-fl-label">Fluidez</span><span className="hp-fl-num" style={{ color: 'var(--hp-fg-4)' }}>— —</span></div>
                <div className="hp-dur">{minutes}:00<small>sugerido</small></div>
                <span className="hp-sess-go">→</span>
              </div>

              {recent.length === 0 && (
                <div style={{ padding: '24px 4px', textAlign: 'center', color: 'var(--hp-fg-3)', fontSize: 13 }}>
                  Todavía no tenés sesiones cerradas. <b>Empezá la primera arriba.</b>
                </div>
              )}

              {recent.slice(0, 5).map((s, idx) => {
                const prev = recent[idx + 1]
                const fluency = extractFluency(s)
                const prevFluency = prev ? extractFluency(prev) : null
                const delta = fluency !== null && prevFluency !== null ? fluency - prevFluency : null
                const dur = s.duration_seconds || 0
                const praiseCount = countReport(s, 'praise')
                const feedbackCount = countReport(s, 'feedback')
                const sessTitle = topicTitleFromSession(profile, s)
                const sessTutor = tutorName
                return (
                  <div key={s.id} className="hp-sess" onClick={() => nav(`/app/sesiones/${s.id}`)} style={{ cursor: 'pointer' }}>
                    <div className="hp-sess-date">{formatDow(s.started_at)}<b>{formatDayNum(s.started_at)}</b></div>
                    <div className="hp-sess-body">
                      <div className="hp-topic">{sessTitle} <span className={`hp-tutor${sessTutor.toLowerCase().includes('sincerist') ? ' sincerist' : ''}`}>{sessTutor}</span></div>
                      <div className="hp-meta">
                        {praiseCount > 0 && <span className="hp-ok">{praiseCount} acierto{praiseCount === 1 ? '' : 's'} notable{praiseCount === 1 ? '' : 's'}</span>}
                        {praiseCount > 0 && feedbackCount > 0 && <span>·</span>}
                        {feedbackCount > 0 && <span className="hp-err">{feedbackCount} punto{feedbackCount === 1 ? '' : 's'} a pulir</span>}
                        {praiseCount === 0 && feedbackCount === 0 && <span>{s.status === 'analyzed' ? 'sin observaciones' : 'analizando…'}</span>}
                      </div>
                    </div>
                    <div className="hp-fluency">
                      <span className="hp-fl-label">Fluidez</span>
                      <span className="hp-fl-num">
                        {fluency ?? '—'}
                        {delta !== null && delta !== 0 && (
                          <span className={`hp-delta${delta < 0 ? ' down' : ''}`}>{delta > 0 ? `+${delta}` : delta}</span>
                        )}
                      </span>
                    </div>
                    <div className="hp-dur">{formatMmSs(dur)}<small>charla</small></div>
                    <span className="hp-sess-go">→</span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <aside className="hp-rc">

          <div className="hp-card hp-streak-card">
            <div className="hp-card-head">
              <h3>Tu racha</h3>
              <span className="hp-h-meta">{best} / {best} mejor</span>
            </div>
            <div className="hp-big">
              <span className="hp-n">{streak}</span>
              <span className="hp-u">días seguidos</span>
            </div>
            <div className="hp-sub-text">
              {streak === 0
                ? <>Hoy arrancás tu racha. <b>Primera charla = primer punto.</b></>
                : streak >= best
                ? <><b>¡Es tu mejor racha!</b></>
                : <>Te faltan <b>{daysToBeat} días</b> para empatar tu mejor racha.</>}
            </div>

            <div className="hp-heatmap" aria-label="Últimos 28 días de práctica">
              {heatmapCells.map((cell, i) => (
                <i key={i} className={cell.className}></i>
              ))}
            </div>
            <div className="hp-heat-legend">
              <span>hace 4 semanas</span>
              <span className="hp-scale">menos
                <i style={{ background: 'var(--hp-bg-2)' }}></i>
                <i style={{ background: '#CFEFE1' }}></i>
                <i style={{ background: '#7CE7BD' }}></i>
                <i style={{ background: '#1FC18E' }}></i>
                <i style={{ background: 'var(--hp-green-700)' }}></i>
                más
              </span>
            </div>
          </div>

          <div className="hp-card hp-level-card">
            <div className="hp-card-head">
              <h3>Camino a {levelProg?.next || nextLevel}</h3>
              <Link to="/app/mapa" className="hp-link">Ver mapa →</Link>
            </div>

            <div className="hp-lhead">
              <div className="hp-ladder">
                <b>{levelProg?.current || u.cefr_level}</b>
                <span className="hp-arrow">→</span>
                <span className="hp-next">{levelProg?.next || nextLevel}</span>
              </div>
              <div style={{ fontFamily: 'var(--hp-font-display)', fontWeight: 700, fontSize: 14 }}>{levelProg?.pct ?? cefrPctVal}%</div>
            </div>
            <div className="hp-gauge"><i style={{ width: `${levelProg?.pct ?? cefrPctVal}%` }}></i></div>

            <div className="hp-lstats">
              <div className="hp-li"><span className="hp-v">{totalSessions}</span><span className="hp-k">charlas</span></div>
              <div className="hp-li">
                <span className={`hp-v${fluencyDelta30 !== null && fluencyDelta30 >= 0 ? ' green' : ''}`}>
                  {fluencyDelta30 === null ? '—' : `${fluencyDelta30 > 0 ? '+' : ''}${fluencyDelta30}`}
                </span>
                <span className="hp-k">fluidez 30d</span>
              </div>
              <div className="hp-li"><span className="hp-v">{hoursSpoken}h</span><span className="hp-k">habladas</span></div>
            </div>
          </div>

          <div className="hp-card">
            <div className="hp-card-head">
              <h3>Tus tópicos</h3>
              <Link to="/app/perfil" className="hp-link">Editar →</Link>
            </div>

            {profile.interests.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--hp-fg-3)' }}>
                Todavía no elegiste tópicos. <Link to="/app/perfil" style={{ color: 'var(--hp-green-700)', fontWeight: 600 }}>Sumá algunos →</Link>
              </div>
            )}

            <div className="hp-tags" style={{ marginTop: 4 }}>
              {Object.entries(groupByCategory(profile.interests)).map(([cat, items]) => {
                const isOpen = !!openCats[cat]
                return (
                  <div key={cat} style={{ width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setOpenCats((s) => ({ ...s, [cat]: !s[cat] }))}
                      className="hp-tag cat"
                      style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--hp-border)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <span style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>›</span>
                      {cat} <span style={{ opacity: 0.6, marginLeft: 4 }}>({items.length})</span>
                    </button>
                    {isOpen && (
                      <div className="hp-tags" style={{ marginTop: 6, marginBottom: 8 }}>
                        {items.map((t: any, i: number) => (
                          <span key={t.id} className={`hp-tag${i === 0 && cat === (firstInterest?.category || '') ? ' hot' : ''}`}>{t.title}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--hp-fg-3)', marginTop: 12, lineHeight: 1.5 }}>Los tópicos alimentan cada charla. Cambialos cuando quieras.</div>
          </div>

          <div className="hp-card hp-tutor-card">
            <div className="hp-card-head">
              <h3>Tutor activo</h3>
              <Link to="/app/perfil" className="hp-link">Cambiar →</Link>
            </div>
            <div className="hp-tutor-row">
              <div className="hp-tutor-av">{tutorInitial}</div>
              <div className="hp-tinf">
                <div className="hp-tname">{tutorName}</div>
                <div className="hp-tdesc">{tpl?.description || 'Tu compañero de práctica.'}</div>
              </div>
            </div>
            <div className="hp-tutor-meters">
              <div className="hp-meter">
                <div className="hp-mlabel">Rigurosidad</div>
                <div className="hp-mval">{rigorLabel(tutorRigor)} · {tutorRigor} / 5</div>
                <div className="hp-bar"><i style={{ width: `${(tutorRigor / 5) * 100}%`, background: '#E5484D' }}></i></div>
              </div>
              <div className="hp-meter">
                <div className="hp-mlabel">Calidez</div>
                <div className="hp-mval">{warmthLabel(tutorWarmth)} · {tutorWarmth} / 5</div>
                <div className="hp-bar"><i style={{ width: `${(tutorWarmth / 5) * 100}%`, background: '#FFB800' }}></i></div>
              </div>
            </div>
            <div className="hp-tutor-tags">
              {(tpl as any)?.block_on_repeat && <span className="hp-tutor-tag">Bloqueos por repetición</span>}
              {(tpl as any)?.interruption_allowed === false && <span className="hp-tutor-tag">Sin interrupciones</span>}
              {tutorRigor >= 4 && <span className="hp-tutor-tag amber">Presión temporal</span>}
            </div>
          </div>

        </aside>
      </div>
    </div>
  )
}

/* ── helpers de Hoy ── */
function nextCefr(level: string): string {
  const order = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  const idx = order.indexOf(level)
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : 'C2'
}

function extractFluency(s: SessionData): number | null {
  const m: any = s.metrics
  if (m && typeof m.fluency === 'number') return Math.round(m.fluency)
  if (typeof s.score === 'number') return s.score
  return null
}

function countReport(s: SessionData, key: 'praise' | 'feedback'): number {
  const r: any = s.report
  if (!r) return 0
  const v = r[key]
  if (Array.isArray(v)) return v.length
  if (typeof v === 'string' && v.trim()) return 1
  return 0
}

function formatDow(iso: string): string {
  const d = new Date(iso)
  const dows = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return dows[d.getDay()]
}
function formatDayNum(iso: string): string {
  return String(new Date(iso).getDate())
}
function formatMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function groupByCategory(interests: any[]): Record<string, any[]> {
  return interests.reduce((acc, t) => {
    const cat = t.category || 'Otros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {} as Record<string, any[]>)
}

function rigorLabel(n: number): string {
  if (n >= 5) return 'Muy alta'
  if (n >= 4) return 'Alta'
  if (n === 3) return 'Media'
  if (n === 2) return 'Baja'
  return 'Muy baja'
}
function warmthLabel(n: number): string {
  if (n >= 5) return 'Muy alta'
  if (n >= 4) return 'Alta'
  if (n === 3) return 'Media'
  if (n === 2) return 'Baja'
  return 'Muy baja'
}

function renderPromptText(text: string): React.ReactNode {
  // Parsea **bold** del backend en <b>
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <b key={i}>{p.slice(2, -2)}</b>
    }
    return <span key={i}>{p}</span>
  })
}

function heatmapFromBackend(cells: HeatmapCell[]): Array<{ className: string }> {
  return cells.map((c, i) => {
    const lvl = c.level === 0 ? 'miss' : `lvl${c.level}`
    const isToday = i === cells.length - 1
    return { className: `${lvl}${isToday ? ' today' : ''}` }
  })
}

function buildHeatmap(sessions: SessionData[]): Array<{ className: string }> {
  // 28 celdas, índice 0 = hace 27 días, índice 27 = hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const byDay = new Map<string, number>() // key YYYY-MM-DD → count
  for (const s of sessions) {
    const d = new Date(s.started_at)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString().slice(0, 10)
    byDay.set(key, (byDay.get(key) || 0) + 1)
  }
  const cells: Array<{ className: string }> = []
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const count = byDay.get(key) || 0
    let lvl = ''
    if (count === 0) lvl = 'miss'
    else if (count === 1) lvl = 'lvl1'
    else if (count === 2) lvl = 'lvl2'
    else if (count === 3) lvl = 'lvl3'
    else lvl = 'lvl4'
    const isToday = i === 0
    cells.push({ className: `${lvl}${isToday ? ' today' : ''}` })
  }
  return cells
}

/* ──────── PRACTICAR (Gemini Live) ──────── */
function PracticarView({ profile, onSessionEnd }: { profile: MeProfile | null; onSessionEnd: () => void }) {
  const nav = useNavigate()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [topicTitle, setTopicTitle] = useState<string>('')
  const [keywords, setKeywords] = useState<string[]>([])
  // audioLevel + throttle/decay ahora viven en useLiveVoice (circuitería central) → usamos live.audioLevel.
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [extraTopics, setExtraTopics] = useState<Topic[]>([])
  const [endedReport, setEndedReport] = useState<SessionData | null>(null)
  const [freeTopicText, setFreeTopicText] = useState('')
  const [interestQuery, setInterestQuery] = useState('')
  const [interestCategory, setInterestCategory] = useState<string>('all')
  // Fondo fijo: bg-3 (verde con grilla). El selector de fondo se removio
  // a pedido del usuario para mantener la UI limpia. Si quisieramos volver
  // a poner el selector, devolver useState + BgPicker.
  const convoBg = 3
  const [pedagogy, setPedagogy] = useState<string>('balanced')
  const [templates, setTemplates] = useState<Template[]>([])
  const [switching, setSwitching] = useState(false)
  useEffect(() => { templatesAPI.list().then(setTemplates).catch(() => {}) }, [])
  const startedRef = useRef(false)

  // Cargo catálogo completo para que el usuario pueda elegir cualquiera, no solo sus intereses
  useEffect(() => {
    topicsAPI.list().then(setExtraTopics).catch(() => {})
  }, [])

  const freqBinsRef = useRef<Float32Array | null>(null)
  const [, forceRerender] = useState(0)
  const rerenderRafRef = useRef<number | null>(null)

  const live = useLiveVoice({
    onAudioFrequencies: (bins) => {
      freqBinsRef.current = bins
      // throttle re-render a ~30fps para que las barras animen sin matar perf
      if (rerenderRafRef.current === null) {
        rerenderRafRef.current = requestAnimationFrame(() => {
          rerenderRafRef.current = null
          forceRerender((n) => (n + 1) % 1000)
        })
      }
    },
    onError: (e) => toast.error(e.message),
    onPreferenceApplied: (changes, confirmation) => {
      const parts: string[] = []
      if (changes.correction_mode) parts.push(`corrección: ${changes.correction_mode}`)
      if (changes.response_length) parts.push(`largo: ${changes.response_length}`)
      if (changes.warmth_level) parts.push(`calidez: ${changes.warmth_level}/5`)
      toast.success(confirmation || `Preferencia guardada (${parts.join(' · ')})`)
    },
    onParticipantJoined: (info) => {
      if (!info.isHost) toast.success(`${info.name} se unió a la charla`)
    },
    onParticipantLeft: (info) => {
      toast(`${info.name} salió de la charla`)
    },
    onRoomClosed: () => {
      toast('La sala se cerró')
    },
    onAudioGlitch: (info) => {
      // Solo log para diagnostico, NO toast (el toast cada palabra
      // confundia y disparaba en uso normal cuando Gemini manda chunks
      // mas rapido que real-time).
      console.warn(`[useLiveVoice] glitch ${info.reason}: ${info.delayMs}ms`)
    },
  })

  const beginSession = useCallback(async (topicId: number | null, freeTopic?: string) => {
    if (startedRef.current) return
    startedRef.current = true
    try {
      const start = await sessionsAPI.start(topicId || undefined, undefined, freeTopic)
      setSessionId(start.session_id)
      setTopicTitle(start.topic?.title || freeTopic || 'Tema libre')
      setKeywords(start.topic?.keywords || [])
      await live.start(start.session_id)
    } catch (e: any) {
      toast.error('No pudimos iniciar la sesión')
      startedRef.current = false
    }
  }, [live])

  // Auto-start desde query param ?topic=<id> (botón "Empezar charla" del Hoy)
  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const topicParam = params.get('topic')
    if (topicParam && !startedRef.current && profile) {
      const topicId = parseInt(topicParam, 10)
      if (Number.isFinite(topicId) && topicId > 0) {
        setSelectedTopicId(topicId)
        beginSession(topicId)
        // Limpio el query SIN react-router (history.replaceState) para no desmontar
        // el componente; nav({replace:true}) re-monta y dispara cleanup→stop.
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/app/practicar')
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // IMPORTANTE: handleEnd se declara ANTES del early return para que el
  // número de hooks no cambie entre renders (React error #310).
  const handleEnd = useCallback(async () => {
    live.stop()
    if (sessionId) {
      try {
        toast.success('Analizando tu charla...')
        const ended = await sessionsAPI.end(sessionId, live.transcript)
        onSessionEnd()
        // Esperar ~3s a que el analyzer en background termine, luego pedir versión con report
        setTimeout(async () => {
          try {
            const refreshed = await sessionsAPI.get(sessionId)
            setEndedReport(refreshed)
          } catch {
            setEndedReport(ended)
          }
        }, 3500)
        setEndedReport(ended)  // mostrar overlay inmediato aunque no tenga reporte aún
      } catch {
        toast.error('No se pudo cerrar la sesión')
        nav('/app')
      }
    } else {
      nav('/app')
    }
  }, [live, sessionId, onSessionEnd, nav])

  const handleSwitchTutor = useCallback(async (newTemplateId: number) => {
    if (switching || !sessionId) return
    if (newTemplateId === profile?.active_template?.id) return
    setSwitching(true)
    try {
      const userName = profile?.user?.nombre || 'there'
      const targetLang = profile?.user?.target_language || 'en'
      const langName = targetLang === 'en' ? 'English' : targetLang === 'pt' ? 'Portuguese' : targetLang === 'it' ? 'Italian' : 'English'
      // 1. Tutor actual se despide (en el idioma target)
      live.say(`[USER_REQUEST_SWITCH_TUTOR] Say a short, warm goodbye to ${userName} in ${langName}. One sentence only. Example: "Hey ${userName}, gotta hand you over to another coach now — great chatting, talk soon!"`)
      toast.success('Cambiando tutor…')
      // 2. Esperar a que termine de hablar
      await new Promise(r => setTimeout(r, 4500))
      // 3. Cerrar sesión actual SIN analyzer (fue un cambio)
      live.stop()
      // 4. Persistir nuevo template
      await meAPI.updateSettings({ active_template_id: newTemplateId })
      onSessionEnd()
      // 5. Reset y arrancar nueva sesión con mismo topic
      startedRef.current = false
      setSessionId(null)
      // beginSession se invoca con el mismo topic
      const currentTopic = selectedTopicId
      setTimeout(() => beginSession(currentTopic), 600)
    } catch (e) {
      toast.error('No pudimos cambiar el tutor')
    } finally {
      setSwitching(false)
    }
  }, [switching, sessionId, profile, live, selectedTopicId, onSessionEnd])

  const statusLabel = {
    idle: 'Preparando…',
    connecting: 'Conectando…',
    listening: 'Tu turno',
    speaking: 'El tutor habla',
    error: 'Error',
    ended: 'Finalizada',
  }[live.status]

  // Si todavía no eligió tópico, NO arranco automático. Pantalla inmersiva de galaxia.
  if (!sessionId) {
    if (!profile) return <PageSkel variant="grid" />
    const interests = profile.interests
    const interestIds = new Set(interests.map(i => i.id))
    const userCefr = profile.user.cefr_level
    const others = extraTopics.filter(t => {
      if (interestIds.has(t.id)) return false
      // Excluir topics de kids para usuarios adultos
      if ((t.category || '').toLowerCase() === 'kids') return false
      // Si el topic tiene niveles, mantener solo los que matchean el CEFR del user
      if (Array.isArray(t.levels) && t.levels.length > 0 && userCefr) {
        if (!t.levels.includes(userCefr)) return false
      }
      return true
    })
    const userName = profile.user.nombre
    const surprisePool = interests.length > 5 ? interests.slice(3) : others
    const surprise = surprisePool[Math.floor(Math.random() * surprisePool.length)] || others[0] || interests[0]

    const freeTopicFlag = (profile as MeProfile & { feature_flags?: Record<string, { unlocked: boolean }> }).feature_flags?.free_topic
    return (
      <PracticarGalaxy
        userName={userName}
        interests={interests.map(i => ({ id: i.id, title: i.title, category: i.category }))}
        recommended={others.slice(0, 8).map(t => ({ id: t.id, title: t.title, category: t.category }))}
        enableFreeTopic={freeTopicFlag?.unlocked ?? false}
        onPick={(topicId) => {
          // Si el topico clickeado NO estaba en los intereses del user (vino del
          // panel "Sugeridos"), lo agregamos a sus intereses. addInterest es
          // idempotente: si ya estaba, devuelve { ok, already: true }.
          if (!interestIds.has(topicId)) {
            topicsAPI.addInterest(topicId)
              .then(() => toast.success('Agregado a tus temas'))
              .catch(() => {})
          }
          beginSession(topicId)
        }}
        onSurprise={() => { if (surprise) beginSession(surprise.id); else beginSession(null) }}
        onFreeTopic={() => {
          // "Tema libre" = curated topic "open-chat" (id 166). El coach saluda
          // y pregunta al alumno por voz que quiere charlar. Aprovechamos que
          // (1) topic_id curado funciona bien con native-audio, y (2) el pivote
          // mid-conversation por voz funciona perfecto. Workaround del bug de
          // free_topic en text — el modelo no parsea bien.
          beginSession(166)
        }}
      />
    )
  }


  return (
    <>
    {endedReport && <SessionReportOverlay report={endedReport} sessionId={sessionId!} onClose={() => nav('/app')} />}
    <div className={`convo-view bg-${convoBg}`}>
      <div className="convo-stage">
        <div className="convo-header convo-header-onerow">
          <div className="convo-h-row1">
            <div className="convo-header-info">
              <span className="convo-h-title" title={topicTitle || 'Iniciando…'}>
                {topicTitle || 'Iniciando…'}
              </span>
              <span className="convo-h-sep">·</span>
              <span className="convo-h-meta">
                {profile?.active_template?.name || 'Habláh'} · {profile?.user?.cefr_level} · {profile?.user?.target_language}
              </span>
            </div>
            {live.participants.length > 0 && (
              <div className="convo-h-participants" title="Conectados en la sala">
                {live.participants.map((p) => (
                  <span key={p.pid} className={`convo-h-chip${p.isHost ? ' host' : ''}`} title={p.isHost ? 'Vos (host)' : p.name}>
                    <span className="dot" aria-hidden />
                    {p.name}
                  </span>
                ))}
              </div>
            )}
            <div className="convo-header-actions">
              <InviteFriendButton
                topicId={selectedTopicId}
                freeTopic={freeTopicText || null}
                variant="light"
                label=""
                onRoomCreated={(roomToken, hostPid) => {
                  live.upgradeToRoom(roomToken, hostPid)
                  toast.success('Sala lista — mandá el link y esperá al amigo')
                }}
              />
              <button className="btn btn-sm end" onClick={handleEnd} aria-label="Terminar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span className="end-label">Terminar</span>
              </button>
            </div>
          </div>
          <div className="convo-h-row2">
            <Gate flag="pedagogy_picker" profile={profile}>
              <PedagogyPicker value={pedagogy} onChange={(p, label) => {
                setPedagogy(p)
                const instruction = PEDAGOGY_INSTRUCTIONS[p as keyof typeof PEDAGOGY_INSTRUCTIONS] || ''
                const ok = live.sendSystemUpdate(`[SILENT_SYSTEM_UPDATE] DO NOT acknowledge this message verbally. From now on adopt this style internally: ${label.toUpperCase()}. Rules: ${instruction}. Continue the conversation in the same language and topic you were in. Just answer the next user message with the new style.`)
                toast.success(ok ? `Tutor ahora: ${label}` : 'Conectá primero')
              }} />
            </Gate>
            <Gate flag="tune_audio" profile={profile}>
              <VoicePresetsBar
                onPick={(preset) => {
                  applyPreset(preset)
                  toast.success(`Audio: ${preset.name} (aplica en la próxima sesión)`)
                }}
              />
            </Gate>
          </div>
        </div>

        <div className="convo-orb-area">
          {/* Flechas para "swipear" de topico durante la sesion. No cortan la
              sesion en vivo: solo mandan SILENT_SYSTEM_UPDATE al coach pidiendo
              pivot al siguiente/anterior interes del user. La sesion sigue
              activa, el coach naturalmente trae el nuevo tema. */}
            {profile && profile.interests.length > 1 && (() => {
              const interests = profile.interests
              const cur = interests.findIndex(i => i.id === selectedTopicId)
              const idx = cur >= 0 ? cur : 0
              const switchTo = (delta: -1 | 1) => {
                const next = (idx + delta + interests.length) % interests.length
                const t = interests[next]
                if (!t) return
                setSelectedTopicId(t.id)
                setTopicTitle(t.title)
                const targetLang = profile.user.target_language || 'en'
                const langName = ({ en: 'English', es: 'Spanish', pt: 'Portuguese', it: 'Italian' } as Record<string, string>)[targetLang] || targetLang
                const ok = live.sendSystemUpdate(
                  `[SILENT_SYSTEM_UPDATE] DO NOT acknowledge this message verbally. ` +
                  `The student swiped to a NEW topic mid-session. ` +
                  `From now on the conversation is about: "${t.title}" (category: ${t.category}). ` +
                  `On your next turn, naturally bridge from whatever was just said into this new topic in ${langName}, ` +
                  `with one short pivoting sentence + a fresh question/observation about "${t.title}". ` +
                  `Do not say "let's change the subject" or announce it — make it feel organic.`
                )
                if (ok) toast.success(`Tema: ${t.title}`)
              }
              return (
                <>
                  <button className="convo-orb-arrow left" onClick={() => switchTo(-1)} aria-label="Tema anterior" title="Tema anterior">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button className="convo-orb-arrow right" onClick={() => switchTo(1)} aria-label="Próximo tema" title="Próximo tema">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </>
              )
            })()}
          <div className="convo-orb-wrap">
            <AgentAudioVisualizerAura
              status={live.status}
              audioLevel={live.audioLevel}
              color="#00B37E"
              colorShift={0.18}
              themeMode="dark"
              size="xl"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <div className="convo-turn">
            <div className="l">{statusLabel}</div>
            {/* Lo último que dijo el tutor — siempre visible para no perderse */}
            {(() => {
              const lastAi = [...live.transcript].reverse().find(l => l.who === 'ai')
              const isA0 = profile?.user?.cefr_level === 'A0'
              // En A0: extraemos la frase entre comillas (modelo a repetir)
              const phraseMatch = lastAi?.text?.match(/['"“”]([^'"“”]+)['"“”]/)
              const modelPhrase = phraseMatch?.[1]?.trim()
              // Contador de frases practicadas (= turnos del user en la sesión)
              const phrasesDone = live.transcript.filter(l => l.who === 'user' && l.text.trim().length > 0).length
              const A0_GOAL = 10
              if (isA0 && modelPhrase) {
                const progressPct = Math.min(100, (phrasesDone / A0_GOAL) * 100)
                return (
                  <div style={{ textAlign: 'center', padding: '10px 16px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 10, marginBottom: 14,
                    }}>
                      <span style={{ fontSize: 11, color: 'rgba(232,236,234,.6)', textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 700 }}>
                        Frases logradas
                      </span>
                      <span style={{ fontSize: 13, color: 'white', fontWeight: 800 }}>
                        {phrasesDone} / {A0_GOAL}
                      </span>
                      <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,.1)', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: '#00B37E', transition: 'width 320ms ease' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(232,236,234,.55)', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 12, fontWeight: 700 }}>
                      Repetí esta frase
                    </div>
                    <div style={{
                      fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 700, letterSpacing: '-.02em',
                      color: 'white', lineHeight: 1.2, marginBottom: 14,
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      "{modelPhrase}"
                    </div>
                    <button
                      type="button"
                      onClick={() => live.say(`Por favor repetí lentamente y con buena pronunciación esta frase exacta, una sola vez, sin agregar nada más: "${modelPhrase}"`)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'rgba(0,179,126,.18)', color: '#9CFCD2',
                        border: '1px solid rgba(156,252,210,.3)', borderRadius: 999,
                        padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                      Escuchar de nuevo
                    </button>
                  </div>
                )
              }
              if (lastAi) {
                return (
                  <div className="q" style={{ fontStyle: 'normal', color: 'white' }}>
                    <div style={{ fontSize: 11, color: 'rgba(232,236,234,.5)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
                      Te dijo el tutor:
                    </div>
                    "{lastAi.text}"
                  </div>
                )
              }
              return (
                <div className="q">
                  Esperá unos segundos — el tutor te va a saludar y arrancar la charla.
                </div>
              )
            })()}
          </div>
        </div>

        <div className="mic-row">
          <div className="mic-wave">
            {(() => {
              const N = 48
              const bins = freqBinsRef.current
              return Array.from({ length: N }).map((_, i) => {
                let h = 8  // altura mínima cuando hay silencio
                if (bins && bins.length > 0) {
                  // Sampleo el array de frecuencias para que entre en N barras
                  // Tomo bandas bajas-medias (skip muy bajas e infra-agudas)
                  const start = 2
                  const end = Math.min(bins.length, Math.floor(bins.length * 0.7))
                  const idx = start + Math.floor((i / N) * (end - start))
                  const v = bins[idx] || 0
                  h = Math.max(8, Math.min(100, v * 130))  // amp
                }
                return <i key={i} style={{ height: `${h}%` }} />
              })
            })()}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(232,236,234,.6)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: live.status === 'listening' ? '#E5484D' : '#9CA3AF', display: 'inline-block', marginRight: 6 }} />
              {live.status === 'listening' ? 'GRABANDO' : live.status.toUpperCase()}
            </span>
            <MicSelector devices={live.micDevices} activeLabel={live.activeMicLabel} onSelect={live.switchMic} />
          </div>
        </div>

        {/* Push-to-talk (F3-02): fallback de UI para A0-A2, no depende del
            VAD de Gemini para el fin de turno. Oculto en B1+. */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 14px' }}>
          <PushToTalkControl
            level={profile?.user?.cefr_level}
            isSessionActive={live.status === 'listening' || live.status === 'speaking' || live.status === 'connecting'}
            pttHeld={live.pttHeld}
            onSetMode={live.setPushToTalk}
            onPress={live.pttPress}
            onRelease={live.pttRelease}
            variant="dark"
          />
        </div>
      </div>

      <aside className="convo-side">
        <div className="side-tabs">
          <div className="side-tab active">Transcripción</div>
        </div>

        {/* Keywords filtradas por target_language + clickables como "disparadores"
            que mandan al coach un SILENT_SYSTEM_UPDATE para pivotear la charla
            hacia esa palabra/frase. Gateado por feature flag 'disparadores'. */}
        {keywords.length > 0 && (profile as MeProfile & { feature_flags?: Record<string, { unlocked: boolean }> }).feature_flags?.disparadores?.unlocked && (() => {
          const userText = live.transcript.filter(l => l.who === 'user').map(l => l.text.toLowerCase()).join(' ')
          const target = profile?.user?.target_language || 'en'
          // Heurística de idioma por keyword. Para EN somos AGRESIVOS:
          // - Excluir cualquier char no ASCII
          // - Excluir tokens con terminaciones típicas de ES/PT (idad, encia,
          //   amento, miento, cion, etc.) que no llevan acento pero NO son EN
          const ES_PT_PATTERNS = /(idad|encia|encias|amento|amientos|amiento|miento|cion|ciones|sores|sora|ista|istas|tario|taria|miento|dores|dora|izar|aciones|imento|imentos|ência|ãoes?|imos\b|ado\b|ido\b|ables?$|íbles?$)/i
          const matchesLang = (k: string): boolean => {
            const s = k.toLowerCase()
            const hasPt = /[ãõç]|ção|ões/i.test(s)
            const hasEs = /[ñ]|ción\b|ciones\b|miento\b/.test(s)
            const hasAccent = /[áéíóú]/i.test(s)
            if (target === 'pt') return hasPt || (!hasEs && hasAccent)
            if (target === 'es') return hasEs || (!hasPt && hasAccent) || (/^[a-záéíóúñ\s'-]+$/i.test(s) && ES_PT_PATTERNS.test(s))
            if (target === 'en') {
              // Solo ASCII básico + sin patrones ES/PT
              if (/[áéíóúñãõç]/i.test(s)) return false
              if (ES_PT_PATTERNS.test(s)) return false
              return true
            }
            return true
          }
          const filtered = keywords.filter(matchesLang)
          if (filtered.length === 0) return null
          const usedCount = filtered.filter(k => userText.includes(k.toLowerCase())).length

          const handleKeywordClick = (k: string) => {
            const langName = ({ en: 'English', es: 'Spanish', pt: 'Portuguese', it: 'Italian' } as Record<string, string>)[target] || target
            const ok = live.sendSystemUpdate(
              `[SILENT_SYSTEM_UPDATE] DO NOT acknowledge this message verbally. ` +
              `The student tapped a target keyword to pivot the conversation. ` +
              `On your next turn, naturally steer the discussion toward the concept "${k}" in ${langName}, ` +
              `building on whatever was just said. Use the word "${k}" in context within your next 1-2 sentences. ` +
              `Do not announce the change; make it feel organic.`
            )
            if (ok) toast.success(`Pivoteando a "${k}"`)
            else toast('Conectá primero')
          }

          return (
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ fontSize: 11, color: 'rgba(232,236,234,.55)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>Disparadores ({target.toUpperCase()})</span>
                <span className="tnum">{usedCount}/{filtered.length}</span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(232,236,234,.4)', marginBottom: 8 }}>
                Tocá uno para que el tutor pivotee la charla hacia ese concepto.
              </div>
              <div className="side-trigger-chips">
                {filtered.map((k) => {
                  const used = userText.includes(k.toLowerCase())
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleKeywordClick(k)}
                      title={`Pivotear conversación hacia "${k}"`}
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: used ? 'rgba(0,179,126,.2)' : 'rgba(255,255,255,.05)',
                        color: used ? 'var(--primary)' : 'rgba(232,236,234,.75)',
                        border: `1px solid ${used ? 'rgba(0,179,126,.4)' : 'rgba(255,255,255,.10)'}`,
                        cursor: 'pointer',
                        transition: 'transform .12s, background .2s, border-color .2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = 'rgba(0,179,126,.45)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = used ? 'rgba(0,179,126,.4)' : 'rgba(255,255,255,.10)' }}
                    >
                      {used ? '✓ ' : ''}{k}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}

        <div className="side-body">
          {live.transcript.length === 0 && (
            <div style={{ color: 'rgba(232,236,234,.4)', fontSize: 13 }}>
              La transcripción aparece a medida que vos y el tutor hablan…
            </div>
          )}
          {/* Mostramos los ultimos turnos del user Y del coach en vivo. */}
          {live.transcript.length > 0 && (() => {
            let lastUserIdx = -1
            let lastAiIdx = -1
            for (let i = live.transcript.length - 1; i >= 0; i--) {
              if (lastAiIdx < 0 && live.transcript[i].who === 'ai') lastAiIdx = i
              if (lastUserIdx < 0 && live.transcript[i].who === 'user') lastUserIdx = i
              if (lastAiIdx >= 0 && lastUserIdx >= 0) break
            }
            const userLine = lastUserIdx >= 0 ? live.transcript[lastUserIdx] : null
            const aiLine = lastAiIdx >= 0 ? live.transcript[lastAiIdx] : null
            return (
              <>
                {userLine && (
                  <div style={{
                    marginBottom: 12,
                    padding: '8px 12px',
                    background: 'rgba(120,200,255,0.06)',
                    borderLeft: '3px solid rgba(120,200,255,0.5)',
                    borderRadius: 6,
                    fontSize: 13,
                    color: 'rgba(232,236,234,0.85)',
                  }}>
                    <div style={{
                      fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
                      opacity: 0.6, marginBottom: 4,
                    }}>VOS</div>
                    {userLine.text}
                  </div>
                )}
                {aiLine && (
                  <div className={`line ai`}>
                    <CoachPhrasePanels
                      text={aiLine.text}
                      targetLang={profile?.user?.target_language || 'en'}
                      baseLang={profile?.user?.base_language || 'es'}
                      cefr={profile?.user?.cefr_level || 'B1'}
                    />
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </aside>
    </div>
    </>
  )
}

/* ──────── REPORTE — pantalla dividida full-screen (al cierre de sesión) ──────── */
function SessionReportOverlay({ report, sessionId, onClose }: {
  report: SessionData; sessionId: number; onClose: () => void
}) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [playing, setPlaying] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const acRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)

  // ¿La clase se completo de verdad? Criterio: duracion >= 2 minutos Y al
  // menos 3 turnos del user. Si no, es "abortada" — sin confetti, sin
  // mensaje de exito. Antes celebrabamos clases de 5 segundos, lo cual
  // se siente falso.
  const completed = (() => {
    const duration = report.duration_seconds || 0
    const userTurns = (report.transcript || []).filter((t: any) => t.who === 'user' && (t.text || '').trim().length > 0).length
    return duration >= 120 && userTurns >= 3
  })()

  // Confetti SOLO si la clase se completo de verdad.
  useEffect(() => {
    if (!completed) return
    const colors = ['#00B37E', '#FFB800', '#22D3EE', '#7C5CFF', '#FF5E7E']
    const fire = (origin: { x: number; y: number }, particles: number) => {
      confetti({
        particleCount: particles, spread: 70, startVelocity: 45,
        origin, colors, ticks: 280, gravity: 0.9, scalar: 1.05,
      })
    }
    fire({ x: 0.2, y: 0.7 }, 60)
    setTimeout(() => fire({ x: 0.8, y: 0.7 }, 60), 180)
    setTimeout(() => fire({ x: 0.5, y: 0.4 }, 80), 360)
  }, [completed])

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setPlaying(false)
    setAudioLevel(0)
  }, [])

  const playSummary = useCallback(async (targetLang: 'es' | 'en') => {
    stopAudio()
    try {
      const token = localStorage.getItem('token')
      const base = (import.meta as any).env?.VITE_API_URL || '/api'
      const url = `${base}/sessions/${sessionId}/summary-audio?lang=${targetLang}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(res.status === 404 ? 'El resumen aún se está generando (esperá 5s)' : `Audio no disponible (${res.status})${txt ? ': ' + txt : ''}`)
      }
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('audio')) throw new Error('La respuesta no es audio')
      const blob = await res.blob()
      if (blob.size === 0) throw new Error('El audio vino vacio')
      const blobUrl = URL.createObjectURL(blob)
      const audio = new Audio()
      audio.preload = 'auto'
      audio.src = blobUrl
      audioRef.current = audio

      // Esperar a que el browser pueda reproducir (carga metadata)
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => { cleanup(); resolve() }
        const onErr = () => {
          cleanup()
          const code = audio.error?.code
          const msgs: Record<number, string> = {
            1: 'aborted', 2: 'network', 3: 'decode error (audio corrupto)', 4: 'src no soportado',
          }
          reject(new Error(`Audio error: ${msgs[code || 0] || 'desconocido'}`))
        }
        const cleanup = () => {
          audio.removeEventListener('canplaythrough', onCanPlay)
          audio.removeEventListener('error', onErr)
        }
        audio.addEventListener('canplaythrough', onCanPlay, { once: true })
        audio.addEventListener('error', onErr, { once: true })
        // safety timeout
        setTimeout(() => { cleanup(); resolve() }, 4000)
      })

      // Web Audio analyzer para el visualizer (best-effort, no bloquea)
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext
        const ac = acRef.current || new AC()
        acRef.current = ac
        if (ac.state === 'suspended') await ac.resume()
        const src = ac.createMediaElementSource(audio)
        const analyser = ac.createAnalyser()
        analyser.fftSize = 256
        src.connect(analyser)
        analyser.connect(ac.destination)
        const buf = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          analyser.getByteFrequencyData(buf)
          let sum = 0
          for (let i = 0; i < buf.length; i++) sum += buf[i]
          setAudioLevel(Math.min(1, sum / buf.length / 128))
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      } catch (e) {
        console.warn('[summary-audio] analyser disabled:', e)
      }

      audio.onended = () => {
        setPlaying(false)
        setAudioLevel(0)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        URL.revokeObjectURL(blobUrl)
      }
      await audio.play()
      setPlaying(true)
    } catch (e: any) {
      toast.error(e.message || 'No pudimos reproducir el resumen')
      setPlaying(false)
    }
  }, [sessionId, stopAudio])

  useEffect(() => () => {
    stopAudio()
    if (acRef.current) acRef.current.close().catch(() => {})
  }, [stopAudio])

  const switchLang = (l: 'es' | 'en') => {
    setLang(l)
    if (playing) playSummary(l)
  }

  return (
    <div className="report-overlay">
      {/* Izquierda: reporte */}
      <div className="report-pane-left">
        {/* Header al cierre — celebracion solo si la clase fue real (>=2min y >=3 turnos).
            Si la cortaste antes, mostramos un mensaje neutro sin confetti. */}
        <div style={{
          marginBottom: 20, padding: '16px 20px',
          background: completed
            ? 'linear-gradient(135deg, rgba(0,179,126,.14) 0%, rgba(0,179,126,.05) 100%)'
            : 'linear-gradient(135deg, rgba(255,184,0,.10) 0%, rgba(255,184,0,.03) 100%)',
          border: completed ? '1px solid rgba(0,179,126,.35)' : '1px solid rgba(255,184,0,.28)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'pg-fade-in .5s ease-out',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: completed
              ? 'linear-gradient(135deg, #00B37E 0%, #008F63 100%)'
              : 'linear-gradient(135deg, #FFB800 0%, #E08F00 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: completed ? '0 6px 16px rgba(0,179,126,.4)' : '0 6px 16px rgba(255,184,0,.35)',
          }}>
            {completed ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
              </svg>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg-1)', lineHeight: 1.2 }}>
              {completed ? '¡Clase terminada con éxito!' : 'Sesión cortada'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 2 }}>
              {completed
                ? 'Sumás progreso en tu camino — mirá lo que aprendiste abajo.'
                : 'Quedó pendiente. Cuando arranques otra vez seguimos donde quedamos.'}
            </div>
          </div>
        </div>
        <SessionReport
          sessionId={sessionId}
          initial={report}
          actions={
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => { stopAudio(); onClose() }} className="btn btn-primary btn-lg" style={{ flex: 1 }}>
                Volver a Hoy
              </button>
              <button
                onClick={() => { stopAudio(); window.location.reload() }}
                className="btn btn-secondary btn-lg"
                style={{ flex: 1, background: 'var(--bg-2)', color: 'var(--fg-1)', border: 0 }}
              >
                Practicar otra vez
              </button>
            </div>
          }
        />
      </div>

      {/* Derecha: visualizer + toggle ES/EN */}
      <div className="report-pane-right">
        {/* Toggle ES/EN */}
        <div style={{
          position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'inline-flex', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 999, padding: 4, gap: 2,
        }}>
          {(['es', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => switchLang(l)}
              style={{
                padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                background: lang === l ? '#00B37E' : 'transparent',
                color: lang === l ? '#fff' : 'rgba(255,255,255,.7)',
                border: 0, cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {l === 'es' ? 'Castellano' : 'English'}
            </button>
          ))}
        </div>

        {/* Visualizer aura */}
        <div className="convo-orb-wrap">
          <AgentAudioVisualizerAura
            status={playing ? 'speaking' : 'listening'}
            audioLevel={audioLevel}
            color="#00B37E"
            colorShift={0.18}
            themeMode="dark"
            size="xl"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Botón play / pause */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => (playing ? stopAudio() : playSummary(lang))}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#00B37E', color: '#fff', border: 0, cursor: 'pointer',
              display: 'grid', placeItems: 'center', boxShadow: '0 8px 24px rgba(0,179,126,.4)',
              transition: 'transform .15s',
            }}
          >
            {playing ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {playing ? 'Resumiendo tu charla' : `Escuchar resumen en ${lang === 'es' ? 'castellano' : 'inglés'}`}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ──────── REPORTE — componente reutilizable (overlay + /app/sesiones/:id) ──────── */
interface SessionReportProps {
  sessionId: number
  initial?: SessionData
  actions?: React.ReactNode
}

function SessionReport({ sessionId, initial, actions }: SessionReportProps) {
  const [data, setData] = useState<SessionData | null>(initial ?? null)
  const [loading, setLoading] = useState(!initial)
  const [polling, setPolling] = useState(initial ? initial.status !== 'analyzed' : true)

  // Carga inicial si no vino initial (caso /app/sesiones/:id)
  useEffect(() => {
    if (initial) return
    sessionsAPI.get(sessionId)
      .then((d) => { setData(d); setLoading(false); setPolling(d.status !== 'analyzed') })
      .catch(() => setLoading(false))
  }, [sessionId, initial])

  // Polling cada 2s hasta status === 'analyzed'
  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      try {
        const fresh = await sessionsAPI.get(sessionId)
        setData(fresh)
        if (fresh.status === 'analyzed') {
          setPolling(false)
          clearInterval(interval)
        }
      } catch {}
    }, 2000)
    const stopAfter = setTimeout(() => { setPolling(false); clearInterval(interval) }, 60000)
    return () => { clearInterval(interval); clearTimeout(stopAfter) }
  }, [polling, sessionId])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>Cargando sesión…</div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Sesión no encontrada</div>

  const r: any = data.report || {}
  const metrics: any = data.metrics || {}
  const score = data.score
  const feedback: any[] = r.feedback || []
  const praise = Array.isArray(r.praise) ? r.praise : (r.praise ? [r.praise] : [])
  const summary: string = r.summary || ''
  const connectors: string[] = r.connector_suggestions || []
  const vocab: any[] = r.vocab_suggestions || []
  const pron: any[] = r.pronunciation_notes || []
  const nextTip: string = r.next_session_tip || ''
  const ss: any = r.student_summary || {}
  const didWell: string[] = Array.isArray(ss.did_well) ? ss.did_well : []
  const toImprove: string[] = Array.isArray(ss.to_improve) ? ss.to_improve : []
  const durationMin = data.duration_seconds ? Math.round(data.duration_seconds / 60) : 0

  return (
    <div style={{
      maxWidth: 760, width: '100%', background: 'var(--surface)', borderRadius: 24,
      boxShadow: '0 24px 80px rgba(0,0,0,.4)', overflow: 'hidden',
    }}>
      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        color: 'white', padding: '28px 32px 32px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', opacity: .85, textTransform: 'uppercase', marginBottom: 6 }}>
          {polling ? 'Sesión finalizada · analizando…' : `Sesión #${data.id} · ${durationMin} min`}
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-.02em' }}>
          {polling
            ? 'Analizando tu charla…'
            : (praise[0] || '¡Buen trabajo!')}
        </h2>
        {!polling && praise.length > 1 && (
          <div style={{ fontSize: 14, opacity: .92, marginTop: 4 }}>
            {praise.slice(1).join(' · ')}
          </div>
        )}
        {!polling && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Stat label="Palabras" value={metrics.words_spoken ?? '—'} />
            <Stat label="WPM" value={metrics.wpm ?? '—'} />
            <Stat label="Keywords" value={`${metrics.keywords_hit ?? 0}/${metrics.keywords_total ?? 0}`} />
          </div>
        )}
      </div>

      {/* BODY */}
      <div style={{ padding: '24px 32px 32px' }}>
        {polling && (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--fg-3)' }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Estamos analizando lo que hablaste con Gemini Pro…</div>
            <div style={{ fontSize: 12 }}>Tarda 5-15 segundos. Al terminar aparece todo acá.</div>
          </div>
        )}

        {!polling && (
          <>
            {/* Resumen para el ALUMNO: lo que salió bien (arriba, destacado) + para la próxima
                (suave). Sin número/score — eso queda interno. */}
            {(didWell.length > 0 || toImprove.length > 0) && (
              <div style={{ marginBottom: 22 }}>
                {ss.vibe && <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 14, lineHeight: 1.4 }}>{ss.vibe}</div>}
                {didWell.length > 0 && (
                  <div style={{ background: 'rgba(0,179,126,.08)', border: '1px solid rgba(0,179,126,.25)', borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 11 }}>Lo que te salió bien</div>
                    {didWell.map((x, i) => (
                      <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 8, fontSize: 15, color: 'var(--fg-1)', lineHeight: 1.4 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}><polyline points="20 6 9 17 4 12" /></svg>
                        <span>{x}</span>
                      </div>
                    ))}
                  </div>
                )}
                {toImprove.length > 0 && (
                  <div style={{ background: 'var(--bg-2)', borderRadius: 14, padding: '14px 18px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 9 }}>Para la próxima</div>
                    {toImprove.map((x, i) => (
                      <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 6, fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.45 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--fg-4)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
                        <span>{x}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Resumen narrativo */}
            {summary && (
              <ReportBlock title="Resumen de la charla">
                <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55 }}>{summary}</div>
              </ReportBlock>
            )}

            {/* Errores / Feedback */}
            <ReportBlock title={feedback.length > 0 ? 'Puntos a pulir' : 'Sin errores importantes'}>
              {feedback.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Hablaste fluido. Seguí así.</div>
              ) : (
                feedback.map((fb, i) => (
                  <div key={i} style={{
                    border: '1px solid var(--border-1)', borderRadius: 12, padding: 14, marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <TypeChip type={fb.type} />
                      <span style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 500 }}>{fb.label}</span>
                    </div>
                    {fb.snippet_wrong && (
                      <div style={{
                        padding: 10, borderRadius: 8, fontSize: 13,
                        background: '#FCE8E9', color: '#5A1F22', marginBottom: 6,
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                        <span>"{fb.snippet_wrong}"</span>
                      </div>
                    )}
                    {fb.snippet_correct && (
                      <div style={{
                        padding: 10, borderRadius: 8, fontSize: 13,
                        background: 'var(--primary-tint)', color: '#024E36', marginBottom: fb.why ? 8 : 0,
                        display: 'flex', gap: 8, alignItems: 'flex-start',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12" /></svg>
                        <span>"{fb.snippet_correct}"</span>
                      </div>
                    )}
                    {fb.why && (
                      <div style={{ fontSize: 12, color: 'var(--fg-3)', fontStyle: 'italic', paddingLeft: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.4 1 1.2 1 2.05V17h6v-2.25c0-.85.4-1.65 1-2.05A7 7 0 0 0 12 2Z" /></svg>
                        <span>{fb.why}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </ReportBlock>

            {/* Conectores sugeridos */}
            {connectors.length > 0 && (
              <ReportBlock title="Conectores que enriquecerían tu habla">
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 10 }}>
                  Estas palabras te dan fluidez profesional. Intentá usarlas en la próxima sesión.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {connectors.map((c) => (
                    <span key={c} style={{
                      padding: '6px 12px', borderRadius: 999,
                      background: 'var(--primary-tint)', color: 'var(--primary-dark)',
                      fontSize: 13, fontWeight: 600,
                    }}>
                      {c}
                    </span>
                  ))}
                </div>
              </ReportBlock>
            )}

            {/* Vocabulario sugerido */}
            {vocab.length > 0 && (
              <ReportBlock title="Vocabulario para incorporar">
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 10 }}>
                  Palabras del nivel siguiente que encajarían bien en este tema.
                </div>
                {vocab.map((v, i) => (
                  <div key={i} style={{
                    padding: 12, background: 'var(--bg-2)', borderRadius: 10, marginBottom: 8,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)' }}>
                      {v.word}
                    </div>
                    {v.context && (
                      <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 4, fontStyle: 'italic' }}>
                        "{v.context}"
                      </div>
                    )}
                    {v.why && (
                      <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                        {v.why}
                      </div>
                    )}
                  </div>
                ))}
              </ReportBlock>
            )}

            {/* Pronunciación */}
            {pron.length > 0 && (
              <ReportBlock title="Notas de pronunciación">
                {pron.map((p, i) => (
                  <div key={i} style={{
                    padding: 12, background: '#FFF7E5', border: '1px solid rgba(255,184,0,.3)',
                    borderRadius: 10, marginBottom: 8,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#5A3D00' }}>{p.word}</div>
                    {p.issue && (
                      <div style={{ fontSize: 12, color: '#8A5A00', marginTop: 4 }}>
                        Sonó como: {p.issue}
                      </div>
                    )}
                    {p.tip && (
                      <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 4, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.4 1 1.2 1 2.05V17h6v-2.25c0-.85.4-1.65 1-2.05A7 7 0 0 0 12 2Z" /></svg>
                        <span>{p.tip}</span>
                      </div>
                    )}
                  </div>
                ))}
              </ReportBlock>
            )}

            {/* Consejo para próxima sesión */}
            {nextTip && (
              <div style={{
                marginTop: 18, padding: 16, borderRadius: 14,
                background: 'linear-gradient(135deg, var(--ink-1), var(--ink-2))',
                color: 'white',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', opacity: .65, textTransform: 'uppercase', marginBottom: 6 }}>
                  Para la próxima sesión
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>{nextTip}</div>
              </div>
            )}

            {/* TRANSCRIPCIÓN COMPLETA — collapsible */}
            {data.transcript && data.transcript.length > 0 && (
              <details style={{ marginTop: 20 }}>
                <summary style={{
                  cursor: 'pointer', padding: 12, background: 'var(--bg-2)', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, color: 'var(--fg-2)',
                }}>
                  Ver transcripción completa ({data.transcript.length} turnos)
                </summary>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.transcript.map((line, i) => (
                    <div key={i} style={{
                      padding: 10, borderRadius: 10, fontSize: 13, maxWidth: '90%',
                      background: line.who === 'ai' ? 'var(--bg-2)' : 'var(--primary)',
                      color: line.who === 'ai' ? 'var(--fg-1)' : 'white',
                      alignSelf: line.who === 'ai' ? 'flex-start' : 'flex-end',
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', opacity: .6, marginBottom: 3, textTransform: 'uppercase' }}>
                        {line.who === 'ai' ? 'Tutor' : 'Vos'}
                      </div>
                      {line.text}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {actions}
      </div>
    </div>
  )
}

function ReportBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase',
        color: 'var(--fg-3)', marginBottom: 10,
      }}>{title}</div>
      {children}
    </div>
  )
}

function TypeChip({ type }: { type: string }) {
  const meta: Record<string, { label: string; bg: string; color: string }> = {
    grammar: { label: 'Gramática', bg: 'var(--bg-2)', color: 'var(--fg-2)' },
    vocab: { label: 'Vocabulario', bg: '#F1E8FF', color: '#5B21B6' },
    vocabulary: { label: 'Vocabulario', bg: '#F1E8FF', color: '#5B21B6' },
    pronunciation: { label: 'Pronunciación', bg: '#FCE8E9', color: '#B42127' },
    fluency: { label: 'Fluidez', bg: 'var(--accent-tint)', color: '#8A5A00' },
    tense: { label: 'Tiempos verbales', bg: 'var(--bg-2)', color: 'var(--fg-2)' },
  }
  const m = meta[type] || { label: type, bg: 'var(--bg-2)', color: 'var(--fg-2)' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: 999,
      background: m.bg, color: m.color,
    }}>{m.label}</span>
  )
}

function Stat({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div style={{
      flex: 1, padding: '12px 14px', borderRadius: 12,
      background: highlight ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.13)',
    }}>
      <div style={{ fontSize: 11, opacity: .85, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: highlight ? 24 : 18, fontWeight: 800, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

/* ──────── VISTA SESIÓN INDIVIDUAL desde historial ──────── */
function SessionDetailView() {
  const { id } = useParams()
  const nav = useNavigate()
  const sessionId = Number(id)
  return (
    <div className="view" style={{ background: 'var(--bg-1)', padding: '24px 32px' }}>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => nav('/app/historial')} className="btn btn-ghost btn-sm">
          ← Volver al historial
        </button>
      </div>
      <SessionReport sessionId={sessionId} actions={
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={() => nav('/app/practicar')} className="btn btn-primary btn-lg" style={{ flex: 1 }}>
            Empezar nueva charla
          </button>
        </div>
      } />
    </div>
  )
}

/* ──────── MAPA ──────── */
function MapaView({ profile }: { profile: MeProfile | null }) {
  const nav = useNavigate()
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [levelProg, setLevelProg] = useState<LevelProgress | null>(null)
  const [allTopics, setAllTopics] = useState<Topic[]>([])

  useEffect(() => {
    sessionsAPI.list().then(setSessions).catch(() => {})
    meAPI.levelProgress().then(setLevelProg).catch(() => {})
    topicsAPI.list().then(setAllTopics).catch(() => {})
  }, [])

  if (!profile) return <PageSkel variant="grid" />

  const interests = profile.interests
  const progByTopic: Record<number, typeof profile.progress[number]> = {}
  for (const p of profile.progress) progByTopic[p.topic_id] = p

  // Construyo "rutas" a partir de los intereses; las estaciones son demo derivadas del progress real
  const routes = interests.map((t, idx) => {
    const prog = progByTopic[t.id]
    const stagesTotal = prog?.stages_total || 6
    const stagesDone = prog?.stages_done || 0
    const pct = prog?.pct ?? Math.round((stagesDone / stagesTotal) * 100)
    const sessionsCount = prog?.sessions_count ?? sessions.filter(s => s.topic_id === t.id).length
    const minutes = prog?.minutes_spoken ?? Math.round(sessions.filter(s => s.topic_id === t.id).reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60)
    const scores = sessions.filter(s => s.topic_id === t.id && s.score !== null).map(s => s.score as number)
    const avgFluency = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    const lastSess = sessions.filter(s => s.topic_id === t.id).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]

    return {
      topic: t,
      idx,
      stagesTotal,
      stagesDone,
      pct,
      sessionsCount,
      minutes,
      avgFluency,
      lastSess,
      hasRescue: profile.user.insistent_mode_enabled && stagesDone >= 2 && stagesDone < stagesTotal && idx === 0, // demo: solo la primer ruta tiene rescate
      isActive: stagesDone > 0,
    }
  }).sort((a, b) => b.stagesDone - a.stagesDone) // las que tienen progreso primero

  const totalStations = routes.reduce((sum, r) => sum + r.stagesTotal, 0) || 28
  const doneStations = routes.reduce((sum, r) => sum + r.stagesDone, 0)
  const activeRoutes = routes.filter(r => r.isActive).length
  const totalSessions = levelProg?.sessions_total ?? sessions.length
  const totalMinutes = Math.round((levelProg?.hours_spoken ?? 0) * 60) || routes.reduce((sum, r) => sum + r.minutes, 0)
  const xpWeek = sessions.filter(s => {
    const d = new Date(s.started_at).getTime()
    return Date.now() - d < 7 * 24 * 60 * 60 * 1000
  }).reduce((sum, s) => sum + (s.score || 0), 0)

  // tópicos por desbloquear: del catálogo, sacando los que ya son intereses
  const interestIds = new Set(interests.map(i => i.id))
  const toUnlock = allTopics.filter(t => !interestIds.has(t.id)).slice(0, 3)

  const activeRoute = routes.find(r => r.hasRescue)

  return (
    <div className="mapa-page">
      <section className="mp-greet">
        <div className="mp-eyebrow">Mapa de progreso</div>
        <h1 className="mp-title">
          {doneStations} estaciones <em>desbloqueadas</em>, {Math.max(0, totalStations - doneStations)} por delante.
        </h1>
        <p className="mp-sub">
          Cada tópico es una <b>ruta</b> con estaciones que se desbloquean charlando. Si un error se repite, una estación se bloquea hasta que la pelees — eso es el <b>modo insistente</b>.
        </p>
      </section>

      {/* STATS */}
      <div className="mp-stats">
        <div className="mp-mst green">
          <div className="k">Charlas totales</div>
          <div className="v">{totalSessions}</div>
          <div className="h">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min hablando</div>
        </div>
        <div className="mp-mst">
          <div className="k">Estaciones</div>
          <div className="v">{doneStations}<small className="cold">/ {totalStations}</small></div>
          <div className="h">{totalStations > 0 ? Math.round((doneStations / totalStations) * 100) : 0}% del mapa</div>
        </div>
        <div className="mp-mst">
          <div className="k">Rutas activas</div>
          <div className="v">{activeRoutes}<small className="cold">/ {interests.length} tópicos</small></div>
          <div className="h">{interests.length - activeRoutes} sin empezar</div>
        </div>
        <div className="mp-mst">
          <div className="k">Score esta semana</div>
          <div className="v">+{xpWeek}</div>
          <div className="h">{levelProg?.fluency_delta_30d !== null && levelProg?.fluency_delta_30d !== undefined ? `fluidez 30d ${levelProg.fluency_delta_30d > 0 ? '+' : ''}${levelProg.fluency_delta_30d}` : 'sumá una charla para arrancar'}</div>
        </div>
      </div>

      {/* RESCUE STRIP — visible solo si hay ruta con rescate */}
      {activeRoute && (
        <div className="mp-rescue-strip">
          <div className="ri">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
          </div>
          <div className="rt">
            <div className="eye">Modo insistente activado</div>
            <h4>Tu próxima estación está bloqueada hasta consolidar un error recurrente</h4>
            <p>Detectamos un patrón repetido en <b>{activeRoute.topic.title}</b>. Cuando lo limpies, se libera la siguiente estación.</p>
          </div>
          <button className="mp-btn-dark" onClick={() => nav(`/app/practicar?topic=${activeRoute.topic.id}`)}>Empezar rescate →</button>
        </div>
      )}

      <div className="mp-grid">
        {/* LEFT — rutas */}
        <div style={{ minWidth: 0 }}>

          <div className="mp-sh">
            <h2>Tus rutas</h2>
            <div className="meta">{activeRoutes} activas · {Math.max(0, interests.length - activeRoutes)} por activar</div>
          </div>

          {routes.length === 0 && (
            <div className="mp-card" style={{ padding: 30, textAlign: 'center', color: 'var(--mp-fg-3)' }}>
              Todavía no tenés tópicos elegidos. <Link to="/app/perfil" style={{ color: 'var(--mp-green-700)', fontWeight: 600 }}>Elegí algunos →</Link>
            </div>
          )}

          <div className="mp-routes">
            {routes.map((r) => (
              <RouteCard
                key={r.topic.id}
                route={r}
                onContinue={() => nav(`/app/practicar?topic=${r.topic.id}`)}
              />
            ))}
          </div>

          {toUnlock.length > 0 && (
            <>
              <div className="mp-sh" style={{ marginTop: 32 }}>
                <h2>Por desbloquear</h2>
                <div className="meta">{toUnlock.length} tópicos sugeridos del catálogo</div>
              </div>
              <div className="mp-next-grid">
                {toUnlock.map((t) => (
                  <div key={t.id} className="mp-next-rt">
                    <div className="nri" style={categoryIconStyle(t.category)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                    </div>
                    <div className="body">
                      <div className="eye">{t.category}</div>
                      <h4>{t.title}</h4>
                      <div className="gauge-mini"><i style={{ width: '0%' }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT — legend + achievements */}
        <aside className="mp-rc">
          <div className="mp-card mp-legend-card">
            <div className="mp-card-head"><h3>Cómo leer el mapa</h3></div>
            <div className="row">
              <div className="leg-dot done"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg></div>
              <div><div className="label">Estación dominada</div><div className="desc">la pasaste con buena fluidez</div></div>
            </div>
            <div className="row">
              <div className="leg-dot current" style={{ background: '#fff' }}></div>
              <div><div className="label">Acá vas</div><div className="desc">la próxima estación de la ruta</div></div>
            </div>
            <div className="row">
              <div className="leg-dot rescue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
              <div><div className="label">Misión de rescate</div><div className="desc">tenés un error repetido que pulir</div></div>
            </div>
            <div className="row">
              <div className="leg-dot locked"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
              <div><div className="label">Bloqueada</div><div className="desc">se libera con la anterior</div></div>
            </div>
            <div className="row">
              <div className="leg-dot" style={{ background: 'var(--mp-bg-2)', fontFamily: 'var(--mp-font-display)', fontWeight: 800, color: 'var(--mp-fg-4)', fontSize: 13 }}>★</div>
              <div><div className="label">Final de ruta</div><div className="desc">desbloquea badge + nuevo tópico</div></div>
            </div>
          </div>

          <div className="mp-card">
            <div className="mp-card-head">
              <h3>Logros</h3>
              <span className="h-meta">{computeAchievements(profile, sessions).unlocked} / {computeAchievements(profile, sessions).total}</span>
            </div>
            <div className="mp-ach-grid">
              {computeAchievements(profile, sessions).items.map((a) => (
                <div key={a.id} className={`ach ${a.state}`}>
                  <div className="ai">{a.icon}</div>
                  <div className="at">{a.label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ── Route card ── */
function RouteCard({ route, onContinue }: { route: any; onContinue: () => void }) {
  const t = route.topic
  const catKey = catSlug(t.category)
  const stations = buildStations(route)
  const lineProgress = Math.min(100, (route.stagesDone / Math.max(1, route.stagesTotal - 1)) * 100)
  return (
    <article className={`mp-route ${route.isActive ? 'active' : ''}`}>
      <div className="mp-route-head">
        <div className={`mp-route-ico cat-${catKey}`}>
          <CategoryIcon cat={catKey} />
        </div>
        <div className="rinfo">
          <div className={`rcat ${catKey}`}>{t.category}</div>
          <h3>{t.title}</h3>
        </div>
        <div className="rprog">
          <div className="p-num"><b>{route.stagesDone}</b> / {route.stagesTotal} estaciones</div>
          <div className="p-bar"><i style={{ width: `${route.pct}%` }}></i></div>
        </div>
      </div>

      <div className="mp-track" style={{ gridTemplateColumns: `repeat(${route.stagesTotal}, 1fr)` }}>
        <div className="mp-track-line"><span className="progress" style={{ width: `${lineProgress}%` }}></span></div>
        {stations.map((st, i) => (
          <div key={i} className={`node ${st.state}`}>
            <div className="dot">
              {st.state === 'done' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>}
              {st.state === 'current' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/></svg>}
              {(st.state === 'locked' || st.state === 'rescue') && i < route.stagesTotal - 1 && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>}
              {i === route.stagesTotal - 1 && st.state !== 'done' && st.state !== 'current' && <span style={{ fontWeight: 800 }}>★</span>}
            </div>
            <div className="nlabel">{st.label}</div>
            <div className="nsub">{st.sub}</div>
          </div>
        ))}
      </div>

      <div className="mp-route-foot">
        <div className="meta">
          <span><b>{route.sessionsCount} charla{route.sessionsCount === 1 ? '' : 's'}</b> en esta ruta</span>
          {route.avgFluency !== null && <span><b>fluidez {route.avgFluency}</b> promedio</span>}
          {route.lastSess && <span>último: <b>{relativeDays(route.lastSess.started_at)}</b></span>}
        </div>
        <button className="mp-btn-primary" onClick={onContinue}>{route.stagesDone === 0 ? 'Empezar →' : 'Continuar →'}</button>
      </div>
    </article>
  )
}

/* ── helpers de mapa ── */
function catSlug(cat: string): string {
  const c = (cat || '').toLowerCase()
  if (c.includes('tec') || c.includes('ia')) return 'tec'
  if (c.includes('arte') || c.includes('música') || c.includes('musica') || c.includes('entret')) return 'arte'
  if (c.includes('vida') || c.includes('life') || c.includes('fit')) return 'life'
  if (c.includes('depor')) return 'dep'
  if (c.includes('cien')) return 'cien'
  if (c.includes('viaj')) return 'via'
  if (c.includes('gast') || c.includes('comid')) return 'gas'
  return 'gen'
}

function CategoryIcon({ cat }: { cat: string }) {
  const common = { fill: 'none' as const, stroke: 'currentColor' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (cat === 'tec') return <svg viewBox="0 0 24 24" {...common}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
  if (cat === 'arte') return <svg viewBox="0 0 24 24" {...common}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
  if (cat === 'life') return <svg viewBox="0 0 24 24" {...common}><path d="M6 3v18M18 3v18M3 8h18M3 16h18"/></svg>
  if (cat === 'dep') return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>
  if (cat === 'cien') return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/></svg>
  if (cat === 'via') return <svg viewBox="0 0 24 24" {...common}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
  if (cat === 'gas') return <svg viewBox="0 0 24 24" {...common}><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/></svg>
  return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="9"/></svg>
}

function categoryIconStyle(cat: string): React.CSSProperties {
  const s = catSlug(cat)
  const colors: Record<string, { background: string; color: string }> = {
    tec: { background: '#EEF2FF', color: '#4338CA' },
    arte: { background: '#F3E8FF', color: '#7C3AED' },
    life: { background: '#FCE7F3', color: '#BE185D' },
    dep: { background: '#FFEDD5', color: '#C2410C' },
    cien: { background: '#CFFAFE', color: '#0E7490' },
    via: { background: '#DBEAFE', color: '#1D4ED8' },
    gas: { background: '#FFE4E6', color: '#BE123C' },
    gen: { background: '#F1F4F1', color: '#3A4441' },
  }
  return colors[s] || colors.gen
}

interface Station { label: string; sub: string; state: 'done' | 'current' | 'locked' | 'rescue' }

function buildStations(route: any): Station[] {
  const total = route.stagesTotal
  const done = route.stagesDone
  const labels = generateStationLabels(route.topic, total)
  const stations: Station[] = []
  for (let i = 0; i < total; i++) {
    let state: Station['state'] = 'locked'
    let sub = 'bloqueada'
    if (i < done) {
      state = 'done'
      sub = ''
    } else if (i === done && route.hasRescue && i === 2) {
      state = 'rescue'
      sub = 'rescate'
    } else if (i === done) {
      state = 'current'
      sub = 'acá vas'
    }
    if (i === total - 1 && state === 'locked') sub = 'final'
    stations.push({ label: labels[i] || `Estación ${i + 1}`, sub, state })
  }
  return stations
}

function generateStationLabels(topic: any, total: number): string[] {
  const kws: string[] = topic.keywords || []
  const base = topic.title.split(' ')[0]
  const generic = ['Bases', 'Conceptos clave', 'Profundización', 'Casos reales', 'Vocabulario avanzado', 'Cierre y dominio']
  const labels: string[] = []
  for (let i = 0; i < total; i++) {
    if (kws[i]) labels.push(kws[i])
    else labels.push(generic[i] || `${base} · etapa ${i + 1}`)
  }
  return labels
}

function relativeDays(iso: string): string {
  const d = new Date(iso)
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

interface Achievement { id: string; label: string; state: 'unlocked' | 'amber' | 'locked'; icon: React.ReactNode }

function computeAchievements(profile: MeProfile, sessions: SessionData[]): { items: Achievement[]; unlocked: number; total: number } {
  const u = profile.user
  const totalSessions = sessions.length
  const streakBest = u.streak_best || 0
  const hasRescue = sessions.some(s => s.is_rescue)
  const fluencyScores = sessions.map(s => s.score).filter((s): s is number => s !== null)
  const avgFluency = fluencyScores.length > 0 ? fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length : 0
  const activeRoutes = profile.interests.filter(t => sessions.some(s => s.topic_id === t.id)).length

  const icon = (path: React.ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>

  const all: Achievement[] = [
    { id: 'streak7', label: 'Racha 7 días', state: streakBest >= 7 ? 'unlocked' : 'locked', icon: icon(<path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-6 0 2 1 3 2 3 0-3 1-6 4-9 0 4 6 6 6 12 0 4-3 7-8 7z"/>) },
    { id: 'rescue1', label: 'Primer rescate', state: hasRescue ? 'unlocked' : 'locked', icon: icon(<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>) },
    { id: 'flu20', label: 'Fluidez 70+', state: avgFluency >= 70 ? 'unlocked' : 'locked', icon: icon(<path d="M3 12h4l3-8 4 16 3-8h4"/>) },
    { id: 'streak14', label: 'Racha 14 días', state: streakBest >= 14 ? 'amber' : 'locked', icon: icon(<path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-6 0 2 1 3 2 3 0-3 1-6 4-9 0 4 6 6 6 12 0 4-3 7-8 7z"/>) },
    { id: 'routes5', label: '5 rutas activas', state: activeRoutes >= 5 ? 'unlocked' : 'locked', icon: icon(<><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/></>) },
    { id: 's10', label: '10 charlas', state: totalSessions >= 10 ? 'unlocked' : 'locked', icon: icon(<><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></>) },
    { id: 'route1', label: 'Ruta completa', state: profile.progress.some(p => p.pct >= 100) ? 'unlocked' : 'locked', icon: icon(<path d="M5 12l5 5L20 7"/>) },
    { id: 'c1', label: 'Nivel C1', state: (u.cefr_level === 'C1' || u.cefr_level === 'C2') ? 'unlocked' : 'locked', icon: icon(<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>) },
    { id: 's100', label: '100 charlas', state: totalSessions >= 100 ? 'unlocked' : 'locked', icon: icon(<circle cx="12" cy="12" r="9"/>) },
  ]
  const unlocked = all.filter(a => a.state !== 'locked').length
  return { items: all, unlocked, total: all.length }
}

/* ──────── HISTORIAL ──────── */
function HistorialView() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    sessionsAPI.list().then((s) => { setSessions(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])
  return (
    <div className="view">
      <div className="view-head">
        <h2>Historial de sesiones</h2>
        <div className="sub">{sessions.length} sesiones registradas.</div>
      </div>
      {loading && <div style={{ color: 'var(--fg-3)' }}>Cargando…</div>}
      {!loading && sessions.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-3)' }}>
          Todavía no tenés sesiones. <Link to="/app/practicar" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>Empezá tu primera charla</Link>.
        </div>
      )}
      <div className="history-grid">
        {sessions.map((s) => (
          <Link
            key={s.id}
            to={`/app/sesiones/${s.id}`}
            className="history-row"
            style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <div className="when"><b>{formatDay(s.started_at)}</b>{formatTime(s.started_at)}</div>
            <div>
              <div className="h-title">Sesión #{s.id}</div>
              <div className="h-topic">
                <span>{s.cefr_at_start}</span><span>·</span>
                <span>{s.duration_seconds ? `${Math.round(s.duration_seconds / 60)} min` : '—'}</span>
              </div>
            </div>
            <div className="metric"><span className="l">Status</span><span className="v">{s.status}</span></div>
            <div className="metric"><span className="l">Score</span><span className="v">{s.score ?? '—'}</span></div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ──────── PERFIL ──────── */
function PerfilView({ profile, onChange }: { profile: MeProfile | null; onChange: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  useEffect(() => {
    templatesAPI.list().then(setTemplates).catch(() => {})
  }, [])
  if (!profile) return <PageSkel variant="hero" />
  const u = profile.user
  const initial = u.nombre[0]?.toUpperCase() || 'U'

  const toggleInsistent = async () => {
    await meAPI.updateSettings({ insistent_mode_enabled: !u.insistent_mode_enabled })
    onChange()
  }
  const handleResetInterests = async () => {
    if (!confirm('¿Reiniciar tus intereses? Vas a volver a elegir tus tópicos desde cero.')) return
    try {
      await onboardingAPI.reset()
      toast.success('Intereses reseteados — volvé a empezar')
      onChange()
    } catch {
      toast.error('No pude resetear')
    }
  }
  const toggleReminder = async () => {
    await meAPI.updateSettings({ daily_reminder_enabled: !u.daily_reminder_enabled })
    onChange()
  }
  const changeTemplate = async (newId: number) => {
    await meAPI.updateSettings({ active_template_id: newId })
    toast.success('Tutor cambiado')
    onChange()
  }

  return (
    <div className="view">
      <div className="view-head">
        <h2>Tu perfil</h2>
        <div className="sub">Tutor activo, intereses, configuración y datos de cuenta.</div>
      </div>
      <div className="profile-grid">
        <div className="profile-header">
          <div className="av">{initial}</div>
          <div style={{ flex: 1 }}>
            <h2>{u.nombre} {u.apellido}</h2>
            <div className="meta">{u.target_language === 'en' ? 'Inglés' : u.target_language === 'pt' ? 'Portugués' : u.target_language === 'it' ? 'Italiano' : u.target_language === 'fr' ? 'Francés' : u.target_language === 'de' ? 'Alemán' : u.target_language} · {u.cefr_level} · {profile.total_sessions} charlas</div>
          </div>
        </div>

        <div className="profile-card">
          <h3>¿Qué idioma querés aprender?</h3>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14,
          }}>
            {[
              { code: 'en', label: 'Inglés', short: 'EN', color: '#1E4FB0' },
              { code: 'pt', label: 'Portugués', short: 'PT', color: '#65A30D' },
              { code: 'it', label: 'Italiano', short: 'IT', color: '#16A34A' },
              { code: 'fr', label: 'Francés', short: 'FR', color: '#3B82F6' },
              { code: 'de', label: 'Alemán', short: 'DE', color: '#0E1614' },
            ].map((opt) => {
              const active = u.target_language === opt.code
              return (
                <button
                  key={opt.code}
                  onClick={async () => {
                    if (active) return
                    await meAPI.updateSettings({ target_language: opt.code })
                    toast.success(`Idioma: ${opt.label}`)
                    onChange()
                  }}
                  style={{
                    flex: '1 1 140px', minWidth: 130,
                    padding: '14px 16px', borderRadius: 14,
                    border: active ? '2px solid var(--primary)' : '1px solid var(--border-2)',
                    background: active ? 'var(--primary-tint)' : 'var(--surface)',
                    color: active ? 'var(--primary-dark)' : 'var(--fg-1)',
                    fontSize: 15, fontWeight: 700, cursor: active ? 'default' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    boxShadow: active ? '0 4px 14px rgba(0,179,126,.18)' : 'none',
                    transition: 'all 180ms',
                  }}
                >
                  <span style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: opt.color, color: 'white',
                    display: 'grid', placeItems: 'center',
                    fontSize: 12, fontWeight: 800, letterSpacing: '.04em',
                  }}>{opt.short}</span>
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="profile-card">
          <h3>Tutor activo</h3>
          {profile.active_template && (
            <div className="tutor-active">
              <div className="av">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" /></svg>
              </div>
              <div className="body">
                <div className="n">{profile.active_template.name}</div>
                <div className="d">{profile.active_template.description}</div>
              </div>
              <span className="pill pill-primary">En uso</span>
            </div>
          )}
          {templates.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--fg-3)', marginBottom: 6 }}>
                Cambiar tutor
              </div>
              <select
                value={profile.active_template?.id ?? ''}
                onChange={(e) => changeTemplate(parseInt(e.target.value, 10))}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid var(--border-2)', background: 'var(--surface)',
                  color: 'var(--fg-1)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {t.description}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <InterestsCard profile={profile} onChange={onChange} />
        <AddInterestCard profile={profile} onChange={onChange} />

        <LevelCard profile={profile} onChange={onChange} />

        <LanguageCard profile={profile} onChange={onChange} />

        <div className="profile-card">
          <h3>Configuración</h3>
          <div className="settings-list">
            <SettingsRow
              label="Acento del tutor"
              sub="Cómo te suena la IA en inglés"
              selectValue={u.accent_preference}
              selectOptions={[
                { value: 'uk_f', label: 'UK · Mujer (Lily)' },
                { value: 'uk_m', label: 'UK · Hombre (George)' },
                { value: 'us_f', label: 'US · Mujer (Sarah)' },
                { value: 'us_m', label: 'US · Hombre (Eric)' },
              ]}
              onSelectChange={async (v) => { await meAPI.updateSettings({ accent_preference: v }); onChange() }}
            />
            <SettingsRow label="Duración objetivo" sub="Cuánto querés hablar por sesión" value={`${u.target_minutes_per_session} min`} />
            <SettingsRow label="Privacidad de audio" sub="Cuándo borramos lo que grabás" value={`${u.audio_retention_days} días`} />
            <SettingsRow label="Modo insistente" sub="Forzar misiones de rescate al detectar errores repetidos" switchOn={u.insistent_mode_enabled} onSwitchToggle={toggleInsistent} />
            <SettingsRow label="Recordatorio diario" sub="Notificación a las 8am" switchOn={u.daily_reminder_enabled} onSwitchToggle={toggleReminder} />
            <div className="settings-row">
              <div className="ico" style={{ color: 'var(--danger)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>
                </svg>
              </div>
              <div className="body">
                <div className="l">Resetear intereses</div>
                <div className="s">Borra tus tópicos y vuelve a preguntarte todo</div>
              </div>
              <button
                onClick={handleResetInterests}
                style={{
                  padding: '7px 14px', borderRadius: 999,
                  border: '1px solid var(--danger)', background: 'transparent',
                  color: 'var(--danger)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3>Cuenta y plan</h3>
          <div style={{ padding: 14, background: 'linear-gradient(135deg, var(--primary-tint) 0%, white 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800, textTransform: 'uppercase' }}>{u.plan[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>Plan {u.plan}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{u.email}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { localStorage.clear(); window.location.href = '/login' }}
            style={{ color: 'var(--danger)' }}
          >
            Cerrar sesión
          </button>
        </div>

        {u.role === 'admin' && (
          <div className="profile-card">
            <h3>Back office</h3>
            <div className="settings-list">
              <Link to="/admin" className="settings-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg></div>
                <div className="body"><div className="l">Backoffice</div><div className="s">Panel de administración</div></div>
              </Link>
              <Link to="/app/qa" className="settings-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg></div>
                <div className="body"><div className="l">QA Harness</div><div className="s">Pruebas y evaluación</div></div>
              </Link>
              <Link to="/app/admin/users" className="settings-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                <div className="body"><div className="l">Usuarios</div><div className="s">Gestión de cuentas</div></div>
              </Link>
              <Link to="/admin/auditoria" className="settings-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg></div>
                <div className="body"><div className="l">Auditoría de clases</div><div className="s">Reglas aplicadas, prompt armado y transcripción por charla</div></div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const LANG_OPTIONS = [
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'pt', label: 'Português', flag: 'BR' },
  { code: 'en', label: 'English', flag: 'EN' },
] as const

function LanguageCard({ profile, onChange }: { profile: MeProfile; onChange: () => void }) {
  const u = profile.user
  const [saving, setSaving] = useState(false)

  const setLang = async (field: 'target_language' | 'base_language', code: string) => {
    setSaving(true)
    try {
      await meAPI.updateSettings({ [field]: code } as any)
      onChange()
      toast.success('Idioma actualizado')
    } catch { toast.error('No pudimos actualizar') }
    finally { setSaving(false) }
  }

  return (
    <div className="profile-card">
      <h3>Idiomas</h3>
      <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 12 }}>
        El idioma que querés practicar y el que hablás como nativo (para el feedback).
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Querés aprender</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LANG_OPTIONS.map((l) => {
            const active = u.target_language === l.code
            return (
              <button
                key={l.code}
                onClick={() => setLang('target_language', l.code)}
                disabled={saving}
                style={{
                  padding: '8px 14px', borderRadius: 10, border: '1.5px solid', cursor: 'pointer',
                  background: active ? 'var(--primary-tint)' : 'var(--bg-1)',
                  borderColor: active ? 'var(--primary)' : 'var(--border-1)',
                  fontWeight: 600, fontSize: 13, color: active ? 'var(--primary-dark)' : 'var(--fg-2)',
                  fontFamily: 'inherit',
                }}
              >
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Tu idioma nativo (feedback)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LANG_OPTIONS.map((l) => {
            const active = u.base_language === l.code
            return (
              <button
                key={l.code}
                onClick={() => setLang('base_language', l.code)}
                disabled={saving}
                style={{
                  padding: '8px 14px', borderRadius: 10, border: '1.5px solid', cursor: 'pointer',
                  background: active ? 'var(--primary-tint)' : 'var(--bg-1)',
                  borderColor: active ? 'var(--primary)' : 'var(--border-1)',
                  fontWeight: 600, fontSize: 13, color: active ? 'var(--primary-dark)' : 'var(--fg-2)',
                  fontFamily: 'inherit',
                }}
              >
                {l.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const LEVEL_STEPS = [
  { cefr: 'A0', name: 'Nivel inicial',  desc: 'Cero base · el coach guía y modela cada frase', color: '#FFB800' },
  { cefr: 'A1', name: 'Recién empiezo', desc: 'Frases cortas, mucho refuerzo', color: '#5EE0B0' },
  { cefr: 'A2', name: 'Me defiendo',    desc: 'Charla simple, perdona errores chicos', color: '#1FC18E' },
  { cefr: 'B1', name: 'Hablo OK',       desc: 'Equilibrio fluidez y precisión', color: '#00B37E' },
  { cefr: 'B2', name: 'Bastante fluido', desc: 'Vocabulario profesional, ritmo natural', color: '#008F63' },
  { cefr: 'C1', name: 'Pro',            desc: 'Crítica fuerte, idioms, registros formales', color: '#054A3A' },
] as const

function LevelCard({ profile, onChange }: { profile: MeProfile; onChange: () => void }) {
  const u = profile.user
  const current = u.cefr_level || 'B1'
  const isManual = u.cefr_manual === true
  const [saving, setSaving] = useState(false)

  const setLevel = async (cefr: string) => {
    if (cefr === current && isManual) return
    setSaving(true)
    try {
      await meAPI.updateSettings({ cefr_level: cefr, cefr_manual: true })
      onChange()
      toast.success(`Nivel actualizado a ${cefr}`)
    } catch {
      toast.error('No pudimos actualizar el nivel')
    } finally {
      setSaving(false)
    }
  }

  const resetAuto = async () => {
    setSaving(true)
    try {
      await meAPI.updateSettings({ cefr_manual: false })
      onChange()
      toast.success('Nivel volverá a auto-ajustarse según tu progreso')
    } catch {
      toast.error('No pudimos cambiar a auto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-card level-card">
      <h3>Tu nivel</h3>
      <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 14, lineHeight: 1.5 }}>
        {isManual
          ? <>Lo elegiste vos manualmente. <button onClick={resetAuto} disabled={saving} style={{ background: 'none', border: 0, color: 'var(--primary-dark)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Volver a auto →</button></>
          : <>Se ajusta solo según tu progreso. Si querés forzarlo, elegí un nivel:</>
        }
      </div>
      <div className="level-steps">
        {LEVEL_STEPS.map((s) => {
          const active = s.cefr === current
          return (
            <button
              key={s.cefr}
              className={`level-step${active ? ' active' : ''}`}
              onClick={() => setLevel(s.cefr)}
              disabled={saving}
              style={active ? { borderColor: s.color, background: `${s.color}1A` } : undefined}
            >
              <div className="ls-cefr" style={active ? { color: s.color } : undefined}>{s.cefr}</div>
              <div className="ls-body">
                <div className="ls-name">{s.name}</div>
                <div className="ls-desc">{s.desc}</div>
              </div>
              {active && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SettingsRow({ label, sub, value, switchOn, onSwitchToggle, selectValue, selectOptions, onSelectChange }: {
  label: string; sub: string; value?: string;
  switchOn?: boolean; onSwitchToggle?: () => void;
  selectValue?: string;
  selectOptions?: { value: string; label: string }[];
  onSelectChange?: (v: string) => void;
}) {
  return (
    <div className="settings-row">
      <div className="ico">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
      </div>
      <div className="body">
        <div className="l">{label}</div>
        <div className="s">{sub}</div>
      </div>
      {selectOptions ? (
        <select
          value={selectValue}
          onChange={(e) => onSelectChange?.(e.target.value)}
          style={{
            padding: '6px 10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-2)',
            color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {selectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : switchOn !== undefined
        ? <div className={`switch${switchOn ? '' : ' off'}`} onClick={onSwitchToggle} style={{ cursor: 'pointer' }} />
        : value ? <span className="v">{value}</span> : null}
    </div>
  )
}

/* ──────── intereses card (drag & drop) ──────── */
function InterestsCard({ profile, onChange }: { profile: MeProfile; onChange: () => void }) {
  const [items, setItems] = useState(profile.interests)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Sincronizar si el perfil del padre cambia (ej. después de un add/remove)
  useEffect(() => { setItems(profile.interests) }, [profile.interests])

  const persistOrder = async (newItems: typeof items) => {
    setSaving(true)
    try {
      await topicsAPI.reorder(newItems.map(i => i.id))
      onChange()
    } catch {
      toast.error('No se pudo guardar el orden')
    } finally {
      setSaving(false)
    }
  }

  const handleDrop = (toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); return }
    const next = [...items]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(toIdx, 0, moved)
    setItems(next)
    setDragIdx(null)
    persistOrder(next)
  }

  const handleRemove = async (topicId: number) => {
    if (!confirm('¿Quitar este interés?')) return
    try {
      await topicsAPI.removeInterest(topicId)
      toast.success('Interés quitado')
      onChange()
    } catch { toast.error('No se pudo quitar') }
  }

  return (
    <div className="profile-card">
      <h3>Tus intereses {saving && <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 400 }}>guardando…</span>}</h3>
      <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 12 }}>
        Arrastrá para reordenar. El orden manda en /Practicar.
      </div>
      {items.length === 0 ? (
        <div style={{ color: 'var(--fg-3)', fontSize: 13 }}>Todavía no elegiste intereses.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((i, idx) => (
            <div
              key={i.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => setDragIdx(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: dragIdx === idx ? 'var(--primary-tint)' : 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                cursor: 'grab',
                opacity: dragIdx === idx ? 0.5 : 1,
              }}
            >
              <span style={{ color: 'var(--fg-3)', fontSize: 18, cursor: 'grab' }}>⋮⋮</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-dark)', minWidth: 18 }}>#{idx + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{i.title}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'capitalize' }}>{i.category}</div>
              </div>
              <button
                onClick={() => handleRemove(i.id)}
                style={{ background: 'transparent', border: 0, color: 'var(--fg-3)', cursor: 'pointer', padding: 6, borderRadius: 6 }}
                title="Quitar"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddInterestCard({ profile, onChange }: { profile: MeProfile; onChange: () => void }) {
  const [catalog, setCatalog] = useState<Topic[]>([])
  const [q, setQ] = useState('')
  useEffect(() => {
    topicsAPI.list().then(setCatalog).catch(() => {})
  }, [])
  const interestIds = new Set(profile.interests.map(i => i.id))
  const available = catalog.filter(t => !interestIds.has(t.id))
  const filtered = q
    ? available.filter(t => t.title.toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase()))
    : available

  const handleAdd = async (topicId: number) => {
    try {
      await topicsAPI.addInterest(topicId)
      toast.success('Interés agregado')
      onChange()
    } catch { toast.error('No se pudo agregar') }
  }

  return (
    <div className="profile-card">
      <h3>Agregar interés</h3>
      <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 12 }}>
        Del catálogo de {catalog.length} tópicos · {available.length} disponibles
      </div>
      <input
        type="text"
        placeholder="Buscar por título o categoría…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10,
          border: '1px solid var(--border-2)', background: 'var(--surface)',
          color: 'var(--fg-1)', fontSize: 16, marginBottom: 12, outline: 'none',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--fg-3)', fontSize: 13, textAlign: 'center', padding: 20 }}>
            {q ? 'Sin resultados' : 'No hay más tópicos disponibles'}
          </div>
        )}
        {filtered.slice(0, 20).map((t) => (
          <button
            key={t.id}
            onClick={() => handleAdd(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border-1)',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t.title} {t.is_hot && <span style={{ fontSize: 11 }}>🔥</span>}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'capitalize' }}>{t.category}</div>
            </div>
            <span style={{ color: 'var(--primary)', fontSize: 18, fontWeight: 700 }}>+</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ──────── section title (eyebrow + hint con divider sutil) ──────── */
function SectionTitle({ eyebrow, hint }: { eyebrow: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase',
        color: 'var(--fg-2)',
      }}>{eyebrow}</div>
      {hint && (
        <>
          <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
          <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{hint}</div>
        </>
      )}
    </div>
  )
}

/* ──────── topic picker ──────── */

// Mapping categoría → color + ícono SVG
const CATEGORY_META: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  tech:        { color: '#1E4FB0', bg: '#E6EFFF', label: 'Tecnología', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
  arte:        { color: '#5B21B6', bg: '#F1E8FF', label: 'Arte',       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> },
  lifestyle:   { color: '#008F63', bg: '#E6F7F1', label: 'Lifestyle',  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  diseno:      { color: '#8A5A00', bg: '#FFF4D6', label: 'Diseño',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  negocios:    { color: '#0E1614', bg: '#EAEDE8', label: 'Negocios',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
  viajes:      { color: '#3B82F6', bg: '#DBEAFE', label: 'Viajes',     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg> },
  deportes:    { color: '#C2410C', bg: '#FFEDD5', label: 'Deportes',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.53 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg> },
  gastronomia: { color: '#B91C1C', bg: '#FEE2E2', label: 'Gastronomía',icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg> },
  ciencia:     { color: '#0891B2', bg: '#CFFAFE', label: 'Ciencia',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/></svg> },
  general:     { color: '#5A625F', bg: '#F2F4F1', label: 'General',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg> },
}

function isLevelMatch(topic: { levels?: string[] | null }, userLevel: string): boolean {
  // Compatible si el topic no declara levels, o si el user level esta dentro de los soportados
  if (!topic.levels || topic.levels.length === 0) return true
  if (topic.levels.includes(userLevel)) return true
  // fallback: si el user es A1/A2 y el topic mas bajo es B1, no le mostramos primero (queremos progresion)
  return false
}

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] || CATEGORY_META.general
}

interface TopicPickProps {
  title: string
  category: string
  variant?: 'featured' | 'interest' | 'catalog' | 'free'
  position?: number  // #1, #2... solo para "interest"
  hot?: boolean
  onClick: () => void
}

function TopicPick({ title, category, variant = 'catalog', position, hot, onClick }: TopicPickProps) {
  const meta = getCategoryMeta(category)
  const isFeatured = variant === 'featured'
  const isFree = variant === 'free'

  // Estilos según variant
  let cardStyle: React.CSSProperties
  let iconBoxStyle: React.CSSProperties
  let categoryTextColor: string
  let titleColor: string

  if (isFeatured) {
    cardStyle = {
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
      border: 'none', color: 'white',
    }
    iconBoxStyle = { background: 'rgba(255,255,255,.22)', color: 'white' }
    categoryTextColor = 'rgba(255,255,255,.85)'
    titleColor = 'white'
  } else if (variant === 'interest') {
    cardStyle = {
      background: 'var(--surface)',
      border: '1px solid var(--border-1)',
      borderTop: `3px solid ${meta.color}`,
      boxShadow: '0 1px 2px rgba(13,20,18,.04)',
    }
    iconBoxStyle = { background: meta.bg, color: meta.color }
    categoryTextColor = meta.color
    titleColor = 'var(--fg-1)'
  } else if (isFree) {
    cardStyle = {
      background: '#0E1614', border: 'none', color: 'white',
    }
    iconBoxStyle = { background: 'rgba(255,184,0,.20)', color: '#FFB800' }
    categoryTextColor = '#FFB800'
    titleColor = 'white'
  } else {
    cardStyle = {
      background: 'var(--surface)', border: '1px solid var(--border-1)',
    }
    iconBoxStyle = { background: meta.bg, color: meta.color }
    categoryTextColor = meta.color
    titleColor = 'var(--fg-1)'
  }

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
        padding: 18, borderRadius: 16,
        cursor: 'pointer', textAlign: 'left',
        transition: 'all .18s var(--ease)',
        minHeight: 130,
        ...cardStyle,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = isFeatured
          ? '0 16px 32px rgba(0,179,126,.30)'
          : isFree
            ? '0 16px 32px rgba(13,20,18,.40)'
            : '0 10px 24px rgba(13,20,18,.10)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = variant === 'interest' ? '0 1px 2px rgba(13,20,18,.04)' : 'none'
      }}
    >
      {/* Top row: icono + chip hot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          display: 'grid', placeItems: 'center',
          ...iconBoxStyle,
        }}>
          {isFree ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" /></svg>
          ) : meta.icon}
        </div>
        {hot && (
          <span style={{
            background: isFeatured ? 'rgba(255,255,255,.22)' : 'var(--accent-tint)',
            color: isFeatured ? 'white' : '#8A5A00',
            fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
            padding: '3px 8px', borderRadius: 999,
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 0C13.5 0 14.5 4 11 7C7.5 10 6 12 6 15C6 19.4 9.6 23 14 23C18.4 23 22 19.4 22 15C22 11 19 8 17 5C15 2 13.5 0 13.5 0Z"/></svg>
              HOT
            </span>
          </span>
        )}
        {position !== undefined && (
          <span style={{
            background: isFeatured ? 'rgba(255,255,255,.22)' : meta.bg,
            color: isFeatured ? 'white' : meta.color,
            fontSize: 11, fontWeight: 800,
            padding: '3px 8px', borderRadius: 999, fontVariantNumeric: 'tabular-nums',
            border: isFeatured ? 'none' : `1px solid ${meta.color}22`,
          }}>
            #{position}
          </span>
        )}
      </div>

      {/* Bottom: categoría + título */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
          color: categoryTextColor, marginBottom: 4,
        }}>
          {isFree ? 'Tutor improvisa' : meta.label}
        </div>
        <div style={{
          fontSize: 15, fontWeight: 700, color: titleColor, lineHeight: 1.25,
          letterSpacing: '-.01em',
        }}>{title}</div>
      </div>
    </button>
  )
}

/* ──────── helpers ──────── */
function cefrPct(level: string): number {
  return { A0: 2, A1: 8, A2: 18, B1: 34, B2: 62, C1: 84, C2: 95 }[level] ?? 30
}
function formatDay(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()]
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}
function formatTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}
function topicTitleFromSession(profile: MeProfile, s: SessionData): string {
  if (!s.topic_id) return 'Tema libre'
  const interest = profile.interests.find((i) => i.id === s.topic_id)
  return interest?.title || `Tópico #${s.topic_id}`
}

/* Selector de fondo para la pantalla de charla (5 opciones) */
const BG_OPTIONS = [
  { id: 0, label: 'Solid', short: 'S' },
  { id: 1, label: 'Aurora', short: 'A' },
  { id: 2, label: 'Mesh',   short: 'M' },
  { id: 3, label: 'Grid',   short: 'G' },
  { id: 4, label: 'Stars',  short: '*' },
  { id: 5, label: 'Ripple', short: 'R' },
]
function BgPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="bg-picker" role="radiogroup" aria-label="Fondo de la pantalla">
      {BG_OPTIONS.map((o) => (
        <button
          key={o.id}
          className={`bgp-${o.id}${value === o.id ? ' active' : ''}`}
          onClick={() => onChange(o.id)}
          title={o.label}
          aria-label={o.label}
          aria-pressed={value === o.id}
        />
      ))}
    </div>
  )
}

type PedagogyId = 'entrevistador' | 'balanced' | 'charlatan' | 'mentor' | 'provocador' | 'ludico'

interface PedagogyOption {
  id: PedagogyId
  label: string
  short: string
  desc: string
  color: string
  icon: ReactNode
}

const PED_ICON_SIZE = 14
const pedIcon = (path: ReactNode): ReactNode => (
  <svg width={PED_ICON_SIZE} height={PED_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
)

const PEDAGOGY_OPTIONS: PedagogyOption[] = [
  { id: 'entrevistador', label: 'Entrevistador', short: 'E', desc: 'Habla poco, pregunta mucho', color: '#4A90E2',
    icon: pedIcon(<><path d="M9.1 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><circle cx="12" cy="17" r=".5" fill="currentColor" /></>) },
  { id: 'balanced',      label: 'Equilibrado',   short: 'B', desc: 'Conversación 50/50',          color: '#00B37E',
    icon: pedIcon(<><path d="M12 3v18" /><path d="M5 8h14" /><path d="M5 8l-2 6a3 3 0 0 0 6 0L7 8" /><path d="M19 8l-2 6a3 3 0 0 0 6 0l-2-6" /></>) },
  { id: 'charlatan',     label: 'Charlatán',     short: 'C', desc: 'Cuenta y pregunta',           color: '#A874E8',
    icon: pedIcon(<><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></>) },
  { id: 'mentor',        label: 'Mentor',        short: 'M', desc: 'Info + pregunta concreta',    color: '#E6A23C',
    icon: pedIcon(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>) },
  { id: 'provocador',    label: 'Provocador',    short: 'P', desc: 'Discrepa, te desafía',        color: '#E5484D',
    icon: pedIcon(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />) },
  { id: 'ludico',        label: 'Lúdico',        short: 'L', desc: 'Juegos verbales',             color: '#EC4899',
    icon: pedIcon(<><path d="M12 3v3" /><path d="M12 18v3" /><path d="M5.6 5.6l2.1 2.1" /><path d="M16.3 16.3l2.1 2.1" /><path d="M3 12h3" /><path d="M18 12h3" /><path d="M5.6 18.4l2.1-2.1" /><path d="M16.3 7.7l2.1-2.1" /></>) },
]
const PEDAGOGY_INSTRUCTIONS = {
  entrevistador: 'Hablá muy poco. Máximo 1 oración por turno + 1 pregunta corta. Dejá que el alumno se extienda.',
  balanced: 'Conversación equilibrada. 1-2 oraciones aportando + 1 pregunta abierta.',
  charlatan: 'Contá data concreta o anécdota breve sobre el tema. Después pedí opinión personal con 1 pregunta.',
  mentor: 'Contá 2-3 datos relevantes + 1 pregunta ESPECÍFICA. PROHIBIDO preguntas tipo "cuál es el mejor X" o "cuál es tu favorito".',
  provocador: 'Discrepá, contradecí, pedí al alumno que defienda sus ideas con datos. Tono exigente pero respetuoso.',
  ludico: 'Usá juegos verbales, micro-roleplays, humor liviano. Cero rigidez.',
} as const

/* ── Toolbar de presets de audio: 4 iconos abajo del estilo del tutor ─────── */
const VOICE_PRESET_META: Record<string, { icon: JSX.Element; short: string; color: string }> = {
  'voice-room':   { short: 'Grupal',  color: '#22D67A', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  'min-latency':  { short: '1:1',     color: '#FFB800', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  'noisy-env':    { short: 'Ruido',   color: '#7C5CFF', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="2" x2="22" y2="22"/></svg> },
  'studio-hifi':  { short: 'Hi-Fi',   color: '#22D3EE', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg> },
}
function VoicePresetsBar({ onPick }: { onPick: (preset: AudioPreset) => void | Promise<void> }) {
  const [active, setActive] = useState<string>(() => {
    const s = loadAudioSettings()
    const match = PRESETS.find((p) =>
      Object.keys(p.settings).every((k) => (s as never)[k] === (p.settings as never)[k]),
    )
    return match?.id || ''
  })
  return (
    <div className="voice-presets" role="toolbar" aria-label="Presets de audio">
      <span className="voice-presets-label">Audio</span>
      {PRESETS.map((p) => {
        const meta = VOICE_PRESET_META[p.id]
        if (!meta) return null
        const isActive = active === p.id
        return (
          <button
            key={p.id}
            type="button"
            className={`vp-chip${isActive ? ' active' : ''}`}
            onClick={() => { setActive(p.id); onPick(p) }}
            title={`${p.name} — ${p.description}`}
            aria-label={`Preset de audio: ${p.name}`}
            aria-pressed={isActive}
            style={{ ['--c' as string]: meta.color }}
          >
            {meta.icon}
            <span className="vp-chip-txt">{meta.short}</span>
          </button>
        )
      })}
    </div>
  )
}

function PedagogyPicker({ value, onChange }: { value: string; onChange: (id: string, label: string) => void }) {
  return (
    <div className="ped-picker" role="radiogroup" aria-label="Estilo del tutor">
      <span className="ped-picker-label">Estilo</span>
      <div className="ped-picker-chips">
        {PEDAGOGY_OPTIONS.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              className={`ped-chip${active ? ' active' : ''}`}
              onClick={() => onChange(o.id, o.label)}
              title={`${o.label} — ${o.desc}`}
              aria-label={`${o.label}: ${o.desc}`}
              aria-pressed={active}
              style={{ ['--c' as string]: o.color }}
            >
              <span className="ped-chip-ico" aria-hidden="true">{o.icon}</span>
              <span className="ped-chip-txt">{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface CoachPickerProps {
  templates: Template[]
  activeId: number | undefined
  disabled: boolean
  onSelect: (id: number) => void
}
function CoachPicker({ templates, activeId, disabled, onSelect }: CoachPickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = templates.find(t => t.id === activeId) || templates[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!active) return null

  return (
    <div className={`coach-picker${open ? ' open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="coach-trigger"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ ['--c' as string]: active.icon_bg || '#00B37E' }}
      >
        <span className="coach-orb" aria-hidden="true" />
        <span className="coach-name">{active.name}</span>
        <svg className="coach-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="coach-panel" role="listbox">
          {templates.map(t => {
            const isActive = t.id === active.id
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`coach-option${isActive ? ' active' : ''}`}
                onClick={() => { onSelect(t.id); setOpen(false) }}
                style={{ ['--c' as string]: t.icon_bg || '#00B37E' }}
              >
                <span className="coach-orb" aria-hidden="true" />
                <span className="coach-option-body">
                  <span className="coach-option-name">{t.name}</span>
                  {t.description && <span className="coach-option-desc">{t.description}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState, useCallback, useRef } from 'react'
import { NavLink, Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { WEBAPP_CSS } from './webapp.css'
import { meAPI, sessionsAPI, topicsAPI, MeProfile, SessionData, Topic } from '../services/api'
import { useLiveVoice } from '../hooks/useLiveVoice'

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
const UserIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

const VIEW_TITLES: Record<string, string> = {
  '/app': 'Hoy', '/app/practicar': 'Practicar',
  '/app/mapa': 'Mapa de progreso', '/app/historial': 'Historial', '/app/perfil': 'Perfil',
}

/* ──────── ROOT ──────── */
export function WebApp() {
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const p = await meAPI.profile()
      setProfile(p)
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

  return (
    <div className="webapp-root">
      <style>{WEBAPP_CSS}</style>
      <div className="shell">
        <Sidebar profile={profile} />
        <main className="main">
          <TopBar profile={profile} />
          <Routes>
            <Route path="/" element={<HoyView profile={profile} loading={loading} />} />
            <Route path="/practicar" element={<PracticarView profile={profile} onSessionEnd={refresh} />} />
            <Route path="/mapa" element={<MapaView profile={profile} />} />
            <Route path="/historial" element={<HistorialView />} />
            <Route path="/perfil" element={<PerfilView profile={profile} onChange={refresh} />} />
          </Routes>
        </main>
      </div>
      <MobileBar />
    </div>
  )
}

/* ──────── SIDEBAR ──────── */
function Sidebar({ profile }: { profile: MeProfile | null }) {
  const user = profile?.user
  const initial = user?.nombre?.[0] || 'U'
  const pct = user?.cefr_level ? cefrPct(user.cefr_level) : 0
  const isAdmin = user?.role === 'admin'
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">h</div>
        <div className="brand-name">habláh</div>
      </div>
      <nav className="sidebar-nav">
        <SidebarItem to="/app" icon={<HomeIcon />} label="Hoy" exact />
        <SidebarItem to="/app/practicar" icon={<MicIcon />} label="Practicar" badge="DAILY" />
        <SidebarItem to="/app/mapa" icon={<MapIcon />} label="Mapa de progreso" />
        <SidebarItem to="/app/historial" icon={<ClockIcon />} label="Historial" />
        <SidebarItem to="/app/perfil" icon={<UserIcon />} label="Perfil" />
      </nav>

      {isAdmin && (
        <>
          <div className="sidebar-section">Admin</div>
          <nav className="sidebar-nav">
            <NavLink to="/admin" className="nav-item" style={{ background: 'rgba(255,184,0,.12)', color: '#FFB800' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h7v7H3z" /><path d="M14 3h7v7h-7z" /><path d="M14 14h7v7h-7z" /><path d="M3 14h7v7H3z" />
              </svg>
              Backoffice
            </NavLink>
          </nav>
        </>
      )}
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

function TopBar({ profile }: { profile: MeProfile | null }) {
  const loc = useLocation()
  const title = VIEW_TITLES[loc.pathname] ?? 'Hoy'
  const streak = profile?.user?.streak_days ?? 0
  const initial = profile?.user?.nombre?.[0]?.toUpperCase() || 'U'
  const isDark = loc.pathname.startsWith('/app/practicar')
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
        <h1 style={isDark ? { color: 'white' } : undefined}>{title}</h1>
        <div className="topbar-right">
          {streak > 0 && (
            <div className="streak-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFB800"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17h2.4a2.6 2.6 0 0 0 2.6-2.6c0-1.6-1-3-2-4-2-2-1.5-4 .5-6-3.5 0-7 3-7 7 0 1 .5 2.5 1 3.1z" /></svg>
              <span><span className="tnum">{streak}</span><span className="l"> días</span></span>
            </div>
          )}
          <button
            className="av-btn"
            aria-label="Perfil"
            style={isDark ? { background: 'rgba(255,255,255,.08)', color: 'white' } : undefined}
          >
            {initial}
          </button>
        </div>
      </div>
    </header>
  )
}

function MobileBar() {
  return (
    <nav className="mobile-bar">
      <NavLink to="/app" end className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}><HomeIcon /><span>Hoy</span></NavLink>
      <NavLink to="/app/mapa" className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}><MapIcon /><span>Mapa</span></NavLink>
      <NavLink to="/app/practicar" className="mb-item cta" aria-label="Practicar"><MicIcon size={24} /><span>Practicar</span></NavLink>
      <NavLink to="/app/historial" className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}><ClockIcon /><span>Historial</span></NavLink>
      <NavLink to="/app/perfil" className={({ isActive }) => `mb-item${isActive ? ' active' : ''}`}><UserIcon /><span>Perfil</span></NavLink>
    </nav>
  )
}

/* ──────── HOY ──────── */
function HoyView({ profile, loading }: { profile: MeProfile | null; loading: boolean }) {
  const nav = useNavigate()
  const [recent, setRecent] = useState<SessionData[]>([])
  useEffect(() => {
    sessionsAPI.list().then(setRecent).catch(() => {})
  }, [])

  if (loading) return <div className="view"><div style={{ color: 'var(--fg-3)' }}>Cargando...</div></div>
  if (!profile) return <div className="view"><div style={{ color: 'var(--danger)' }}>Error cargando perfil</div></div>

  const u = profile.user
  const tpl = profile.active_template
  const firstInterest = profile.interests[0]
  const greeting = `Buen día, ${u.nombre}`

  return (
    <div className="view">
      <div className="view-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="eyebrow" style={{ color: 'var(--primary-dark)' }}>{greeting}</span>
        </div>
        <h2>Hoy te toca una charla de {u.target_minutes_per_session} minutos.</h2>
        <div className="sub">
          Tu tutor activo es <strong style={{ color: 'var(--fg-1)' }}>{tpl?.name || 'Habláh'}</strong>.{' '}
          {firstInterest && <>Foco del día: <strong style={{ color: 'var(--fg-1)' }}>{firstInterest.title}</strong>.</>}
        </div>
      </div>

      <div className="today-grid">
        <div className="mission-card">
          <div className="mission-card-content">
            <div className="mission-meta">
              <span className="pill pill-dark" style={{ background: 'rgba(255,255,255,.1)' }}>Misión del día</span>
              {firstInterest && <span className="pill pill-dark" style={{ background: 'rgba(255,255,255,.1)' }}>{firstInterest.title} · {u.cefr_level}</span>}
              <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClockIcon size={13} />{u.target_minutes_per_session} min sugeridos
              </span>
            </div>
            <h3>{firstInterest?.title || 'Tema libre — vos elegís'}</h3>
            <p>
              Empezá la charla cuando quieras. Hablás en {u.target_language === 'en' ? 'inglés' : u.target_language}, el tutor te corrige al cierre — sin interrupciones.
            </p>
            <div className="actions">
              <button className="btn btn-primary btn-lg" onClick={() => nav('/app/practicar')}>
                <MicIcon size={18} />Empezar charla
              </button>
              <Link to="/app/perfil" className="btn btn-ghost" style={{ color: 'rgba(255,255,255,.85)' }}>Cambiar tópico</Link>
            </div>
          </div>
        </div>

        <div className="streak-panel">
          <div className="card week-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Tu racha</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }} className="tnum">{u.streak_days} / {u.streak_best} mejor</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>
              {u.streak_days > 0
                ? <><b>{u.streak_days} días seguidos</b>. {u.streak_days >= u.streak_best ? '¡Es tu mejor racha!' : `Te faltan ${u.streak_best - u.streak_days} para igualar tu mejor.`}</>
                : <>Hoy arrancás tu racha. <b>Primera charla = primer punto.</b></>}
            </div>
          </div>
        </div>
      </div>

      <div className="recent">
        <div className="qp-head">
          <div className="eyebrow">Últimas sesiones</div>
          <Link to="/app/historial" className="btn btn-ghost btn-sm">Ver historial →</Link>
        </div>
        <div className="recent-list">
          {recent.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--fg-3)', fontSize: 14 }}>
              Todavía no tenés sesiones. <strong>Empezá tu primera charla.</strong>
            </div>
          )}
          {recent.slice(0, 3).map((s) => (
            <div key={s.id} className="recent-row">
              <div className="when"><span className="day-l">{formatDay(s.started_at)}</span> {formatTime(s.started_at)}</div>
              <div>
                <div className="title">{topicTitleFromSession(profile, s)}</div>
                <div className="topic">{tpl?.name || 'Tutor'} · {s.duration_seconds ? `${Math.round(s.duration_seconds / 60)} min` : 'en curso'}</div>
              </div>
              <div>{s.score !== null && <span className="pill pill-primary">Score {s.score}</span>}</div>
              <div className="score">{s.score ?? '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ──────── PRACTICAR (Gemini Live) ──────── */
function PracticarView({ profile, onSessionEnd }: { profile: MeProfile | null; onSessionEnd: () => void }) {
  const nav = useNavigate()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [topicTitle, setTopicTitle] = useState<string>('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [extraTopics, setExtraTopics] = useState<Topic[]>([])
  const [endedReport, setEndedReport] = useState<SessionData | null>(null)
  const startedRef = useRef(false)

  // Cargo catálogo completo para que el usuario pueda elegir cualquiera, no solo sus intereses
  useEffect(() => {
    topicsAPI.list().then(setExtraTopics).catch(() => {})
  }, [])

  const live = useLiveVoice({
    onAudioLevel: setAudioLevel,
    onError: (e) => toast.error(e.message),
  })

  const beginSession = useCallback(async (topicId: number | null) => {
    if (startedRef.current) return
    startedRef.current = true
    try {
      const start = await sessionsAPI.start(topicId || undefined)
      setSessionId(start.session_id)
      setTopicTitle(start.topic?.title || 'Tema libre')
      setKeywords(start.topic?.keywords || [])
      await live.start(start.session_id)
    } catch (e: any) {
      toast.error('No pudimos iniciar la sesión')
      startedRef.current = false
    }
  }, [live])

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

  const statusLabel = {
    idle: 'Preparando…',
    connecting: 'Conectando…',
    listening: 'Tu turno',
    speaking: 'El tutor habla',
    error: 'Error',
    ended: 'Finalizada',
  }[live.status]

  // Si todavía no eligió tópico, NO arranco automático. Pantalla de selección.
  if (!sessionId) {
    if (!profile) return <div className="view">Cargando…</div>
    const interests = profile.interests
    // catálogo "extra" = catálogo completo menos los intereses (para no duplicar)
    const interestIds = new Set(interests.map(i => i.id))
    const others = extraTopics.filter(t => !interestIds.has(t.id))

    return (
      <div className="view" style={{ maxWidth: 1320 }}>
        {/* Hero */}
        <div style={{ marginBottom: 36, maxWidth: 720 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--primary-tint)', color: 'var(--primary-dark)',
            padding: '6px 12px', borderRadius: 999,
            fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
            marginBottom: 14,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
            Misión de hoy
          </div>
          <h1 style={{
            fontSize: 38, fontWeight: 800, letterSpacing: '-.025em',
            margin: '0 0 10px', lineHeight: 1.1, color: 'var(--fg-1)',
          }}>
            ¿De qué <span style={{ color: 'var(--primary)' }}>charlamos hoy</span>?
          </h1>
          <p style={{ fontSize: 16, color: 'var(--fg-3)', margin: 0, lineHeight: 1.5 }}>
            Elegí un tópico de tus intereses, sorprendete con tema libre, o explorá el catálogo. La sesión arranca al hacer click.
          </p>
        </div>

        {/* Tus intereses — primera card destacada */}
        {interests.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <SectionTitle eyebrow="Tus intereses" hint="ordenados según tu preferencia · editalos en /perfil" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {interests.map((t, idx) => (
                <TopicPick
                  key={t.id}
                  title={t.title}
                  category={t.category}
                  variant={idx === 0 ? 'featured' : 'interest'}
                  position={idx + 1}
                  onClick={() => { setSelectedTopicId(t.id); beginSession(t.id) }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tema libre */}
        <div style={{ marginBottom: 36 }}>
          <SectionTitle eyebrow="Tema libre" hint="Sin guión predefinido" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            <TopicPick
              title="Sorprendéme · El tutor elige"
              category="general"
              variant="free"
              onClick={() => { setSelectedTopicId(null); beginSession(null) }}
            />
          </div>
        </div>

        {/* Catálogo */}
        {others.length > 0 && (
          <div>
            <SectionTitle eyebrow="Explorá del catálogo" hint={`${others.length} tópicos disponibles`} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {others.slice(0, 12).map((t) => (
                <TopicPick
                  key={t.id} title={t.title} category={t.category}
                  hot={t.is_hot}
                  onClick={() => { setSelectedTopicId(t.id); beginSession(t.id) }}
                />
              ))}
            </div>
            {others.length > 12 && (
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--fg-3)', textAlign: 'center' }}>
                + {others.length - 12} tópicos más · agregalos a tus intereses en <Link to="/app/perfil" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>Perfil</Link>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
    {endedReport && <SessionReportOverlay report={endedReport} sessionId={sessionId!} onClose={() => nav('/app')} />}
    <div className="convo-view">
      <div className="convo-stage">
        <div className="convo-header">
          <div>
            <h2>{topicTitle || 'Iniciando…'}</h2>
            <div className="meta">
              <span className="live">{profile?.active_template?.name || 'Habláh'}</span>
              <span>{profile?.user?.cefr_level} · {profile?.user?.target_language}</span>
            </div>
          </div>
          <button className="btn btn-sm end" onClick={handleEnd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Terminar
          </button>
        </div>

        <div className="convo-orb-area">
          <div
            className="convo-orb"
            style={{
              transform: `scale(${1 + Math.min(0.15, audioLevel * 2)})`,
              transition: 'transform 0.05s linear',
            }}
          />
          <div className="convo-turn">
            <div className="l">{statusLabel}</div>
            {/* Lo último que dijo el tutor — siempre visible para no perderse */}
            {(() => {
              const lastAi = [...live.transcript].reverse().find(l => l.who === 'ai')
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
          <div className="mic-wave" style={{ flex: '0 0 auto' }}>
            {Array.from({ length: 18 }).map((_, i) => (
              <i key={i} style={{ height: `${20 + Math.abs(Math.sin(i * 0.5 + audioLevel * 30)) * 80}%` }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(232,236,234,.6)', marginLeft: 'auto' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: live.status === 'listening' ? '#E5484D' : '#9CA3AF', display: 'inline-block', marginRight: 6 }} />
            {live.status === 'listening' ? 'GRABANDO' : live.status.toUpperCase()}
          </div>
        </div>
      </div>

      <aside className="convo-side">
        <div className="side-tabs">
          <div className="side-tab active">Transcripción</div>
        </div>

        {/* Keywords con check-marks — los que ya dijiste en verde ✓, los pendientes en gris ○ */}
        {keywords.length > 0 && (() => {
          const userText = live.transcript.filter(l => l.who === 'user').map(l => l.text.toLowerCase()).join(' ')
          const usedCount = keywords.filter(k => userText.includes(k.toLowerCase())).length
          return (
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ fontSize: 11, color: 'rgba(232,236,234,.55)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span>Keywords objetivo</span>
                <span className="tnum">{usedCount}/{keywords.length}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {keywords.map((k) => {
                  const used = userText.includes(k.toLowerCase())
                  return (
                    <span
                      key={k}
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: used ? 'rgba(0,179,126,.2)' : 'rgba(255,255,255,.05)',
                        color: used ? 'var(--primary)' : 'rgba(232,236,234,.6)',
                        border: `1px solid ${used ? 'rgba(0,179,126,.4)' : 'rgba(255,255,255,.08)'}`,
                      }}
                    >
                      {used ? '✓ ' : ''}{k}
                    </span>
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
          {live.transcript.map((line, i) => (
            <div key={i} className={`line ${line.who === 'ai' ? 'ai' : 'you'}`}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', opacity: 0.55, marginBottom: 3, textTransform: 'uppercase' }}>
                {line.who === 'ai' ? 'Tutor' : 'Vos'}
              </div>
              {line.text}
            </div>
          ))}
        </div>
      </aside>
    </div>
    </>
  )
}

/* ──────── REPORTE FINAL ──────── */
function SessionReportOverlay({ report, sessionId, onClose }: {
  report: SessionData; sessionId: number; onClose: () => void
}) {
  const [data, setData] = useState<SessionData>(report)
  const [polling, setPolling] = useState(report.status !== 'analyzed')

  // Polling cada 2s hasta que status pase a 'analyzed'
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
    // Timeout: parar después de 30s
    const stopAfter = setTimeout(() => { setPolling(false); clearInterval(interval) }, 30000)
    return () => { clearInterval(interval); clearTimeout(stopAfter) }
  }, [polling, sessionId])

  const r = data.report || {}
  const metrics = data.metrics || {}
  const score = data.score
  const feedback: any[] = r.feedback || []
  const praise: string = r.praise || ''
  const durationMin = data.duration_seconds ? Math.round(data.duration_seconds / 60) : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(13,20,18,.94)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: 720, width: '100%', background: 'white', borderRadius: 24,
        boxShadow: '0 24px 80px rgba(0,0,0,.4)', overflow: 'hidden',
      }}>
        {/* HEADER verde con score */}
        <div style={{
          background: 'linear-gradient(180deg, var(--primary), var(--primary-dark))',
          color: 'white', padding: '32px 32px 40px', position: 'relative',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', opacity: .85, textTransform: 'uppercase', marginBottom: 8 }}>
            Sesión finalizada · {durationMin} min
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-.02em' }}>
            {polling ? 'Analizando tu charla…' : (praise || '¡Buen trabajo!')}
          </h2>
          {!polling && (
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <Stat label="Score" value={score != null ? `${score}` : '—'} highlight />
              <Stat label="Palabras" value={metrics.words_spoken ?? '—'} />
              <Stat label="WPM" value={metrics.wpm ?? '—'} />
              <Stat label="Keywords" value={`${metrics.keywords_hit ?? 0}/${metrics.keywords_total ?? 0}`} />
            </div>
          )}
        </div>

        {/* BODY */}
        <div style={{ padding: '24px 32px 32px' }}>
          {polling && (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--fg-3)' }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>Estamos analizando lo que hablaste…</div>
              <div style={{ fontSize: 12 }}>Tarda unos 5-10 segundos.</div>
            </div>
          )}

          {!polling && feedback.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--fg-3)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-dark)', marginBottom: 6 }}>
                Sin errores importantes detectados.
              </div>
              <div style={{ fontSize: 13 }}>Hablaste fluido. Seguí así.</div>
            </div>
          )}

          {feedback.map((fb, i) => (
            <div key={i} style={{
              border: '1px solid var(--border-1)', borderRadius: 12, padding: 16, marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 999,
                  background: fb.type === 'pronunciation' ? '#FCE8E9' : 'var(--bg-2)',
                  color: fb.type === 'pronunciation' ? '#B42127' : 'var(--fg-2)',
                }}>
                  {fb.type === 'grammar' ? 'Gramática' : fb.type === 'pronunciation' ? 'Pronunciación' : fb.type === 'vocabulary' ? 'Vocabulario' : 'Otro'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{fb.label}</span>
              </div>
              {fb.snippet_wrong && (
                <div style={{
                  padding: 10, borderRadius: 8, fontSize: 13,
                  background: '#FCE8E9', color: '#5A1F22', marginBottom: 6,
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <span style={{ fontWeight: 800 }}>✕</span>
                  <span>"{fb.snippet_wrong}"</span>
                </div>
              )}
              {fb.snippet_correct && (
                <div style={{
                  padding: 10, borderRadius: 8, fontSize: 13,
                  background: 'var(--primary-tint)', color: '#024E36',
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <span style={{ fontWeight: 800 }}>✓</span>
                  <span>"{fb.snippet_correct}"</span>
                </div>
              )}
            </div>
          ))}

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

          {/* ACTIONS */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={onClose} className="btn btn-primary btn-lg" style={{ flex: 1 }}>
              Volver a Hoy
            </button>
            <button
              onClick={() => { window.location.reload() }}
              className="btn btn-secondary btn-lg"
              style={{ flex: 1, background: 'var(--bg-2)', color: 'var(--fg-1)', border: 0 }}
            >
              Practicar otra vez
            </button>
          </div>
        </div>
      </div>
    </div>
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

/* ──────── MAPA ──────── */
function MapaView({ profile }: { profile: MeProfile | null }) {
  if (!profile) return <div className="view">Cargando…</div>
  return (
    <div className="view">
      <div className="view-head">
        <h2>Mapa de progreso</h2>
        <div className="sub">Tus tópicos activos. Las etapas se desbloquean charlando.</div>
      </div>
      {profile.progress.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-3)' }}>
          Todavía no hay progreso. Empezá una charla para sumar tu primera etapa.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {profile.progress.map((p) => (
          <div key={p.topic_id} className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{p.topic_title}</h3>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary-dark)' }}>{p.pct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, margin: '14px 0 6px', overflow: 'hidden' }}>
              <div style={{ width: `${p.pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
              {p.stages_done} de {p.stages_total} etapas · {p.sessions_count} charlas · {p.minutes_spoken} min hablados
            </div>
          </div>
        ))}
      </div>
    </div>
  )
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
          <div key={s.id} className="history-row">
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
          </div>
        ))}
      </div>
    </div>
  )
}

/* ──────── PERFIL ──────── */
function PerfilView({ profile, onChange }: { profile: MeProfile | null; onChange: () => void }) {
  if (!profile) return <div className="view">Cargando…</div>
  const u = profile.user
  const initial = u.nombre[0]?.toUpperCase() || 'U'

  const toggleInsistent = async () => {
    await meAPI.updateSettings({ insistent_mode_enabled: !u.insistent_mode_enabled })
    onChange()
  }
  const toggleReminder = async () => {
    await meAPI.updateSettings({ daily_reminder_enabled: !u.daily_reminder_enabled })
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
            <div className="meta">{u.target_language === 'en' ? 'Inglés' : u.target_language} · {u.cefr_level} · {profile.total_sessions} charlas</div>
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
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginTop: 12 }}>
            Cambiá tu tutor desde el backoffice o pedile al equipo Habláh.
          </div>
        </div>

        <InterestsCard profile={profile} onChange={onChange} />
        <AddInterestCard profile={profile} onChange={onChange} />

        <div className="profile-card">
          <h3>Configuración</h3>
          <div className="settings-list">
            <SettingsRow label="Acento del tutor" sub="Cómo te suena la IA" value={u.accent_preference.toUpperCase()} />
            <SettingsRow label="Duración objetivo" sub="Cuánto querés hablar por sesión" value={`${u.target_minutes_per_session} min`} />
            <SettingsRow label="Privacidad de audio" sub="Cuándo borramos lo que grabás" value={`${u.audio_retention_days} días`} />
            <SettingsRow label="Modo insistente" sub="Forzar misiones de rescate al detectar errores repetidos" switchOn={u.insistent_mode_enabled} onSwitchToggle={toggleInsistent} />
            <SettingsRow label="Recordatorio diario" sub="Notificación a las 8am" switchOn={u.daily_reminder_enabled} onSwitchToggle={toggleReminder} />
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
      </div>
    </div>
  )
}

function SettingsRow({ label, sub, value, switchOn, onSwitchToggle }: {
  label: string; sub: string; value?: string;
  switchOn?: boolean; onSwitchToggle?: () => void
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
      {switchOn !== undefined
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
          border: '1px solid var(--border-2)', background: 'white',
          fontSize: 13, marginBottom: 12, outline: 'none',
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
              background: 'white', border: '1px solid var(--border-1)',
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
      background: 'white',
      border: '1.5px solid var(--primary)',
      boxShadow: '0 2px 8px rgba(0,179,126,.10)',
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
      background: 'white', border: '1px solid var(--border-1)',
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
        e.currentTarget.style.boxShadow = variant === 'interest' ? '0 2px 8px rgba(0,179,126,.10)' : 'none'
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
            🔥 HOT
          </span>
        )}
        {position !== undefined && (
          <span style={{
            background: 'var(--primary-tint)', color: 'var(--primary-dark)',
            fontSize: 11, fontWeight: 800,
            padding: '3px 8px', borderRadius: 999, fontVariantNumeric: 'tabular-nums',
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
  return { A1: 8, A2: 18, B1: 34, B2: 62, C1: 84, C2: 95 }[level] ?? 30
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

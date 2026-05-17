import { useEffect, useState, useCallback, useRef } from 'react'
import { NavLink, Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { WEBAPP_CSS } from './webapp.css'
import { meAPI, sessionsAPI, topicsAPI, MeProfile, SessionData, Topic } from '../services/api'
import { useLiveVoice, TranscriptLine } from '../hooks/useLiveVoice'

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

  // Si todavía no eligió tópico, NO arranco automático. Pantalla de selección.
  if (!sessionId) {
    if (!profile) return <div className="view">Cargando…</div>
    const interests = profile.interests
    // catálogo "extra" = catálogo completo menos los intereses (para no duplicar)
    const interestIds = new Set(interests.map(i => i.id))
    const others = extraTopics.filter(t => !interestIds.has(t.id))

    return (
      <div className="view">
        <div className="view-head">
          <h2>¿De qué charlamos hoy?</h2>
          <div className="sub">Elegí un tópico de tus intereses o explorá el catálogo. La sesión arranca al hacer click.</div>
        </div>

        {interests.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginTop: 24, marginBottom: 12 }}>Tus intereses</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {interests.map((t) => (
                <TopicPick key={t.id} title={t.title} category={t.category} highlighted
                  onClick={() => { setSelectedTopicId(t.id); beginSession(t.id) }} />
              ))}
            </div>
          </>
        )}

        <div className="eyebrow" style={{ marginTop: 32, marginBottom: 12 }}>Tema libre</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          <TopicPick title="Sorprendéme · Tema libre" category="El tutor elige el ángulo"
            onClick={() => { setSelectedTopicId(null); beginSession(null) }} />
        </div>

        {others.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginTop: 32, marginBottom: 12 }}>Explorá del catálogo</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {others.slice(0, 12).map((t) => (
                <TopicPick key={t.id} title={t.title} category={t.category}
                  hot={t.is_hot}
                  onClick={() => { setSelectedTopicId(t.id); beginSession(t.id) }} />
              ))}
            </div>
            {others.length > 12 && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--fg-3)' }}>
                + {others.length - 12} tópicos más en el catálogo
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const handleEnd = useCallback(async () => {
    live.stop()
    if (sessionId) {
      try {
        await sessionsAPI.end(sessionId, live.transcript)
        toast.success('Sesión finalizada. Analizando...')
        onSessionEnd()
      } catch {}
    }
    nav('/app')
  }, [live, sessionId, onSessionEnd, nav])

  const statusLabel = {
    idle: 'Preparando…',
    connecting: 'Conectando…',
    listening: 'Tu turno',
    speaking: 'El tutor habla',
    error: 'Error',
    ended: 'Finalizada',
  }[live.status]

  return (
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
            <div className="q">
              {live.transcript.length > 0
                ? live.transcript[live.transcript.length - 1].text
                : 'Cuando arranque la sesión, hablale al tutor en inglés…'}
            </div>
          </div>

          {keywords.length > 0 && (
            <div className="challenge-float">
              <div className="ico">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFB800"><polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" /></svg>
              </div>
              <div>
                <div className="lbl">Keywords objetivo</div>
                <div className="text">{keywords.slice(0, 6).join(' · ')}</div>
              </div>
            </div>
          )}
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
        <div className="side-body">
          {live.transcript.length === 0 && (
            <div style={{ color: 'rgba(232,236,234,.4)', fontSize: 13 }}>
              La transcripción aparece a medida que vos y el tutor hablan…
            </div>
          )}
          {live.transcript.map((line, i) => (
            <div key={i} className={`line ${line.who === 'ai' ? 'ai' : 'you'}`}>{line.text}</div>
          ))}
        </div>
      </aside>
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

        <div className="profile-card">
          <h3>Tus intereses</h3>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', marginBottom: 8 }}>Estos punteros alimentan cada charla.</div>
          <div className="interest-chips">
            {profile.interests.map((i) => <span key={i.id} className="chip">{i.title}</span>)}
            {profile.interests.length === 0 && <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>Todavía no elegiste intereses.</span>}
          </div>
        </div>

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

/* ──────── topic picker ──────── */
function TopicPick({ title, category, highlighted, hot, onClick }: {
  title: string; category: string; highlighted?: boolean; hot?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
        padding: 16, borderRadius: 14,
        border: highlighted ? '2px solid var(--primary)' : '1px solid var(--border-1)',
        background: highlighted ? 'var(--primary-tint)' : 'white',
        cursor: 'pointer', textAlign: 'left',
        transition: 'all .15s var(--ease)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: highlighted ? 'var(--primary-dark)' : 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {category}
        {hot && <span style={{ background: 'var(--accent-tint)', color: '#8A5A00', padding: '1px 6px', borderRadius: 999, fontSize: 9 }}>🔥</span>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-1)', lineHeight: 1.3 }}>{title}</div>
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

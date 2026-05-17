import { useEffect, useMemo, useState } from 'react'
import { NavLink, Routes, Route, useNavigate } from 'react-router-dom'
import { BACKOFFICE_CSS } from './backoffice.css'

function ensureFont() {
  if (document.getElementById('hablah-google-fonts')) return
  const link = document.createElement('link')
  link.id = 'hablah-google-fonts'
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap'
  document.head.appendChild(link)
}

const PAGE_SIZE = 10

/* ───────────── ICONOS ───────────── */
const SvgMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)
const SvgSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const SvgPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const SvgChev = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const SvgKebab = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" />
  </svg>
)

/* ───────────── SHELL ───────────── */
export function Backoffice() {
  useEffect(() => { ensureFont() }, [])
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="bo-root">
      <style>{BACKOFFICE_CSS}</style>
      {menuOpen && <div className="scrim show" onClick={() => setMenuOpen(false)} />}
      <div className="shell">
        <BoSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="main">
          <Routes>
            <Route path="/" element={<ResumenView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/templates" element={<TemplatesView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/templates/:id" element={<TemplateEditView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/topicos" element={<TopicosView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/topicos/:id" element={<TopicEditView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/gamif" element={<GamifView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/inspector" element={<InspectorView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/alumnos" element={<AlumnosView onMenu={() => setMenuOpen(true)} />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function BoSidebar({ open, onClose: _onClose }: { open: boolean; onClose: () => void }) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <NavLink to="/admin" className="brand" end>
        <div className="brand-mark">h</div>
        <div>
          <div className="brand-name">habláh</div>
          <div className="brand-sub">Backoffice</div>
        </div>
      </NavLink>

      <div className="sidebar-section">Operación</div>
      <nav className="sidebar-nav">
        <SidebarItem to="/admin" exact label="Resumen" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        }/>
        <SidebarItem to="/admin/templates" label="Templates" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        }/>
        <SidebarItem to="/admin/topicos" label="Tópicos" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41 13.41 20.59a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        }/>
        <SidebarItem to="/admin/gamif" label="Gamificación" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.53 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
        }/>
        <SidebarItem to="/admin/inspector" label="Inspector" badge="LIVE" live icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        }/>
      </nav>

      <div className="sidebar-section">Comunidad</div>
      <nav className="sidebar-nav">
        <SidebarItem to="/admin/alumnos" label="Alumnos" badge="47K" icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        }/>
      </nav>

      <div className="sidebar-foot">
        <div className="user-card">
          <div className="av">C</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name">Camila R.</div>
            <div className="meta">Curriculum lead</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function SidebarItem({ to, exact, label, icon, badge, live }: {
  to: string; exact?: boolean; label: string; icon: React.ReactNode; badge?: string; live?: boolean
}) {
  return (
    <NavLink to={to} end={exact} className={({ isActive }) => `nav-item${live ? ' live' : ''}${isActive ? ' active' : ''}`}>
      {icon}
      {label}
      {badge && <span className="badge">{badge}</span>}
    </NavLink>
  )
}

function PageHead({
  eyebrow, title, sub, onMenu, actions,
}: { eyebrow: string; title: string; sub?: string; onMenu: () => void; actions?: React.ReactNode }) {
  return (
    <header className="pagehead">
      <div className="brick">
        <button className="menu-toggle" onClick={onMenu} aria-label="Menú"><SvgMenu /></button>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}

/* ───────────── PAGINATION (genérico — el héredo del "framework de la guía") ───────────── */
function Pagination({ total, page, pageSize, onPageChange }: {
  total: number; page: number; pageSize: number; onPageChange: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  return (
    <div className="pagination">
      <div className="pg-info">Mostrando <b>{from}–{to}</b> de <b>{total.toLocaleString('es-AR')}</b></div>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 0}>← Anterior</button>
      <span className="pg-current">{page + 1} / {pages}</span>
      <button onClick={() => onPageChange(page + 1)} disabled={page >= pages - 1}>Siguiente →</button>
    </div>
  )
}

/* ───────────── RESUMEN ───────────── */
function ResumenView({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate()
  const hourBars = [10,7,4,2,3,8,24,36,33,26,22,34,46,41,34,44,58,70,80,75,62,47,32,19]
  const nowBars = [12,8,5,3,4,10,28,42,38,30,25,40,55,48,40,52,68,82,95,88,72,55,38,22]
  return (
    <>
      <PageHead
        eyebrow="Resumen general"
        title="Cómo va el sistema esta semana"
        sub="13 al 17 de mayo · todas las cohortes · datos vivos cada 60 s"
        onMenu={onMenu}
        actions={
          <>
            <button className="btn btn-secondary btn-sm">Esta semana</button>
            <button className="btn btn-primary btn-sm" onClick={() => nav('/admin/templates')}>
              <SvgPlus /> Nuevo template
            </button>
          </>
        }
      />
      <div className="view">
        <div className="kpi-row">
          <Kpi label="Charlas activas" value="3 482" delta="▲ 12%" deltaKind="up" help="vs semana anterior" />
          <Kpi label="Retención 7 días" value="68%" delta="▲ 3 pts" deltaKind="up" help="cohorte que volvió" />
          <Kpi label="Errores resueltos" value="1 247" delta="▲ 22%" deltaKind="up" help="con misiones de rescate" />
          <Kpi label="Modo insistente" value="184" delta="▼ 8%" deltaKind="down" help="bloqueos activos hoy" />
        </div>

        <div className="dash-grid">
          <div className="card card-elev chart-card">
            <div className="chart-head">
              <div>
                <h3>Charlas por hora</h3>
                <div className="s">Distribución promedio últimos 7 días</div>
              </div>
              <div className="legend">
                <span><i style={{ background: 'var(--primary)' }}></i>Esta semana</span>
                <span><i style={{ background: 'var(--bg-3)' }}></i>Anterior</span>
              </div>
            </div>
            <div className="bars">
              {hourBars.map((prev, i) => (
                <div key={i} className="col">
                  <div className="pair">
                    <i className="prev" style={{ height: `${prev}%` }} />
                    <i className="now" style={{ height: `${nowBars[i]}%` }} />
                  </div>
                  <div className="lab">{[0, 4, 8, 12, 16, 20].includes(i) ? `${i}h` : ''}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-elev chart-card templ-dist">
            <h3>Templates en uso</h3>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 14 }}>Distribución por método</div>
            <DistRow name="The Coach" pct={52} color="var(--primary)" />
            <DistRow name="The Sincerist" pct={28} color="var(--ink-1)" />
            <DistRow name="The Arcade" pct={14} color="var(--accent)" />
            <DistRow name="Custom · B2 dev" pct={6} color="var(--info)" />
          </div>
        </div>

        <div className="dash-bottom">
          <div className="card card-elev chart-card">
            <h3>Top errores detectados</h3>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 10 }}>Disparadores de modo insistente esta semana</div>
            <ol className="err-list">
              <ErrLi rank={1} name="Verbos irregulares · past simple" tag="Gramática" count={412} />
              <ErrLi rank={2} name="Pronunciación /θ/ vs /s/" tag="Fonética" count={287} />
              <ErrLi rank={3} name='Confusión "make" vs "do"' tag="Léxico" count={196} />
              <ErrLi rank={4} name="Condicional tipo 2" tag="Gramática" count={178} />
              <ErrLi rank={5} name="Stress en palabras de 3+ sílabas" tag="Prosodia" count={142} />
            </ol>
          </div>
          <div className="card card-elev chart-card">
            <h3>Alertas activas</h3>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 10 }}>Reglas que se dispararon hoy</div>
            <ul className="alert-list">
              <AlertLi icoBg="var(--accent-tint)" title="Racha en riesgo · 1 240 usuarios" sub="No abrieron la app en 18+ horas" />
              <AlertLi icoBg="#FCE8E9" title="Modo insistente nuevo · 23" sub="Mismo error 3+ veces seguidas" />
              <AlertLi icoBg="var(--primary-tint)" title="7 días seguidos · 412" sub="Hito desbloqueado · push enviado" />
              <AlertLi icoBg="#E6EFFF" title="Recordatorio nocturno · 8 412" sub="Push programado 20:00" />
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

function Kpi({ label, value, delta, deltaKind, help }: { label: string; value: string; delta: string; deltaKind: 'up' | 'down'; help: string }) {
  return (
    <div className="kpi card card-elev">
      <div className="l">{label}</div>
      <div className="row"><span className="v tnum">{value}</span><span className={`delta ${deltaKind}`}>{delta}</span></div>
      <div className="help">{help}</div>
    </div>
  )
}
function DistRow({ name, pct, color }: { name: string; pct: number; color: string }) {
  return (
    <>
      <div className="row"><span>{name}</span><span className="v">{pct}%</span></div>
      <div className="bar"><div style={{ width: `${pct}%`, background: color }} /></div>
    </>
  )
}
function ErrLi({ rank, name, tag, count }: { rank: number; name: string; tag: string; count: number }) {
  return (
    <li><span className="rank">{rank}</span><span className="name">{name}</span><span className="pill pill-outline">{tag}</span><span className="count tnum">{count}</span></li>
  )
}
function AlertLi({ icoBg, title, sub }: { icoBg: string; title: string; sub: string }) {
  return (
    <li>
      <div className="ico" style={{ background: icoBg }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
      </div>
      <div className="body"><div className="t">{title}</div><div className="s">{sub}</div></div>
    </li>
  )
}

/* ───────────── TEMPLATES (LISTADO con búsqueda + paginado) ───────────── */
interface TemplateRow {
  id: string; name: string; meta: string; tone: string; rigor: number; perMin: number; assigned: number; bg: string; isPreset?: boolean
}
const TEMPLATES: TemplateRow[] = [
  { id: 'coach', name: 'The Coach', meta: 'v2.4', tone: 'Ultra-empático', rigor: 2, perMin: 1, assigned: 24812, bg: 'var(--primary)', isPreset: true },
  { id: 'sincerist', name: 'The Sincerist / Bootcamp', meta: 'v2.5 · borrador', tone: 'Directo · demandante', rigor: 5, perMin: 4, assigned: 13422, bg: 'var(--ink-1)', isPreset: true },
  { id: 'arcade', name: 'The Arcade', meta: 'v2.2', tone: 'Lúdico · veloz', rigor: 3, perMin: 6, assigned: 6688, bg: 'var(--accent)', isPreset: true },
  { id: 'bootcamp-pro', name: 'Bootcamp Pro · B2-C1', meta: 'v1.3 · custom', tone: 'Académico estricto', rigor: 5, perMin: 5, assigned: 2104, bg: 'var(--info)' },
  { id: 'quiet', name: 'Quiet Beginner', meta: 'v1.1 · custom', tone: 'Paciente · silencioso', rigor: 1, perMin: 0, assigned: 1622, bg: 'var(--violet)' },
  { id: 'interview', name: 'Interview Coach', meta: 'v0.9 · beta', tone: 'Formal · presión', rigor: 4, perMin: 3, assigned: 941, bg: 'var(--danger)' },
]

function TemplatesView({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return TEMPLATES
    return TEMPLATES.filter(t => t.name.toLowerCase().includes(needle) || t.tone.toLowerCase().includes(needle))
  }, [q])
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <>
      <PageHead
        eyebrow="Sector 1 · Gestor metodológico"
        title="Templates de comportamiento"
        sub="El molde que se inyecta como prompt del sistema al iniciar cada sesión. Editás un template y se aplica a todos los alumnos asignados en la próxima charla."
        onMenu={onMenu}
        actions={
          <button className="btn btn-primary btn-sm"><SvgPlus /> Nuevo template</button>
        }
      />
      <div className="view">
        <div className="toolbar">
          <div className="search">
            <SvgSearch />
            <input className="input" placeholder="Buscar por nombre o tono" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
          </div>
          <button className="btn btn-secondary btn-sm">Rigurosidad ↓</button>
          <button className="btn btn-secondary btn-sm">Tipo</button>
          <span className="right">{filtered.length} templates</span>
        </div>

        <div className="card card-elev table">
          <div className="t-head">
            <span>Nombre</span><span className="col-tone">Tono</span><span className="col-rigor">Rigor</span><span>Retos/min</span><span>Asignados</span><span></span>
          </div>
          {paged.map((t) => (
            <div key={t.id} className="t-row" onClick={() => nav(`/admin/templates/${t.id}`)}>
              <div className="t-name">
                <div className="t-icon" style={{ background: t.bg, color: t.bg === 'var(--accent)' ? '#5A3D00' : 'white' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={t.bg === 'var(--accent)' ? '#5A3D00' : 'white'}>
                    <polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" />
                  </svg>
                </div>
                <div>
                  <div className="n">{t.name}</div>
                  <div className="meta">
                    {t.isPreset && <span className="pill pill-outline" style={{ fontSize: 9, padding: '1px 6px' }}>PRESET</span>}
                    {t.meta}
                  </div>
                </div>
              </div>
              <span className="col-tone" style={{ fontSize: 13, color: 'var(--fg-2)' }}>{t.tone}</span>
              <span className="col-rigor"><RigorBars value={t.rigor} /></span>
              <span className="tnum">{t.perMin} <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>/ min</span></span>
              <span className="tnum" style={{ fontWeight: 600 }}>{t.assigned.toLocaleString('es-AR')}</span>
              <button className="icon-btn-soft" onClick={(e) => e.stopPropagation()}><SvgKebab /></button>
            </div>
          ))}
          <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>
    </>
  )
}

function RigorBars({ value }: { value: number }) {
  return (
    <span className="rigor-bars">
      {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= value ? 'on' : ''} />)}
    </span>
  )
}

/* ───────────── TEMPLATE EDIT ───────────── */
const TONES = ['Profesional', 'Friendly', 'Directo', 'Académico', 'Demandante', 'Empático', 'Disruptivo', 'Corporate coach']

function TemplateEditView({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate()
  const [selectedTones, setSelectedTones] = useState(new Set(['Profesional', 'Directo', 'Demandante']))
  const [rigor, setRigor] = useState(95)
  const [freq, setFreq] = useState(40)
  const [interruptions, setInterruptions] = useState(false)
  const [blockRepeat, setBlockRepeat] = useState(true)
  const [jsonOut, setJsonOut] = useState(true)

  const toggleTone = (t: string) => setSelectedTones((s) => {
    const ns = new Set(s); if (ns.has(t)) ns.delete(t); else ns.add(t); return ns
  })

  return (
    <>
      <PageHead
        eyebrow="Templates · Editar"
        title="The Sincerist / Bootcamp"
        sub="Borrador v2.5 · última edición hace 2 horas por Camila R. · 13 422 alumnos asignados"
        onMenu={onMenu}
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/templates')}>← Volver</button>
            <button className="btn btn-secondary btn-sm">Previsualizar prompt</button>
            <button className="btn btn-primary btn-sm">Publicar cambios</button>
          </>
        }
      />
      <div className="view">
        <div className="editor-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-elev editor-section">
              <span className="eyebrow">Identidad</span>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--ink-1)', display: 'grid', placeItems: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" /></svg>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input className="input" defaultValue="The Sincerist / Bootcamp" style={{ fontWeight: 600, fontSize: 15, height: 40 }} />
                  <input className="input" defaultValue="Evaluador estricto, directo, mide cada error" style={{ fontSize: 13, color: 'var(--fg-3)', height: 36 }} />
                </div>
              </div>
            </div>

            <div className="card card-elev editor-section">
              <div className="slider-row">
                <div>
                  <div className="title">Nivel de rigurosidad</div>
                  <div className="sub">Umbral de tolerancia del analizador de errores</div>
                </div>
                <div className="val"><span className="n">{Math.round(rigor / 20)}</span><span className="m">/ 5</span></div>
              </div>
              <div className="slider-track" onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setRigor(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
              }}>
                <div className="slider-fill dark" style={{ width: `${rigor}%` }} />
                <div className="slider-thumb dark" style={{ left: `${rigor}%` }} />
              </div>
              <div className="slider-ticks">
                <span>Sin penalizar</span><span>Suave</span><span>Equilibrado</span><span>Estricto</span><span style={{ fontWeight: 700, color: 'var(--ink-1)' }}>Máximo</span>
              </div>
              <div style={{ marginTop: 12, padding: 11, background: 'var(--bg-2)', borderRadius: 10, fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                <strong>En este nivel:</strong> cada error se registra en el perfil del alumno. Se activan alertas de presión temporal y bloqueos automáticos por repetición.
              </div>
            </div>

            <div className="card card-elev editor-section">
              <div style={{ marginBottom: 12 }}>
                <div className="title" style={{ fontWeight: 600, fontSize: 15 }}>Tono y personalidad</div>
                <div className="sub" style={{ fontSize: 12, color: 'var(--fg-3)' }}>Se inyectan al super-prompt como atributos de comportamiento</div>
              </div>
              <div className="tone-grid">
                {TONES.map((t) => (
                  <div key={t} className={`tone-opt${selectedTones.has(t) ? ' on' : ''}`} onClick={() => toggleTone(t)}>{t}</div>
                ))}
              </div>
            </div>

            <div className="card card-elev editor-section">
              <div className="slider-row">
                <div>
                  <div className="title">Frecuencia de desafíos</div>
                  <div className="sub">Tarjetas de reto enviadas al frontend por minuto</div>
                </div>
                <div className="val"><span className="n">{Math.round(freq / 10)}</span><span className="m">/ min</span></div>
              </div>
              <div className="slider-track" onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setFreq(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)))
              }}>
                <div className="slider-fill" style={{ width: `${freq}%` }} />
                <div className="slider-thumb" style={{ left: `${freq}%` }} />
              </div>

              <ToggleRow t="Lógicas de interrupción" s="Interrupciones sutiles en simulaciones avanzadas (ej. entrevistas)" on={interruptions} onChange={setInterruptions} />
              <ToggleRow t="Bloqueo por repetición" s="Si el alumno repite el mismo error 3 veces, se interrumpe" on={blockRepeat} onChange={setBlockRepeat} />
              <ToggleRow t="Salida JSON estructurada" s="Separar aciertos, errores fonéticos y gramaticales al cierre" on={jsonOut} onChange={setJsonOut} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-elev editor-section">
              <span className="eyebrow">Vista previa del super-prompt</span>
              <pre className="prompt-box" style={{ marginTop: 10 }}>
<span className="com">[INSTRUCCIÓN DE SISTEMA]</span>{'\n'}
- Perfil metodológico: <span className="key">The Sincerist / Bootcamp</span>{'\n'}
- Tono: <span className="key">{Array.from(selectedTones).join(', ') || '—'}</span>{'\n'}
- Interrupciones: <span className="key">{interruptions ? 'activadas' : 'desactivadas'} durante audio,{'\n'}  feedback consolidado al final</span>{'\n'}
- Tópico: <span className="var">{'{{topic.name}}'}</span>{'\n'}
- Nivel de entrada: <span className="var">{'{{user.cefr}}'}</span>{'\n'}
- Errores recientes:{'\n'}  <span className="var">{'{{user.weak_points}}'}</span>{'\n'}
- <span className="crit">Restricción pedagógica crítica:</span>{'\n'}  Forzar contextos para <span className="var">{'{{user.weak_points[0]}}'}</span>{'\n'}
- Evaluación: rigurosa. Registrar todo error formal.{'\n'}
- Salida: {jsonOut ? <>JSON estructurado con aciertos,{'\n'}  errores fonéticos y gramaticales.</> : 'texto libre.'}
              </pre>
            </div>

            <div className="card card-elev editor-section">
              <span className="eyebrow">Distribución actual</span>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 8, marginBottom: 14 }}>
                <strong className="tnum" style={{ fontSize: 22, color: 'var(--ink-1)' }}>13 422</strong> alumnos
              </div>
              <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, marginBottom: 12 }}>
                <div style={{ width: '28%', height: '100%', background: 'var(--ink-1)', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
                Publicar este cambio aplicará la nueva config a las próximas sesiones de todos los alumnos asignados.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn btn-secondary btn-sm">Asignar a cohorte</button>
                <button className="btn btn-secondary btn-sm">Ver alumnos</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ToggleRow({ t, s, on, onChange }: { t: string; s: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <div className="body"><div className="t">{t}</div><div className="s">{s}</div></div>
      <div className={`switch${on ? '' : ' off'}`} onClick={() => onChange(!on)} />
    </div>
  )
}

/* ───────────── TÓPICOS ───────────── */
interface TopicRow {
  id: string; title: string; cat: string; seedCount: number; kwCount: number; charlas?: number;
  levels: ('A2' | 'B1' | 'B2' | 'C1' | 'C2')[]; current: 'A2' | 'B1' | 'B2' | 'C1' | 'C2'; hot?: boolean; active?: boolean
}
const CATEGORIES = [
  { key: 'todas', label: 'Todas', count: 75, color: '' },
  { key: 'tech', label: 'Tecnología', count: 14, color: 'var(--info)' },
  { key: 'arte', label: 'Arte y entretenimiento', count: 22, color: 'var(--violet)' },
  { key: 'lifestyle', label: 'Estilo de vida', count: 18, color: 'var(--primary)' },
  { key: 'diseno', label: 'Diseño y construcción', count: 9, color: 'var(--accent)' },
  { key: 'negocios', label: 'Negocios', count: 12, color: 'var(--ink-1)' },
]
const TOPICS: TopicRow[] = [
  { id: 'uk-garage', title: 'Música electrónica · UK Garage', cat: 'arte', seedCount: 4, kwCount: 64, charlas: 3482, levels: ['A2', 'B1', 'B2', 'C1'], current: 'B2', hot: true, active: true },
  { id: 'hormigon', title: 'Arquitectura residencial · hormigón visto', cat: 'diseno', seedCount: 3, kwCount: 41, levels: ['B1', 'B2', 'C1'], current: 'B2' },
  { id: 'ableton', title: 'Producción musical · Ableton', cat: 'arte', seedCount: 2, kwCount: 38, levels: ['B2', 'C1'], current: 'B2' },
  { id: 'ai-etica', title: 'IA generativa · ética', cat: 'tech', seedCount: 5, kwCount: 72, levels: ['B2', 'C1', 'C2'], current: 'B2', hot: true },
  { id: 'fuerza', title: 'Entrenamiento de fuerza · powerlifting', cat: 'lifestyle', seedCount: 3, kwCount: 48, levels: ['A2', 'B1', 'B2'], current: 'B2' },
  { id: 'agiles', title: 'Metodologías ágiles · retrospectivas', cat: 'tech', seedCount: 4, kwCount: 35, levels: ['B1', 'B2'], current: 'B2' },
  { id: 'tarantino', title: 'Cine de los 90 · Tarantino', cat: 'arte', seedCount: 3, kwCount: 52, levels: ['B1', 'B2', 'C1'], current: 'B2' },
]
const CAT_LABEL: Record<string, string> = { tech: 'Tecnología', arte: 'Arte', lifestyle: 'Lifestyle', diseno: 'Diseño', negocios: 'Negocios' }

function TopicosView({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate()
  const [cat, setCat] = useState('todas')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return TOPICS.filter(t => {
      if (cat !== 'todas' && t.cat !== cat) return false
      if (needle && !t.title.toLowerCase().includes(needle)) return false
      return true
    })
  }, [cat, q])
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <>
      <PageHead
        eyebrow="Sector 2 · Biblioteca de tópicos"
        title="Punteros temáticos"
        sub="Universos de interés con seed prompts y diccionarios de keywords por nivel. Los alumnos eligen 4-5 de estos al onboarding."
        onMenu={onMenu}
        actions={
          <>
            <button className="btn btn-secondary btn-sm">Importar CSV</button>
            <button className="btn btn-primary btn-sm"><SvgPlus /> Nuevo tópico</button>
          </>
        }
      />
      <div className="view">
        <div className="topics-layout">
          <aside className="cat-sidebar">
            <span className="eyebrow" style={{ padding: '0 12px 8px', display: 'block' }}>Categorías</span>
            {CATEGORIES.map((c) => (
              <div key={c.key} className={`cat-item${cat === c.key ? ' active' : ''}`} onClick={() => { setCat(c.key); setPage(0) }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {c.color && <span className="dot" style={{ background: c.color }} />}
                  {c.label}
                </span>
                <span className="count">{c.count}</span>
              </div>
            ))}
            <hr style={{ border: 0, height: 1, background: 'var(--border-1)', margin: '12px 12px' }} />
            <span className="eyebrow" style={{ padding: '0 12px 8px', display: 'block' }}>Nivel CEFR</span>
            <div className="level-chips" style={{ padding: '0 12px' }}>
              {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lv) => (
                <span key={lv} className={`pill ${lv === 'B2' ? 'pill-primary' : 'pill-outline'}`}>{lv}</span>
              ))}
            </div>
          </aside>

          <div>
            <div className="toolbar">
              <div className="search">
                <SvgSearch />
                <input className="input" placeholder="Buscar tópico, keyword o seed prompt" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
              </div>
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>Ordenar: Uso ↓</button>
            </div>
            {paged.map((t) => (
              <div key={t.id} className="topic-row card" onClick={() => nav(`/admin/topicos/${t.id}`)}>
                <div className="body">
                  <div className="t">
                    {t.title}
                    {t.hot && <span className="pill pill-accent">🔥 Hot</span>}
                    {t.active && <span className="pill pill-primary">Activo</span>}
                  </div>
                  <div className="m">
                    <span>{CAT_LABEL[t.cat] || t.cat}</span><span className="sep" />
                    <span className="tnum">{t.seedCount} seed prompts</span><span className="sep" />
                    <span className="tnum">{t.kwCount} keywords</span>
                    {t.charlas !== undefined && <><span className="sep" /><span className="tnum">{t.charlas.toLocaleString('es-AR')} charlas</span></>}
                  </div>
                </div>
                <div className="levels">
                  {t.levels.map((lv) => <span key={lv} className={`lv${lv === t.current ? ' cur' : ''}`}>{lv}</span>)}
                </div>
                <button className="icon-btn-soft" onClick={(e) => e.stopPropagation()}><SvgChev /></button>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ───────────── TOPIC EDIT ───────────── */
function TopicEditView({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate()
  const kws: Array<{ name: string; color: string }> = [
    { name: 'two-step rhythm', color: 'var(--primary)' }, { name: 'sub-bass', color: 'var(--primary)' }, { name: 'swing', color: 'var(--primary)' },
    { name: 'South London', color: 'var(--info)' }, { name: 'pirate radio', color: 'var(--info)' }, { name: 'BPM', color: 'var(--violet)' },
    { name: 'breakbeat', color: 'var(--violet)' }, { name: 'vocal chop', color: 'var(--violet)' }, { name: 'MC', color: 'var(--info)' },
    { name: 'producer', color: 'var(--accent)' }, { name: 'underground', color: 'var(--info)' },
    { name: 'mixed', color: 'var(--danger)' }, { name: 'sampled', color: 'var(--danger)' }, { name: 'emerged', color: 'var(--danger)' },
    { name: 'nevertheless', color: 'var(--ink-1)' }, { name: 'however', color: 'var(--ink-1)' }, { name: 'arguably', color: '#0EA5E9' },
  ]
  return (
    <>
      <PageHead
        eyebrow="Tópicos · Editar"
        title="Música electrónica · UK Garage"
        sub="Arte y entretenimiento · 4 niveles activos · usado en 3 482 charlas"
        onMenu={onMenu}
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/topicos')}>← Volver</button>
            <button className="btn btn-secondary btn-sm">Probar en sandbox</button>
            <button className="btn btn-primary btn-sm">Guardar cambios</button>
          </>
        }
      />
      <div className="view">
        <div className="topic-editor-grid">
          <div className="card card-elev seed-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Seed prompts</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>Cómo iniciar la conversación según nivel</div>
              </div>
              <button className="btn btn-secondary btn-sm">+ Nuevo</button>
            </div>
            <SeedItem lvl="B1" text="Preguntale al alumno si conoce el género. Pedile que describa con sus palabras cómo suena. Foco: descripción y comparación." extra={<span style={{ marginLeft: 'auto', color: 'var(--fg-3)', fontSize: 12 }}>3 ejecuciones / día</span>} />
            <SeedItem lvl="B2" current text="Iniciar conversación preguntando por los pros y contras del UK Garage versus House. Forzar uso de pasado narrativo cuando hable de la historia del género." extra={<span className="pill pill-primary" style={{ marginLeft: 'auto' }}>activo</span>} highlight />
            <SeedItem lvl="C1" text="Pedir análisis técnico de producción: percusión, swing rítmico, sub-bass. Profundizar en diferencias regionales (South London vs Birmingham)." />
            <SeedItem lvl="C2" text="Debate sobre el legado del género en la música electrónica contemporánea. Forzar uso de subjuntivo, condicionales 3 y modalidades epistémicas." />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-elev seed-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Keywords requeridas · B2</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>El motor verifica que el alumno las use durante la misión</div>
                </div>
                <button className="btn btn-secondary btn-sm">+</button>
              </div>
              <div className="kw-grid">
                {kws.map((k) => (
                  <span key={k.name} className="kw"><span className="col" style={{ background: k.color }} />{k.name}<span className="x">×</span></span>
                ))}
              </div>
              <hr style={{ border: 0, height: 1, background: 'var(--border-1)', margin: '10px 0' }} />
              <div className="kw-legend">
                <span><i style={{ background: 'var(--primary)' }} />core</span>
                <span><i style={{ background: 'var(--info)' }} />context</span>
                <span><i style={{ background: 'var(--violet)' }} />tech</span>
                <span><i style={{ background: 'var(--accent)' }} />role</span>
                <span><i style={{ background: 'var(--danger)' }} />verb</span>
                <span><i style={{ background: 'var(--ink-1)' }} />connector</span>
                <span><i style={{ background: '#0EA5E9' }} />modality</span>
              </div>
            </div>

            <div className="card card-elev seed-card">
              <div style={{ fontWeight: 700, fontSize: 15 }}>Estructuras gramaticales</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 12 }}>Adopción promedio en alumnos B2</div>
              {[
                { name: 'Pasado simple (narrativo)', pct: 92 },
                { name: 'Voz pasiva (was sampled)', pct: 64 },
                { name: 'Comparativos relativos', pct: 78 },
                { name: 'Conectores adversativos', pct: 45 },
              ].map((r) => (
                <div key={r.name} className="struct-row">
                  <span className="name">{r.name}</span>
                  <div className="bar"><div style={{ width: `${r.pct}%` }} /></div>
                  <span className="v">{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function SeedItem({ lvl, text, extra, current, highlight }: { lvl: string; text: string; extra?: React.ReactNode; current?: boolean; highlight?: boolean }) {
  return (
    <div className="seed-item" style={highlight ? { border: '2px solid var(--primary)', background: 'var(--primary-tint)' } : undefined}>
      <div className="seed-head">
        <span className={`lvl-tag${current ? ' cur' : ''}`}>{lvl}</span>
        {extra}
      </div>
      <div className="seed-text">{text}</div>
    </div>
  )
}

/* ───────────── GAMIFICACIÓN ───────────── */
function GamifView({ onMenu }: { onMenu: () => void }) {
  const [pauseMap, setPauseMap] = useState(true)
  const [reps, setReps] = useState(3)
  return (
    <>
      <PageHead
        eyebrow="Sector 3 · Motor de gamificación"
        title="Reglas de retención y modo insistente"
        sub="Disparadores autónomos que actúan sobre el comportamiento del alumno: rachas, alertas, hitos y misiones de rescate forzadas."
        onMenu={onMenu}
        actions={<button className="btn btn-primary btn-sm">+ Nueva regla</button>}
      />
      <div className="view">
        <div className="gamif-grid">
          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Alertas y rachas</h2>

            <div className="card card-elev gamif-card">
              <div className="gamif-head">
                <div className="ico" style={{ background: 'var(--accent-tint)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFB800"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17h2.4a2.6 2.6 0 0 0 2.6-2.6c0-1.6-1-3-2-4-2-2-1.5-4 .5-6-3.5 0-7 3-7 7 0 1 .5 2.5 1 3.1z" /></svg>
                </div>
                <div>
                  <h4>Racha en riesgo</h4>
                  <div className="s">Sin actividad durante 18 hs · push directo</div>
                </div>
                <span className="pill pill-primary" style={{ marginLeft: 'auto' }}>Activa</span>
              </div>
              <div className="template-quote">
                <div className="l">PLANTILLA · ES</div>
                <div className="q">"Ayer perdiste el progreso del bloque de condicionales. ¿Vas a abandonar la racha hoy?"</div>
              </div>
              <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--fg-3)', alignItems: 'center' }}>
                <span>📈 CTR 34%</span>
                <span style={{ marginLeft: 8 }}>Disparada 1 240× hoy</span>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '4px 10px' }}>Editar</button>
              </div>
            </div>

            <div className="card card-elev gamif-card">
              <div className="gamif-head">
                <div className="ico" style={{ background: 'var(--primary-tint)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.53 0-1-.45-1-1v-2.34"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                </div>
                <div>
                  <h4>Hitos de gamificación</h4>
                  <div className="s">Recompensas y celebración visual</div>
                </div>
              </div>
              <div className="gamif-stats">
                <div className="b"><div className="k">Primer charla</div><div className="v">+50 XP</div></div>
                <div className="b"><div className="k">3 días seguidos</div><div className="v">+100 XP</div></div>
                <div className="b"><div className="k">7 días seguidos</div><div className="v">Badge 🌱</div></div>
                <div className="b"><div className="k">30 días</div><div className="v">Badge 🔥</div></div>
              </div>
            </div>

            <div className="new-rule">
              <SvgPlus />
              Agregar nueva regla de alerta
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Modo insistente · "Castigo pedagógico"</h2>

            <div className="insistent-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFE9A0', display: 'grid', placeItems: 'center', color: '#8A5A00' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#5A3D00' }}>Activación de misión de rescate</div>
                  <div style={{ fontSize: 12, color: '#8A5A00' }}>Reglas que sobreescriben el flujo estándar</div>
                </div>
              </div>
              <div className="row">
                <div className="body"><div className="t">Repeticiones del mismo error antes de activar</div></div>
                <div className="stepper">
                  <button onClick={() => setReps((r) => Math.max(1, r - 1))}>−</button>
                  <span className="n">{reps}</span>
                  <button onClick={() => setReps((r) => Math.min(9, r + 1))}>+</button>
                </div>
              </div>
              <div className="row">
                <div className="body"><div className="t">Ventana de detección</div><div className="s">cuántas sesiones se analizan</div></div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Últimas 5 sesiones</span>
              </div>
              <div className="row">
                <div className="body"><div className="t">Mínimo de aciertos para liberar</div></div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>8 instancias correctas</span>
              </div>
              <div className="row">
                <div className="body"><div className="t">Pausar el mapa de progreso</div><div className="s">Bloquea avance hasta resolver</div></div>
                <div className={`switch${pauseMap ? '' : ' off'}`} onClick={() => setPauseMap(!pauseMap)} />
              </div>
            </div>

            <div className="card card-elev gamif-card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Estadísticas modo insistente · 7 días</div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="tnum" style={{ fontSize: 22, fontWeight: 800 }}>184</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Activaciones</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-dark)' }}>72%</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Resueltas en ≤ 2 sesiones</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.4 }}>
                El abandono post-rescate bajó del 18% al 9% desde la última iteración. La mejora se concentra en B1-B2.
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

/* ───────────── INSPECTOR ───────────── */
function InspectorView({ onMenu }: { onMenu: () => void }) {
  return (
    <>
      <PageHead
        eyebrow="Inspector de sesión · Live"
        title="Sesión #SX-9214 · Lautaro M. · 03:42"
        sub="The Sincerist / Bootcamp · UK Garage · B2 · iniciada 16:42:11 · expira en 3:18"
        onMenu={onMenu}
        actions={
          <>
            <button className="btn btn-secondary btn-sm">Ver JSON crudo</button>
            <button className="btn btn-secondary btn-sm">Pausar sesión</button>
          </>
        }
      />
      <div className="view">
        <div className="inspector-grid">
          <section>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>Capas de inyección · ejecutadas en milisegundos</span>
            <LayerCard kind="l1" n={1} title="Perfil del usuario" src="DB · users.profile + recent_errors" kv={[
              ['Nivel CEFR', 'B2'],
              ['Intereses', 'UK Garage · Producción · Software'],
              ['Idioma base', 'es-AR'],
              ['Errores recientes', '3× pasado irregular · 1× /θ/'],
            ]} />
            <LayerCard kind="l2" n={2} title="Template metodológico" src="methodology_templates.id=2" kv={[
              ['Nombre', 'The Sincerist / Bootcamp'],
              ['Rigor', '5 / 5'],
              ['Tono', 'profesional · directo · demandante'],
              ['Interrupciones', 'OFF · feedback final'],
              ['Retos/min', '4'],
            ]} />
            <LayerCard kind="l3" n={3} title="Tópico activo" src="topics.id=42 · B2 seed prompt" kv={[
              ['Tópico', 'UK Garage'],
              ['Seed', '"Pros y contras del UK Garage vs House…"'],
              ['Keywords', '17 requeridas · 9 detectadas'],
              ['Estructuras', '4 pasivas requeridas · 2 OK'],
            ]} />
            <div className="arrow-down">↓ consolidado en super-prompt ↓</div>
          </section>

          <section>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 12 }}>Super-prompt enviado al LLM</span>
            <pre className="prompt-box" style={{ marginBottom: 18 }}>
<span className="com">[INSTRUCCIÓN DE SISTEMA — ENTORNO DE EJECUCIÓN]</span>{'\n'}
- Perfil: <span className="key">The Sincerist / Bootcamp</span>.{'\n'}
- Tono: <span className="key">profesional, directo, exigente</span>. No interrumpas por audio.{'\n'}
- Tópico: <span className="var">Música Electrónica · UK Garage</span>.{'\n'}
- Nivel del usuario: <span className="var">B2</span>.{'\n\n'}
- <span className="crit">RESTRICCIÓN CRÍTICA:</span>{'\n'}  El usuario presenta fallos recurrentes en{'\n'}  <span className="crit">verbos irregulares en pasado simple</span>.{'\n'}  Moldeá tus respuestas para forzar contextos{'\n'}  narrativos históricos dentro del tópico musical.{'\n\n'}
- Al cierre generá JSON con: aciertos, errores{'\n'}  fonéticos y errores gramaticales.
            </pre>

            <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Transcripción en vivo</span>
            <div className="card card-elev transcript-box">
              <TsLine who="ai">Hi Lautaro. Let's dive in — what do you think made UK Garage stand out in the late '90s?</TsLine>
              <TsLine who="user">I think it was the rhythm. Producers mixed two-step with…</TsLine>
              <TsLine who="ai">Tell me how it actually emerged. Walk me through who started it.</TsLine>
              <TsLine who="user" tag={{ kind: 'err', text: '⚠️ pasado simple · "started to mixing"' }}>Producers in South London started to mixing the rhythms…</TsLine>
              <TsLine who="ai">Keep going — paint the picture.</TsLine>
              <TsLine who="user" tag={{ kind: 'ok', text: '✓ kw: sampled' }}>And then they sampled vocals from US house, and the sound was very different.</TsLine>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
function LayerCard({ kind, n, title, src, kv }: { kind: 'l1' | 'l2' | 'l3'; n: number; title: string; src: string; kv: [string, string][] }) {
  return (
    <div className={`card card-elev layer-card ${kind}`}>
      <div className="layer-head">
        <div className="n">{n}</div>
        <div className="t">{title}</div>
        <div className="src">{src}</div>
        <span className="pill pill-primary">✓ OK</span>
      </div>
      <div className="kv-box">
        {kv.map(([k, v]) => (
          <div key={k} className="kv-row"><span className="k">{k}</span><span className="v">{v}</span></div>
        ))}
      </div>
    </div>
  )
}
function TsLine({ who, children, tag }: { who: 'ai' | 'user'; children: React.ReactNode; tag?: { kind: 'err' | 'ok'; text: string } }) {
  return (
    <div className="ts-line">
      <span className={`who ${who}`}>{who === 'ai' ? 'AI' : 'USER'}</span>
      <span className="txt"> {children}</span>
      {tag && <><br /><span className={`ts-tag ${tag.kind}`}>{tag.text}</span></>}
    </div>
  )
}

/* ───────────── ALUMNOS ───────────── */
interface Alumno {
  id: string; name: string; email: string; av: string; avBg: string;
  level: 'A2' | 'B1' | 'B2' | 'C1'; tutor: string; progress: number;
  status: { text: string; pillClass: string }; last: string;
  highlight?: boolean; progressColor?: string
}
const ALUMNOS: Alumno[] = [
  { id: '1', name: 'Lautaro Méndez', email: 'lautaro@hablah.com', av: 'L', avBg: 'var(--ink-1)', level: 'B2', tutor: 'The Sincerist', progress: 62, status: { text: '🔥 12d', pillClass: 'pill-accent' }, last: 'hace 18 min' },
  { id: '2', name: 'Mariana Torres', email: 'mariana@email.com', av: 'M', avBg: 'var(--primary)', level: 'B1', tutor: 'The Coach', progress: 34, status: { text: '✓ activa', pillClass: 'pill-primary' }, last: 'hace 2 h' },
  { id: '3', name: 'Juan Pablo Salas', email: 'jp@email.com', av: 'J', avBg: '#5A6BFF', level: 'C1', tutor: 'The Sincerist', progress: 88, status: { text: '🔥 47d', pillClass: 'pill-accent' }, last: 'ayer' },
  { id: '4', name: 'Carla Giménez', email: 'carla.g@email.com', av: 'C', avBg: 'var(--accent)', level: 'B2', tutor: 'The Sincerist', progress: 48, status: { text: '⚠ en rescate', pillClass: 'pill-danger' }, last: 'hace 4 h', highlight: true, progressColor: 'var(--accent)' },
  { id: '5', name: 'Federica Albano', email: 'fede@email.com', av: 'F', avBg: 'var(--violet)', level: 'A2', tutor: 'The Coach', progress: 18, status: { text: 'nueva', pillClass: 'pill-outline' }, last: 'hace 6 h' },
  { id: '6', name: 'Diego Ruiz', email: 'diego.r@email.com', av: 'D', avBg: 'var(--danger)', level: 'B2', tutor: 'The Arcade', progress: 54, status: { text: 'racha rota', pillClass: 'pill-danger' }, last: 'hace 3 días' },
]
const LEVEL_PILL: Record<string, string> = { A2: 'pill-info', B1: 'pill-info', B2: 'pill-primary', C1: 'pill-violet' }

function AlumnosView({ onMenu }: { onMenu: () => void }) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return ALUMNOS
    return ALUMNOS.filter(a => a.name.toLowerCase().includes(n) || a.email.toLowerCase().includes(n))
  }, [q])
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <>
      <PageHead
        eyebrow="Comunidad"
        title="Alumnos"
        sub="47 132 alumnos activos · vista filtrable por nivel, tutor o estado de progreso."
        onMenu={onMenu}
        actions={<button className="btn btn-secondary btn-sm">Exportar</button>}
      />
      <div className="view">
        <div className="toolbar">
          <div className="search">
            <SvgSearch />
            <input className="input" placeholder="Buscar por email, nombre o cohorte" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
          </div>
          <button className="btn btn-secondary btn-sm">Nivel</button>
          <button className="btn btn-secondary btn-sm">Tutor</button>
          <button className="btn btn-secondary btn-sm">En rescate</button>
          <span className="right">Mostrando {filtered.length} de 47 132</span>
        </div>
        <div className="card card-elev users-table">
          <div className="uhead">
            <span>Alumno</span><span>Nivel</span><span className="col-temp">Tutor</span><span className="col-prog">Progreso</span><span>Estado</span><span className="col-last">Última charla</span><span></span>
          </div>
          {paged.map((a) => (
            <div key={a.id} className="urow" style={a.highlight ? { background: '#FFF7E5' } : undefined}>
              <div className="uname">
                <div className="av" style={{ background: a.avBg, color: a.avBg === 'var(--accent)' ? '#5A3D00' : 'white' }}>{a.av}</div>
                <div><div className="n">{a.name}</div><div className="e">{a.email}</div></div>
              </div>
              <span className={`pill ${LEVEL_PILL[a.level] || 'pill-primary'}`}>{a.level}</span>
              <span className="col-temp" style={{ fontSize: 13 }}>{a.tutor}</span>
              <div className="col-prog" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 5, background: 'var(--bg-3)', borderRadius: 3 }}>
                  <div style={{ width: `${a.progress}%`, height: '100%', background: a.progressColor || 'var(--primary)', borderRadius: 3 }} />
                </div>
                <span className="tnum" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{a.progress}%</span>
              </div>
              <span className={`pill ${a.status.pillClass}`}>{a.status.text}</span>
              <span className="col-last" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{a.last}</span>
              <button className="icon-btn-soft"><SvgChev /></button>
            </div>
          ))}
          <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>
    </>
  )
}

/**
 * Pages secundarias del modulo Kids: Topicos / Coleccion / Aventuras / Perfil.
 *
 * Comparten KidsLayout (sidebar + tabbar). Foco en plomeria - estetica usa
 * mismos tokens del KIDS_CSS shared.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KidsLayout } from './_shared'
import { useKid, KIDS_TOKEN_KEY, rankInfo } from './KidsContext'
import { KIDS_AGE_KEY } from './KidsAgeSelect'
import { PracticarGalaxy } from '../../components/PracticarGalaxy'

interface KidsTopic {
  id: number
  slug: string
  title: string
  keywords: string[]
  is_hot: boolean
}

interface Achievement {
  slug: string
  name: string
  description: string
  icon_name: string
  icon_color: string
  threshold: number | null
  order: number
  awarded: boolean
}

// ─────────────────────────────────────────────────────────────
// CSS compartido para las 4 paginas
// ─────────────────────────────────────────────────────────────
const PAGE_CSS = `
.kids-page-header { padding:18px 0 18px; }
.kids-page-header .eyebrow { font-size:11px; letter-spacing:.14em; text-transform:uppercase; font-weight:800; color:var(--green-700); margin:0 0 6px; }
.kids-page-header h1 { font-family:var(--font-display); font-weight:800; font-size:32px; letter-spacing:-0.025em; margin:0 0 6px; color:var(--fg-1); }
.kids-page-header h1 em { font-style:normal; color:var(--green-700); background:linear-gradient(180deg,transparent 64%,rgba(0,179,126,.22) 64% 96%,transparent 96%); padding:0 4px; }
.kids-page-header p { font-size:15px; color:var(--fg-2); margin:0; max-width:540px; }

/* ── Banda hero con progreso (colección) ── */
.kids-hero { position:relative; overflow:hidden; border-radius:var(--r-card-lg); padding:22px 24px; margin-bottom:22px; color:#fff; background:linear-gradient(135deg,var(--green),var(--green-700)); box-shadow:var(--shadow-pop); }
.kids-hero::after { content:""; position:absolute; right:-40px; top:-50px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,.18),transparent 70%); pointer-events:none; }
.kids-hero .ht { position:relative; z-index:1; }
.kids-hero .hero-row { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.kids-hero .hero-big { font-family:var(--font-display); font-weight:900; font-size:40px; line-height:1; letter-spacing:-0.03em; font-feature-settings:"tnum"; }
.kids-hero .hero-big span { font-size:22px; font-weight:700; opacity:.7; }
.kids-hero .hero-sub { font-size:13px; opacity:.92; margin-top:4px; font-weight:600; }
.kids-hero .hero-medal { width:56px; height:56px; border-radius:18px; background:rgba(255,255,255,.16); display:grid; place-items:center; flex-shrink:0; }
.kids-hero-bar { height:10px; border-radius:99px; background:rgba(255,255,255,.22); overflow:hidden; margin-top:16px; }
.kids-hero-bar i { display:block; height:100%; background:#fff; border-radius:99px; transition:width .5s var(--ease); }
.kids-hero .hero-next { font-size:12.5px; opacity:.92; margin-top:10px; font-weight:600; }
.kids-hero .hero-next b { font-weight:800; }

/* ── Tarjetas de stats (aventuras + perfil) ── */
.kids-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:22px; }
.kids-stat { background:var(--surface); border:1px solid var(--border-1); border-radius:var(--r-card); padding:16px; box-shadow:var(--shadow-soft); }
.kids-stat .si { width:38px; height:38px; border-radius:12px; display:grid; place-items:center; color:#fff; margin-bottom:11px; }
.kids-stat .sv { font-family:var(--font-display); font-weight:800; font-size:24px; color:var(--fg-1); line-height:1; font-feature-settings:"tnum"; }
.kids-stat .sl { font-size:12px; color:var(--fg-3); margin-top:4px; font-weight:600; }
@media (max-width:560px) { .kids-stats { gap:8px; } .kids-stat { padding:13px; } .kids-stat .sv { font-size:20px; } }

/* ── Grilla de colección ── */
.kids-coll-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:14px; }
.kids-coll-card { position:relative; background:var(--surface); border:1px solid var(--border-1); border-radius:18px; padding:18px 14px 14px; display:flex; flex-direction:column; align-items:center; gap:9px; text-align:center; box-shadow:var(--shadow-soft); transition:transform .16s var(--ease), box-shadow .16s var(--ease); overflow:hidden; }
.kids-coll-card.awarded { background:linear-gradient(180deg,var(--tint,rgba(0,179,126,.08)),var(--surface) 62%); }
.kids-coll-card.awarded:hover { transform:translateY(-3px) rotate(-1.5deg); box-shadow:var(--shadow-pop); }
.kids-coll-card.locked { background:repeating-linear-gradient(135deg,var(--bg-3),var(--bg-3) 6px,var(--bg-2) 6px 12px); box-shadow:none; opacity:.78; }
.kids-coll-card .ic { width:54px; height:54px; border-radius:16px; display:grid; place-items:center; color:#fff; box-shadow:0 6px 14px rgba(13,20,18,.12); }
.kids-coll-card.locked .ic { background:var(--bg-3); color:var(--fg-4); box-shadow:none; }
.kids-coll-card .nm { font-family:var(--font-display); font-weight:700; font-size:13px; color:var(--fg-1); }
.kids-coll-card .ds { font-size:11px; color:var(--fg-3); line-height:1.3; }
.kids-coll-card.locked .nm, .kids-coll-card.locked .ds { color:var(--fg-4); }
.kids-coll-card .pin { position:absolute; top:9px; right:9px; display:grid; place-items:center; }
.kids-coll-card .pin.lock { color:var(--fg-4); }
.kids-coll-card .pin.check { width:20px; height:20px; border-radius:50%; background:var(--green); color:#fff; box-shadow:0 2px 6px rgba(0,143,99,.45); }

/* ── Timeline de aventuras ── */
.kids-tl-day { font-family:var(--font-display); font-weight:800; font-size:11.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--fg-4); margin:18px 0 10px; }
.kids-tl { position:relative; margin-left:7px; padding-left:24px; border-left:2px solid var(--border-2); display:flex; flex-direction:column; gap:12px; }
.kids-tl-card { position:relative; background:var(--surface); border:1px solid var(--border-1); border-radius:16px; padding:13px 16px; box-shadow:var(--shadow-soft); display:grid; grid-template-columns:auto 1fr auto; gap:14px; align-items:center; transition:transform .15s var(--ease); }
.kids-tl-card:hover { transform:translateX(2px); }
.kids-tl-card::before { content:""; position:absolute; left:-31px; top:50%; transform:translateY(-50%); width:14px; height:14px; border-radius:50%; background:var(--node,var(--green)); border:3px solid var(--bg-1); box-shadow:0 0 0 2px var(--border-2); }
.kids-tl-card .av { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; color:#fff; font-family:var(--font-display); font-weight:800; font-size:18px; flex-shrink:0; }
.kids-tl-card .tx h4 { margin:0; font-family:var(--font-display); font-weight:700; font-size:15px; color:var(--fg-1); }
.kids-tl-card .tx p { margin:2px 0 0; font-size:12px; color:var(--fg-3); }
.kids-tl-card .met { display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:800; color:var(--amber-bg); }
.kids-tl-card .met { color:#7A5800; background:var(--amber-bg); padding:5px 10px; border-radius:99px; }

/* ── Perfil ── */
.kids-profile-hero { position:relative; overflow:hidden; border-radius:var(--r-card-lg); padding:24px; margin-bottom:18px; background:linear-gradient(135deg,var(--green),var(--green-700)); color:#fff; box-shadow:var(--shadow-pop); display:flex; align-items:center; gap:18px; }
.kids-profile-hero::after { content:""; position:absolute; right:-50px; bottom:-70px; width:220px; height:220px; border-radius:50%; background:radial-gradient(circle,rgba(255,255,255,.15),transparent 70%); pointer-events:none; }
.kids-profile-hero .pa { width:76px; height:76px; border-radius:50%; display:grid; place-items:center; font-family:var(--font-display); font-weight:800; font-size:32px; color:#fff; border:3px solid rgba(255,255,255,.5); flex-shrink:0; position:relative; z-index:1; box-shadow:0 8px 20px rgba(13,20,18,.18); }
.kids-profile-hero .pi { position:relative; z-index:1; flex:1; min-width:0; }
.kids-profile-hero .pi h2 { margin:0; font-family:var(--font-display); font-weight:800; font-size:26px; letter-spacing:-0.02em; }
.kids-profile-hero .pills { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.kids-profile-hero .pill { font-size:11.5px; font-weight:800; padding:4px 10px; border-radius:99px; background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.22); }
.kids-profile-hero .barwrap { margin-top:13px; }
.kids-profile-hero .barwrap .bl { font-size:11.5px; color:rgba(255,255,255,.92); margin-bottom:6px; font-weight:600; }
.kids-profile-hero .bar { height:8px; border-radius:99px; background:rgba(255,255,255,.22); overflow:hidden; }
.kids-profile-hero .bar i { display:block; height:100%; background:var(--amber); border-radius:99px; transition:width .5s var(--ease); }
@media (max-width:560px) { .kids-profile-hero { flex-direction:column; text-align:center; align-items:center; } .kids-profile-hero .pills { justify-content:center; } }

.kids-profile-card { background:var(--surface); border:1px solid var(--border-1); border-radius:var(--r-card); padding:18px 22px; display:flex; flex-direction:column; gap:8px; max-width:560px; box-shadow:var(--shadow-soft); }
.kids-profile-card .row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px dashed var(--border-2); }
.kids-profile-card .row:last-of-type { border-bottom:0; }
.kids-profile-card .row .k { font-size:13px; color:var(--fg-3); }
.kids-profile-card .row .v { font-family:var(--font-display); font-weight:700; font-size:15px; color:var(--fg-1); }
.kids-profile-card .actions { display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; }
.kids-btn-secondary { padding:11px 16px; border-radius:14px; background:var(--amber-bg); color:#7A5800; border:1px solid rgba(255,184,0,.35); font-weight:800; font-size:13.5px; cursor:pointer; transition:all .15s var(--ease); }
.kids-btn-secondary:hover { background:#FFE9A6; transform:translateY(-1px); }
.kids-btn-danger { padding:11px 16px; border-radius:14px; background:#FCE8E9; color:#B42127; border:1px solid rgba(180,33,39,.20); font-weight:800; font-size:13.5px; cursor:pointer; transition:all .15s var(--ease); }
.kids-btn-danger:hover { background:#F8D7D9; }
.kids-family { margin-top:18px; max-width:560px; font-size:12.5px; color:var(--fg-3); line-height:1.5; }
.kids-family a { color:var(--green-700); font-weight:700; display:inline-flex; align-items:center; gap:3px; }

.kids-empty { text-align:center; padding:48px 24px; color:var(--fg-3); }
.kids-empty h3 { font-family:var(--font-display); font-weight:800; font-size:20px; color:var(--fg-1); margin:0 0 6px; }
`

// ── Helpers de color/fecha (compartidos por las páginas) ──
function hexToRgba(hex: string, a: number): string {
  const h = (hex || '').replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const v = parseInt(n, 16)
  if (Number.isNaN(v) || n.length < 6) return `rgba(0,179,126,${a})`
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`
}

function shade(hex: string, f = 0.72): string {
  const h = (hex || '').replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const v = parseInt(n, 16)
  if (Number.isNaN(v) || n.length < 6) return hex || '#008F63'
  return `rgb(${Math.round(((v >> 16) & 255) * f)},${Math.round(((v >> 8) & 255) * f)},${Math.round((v & 255) * f)})`
}

// ─────────────────────────────────────────────────────────────
// /kids/topicos -- todos los topicos del nivel
// ─────────────────────────────────────────────────────────────
const TOPIC_COLORS = [
  'linear-gradient(135deg,#00B37E,#008F63)',
  'linear-gradient(135deg,#A855F7,#7C3AED)',
  'linear-gradient(135deg,#06B6D4,#0891B2)',
  'linear-gradient(135deg,#FB7C39,#EA580C)',
  'linear-gradient(135deg,#FF6AA9,#DB2777)',
  'linear-gradient(135deg,#3B82F6,#1E40AF)',
  'linear-gradient(135deg,#FACC15,#CA8A04)',
  'linear-gradient(135deg,#EC4899,#BE185D)',
  'linear-gradient(135deg,#22D3EE,#0E7490)',
  'linear-gradient(135deg,#7C3AED,#5B21B6)',
]

export function KidsTopicsAll() {
  const navigate = useNavigate()
  const { kid } = useKid()
  const [topics, setTopics] = useState<KidsTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/kids/topics?age_group=${kid.age_group}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [kid.age_group])

  // Adaptamos a la forma que espera PracticarGalaxy
  const interests = topics.map((t) => ({
    id: t.id,
    title: t.title,
    category: 'kids',  // genérico para que el color shuffle de la galaxia
  }))

  // Si no cargó nada, mostramos el fallback con cards
  const showCards = !loading && topics.length === 0

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {!showCards && !loading && topics.length > 0 && (
        <>
          <PracticarGalaxy
            userName={kid.name}
            interests={interests}
            onPick={(topicId) => {
              const t = topics.find((x) => x.id === topicId)
              navigate(`/kids/sesion/${topicId}`, { state: { topic: t } })
            }}
            onSurprise={() => {
              if (topics.length === 0) return
              const random = topics[Math.floor(Math.random() * topics.length)]
              navigate(`/kids/sesion/${random.id}`, { state: { topic: random } })
            }}
            onFreeTopic={(text) => {
              navigate(`/kids/sesion/free?q=${encodeURIComponent(text)}`)
            }}
          />
          <Link
            to="/kids"
            style={{
              position: 'fixed', top: 16, left: 16, zIndex: 100,
              background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)',
              color: '#fff', padding: '8px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700,
              backdropFilter: 'blur(8px)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            ← Volver
          </Link>
        </>
      )}

      {loading && (
        <KidsLayout>
          <style>{PAGE_CSS}</style>
          <div className="kids-page-header">
            <h1>¿De qué <em>charlamos</em>?</h1>
            <p>Todos los temas que Habi conoce para vos.</p>
          </div>
          <div className="kids-empty">
            <h3>Cargando temas...</h3>
          </div>
        </KidsLayout>
      )}

      {showCards && (
        <KidsLayout>
          <style>{PAGE_CSS}</style>
          <div className="kids-page-header">
            <h1>¿De qué <em>charlamos</em>?</h1>
            <p>Todos los temas que Habi conoce para vos.</p>
          </div>
          <div className="kids-empty">
            <h3>No pudimos cargar los temas</h3>
            <p>{error ?? 'Quizás el servidor está despertando — refrescá en un momento.'}</p>
          </div>
        </KidsLayout>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// /kids/coleccion -- catalogo achievements
// ─────────────────────────────────────────────────────────────
function AchievementIcon({ name, color }: { name: string; color: string }) {
  // Render rapido: icono SVG estilizado basado en el nombre
  const common = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<string, JSX.Element> = {
    Trophy: <><path d="M7 4h10v2a5 5 0 0 1-10 0z"/><path d="M5 4h14"/><path d="M12 11v4"/><path d="M8 21h8M9 21l3-6 3 6"/></>,
    Star: <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" fill="currentColor"/>,
    Sparkles: <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></>,
    Flame: <path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-6 0 2 1 3 2 3 0-3 1-6 4-9 0 4 6 6 6 12 0 4-3 7-8 7z" fill="currentColor"/>,
    Award: <><circle cx="12" cy="9" r="6"/><path d="M9 14l-2 7 5-3 5 3-2-7"/></>,
    Medal: <><circle cx="12" cy="15" r="6"/><path d="M9 9l-3-6h12l-3 6"/></>,
    Crown: <path d="M3 8l3 9h12l3-9-5 4-4-6-4 6z" fill="currentColor"/>,
    Compass: <><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 5-5 2 2-5z" fill="currentColor"/></>,
    Mountain: <path d="M3 20l6-10 4 6 3-4 5 8z" fill="currentColor"/>,
    Anchor: <><circle cx="12" cy="6" r="2"/><path d="M12 8v12M5 12h14M5 16a7 7 0 0 0 14 0"/></>,
    Zap: <path d="M13 2L4 14h7l-2 8 9-12h-7z" fill="currentColor"/>,
    Palette: <><path d="M12 22a10 10 0 1 1 10-10 4 4 0 0 1-4 4h-2a2 2 0 0 0-2 2 4 4 0 0 1-2 4z"/><circle cx="7" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="14" cy="7" r="1" fill="currentColor"/><circle cx="17" cy="11" r="1" fill="currentColor"/></>,
    Bird: <><path d="M16 7l-3 3-3-3"/><path d="M19 4v5l-7 7H8l-4-4V8l4-4z"/></>,
    Hash: <path d="M4 9h16M4 15h16M10 3l-4 18M18 3l-4 18"/>,
    Smile: <><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></>,
    Package: <><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></>,
    Gamepad2: <><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 12h4M9 10v4"/></>,
    IceCream: <><path d="M8 8a4 4 0 0 1 8 0"/><path d="M8 8l4 13 4-13"/></>,
    Backpack: <><path d="M6 8h12v12H6z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><path d="M9 14h6"/></>,
    Video: <><rect x="3" y="6" width="14" height="12" rx="2"/><polygon points="17 9 22 6 22 18 17 15" fill="currentColor"/></>,
    Box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></>,
    Radio: <><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/></>,
    Footprints: <><ellipse cx="8" cy="10" rx="3" ry="4"/><ellipse cx="16" cy="14" rx="3" ry="4"/></>,
    Crosshair: <><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3"/></>,
    MessageCircle: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>,
  }
  const icon = paths[name] ?? <circle cx="12" cy="12" r="9" />
  return (
    <svg {...common} style={{ color }}>
      {icon}
    </svg>
  )
}

export function KidsCollection() {
  const [items, setItems] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(KIDS_TOKEN_KEY)
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    fetch('/api/kids/achievements', { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const total = items.length
  const awarded = items.filter((a) => a.awarded).length
  const pct = total ? Math.round((awarded / total) * 100) : 0
  const next = items.filter((a) => !a.awarded).sort((a, b) => a.order - b.order)[0]

  return (
    <KidsLayout>
      <style>{PAGE_CSS}</style>
      <div className="kids-page-header">
        <p className="eyebrow">Tu vitrina</p>
        <h1>Mi <em>colección</em></h1>
        <p>Cada vez que aprendés algo nuevo, ganás un logro para tu vitrina.</p>
      </div>

      {total > 0 && (
        <div className="kids-hero">
          <div className="ht">
            <div className="hero-row">
              <div>
                <div className="hero-big">{awarded}<span>/{total}</span></div>
                <div className="hero-sub">logros desbloqueados</div>
              </div>
              <div className="hero-medal">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="6" /><path d="M9 13.5 7.5 22 12 19l4.5 3-1.5-8.5" />
                </svg>
              </div>
            </div>
            <div className="kids-hero-bar"><i style={{ width: `${pct}%` }} /></div>
            {next && <div className="hero-next">Próximo logro: <b>{next.name}</b></div>}
          </div>
        </div>
      )}

      <div className="kids-coll-grid">
        {items.map((a) => (
          <div
            key={a.slug}
            className={`kids-coll-card ${a.awarded ? 'awarded' : 'locked'}`}
            title={a.description}
            style={a.awarded ? ({ '--tint': hexToRgba(a.icon_color, 0.1) } as CSSProperties) : undefined}
          >
            <span className={`pin ${a.awarded ? 'check' : 'lock'}`}>
              {a.awarded ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              )}
            </span>
            <div className="ic" style={a.awarded ? { background: a.icon_color } : undefined}>
              <AchievementIcon name={a.icon_name} color={a.awarded ? '#fff' : 'currentColor'} />
            </div>
            <div className="nm">{a.name}</div>
            <div className="ds">{a.description}</div>
          </div>
        ))}
      </div>

      {!loading && total === 0 && (
        <div className="kids-empty">
          <h3>Tu vitrina te espera</h3>
          <p>Cuando termines tu primera charla con Habi, vas a empezar a ganar logros.</p>
        </div>
      )}
    </KidsLayout>
  )
}

// ─────────────────────────────────────────────────────────────
// /kids/aventuras -- historial REAL de sesiones (GET /api/kids/sessions)
// ─────────────────────────────────────────────────────────────
interface KidSession {
  id: number
  topic_id: number | null
  title: string
  started_at: string | null
  duration_seconds: number | null
  score: number | null
}

const ADV_COLORS = ['#00B37E', '#06B6D4', '#FB7C39', '#EC4899', '#3B82F6', '#A855F7', '#FACC15']

function relDay(iso: string | null): string {
  if (!iso) return 'Hace poco'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Hace poco'
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86400000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return d.toLocaleDateString('es', { weekday: 'long' })
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long' })
}

function fmtMin(secs: number | null): string {
  if (!secs || secs < 60) return 'menos de 1 min'
  return `${Math.round(secs / 60)} min`
}

export function KidsAdventures() {
  const { kid } = useKid()
  const [sessions, setSessions] = useState<KidSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(KIDS_TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    fetch('/api/kids/sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  const totalMin = Math.round(sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0) / 60)
  const scored = sessions.filter((s) => typeof s.score === 'number')
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, x) => s + (x.score || 0), 0) / scored.length)
    : null

  // Agrupado por día relativo, respetando el orden (más reciente primero)
  const groups: { day: string; items: KidSession[] }[] = []
  for (const s of sessions) {
    const day = relDay(s.started_at)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(s)
    else groups.push({ day, items: [s] })
  }

  return (
    <KidsLayout>
      <style>{PAGE_CSS}</style>
      <div className="kids-page-header">
        <p className="eyebrow">Tu historia</p>
        <h1>Mis <em>aventuras</em></h1>
        <p>Todas tus charlas con Habi, una por una. Mirá cuánto creciste.</p>
      </div>

      <div className="kids-stats">
        <div className="kids-stat">
          <div className="si" style={{ background: 'var(--green)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></svg>
          </div>
          <div className="sv">{kid.charlas_count}</div>
          <div className="sl">charlas en total</div>
        </div>
        <div className="kids-stat">
          <div className="si" style={{ background: 'var(--kid-cyan)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          </div>
          <div className="sv">{totalMin}</div>
          <div className="sl">minutos hablando</div>
        </div>
        <div className="kids-stat">
          <div className="si" style={{ background: 'var(--amber)', color: '#3A2A00' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>
          </div>
          <div className="sv">{avgScore ?? '—'}</div>
          <div className="sl">puntaje promedio</div>
        </div>
      </div>

      {loading && (
        <div className="kids-empty"><h3>Cargando tus aventuras...</h3></div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="kids-empty">
          <h3>Todavía no hay aventuras</h3>
          <p>
            {kid.is_real
              ? 'Cuando termines tu primera charla con Habi, va a aparecer acá.'
              : 'Entrá con tu perfil y completá una charla para empezar tu historia.'}
          </p>
        </div>
      )}

      {!loading && groups.map((g, gi) => (
        <div key={`${g.day}-${gi}`}>
          <div className="kids-tl-day">{g.day}</div>
          <div className="kids-tl">
            {g.items.map((s, i) => {
              const color = ADV_COLORS[(gi + i) % ADV_COLORS.length]
              return (
                <div key={s.id} className="kids-tl-card" style={{ '--node': color } as CSSProperties}>
                  <div className="av" style={{ background: color }}>{(s.title || '?').charAt(0).toUpperCase()}</div>
                  <div className="tx">
                    <h4>{s.title}</h4>
                    <p>{fmtMin(s.duration_seconds)} hablando con Habi</p>
                  </div>
                  {typeof s.score === 'number' && (
                    <span className="met">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>
                      {s.score}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </KidsLayout>
  )
}

// ─────────────────────────────────────────────────────────────
// /kids/perfil
// ─────────────────────────────────────────────────────────────
const AGE_LABEL: Record<string, string> = {
  mini: 'Mini · 4-7 años',
  junior: 'Junior · 7-10 años',
  tween: 'Tween · 10-14 años',
}

export function KidsProfile() {
  const navigate = useNavigate()
  const { kid, logoutKid } = useKid()
  const { current, next } = rankInfo(kid.rank_slug)

  let pct = 100
  let toNext = 0
  if (next) {
    const span = Math.max(1, next.minCharlas - current.minCharlas)
    const done = Math.max(0, kid.charlas_count - current.minCharlas)
    pct = Math.min(100, Math.round((done / span) * 100))
    toNext = Math.max(0, next.minCharlas - kid.charlas_count)
  }

  const onChangeAge = () => navigate('/kids/seleccionar-edad')
  const onExit = () => {
    if (confirm('¿Salir del modo Habi y volver a la landing?')) {
      logoutKid()
      navigate('/')
    }
  }

  return (
    <KidsLayout>
      <style>{PAGE_CSS}</style>
      <div className="kids-page-header">
        <p className="eyebrow">Quién sos</p>
        <h1>Mi <em>perfil</em></h1>
        <p>Tus datos y tu progreso. Para cambios grandes, pedile a tu adulto.</p>
      </div>

      <div className="kids-profile-hero">
        <div className="pa" style={{ background: `linear-gradient(135deg, ${kid.avatar_color}, ${shade(kid.avatar_color)})` }}>
          {(kid.name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="pi">
          <h2>{kid.name}</h2>
          <div className="pills">
            <span className="pill">{current.name}</span>
            <span className="pill">{AGE_LABEL[kid.age_group] ?? kid.age_group}</span>
          </div>
          <div className="barwrap">
            <div className="bl">{next ? `Faltan ${toNext} charlas para ${next.name}` : '¡Llegaste al rango máximo!'}</div>
            <div className="bar"><i style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="kids-stats">
        <div className="kids-stat">
          <div className="si" style={{ background: 'var(--amber)', color: '#3A2A00' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>
          </div>
          <div className="sv">{kid.coins}</div>
          <div className="sl">monedas habi</div>
        </div>
        <div className="kids-stat">
          <div className="si" style={{ background: 'var(--green)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></svg>
          </div>
          <div className="sv">{kid.charlas_count}</div>
          <div className="sl">charlas hechas</div>
        </div>
        <div className="kids-stat">
          <div className="si" style={{ background: 'var(--kid-violet)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-1.5 11h-15z" /></svg>
          </div>
          <div className="sv" style={{ fontSize: 15 }}>{current.name}</div>
          <div className="sl">tu rango</div>
        </div>
      </div>

      <div className="kids-profile-card">
        <div className="row">
          <span className="k">Cuenta</span>
          <span className="v" style={{ fontSize: 12.5, color: kid.is_real ? 'var(--green-700)' : '#7A5800', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {kid.is_real ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Perfil real
              </>
            ) : 'Modo demo (sin login)'}
          </span>
        </div>
        <div className="actions">
          <button className="kids-btn-secondary" onClick={onChangeAge}>Cambiar nivel de edad</button>
          <button className="kids-btn-danger" onClick={onExit}>Salir del modo Habi</button>
        </div>
      </div>

      <div className="kids-family">
        <b>Modo familia</b>: tu adulto puede ver lo que practicaste desde su cuenta.{' '}
        <Link to="/app">
          Ir a modo familia
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
      </div>
    </KidsLayout>
  )
}

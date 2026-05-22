/**
 * Pages secundarias del modulo Kids: Topicos / Coleccion / Aventuras / Perfil.
 *
 * Comparten KidsLayout (sidebar + tabbar). Foco en plomeria - estetica usa
 * mismos tokens del KIDS_CSS shared.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KidsLayout } from './_shared'
import { useKid, KIDS_TOKEN_KEY } from './KidsContext'
import { KIDS_AGE_KEY } from './KidsAgeSelect'

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
.kids-page-header { padding:18px 0 24px; }
.kids-page-header h1 { font-family:'Sora',sans-serif; font-weight:800; font-size:32px; letter-spacing:-0.025em; margin:0 0 6px; color:#0D1412; }
.kids-page-header h1 em { font-style:normal; color:#008F63; background:linear-gradient(180deg,transparent 64%,rgba(0,179,126,.22) 64% 96%,transparent 96%); padding:0 4px; }
.kids-page-header p { font-size:15px; color:#3A4441; margin:0; max-width:540px; }

.kids-pg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }
.kids-pg-card { position:relative; border-radius:22px; padding:18px; min-height:150px; cursor:pointer; color:#fff; border:0; text-align:left; display:flex; flex-direction:column; justify-content:space-between; transition:transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s; overflow:hidden; }
.kids-pg-card:hover { transform:translateY(-3px) rotate(-.4deg); box-shadow:0 12px 30px rgba(13,20,18,.10); }
.kids-pg-card .pg-name { font-family:'Sora',sans-serif; font-weight:800; font-size:17px; letter-spacing:-0.015em; line-height:1.15; }
.kids-pg-card .pg-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:8px; }
.kids-pg-card .pg-tags span { font-size:10.5px; padding:2px 8px; border-radius:99px; background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.14); font-weight:600; }
.kids-pg-card .pg-hot { position:absolute; top:-8px; left:14px; background:#FFB800; color:#3A2A00; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:3px 9px; border-radius:99px; box-shadow:0 4px 10px rgba(255,184,0,.4); }

.kids-coll-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:14px; }
.kids-coll-card { background:#fff; border:1px solid rgba(13,20,18,.06); border-radius:18px; padding:14px; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; transition:transform .15s; cursor:default; }
.kids-coll-card.awarded:hover { transform:scale(1.05) rotate(-2deg); }
.kids-coll-card.locked { background:repeating-linear-gradient(135deg,#F2EAD9,#F2EAD9 6px,#E8DFCA 6px 12px); opacity:.55; }
.kids-coll-card .ic { width:50px; height:50px; border-radius:14px; display:grid; place-items:center; color:#fff; }
.kids-coll-card.locked .ic { background:#E8DFCA; color:#98A19D; }
.kids-coll-card .nm { font-family:'Sora',sans-serif; font-weight:700; font-size:13px; color:#0D1412; }
.kids-coll-card .ds { font-size:11px; color:#6B7672; line-height:1.3; }
.kids-coll-card.locked .nm, .kids-coll-card.locked .ds { color:#98A19D; }

.kids-adv-list { display:flex; flex-direction:column; gap:10px; }
.kids-adv-item { display:grid; grid-template-columns:auto 1fr auto; gap:14px; align-items:center; background:#fff; border:1px solid rgba(13,20,18,.06); border-radius:16px; padding:14px 18px; }
.kids-adv-item .av { width:42px; height:42px; border-radius:12px; display:grid; place-items:center; color:#fff; font-family:'Sora',sans-serif; font-weight:800; }
.kids-adv-item .tx h4 { margin:0; font-family:'Sora',sans-serif; font-weight:700; font-size:15px; color:#0D1412; }
.kids-adv-item .tx p { margin:2px 0 0; font-size:12px; color:#6B7672; }
.kids-adv-item .met { font-size:12px; color:#7A5800; background:#FFF7DD; padding:5px 10px; border-radius:99px; font-weight:800; display:inline-flex; align-items:center; gap:4px; }

.kids-profile-card { background:#fff; border:1px solid rgba(13,20,18,.06); border-radius:22px; padding:24px; display:flex; flex-direction:column; gap:16px; max-width:520px; }
.kids-profile-card .row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px dashed rgba(13,20,18,.10); }
.kids-profile-card .row:last-child { border-bottom:0; }
.kids-profile-card .row .k { font-size:13px; color:#6B7672; }
.kids-profile-card .row .v { font-family:'Sora',sans-serif; font-weight:700; font-size:15px; color:#0D1412; }
.kids-profile-card .actions { display:flex; gap:10px; margin-top:8px; }
.kids-btn-secondary { padding:10px 16px; border-radius:14px; background:#FFF7DD; color:#7A5800; border:1px solid rgba(255,184,0,.35); font-weight:800; font-size:13.5px; cursor:pointer; transition:all .15s; }
.kids-btn-secondary:hover { background:#FFE9A6; transform:translateY(-1px); }
.kids-btn-danger { padding:10px 16px; border-radius:14px; background:#FCE8E9; color:#B42127; border:1px solid rgba(180,33,39,.20); font-weight:800; font-size:13.5px; cursor:pointer; }
.kids-btn-danger:hover { background:#F8D7D9; }

.kids-empty { text-align:center; padding:48px 24px; color:#6B7672; }
.kids-empty h3 { font-family:'Sora',sans-serif; font-weight:800; font-size:20px; color:#0D1412; margin:0 0 6px; }
`

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
  const { kid } = useKid()
  const [topics, setTopics] = useState<KidsTopic[]>([])

  useEffect(() => {
    fetch(`/api/kids/topics?age_group=${kid.age_group}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setTopics)
      .catch(() => setTopics([]))
  }, [kid.age_group])

  return (
    <KidsLayout>
      <style>{PAGE_CSS}</style>
      <div className="kids-page-header">
        <h1>¿De qué <em>charlamos</em>?</h1>
        <p>Todos los temas que Habi conoce para vos. Tocá uno y arrancamos.</p>
      </div>

      <div className="kids-pg-grid">
        {topics.map((t, i) => (
          <button
            key={t.id}
            className="kids-pg-card"
            style={{ background: TOPIC_COLORS[i % TOPIC_COLORS.length] }}
            onClick={() => alert(`Próximamente: arrancar charla sobre ${t.title}`)}
          >
            {t.is_hot && <span className="pg-hot">★ popular</span>}
            <div className="pg-name">{t.title}</div>
            <div className="pg-tags">
              {(t.keywords || []).slice(0, 4).map((k) => <span key={k}>{k}</span>)}
            </div>
          </button>
        ))}
      </div>

      {topics.length === 0 && (
        <div className="kids-empty">
          <h3>Cargando temas...</h3>
          <p>Si esto tarda, refrescá la página.</p>
        </div>
      )}
    </KidsLayout>
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
  const { kid } = useKid()
  const [items, setItems] = useState<Achievement[]>([])

  useEffect(() => {
    const token = localStorage.getItem(KIDS_TOKEN_KEY)
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    fetch('/api/kids/achievements', { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  const awarded = items.filter((a) => a.awarded).length

  return (
    <KidsLayout>
      <style>{PAGE_CSS}</style>
      <div className="kids-page-header">
        <h1>Mi <em>colección</em></h1>
        <p>Cada vez que aprendes algo nuevo, sumás un logro. Llevás {awarded} de {items.length}.</p>
      </div>

      <div className="kids-coll-grid">
        {items.map((a) => (
          <div key={a.slug} className={`kids-coll-card ${a.awarded ? 'awarded' : 'locked'}`} title={a.description}>
            <div className="ic" style={a.awarded ? { background: a.icon_color } : undefined}>
              <AchievementIcon name={a.icon_name} color="#fff" />
            </div>
            <div className="nm">{a.name}</div>
            <div className="ds">{a.description}</div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="kids-empty">
          <h3>Aún no hay logros</h3>
          <p>Cargá una sesión kid para empezar a coleccionar.</p>
        </div>
      )}
    </KidsLayout>
  )
}

// ─────────────────────────────────────────────────────────────
// /kids/aventuras -- historial de sesiones (mock por ahora)
// ─────────────────────────────────────────────────────────────
const MOCK_ADVENTURES = [
  { date: 'Hoy', topic: 'Dinosaurios', minutes: 5, coins: 18, color: '#00B37E' },
  { date: 'Ayer', topic: 'Mar y animales', minutes: 6, coins: 22, color: '#06B6D4' },
  { date: 'Lunes', topic: 'Cocina', minutes: 4, coins: 15, color: '#FB7C39' },
  { date: 'Domingo', topic: 'Mi familia', minutes: 7, coins: 25, color: '#EC4899' },
  { date: 'Sábado', topic: 'Música', minutes: 5, coins: 17, color: '#3B82F6' },
]

export function KidsAdventures() {
  const { kid } = useKid()
  // En el futuro: fetch real a /api/kids/sessions

  return (
    <KidsLayout>
      <style>{PAGE_CSS}</style>
      <div className="kids-page-header">
        <h1>Mis <em>aventuras</em></h1>
        <p>Acá quedan todas tus charlas con Habi. Mirá cuánto creciste.</p>
      </div>

      <div className="kids-adv-list">
        {MOCK_ADVENTURES.map((a, i) => (
          <div key={i} className="kids-adv-item">
            <div className="av" style={{ background: a.color }}>{a.topic.charAt(0)}</div>
            <div className="tx">
              <h4>{a.topic}</h4>
              <p>{a.date} · {a.minutes} minutos hablando con Habi</p>
            </div>
            <span className="met">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>
              +{a.coins}
            </span>
          </div>
        ))}
      </div>

      <div className="kids-empty" style={{ marginTop: 24, padding: 32 }}>
        <p style={{ fontSize: 13 }}>
          {kid.is_real ? 'Próximamente acá vas a ver tus sesiones reales.' : 'Datos de ejemplo. Cuando completes una charla real, aparecerá acá.'}
        </p>
      </div>
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
        <h1>Mi <em>perfil</em></h1>
        <p>Tus datos y configuración. Si querés cambiar algo grande, pedile a tu mamá o papá.</p>
      </div>

      <div className="kids-profile-card">
        <div className="row">
          <span className="k">Nombre</span>
          <span className="v">{kid.name}</span>
        </div>
        <div className="row">
          <span className="k">Nivel de edad</span>
          <span className="v">{AGE_LABEL[kid.age_group] ?? kid.age_group}</span>
        </div>
        <div className="row">
          <span className="k">Rango</span>
          <span className="v" style={{ textTransform: 'capitalize' }}>{kid.rank_slug}</span>
        </div>
        <div className="row">
          <span className="k">Monedas habi</span>
          <span className="v">{kid.coins}</span>
        </div>
        <div className="row">
          <span className="k">Charlas completadas</span>
          <span className="v">{kid.charlas_count}</span>
        </div>
        <div className="row">
          <span className="k">Cuenta</span>
          <span className="v" style={{ fontSize: 12, color: kid.is_real ? '#008F63' : '#7A5800' }}>
            {kid.is_real ? '✓ Perfil real (creado por tu adulto)' : 'Modo demo (sin login)'}
          </span>
        </div>

        <div className="actions">
          <button className="kids-btn-secondary" onClick={onChangeAge}>
            Cambiar nivel de edad
          </button>
          <button className="kids-btn-danger" onClick={onExit}>
            Salir del modo Habi
          </button>
        </div>
      </div>

      <div style={{ marginTop: 32, maxWidth: 520, fontSize: 12, color: '#6B7672', lineHeight: 1.5 }}>
        <b>Modo familia</b>: tu adulto puede ver lo que practicaste hoy desde su cuenta principal. <Link to="/app" style={{ color: '#008F63', fontWeight: 700 }}>Ir a modo familia →</Link>
      </div>
    </KidsLayout>
  )
}

/**
 * Shell del modulo Kids.
 *
 * Porteo directo del diseño Kids.html del bundle de Claude Design.
 * Sidebar oscura + main cremoso + drawer mobile + tab bar.
 * Mascota Habi en SVG inline.
 *
 * NO usar emojis Unicode aquí - solo iconos SVG.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useKid, KIDS_RANKS, KIDS_TOKEN_KEY } from './KidsContext'

export const KIDS_CSS = `
.kids-root {
  --green:#00B37E;
  --green-700:#008F63;
  --green-900:#054A3A;
  --amber:#FFB800;
  --amber-bg:#FFF7DD;
  --kid-pink:#FF6AA9;
  --kid-blue:#3B82F6;
  --kid-cyan:#06B6D4;
  --kid-violet:#A855F7;
  --kid-orange:#FB7C39;
  --kid-yellow:#FACC15;
  --bg-1:#FFFCF6;
  --bg-2:#FAF4E8;
  --bg-3:#F2EAD9;
  --surface:#FFFFFF;
  --border-1:rgba(13,20,18,.06);
  --border-2:rgba(13,20,18,.10);
  --fg-1:#0D1412;
  --fg-2:#3A4441;
  --fg-3:#6B7672;
  --fg-4:#98A19D;
  --font-sans:'Inter',ui-sans-serif,system-ui,sans-serif;
  --font-display:'Sora',var(--font-sans);
  --shadow-soft:0 1px 2px rgba(13,20,18,.04), 0 4px 12px rgba(13,20,18,.05);
  --shadow-pop:0 10px 30px rgba(13,20,18,.10), 0 4px 12px rgba(13,20,18,.06);
  --r-card:22px;
  --r-card-lg:28px;
  --r-btn:18px;
  --r-pill:999px;
  --ease:cubic-bezier(0.2,0.8,0.2,1);

  background:var(--bg-1);
  color:var(--fg-1);
  font-family:var(--font-sans);
  font-size:15px;
  line-height:1.5;
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
}
.kids-root * { box-sizing:border-box; }
.kids-root button { font-family:inherit; cursor:pointer; border:0; background:none; color:inherit; }
.kids-root a { color:inherit; text-decoration:none; }

.kids-app { display:grid; grid-template-columns:256px 1fr; min-height:100vh; }

.kids-sidebar { background:#062B25; color:#E6EAE7; display:flex; flex-direction:column; padding:20px 14px; gap:8px; position:sticky; top:0; height:100vh; overflow:hidden; }
.kids-sidebar::before { content:""; position:absolute; right:-60px; top:30%; width:240px; height:240px; border-radius:50%; background:radial-gradient(circle,rgba(255,184,0,.10),transparent 70%); pointer-events:none; }
.kids-brand { display:flex; align-items:center; gap:10px; padding:6px 8px 14px; position:relative; z-index:1; }
.kids-brand-mark { width:32px; height:32px; border-radius:10px; background:var(--green); display:grid; place-items:center; color:#fff; font-family:var(--font-display); font-weight:800; font-size:17px; }
.kids-brand-name { font-family:var(--font-display); font-weight:700; letter-spacing:-0.01em; font-size:18px; color:#fff; }
.kids-brand-tag { font-size:9.5px; background:var(--amber); color:#3A2A00; padding:2px 7px; border-radius:6px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; margin-left:4px; }

.kids-side-habi { display:flex; align-items:center; gap:12px; padding:10px; border-radius:16px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06); margin:0 4px; position:relative; z-index:1; }
.kids-side-habi .habi-mini { width:42px; height:42px; flex-shrink:0; }
.kids-side-habi .ht { flex:1; min-width:0; }
.kids-side-habi .ht .nm { font-family:var(--font-display); font-weight:700; font-size:14px; color:#fff; line-height:1.1; }
.kids-side-habi .ht .ds { font-size:11.5px; color:#9DA8A4; margin-top:2px; }

.kids-nav { display:flex; flex-direction:column; gap:3px; margin-top:8px; position:relative; z-index:1; }
.kids-nav a { display:flex; align-items:center; gap:11px; padding:11px 12px; border-radius:14px; color:#B7BFBB; font-weight:600; font-size:14px; transition:all .15s var(--ease); }
.kids-nav a:hover { color:#fff; background:rgba(255,255,255,.04); }
.kids-nav a.active { background:rgba(0,179,126,.18); color:#fff; }
.kids-nav a.active svg { color:#5EE0B0; }
.kids-nav svg { width:20px; height:20px; color:#7A8480; }
.kids-nav .badge { margin-left:auto; font-size:10.5px; padding:2px 8px; border-radius:99px; font-weight:800; letter-spacing:.04em; }
.kids-nav .badge.gold { background:var(--amber); color:#3A2A00; }
.kids-nav .badge.pink { background:var(--kid-pink); color:#fff; }
.kids-nav .badge.dot { background:transparent; color:var(--green); padding:0; }
.kids-nav .badge.dot::before { content:""; display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 0 4px rgba(0,179,126,.18); }

.kids-side-section { margin-top:18px; padding:0 12px; position:relative; z-index:1; }
.kids-side-section .lbl { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#6B7672; font-weight:700; margin-bottom:10px; }
.kids-lvl-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.kids-lvl-row .ll { font-family:var(--font-display); font-weight:700; font-size:13px; background:rgba(0,179,126,.2); padding:3px 9px; border-radius:99px; color:#7CE7BD; }
.kids-lvl-row .pct { font-family:var(--font-display); font-weight:700; font-size:13px; color:#fff; }
.kids-lvl-bar { height:8px; border-radius:99px; background:rgba(255,255,255,.06); overflow:hidden; }
.kids-lvl-bar i { display:block; height:100%; background:linear-gradient(90deg,var(--green),#5EE0B0); border-radius:99px; position:relative; }
.kids-lvl-bar i::after { content:""; position:absolute; right:-2px; top:50%; width:14px; height:14px; border-radius:50%; background:var(--amber); transform:translateY(-50%); box-shadow:0 0 0 3px #062B25; }
.kids-lvl-hint { margin-top:8px; font-size:11.5px; color:#7CE7BD; }

.kids-coins { display:flex; align-items:center; gap:8px; padding:10px 12px; background:linear-gradient(135deg,rgba(255,184,0,.16),rgba(255,184,0,.06)); border:1px solid rgba(255,184,0,.18); border-radius:14px; margin:14px 4px 0; position:relative; z-index:1; }
.kids-coins .ci { width:30px; height:30px; border-radius:50%; background:var(--amber); display:grid; place-items:center; flex-shrink:0; box-shadow:inset 0 -3px 0 #C58F00; color:#3A2A00; }
.kids-coins .ct { flex:1; }
.kids-coins .cn { font-family:var(--font-display); font-weight:800; font-size:18px; color:#fff; line-height:1; font-feature-settings:"tnum"; }
.kids-coins .cl { font-size:11px; color:#FFE9A6; margin-top:2px; font-weight:500; }

.kids-parental-link { margin-top:auto; display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:14px; color:#9DA8A4; font-size:12.5px; position:relative; z-index:1; transition:background .15s var(--ease); }
.kids-parental-link:hover { background:rgba(255,255,255,.06); color:#fff; }
.kids-parental-link svg { width:18px; height:18px; flex-shrink:0; color:#7A8480; }
.kids-parental-link .pt { flex:1; }
.kids-parental-link .pt b { display:block; color:#fff; font-weight:600; font-size:13px; margin-bottom:1px; }

.kids-main { padding:0 32px 56px; max-width:1440px; min-width:0; }
.kids-topbar { display:flex; align-items:center; justify-content:space-between; padding:18px 0 6px; position:sticky; top:0; background:var(--bg-1); z-index:10; }
.kids-crumbs { font-family:var(--font-display); font-weight:700; font-size:20px; letter-spacing:-0.01em; }
.kids-crumbs .day { color:var(--fg-4); font-weight:500; font-size:15px; margin-left:6px; }
.kids-topbar .actions { display:flex; align-items:center; gap:10px; }
.kids-icon-btn { width:42px; height:42px; border-radius:14px; background:var(--surface); border:1px solid var(--border-2); display:grid; place-items:center; color:var(--fg-2); transition:all .15s var(--ease); position:relative; }
.kids-icon-btn:hover { background:var(--bg-2); transform:translateY(-1px); }
.kids-icon-btn .dot { position:absolute; top:9px; right:9px; width:8px; height:8px; border-radius:50%; background:var(--kid-pink); box-shadow:0 0 0 2px var(--surface); }
.kids-avatar { width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg,#FF6AA9,#A855F7); color:#fff; font-family:var(--font-display); font-weight:800; font-size:16px; display:grid; place-items:center; cursor:pointer; border:2px solid var(--surface); box-shadow:0 0 0 2px var(--border-2); }

/* mobile */
.kids-m-topbar, .kids-m-tabbar, .kids-m-drawer, .kids-m-drawer-backdrop { display:none; }

@media (max-width:900px) {
  .kids-root { padding-bottom:calc(96px + env(safe-area-inset-bottom)); }
  .kids-app { display:block; }
  .kids-sidebar { display:none; }
  .kids-main { padding:0 16px 24px; max-width:100%; }
  .kids-topbar { display:none; }

  .kids-m-topbar { display:flex; align-items:center; gap:8px; padding:max(env(safe-area-inset-top),12px) 14px 12px; position:sticky; top:0; z-index:30; background:var(--bg-1); border-bottom:1px solid var(--border-1); }
  .kids-m-menu { width:38px; height:38px; border-radius:12px; display:grid; place-items:center; color:var(--fg-1); background:transparent; flex-shrink:0; padding:0; border:0; cursor:pointer; }
  .kids-m-menu:active { background:var(--bg-2); }
  .kids-m-title { font-family:var(--font-display); font-weight:800; font-size:15px; letter-spacing:-0.01em; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .kids-m-coins { display:inline-flex; align-items:center; gap:4px; height:32px; padding:0 10px; background:#fff; border:1px solid var(--border-2); border-radius:99px; font-weight:800; font-size:12.5px; color:var(--fg-1); font-family:var(--font-display); flex-shrink:0; }
  .kids-m-coins .ci { width:16px; height:16px; border-radius:50%; background:var(--amber); display:grid; place-items:center; color:#3A2A00; flex-shrink:0; box-shadow:inset 0 -2px 0 #C58F00; }
  .kids-m-av { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#FF6AA9,#A855F7); color:#fff; font-family:var(--font-display); font-weight:800; font-size:14px; display:grid; place-items:center; flex-shrink:0; }

  .kids-m-drawer-backdrop { display:none; position:fixed; inset:0; z-index:50; background:rgba(13,20,18,.5); opacity:0; transition:opacity .24s var(--ease); }
  .kids-m-drawer { display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:60; width:84%; max-width:320px; background:#062B25; color:#E6EAE7; padding:18px 14px calc(14px + env(safe-area-inset-bottom)); transform:translateX(-100%); transition:transform .28s var(--ease); overflow-y:auto; }
  body.kids-drawer-open .kids-m-drawer-backdrop { display:block; opacity:1; }
  body.kids-drawer-open .kids-m-drawer { transform:translateX(0); }

  .kids-m-tabbar { display:grid; grid-template-columns:1fr 1fr 86px 1fr 1fr; align-items:center; position:fixed; left:0; right:0; bottom:0; z-index:40; background:rgba(255,252,246,.96); border-top:1px solid var(--border-1); backdrop-filter:blur(20px); padding:6px 6px calc(8px + env(safe-area-inset-bottom)); }
  .kids-m-tabbar a { display:flex; flex-direction:column; align-items:center; gap:2px; padding:6px 4px; color:var(--fg-4); font-size:10.5px; font-weight:700; }
  .kids-m-tabbar a svg { width:22px; height:22px; stroke-width:2; }
  .kids-m-tabbar a.active { color:var(--green-700); }
  .kids-m-tabbar a.active svg { color:var(--green); }
  .kids-m-fab-wrap { display:flex; justify-content:center; align-items:center; height:100%; position:relative; }
  /* FAB micro: grande, sobresalido como menus modernos (FAB Material style).
     Lleva al chico DIRECTO a una clase random pendiente. */
  .kids-m-fab { width:72px; height:72px; border-radius:50%; background:linear-gradient(180deg,#FFC833,#F09D00); color:#3A2A00; display:grid; place-items:center; box-shadow:0 12px 28px rgba(240,157,0,.45), 0 4px 10px rgba(13,20,18,.18), 0 0 0 5px rgba(255,252,246,.96); transform:translateY(-26px); transition:transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s; border:0; padding:0; cursor:pointer; font-family:inherit; }
  .kids-m-fab:hover { transform:translateY(-30px); box-shadow:0 16px 32px rgba(240,157,0,.55), 0 4px 10px rgba(13,20,18,.18), 0 0 0 5px rgba(255,252,246,.96); }
  .kids-m-fab:active { transform:translateY(-26px) scale(.92); }
  .kids-m-fab:disabled { opacity:.65; cursor:wait; transform:translateY(-26px); }
  .kids-m-fab svg { width:30px; height:30px; stroke-width:2.2; }
  .kids-m-fab .spin { width:24px; height:24px; border-radius:50%; border:3px solid #3A2A00; border-right-color:transparent; animation:kids-fab-spin .7s linear infinite; }
  @keyframes kids-fab-spin { to { transform:rotate(360deg); } }
}
`

export function ensureKidsFonts() {
  if (typeof document === 'undefined') return
  if (document.getElementById('kids-google-fonts')) return
  const link = document.createElement('link')
  link.id = 'kids-google-fonts'
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800;900&display=swap'
  document.head.appendChild(link)
}

// ──────────────────────────────────────────────────────────────
// MASCOTA HABI (porteo del SVG inline del Kids.html)
// ──────────────────────────────────────────────────────────────
interface HabiProps {
  size?: number
  variant?: 'big' | 'mini'
  className?: string
  bounce?: boolean
}

export function Habi({ size = 240, variant = 'big', className, bounce = false }: HabiProps) {
  if (variant === 'mini') {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={bounce ? { animation: 'habi-bounce 4s ease-in-out infinite' } : undefined}
      >
        <defs>
          <radialGradient id="habi-mini-g" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#5EE0B0" />
            <stop offset="100%" stopColor="#00B37E" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="50" cy="58" rx="32" ry="34" fill="#00B37E" />
        <ellipse cx="50" cy="58" rx="32" ry="34" fill="url(#habi-mini-g)" />
        <line x1="50" y1="22" x2="50" y2="14" stroke="#054A3A" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="50" cy="12" r="4" fill="#FFB800" />
        <ellipse cx="40" cy="52" rx="5.5" ry="6.5" fill="#fff" />
        <ellipse cx="60" cy="52" rx="5.5" ry="6.5" fill="#fff" />
        <circle cx="41" cy="53" r="3" fill="#0D1412" />
        <circle cx="61" cy="53" r="3" fill="#0D1412" />
        <circle cx="42" cy="51.5" r="1" fill="#fff" />
        <circle cx="62" cy="51.5" r="1" fill="#fff" />
        <path d="M44 67 Q 50 73 56 67" stroke="#054A3A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="32" cy="64" r="3" fill="#FF6AA9" opacity=".5" />
        <circle cx="68" cy="64" r="3" fill="#FF6AA9" opacity=".5" />
      </svg>
    )
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 240 240"
      aria-label="Habi, el amigo de habláh"
      style={bounce ? { animation: 'habi-bounce 2.6s ease-in-out infinite' } : undefined}
    >
      <ellipse cx="120" cy="218" rx="70" ry="8" fill="rgba(0,0,0,.25)" />
      <ellipse cx="120" cy="138" rx="78" ry="82" fill="#00B37E" />
      <ellipse cx="100" cy="115" rx="34" ry="28" fill="#5EE0B0" opacity=".6" />
      <path d="M120 56 Q 122 38 118 26" stroke="#054A3A" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="118" cy="22" r="9" fill="#FFB800" />
      <circle cx="115" cy="19" r="3" fill="#FFE9A6" />
      <ellipse cx="46" cy="148" rx="14" ry="22" fill="#00B37E" transform="rotate(-22 46 148)" />
      <ellipse cx="194" cy="148" rx="14" ry="22" fill="#00B37E" transform="rotate(22 194 148)" />
      <ellipse cx="98" cy="128" rx="15" ry="18" fill="#fff" />
      <ellipse cx="142" cy="128" rx="15" ry="18" fill="#fff" />
      <circle cx="100" cy="131" r="8" fill="#0D1412" />
      <circle cx="144" cy="131" r="8" fill="#0D1412" />
      <circle cx="103" cy="128" r="3" fill="#fff" />
      <circle cx="147" cy="128" r="3" fill="#fff" />
      <circle cx="72" cy="160" r="9" fill="#FF6AA9" opacity=".55" />
      <circle cx="168" cy="160" r="9" fill="#FF6AA9" opacity=".55" />
      <path d="M100 168 Q 120 192 140 168 Q 140 188 120 188 Q 100 188 100 168 Z" fill="#054A3A" />
      <ellipse cx="120" cy="184" rx="9" ry="5" fill="#FF6AA9" />
      <ellipse cx="92" cy="218" rx="18" ry="9" fill="#054A3A" />
      <ellipse cx="148" cy="218" rx="18" ry="9" fill="#054A3A" />
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────
// Nav items configurables
// ──────────────────────────────────────────────────────────────
export interface KidsNavItem {
  to: string
  label: string
  icon: ReactNode
  badge?: { text: string; type: 'gold' | 'pink' | 'dot' }
}

export const KIDS_NAV: KidsNavItem[] = [
  {
    to: '/kids',
    label: 'Hoy',
    badge: { text: '', type: 'dot' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12 12 3l9 9" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    to: '/kids/topicos',
    label: '¡A hablar!',
    badge: { text: 'DIARIO', type: 'gold' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
      </svg>
    ),
  },
  {
    to: '/kids/coleccion',
    label: 'Mi colección',
    badge: { text: '12', type: 'pink' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
      </svg>
    ),
  },
  {
    to: '/kids/aventuras',
    label: 'Mis aventuras',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
        <path d="M9 4v16M15 6v16" />
      </svg>
    ),
  },
  {
    to: '/kids/perfil',
    label: 'Mi perfil',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
]

// ──────────────────────────────────────────────────────────────
// Datos del kid actual (preview / fallback). El contexto real
// vive en KidsContext.tsx. KidsState es el shape que esperan los
// componentes de UI.
// ──────────────────────────────────────────────────────────────
export interface KidsState {
  name: string
  coins: number
  rank_slug: string
  rank_label: string
  progress_pct: number
  next_rank_label: string
  charlas_to_next: number
}

// Solo para usar en pantallas preview que NO usan KidsContext
export const MOCK_KID: KidsState = {
  name: 'Explorador',
  coins: 248,
  rank_slug: 'explorador',
  rank_label: 'Explorador',
  progress_pct: 34,
  next_rank_label: 'Aventurero',
  charlas_to_next: 6,
}

// ──────────────────────────────────────────────────────────────
// Sidebar y Drawer (componentes)
// ──────────────────────────────────────────────────────────────
export function KidsSidebar({ kid }: { kid: KidsState }) {
  const { pathname } = useLocation()
  return (
    <aside className="kids-sidebar">
      <div className="kids-brand">
        <div className="kids-brand-mark">h</div>
        <div className="kids-brand-name">habláh</div>
        <span className="kids-brand-tag">kids</span>
      </div>

      <div className="kids-side-habi">
        <Habi variant="mini" size={42} className="habi-mini" />
        <div className="ht">
          <div className="nm">¡Hola {kid.name}!</div>
          <div className="ds">soy Habi, tu amigo</div>
        </div>
      </div>

      <nav className="kids-nav">
        {KIDS_NAV.map((it) => (
          <Link key={it.to} to={it.to} className={pathname === it.to ? 'active' : ''}>
            {it.icon}
            {it.label}
            {it.badge && (
              <span className={`badge ${it.badge.type}`}>{it.badge.text}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="kids-side-section">
        <div className="lbl">Mi progreso</div>
        <div className="kids-lvl-row">
          <span className="ll">{kid.rank_label}</span>
          <span className="pct">{kid.progress_pct}%</span>
        </div>
        <div className="kids-lvl-bar"><i style={{ width: `${kid.progress_pct}%` }} /></div>
        <div className="kids-lvl-hint">¡faltan {kid.charlas_to_next} charlas para {kid.next_rank_label}!</div>
      </div>

      <div className="kids-coins">
        <div className="ci">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
          </svg>
        </div>
        <div className="ct">
          <div className="cn">{kid.coins}</div>
          <div className="cl">monedas habi</div>
        </div>
      </div>

      <button
        type="button"
        className="kids-parental-link"
        onClick={() => {
          const ok = window.confirm('¿Sos vos, mamá o papá? Esto sale del modo Habi y vuelve a tu cuenta. ¿Continuar?')
          if (!ok) return
          // Limpiamos el kids_token pero MANTENEMOS el del padre
          localStorage.removeItem('kids_token')
          localStorage.removeItem('kids_age_group')
          window.location.href = '/app/kids'
        }}
        style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
        <div className="pt"><b>Para mamá o papá</b>Salir del modo Habi</div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </aside>
  )
}

export function KidsMobileTopbar({ kid }: { kid: KidsState }) {
  return (
    <header className="kids-m-topbar">
      <button className="kids-m-menu" aria-label="Abrir menú" onClick={() => document.body.classList.add('kids-drawer-open')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="kids-m-title">¡Hola, {kid.name}!</div>
      <div className="kids-m-coins" aria-label={`${kid.coins} monedas`}>
        <span className="ci">
          <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>
        </span>
        <span>{kid.coins}</span>
      </div>
      <Link to="/kids/perfil" className="kids-m-av" aria-label="Perfil">{kid.name.charAt(0)}</Link>
    </header>
  )
}

export function KidsMobileTabbar() {
  const { pathname } = useLocation()
  const isActive = (to: string) => pathname === to
  return (
    <nav className="kids-m-tabbar" aria-label="Navegación">
      <Link to="/kids" className={isActive('/kids') ? 'active' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12 12 3l9 9" /><path d="M5 10v10h14V10" /></svg>
        Hoy
      </Link>
      <Link to="/kids/coleccion" className={isActive('/kids/coleccion') ? 'active' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>
        Colección
      </Link>
      <div className="kids-m-fab-wrap">
        <KidsMicFab />
      </div>
      <Link to="/kids/aventuras" className={isActive('/kids/aventuras') ? 'active' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /></svg>
        Aventuras
      </Link>
      <Link to="/kids/perfil" className={isActive('/kids/perfil') ? 'active' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
        Perfil
      </Link>
    </nav>
  )
}

/**
 * Boton FAB del microfono. Tap -> backend devuelve un topico random de los
 * que el chico TODAVIA NO completo -> navega directo a la sesion.
 *
 * Si todos estan completos, igual devuelve uno (para que pueda repetir) y
 * avisa al chico con un toast.
 */
function KidsMicFab() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleClick = async (): Promise<void> => {
    if (loading) return
    setLoading(true)
    try {
      const tok = localStorage.getItem(KIDS_TOKEN_KEY)
      if (!tok) {
        toast.error('Entrá con tu perfil primero')
        return
      }
      const res = await fetch('/api/kids/topics/next-random', {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error('No pude buscar un tema')
      const data: { id: number; title: string; all_completed?: boolean } = await res.json()
      if (data.all_completed) {
        toast.success('¡Ya hiciste todos! Repetí este de nuevo')
      }
      nav(`/kids/sesion/${data.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de red'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="kids-m-fab"
      onClick={handleClick}
      disabled={loading}
      aria-label="¡A hablar!"
    >
      {loading ? (
        <span className="spin" aria-hidden />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3M8 21h8" />
        </svg>
      )}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────
// Adapter: convierte KidProfile (context) -> KidsState (UI shape)
// ──────────────────────────────────────────────────────────────
function profileToState(profile: { name: string; coins: number; rank_slug: string; charlas_count: number }): KidsState {
  const rankIdx = KIDS_RANKS.findIndex((r) => r.slug === profile.rank_slug)
  const current = KIDS_RANKS[rankIdx] ?? KIDS_RANKS[0]
  const next = KIDS_RANKS[rankIdx + 1]

  let progress_pct = 100
  let charlas_to_next = 0
  if (next) {
    const span = next.minCharlas - current.minCharlas
    const done = Math.max(0, profile.charlas_count - current.minCharlas)
    progress_pct = Math.min(100, Math.round((done / span) * 100))
    charlas_to_next = Math.max(0, next.minCharlas - profile.charlas_count)
  }

  return {
    name: profile.name,
    coins: profile.coins,
    rank_slug: profile.rank_slug,
    rank_label: current.name,
    progress_pct,
    next_rank_label: next?.name ?? '¡Máximo!',
    charlas_to_next,
  }
}

// ──────────────────────────────────────────────────────────────
// Layout
// ──────────────────────────────────────────────────────────────
export function KidsLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    ensureKidsFonts()
    return () => {
      document.body.classList.remove('kids-drawer-open')
    }
  }, [])

  // Scroll al top en cada cambio de URL
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  const { kid: profile } = useKid()
  const kid = profileToState(profile)

  return (
    <div className="kids-root">
      <style>{KIDS_CSS}
        {`
          @keyframes habi-bounce { 0%,100%{transform:translateY(0) rotate(-.5deg)} 50%{transform:translateY(-6px) rotate(1deg)} }
        `}
      </style>

      <KidsMobileTopbar kid={kid} />

      <div className="kids-app">
        <KidsSidebar kid={kid} />
        <main className="kids-main">{children}</main>
      </div>

      <KidsMobileTabbar />
    </div>
  )
}

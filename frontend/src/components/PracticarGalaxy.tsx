/**
 * PracticarGalaxy — pantalla de selección de tópico.
 *
 * Layout:
 *   - Fondo dark inmersivo con stars
 *   - Hero arriba: "¿De qué charlamos, {nombre}?"
 *   - Grid central de cards coloridas por categoría (3 col desktop / 2 mobile)
 *   - Panel lateral derecho "Sugeridos para vos" (otros temas del catálogo)
 *   - Footer: Sorpréndeme + Tema libre
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'

const STYLES = `
@keyframes pg-fade-in { 0%{opacity:0} 100%{opacity:1} }
@keyframes pg-star-twinkle { 0%,100%{opacity:.2} 50%{opacity:.9} }
@keyframes pg-hero-glow { 0%,100%{text-shadow: 0 0 20px rgba(0,179,126,.3)} 50%{text-shadow: 0 0 35px rgba(0,179,126,.55)} }
@keyframes pg-card-in { 0%{opacity:0;transform:translateY(16px) scale(.96)} 100%{opacity:1;transform:translateY(0) scale(1)} }
@keyframes pg-rec-in { 0%{opacity:0;transform:translateX(12px)} 100%{opacity:1;transform:translateX(0)} }

.pg-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 22px 20px;
  border-radius: 22px;
  border: 1.5px solid var(--pg-card-border);
  background: var(--pg-card-bg);
  color: white;
  text-align: left;
  cursor: pointer;
  min-height: 168px;
  overflow: hidden;
  transition: transform 280ms cubic-bezier(.2,.8,.2,1), box-shadow 280ms, border-color 280ms;
  animation: pg-card-in 540ms cubic-bezier(.2,.8,.2,1) backwards;
  isolation: isolate;
}
.pg-card::before {
  content: '';
  position: absolute;
  inset: -40% -40% auto auto;
  width: 180px; height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--pg-card-glow) 0%, transparent 70%);
  opacity: .55;
  z-index: -1;
  transition: opacity 320ms, transform 320ms;
}
.pg-card:hover {
  transform: translateY(-4px) scale(1.02);
  border-color: var(--pg-card-color);
  box-shadow: 0 12px 36px -8px var(--pg-card-glow), 0 0 0 1px var(--pg-card-color);
}
.pg-card:hover::before { opacity: .85; transform: scale(1.15); }
.pg-card:active { transform: translateY(-2px) scale(.98); transition: transform 120ms ease-out; }
.pg-card-icon-wrap {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
  background: var(--pg-card-icon-bg);
  color: var(--pg-card-color);
}
.pg-card-title {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -.01em;
  margin: 0;
}
.pg-card-cat {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--pg-card-color);
  opacity: .85;
  margin-top: 4px;
}

/* Estado "seleccionando": la card elegida crece, el resto se desvanece */
.pg-stage.is-selecting .pg-card:not(.is-selected) {
  opacity: 0;
  transform: scale(.9);
  filter: blur(2px);
  transition: opacity 600ms, transform 600ms, filter 600ms;
}
.pg-stage.is-selecting .pg-card.is-selected {
  transform: scale(1.18);
  box-shadow: 0 0 80px var(--pg-card-glow), 0 0 0 2px var(--pg-card-color);
  z-index: 50;
  transition: transform 800ms cubic-bezier(.22,1,.36,1), box-shadow 800ms;
}
.pg-stage.is-selecting .pg-hero,
.pg-stage.is-selecting .pg-footer,
.pg-stage.is-selecting .pg-sidepanel { opacity: 0; transition: opacity 500ms ease; pointer-events: none; }

/* ─── SIDE PANEL: "Sugeridos para vos" ─────────────────────────── */
.pg-sidepanel {
  position: absolute;
  right: 24px;
  top: 100px;
  bottom: 100px;
  width: 280px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(10,18,16,.78) 0%, rgba(5,10,9,.85) 100%);
  border: 1px solid rgba(0,179,126,.18);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  animation: pg-fade-in 700ms ease-out 200ms backwards;
  overflow: hidden;
}
.pg-sidepanel-title {
  font-size: 10px;
  letter-spacing: .22em;
  text-transform: uppercase;
  font-weight: 800;
  color: #9CFCD2;
  text-align: center;
  margin-bottom: 6px;
}
.pg-sidepanel-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1;
}
.pg-sidepanel-list::-webkit-scrollbar { width: 4px; }
.pg-sidepanel-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 999px; }
.pg-rec-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  color: white;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: transform 220ms cubic-bezier(.2,.8,.2,1), background 220ms, border-color 220ms;
  animation: pg-rec-in 500ms ease-out backwards;
}
.pg-rec-card:hover {
  transform: translateX(-4px);
  background: rgba(255,255,255,.09);
  border-color: rgba(0,179,126,.45);
}
.pg-rec-card:active { transform: translateX(-2px) scale(.97); }
.pg-rec-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px currentColor;
}
.pg-rec-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.pg-rec-title {
  font-size: 13px; font-weight: 700; line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pg-rec-cat {
  font-size: 10px; font-weight: 600; letter-spacing: .04em;
  color: rgba(255,255,255,.5); text-transform: capitalize;
}
.pg-rec-arrow {
  opacity: 0; color: #9CFCD2;
  transition: opacity 220ms, transform 220ms;
}
.pg-rec-card:hover .pg-rec-arrow { opacity: 1; transform: translateX(2px); }

/* ─── Grid responsive ──────────────────────────────────────────── */
.pg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
}
@media (max-width: 1100px) {
  .pg-sidepanel {
    position: absolute;
    right: 0; left: 0; top: auto;
    bottom: 100px;
    width: auto;
    height: auto;
    flex-direction: column;
    padding: 10px 14px;
    border-radius: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(5,10,9,.92) 70%);
    border: none;
    backdrop-filter: none;
  }
  .pg-sidepanel-title { text-align: left; padding-left: 4px; }
  .pg-sidepanel-list {
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 6px;
  }
  .pg-rec-card { flex-shrink: 0; width: 200px; }
  .pg-rec-card:hover { transform: scale(1.03); }
  .pg-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
}
@media (max-width: 480px) {
  .pg-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .pg-sidepanel { bottom: 110px; }
  .pg-rec-card { width: 180px; padding: 8px 10px; }
  .pg-rec-title { font-size: 12px; }
  .pg-card { padding: 16px 14px; min-height: 140px; border-radius: 18px; }
  .pg-card-title { font-size: 14px; }
  .pg-card-icon-wrap { width: 36px; height: 36px; }
}
`

interface InterestTopic {
  id: number
  title: string
  category: string
}

interface Props {
  userName: string
  interests: InterestTopic[]
  recommended?: InterestTopic[]
  onPick: (topicId: number) => void
  onSurprise: () => void
  onFreeTopic: (text: string) => void
}

// Paleta por categoría: color principal + glow + bg suave
const CATEGORY_THEME: Record<string, { color: string; glow: string; bg: string; border: string; iconBg: string }> = {
  musica:      { color: '#C026D3', glow: 'rgba(192,38,211,.35)', bg: 'linear-gradient(135deg, rgba(192,38,211,.18) 0%, rgba(192,38,211,.06) 100%)', border: 'rgba(192,38,211,.25)', iconBg: 'rgba(192,38,211,.18)' },
  peliculas:   { color: '#FF5E7E', glow: 'rgba(255,94,126,.35)', bg: 'linear-gradient(135deg, rgba(255,94,126,.18) 0%, rgba(255,94,126,.06) 100%)', border: 'rgba(255,94,126,.25)', iconBg: 'rgba(255,94,126,.18)' },
  deportes:    { color: '#22D67A', glow: 'rgba(34,214,122,.35)', bg: 'linear-gradient(135deg, rgba(34,214,122,.18) 0%, rgba(34,214,122,.06) 100%)', border: 'rgba(34,214,122,.25)', iconBg: 'rgba(34,214,122,.18)' },
  videojuegos: { color: '#7C5CFF', glow: 'rgba(124,92,255,.35)', bg: 'linear-gradient(135deg, rgba(124,92,255,.18) 0%, rgba(124,92,255,.06) 100%)', border: 'rgba(124,92,255,.25)', iconBg: 'rgba(124,92,255,.18)' },
  comida:      { color: '#FF8A4C', glow: 'rgba(255,138,76,.35)',  bg: 'linear-gradient(135deg, rgba(255,138,76,.18) 0%, rgba(255,138,76,.06) 100%)',  border: 'rgba(255,138,76,.25)', iconBg: 'rgba(255,138,76,.18)' },
  viajes:      { color: '#F59E0B', glow: 'rgba(245,158,11,.35)',  bg: 'linear-gradient(135deg, rgba(245,158,11,.18) 0%, rgba(245,158,11,.06) 100%)',  border: 'rgba(245,158,11,.25)', iconBg: 'rgba(245,158,11,.18)' },
  tech:        { color: '#22D3EE', glow: 'rgba(34,211,238,.35)',  bg: 'linear-gradient(135deg, rgba(34,211,238,.18) 0%, rgba(34,211,238,.06) 100%)',  border: 'rgba(34,211,238,.25)', iconBg: 'rgba(34,211,238,.18)' },
  ciencia:     { color: '#3B82F6', glow: 'rgba(59,130,246,.35)',  bg: 'linear-gradient(135deg, rgba(59,130,246,.18) 0%, rgba(59,130,246,.06) 100%)',  border: 'rgba(59,130,246,.25)', iconBg: 'rgba(59,130,246,.18)' },
  arte:        { color: '#EC4899', glow: 'rgba(236,72,153,.35)',  bg: 'linear-gradient(135deg, rgba(236,72,153,.18) 0%, rgba(236,72,153,.06) 100%)',  border: 'rgba(236,72,153,.25)', iconBg: 'rgba(236,72,153,.18)' },
  moda:        { color: '#EC4899', glow: 'rgba(236,72,153,.35)',  bg: 'linear-gradient(135deg, rgba(236,72,153,.18) 0%, rgba(236,72,153,.06) 100%)',  border: 'rgba(236,72,153,.25)', iconBg: 'rgba(236,72,153,.18)' },
  fitness:     { color: '#A8E60E', glow: 'rgba(168,230,14,.35)',  bg: 'linear-gradient(135deg, rgba(168,230,14,.18) 0%, rgba(168,230,14,.06) 100%)',  border: 'rgba(168,230,14,.25)', iconBg: 'rgba(168,230,14,.18)' },
  animales:    { color: '#FFC83D', glow: 'rgba(255,200,61,.35)',  bg: 'linear-gradient(135deg, rgba(255,200,61,.18) 0%, rgba(255,200,61,.06) 100%)',  border: 'rgba(255,200,61,.25)', iconBg: 'rgba(255,200,61,.18)' },
  lifestyle:   { color: '#1AC5A0', glow: 'rgba(26,197,160,.35)',  bg: 'linear-gradient(135deg, rgba(26,197,160,.18) 0%, rgba(26,197,160,.06) 100%)',  border: 'rgba(26,197,160,.25)', iconBg: 'rgba(26,197,160,.18)' },
}
const DEFAULT_THEME = { color: '#00B37E', glow: 'rgba(0,179,126,.35)', bg: 'linear-gradient(135deg, rgba(0,179,126,.18) 0%, rgba(0,179,126,.06) 100%)', border: 'rgba(0,179,126,.25)', iconBg: 'rgba(0,179,126,.18)' }
function themeFor(cat: string) { return CATEGORY_THEME[(cat || '').toLowerCase()] || DEFAULT_THEME }

// Iconos SVG por categoría (Lucide-style, inline)
function CategoryIcon({ cat }: { cat: string }) {
  const c = (cat || '').toLowerCase()
  const props = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (c) {
    case 'musica':      return <svg {...props}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    case 'peliculas':   return <svg {...props}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
    case 'deportes':    return <svg {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
    case 'videojuegos': return <svg {...props}><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z"/></svg>
    case 'comida':      return <svg {...props}><path d="M3 11h18"/><path d="M12 11V3"/><path d="M5 11v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9"/><path d="M9 7h.01M15 7h.01"/></svg>
    case 'viajes':      return <svg {...props}><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
    case 'tech':        return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="14" x2="22" y2="14"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="14" x2="4" y2="14"/></svg>
    case 'ciencia':     return <svg {...props}><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>
    case 'arte':        return <svg {...props}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
    case 'moda':        return <svg {...props}><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>
    case 'fitness':     return <svg {...props}><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
    case 'animales':    return <svg {...props}><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>
    case 'lifestyle':   return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    default:            return <svg {...props}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
  }
}

const SELECT_ANIM_MS = 900

export function PracticarGalaxy({ userName, interests, recommended = [], onPick, onSurprise, onFreeTopic }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handlePick = (topicId: number) => {
    if (selectedId !== null) return
    setSelectedId(topicId)
    window.setTimeout(() => onPick(topicId), SELECT_ANIM_MS)
  }

  // Stars de fondo (deterministic seed)
  const stars = (() => {
    let s = 42
    const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    return Array.from({ length: 180 }, () => ({
      x: rng() * 100, y: rng() * 100,
      size: 0.5 + rng() * 1.6, delay: rng() * 4,
    }))
  })()

  const content = (
    <div
      className={`pg-stage${selectedId !== null ? ' is-selecting' : ''}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(ellipse at 50% 30%, #1a2b26 0%, #050A09 70%)',
        overflow: 'hidden',
        animation: 'pg-fade-in 600ms ease-out',
      }}
    >
      <style>{STYLES}</style>

      {/* STARS DE FONDO */}
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            borderRadius: '50%',
            background: 'white',
            animation: `pg-star-twinkle ${3 + s.delay}s ease-in-out ${s.delay}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* HERO */}
      <div className="pg-hero" style={{
        position: 'absolute', top: '4vh', left: 0, right: 0,
        textAlign: 'center', zIndex: 3, pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 800,
          color: '#9CFCD2', marginBottom: 6,
        }}>
          Hola, {userName}
        </div>
        <h1 style={{
          color: 'white',
          fontSize: 'clamp(24px, 4.5vw, 44px)',
          fontWeight: 800,
          letterSpacing: '-.03em',
          lineHeight: 1.05,
          margin: 0,
          animation: 'pg-hero-glow 5s ease-in-out infinite',
        }}>
          ¿De qué <span style={{ color: '#00B37E' }}>charlamos</span>?
        </h1>
        <p style={{
          color: 'rgba(255,255,255,.55)',
          fontSize: 12, marginTop: 8, fontWeight: 500,
        }}>
          Elegí un tema o tirá uno libre
        </p>
      </div>

      {/* GRID DE CARDS */}
      <div style={{
        position: 'absolute',
        top: '20vh',
        left: 0, right: 0, bottom: '14vh',
        padding: '0 24px',
        paddingRight: typeof window !== 'undefined' && window.innerWidth > 1100 && recommended.length > 0 ? 340 : 24,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto',
        zIndex: 2,
      }}>
        <div className="pg-grid">
          {interests.map((topic, i) => {
            const theme = themeFor(topic.category)
            const isSelected = selectedId === topic.id
            return (
              <button
                key={topic.id}
                className={`pg-card${isSelected ? ' is-selected' : ''}`}
                onClick={() => handlePick(topic.id)}
                style={{
                  animationDelay: `${i * 55}ms`,
                  ['--pg-card-color' as never]: theme.color,
                  ['--pg-card-glow' as never]: theme.glow,
                  ['--pg-card-bg' as never]: theme.bg,
                  ['--pg-card-border' as never]: theme.border,
                  ['--pg-card-icon-bg' as never]: theme.iconBg,
                }}
              >
                <div className="pg-card-icon-wrap"><CategoryIcon cat={topic.category} /></div>
                <div>
                  <h3 className="pg-card-title">{topic.title}</h3>
                  <div className="pg-card-cat">{topic.category}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* SIDE PANEL — "Sugeridos para vos" */}
      {recommended.length > 0 && (
        <aside className="pg-sidepanel" aria-label="Temas sugeridos">
          <div className="pg-sidepanel-title">Sugeridos para vos</div>
          <div className="pg-sidepanel-list">
            {recommended.slice(0, 10).map((topic, i) => {
              const theme = themeFor(topic.category)
              return (
                <button
                  key={topic.id}
                  className="pg-rec-card"
                  style={{ animationDelay: `${300 + i * 60}ms` }}
                  onClick={() => handlePick(topic.id)}
                >
                  <span className="pg-rec-dot" style={{ background: theme.color, color: theme.color }} aria-hidden />
                  <span className="pg-rec-text">
                    <span className="pg-rec-title">{topic.title}</span>
                    <span className="pg-rec-cat">{topic.category}</span>
                  </span>
                  <svg className="pg-rec-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              )
            })}
          </div>
        </aside>
      )}

      {/* EMPTY STATE */}
      {interests.length === 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: 'rgba(255,255,255,.6)', textAlign: 'center',
        }}>
          <div>No tenés intereses cargados.</div>
          <div style={{ marginTop: 6, fontSize: 13 }}>Andá a /perfil para sumar.</div>
        </div>
      )}

      {/* FOOTER */}
      <div className="pg-footer" style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: '16px 24px calc(16px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
        flexWrap: 'wrap',
        zIndex: 4,
        background: 'linear-gradient(180deg, transparent 0%, rgba(5,10,9,.92) 60%)',
      }}>
        <button
          onClick={onSurprise}
          style={{
            padding: '12px 22px', borderRadius: 999,
            background: 'rgba(255,184,0,.15)', color: '#FFB800',
            border: '1px solid rgba(255,184,0,.35)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <circle cx="8" cy="8" r="1.3" fill="currentColor"/>
            <circle cx="16" cy="8" r="1.3" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.3" fill="currentColor"/>
            <circle cx="8" cy="16" r="1.3" fill="currentColor"/>
            <circle cx="16" cy="16" r="1.3" fill="currentColor"/>
          </svg>
          Sorprendéme
        </button>
        {/* "Tema libre": ya NO pide texto. Arranca la sesion directamente; el coach
            pregunta verbalmente "de que vamos a hablar hoy" y el alumno responde
            por voz. El backend usa el primer turno del alumno como topic-seed. */}
        <button
          onClick={() => onFreeTopic('')}
          style={{
            padding: '12px 22px', borderRadius: 999,
            background: 'rgba(0,179,126,.15)', color: '#9CFCD2',
            border: '1px solid rgba(0,179,126,.4)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Tema libre
        </button>
      </div>
    </div>
  )

  // Portal a document.body para escapar de cualquier ancestro con transform/filter
  // que rompa position: fixed (z-stacking + AppShell topbar).
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }
  return content
}

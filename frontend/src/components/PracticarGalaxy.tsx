/**
 * PracticarGalaxy — pantalla inmersiva de selección de tópico.
 *
 * NO es una lista. NO son cards alineadas. Son los tópicos del usuario
 * flotando libres como orbs vivos. Click cualquiera = arranca sesión.
 *
 * Layout:
 *   - Fondo: dark inmersivo con stars
 *   - Hero gigante centrado: "¿De qué charlamos, {nombre}?"
 *   - Orbs Aura distribuidos en posiciones pseudo-aleatorias (deterministicas
 *     por id, asi se mantiene posición entre renders)
 *   - Footer: 2 acciones rápidas: Sorpréndeme + Tema libre
 */
import { useMemo, useState } from 'react'
import { AgentAudioVisualizerAura } from './agents-ui/agent-audio-visualizer-aura'

const STYLES = `
@keyframes pg-drift-1 { 0%,100%{transform:translate(0,0)} 25%{transform:translate(40px,-30px)} 50%{transform:translate(60px,20px)} 75%{transform:translate(20px,40px)} }
@keyframes pg-drift-2 { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-50px,20px)} 50%{transform:translate(-30px,-40px)} 75%{transform:translate(25px,-25px)} }
@keyframes pg-drift-3 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(35px,35px)} 66%{transform:translate(-25px,20px)} }
@keyframes pg-drift-4 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-40px,-30px)} 66%{transform:translate(40px,-15px)} }
@keyframes pg-pop-in { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.06);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes pg-fade-in { 0%{opacity:0} 100%{opacity:1} }
@keyframes pg-star-twinkle { 0%,100%{opacity:.2} 50%{opacity:.9} }
@keyframes pg-hero-glow { 0%,100%{text-shadow: 0 0 20px rgba(0,179,126,.3)} 50%{text-shadow: 0 0 35px rgba(0,179,126,.55)} }
.pg-orb-wrapper {
  transition: transform 280ms cubic-bezier(.2,.8,.2,1), filter 280ms, opacity 380ms ease;
  will-change: transform, opacity;
}
@media (hover: hover) {
  .pg-orb-wrapper:hover { transform: scale(1.15) !important; filter: brightness(1.25) saturate(1.3); z-index: 20; }
  .pg-orb-wrapper:hover .pg-orb-label { opacity: 1; transform: translateY(0); }
}
.pg-orb-wrapper:active { transform: scale(.94) !important; transition: transform 90ms ease-out; }
.pg-orb-label { transition: opacity 220ms, transform 220ms; }

/* Estado al elegir: la galaxia entra en "selección" */
.pg-stage.is-selecting .pg-orb-wrapper { animation-play-state: paused; pointer-events: none; }
.pg-stage.is-selecting .pg-orb-wrapper:not(.is-selected) {
  transform: translate(-50%, -50%) scale(.72) !important;
  opacity: 0;
  filter: blur(2px);
  transition: transform 520ms cubic-bezier(.4,0,.2,1), opacity 380ms ease, filter 380ms ease;
}
.pg-stage.is-selecting .pg-orb-wrapper.is-selected {
  transform: translate(-50%, -50%) scale(2.6) !important;
  filter: brightness(1.35) saturate(1.4) drop-shadow(0 0 40px rgba(0,179,126,.55));
  z-index: 50;
  transition: transform 640ms cubic-bezier(.34,1.18,.5,1), filter 520ms ease;
}
.pg-stage.is-selecting .pg-orb-wrapper.is-selected .pg-orb-label { opacity: 0; }
.pg-stage.is-selecting .pg-hero,
.pg-stage.is-selecting .pg-footer { opacity: 0; transition: opacity 320ms ease; pointer-events: none; }
`

// Mapeo de categoria slug -> color (mismo que onboarding y backoffice)
const CATEGORY_COLORS: Record<string, string> = {
  musica: '#5B21B6',
  peliculas: '#7C3AED',
  deportes: '#C2410C',
  videojuegos: '#DB2777',
  comida: '#B91C1C',
  animales: '#65A30D',
  viajes: '#3B82F6',
  tech: '#1E4FB0',
  ciencia: '#0891B2',
  arte: '#8B5CF6',
  fitness: '#10B981',
  moda: '#EC4899',
  // fallback para categorias legacy del catalogo
  lifestyle: '#10B981',
  diseno: '#EC4899',
  negocios: '#0E1614',
  gastronomia: '#B91C1C',
  general: '#475569',
}

interface InterestTopic {
  id: number
  title: string
  category: string
}

interface Props {
  userName: string
  interests: InterestTopic[]
  onPick: (topicId: number) => void
  onSurprise: () => void
  onFreeTopic: (text: string) => void
}

// Hash determinístico simple para posiciones estables por id
function seedRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Distribución estilo "Fibonacci-ish" alrededor del centro
function generatePositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = []
  const GOLDEN = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    // Espiral de Fibonacci normalizada
    const t = (i + 0.5) / count
    const r = Math.sqrt(t) * 0.38 // radio (0-0.38 del viewport)
    const angle = i * GOLDEN
    positions.push({
      x: 50 + Math.cos(angle) * r * 100,
      y: 50 + Math.sin(angle) * r * 100,
    })
  }
  return positions
}

const SELECT_ANIM_MS = 560

export function PracticarGalaxy({ userName, interests, onPick, onSurprise, onFreeTopic }: Props) {
  const [freeText, setFreeText] = useState('')
  const [freeOpen, setFreeOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handlePick = (topicId: number) => {
    if (selectedId !== null) return
    setSelectedId(topicId)
    window.setTimeout(() => onPick(topicId), SELECT_ANIM_MS)
  }

  // Limitamos a 11 orbs visibles (límite WebGL). Si tiene más, mostramos
  // los primeros 11 (estan ordenados por interest position).
  const visibleInterests = useMemo(() => interests.slice(0, 11), [interests])

  // Posiciones estables: spiral pattern
  const positions = useMemo(() => generatePositions(visibleInterests.length), [visibleInterests.length])

  // Stars de fondo (250 puntos estáticos pseudo-random)
  const stars = useMemo(() => {
    const rng = seedRandom(42)
    return Array.from({ length: 250 }, () => ({
      x: rng() * 100,
      y: rng() * 100,
      size: 0.5 + rng() * 1.8,
      delay: rng() * 4,
    }))
  }, [])

  return (
    <div
      className={`pg-stage${selectedId !== null ? ' is-selecting' : ''}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 5,
        background: 'radial-gradient(ellipse at 50% 40%, #1a2b26 0%, #050A09 70%)',
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

      {/* HERO CENTRAL */}
      <div className="pg-hero" style={{
        position: 'absolute', top: '5vh', left: 0, right: 0,
        textAlign: 'center', zIndex: 3,
        pointerEvents: 'none',
      }}>
        <div style={{
          fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 800,
          color: '#9CFCD2', marginBottom: 6,
        }}>
          Hola, {userName}
        </div>
        <h1 style={{
          color: 'white',
          fontSize: 'clamp(28px, 5.5vw, 56px)',
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
          fontSize: 13,
          marginTop: 12,
          fontWeight: 500,
        }}>
          Tocá un orb para empezar
        </p>
      </div>

      {/* GALAXIA DE ORBS */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'relative',
          width: 'min(720px, 90vw)',
          height: 'min(720px, 70vh)',
        }}>
          {visibleInterests.map((topic, i) => {
            const pos = positions[i]
            const color = CATEGORY_COLORS[topic.category] || '#00B37E'
            const driftIdx = i % 4
            const driftDur = 7 + (i % 6) * 1.2
            const orbSize = i === 0 ? 'lg' : 'md'  // El primero más grande (top interest)
            const sizePx = orbSize === 'lg' ? 180 : 110
            const pseudoAudio = 0.4 + ((i * 0.13) % 0.45)

            const isSelected = selectedId === topic.id
            return (
              <button
                key={topic.id}
                className={`pg-orb-wrapper${isSelected ? ' is-selected' : ''}`}
                onClick={() => handlePick(topic.id)}
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`, top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 0,
                  animation: `pg-pop-in ${500 + i * 60}ms ease-out, pg-drift-${driftIdx + 1} ${driftDur}s ease-in-out infinite`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                <div style={{ width: sizePx, height: sizePx, position: 'relative' }}>
                  <AgentAudioVisualizerAura
                    status="speaking"
                    audioLevel={pseudoAudio}
                    color={color as `#${string}`}
                    colorShift={0.06}
                    themeMode="dark"
                    size={orbSize as 'lg' | 'md'}
                  />
                </div>
                <span
                  className="pg-orb-label"
                  style={{
                    color: 'white',
                    fontSize: orbSize === 'lg' ? 14 : 12,
                    fontWeight: 700,
                    textAlign: 'center',
                    textShadow: '0 2px 8px rgba(0,0,0,.85), 0 0 4px rgba(0,0,0,.9)',
                    opacity: orbSize === 'lg' ? 1 : 0.65,
                    transform: 'translateY(4px)',
                    pointerEvents: 'none',
                    maxWidth: sizePx + 30,
                    lineHeight: 1.2,
                    letterSpacing: '-.01em',
                  }}
                >
                  {topic.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* EMPTY STATE */}
      {visibleInterests.length === 0 && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: 'rgba(255,255,255,.6)', textAlign: 'center',
        }}>
          <div>No tenés intereses cargados.</div>
          <div style={{ marginTop: 6, fontSize: 13 }}>Andá a /perfil para sumar.</div>
        </div>
      )}

      {/* FOOTER: acciones rápidas */}
      <div className="pg-footer" style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 24px calc(20px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
        zIndex: 4,
        background: 'linear-gradient(180deg, transparent 0%, rgba(5,10,9,.85) 50%)',
      }}>
        {!freeOpen ? (
          <>
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
            <button
              onClick={() => setFreeOpen(true)}
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
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const t = freeText.trim()
              if (t) onFreeTopic(t)
            }}
            style={{
              display: 'flex', gap: 8,
              maxWidth: 520, width: '100%',
            }}
          >
            <input
              autoFocus
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="ej. mi último viaje a Berlín..."
              onBlur={() => { if (!freeText.trim()) setFreeOpen(false) }}
              style={{
                flex: 1, padding: '12px 18px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,.2)',
                background: 'rgba(255,255,255,.08)',
                color: 'white', fontSize: 14, outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0 22px', borderRadius: 999,
                background: '#00B37E', color: 'white', border: 'none',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              →
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

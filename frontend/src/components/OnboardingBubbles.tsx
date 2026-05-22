/**
 * OnboardingBubbles — primera experiencia post-login.
 *
 * Flujo simplificado (2 niveles, vuelve automaticamente):
 *   1) Splash con boton "Empecemos!"
 *   2) Pantalla principal: ~20 categorías como orbs flotantes (Aura).
 *      Boton "Comenzar (N)" siempre visible abajo.
 *   3) Tocá una categoría → expande a topics (modal/overlay).
 *      Cada tap = agrega como interes (toast verde).
 *      Auto-vuelve a categorías principal al cerrar.
 *   4) Boton "Comenzar (N)" cierra el onboarding cuando el user quiere.
 */
import { useEffect, useState } from 'react'
import {
  onboardingAPI,
  topicsAPI,
  OnboardingCategory,
  OnboardingTopic,
} from '../services/api'
import { toast } from 'sonner'

const STYLES = `
@keyframes ob-drift-1 { 0%,100%{transform:translate(0,0)} 25%{transform:translate(36px,-22px)} 50%{transform:translate(48px,18px)} 75%{transform:translate(12px,32px)} }
@keyframes ob-drift-2 { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-42px,16px)} 50%{transform:translate(-28px,-32px)} 75%{transform:translate(20px,-22px)} }
@keyframes ob-drift-3 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(28px,28px)} 66%{transform:translate(-22px,18px)} }
@keyframes ob-drift-4 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-30px,-26px)} 66%{transform:translate(34px,-12px)} }
@keyframes ob-pop-in { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes ob-fade-up { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes ob-overlay-in { 0%{opacity:0} 100%{opacity:1} }
@keyframes ob-rotate { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
@keyframes ob-rotate-rev { 0%{transform:rotate(0)} 100%{transform:rotate(-360deg)} }
@keyframes ob-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
.ob-bubble { transition: filter 240ms; }
.ob-bubble:hover { filter: brightness(1.18) saturate(1.25); z-index: 5; }
.ob-bubble:hover .ob-orb-ring { transform: scale(1.05); }
.ob-bubble:active { filter: brightness(.9); }
.ob-orb-ring { transition: transform 220ms; }
`

interface Props {
  onDone: () => void
  onSkip: () => void
}

type Step = 'splash' | 'main'

export function OnboardingBubbles({ onDone, onSkip }: Props) {
  const [step, setStep] = useState<Step>('splash')
  const [categories, setCategories] = useState<OnboardingCategory[]>([])
  const [openCat, setOpenCat] = useState<OnboardingCategory | null>(null)
  const [openTopics, setOpenTopics] = useState<OnboardingTopic[]>([])
  const [openLoading, setOpenLoading] = useState(false)
  const [addedCount, setAddedCount] = useState(0)

  useEffect(() => {
    onboardingAPI.categories().then(setCategories).catch(() => toast.error('No pude cargar las categorías'))
  }, [])

  const handleCategoryClick = async (cat: OnboardingCategory) => {
    setOpenCat(cat)
    setOpenLoading(true)
    setOpenTopics([])
    try {
      const tops = await onboardingAPI.topics(cat.slug)
      setOpenTopics(tops)
    } catch {
      toast.error('Error cargando tópicos')
    } finally {
      setOpenLoading(false)
    }
  }

  const handleTopicClick = async (topic: OnboardingTopic) => {
    try {
      if (topic.is_fallback) {
        await onboardingAPI.addFallbackTopic(topic.title, topic.category)
      } else {
        await topicsAPI.addInterest(topic.id)
      }
      setAddedCount((c) => c + 1)
      toast.success(`Agregado: ${topic.title}`)
      // Cierre automatico tras tocar (vuelve a categorias)
      setTimeout(() => setOpenCat(null), 280)
    } catch {
      toast.error('No pude agregar este tópico')
    }
  }

  const handleFinish = () => {
    if (addedCount === 0) {
      toast.error('Elegí al menos un tópico para empezar')
      return
    }
    onDone()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'radial-gradient(circle at 30% 20%, #0E1614 0%, #050A09 100%)',
      display: 'flex', flexDirection: 'column',
      animation: 'ob-fade-up 400ms ease-out',
    }}>
      <style>{STYLES}</style>

      {step === 'splash' && (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <SplashStage onStart={() => setStep('main')} onSkip={onSkip} />
        </div>
      )}

      {step === 'main' && (
        <>
          {/* HEADER fijo */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: '18px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            zIndex: 10,
          }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#9CFCD2', fontWeight: 800 }}>
                Elegí tus intereses
              </div>
              <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, margin: '2px 0 0' }}>
                ¿De qué te gusta hablar?
              </h2>
            </div>
            <button
              onClick={onSkip}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600,
              }}
            >
              Saltar →
            </button>
          </div>

          {/* GRID de categorías centrado */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '90px 16px 110px',
            overflow: 'auto',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12, rowGap: 22,
              maxWidth: 980, width: '100%',
            }}>
              {categories.map((cat, i) => (
                <BubbleButton
                  key={cat.slug}
                  label={cat.title}
                  color={cat.color}
                  onClick={() => handleCategoryClick(cat)}
                  driftIndex={i}
                />
              ))}
            </div>
          </div>

          {/* FOOTER fijo: botón Comenzar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '16px 24px calc(16px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(180deg, transparent 0%, rgba(5,10,9,.8) 40%, rgba(5,10,9,.95) 100%)',
            display: 'flex', justifyContent: 'center', zIndex: 10,
          }}>
            <button
              onClick={handleFinish}
              disabled={addedCount === 0}
              style={{
                padding: '14px 42px', borderRadius: 999,
                background: addedCount > 0 ? '#00B37E' : 'rgba(255,255,255,.08)',
                color: 'white', border: 'none',
                fontSize: 16, fontWeight: 800, letterSpacing: '.01em',
                cursor: addedCount > 0 ? 'pointer' : 'not-allowed',
                opacity: addedCount > 0 ? 1 : 0.55,
                boxShadow: addedCount > 0 ? '0 12px 36px rgba(0,179,126,.5)' : 'none',
                transition: 'all 220ms',
              }}
            >
              Comenzar {addedCount > 0 && `(${addedCount})`}
            </button>
          </div>

          {/* OVERLAY de topics cuando hay categoría seleccionada */}
          {openCat && (
            <TopicsOverlay
              category={openCat}
              topics={openTopics}
              loading={openLoading}
              onTopicClick={handleTopicClick}
              onClose={() => setOpenCat(null)}
            />
          )}
        </>
      )}
    </div>
  )
}

/* ─── Splash ──────────────────────────────────────────────────── */
function SplashStage({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 520, animation: 'ob-fade-up 500ms ease-out', position: 'relative' }}>
      <button
        onClick={onSkip}
        style={{
          position: 'absolute', top: -50, right: 0,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600,
        }}
      >
        Saltar →
      </button>
      <div style={{
        fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 800,
        color: '#9CFCD2', marginBottom: 16,
      }}>
        Bienvenido a Habláh
      </div>
      <h1 style={{
        color: 'white', fontSize: 'clamp(28px, 6vw, 48px)', fontWeight: 800,
        letterSpacing: '-.03em', lineHeight: 1.1, margin: '0 0 18px',
      }}>
        Vamos a armar tu lista de <span style={{
          background: 'linear-gradient(180deg, transparent 60%, rgba(0,179,126,.4) 60%)',
          padding: '0 4px',
        }}>tópicos favoritos</span>
      </h1>
      <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 16, lineHeight: 1.5, margin: '0 0 32px' }}>
        Elegí lo que te interese. Podés sumar muchos.
        Cuando estés listo, tocá <b>Comenzar</b>.
      </p>
      <button
        onClick={onStart}
        style={{
          background: '#00B37E', color: 'white', border: 'none',
          padding: '16px 38px', borderRadius: 999, fontSize: 17, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,179,126,.4)',
          transition: 'transform 200ms, box-shadow 200ms',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,179,126,.55)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,179,126,.4)' }}
      >
        ¡Empecemos!
      </button>
    </div>
  )
}

/* ─── Bubble — orb CSS (sin WebGL, escala a 20+ instancias) ──── */
function BubbleButton({ label, color, onClick, driftIndex }: {
  label: string; color: string; onClick: () => void; driftIndex: number
}) {
  const SIZE = 100
  const rotateDur = 18 + (driftIndex % 5) * 4
  const breatheDur = 3.5 + (driftIndex % 4) * 0.6
  const rotateDir = driftIndex % 2 === 0 ? 'ob-rotate' : 'ob-rotate-rev'

  return (
    <div
      style={{
        position: 'relative',
        animation: `ob-pop-in 420ms ease-out, ob-drift-${(driftIndex % 4) + 1} ${6 + (driftIndex % 5)}s ease-in-out infinite`,
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}
    >
      <button
        className="ob-bubble"
        onClick={onClick}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
          width: SIZE, height: SIZE, position: 'relative',
          display: 'grid', placeItems: 'center',
        }}
      >
        {/* Halo exterior - glow blureado breathing */}
        <div style={{
          position: 'absolute', inset: -10,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}AA 0%, ${color}44 35%, transparent 65%)`,
          filter: 'blur(10px)',
          animation: `ob-breathe ${breatheDur}s ease-in-out infinite`,
          pointerEvents: 'none',
        }} />
        {/* Anillo rotante con conic-gradient (simula el ondulado Aura) */}
        <div
          className="ob-orb-ring"
          style={{
            position: 'absolute', inset: 8,
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, ${color}, ${color}66, ${color}EE, ${color}33, ${color}DD, ${color}77, ${color})`,
            animation: `${rotateDir} ${rotateDur}s linear infinite`,
            filter: 'blur(2px)',
            pointerEvents: 'none',
          }}
        />
        {/* Núcleo oscuro central (efecto donut/anillo) */}
        <div style={{
          position: 'absolute', inset: 22,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #0E1614 0%, #050A09 80%)',
          boxShadow: `inset 0 0 12px ${color}55`,
          pointerEvents: 'none',
        }} />
        {/* Highlight especular */}
        <div style={{
          position: 'absolute', top: '12%', left: '20%',
          width: '24%', height: '14%',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,.45) 0%, transparent 70%)',
          filter: 'blur(1.5px)',
          pointerEvents: 'none',
        }} />
      </button>
      <span style={{
        color: 'white', fontSize: 12, fontWeight: 700, lineHeight: 1.15,
        letterSpacing: '-.01em', textAlign: 'center',
        textShadow: '0 2px 8px rgba(0,0,0,.6)',
        maxWidth: 130, pointerEvents: 'none',
      }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Topics Overlay ──────────────────────────────────────────── */
function TopicsOverlay({ category, topics, loading, onTopicClick, onClose }: {
  category: OnboardingCategory
  topics: OnboardingTopic[]
  loading: boolean
  onTopicClick: (t: OnboardingTopic) => void
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(5,10,9,.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'ob-overlay-in 220ms ease-out',
    }}
    onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 720, width: '100%',
          textAlign: 'center',
          animation: 'ob-fade-up 320ms ease-out',
        }}
      >
        <div style={{
          fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 800,
          color: 'rgba(255,255,255,.55)', marginBottom: 6,
        }}>
          {category.title}
        </div>
        <h2 style={{
          color: 'white', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800,
          margin: '0 0 28px', letterSpacing: '-.02em',
        }}>
          ¿De qué te gustaría hablar?
        </h2>

        {loading && <div style={{ color: 'rgba(255,255,255,.4)', padding: 30 }}>Cargando…</div>}

        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
          marginBottom: 32,
        }}>
          {topics.map((t) => (
            <button
              key={`${t.id}-${t.title}`}
              onClick={() => onTopicClick(t)}
              className="ob-bubble"
              style={{
                padding: '14px 22px', borderRadius: 999,
                border: `1.5px solid ${category.color}66`,
                background: `${category.color}1A`,
                color: 'white',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                animation: 'ob-pop-in 320ms ease-out',
                transition: 'all 200ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${category.color}33`
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 24px ${category.color}55`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${category.color}1A`
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {t.title}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '10px 22px', borderRadius: 999,
            background: 'transparent', color: 'rgba(255,255,255,.7)',
            border: '1px solid rgba(255,255,255,.2)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Volver
        </button>
      </div>
    </div>
  )
}

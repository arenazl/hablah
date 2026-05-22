/**
 * OnboardingBubbles — primera experiencia post-login.
 *
 * Flujo:
 *   1) 8 globos flotando con drift CSS — el user toca una categoria.
 *   2) Se expande a 3-5 subcategorias en globos mas chicos.
 *   3) Se expande a 4-8 topics — cada toque agrega el topic como interes.
 *   4) "Listo!" cuando el user terminó.
 *
 * No usa framer-motion (drift via @keyframes CSS).
 */
import { useEffect, useState } from 'react'
import {
  onboardingAPI,
  topicsAPI,
  OnboardingCategory,
  OnboardingSubcategory,
  OnboardingTopic,
} from '../services/api'
import { toast } from 'sonner'
import { AgentAudioVisualizerAura } from './agents-ui/agent-audio-visualizer-aura'

const STYLES = `
@keyframes ob-drift-1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(8px,-12px)} }
@keyframes ob-drift-2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-10px,6px)} }
@keyframes ob-drift-3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(6px,10px)} }
@keyframes ob-drift-4 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-7px,-9px)} }
@keyframes ob-pop-in {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes ob-fade-up {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
.ob-bubble { transition: transform 240ms cubic-bezier(.2,.8,.2,1), box-shadow 240ms; }
.ob-bubble:hover { transform: scale(1.08) !important; box-shadow: 0 12px 30px rgba(0,0,0,.25); }
.ob-bubble:active { transform: scale(.95) !important; }
`

interface Props {
  onDone: () => void
  onSkip: () => void
}

type Step = 'splash' | 'categories' | 'subcategories' | 'topics' | 'done'

export function OnboardingBubbles({ onDone, onSkip }: Props) {
  const [step, setStep] = useState<Step>('splash')
  const [categories, setCategories] = useState<OnboardingCategory[]>([])
  const [activeCat, setActiveCat] = useState<OnboardingCategory | null>(null)
  const [subcategories, setSubcategories] = useState<OnboardingSubcategory[]>([])
  const [activeSub, setActiveSub] = useState<OnboardingSubcategory | null>(null)
  const [topics, setTopics] = useState<OnboardingTopic[]>([])
  const [addedTopicIds, setAddedTopicIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)

  // Cargar categorías al iniciar
  useEffect(() => {
    onboardingAPI.categories().then(setCategories).catch(() => toast.error('No pude cargar las categorías'))
  }, [])

  const handleStart = () => setStep('categories')

  const handleCategoryClick = async (cat: OnboardingCategory) => {
    setActiveCat(cat)
    setLoading(true)
    try {
      const subs = await onboardingAPI.subcategories(cat.slug)
      setSubcategories(subs)
      setStep('subcategories')
    } catch {
      toast.error('Error cargando subcategorías')
    } finally {
      setLoading(false)
    }
  }

  const handleSubcategoryClick = async (sub: OnboardingSubcategory) => {
    if (!activeCat) return
    setActiveSub(sub)
    setLoading(true)
    try {
      const tops = await onboardingAPI.topics(activeCat.slug, sub.slug)
      setTopics(tops)
      setStep('topics')
    } catch {
      toast.error('Error cargando tópicos')
    } finally {
      setLoading(false)
    }
  }

  const handleTopicClick = async (topic: OnboardingTopic) => {
    if (addedTopicIds.has(topic.id)) return
    try {
      await topicsAPI.addInterest(topic.id)
      setAddedTopicIds((s) => new Set(s).add(topic.id))
      toast.success(`Agregado: ${topic.title}`)
    } catch {
      toast.error('No pude agregar este tópico')
    }
  }

  const goBack = () => {
    if (step === 'topics') { setStep('subcategories'); setActiveSub(null); setTopics([]) }
    else if (step === 'subcategories') { setStep('categories'); setActiveCat(null); setSubcategories([]) }
  }

  const handleFinish = () => {
    if (addedTopicIds.size === 0) {
      toast.error('Elegí al menos un tópico para empezar')
      return
    }
    setStep('done')
    setTimeout(onDone, 800)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'radial-gradient(circle at 30% 20%, #0E1614 0%, #050A09 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      animation: 'ob-fade-up 400ms ease-out',
    }}>
      <style>{STYLES}</style>

      {/* SKIP corner */}
      {step !== 'splash' && step !== 'done' && (
        <button
          onClick={onSkip}
          style={{
            position: 'absolute', top: 18, right: 24,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600,
          }}
        >
          Saltar →
        </button>
      )}

      {step === 'splash' && (
        <SplashStage onStart={handleStart} addedCount={0} />
      )}

      {step === 'categories' && (
        <CategoriesStage categories={categories} onPick={handleCategoryClick} />
      )}

      {step === 'subcategories' && activeCat && (
        <SubcategoriesStage
          parent={activeCat}
          subcategories={subcategories}
          onPick={handleSubcategoryClick}
          onBack={goBack}
          loading={loading}
        />
      )}

      {step === 'topics' && activeCat && activeSub && (
        <TopicsStage
          parent={activeSub}
          parentColor={activeCat.color}
          topics={topics}
          addedIds={addedTopicIds}
          onTopicClick={handleTopicClick}
          onBack={goBack}
          onMore={() => setStep('categories')}
          onFinish={handleFinish}
          loading={loading}
        />
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', animation: 'ob-pop-in 600ms ease-out' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#00B37E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 style={{ color: 'white', fontSize: 32, fontWeight: 800, margin: 0 }}>
            ¡Listo!
          </h1>
          <p style={{ color: 'rgba(255,255,255,.7)', marginTop: 8 }}>
            {addedTopicIds.size} tópicos agregados. Vamos a charlar.
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Splash ──────────────────────────────────────────────────── */
function SplashStage({ onStart }: { onStart: () => void; addedCount: number }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 520, animation: 'ob-fade-up 500ms ease-out' }}>
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
        En 30 segundos vamos a saber de qué te gusta hablar.
        Vas a poder cambiarlos cuando quieras.
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

/* ─── Stage 1: Categorías (8 globos flotando) ─────────────────── */
function CategoriesStage({ categories, onPick }: {
  categories: OnboardingCategory[]
  onPick: (c: OnboardingCategory) => void
}) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 1000, animation: 'ob-fade-up 400ms ease-out' }}>
      <h2 style={{ color: 'white', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, margin: '0 0 12px' }}>
        ¿De qué te gusta hablar?
      </h2>
      <p style={{ color: 'rgba(255,255,255,.6)', marginBottom: 40 }}>
        Tocá una categoría para explorar
      </p>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 18, maxWidth: 720, margin: '0 auto',
      }}>
        {categories.map((cat, i) => (
          <BubbleButton
            key={cat.slug}
            label={cat.title}
            color={cat.color}
            onClick={() => onPick(cat)}
            driftIndex={i % 4}
            size={130}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Stage 2: Subcategorías ──────────────────────────────────── */
function SubcategoriesStage({ parent, subcategories, onPick, onBack, loading }: {
  parent: OnboardingCategory
  subcategories: OnboardingSubcategory[]
  onPick: (s: OnboardingSubcategory) => void
  onBack: () => void
  loading: boolean
}) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 900, animation: 'ob-fade-up 400ms ease-out' }}>
      <BackButton onClick={onBack} />
      <h2 style={{ color: 'white', fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, margin: '0 0 6px' }}>
        {parent.title}
      </h2>
      <p style={{ color: 'rgba(255,255,255,.6)', marginBottom: 36 }}>
        ¿Qué te interesa más?
      </p>
      {loading && <div style={{ color: 'rgba(255,255,255,.4)' }}>Cargando…</div>}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'center', maxWidth: 720, margin: '0 auto',
      }}>
        {subcategories.map((sub, i) => (
          <BubbleButton
            key={sub.slug}
            label={sub.title}
            color={parent.color}
            onClick={() => onPick(sub)}
            driftIndex={i % 4}
            size={120}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Stage 3: Topics ────────────────────────────────────────── */
function TopicsStage({ parent, parentColor, topics, addedIds, onTopicClick, onBack, onMore, onFinish, loading }: {
  parent: OnboardingSubcategory
  parentColor: string
  topics: OnboardingTopic[]
  addedIds: Set<number>
  onTopicClick: (t: OnboardingTopic) => void
  onBack: () => void
  onMore: () => void
  onFinish: () => void
  loading: boolean
}) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 900, animation: 'ob-fade-up 400ms ease-out' }}>
      <BackButton onClick={onBack} />
      <h2 style={{ color: 'white', fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 800, margin: '0 0 6px' }}>
        {parent.title}
      </h2>
      <p style={{ color: 'rgba(255,255,255,.6)', marginBottom: 30 }}>
        Tocá los tópicos que te interesen — podés elegir varios
      </p>
      {loading && <div style={{ color: 'rgba(255,255,255,.4)' }}>Cargando…</div>}
      {!loading && topics.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,.55)', padding: 30 }}>
          No hay tópicos por aquí. Probá otra categoría.
        </div>
      )}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 720, margin: '0 auto 36px',
      }}>
        {topics.map((t) => {
          const added = addedIds.has(t.id)
          return (
            <button
              key={t.id}
              onClick={() => onTopicClick(t)}
              className="ob-bubble"
              style={{
                padding: '12px 20px', borderRadius: 999,
                border: `1.5px solid ${added ? '#00B37E' : 'rgba(255,255,255,.2)'}`,
                background: added ? 'rgba(0,179,126,.18)' : 'rgba(255,255,255,.06)',
                color: added ? '#9CFCD2' : 'white',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                animation: 'ob-pop-in 320ms ease-out',
              }}
            >
              {added && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {t.title}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={onMore}
          style={{
            padding: '12px 24px', borderRadius: 999,
            background: 'transparent', color: 'white',
            border: '1px solid rgba(255,255,255,.25)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Explorar más categorías
        </button>
        <button
          onClick={onFinish}
          disabled={addedIds.size === 0}
          style={{
            padding: '12px 32px', borderRadius: 999,
            background: addedIds.size > 0 ? '#00B37E' : 'rgba(0,179,126,.3)',
            color: 'white', border: 'none', fontSize: 14, fontWeight: 700,
            cursor: addedIds.size > 0 ? 'pointer' : 'not-allowed',
            opacity: addedIds.size > 0 ? 1 : 0.5,
          }}
        >
          Terminé ({addedIds.size})
        </button>
      </div>
      <div style={{ marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
        Color: <span style={{ display: 'inline-block', width: 8, height: 8, background: parentColor, borderRadius: '50%', verticalAlign: 'middle', marginLeft: 4 }} />
      </div>
    </div>
  )
}

/* ─── Bubble Button (reusable) — Aura orb con label flotando ──── */
function BubbleButton({ label, color, onClick, driftIndex, size }: {
  label: string; color: string; onClick: () => void; driftIndex: number; size: number
}) {
  // audioLevel pseudoaleatorio para que cada orb tenga vida propia
  const pseudoAudio = 0.2 + ((driftIndex * 0.17) % 0.5)
  const orbSize = size <= 110 ? 'sm' : 'md'

  return (
    <button
      className="ob-bubble"
      onClick={onClick}
      style={{
        position: 'relative',
        width: size, height: size,
        background: 'transparent', border: 'none',
        cursor: 'pointer', padding: 0,
        animation: `ob-pop-in 360ms ease-out, ob-drift-${driftIndex + 1} ${5 + driftIndex}s ease-in-out infinite`,
        display: 'grid', placeItems: 'center',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid', placeItems: 'center',
        pointerEvents: 'none',
      }}>
        <AgentAudioVisualizerAura
          status="listening"
          audioLevel={pseudoAudio}
          color={color as `#${string}`}
          colorShift={0.12}
          themeMode="dark"
          size={orbSize}
        />
      </div>
      <span style={{
        position: 'relative', zIndex: 2,
        color: 'white', fontSize: size > 110 ? 14 : 12, fontWeight: 800, lineHeight: 1.15,
        letterSpacing: '-.01em', textAlign: 'center',
        padding: '0 10px', maxWidth: size - 16,
        textShadow: '0 2px 12px rgba(0,0,0,.65), 0 0 2px rgba(0,0,0,.8)',
      }}>
        {label}
      </span>
    </button>
  )
}

/* ─── Back button ─────────────────────────────────────────────── */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute', top: 18, left: 24,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'rgba(255,255,255,.7)', fontSize: 13, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
      Volver
    </button>
  )
}

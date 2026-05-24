/**
 * 6 variantes del panel izquierdo (hero) del Login.
 * Cada una con layout, headline, sub-text y animaciones distintos.
 *
 * Se exporta:
 *  - LoginHero(variant): renderiza la variante elegida
 *  - VARIANT_LABELS: nombres para el selector
 *  - useOscillatingLevel: hook compartido para el audioLevel del orb
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Flame, Mic, Languages, Sparkles, Globe, Zap, Heart } from 'lucide-react'
import { AgentAudioVisualizerAura } from '../components/agents-ui/agent-audio-visualizer-aura'

const GREEN = '#00B37E'
const GREEN_DARK = '#008F63'
const INK = '#0E1614'

export const VARIANT_LABELS: { id: number; name: string; tagline: string }[] = [
  { id: 7,  name: 'Clase Live',   tagline: 'preview real de adentro' },
  { id: 8,  name: 'Chat Burbujas',tagline: 'mensajes saliendo del orb' },
  { id: 9,  name: 'Pizarra',      tagline: 'chalkboard + tiza' },
  { id: 10, name: 'Now Playing',  tagline: 'spotify-like card' },
  { id: 11, name: 'Newsroom',     tagline: 'transmisión TV' },
  { id: 12, name: 'Cinema',       tagline: 'subtítulos peli' },
  { id: 1,  name: 'Orb Hero',     tagline: 'protagonista central' },
  { id: 2,  name: 'Editorial',    tagline: 'tipografía gigante' },
  { id: 3,  name: 'Constelación', tagline: 'multi-orb flotante' },
  { id: 4,  name: 'Studio Live',  tagline: 'orb + waveform' },
  { id: 5,  name: 'Pulsos',       tagline: 'anillos concéntricos' },
  { id: 6,  name: 'Bento',        tagline: 'stats + orb en grid' },
]

export function useOscillatingLevel(baseInterval = 1500, min = 0.32, max = 0.75) {
  const [level, setLevel] = useState((min + max) / 2)
  useEffect(() => {
    const id = window.setInterval(() => {
      setLevel(min + Math.random() * (max - min))
    }, baseInterval)
    return () => window.clearInterval(id)
  }, [baseInterval, min, max])
  return level
}

const SHARED_STYLES = `
.lhv-root { position: relative; flex: 1; overflow: hidden; padding: 48px 56px; background: ${INK}; color: white; display: flex; flex-direction: column; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; }
.lhv-glow-a { position: absolute; top: -200px; right: -200px; width: 600px; height: 600px; border-radius: 50%; filter: blur(80px); background: radial-gradient(circle, ${GREEN}55, transparent); pointer-events: none; }
.lhv-glow-b { position: absolute; bottom: -180px; left: -180px; width: 500px; height: 500px; border-radius: 50%; filter: blur(80px); background: radial-gradient(circle, ${GREEN}33, transparent); pointer-events: none; }
.lhv-brand { position: relative; display: flex; align-items: center; gap: 12px; }
.lhv-brand-mark { width: 44px; height: 44px; border-radius: 12px; background: ${GREEN}; display: grid; place-items: center; box-shadow: 0 6px 18px ${GREEN}55; }
.lhv-brand-name { font-weight: 800; font-size: 20px; letter-spacing: -.01em; }
.lhv-brand-sub { font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase; color: rgba(232,236,234,.5); font-weight: 700; margin-top: 2px; }
.lhv-footer { position: relative; margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(232,236,234,.4); padding-top: 24px; }
.lhv-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: rgba(0,179,126,.16); color: ${GREEN}; font-size: 11.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.lhv-eyebrow svg { width: 14px; height: 14px; }

/* ===== V1: Orb Hero ===== */
.lhv-v1-stage { position: relative; flex: 1; display: grid; grid-template-rows: 1fr auto; gap: 24px; place-items: center; }
.lhv-v1-orb-wrap { position: relative; display: grid; place-items: center; justify-content: center; width: 100%; height: 100%; }
/* Halo radial verde detras del orb - cintura mas ancha que el orb mismo */
.lhv-v1-orb-wrap::before {
  content: '';
  position: absolute;
  width: min(780px, 80vh);
  height: min(780px, 80vh);
  border-radius: 50%;
  background: radial-gradient(circle, ${GREEN}55 0%, ${GREEN}1F 30%, transparent 65%);
  filter: blur(40px);
  pointer-events: none;
  animation: lhv-v1-halo 6s ease-in-out infinite;
}
.lhv-v1-orb-wrap::after {
  content: '';
  position: absolute;
  width: min(560px, 65vh);
  height: min(560px, 65vh);
  border-radius: 50%;
  background: radial-gradient(circle, ${GREEN}22 0%, transparent 70%);
  pointer-events: none;
  animation: lhv-v1-halo 6s ease-in-out infinite reverse;
}
@keyframes lhv-v1-halo { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.08); opacity: 1; } }
.lhv-v1-orb { width: min(560px, 65vh); height: min(560px, 65vh); position: relative; animation: lhv-v1-bob 5.5s ease-in-out infinite; z-index: 2; filter: drop-shadow(0 30px 60px ${GREEN}66); }
@keyframes lhv-v1-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
.lhv-v1-orbital-text { position: absolute; inset: 0; pointer-events: none; }
.lhv-v1-orbital-text span { position: absolute; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.55); font-weight: 700; white-space: nowrap; }
.lhv-v1-headline { text-align: center; }
.lhv-v1-headline h1 { font-size: clamp(34px, 4vw, 52px); font-weight: 900; letter-spacing: -.025em; line-height: 1.05; margin: 0 0 12px; }
.lhv-v1-headline h1 em { font-style: normal; color: ${GREEN}; }
.lhv-v1-headline p { font-size: 16px; color: rgba(232,236,234,.7); max-width: 480px; margin: 0 auto; line-height: 1.5; }
.lhv-v1-chips { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.lhv-v1-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.10); font-size: 12px; font-weight: 600; color: rgba(232,236,234,.78); }
.lhv-v1-chip svg { width: 13px; height: 13px; color: ${GREEN}; }

/* ===== V2: Editorial ===== */
.lhv-v2-stage { flex: 1; display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 56px; align-items: center; position: relative; }
.lhv-v2-text { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
.lhv-v2-headline { font-family: Georgia, 'Times New Roman', serif; font-weight: 400; font-style: italic; font-size: clamp(48px, 6.4vw, 96px); line-height: .94; letter-spacing: -.03em; margin: 0; }
.lhv-v2-headline em { font-style: normal; font-weight: 900; color: ${GREEN}; font-family: 'Inter', sans-serif; letter-spacing: -.04em; }
.lhv-v2-headline .strike { font-weight: 300; color: rgba(255,255,255,.55); position: relative; display: inline-block; }
.lhv-v2-headline .strike::after { content: ''; position: absolute; left: -2%; right: -2%; top: 53%; height: 4px; background: ${GREEN}; transform: rotate(-2deg); border-radius: 2px; }
.lhv-v2-sub { max-width: 540px; font-size: 15px; line-height: 1.6; color: rgba(232,236,234,.72); }
.lhv-v2-sub b { color: white; font-weight: 700; }
.lhv-v2-tags { display: flex; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: rgba(232,236,234,.5); flex-wrap: wrap; }
.lhv-v2-tags span::after { content: '·'; margin: 0 6px 0 8px; opacity: .5; }
.lhv-v2-tags span:last-child::after { display: none; }

/* Columna derecha: orb centrado con halo verde */
.lhv-v2-orb-col { position: relative; display: grid; place-items: center; align-self: center; height: 100%; min-height: 420px; }
.lhv-v2-orb-col::before {
  content: '';
  position: absolute;
  width: min(560px, 60vh);
  height: min(560px, 60vh);
  border-radius: 50%;
  background: radial-gradient(circle, ${GREEN}38 0%, ${GREEN}12 35%, transparent 65%);
  filter: blur(30px);
  animation: lhv-v2-halo 7s ease-in-out infinite;
  pointer-events: none;
}
@keyframes lhv-v2-halo { 0%,100% { transform: scale(1); opacity: .85; } 50% { transform: scale(1.06); opacity: 1; } }
.lhv-v2-orb { position: relative; width: min(380px, 48vh); height: min(380px, 48vh); animation: lhv-v2-bob 6s ease-in-out infinite; filter: drop-shadow(0 20px 50px ${GREEN}66); z-index: 2; }
@keyframes lhv-v2-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
.lhv-v2-orb-meta { position: absolute; bottom: 6%; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: rgba(232,236,234,.4); display: inline-flex; align-items: center; gap: 6px; z-index: 3; }
.lhv-v2-orb-meta .dot { width: 6px; height: 6px; border-radius: 50%; background: ${GREEN}; box-shadow: 0 0 8px ${GREEN}; animation: lhv-pulse 1.2s ease-out infinite; }
@keyframes lhv-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: .5; } }

@media (max-width: 1100px) {
  .lhv-v2-stage { grid-template-columns: 1fr; gap: 32px; }
  .lhv-v2-orb-col { min-height: 300px; }
  .lhv-v2-orb { width: min(280px, 40vh); height: min(280px, 40vh); }
}

/* ===== V3: Constelación ===== */
.lhv-v3-stage { flex: 1; position: relative; display: flex; flex-direction: column; justify-content: center; }
.lhv-v3-constellation { position: absolute; inset: 0; pointer-events: none; }
.lhv-v3-orb { position: absolute; }
.lhv-v3-orb.o1 { top: 8%;  left: 60%; width: 180px; height: 180px; animation: lhv-v3-drift1 10s ease-in-out infinite; }
.lhv-v3-orb.o2 { top: 40%; left: 80%; width: 110px; height: 110px; animation: lhv-v3-drift2 12s ease-in-out infinite; opacity: .8; }
.lhv-v3-orb.o3 { top: 70%; left: 65%; width: 140px; height: 140px; animation: lhv-v3-drift3 14s ease-in-out infinite; opacity: .7; }
.lhv-v3-orb.o4 { top: 15%; left: 90%; width: 80px;  height: 80px;  animation: lhv-v3-drift1 16s ease-in-out infinite reverse; opacity: .5; }
@keyframes lhv-v3-drift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-18px,12px); } }
@keyframes lhv-v3-drift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(12px,-15px); } }
@keyframes lhv-v3-drift3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-10px,-10px); } }
.lhv-v3-content { position: relative; max-width: 540px; }
.lhv-v3-content h1 { font-size: clamp(36px, 4.5vw, 56px); font-weight: 900; line-height: 1.05; letter-spacing: -.025em; margin: 14px 0; }
.lhv-v3-content h1 em { font-style: normal; color: ${GREEN}; }
.lhv-v3-content p { font-size: 16px; color: rgba(232,236,234,.7); line-height: 1.55; max-width: 460px; }
.lhv-v3-stats { display: flex; gap: 28px; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,.10); position: relative; }
.lhv-v3-stat { display: flex; flex-direction: column; gap: 2px; }
.lhv-v3-stat .n { font-size: 28px; font-weight: 800; letter-spacing: -.02em; color: white; }
.lhv-v3-stat .l { font-size: 11px; color: rgba(232,236,234,.5); font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }

/* ===== V4: Studio Live ===== */
.lhv-v4-stage { flex: 1; display: flex; flex-direction: column; gap: 30px; position: relative; }
.lhv-v4-top { display: flex; align-items: center; gap: 18px; }
.lhv-v4-orb { width: 160px; height: 160px; position: relative; flex-shrink: 0; }
.lhv-v4-status { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: ${GREEN}; display: inline-flex; align-items: center; gap: 8px; }
.lhv-v4-status .pulse { width: 9px; height: 9px; border-radius: 50%; background: ${GREEN}; box-shadow: 0 0 12px ${GREEN}; animation: lhv-v4-pulse 1.2s ease-out infinite; }
@keyframes lhv-v4-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: .6; } }
.lhv-v4-wave { display: flex; align-items: center; gap: 3px; flex: 1; height: 64px; }
.lhv-v4-wave i { display: block; width: 4px; background: linear-gradient(180deg, ${GREEN}, ${GREEN_DARK}); border-radius: 2px; animation: lhv-v4-bars 1.2s ease-in-out infinite; }
@keyframes lhv-v4-bars { 0%,100% { height: 18%; } 50% { height: 92%; } }
.lhv-v4-headline { font-size: clamp(40px, 5vw, 64px); font-weight: 900; letter-spacing: -.03em; line-height: 1.02; margin: 0; }
.lhv-v4-headline em { font-style: normal; color: ${GREEN}; }
.lhv-v4-sub { font-size: 15.5px; color: rgba(232,236,234,.7); line-height: 1.5; max-width: 500px; }
.lhv-v4-sub b { color: white; }
.lhv-v4-transcript { background: rgba(0,179,126,.08); border: 1px solid rgba(0,179,126,.25); border-radius: 14px; padding: 14px 18px; max-width: 480px; }
.lhv-v4-transcript .who { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: ${GREEN}; font-weight: 700; margin-bottom: 4px; }
.lhv-v4-transcript .txt { font-size: 14.5px; line-height: 1.5; color: rgba(232,236,234,.92); font-style: italic; }
.lhv-v4-transcript .typed { display: inline-block; overflow: hidden; white-space: nowrap; animation: lhv-v4-type 4s steps(60) infinite; }
@keyframes lhv-v4-type { 0% { max-width: 0; } 60%,100% { max-width: 100%; } }

/* ===== V5: Pulsos ===== */
.lhv-v5-stage { flex: 1; display: grid; place-items: center; position: relative; }
.lhv-v5-center { position: relative; width: 100%; max-width: 560px; display: grid; place-items: center; padding: 80px 0; }
.lhv-v5-rings { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.lhv-v5-rings i { position: absolute; border-radius: 50%; border: 1px solid ${GREEN}; opacity: 0; animation: lhv-v5-ring 4s ease-out infinite; }
.lhv-v5-rings i:nth-child(1) { width: 220px; height: 220px; animation-delay: 0s; }
.lhv-v5-rings i:nth-child(2) { width: 220px; height: 220px; animation-delay: 1.2s; }
.lhv-v5-rings i:nth-child(3) { width: 220px; height: 220px; animation-delay: 2.4s; }
@keyframes lhv-v5-ring { 0% { transform: scale(.5); opacity: 0; } 25% { opacity: .6; } 100% { transform: scale(2.6); opacity: 0; } }
.lhv-v5-orb { width: 220px; height: 220px; z-index: 2; position: relative; }
.lhv-v5-headline { text-align: center; margin-top: 20px; }
.lhv-v5-headline .lbl { font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: ${GREEN}; font-weight: 800; margin-bottom: 14px; }
.lhv-v5-headline h1 { font-size: clamp(34px, 4.5vw, 54px); font-weight: 900; letter-spacing: -.025em; line-height: 1.05; margin: 0 0 12px; }
.lhv-v5-headline h1 em { font-style: italic; color: ${GREEN}; font-weight: 800; }
.lhv-v5-headline p { font-size: 15.5px; color: rgba(232,236,234,.65); max-width: 460px; margin: 0 auto; line-height: 1.5; }
.lhv-v5-flow { margin-top: 32px; display: flex; gap: 14px; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: rgba(232,236,234,.45); }
.lhv-v5-flow .step { padding: 6px 12px; border-radius: 99px; border: 1px solid rgba(255,255,255,.10); color: rgba(232,236,234,.7); }
.lhv-v5-flow .step.active { color: ${GREEN}; border-color: ${GREEN}55; background: rgba(0,179,126,.12); }

/* ===== V6: Bento ===== */
.lhv-v6-stage { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto 1fr 1fr; gap: 14px; }
.lhv-v6-headline-cell { grid-column: 1 / -1; }
.lhv-v6-headline-cell h1 { font-size: clamp(34px, 4vw, 48px); font-weight: 900; letter-spacing: -.025em; line-height: 1.05; margin: 0 0 6px; }
.lhv-v6-headline-cell h1 em { font-style: normal; color: ${GREEN}; }
.lhv-v6-headline-cell p { font-size: 14.5px; color: rgba(232,236,234,.65); margin: 0; max-width: 540px; line-height: 1.5; }
.lhv-v6-cell { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 18px; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; transition: all .3s ease; }
.lhv-v6-cell:hover { background: rgba(255,255,255,.07); transform: translateY(-2px); }
.lhv-v6-cell .ico { width: 36px; height: 36px; border-radius: 10px; background: rgba(0,179,126,.18); color: ${GREEN}; display: grid; place-items: center; }
.lhv-v6-cell .lbl { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: rgba(232,236,234,.5); font-weight: 700; }
.lhv-v6-cell .val { font-size: 22px; font-weight: 800; color: white; letter-spacing: -.015em; }
.lhv-v6-cell .desc { font-size: 12.5px; color: rgba(232,236,234,.6); line-height: 1.45; }
.lhv-v6-cell.orb-cell { grid-row: span 2; align-items: center; justify-content: center; padding: 12px; background: linear-gradient(160deg, rgba(0,179,126,.12), rgba(0,179,126,.02)); border-color: rgba(0,179,126,.25); }
.lhv-v6-cell.orb-cell .orb-wrap { width: 180px; height: 180px; }
.lhv-v6-cell.orb-cell .orb-label { margin-top: 12px; text-align: center; }
.lhv-v6-cell.orb-cell .orb-label .n { font-size: 14px; font-weight: 800; color: white; }
.lhv-v6-cell.orb-cell .orb-label .s { font-size: 11px; color: ${GREEN}; font-family: 'JetBrains Mono', monospace; letter-spacing: .14em; text-transform: uppercase; }
.lhv-v6-cell.live::after { content: ''; position: absolute; top: 14px; right: 14px; width: 8px; height: 8px; border-radius: 50%; background: ${GREEN}; box-shadow: 0 0 0 0 ${GREEN}80; animation: lhv-v6-live 1.5s ease-out infinite; }
@keyframes lhv-v6-live { 0% { box-shadow: 0 0 0 0 ${GREEN}80; } 100% { box-shadow: 0 0 0 12px ${GREEN}00; } }

@media (prefers-reduced-motion: reduce) {
  .lhv-v1-orb, .lhv-v2-orb-corner, .lhv-v3-orb, .lhv-v4-wave i, .lhv-v5-rings i, .lhv-v6-cell.live::after { animation: none !important; }
}
`

function BrandBlock(): ReactNode {
  return (
    <div className="lhv-brand">
      <div className="lhv-brand-mark">
        <img src="/logos/hablah-mark.svg" alt="" width="28" height="28" />
      </div>
      <div>
        <div className="lhv-brand-name">habláh</div>
        <div className="lhv-brand-sub">Hablás. Aprendés.</div>
      </div>
    </div>
  )
}

function FooterBlock(): ReactNode {
  return (
    <div className="lhv-footer">
      <div>Habláh · v0.1 MVP</div>
      <div>Hecho en LatAm · 2026</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// V1: Orb Hero protagonista central
// ─────────────────────────────────────────────────────────────
function VariantOrbHero({ level }: { level: number }) {
  return (
    <>
      <BrandBlock />
      <div className="lhv-v1-stage">
        <div className="lhv-v1-orb-wrap">
          <div className="lhv-v1-orb">
            <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.10} themeMode="dark" size="lg" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', position: 'relative', zIndex: 2 }}>
          <span className="lhv-eyebrow"><Sparkles /> Tutor de IA conversacional</span>
          <div className="lhv-v1-headline">
            <h1>Aprendés <em>hablando</em>.<br/>Sin lecciones, sin pizarrón.</h1>
            <p>5 minutos por día con un tutor que entiende lo que decís, te corrige sin interrumpir y se adapta a tu nivel.</p>
          </div>
          <div className="lhv-v1-chips">
            <span className="lhv-v1-chip"><Mic /> Voz nativa</span>
            <span className="lhv-v1-chip"><Languages /> 3 idiomas</span>
            <span className="lhv-v1-chip"><Flame /> Racha diaria</span>
            <span className="lhv-v1-chip"><Heart /> Cero juicio</span>
          </div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V2: Editorial tipografía gigante
// ─────────────────────────────────────────────────────────────
function VariantEditorial({ level }: { level: number }) {
  return (
    <>
      <BrandBlock />
      <div className="lhv-v2-stage">
        <div className="lhv-v2-text">
          <span className="lhv-eyebrow"><Zap /> Conversaciones reales</span>
          <h1 className="lhv-v2-headline">
            Hablás.<br/>
            <em>Aprendés.</em><br/>
            Sin <span className="strike">exámenes</span>.
          </h1>
          <p className="lhv-v2-sub">
            Conversaciones reales con un <b>tutor de IA</b> que se adapta a tu nivel, tus intereses y tus errores.
            Olvidate de las lecciones lineales — acá cada charla es distinta, como con un amigo paciente que sabe inglés.
          </p>
          <div className="lhv-v2-tags">
            <span>5 min/día</span>
            <span>nivel CEFR A1-C2</span>
            <span>Inglés · Portugués · Italiano</span>
            <span>v0.1 MVP</span>
          </div>
        </div>
        <div className="lhv-v2-orb-col">
          <div className="lhv-v2-orb">
            <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.10} themeMode="dark" size="lg" />
          </div>
          <div className="lhv-v2-orb-meta">
            <span className="dot" /> Tu tutor te espera
          </div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V3: Constelación con multi-orbs flotando
// ─────────────────────────────────────────────────────────────
function VariantConstellation({ level }: { level: number }) {
  return (
    <>
      <BrandBlock />
      <div className="lhv-v3-stage">
        <div className="lhv-v3-constellation">
          <div className="lhv-v3-orb o1"><AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.08} themeMode="dark" size="md" /></div>
          <div className="lhv-v3-orb o2"><AgentAudioVisualizerAura status="speaking" audioLevel={level * 0.8} color="#5EE0B0" colorShift={0.10} themeMode="dark" size="md" /></div>
          <div className="lhv-v3-orb o3"><AgentAudioVisualizerAura status="speaking" audioLevel={level * 1.1} color="#22D3EE" colorShift={0.06} themeMode="dark" size="md" /></div>
          <div className="lhv-v3-orb o4"><AgentAudioVisualizerAura status="speaking" audioLevel={level * 0.7} color="#FFB800" colorShift={0.04} themeMode="dark" size="md" /></div>
        </div>
        <div className="lhv-v3-content">
          <span className="lhv-eyebrow"><Globe /> Un mundo de temas</span>
          <h1>Charlás de lo que <em>te interesa</em> — sin programas rígidos.</h1>
          <p>Cada tópico es un universo. Música, código, viajes, ciencia. Elegís el orb y arrancás. Tu nivel se calibra solo.</p>
          <div className="lhv-v3-stats">
            <div className="lhv-v3-stat"><div className="n">96+</div><div className="l">Tópicos curados</div></div>
            <div className="lhv-v3-stat"><div className="n">3</div><div className="l">Idiomas activos</div></div>
            <div className="lhv-v3-stat"><div className="n">5 min</div><div className="l">Por sesión</div></div>
          </div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V4: Studio Live - orb + waveform + transcript
// ─────────────────────────────────────────────────────────────
function VariantStudioLive({ level }: { level: number }) {
  const N_BARS = 28
  return (
    <>
      <BrandBlock />
      <div className="lhv-v4-stage">
        <div className="lhv-v4-top">
          <div className="lhv-v4-orb">
            <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.08} themeMode="dark" size="md" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="lhv-v4-status">
              <span className="pulse" /> Tutor en vivo
            </div>
            <div className="lhv-v4-wave" style={{ marginTop: 8 }}>
              {Array.from({ length: N_BARS }).map((_, i) => (
                <i key={i} style={{ animationDelay: `${(i * 0.06) % 1.2}s` }} />
              ))}
            </div>
          </div>
        </div>
        <span className="lhv-eyebrow"><Mic /> Charla por voz · realtime</span>
        <h1 className="lhv-v4-headline">
          Tu micrófono.<br/><em>Su respuesta.</em><br/>Cero teclado.
        </h1>
        <p className="lhv-v4-sub">
          El tutor escucha lo que decís, te entiende aunque te trabes, y responde en voz como un humano. <b>Latencia ~500ms</b> — se siente real.
        </p>
        <div className="lhv-v4-transcript">
          <div className="who">Tutor · ahora</div>
          <div className="txt"><span className="typed">"Oh, you like jazz? Have you ever heard Coltrane's <i>Giant Steps</i>?"</span></div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V5: Pulsos concéntricos
// ─────────────────────────────────────────────────────────────
function VariantPulses({ level }: { level: number }) {
  return (
    <>
      <BrandBlock />
      <div className="lhv-v5-stage">
        <div className="lhv-v5-center">
          <div className="lhv-v5-rings">
            <i /><i /><i />
          </div>
          <div className="lhv-v5-orb">
            <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.08} themeMode="dark" size="lg" />
          </div>
          <div className="lhv-v5-headline">
            <div className="lbl">Escucha · Procesa · Responde</div>
            <h1>El loop de un<br/><em>hablante real</em>.</h1>
            <p>No memorices reglas. Hablá, equivocate, escuchá la versión correcta en contexto. Tu cerebro aprende como aprendió a hablar tu lengua materna.</p>
          </div>
          <div className="lhv-v5-flow">
            <span className="step">Hablás</span>
            <span>→</span>
            <span className="step active">Habi escucha</span>
            <span>→</span>
            <span className="step">Responde</span>
          </div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// V6: Bento grid con stats + orb
// ─────────────────────────────────────────────────────────────
function VariantBento({ level }: { level: number }) {
  return (
    <>
      <BrandBlock />
      <div className="lhv-v6-stage">
        <div className="lhv-v6-headline-cell">
          <span className="lhv-eyebrow" style={{ marginBottom: 12 }}><Sparkles /> Bienvenido de vuelta</span>
          <h1>Tu próxima charla <em>te espera</em>.</h1>
          <p>Recogemos donde quedaste. Mismo tutor, mismo tópico, nuevas palabras. 5 minutos y hoy ya sumaste.</p>
        </div>
        <div className="lhv-v6-cell orb-cell">
          <div className="orb-wrap">
            <AgentAudioVisualizerAura status="speaking" audioLevel={level} color={GREEN as `#${string}`} colorShift={0.08} themeMode="dark" size="md" />
          </div>
          <div className="orb-label">
            <div className="n">Tu tutor listo</div>
            <div className="s">Disponible 24/7</div>
          </div>
        </div>
        <div className="lhv-v6-cell live">
          <div className="ico"><Mic size={18} /></div>
          <div className="lbl">Modo</div>
          <div className="val">Voz nativa</div>
          <div className="desc">Hablás como con un humano. Latencia 500ms.</div>
        </div>
        <div className="lhv-v6-cell">
          <div className="ico"><Languages size={18} /></div>
          <div className="lbl">Idiomas activos</div>
          <div className="val">3 disponibles</div>
          <div className="desc">Inglés · Portugués · Italiano</div>
        </div>
        <div className="lhv-v6-cell">
          <div className="ico"><Flame size={18} /></div>
          <div className="lbl">Racha</div>
          <div className="val">Hábito diario</div>
          <div className="desc">Empieza hoy, mantenela mañana, mejora la próxima.</div>
        </div>
      </div>
      <FooterBlock />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Wrapper
// ─────────────────────────────────────────────────────────────
import { LoginHeroPlus } from './LoginHeroVariantsPlus'

export function LoginHero({ variant }: { variant: number }) {
  const level = useOscillatingLevel()
  // Variants 7-12 viven en LoginHeroVariantsPlus (mas creativas)
  if (variant >= 7 && variant <= 12) {
    return (
      <div className="lhv-root">
        <LoginHeroPlus variant={variant} level={level} />
      </div>
    )
  }
  const renderVariant = () => {
    switch (variant) {
      case 1: return <VariantOrbHero level={level} />
      case 2: return <VariantEditorial level={level} />
      case 3: return <VariantConstellation level={level} />
      case 4: return <VariantStudioLive level={level} />
      case 5: return <VariantPulses level={level} />
      case 6: return <VariantBento level={level} />
      default: return <VariantOrbHero level={level} />
    }
  }
  return (
    <div className="lhv-root">
      <style>{SHARED_STYLES}</style>
      <div className="lhv-glow-a" />
      <div className="lhv-glow-b" />
      {renderVariant()}
    </div>
  )
}

// Botonera selector
interface VariantPickerProps {
  variant: number
  onChange: (v: number) => void
}
export function VariantPicker({ variant, onChange }: VariantPickerProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      gap: 4,
      padding: 5,
      borderRadius: 99,
      background: 'rgba(13,20,18,.92)',
      border: '1px solid rgba(255,255,255,.14)',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 24px rgba(0,0,0,.5)',
      maxWidth: '94vw',
      overflowX: 'auto',
    }}>
      {VARIANT_LABELS.map((v) => {
        const active = v.id === variant
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            title={`${v.name} — ${v.tagline}`}
            style={{
              padding: '6px 11px',
              borderRadius: 99,
              border: 0,
              cursor: 'pointer',
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              background: active ? GREEN : 'transparent',
              color: active ? '#3A2A00' : 'rgba(255,255,255,.7)',
              transition: 'all .15s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.08)' }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ opacity: active ? 1 : .55, fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{v.id}</span>
            <span>{v.name}</span>
          </button>
        )
      })}
    </div>
  )
}

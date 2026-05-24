/**
 * Mini-escenas SVG animadas por topic.
 *
 * Reemplazan el icono estático de las kids-topic cards.
 * Cada escena es viewBox 200x120, escala al contenedor (.t-scene)
 * con CSS keyframes locales — sin libs, peso bajo, mobile-friendly.
 *
 * Cobertura inicial: 10 topics MINI. Junior/Tween caen en GenericScene
 * hasta que armemos sus escenas dedicadas.
 */
import type { JSX } from 'react'

interface SceneProps {
  color?: string
}

const SCENE_CSS = `
.kids-scene-svg { width:100%; height:100%; display:block; overflow:visible; }

/* === FAMILIA: 3 figuritas que respiran con offset === */
@keyframes ks-fam-bounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2.5px) } }
.ks-fam-dad { animation: ks-fam-bounce 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
.ks-fam-mom { animation: ks-fam-bounce 2.4s ease-in-out infinite; animation-delay:-.4s; transform-box: fill-box; transform-origin: 50% 100%; }
.ks-fam-kid { animation: ks-fam-bounce 2.0s ease-in-out infinite; animation-delay:-.8s; transform-box: fill-box; transform-origin: 50% 100%; }
@keyframes ks-sun-rot { from { transform: rotate(0) } to { transform: rotate(360deg) } }
.ks-sun-rays { animation: ks-sun-rot 18s linear infinite; transform-origin: center; transform-box: fill-box; }

/* === COLORES: gotas que se mezclan === */
@keyframes ks-blob-1 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(6px,-3px) scale(1.08) } }
@keyframes ks-blob-2 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(-5px,4px) scale(1.06) } }
@keyframes ks-blob-3 { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(3px,5px) scale(1.1) } }
.ks-blob-1 { animation: ks-blob-1 3.2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.ks-blob-2 { animation: ks-blob-2 3.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.ks-blob-3 { animation: ks-blob-3 3.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }

/* === ANIMALES: vaca caminando (cola y cabeza) === */
@keyframes ks-tail-wag { 0%,100% { transform: rotate(-12deg) } 50% { transform: rotate(18deg) } }
@keyframes ks-head-nod { 0%,100% { transform: translateY(0) rotate(0) } 50% { transform: translateY(2px) rotate(-4deg) } }
@keyframes ks-cloud-drift { from { transform: translateX(0) } to { transform: translateX(8px) } }
.ks-cow-tail { animation: ks-tail-wag 1.6s ease-in-out infinite; transform-origin: 0% 50%; transform-box: fill-box; }
.ks-cow-head { animation: ks-head-nod 2.4s ease-in-out infinite; transform-origin: 50% 100%; transform-box: fill-box; }
.ks-cloud { animation: ks-cloud-drift 5s ease-in-out infinite alternate; }

/* === CONTEO: 1-2-3 apareciendo en secuencia === */
@keyframes ks-num-pop {
  0%, 20% { opacity: 0; transform: scale(.4); }
  30%, 60% { opacity: 1; transform: scale(1); }
  70%, 100% { opacity: 0; transform: scale(1.3); }
}
.ks-num { animation: ks-num-pop 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; opacity:0; }
.ks-num-1 { animation-delay: 0s; }
.ks-num-2 { animation-delay: 1s; }
.ks-num-3 { animation-delay: 2s; }

/* === CUERPO: jumping jacks === */
@keyframes ks-body-jump { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
@keyframes ks-arm-l { 0%,100% { transform: rotate(20deg) } 50% { transform: rotate(-60deg) } }
@keyframes ks-arm-r { 0%,100% { transform: rotate(-20deg) } 50% { transform: rotate(60deg) } }
@keyframes ks-leg-l { 0%,100% { transform: rotate(-8deg) } 50% { transform: rotate(-22deg) } }
@keyframes ks-leg-r { 0%,100% { transform: rotate(8deg) } 50% { transform: rotate(22deg) } }
.ks-body { animation: ks-body-jump .9s ease-in-out infinite; }
.ks-arm-l { animation: ks-arm-l .9s ease-in-out infinite; transform-origin: 100% 0%; transform-box: fill-box; }
.ks-arm-r { animation: ks-arm-r .9s ease-in-out infinite; transform-origin: 0% 0%; transform-box: fill-box; }
.ks-leg-l { animation: ks-leg-l .9s ease-in-out infinite; transform-origin: 50% 0%; transform-box: fill-box; }
.ks-leg-r { animation: ks-leg-r .9s ease-in-out infinite; transform-origin: 50% 0%; transform-box: fill-box; }

/* === COMIDA: 3 items flotando en órbita === */
@keyframes ks-orbit-1 { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-3px) rotate(4deg) } }
@keyframes ks-orbit-2 { 0%,100% { transform: translateY(-2px) rotate(3deg) } 50% { transform: translateY(2px) rotate(-3deg) } }
@keyframes ks-orbit-3 { 0%,100% { transform: translateY(2px) rotate(-3deg) } 50% { transform: translateY(-4px) rotate(5deg) } }
.ks-food-1 { animation: ks-orbit-1 2.8s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.ks-food-2 { animation: ks-orbit-2 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.ks-food-3 { animation: ks-orbit-3 3.2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }

/* === CAJA: tapa que se abre con sorpresa === */
@keyframes ks-lid { 0%,40% { transform: rotate(0) translateY(0) } 50%,70% { transform: rotate(-60deg) translateY(-2px) } 80%,100% { transform: rotate(0) translateY(0) } }
@keyframes ks-pop { 0%,40% { transform: translateY(0) scale(.5); opacity:0 } 55%,75% { transform: translateY(-8px) scale(1.1); opacity:1 } 85%,100% { transform: translateY(0) scale(0); opacity:0 } }
@keyframes ks-sparkle { 0%,40% { opacity:0; transform:scale(0) } 55%,70% { opacity:1; transform:scale(1) } 100% { opacity:0; transform:scale(.5) } }
.ks-lid { animation: ks-lid 3.4s ease-in-out infinite; transform-origin: 0% 100%; transform-box: fill-box; }
.ks-pop { animation: ks-pop 3.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; opacity:0; }
.ks-sparkle { animation: ks-sparkle 3.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; opacity:0; }
.ks-sparkle-a { animation-delay: 0s; }
.ks-sparkle-b { animation-delay: .2s; }
.ks-sparkle-c { animation-delay: .4s; }

/* === HÉROE: estrella con capa volando === */
@keyframes ks-fly { 0%,100% { transform: translate(0,0) rotate(-4deg) } 50% { transform: translate(4px,-5px) rotate(4deg) } }
@keyframes ks-cape { 0%,100% { transform: skewY(-8deg) } 50% { transform: skewY(8deg) } }
.ks-hero { animation: ks-fly 2.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.ks-cape { animation: ks-cape 1.2s ease-in-out infinite; transform-origin: 50% 0%; transform-box: fill-box; }

/* === GAMING: control con botones que pulsan === */
@keyframes ks-press { 0%,40% { transform: scale(1); fill-opacity:.6 } 50%,60% { transform: scale(1.4); fill-opacity:1 } 70%,100% { transform: scale(1); fill-opacity:.6 } }
.ks-btn-a { animation: ks-press 1.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.ks-btn-b { animation: ks-press 1.6s ease-in-out infinite; animation-delay: -.8s; transform-origin: center; transform-box: fill-box; }
.ks-stick { animation: ks-fam-bounce 1.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }

/* === HELADO: bolas que rebotan === */
@keyframes ks-scoop-1 { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) scale(1.04) } }
@keyframes ks-scoop-2 { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) scale(1.04) } }
@keyframes ks-drip { 0% { transform: translateY(0) scaleY(.4); opacity:0 } 40% { opacity:1 } 100% { transform: translateY(12px) scaleY(1.6); opacity:0 } }
.ks-scoop-1 { animation: ks-scoop-1 2.2s ease-in-out infinite; transform-origin: 50% 100%; transform-box: fill-box; }
.ks-scoop-2 { animation: ks-scoop-2 2.2s ease-in-out infinite; animation-delay:-1s; transform-origin: 50% 100%; transform-box: fill-box; }
.ks-drip { animation: ks-drip 2.8s ease-in infinite; transform-origin: 50% 0%; transform-box: fill-box; opacity:0; }

/* === GENERIC: pulse simple === */
@keyframes ks-gen { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
.ks-gen { animation: ks-gen 2.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }

/* prefers-reduced-motion: cortar todo */
@media (prefers-reduced-motion: reduce) {
  .kids-scene-svg *, .kids-scene-svg { animation: none !important; }
}
`

/* helper: oscurecer un color hex en X% para crear sombras/segundos tonos */
function shade(hex: string, pct: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 + pct))))
  return `#${adj(r).toString(16).padStart(2, '0')}${adj(g).toString(16).padStart(2, '0')}${adj(b).toString(16).padStart(2, '0')}`
}

/* ──────────────────────────────────────────────
   ESCENAS — viewBox 200x120
   ────────────────────────────────────────────── */

function SceneFamily({ color = '#EC4899' }: SceneProps) {
  const dark = shade(color, -0.25)
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      {/* sol */}
      <g transform="translate(170,20)">
        <circle r="9" fill="#FFB800" />
        <g className="ks-sun-rays" stroke="#FFB800" strokeWidth="1.8" strokeLinecap="round">
          <line x1="0" y1="-14" x2="0" y2="-18" />
          <line x1="0" y1="14" x2="0" y2="18" />
          <line x1="-14" y1="0" x2="-18" y2="0" />
          <line x1="14" y1="0" x2="18" y2="0" />
          <line x1="-10" y1="-10" x2="-13" y2="-13" />
          <line x1="10" y1="10" x2="13" y2="13" />
          <line x1="-10" y1="10" x2="-13" y2="13" />
          <line x1="10" y1="-10" x2="13" y2="-13" />
        </g>
      </g>
      {/* línea piso */}
      <line x1="20" y1="108" x2="180" y2="108" stroke={color} strokeOpacity=".25" strokeWidth="2.5" strokeLinecap="round" />
      {/* manos curva */}
      <path d="M62 70 Q 80 78 95 72" stroke={dark} strokeWidth="2" fill="none" opacity=".4" strokeLinecap="round" />
      <path d="M111 75 Q 128 82 138 80" stroke={dark} strokeWidth="2" fill="none" opacity=".4" strokeLinecap="round" />
      {/* PAPÁ */}
      <g className="ks-fam-dad">
        <circle cx="55" cy="58" r="8.5" fill={color} />
        <rect x="48" y="67" width="14" height="24" rx="3" fill={color} />
        <rect x="50" y="89" width="3.5" height="17" rx="1.5" fill={dark} />
        <rect x="56.5" y="89" width="3.5" height="17" rx="1.5" fill={dark} />
      </g>
      {/* MAMÁ */}
      <g className="ks-fam-mom">
        <circle cx="103" cy="62" r="7.5" fill={color} />
        <path d="M95 69 L111 69 L113 92 L93 92 Z" fill={color} />
        <rect x="98" y="92" width="3.5" height="14" rx="1.5" fill={dark} />
        <rect x="104.5" y="92" width="3.5" height="14" rx="1.5" fill={dark} />
      </g>
      {/* HIJO */}
      <g className="ks-fam-kid">
        <circle cx="143" cy="74" r="6" fill={color} />
        <rect x="138" y="80" width="10" height="18" rx="2.5" fill={color} />
        <rect x="139.5" y="98" width="3" height="10" rx="1.2" fill={dark} />
        <rect x="145" y="98" width="3" height="10" rx="1.2" fill={dark} />
      </g>
    </svg>
  )
}

function SceneColors({ color }: SceneProps) {
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      {/* paleta de pintor estilizada */}
      <ellipse cx="100" cy="98" rx="78" ry="10" fill={color ?? '#FF6AA9'} opacity=".15" />
      {/* gota roja */}
      <g className="ks-blob-1">
        <ellipse cx="60" cy="62" rx="26" ry="24" fill="#FF6AA9" />
        <ellipse cx="52" cy="55" rx="6" ry="4" fill="#fff" opacity=".4" />
      </g>
      {/* gota azul */}
      <g className="ks-blob-2">
        <ellipse cx="115" cy="50" rx="24" ry="22" fill="#3B82F6" />
        <ellipse cx="108" cy="44" rx="5" ry="3.5" fill="#fff" opacity=".4" />
      </g>
      {/* gota amarilla */}
      <g className="ks-blob-3">
        <ellipse cx="148" cy="72" rx="22" ry="20" fill="#FACC15" />
        <ellipse cx="142" cy="66" rx="5" ry="3.5" fill="#fff" opacity=".4" />
      </g>
    </svg>
  )
}

function SceneAnimalsFarm({ color = '#22C55E' }: SceneProps) {
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      {/* cielo + nube */}
      <g className="ks-cloud">
        <ellipse cx="40" cy="22" rx="16" ry="7" fill="#fff" opacity=".9" />
        <ellipse cx="52" cy="20" rx="10" ry="6" fill="#fff" opacity=".9" />
      </g>
      {/* pasto */}
      <path d="M0 108 Q 50 100 100 108 T 200 108 L 200 120 L 0 120 Z" fill={color} opacity=".25" />
      {/* vaca */}
      <g transform="translate(70,55)">
        {/* cuerpo */}
        <ellipse cx="35" cy="35" rx="38" ry="22" fill="#fff" stroke="#1A1410" strokeWidth="2" />
        {/* manchas */}
        <ellipse cx="20" cy="28" rx="8" ry="6" fill="#1A1410" />
        <ellipse cx="48" cy="40" rx="6" ry="4.5" fill="#1A1410" />
        <ellipse cx="58" cy="28" rx="4" ry="3" fill="#1A1410" />
        {/* patas */}
        <rect x="10" y="52" width="5" height="14" fill="#1A1410" />
        <rect x="22" y="54" width="5" height="12" fill="#1A1410" />
        <rect x="46" y="54" width="5" height="12" fill="#1A1410" />
        <rect x="58" y="52" width="5" height="14" fill="#1A1410" />
        {/* cola */}
        <g className="ks-cow-tail" transform="translate(70,30)">
          <path d="M0 0 Q 6 4 8 12" stroke="#1A1410" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="8" cy="13" r="2.5" fill="#1A1410" />
        </g>
        {/* cabeza */}
        <g className="ks-cow-head" transform="translate(-2,18)">
          <ellipse cx="0" cy="14" rx="11" ry="13" fill="#fff" stroke="#1A1410" strokeWidth="2" />
          <ellipse cx="0" cy="20" rx="6" ry="5" fill="#FFB8C8" />
          <circle cx="-3" cy="20" r="1" fill="#1A1410" />
          <circle cx="3" cy="20" r="1" fill="#1A1410" />
          <circle cx="-4" cy="11" r="1.5" fill="#1A1410" />
          <circle cx="4" cy="11" r="1.5" fill="#1A1410" />
          {/* orejas */}
          <ellipse cx="-9" cy="6" rx="3" ry="4" fill="#1A1410" transform="rotate(-30 -9 6)" />
          <ellipse cx="9" cy="6" rx="3" ry="4" fill="#1A1410" transform="rotate(30 9 6)" />
        </g>
      </g>
    </svg>
  )
}

function SceneCounting({ color = '#FACC15' }: SceneProps) {
  const dark = shade(color, -0.3)
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <ellipse cx="100" cy="100" rx="72" ry="8" fill={color} opacity=".18" />
      {/* tres números rotando en spotlight */}
      <g fontFamily="ui-rounded, 'Comic Sans MS', system-ui" fontWeight="900" textAnchor="middle">
        <text x="55" y="78" fontSize="62" fill={dark} className="ks-num ks-num-1">1</text>
        <text x="100" y="78" fontSize="62" fill={color} className="ks-num ks-num-2">2</text>
        <text x="145" y="78" fontSize="62" fill={dark} className="ks-num ks-num-3">3</text>
      </g>
    </svg>
  )
}

function SceneBody({ color = '#06B6D4' }: SceneProps) {
  const dark = shade(color, -0.25)
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      {/* piso */}
      <line x1="40" y1="108" x2="160" y2="108" stroke={color} strokeOpacity=".3" strokeWidth="2.5" strokeLinecap="round" />
      <g className="ks-body" transform="translate(100,30)">
        {/* cabeza */}
        <circle cx="0" cy="10" r="10" fill={color} />
        <circle cx="-3" cy="9" r="1.5" fill="#fff" />
        <circle cx="3" cy="9" r="1.5" fill="#fff" />
        {/* cuerpo */}
        <rect x="-7" y="20" width="14" height="24" rx="4" fill={color} />
        {/* brazos */}
        <rect x="-7" y="22" width="3" height="22" rx="1.5" fill={dark} className="ks-arm-l" />
        <rect x="4" y="22" width="3" height="22" rx="1.5" fill={dark} className="ks-arm-r" />
        {/* piernas */}
        <rect x="-6" y="44" width="3.5" height="22" rx="1.5" fill={dark} className="ks-leg-l" />
        <rect x="2.5" y="44" width="3.5" height="22" rx="1.5" fill={dark} className="ks-leg-r" />
      </g>
    </svg>
  )
}

function SceneFoodBasic({ color = '#FB7C39' }: SceneProps) {
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <ellipse cx="100" cy="105" rx="72" ry="7" fill={color} opacity=".18" />
      {/* manzana */}
      <g className="ks-food-1" transform="translate(55,60)">
        <ellipse cx="0" cy="0" rx="22" ry="22" fill="#EF4444" />
        <ellipse cx="-7" cy="-7" rx="6" ry="4" fill="#fff" opacity=".35" />
        <path d="M0 -22 Q 2 -28 6 -28" stroke="#3F2A1A" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M2 -25 Q 8 -28 10 -22" fill="#22C55E" />
      </g>
      {/* pan */}
      <g className="ks-food-2" transform="translate(100,52)">
        <ellipse cx="0" cy="2" rx="20" ry="14" fill="#F4C97E" />
        <ellipse cx="0" cy="0" rx="20" ry="14" fill="#FFE0A8" />
        <line x1="-10" y1="-2" x2="-6" y2="-6" stroke="#C99560" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="-2" y1="-3" x2="2" y2="-7" stroke="#C99560" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="6" y1="-2" x2="10" y2="-6" stroke="#C99560" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      {/* leche/vaso */}
      <g className="ks-food-3" transform="translate(145,58)">
        <path d="M-13 -18 L 13 -18 L 11 18 L -11 18 Z" fill="#E0EAFB" stroke="#9FB4D8" strokeWidth="1.5" />
        <rect x="-13" y="-18" width="26" height="6" fill="#fff" />
        <path d="M-11 -10 L 11 -10 L 10 0 L -10 0 Z" fill="#fff" />
      </g>
    </svg>
  )
}

function SceneToyUnboxing({ color = '#A855F7' }: SceneProps) {
  const dark = shade(color, -0.25)
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      {/* sparkles */}
      <g fill="#FFB800" stroke="#FFB800" strokeWidth="1.5" strokeLinecap="round">
        <g className="ks-sparkle ks-sparkle-a" transform="translate(55,30)">
          <line x1="-5" y1="0" x2="5" y2="0" /><line x1="0" y1="-5" x2="0" y2="5" />
        </g>
        <g className="ks-sparkle ks-sparkle-b" transform="translate(140,28)">
          <line x1="-4" y1="0" x2="4" y2="0" /><line x1="0" y1="-4" x2="0" y2="4" />
        </g>
        <g className="ks-sparkle ks-sparkle-c" transform="translate(160,55)">
          <line x1="-3" y1="0" x2="3" y2="0" /><line x1="0" y1="-3" x2="0" y2="3" />
        </g>
      </g>
      {/* sorpresa (estrella) */}
      <g className="ks-pop" transform="translate(100,52)">
        <path d="M0 -16 L 5 -5 L 17 -3 L 8 5 L 10 17 L 0 11 L -10 17 L -8 5 L -17 -3 L -5 -5 Z" fill="#FFB800" />
      </g>
      {/* caja base */}
      <g transform="translate(70,60)">
        <rect x="0" y="20" width="60" height="32" rx="3" fill={color} />
        <rect x="0" y="20" width="60" height="32" rx="3" fill={dark} opacity=".25" />
        <rect x="27" y="20" width="6" height="32" fill="#FFB800" />
        {/* tapa */}
        <g className="ks-lid" transform="translate(0,20)">
          <rect x="-2" y="-8" width="64" height="10" rx="2" fill={color} />
          <rect x="27" y="-8" width="6" height="10" fill="#FFB800" />
        </g>
      </g>
    </svg>
  )
}

function SceneCartoonsHeroes({ color = '#3B82F6' }: SceneProps) {
  const dark = shade(color, -0.3)
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <ellipse cx="100" cy="105" rx="60" ry="6" fill="#1A1410" opacity=".12" />
      {/* "líneas de velocidad" detrás */}
      <g stroke={dark} strokeWidth="2" strokeLinecap="round" opacity=".45">
        <line x1="20" y1="40" x2="40" y2="40" />
        <line x1="22" y1="55" x2="48" y2="55" />
        <line x1="20" y1="70" x2="38" y2="70" />
      </g>
      <g className="ks-hero" transform="translate(105,55)">
        {/* capa */}
        <g className="ks-cape" transform="translate(-8,-2)">
          <path d="M0 0 Q -18 8 -22 28 L -8 26 L 0 18 Z" fill="#EF4444" />
        </g>
        {/* cabeza */}
        <circle cx="0" cy="-6" r="11" fill="#FFD4A8" />
        <path d="M-11 -10 Q 0 -16 11 -10 L 9 -4 L -9 -4 Z" fill="#1A1410" />
        {/* antifaz */}
        <rect x="-9" y="-9" width="18" height="6" rx="2" fill={dark} />
        <circle cx="-4" cy="-6" r="1.5" fill="#fff" />
        <circle cx="4" cy="-6" r="1.5" fill="#fff" />
        {/* cuerpo con estrella */}
        <path d="M-12 5 L 12 5 L 14 28 L -14 28 Z" fill={color} />
        <path d="M0 10 L 3 18 L 11 18 L 5 23 L 7 30 L 0 26 L -7 30 L -5 23 L -11 18 L -3 18 Z" fill="#FFB800" />
      </g>
    </svg>
  )
}

function SceneGamingBasic({ color = '#00B37E' }: SceneProps) {
  const dark = shade(color, -0.35)
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <ellipse cx="100" cy="106" rx="64" ry="6" fill="#1A1410" opacity=".12" />
      <g transform="translate(50,40)">
        {/* cuerpo del joystick */}
        <rect x="0" y="0" width="100" height="50" rx="22" fill={color} />
        <rect x="0" y="0" width="100" height="50" rx="22" fill="#fff" opacity=".15" />
        {/* dpad / stick izq */}
        <g className="ks-stick" transform="translate(22,25)">
          <circle r="12" fill={dark} />
          <path d="M-7 0 L 7 0 M 0 -7 L 0 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        {/* botones */}
        <circle cx="78" cy="18" r="6" fill="#EF4444" className="ks-btn-a" />
        <circle cx="88" cy="32" r="6" fill="#FACC15" className="ks-btn-b" />
        <circle cx="68" cy="32" r="5" fill={dark} opacity=".5" />
        <circle cx="78" cy="42" r="5" fill={dark} opacity=".5" />
      </g>
    </svg>
  )
}

function SceneTreats({ color = '#F472B6' }: SceneProps) {
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <ellipse cx="100" cy="110" rx="58" ry="5" fill={color} opacity=".2" />
      {/* cono */}
      <g transform="translate(100,40)">
        <path d="M-22 40 L 0 80 L 22 40 Z" fill="#D9A66A" stroke="#8B5A2B" strokeWidth="1.5" />
        <line x1="-15" y1="48" x2="0" y2="68" stroke="#8B5A2B" strokeWidth="1" opacity=".5" />
        <line x1="-7" y1="48" x2="8" y2="68" stroke="#8B5A2B" strokeWidth="1" opacity=".5" />
        <line x1="0" y1="48" x2="15" y2="68" stroke="#8B5A2B" strokeWidth="1" opacity=".5" />
        {/* bola inferior */}
        <circle cx="0" cy="38" r="22" fill={color} className="ks-scoop-1" />
        {/* bola superior */}
        <circle cx="-2" cy="12" r="18" fill="#FACC15" className="ks-scoop-2" />
        <circle cx="-8" cy="6" r="4" fill="#fff" opacity=".4" />
        {/* drop */}
        <ellipse cx="-14" cy="54" rx="2" ry="3" fill={color} className="ks-drip" />
        <ellipse cx="14" cy="55" rx="2" ry="3" fill="#FACC15" className="ks-drip" style={{ animationDelay: '-1.2s' }} />
      </g>
    </svg>
  )
}

function SceneGeneric({ color = '#00B37E' }: SceneProps) {
  return (
    <svg viewBox="0 0 200 120" className="kids-scene-svg" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <g className="ks-gen" transform="translate(100,60)">
        <circle r="38" fill={color} opacity=".18" />
        <circle r="26" fill={color} opacity=".35" />
        <circle r="14" fill={color} />
        <path d="M-6 -2 L 0 4 L 6 -4" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

const SCENE_MAP: Record<string, (p: SceneProps) => JSX.Element> = {
  'kids-family': SceneFamily,
  'kids-colors': SceneColors,
  'kids-animals-farm': SceneAnimalsFarm,
  'kids-counting': SceneCounting,
  'kids-body': SceneBody,
  'kids-food-basic': SceneFoodBasic,
  'kids-toy-unboxing': SceneToyUnboxing,
  'kids-cartoons-heroes': SceneCartoonsHeroes,
  'kids-gaming-basic': SceneGamingBasic,
  'kids-treats': SceneTreats,
}

interface TopicSceneProps {
  slug: string
  color?: string
}

export function TopicScene({ slug, color }: TopicSceneProps) {
  const Comp = SCENE_MAP[slug] ?? SceneGeneric
  return <Comp color={color} />
}

export const KIDS_SCENE_CSS = SCENE_CSS

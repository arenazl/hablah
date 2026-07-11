/**
 * Circuito visual REACTIVO kids (F4-06, slice mínimo).
 *
 * Dirección validada (memoria del proyecto): forzar vocab visual DEGRADA la
 * clase. Este componente NO decide qué dice el coach ni cuándo -- solo
 * ESCUCHA la transcripción que ya emite Gemini Live y, si el coach nombra
 * una palabra que matchea la biblioteca visual del tópico, la muestra un
 * ratito. Si el coach no nombra vocab visual, no aparece nada. Cero
 * cambios al prompt/motor -- es 100% capa de UI.
 */
import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

export interface VisualCueItem {
  word_en: string
  word_es: string
  emoji: string
  asset_file: string | null
}

// Cache en memoria (separada de la de kidsBuddies.ts -- esa es para los
// personajes acompañantes, esta es para el vocab del tópico). Precargar acá
// evita el parpadeo de "cargando" cuando el coach recién nombra la palabra.
const lottieCache = new Map<string, object>()

/** Precarga (fetch + cache) los assets Lottie del tópico. Fire-and-forget,
 * nunca lanza -- si falla, el fallback a emoji cubre igual. Los SVG no
 * necesitan JSON parseado; solo calentamos la cache HTTP del browser. */
export function preloadVisualCueAssets(items: VisualCueItem[]): void {
  for (const it of items) {
    const file = it.asset_file
    if (!file) continue
    if (file.endsWith('.json')) {
      if (lottieCache.has(file)) continue
      fetch(file)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => { if (json) lottieCache.set(file, json) })
        .catch(() => {})
    } else if (file.endsWith('.svg')) {
      const img = new Image()
      img.src = file
    }
  }
}

/** Normaliza para matchear: minúsculas y SIN acentos/ñ (avión->avion). El coach
 * habla en castellano — sin esto, "caramelo"/"avión" jamás matchean. */
export function normalizeVisualWord(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Singulariza en forma simple (match "exacto + plural simple" del WO):
 * cats->cat, foxes->fox, butterflies->butterfly. No pretende ser un
 * lematizador completo -- alcanza para el vocab concreto de 1-2 sílabas
 * de la biblioteca kids. */
export function singularizeEnglish(word: string): string {
  const w = word.toLowerCase()
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 3 && /(?:s|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

function CueVisual({ item }: { item: VisualCueItem }) {
  const file = item.asset_file
  const [lottieData, setLottieData] = useState<object | null>(
    file && file.endsWith('.json') ? lottieCache.get(file) ?? null : null,
  )

  useEffect(() => {
    if (!file || !file.endsWith('.json')) return
    const cached = lottieCache.get(file)
    if (cached) { setLottieData(cached); return }
    let cancelled = false
    fetch(file)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json) return
        lottieCache.set(file, json)
        setLottieData(json)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [file])

  if (file && file.endsWith('.json')) {
    if (!lottieData) return <span style={{ fontSize: 64 }}>{item.emoji || '✨'}</span>
    return <Lottie animationData={lottieData} loop autoplay style={{ width: 100, height: 100 }} />
  }
  if (file && file.endsWith('.svg')) {
    return <img src={file} alt={item.word_en} width={92} height={92} loading="eager" />
  }
  return <span style={{ fontSize: 64 }}>{item.emoji || '✨'}</span>
}

const CSS = `
.kids-cue { position:fixed; top:12%; left:50%; transform:translateX(-50%) scale(1); z-index:80; display:flex; flex-direction:column; align-items:center; gap:6px; padding:18px 28px; border-radius:26px; background:rgba(10,22,19,.74); border:1px solid rgba(255,255,255,.2); backdrop-filter:blur(10px); box-shadow:0 18px 44px rgba(0,0,0,.4); pointer-events:none; animation:kids-cue-in .35s cubic-bezier(.2,.8,.2,1); }
.kids-cue.leaving { animation:kids-cue-out .3s ease-in forwards; }
.kids-cue .kids-cue-word { font-weight:800; font-size:19px; color:#fff; text-transform:capitalize; letter-spacing:-.01em; }
.kids-cue .kids-cue-word-es { font-size:12px; color:rgba(255,255,255,.6); font-weight:600; }
@keyframes kids-cue-in { from { opacity:0; transform:translateX(-50%) scale(.7); } to { opacity:1; transform:translateX(-50%) scale(1); } }
@keyframes kids-cue-out { from { opacity:1; transform:translateX(-50%) scale(1); } to { opacity:0; transform:translateX(-50%) scale(.82); } }
/* Movimiento para los assets ESTÁTICOS (svg/emoji): wiggle juguetón. Los Lottie ya se animan solos. */
.kids-cue img, .kids-cue .kids-cue-static { animation: kids-cue-wiggle 1.4s ease-in-out infinite; transform-origin: 50% 85%; }
@keyframes kids-cue-wiggle { 0%,100% { transform:rotate(-7deg) scale(1); } 25% { transform:rotate(5deg) scale(1.08); } 50% { transform:rotate(-4deg) scale(1.02); } 75% { transform:rotate(7deg) scale(1.1); } }
@media (prefers-reduced-motion: reduce){ .kids-cue img, .kids-cue .kids-cue-static { animation:none !important; } }
`

/** Overlay fixed que muestra el vocab activo (o nada). `leaving=true` dispara
 * la animación de salida antes de que el padre lo desmonte. */
export function KidsVisualCueOverlay({ item, leaving }: { item: VisualCueItem | null; leaving: boolean }) {
  if (!item) return null
  return (
    <>
      <style>{CSS}</style>
      <div className={`kids-cue ${leaving ? 'leaving' : ''}`}>
        <CueVisual item={item} />
        <span className="kids-cue-word">{item.word_en}</span>
        <span className="kids-cue-word-es">{item.word_es}</span>
      </div>
    </>
  )
}

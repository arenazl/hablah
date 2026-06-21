/* /kids/kit — PROTOTIPO de la clase visual de chicos: el Dino guía y los animalitos
 * (Lottie) van apareciendo grandes con su palabra, paso a paso. Para ver cómo queda
 * el "input visual" que charlamos. Usa las animaciones de /public/animals/.
 * (Las imágenes finales saldrán de un batch posterior; esto es el experimento visual.)
 */
import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import { useLottieJson } from '../../components/kids/kidsBuddies'

interface Scene { file: string; en: string; es: string; line: string; emoji: string }
const SCENES: Scene[] = [
  { file: '/animals/dino.json', en: '', es: '', emoji: '🦕', line: '¡Hola! Soy Dino. Hoy conocemos… ¡los animales! ¿Listo? Let\'s go!' },
  { file: '/animals/perro.json', en: 'DOG', es: 'perro', emoji: '🐶', line: 'Look! A DOG! 🐶 Repetí conmigo: dog… ¡muy bien!' },
  { file: '/animals/gato.json', en: 'CAT', es: 'gato', emoji: '🐱', line: 'And this one? A CAT! Meow~ Decí: cat.' },
  { file: '/animals/leon.json', en: 'LION', es: 'león', emoji: '🦁', line: 'Roarrr! The LION is big! Big lion! Repetí: lion.' },
  { file: '/animals/oso.json', en: 'BEAR', es: 'oso', emoji: '🐻', line: 'A soft BEAR! Un osito. Say it: bear.' },
  { file: '/animals/conejo.json', en: 'RABBIT', es: 'conejo', emoji: '🐰', line: 'Hop hop! A little RABBIT! Decí: rabbit.' },
  { file: '/animals/dino.json', en: '', es: '', emoji: '🎉', line: '¡Lo lograste! Dog, cat, lion, bear, rabbit. ¡Sos un crack! Bye bye!' },
]

function Anim({ file, size }: { file: string; size: number }) {
  const { data, error } = useLottieJson(file)
  if (error) return <div style={{ fontSize: size * 0.6 }}>🐾</div>
  if (!data) return <div style={{ width: size, height: size }} />
  return <Lottie animationData={data} loop autoplay style={{ width: size, height: size }} />
}

export default function KidsKitPanel() {
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const s = SCENES[idx]
  const isGuide = !s.en

  useEffect(() => {
    if (!playing) return
    if (idx >= SCENES.length - 1) { setPlaying(false); return }
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, SCENES.length - 1)), 3500)
    return () => clearTimeout(t)
  }, [playing, idx])

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 18%, #2a3da8 0%, #14206b 45%, #0b0e2e 100%)', color: '#fff', fontFamily: 'Baloo 2, Nunito, system-ui, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* escenario */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 20 }}>
        {/* dino guía en la esquina (salvo cuando él mismo es la escena) */}
        {!isGuide && (
          <div style={{ position: 'absolute', left: 18, bottom: 18, width: 120, height: 120, opacity: 0.95, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,.4))' }}>
            <Anim file="/animals/dino.json" size={120} />
          </div>
        )}
        {/* el protagonista de la escena */}
        <div key={idx} style={{ animation: 'pop .5s cubic-bezier(.2,1.2,.3,1)', filter: 'drop-shadow(0 18px 40px rgba(0,0,0,.45))' }}>
          <Anim file={s.file} size={isGuide ? 340 : 300} />
        </div>
        {s.en && (
          <div style={{ textAlign: 'center', marginTop: 6 }}>
            <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 1, textShadow: '0 4px 0 rgba(0,0,0,.25)' }}>{s.emoji} {s.en}</div>
            <div style={{ fontSize: 22, color: '#c7d2fe', marginTop: -4 }}>{s.es}</div>
          </div>
        )}
      </div>

      {/* subtítulo del profe (lo que diría el dino) */}
      <div style={{ background: 'rgba(255,255,255,.10)', borderTop: '1px solid rgba(255,255,255,.15)', padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 19, fontWeight: 700, maxWidth: 720, margin: '0 auto', lineHeight: 1.35 }}>{s.line}</div>
      </div>

      {/* controles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '14px 20px 22px' }}>
        <button onClick={() => { setPlaying(false); setIdx((i) => Math.max(0, i - 1)) }} style={btn}>◀</button>
        <button onClick={() => setPlaying((p) => !p)} style={{ ...btn, background: '#22c55e', minWidth: 120, fontWeight: 800 }}>{playing ? 'Pausa' : '▶ Reproducir'}</button>
        <button onClick={() => { setPlaying(false); setIdx((i) => Math.min(SCENES.length - 1, i + 1)) }} style={btn}>▶</button>
        <div style={{ display: 'flex', gap: 7, marginLeft: 10 }}>
          {SCENES.map((_, i) => (
            <span key={i} onClick={() => { setPlaying(false); setIdx(i) }} style={{ width: 12, height: 12, borderRadius: 99, cursor: 'pointer', background: i === idx ? '#fff' : 'rgba(255,255,255,.3)' }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes pop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

const btn: React.CSSProperties = {
  background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.25)', color: '#fff',
  borderRadius: 12, fontSize: 18, fontWeight: 700, padding: '10px 18px', cursor: 'pointer', minWidth: 54,
}

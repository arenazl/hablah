/* /kids/kit — PROTOTIPO visual de clase de chicos (secuencia fija, para ver cómo queda).
 * El Dino guía + los animalitos (Lottie) aparecen con su palabra. Avanza SOLO leyendo
 * cada línea con la voz del navegador (TTS) y pasando al siguiente al terminar.
 * (Lo dinámico — que el coach improvise — viene después, una vez que esto se siente bien.)
 */
import { useEffect, useRef, useState } from 'react'
import Lottie from 'lottie-react'
import { useLottieJson } from '../../components/kids/kidsBuddies'

interface Scene { file: string; en: string; es: string; emoji: string; line: string }
const SCENES: Scene[] = [
  { file: '/animals/dino.json', en: '', es: '', emoji: '🦕', line: '¡Hola! Soy Dino. Hoy vamos a conocer animales. ¿Estás listo? ¡Vamos!' },
  { file: '/animals/perro.json', en: 'DOG', es: 'perro', emoji: '🐶', line: '¡Mirá! Un perro. En inglés se dice dog. Repetí conmigo: dog.' },
  { file: '/animals/gato.json', en: 'CAT', es: 'gato', emoji: '🐱', line: '¿Y este? ¡Un gato! Cat. Decí cat.' },
  { file: '/animals/leon.json', en: 'LION', es: 'león', emoji: '🦁', line: '¡El león! Grande y fuerte. Lion. Repetí: lion.' },
  { file: '/animals/oso.json', en: 'BEAR', es: 'oso', emoji: '🐻', line: 'Un osito suavecito. Bear. Decí bear.' },
  { file: '/animals/conejo.json', en: 'RABBIT', es: 'conejo', emoji: '🐰', line: '¡Salta, salta! Un conejo. Rabbit. Decí rabbit.' },
  { file: '/animals/dino.json', en: '', es: '', emoji: '🎉', line: '¡Muy bien! Dog, cat, lion, bear, rabbit. ¡Sos un campeón! Chau, chau.' },
]

function Anim({ file, size }: { file: string; size: number }) {
  const { data, error } = useLottieJson(file)
  if (error) return <div style={{ fontSize: size * 0.5 }}>🐾</div>
  if (!data) return <div style={{ width: size, height: size }} />
  return <Lottie animationData={data} loop autoplay style={{ width: size, height: size }} />
}

export default function KidsKitPanel() {
  const [idx, setIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    const pick = () => {
      const vs = window.speechSynthesis?.getVoices?.() || []
      voiceRef.current = vs.find((v) => /es(-|_)?(AR|419|MX|ES)?/i.test(v.lang)) || vs.find((v) => v.lang.startsWith('es')) || null
    }
    pick()
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = pick
    return () => { try { window.speechSynthesis.cancel() } catch { /* noop */ } }
  }, [])

  // habla la línea actual y, al terminar, avanza sola
  useEffect(() => {
    if (!started || paused) return
    const sc = SCENES[idx]
    const synth = window.speechSynthesis
    if (!synth) { const t = setTimeout(() => setIdx((i) => Math.min(i + 1, SCENES.length - 1)), 3800); return () => clearTimeout(t) }
    const u = new SpeechSynthesisUtterance(sc.line)
    u.lang = 'es-AR'; if (voiceRef.current) u.voice = voiceRef.current
    u.rate = 0.96; u.pitch = 1.15
    u.onend = () => setIdx((i) => (i < SCENES.length - 1 ? i + 1 : i))
    synth.cancel()
    synth.speak(u)
    return () => synth.cancel()
  }, [started, paused, idx])

  const sc = SCENES[idx]
  const isGuide = !sc.en
  const go = (n: number) => { setPaused(false); setIdx((i) => Math.max(0, Math.min(SCENES.length - 1, i + n))) }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 18%, #2a3da8 0%, #14206b 45%, #0b0e2e 100%)', color: '#fff', fontFamily: 'Baloo 2, Nunito, system-ui, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 20 }}>
        {!isGuide && (
          <div style={{ position: 'absolute', left: 18, bottom: 18, width: 110, height: 110, opacity: 0.95, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,.4))' }}>
            <Anim file="/animals/dino.json" size={110} />
          </div>
        )}
        <div key={idx} style={{ animation: 'pop .5s cubic-bezier(.2,1.2,.3,1)', filter: 'drop-shadow(0 18px 40px rgba(0,0,0,.45))' }}>
          <Anim file={sc.file} size={isGuide ? 340 : 300} />
        </div>
        {sc.en && (
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 1, textShadow: '0 4px 0 rgba(0,0,0,.25)' }}>{sc.emoji} {sc.en}</div>
            <div style={{ fontSize: 22, color: '#c7d2fe', marginTop: -4 }}>{sc.es}</div>
          </div>
        )}
        {!started && (
          <button onClick={() => setStarted(true)} style={{ position: 'absolute', inset: 0, margin: 'auto', width: 220, height: 64, background: '#22c55e', color: '#06281a', border: 0, borderRadius: 16, fontSize: 20, fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 30px rgba(34,197,94,.4)' }}>▶ Empezar la clase</button>
        )}
      </div>

      <div style={{ background: 'rgba(255,255,255,.10)', borderTop: '1px solid rgba(255,255,255,.15)', padding: '16px 20px', textAlign: 'center', minHeight: 56 }}>
        <div style={{ fontSize: 19, fontWeight: 700, maxWidth: 720, margin: '0 auto', lineHeight: 1.35 }}>{sc.line}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 20px 22px', flexWrap: 'wrap' }}>
        <button onClick={() => go(-1)} style={btn}>◀</button>
        <button onClick={() => { setStarted(true); setPaused((p) => !p) }} style={{ ...btn, background: '#22c55e', minWidth: 110, fontWeight: 800 }}>{paused || !started ? '▶ Play' : 'Pausa'}</button>
        <button onClick={() => go(1)} style={btn}>▶</button>
        <button onClick={() => { try { window.speechSynthesis.cancel() } catch { /* noop */ } setPaused(false); setStarted(true); setIdx(0) }} style={{ ...btn, background: 'rgba(56,189,248,.2)', border: '1px solid #38bdf8', color: '#bfe6fb' }}>↺ De nuevo</button>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {SCENES.map((_, i) => (
            <span key={i} onClick={() => { setPaused(false); setIdx(i) }} style={{ width: 11, height: 11, borderRadius: 99, cursor: 'pointer', background: i === idx ? '#fff' : 'rgba(255,255,255,.3)' }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes pop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

const btn: React.CSSProperties = {
  background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.25)', color: '#fff',
  borderRadius: 12, fontSize: 18, fontWeight: 700, padding: '10px 16px', cursor: 'pointer', minWidth: 50,
}

/**
 * Muestra el ultimo turno del coach splitteado en paneles, cada uno con su
 * aclaracion gramatical breve. Hace fetch a /api/grammar/explain (Gemini
 * Flash, tarda ~1-2s). Mientras carga muestra placeholder con skeleton.
 *
 * Re-ejecuta el fetch cada vez que cambia el texto (turno nuevo del coach).
 * Si el endpoint falla, fallback a mostrar el texto entero sin notas.
 */
import { useEffect, useRef, useState } from 'react'

import { API_BASE_URL } from '../services/api'

interface Phrase {
  phrase: string
  note: string
}

interface CoachPhrasePanelsProps {
  text: string
  targetLang?: string
  baseLang?: string
  cefr?: string
}

const CSS = `
.coach-phrases { display: flex; flex-direction: column; gap: 8px; }
.coach-phrase-panel {
  background: rgba(0,179,126,0.08);
  border: 1px solid rgba(0,179,126,0.22);
  border-radius: 10px; padding: 10px 12px;
  animation: cpp-fadein .25s ease-out;
}
@keyframes cpp-fadein {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.coach-phrase-text {
  font-size: 14px; line-height: 1.45; color: #E8ECEA;
  font-weight: 500;
}
.coach-phrase-note {
  margin-top: 6px; padding-top: 6px;
  border-top: 1px dashed rgba(255,255,255,0.10);
  font-size: 11.5px; line-height: 1.4;
  color: rgba(232,236,234,.65);
  font-style: italic;
}
.coach-phrase-loading {
  display: flex; flex-direction: column; gap: 8px;
}
.coach-phrase-skel {
  height: 48px; border-radius: 10px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 200% 100%;
  animation: cpp-skel 1.4s ease-in-out infinite;
}
@keyframes cpp-skel {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}
.coach-phrase-header {
  font-size: 9px; font-weight: 700; letter-spacing: .1em;
  opacity: 0.55; margin-bottom: 6px; text-transform: uppercase;
  color: #E8ECEA;
}
`

export function CoachPhrasePanels({
  text,
  targetLang = 'en',
  baseLang = 'es',
  cefr = 'B1',
}: CoachPhrasePanelsProps) {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [loading, setLoading] = useState(false)
  const lastTextRef = useRef<string>('')

  useEffect(() => {
    const trimmed = (text || '').trim()
    if (!trimmed || trimmed === lastTextRef.current) return
    lastTextRef.current = trimmed

    let cancelled = false
    setLoading(true)
    // Placeholder inicial: mostrar el texto entero como un solo panel
    // mientras esperamos la respuesta del endpoint.
    setPhrases([{ phrase: trimmed, note: '' }])

    fetch(`${API_BASE_URL}/grammar/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, target_lang: targetLang, base_lang: baseLang, cefr }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { phrases: Phrase[] }) => {
        if (cancelled) return
        if (data?.phrases && data.phrases.length > 0) {
          setPhrases(data.phrases)
        }
      })
      .catch(() => {
        // Fallback ya esta seteado al placeholder
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [text, targetLang, baseLang, cefr])

  if (phrases.length === 0) {
    return (
      <>
        <style>{CSS}</style>
        <div className="coach-phrase-loading">
          <div className="coach-phrase-skel" />
          <div className="coach-phrase-skel" />
        </div>
      </>
    )
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="coach-phrase-header">Tutor {loading && '· cargando análisis…'}</div>
      <div className="coach-phrases">
        {phrases.map((p, i) => (
          <div key={`${i}-${p.phrase.slice(0, 20)}`} className="coach-phrase-panel">
            <div className="coach-phrase-text">{p.phrase}</div>
            {p.note && <div className="coach-phrase-note">{p.note}</div>}
          </div>
        ))}
      </div>
    </>
  )
}

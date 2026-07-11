/* LiveSubtitle — la transcripción en vivo como SUBTÍTULO de película, no como chat.
 *
 * Muestra la línea ACTUAL (quien habla ahora) grande y centrada, con la línea anterior
 * del otro hablante apenas tenue arriba. NO acumula ni scrollea: cuando llega texto
 * nuevo, reemplaza. Así no se pierde nunca "abajo" como pasaba con el chat scrolleable.
 *
 * Resaltado pedagógico (kids, para que el papá pueda guiar):
 *  - Las palabras en INGLÉS se pintan en ámbar: las del vocabulario del tópico
 *    (highlightWords) y la palabra que sigue a "se dice ..." (patrón del coach).
 *  - Si la línea del coach termina en puntos suspensivos ("Viven en..."), esa frase
 *    final se pinta en verde + chip "Tu turno: decí la frase" — es la pausa donde el
 *    nene tiene que completar/decir la frase entera.
 */
import { Fragment } from 'react'

interface Line { who: string; text: string }

const color = (who: string) => (who === 'ai' ? '#7dd3fc' : '#86efac')

const EN_WORD_STYLE: React.CSSProperties = {
  background: 'rgba(255,201,61,.16)', color: '#FFC93D', fontWeight: 800,
  padding: '0 6px', borderRadius: 6, whiteSpace: 'nowrap',
}
const TURN_STYLE: React.CSSProperties = {
  color: '#22D67A', fontWeight: 800, textDecorationLine: 'underline',
  textDecorationStyle: 'dotted', textUnderlineOffset: 4,
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Pinta en ámbar las palabras de vocab + lo que sigue a "se dice ..." (sin lookbehind,
 * que rompe en Safari viejo): junta rangos, los mergea y emite spans. */
function paintEnglish(text: string, words: string[]): React.ReactNode[] {
  const ranges: Array<{ start: number; end: number }> = []
  if (words.length) {
    const re = new RegExp(`\\b(?:${words.map(escapeRe).sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi')
    for (const m of text.matchAll(re)) {
      if (m.index !== undefined) ranges.push({ start: m.index, end: m.index + m[0].length })
    }
  }
  // "se dice X": pinta la palabra inglesa que el coach presenta.
  for (const m of text.matchAll(/se dice\s+([A-Za-z][A-Za-z' -]*[A-Za-z])/gi)) {
    if (m.index === undefined) continue
    const start = m.index + m[0].length - m[1].length
    ranges.push({ start, end: start + m[1].length })
  }
  if (!ranges.length) return [text]
  ranges.sort((a, b) => a.start - b.start)
  const merged: typeof ranges = []
  for (const r of ranges) {
    const lastR = merged[merged.length - 1]
    if (lastR && r.start <= lastR.end) lastR.end = Math.max(lastR.end, r.end)
    else merged.push({ ...r })
  }
  const out: React.ReactNode[] = []
  let pos = 0
  merged.forEach((r, i) => {
    if (r.start > pos) out.push(<Fragment key={`t${i}`}>{text.slice(pos, r.start)}</Fragment>)
    out.push(<span key={`w${i}`} style={EN_WORD_STYLE}>{text.slice(r.start, r.end)}</span>)
    pos = r.end
  })
  if (pos < text.length) out.push(<Fragment key="tail">{text.slice(pos)}</Fragment>)
  return out
}

/** Si termina en "..." separa la frase final (la que el nene tiene que decir). */
function splitTurnPhrase(text: string): { before: string; turn: string | null } {
  const m = text.match(/([^.!?¡¿\n]{2,80}(?:\.\.\.|…))\s*$/)
  if (!m || m.index === undefined) return { before: text, turn: null }
  return { before: text.slice(0, m.index), turn: m[1] }
}

function AiText({ text, words }: { text: string; words: string[] }) {
  const { before, turn } = splitTurnPhrase(text)
  return (
    <>
      {paintEnglish(before, words)}
      {turn && <span style={TURN_STYLE}>{paintEnglish(turn, words)}</span>}
      {turn && (
        <span style={{
          display: 'block', marginTop: 8, fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
          textTransform: 'uppercase', color: '#22D67A',
        }}>
          Tu turno — decí la frase
        </span>
      )}
    </>
  )
}

export default function LiveSubtitle({ transcript, aiLabel = 'Coach', minHeight = 120, highlightWords = [] }: {
  transcript: Line[]; aiLabel?: string; minHeight?: number
  /** Vocabulario (en inglés) del tópico: esas palabras se pintan en el subtítulo. */
  highlightWords?: string[]
}) {
  const label = (who: string) => (who === 'ai' ? aiLabel : 'Vos')

  if (!transcript || transcript.length === 0) {
    return (
      <div style={{ minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 13, textAlign: 'center', padding: '0 12px' }}>
        Cuando hablen, el texto aparece acá como un subtítulo.
      </div>
    )
  }

  const last = transcript[transcript.length - 1]
  let prev: Line | undefined
  for (let i = transcript.length - 2; i >= 0; i--) {
    if (transcript[i].who !== last.who) { prev = transcript[i]; break }
  }

  return (
    <div style={{ minHeight, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, textAlign: 'center', padding: '10px 8px' }}>
      {prev && (
        <div style={{ opacity: 0.4, fontSize: 14, lineHeight: 1.35 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: color(prev.who), marginRight: 6 }}>{label(prev.who)}</span>
          <span style={{ color: '#cbd5e1' }}>{prev.text}</span>
        </div>
      )}
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: color(last.who), marginBottom: 5 }}>{label(last.who)}</div>
        <div style={{ fontSize: 20, lineHeight: 1.5, fontWeight: 600, color: '#fff' }}>
          {last.who === 'ai' ? <AiText text={last.text} words={highlightWords} /> : last.text}
        </div>
      </div>
    </div>
  )
}

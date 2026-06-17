/* LiveSubtitle — la transcripción en vivo como SUBTÍTULO de película, no como chat.
 *
 * Muestra la línea ACTUAL (quien habla ahora) grande y centrada, con la línea anterior
 * del otro hablante apenas tenue arriba. NO acumula ni scrollea: cuando llega texto
 * nuevo, reemplaza. Así no se pierde nunca "abajo" como pasaba con el chat scrolleable.
 */
interface Line { who: string; text: string }

const color = (who: string) => (who === 'ai' ? '#7dd3fc' : '#86efac')

export default function LiveSubtitle({ transcript, aiLabel = 'Coach', minHeight = 120 }: {
  transcript: Line[]; aiLabel?: string; minHeight?: number
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
        <div style={{ fontSize: 20, lineHeight: 1.4, fontWeight: 600, color: '#fff' }}>{last.text}</div>
      </div>
    </div>
  )
}

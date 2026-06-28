/* MiniTestPanel — Pantalla de prueba real (micrófono) para la banda Mini.
 * Solo los 9 tópicos validados, A0 / A1, pasos guiados.
 * Usa la misma infra que /finaltest (useLiveVoice + ws_orchestration).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, RotateCcw, CheckCircle } from 'lucide-react'
import { useLiveVoice } from '../hooks/useLiveVoice'
import { buildMiniWsUrl, finaltestAPI } from '../services/api'

// Tópicos Mini del catálogo v2 (topics.segmento='mini'). La clase corre por el MOTOR ÚNICO
// (compose_proto), mismo que producción. Edad elige los tópicos; aplican a A0 y A1.
const TOPICS_A0 = [
  { id: 135, title: 'Mi familia' },
  { id: 141, title: 'Mi cuerpo' },
  { id: 138, title: 'Mis colores favoritos' },
  { id: 139, title: 'Animales de la granja y la selva' },
  { id: 142, title: 'Comidas ricas' },
  { id: 134, title: 'Mascotas' },
  { id: 140, title: 'Contar del 1 al 10' },
]
const TOPICS_A1 = [...TOPICS_A0, { id: 133, title: 'Música y canciones' }]

const BAND = 'early_child'   // sólo bookkeeping de historia/juez (finaltest); la clase NO usa v3
const AGE_GROUP = 'mini'     // pilar EDAD del motor único (v2)

function scoreColor(s: number | null | undefined) {
  if (s == null) return '#6b7280'
  if (s >= 8) return '#22c55e'
  if (s >= 6.5) return '#fbbf24'
  return '#ef4444'
}

export default function MiniTestPanel() {
  const [level, setLevel] = useState<'A0' | 'A1'>('A0')
  const [topicId, setTopicId] = useState(135)
  const [studentId, setStudentId] = useState(0)
  const [hist, setHist] = useState({ obj: 0, items: 0 })
  const [result, setResult] = useState<{ score: number; verdict: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const topics = level === 'A0' ? TOPICS_A0 : TOPICS_A1
  const topicTitle = topics.find(t => t.id === topicId)?.title ?? ''

  const live = useLiveVoice({ onError: (e) => setErr(e.message) })
  const isLive = live.status === 'connecting' || live.status === 'listening' || live.status === 'speaking'

  const transcriptEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [live.transcript])

  // Asegura que el tópico seleccionado existe en el nivel elegido
  useEffect(() => {
    if (!topics.find(t => t.id === topicId)) setTopicId(topics[0].id)
  }, [level])

  // Carga / crea el student de prueba para este combo
  const loadStudent = useCallback(async () => {
    try {
      const r = await finaltestAPI.resolve({ band_code: BAND, level_code: level, topic_id: topicId })
      setStudentId(r.student_id)
      setHist({ obj: r.hist_obj, items: r.hist_items })
    } catch (e) { setErr(String(e)) }
  }, [level, topicId])

  useEffect(() => { if (!isLive) void loadStudent() }, [loadStudent, isLive])

  const startClass = useCallback(async () => {
    setErr(''); setResult(null)
    // MOTOR ÚNICO v2: 3 pilares edad(mini)+nivel+tópico. No depende de student_id v3.
    const url = buildMiniWsUrl({
      age_group: AGE_GROUP, level_code: level, topic_id: topicId,
      engine: 'gemini_live',
      model: 'models/gemini-3.1-flash-live-preview', voice: 'Aoede',
    })
    await live.start(0, undefined, 'Aoede', url)
  }, [live, level, topicId])

  const endClass = useCallback(async () => {
    const transcript = live.transcript.map(l => ({ who: l.who, text: l.text }))
    live.stop()
    if (!transcript.length) return
    setSaving(true)
    try {
      const res = await finaltestAPI.save({
        band_code: BAND, level_code: level, topic_id: topicId,
        topic_title: topicTitle, student_id: studentId, transcript,
      })
      setResult({ score: res.score ?? 0, verdict: res.verdict ?? '' })
      void loadStudent()
    } catch (e) { setErr(String(e)) } finally { setSaving(false) }
  }, [live, level, topicId, topicTitle, studentId, loadStudent])

  const resetHistory = useCallback(async () => {
    if (isLive) return
    try {
      await finaltestAPI.reset({ band_code: BAND, level_code: level })
      setHist({ obj: 0, items: 0 })
      void loadStudent()
    } catch (e) { setErr(String(e)) }
  }, [isLive, level, loadStudent])

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14', color: '#e6e8ec', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Encabezado */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ background: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>MINI</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Prueba de clase real</h1>
          </div>
          <p style={{ color: '#9aa3af', fontSize: 13, margin: 0 }}>
            Primera infancia (4–7 años) · Voz real con micrófono · Panel de jueces al terminar
          </p>
        </div>

        {/* Paso 1: Elegir combo */}
        <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: 1, marginBottom: 14 }}>PASO 1 — Elegí nivel y tópico</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            {(['A0', 'A1'] as const).map(lv => (
              <button key={lv} disabled={isLive} onClick={() => setLevel(lv)} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: isLive ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: 14,
                background: level === lv ? '#7c3aed' : '#1e2130',
                color: level === lv ? '#fff' : '#9aa3af',
              }}>{lv}</button>
            ))}
          </div>
          <select
            disabled={isLive}
            value={topicId}
            onChange={e => setTopicId(Number(e.target.value))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #232936', background: '#0b0e14', color: '#e6e8ec', fontSize: 14 }}
          >
            {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280', display: 'flex', gap: 16 }}>
            <span>Historia: {hist.obj} objetivos · {hist.items} items</span>
            <button onClick={resetHistory} disabled={isLive} style={{
              background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 4, padding: 0,
            }}>
              <RotateCcw size={12} /> Reset historia
            </button>
          </div>
        </div>

        {/* Paso 2: Controles de clase */}
        <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: 1, marginBottom: 14 }}>PASO 2 — Arrancá y hablá actuando de alumno</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {!isLive ? (
              <button onClick={startClass} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 15,
              }}>
                <Mic size={18} /> Iniciar clase
              </button>
            ) : (
              <button onClick={endClass} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 15,
              }}>
                <Square size={18} /> Terminar clase
              </button>
            )}
            {isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22c55e', fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                {live.status === 'connecting' ? 'Conectando...' : live.status === 'speaking' ? 'Coach hablando...' : 'Escuchando...'}
              </div>
            )}
            {saving && <span style={{ color: '#fbbf24', fontSize: 13 }}>Puntuando con jueces...</span>}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 12, color: '#6b7280' }}>
            Actuá de alumno de {level === 'A0' ? '4–5 años, primera clase' : '5–7 años, algo de vocab'}.
            Hablá en español, decí alguna palabra en inglés si la sabés.
            Cuando termines, presioná "Terminar clase" para ver el score.
          </p>
        </div>

        {/* Transcripción en vivo */}
        {(live.transcript.length > 0 || isLive) && (
          <div style={{ background: '#11151d', border: '1px solid #232936', borderRadius: 14, padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9aa3af', letterSpacing: 1, marginBottom: 12 }}>TRANSCRIPCIÓN EN VIVO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
              {live.transcript.map((l, i) => {
                const isAi = l.who === 'ai'
                return (
                  <div key={i} style={{ alignSelf: isAi ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 2, textAlign: isAi ? 'left' : 'right' }}>
                      {isAi ? 'Coach' : 'Vos (alumno)'}
                    </div>
                    <div style={{
                      padding: '9px 13px', borderRadius: 12, fontSize: 14, lineHeight: 1.45,
                      background: isAi ? '#0b1f33' : '#0b2a1a',
                      border: `1px solid ${isAi ? '#1e3a5f' : '#1e4d33'}`,
                    }}>{l.text}</div>
                  </div>
                )
              })}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div style={{ background: '#11151d', border: `2px solid ${scoreColor(result.score)}`, borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <CheckCircle size={20} color={scoreColor(result.score)} />
              <span style={{ fontSize: 28, fontWeight: 800, color: scoreColor(result.score) }}>{result.score?.toFixed(1)}</span>
              <span style={{ fontSize: 13, color: '#9aa3af' }}>/ 10</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#e6e8ec', lineHeight: 1.5 }}>{result.verdict}</p>
          </div>
        )}

        {err && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: '#1f0000', border: '1px solid #dc2626', color: '#fca5a5', fontSize: 13 }}>
            {err}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}

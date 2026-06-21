/* /orquestacion — página DIDÁCTICA: el mapa de las 9 etapas del motor, con todos los
 * conceptos etiquetados (estático/dinámico, cómo se llama cada cosa) + ejemplos en vivo.
 * Para aprenderse el modelo tal cual quedó.
 */
import { useEffect, useMemo, useState } from 'react'
import { motorAPI } from '../services/api'

const C = {
  bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1a1f2a',
  fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686', accent: '#38bdf8',
}
// naturaleza de cada etapa
const NAT = {
  fijo: { c: '#9aa3af', t: 'FIJO' },
  edad: { c: '#fbbf24', t: 'POR EDAD' },
  nivel: { c: '#7dd3fc', t: 'POR NIVEL' },
  dinamico: { c: '#818cf8', t: 'DINÁMICO (alumno)' },
}

type Nat = keyof typeof NAT
interface Etapa { n: number; name: string; does: string; nat: Nat; term: string; depends: string; tag: string }

const ETAPAS: Etapa[] = [
  { n: 1, name: 'Contexto', does: 'Idioma meta, modo de voz y reglas globales de la sesión.', nat: 'fijo', term: 'config global', depends: 'nada (igual para todos)', tag: 'runtime_context' },
  { n: 2, name: 'Quién enseña', does: 'El profe: nombre y tono con el que habla.', nat: 'edad', term: 'preset de tutor', depends: 'edad', tag: 'tutor_identity' },
  { n: 3, name: 'Cómo enseña', does: 'El método y las políticas. Acá entran las directivas de COMPORTAMIENTO del alumno.', nat: 'edad', term: 'preset de pedagogía + (dinámico) conducta', depends: 'edad + alumno', tag: 'pedagogical_framework' },
  { n: 4, name: 'La dinámica', does: 'La actividad y la recompensa. Acá entra la MOTIVACIÓN del alumno.', nat: 'edad', term: 'preset de actividad/recompensa + (dinámico) motivación', depends: 'edad + tópico + alumno', tag: 'lesson_focus_engagement' },
  { n: 5, name: 'El alumno + Memoria', does: 'Lo que el sistema aprendió de ESTE alumno: errores y fortalezas, con su directiva.', nat: 'dinamico', term: 'learned_state (memoria)', depends: 'alumno (historial)', tag: 'learner_state' },
  { n: 6, name: 'Las reglas', does: 'Los rieles que el coach respeta (por edad) + corrección/ayuda (por nivel) + seguridad.', nat: 'nivel', term: 'reglas / rieles (presets)', depends: 'edad × nivel', tag: 'behavioral_guards' },
  { n: 7, name: 'Qué aprende', does: 'Las funciones/gramática del nivel (objetivos) + frases para decirlas (chunks).', nat: 'nivel', term: 'objetivos + chunks (el "words"/léxico está dormido)', depends: 'nivel', tag: 'lesson_objectives' },
  { n: 8, name: 'Fases + ritmo', does: 'Los momentos de la clase, en orden, y cuánto dura.', nat: 'edad', term: 'fases + pacing', depends: 'edad × nivel', tag: 'narrative_spine' },
  { n: 9, name: 'Arranque / cierre', does: 'Cómo abre y cómo cierra la clase (varía por nivel: A1 con español → C1 inmersivo).', nat: 'nivel', term: 'trigger', depends: 'edad × nivel', tag: 'execution_trigger' },
]

function block(prompt: string, tag: string): string {
  const inner = (prompt || '').replace(/<\/?system_instruction_stack>/g, '')
  const m = inner.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return m ? m[1].trim() : '(vacío)'
}

export default function OrquestacionPanel() {
  const [bands, setBands] = useState<{ code: string; label: string; max_level_order?: number }[]>([])
  const [levels, setLevels] = useState<{ level_code: string; sort_order: number }[]>([])
  const [band, setBand] = useState('adult')
  const [level, setLevel] = useState('B1')
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    motorAPI.dimensions().then((d: any) => { setBands(d.bands || []); setLevels(d.levels || []) }).catch(() => {})
  }, [])
  const lvForBand = useMemo(() => {
    const mx = bands.find((b) => b.code === band)?.max_level_order ?? 99
    return levels.filter((l) => l.sort_order <= mx)
  }, [bands, levels, band])
  useEffect(() => { if (lvForBand.length && !lvForBand.some((l) => l.level_code === level)) setLevel(lvForBand[lvForBand.length - 1].level_code) }, [lvForBand, level])
  useEffect(() => {
    motorAPI.resolve({ band_code: band, level_code: level, topic_id: null, student_id: null }).then((r) => setPrompt(r.prompt)).catch(() => setPrompt(''))
  }, [band, level])

  const sel: React.CSSProperties = { padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.fg, fontSize: 13 }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '22px 18px 64px', fontFamily: 'system-ui, Segoe UI, sans-serif', lineHeight: 1.45 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, margin: '0 0 4px' }}>El motor de 9 etapas — mapa de conceptos</h1>
        <p style={{ color: C.dim, fontSize: 13, margin: '0 0 14px', maxWidth: 880 }}>
          Cada clase se arma con las <b>mismas 9 etapas</b>. Lo que cambia es el DATO. Hay dos mundos:
          el <b style={{ color: '#fbbf24' }}>molde estático</b> (catálogo: igual para todos los de esa edad/nivel) y
          el <b style={{ color: '#818cf8' }}>alumno dinámico</b> (su memoria, única de cada uno).
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22, fontSize: 12 }}>
          {Object.entries(NAT).map(([k, v]) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: v.c }} /> {v.t}
            </span>
          ))}
        </div>

        {/* las 9 etapas */}
        {ETAPAS.map((e) => {
          const v = NAT[e.nat]
          return (
            <div key={e.n} style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: `4px solid ${v.c}`, borderRadius: 10, padding: '12px 14px', marginBottom: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: v.c, minWidth: 18 }}>{e.n}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{e.name}</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: v.c, background: C.soft, padding: '2px 7px', borderRadius: 5, letterSpacing: 0.4 }}>{v.t}</span>
              </div>
              <div style={{ fontSize: 12.5, color: C.dim, margin: '6px 0 8px' }}>{e.does}</div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 11.5 }}>
                <span><b style={{ color: C.faint }}>se llama:</b> <span style={{ color: C.fg }}>{e.term}</span></span>
                <span><b style={{ color: C.faint }}>depende de:</b> <span style={{ color: C.fg }}>{e.depends}</span></span>
              </div>
            </div>
          )
        })}

        {/* el loop dinámico */}
        <div style={{ background: 'rgba(129,140,248,0.07)', border: '1px solid rgba(129,140,248,0.35)', borderRadius: 12, padding: 16, margin: '22px 0' }}>
          <h2 style={{ fontSize: 16, margin: '0 0 8px', color: '#a5b4fc' }}>El loop dinámico — cómo el alumno tiñe la clase</h2>
          <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6 }}>
            <b style={{ color: C.fg }}>observación en texto libre</b> (lo que pasó en la clase) →
            <b style={{ color: C.fg }}> la IA la encasilla</b> en un <b style={{ color: C.fg }}>preset</b> del learned_state
            (con <span style={{ color: '#22c55e' }}>polaridad + (fortaleza)</span> / <span style={{ color: '#f87171' }}>− (a trabajar)</span> y una <b style={{ color: C.fg }}>directiva</b>) →
            <b style={{ color: C.fg }}> se rutea a su etapa</b>: comportamiento→<b>3</b>, motivación→<b>4</b>, error/chunk→<b>5</b> →
            <b style={{ color: C.fg }}> la misma clase se recompone</b>. Los patrones son finitos: se reúsan entre alumnos (biblioteca compartida) y convergen.
          </div>
        </div>

        {/* ejemplo en vivo */}
        <h2 style={{ fontSize: 16, margin: '24px 0 10px' }}>Ejemplo en vivo — cambiá edad×nivel y mirá cómo se modifica</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <select style={sel} value={band} onChange={(e) => setBand(e.target.value)}>{bands.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}</select>
          <select style={sel} value={level} onChange={(e) => setLevel(e.target.value)}>{lvForBand.map((l) => <option key={l.level_code} value={l.level_code}>{l.level_code}</option>)}</select>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 11.5, color: C.faint }}>
            ejemplos:
            {[['early_child', 'A1'], ['child', 'A2'], ['teen', 'B1'], ['adult', 'C1']].map(([b, l]) => (
              <button key={b} onClick={() => { setBand(b); setLevel(l) }} style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.accent, borderRadius: 7, fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}>{b}·{l}</button>
            ))}
          </div>
        </div>
        {[['pedagogical_framework', '3 · Cómo enseña'], ['behavioral_guards', '6 · Las reglas'], ['lesson_objectives', '7 · Qué aprende'], ['execution_trigger', '9 · Arranque/cierre']].map(([tag, title]) => (
          <div key={tag} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 13px', marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 12, color: C.dim, whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 160, overflowY: 'auto' }}>{block(prompt, tag)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

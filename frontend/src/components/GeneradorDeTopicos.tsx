/* GENERADOR DE TÓPICOS — de una idea en una línea a un tópico que compone.
 *
 * Dos pasos a propósito: primero el BORRADOR, que no escribe nada en la base, y recién después
 * crear. En el medio están las alarmas, y si hay una alta el botón de activar no se habilita.
 *
 * Esa pausa es la feature, no un trámite. Un solo tópico sin categoría envenena la memoria del
 * alumno para TODAS sus materias — pasó, y costó una tarde encontrarlo. Generando tópicos desde
 * la app eso pasaría todos los días, así que lo que no pasa el chequeo no entra al catálogo.
 *
 * El esqueleto (categoría, familia, disciplina, niveles) lo arma el backend desde el CATÁLOGO;
 * al modelo se le pasa la lista de categorías reales y elige una. No inventa ninguna.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { motorAPI } from '../services/api'

interface Paleta {
  bg: string; fg: string; dim: string; faint: string
  panel: string; soft: string; border: string; accent: string
}

export interface GeneradorDeTopicosProps {
  disciplinas: string[]
  disciplinaActual: string
  idiomaActual: string
  C: Paleta
  /** Se llama cuando el tópico quedó creado, para refrescar el catálogo del panel. */
  onCreado: () => void
}

const SEGMENTOS = ['adultos', 'teen', 'junior', 'mini']
const IDIOMAS = ['es', 'en', 'pt', 'fr', 'it', 'de']

export function GeneradorDeTopicos({
  disciplinas, disciplinaActual, idiomaActual, C, onCreado,
}: GeneradorDeTopicosProps) {
  const [abierto, setAbierto] = useState(false)
  const [idea, setIdea] = useState('')
  const [disc, setDisc] = useState(disciplinaActual)
  const [seg, setSeg] = useState('adultos')
  const [idi, setIdi] = useState(idiomaActual)
  const [cargando, setCargando] = useState(false)
  const [res, setRes] = useState<any>(null)
  const [creado, setCreado] = useState<any>(null)

  const generar = () => {
    if (!idea.trim()) return
    setCargando(true)
    setRes(null)
    setCreado(null)
    motorAPI.topicoBorrador({ idea: idea.trim(), discipline: disc, segmento: seg, idioma: idi })
      .then(setRes)
      .catch((e) => toast.error(e?.response?.data?.detail || 'no se pudo armar el borrador'))
      .finally(() => setCargando(false))
  }

  const crear = () => {
    const b = res?.borrador
    if (!b?.category_id) return
    setCargando(true)
    motorAPI.topicoCrear({
      title: b.title, category_id: b.category_id, segmento: b.segmento,
      levels: b.levels, keywords: b.keywords, activar: true,
    })
      .then((r) => {
        setCreado(r)
        toast.success(`Tópico ${r.topic_id} creado y activo`)
        onCreado()
      })
      .catch((e) => toast.error(e?.response?.data?.detail || 'no se pudo crear'))
      .finally(() => setCargando(false))
  }

  const inp = {
    background: C.bg, color: C.fg, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '6px 10px', fontSize: 12.5,
  }

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexWrap: 'wrap' }}
        onClick={() => setAbierto((v) => !v)}
      >
        <b style={{ fontSize: 12 }}>Tópico nuevo</b>
        <span style={{ fontSize: 11, color: C.dim }}>
          una idea en una línea, y queda disponible para dar clases
        </span>
        <span style={{ marginLeft: 'auto', color: C.dim, fontSize: 12 }}>{abierto ? 'ocultar' : 'abrir'}</span>
      </div>

      {abierto && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') generar() }}
              placeholder="mantenimiento de bicicletas"
              style={{ ...inp, flex: '1 1 260px', minWidth: 200 }}
            />
            <select value={disc} onChange={(e) => setDisc(e.target.value)} style={inp}>
              {disciplinas.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={seg} onChange={(e) => setSeg(e.target.value)} style={inp}>
              {SEGMENTOS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select
              value={idi}
              onChange={(e) => setIdi(e.target.value)}
              style={inp}
              title="Idioma en que se cargan las semillas. El catálogo las guarda en un idioma y el coach las convierte."
            >
              {IDIOMAS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <button
              onClick={generar}
              disabled={cargando || !idea.trim()}
              style={{
                background: C.accent, color: C.bg, border: 0, borderRadius: 8, fontSize: 12.5,
                fontWeight: 800, padding: '6px 16px', cursor: 'pointer',
                opacity: cargando || !idea.trim() ? 0.5 : 1,
              }}
            >
              {cargando ? 'armando…' : 'Armar'}
            </button>
          </div>

          {res?.borrador && (
            <div style={{
              border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 13.5 }}>{res.borrador.title}</b>
                <span style={{ fontSize: 11, color: C.dim }}>
                  {res.borrador.category_name} · familia {res.borrador.family} · {res.borrador.segmento}
                </span>
                <span style={{ fontSize: 10.5, color: C.faint, fontFamily: 'ui-monospace, monospace' }}>
                  {(res.borrador.levels || []).join(' ')}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(res.borrador.keywords || []).map((k: string) => (
                  <span key={k} style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 999,
                    background: C.soft, border: `1px solid ${C.border}`, color: C.fg,
                  }}>{k}</span>
                ))}
              </div>

              {res.por_que && (
                <div style={{ fontSize: 11, color: C.dim, fontStyle: 'italic' }}>{res.por_que}</div>
              )}

              {(res.alarmas || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {res.alarmas.map((a: any, i: number) => (
                    <div key={i} style={{
                      fontSize: 11,
                      color: a.severidad === 'alta' ? 'var(--color-danger)' : '#E6A23C',
                    }}>
                      [{a.severidad}] {a.detalle}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={crear}
                  disabled={cargando || !res.puede_activarse}
                  title={res.puede_activarse
                    ? 'Lo crea activo: las clases quedan disponibles'
                    : 'Hay una alarma alta — así entraría roto al catálogo'}
                  style={{
                    background: res.puede_activarse ? C.accent : C.soft,
                    color: res.puede_activarse ? C.bg : C.faint,
                    border: 0, borderRadius: 8, fontSize: 12.5, fontWeight: 800,
                    padding: '6px 16px',
                    cursor: res.puede_activarse ? 'pointer' : 'not-allowed',
                  }}
                >
                  Crear y activar
                </button>
                <button
                  onClick={generar}
                  disabled={cargando}
                  style={{
                    background: 'none', border: `1px solid ${C.border}`, color: C.dim,
                    borderRadius: 8, fontSize: 12, padding: '6px 14px', cursor: 'pointer',
                  }}
                >
                  Rehacer
                </button>
                {creado && (
                  <span style={{ fontSize: 11.5, color: C.accent }}>
                    tópico {creado.topic_id} activo · {creado.clases_disponibles} niveles disponibles
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GeneradorDeTopicos

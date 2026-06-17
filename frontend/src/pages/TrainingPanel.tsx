/* TrainingPanel — /admin/training · CICLO DE APRENDIZAJE de un alumno de prueba.
 *
 * Cierra el ciclo del motor: ves la MEMORIA del alumno (su currículum con estado SRS),
 * "das la clase de hoy" (lo que toca = currículum − dominado, due primero), marcás cómo
 * le fue (bien/regular/mal) y CERRÁS LA CLASE → el motor sube la escalera SRS. La próxima
 * clase YA lee todos los valores anteriores: lo dominado no vuelve a caer, lo 'due' avanza.
 *
 * Backend: /motor/train/state (memoria) + /motor/train/apply (post-clase). motor_postclass real.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { motorAPI } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Student { student_id: number; name: string; age: number; level_code: string }
interface Objective { objective_id: number; code: string; kind: string; description: string; status: string }
interface Item { item_type: string; item_value: string; status: string }
interface State { student: Student; objectives: Objective[]; items: Item[] }

const C = {
  bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1c2230',
  fg: '#e6e8ec', dim: '#9aa3af', faint: '#6b7686', accent: '#38bdf8', green: '#22c55e', amber: '#fbbf24', blue: '#7dd3fc', red: '#f87171',
}
const ST = {
  mastered: { c: C.green, l: 'dominado' }, due: { c: C.amber, l: 'a repasar' },
  learning: { c: C.blue, l: 'aprendiendo' }, nuevo: { c: C.faint, l: 'nuevo' },
} as Record<string, { c: string; l: string }>
const OBJ_PER_CLASS = 4
const sel: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.fg, fontSize: 13 }

export default function TrainingPanel() {
  const isMobile = useIsMobile()
  const [students, setStudents] = useState<Student[]>([])
  const [sid, setSid] = useState<number | undefined>()
  const [state, setState] = useState<State | null>(null)
  const [marks, setMarks] = useState<Record<number, 'good' | 'partial' | 'fail'>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    motorAPI.dimensions().then((d: any) => {
      setStudents(d.students || [])
      if (d.students?.[0]) setSid(d.students[0].student_id)
    }).catch(() => {})
  }, [])

  const load = useCallback(() => {
    if (!sid) return
    motorAPI.trainState(sid).then((s) => { setState(s); setMarks({}) }).catch(() => toast.error('No pude cargar la memoria'))
  }, [sid])
  useEffect(() => { load() }, [load])

  // "la clase de hoy": currículum − dominado, due primero, máx 4 (igual que el motor)
  const todayClass = useMemo(() => {
    if (!state) return []
    return [...state.objectives]
      .filter((o) => o.status !== 'mastered')
      .sort((a, b) => (b.status === 'due' ? 1 : 0) - (a.status === 'due' ? 1 : 0))
      .slice(0, OBJ_PER_CLASS)
  }, [state])

  const counts = useMemo(() => {
    const c: Record<string, number> = { mastered: 0, due: 0, learning: 0, nuevo: 0 }
    state?.objectives.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1 })
    return c
  }, [state])

  const closeClass = async () => {
    if (!sid) return
    const objectives = Object.entries(marks).map(([oid, score]) => [Number(oid), score] as [number, string])
    if (!objectives.length) { toast.error('Marcá al menos un objetivo'); return }
    setBusy(true)
    try {
      await motorAPI.trainApply({ student_id: sid, outcomes: { objectives } })
      toast.success('Clase cerrada · memoria actualizada')
      load()  // re-lee el estado: la próxima clase ya ve los valores nuevos
    } catch { toast.error('No se pudo cerrar la clase') } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '20px 16px 64px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px' }}>Training · ciclo de aprendizaje</h1>
        <p style={{ color: C.dim, fontSize: 12.5, margin: '0 0 14px', maxWidth: 760 }}>
          Probás el ciclo del motor con un alumno: ves su <b>memoria</b>, das la <b>clase de hoy</b> (lo que toca = currículum − dominado),
          marcás cómo le fue y <b>cerrás la clase</b> → el motor sube la escalera SRS. La próxima clase ya lee los valores anteriores: lo dominado no vuelve, lo <i>due</i> avanza.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 10.5, color: C.faint, fontWeight: 700, textTransform: 'uppercase', display: 'flex', flexDirection: 'column', gap: 4 }}>
            Alumno de prueba
            <select style={{ ...sel, minWidth: 200 }} value={sid ?? ''} onChange={(e) => setSid(Number(e.target.value))}>
              {students.map((s) => <option key={s.student_id} value={s.student_id}>{s.name} · {s.age} años · {s.level_code}</option>)}
            </select>
          </label>
          {state && (
            <div style={{ display: 'flex', gap: 8, marginLeft: isMobile ? 0 : 'auto', flexWrap: 'wrap' }}>
              {Object.entries(ST).map(([k, v]) => (
                <span key={k} style={{ fontSize: 11.5, color: C.dim, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 999, background: v.c }} /> {v.l}: <b style={{ color: v.c }}>{counts[k] || 0}</b>
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
          {/* memoria del alumno */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>Memoria del alumno</div>
            <div style={{ fontSize: 11.5, color: C.faint, marginBottom: 12 }}>Currículum de {state?.student.level_code} con su estado. Esto es lo que el motor lee en cada clase.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {state?.objectives.map((o) => {
                const s = ST[o.status] || ST.nuevo
                return (
                  <div key={o.objective_id} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '7px 9px', borderRadius: 8, background: C.bg, border: `1px solid ${C.soft}`, borderLeft: `3px solid ${s.c}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: C.fg }}>{o.description}</div>
                      <span style={{ fontSize: 9.5, color: C.faint, fontFamily: 'monospace' }}>{o.kind} · {o.code}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.c, textTransform: 'uppercase' }}>{s.l}</span>
                  </div>
                )
              })}
            </div>
            {!!state?.items.length && (
              <div style={{ marginTop: 14, borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: C.faint, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Vocabulario / errores</div>
                {state.items.map((it, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.dim, padding: '2px 0', display: 'flex', gap: 8 }}>
                    <span style={{ color: (ST[it.status] || ST.nuevo).c, minWidth: 70, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{(ST[it.status] || ST.nuevo).l}</span>
                    <span style={{ color: C.faint, minWidth: 48 }}>{it.item_type}</span>
                    <span>{it.item_value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* la clase de hoy */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, position: isMobile ? 'static' : 'sticky', top: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>La clase de hoy</div>
            <div style={{ fontSize: 11.5, color: C.faint, marginBottom: 12 }}>Lo que toca (currículum − dominado, lo <i>a repasar</i> primero). Marcá cómo le fue y cerrá.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayClass.map((o) => (
                <div key={o.objective_id} style={{ padding: '9px 10px', borderRadius: 9, background: C.bg, border: `1px solid ${marks[o.objective_id] ? C.accent : C.soft}` }}>
                  <div style={{ fontSize: 12.5, color: C.fg, marginBottom: 7 }}>{o.description}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([['good', 'bien', C.green], ['partial', 'regular', C.amber], ['fail', 'mal', C.red]] as const).map(([v, l, col]) => (
                      <button key={v} onClick={() => setMarks((p) => ({ ...p, [o.objective_id]: v }))}
                        style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: `1px solid ${marks[o.objective_id] === v ? col : C.border}`, background: marks[o.objective_id] === v ? col : 'transparent', color: marks[o.objective_id] === v ? '#06281a' : C.dim, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!todayClass.length && <div style={{ fontSize: 12.5, color: C.green, padding: 10 }}>Todo dominado en este nivel. Subí al alumno de nivel o reiniciá la memoria.</div>}
            </div>
            <button onClick={closeClass} disabled={busy || !Object.keys(marks).length}
              style={{ marginTop: 14, width: '100%', background: Object.keys(marks).length ? C.green : C.soft, border: 0, color: Object.keys(marks).length ? '#06281a' : C.faint, borderRadius: 9, fontSize: 13.5, fontWeight: 800, padding: '11px 0', cursor: Object.keys(marks).length ? 'pointer' : 'default' }}>
              {busy ? 'cerrando…' : 'Cerrar la clase → actualizar memoria'}
            </button>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
              "bien" sube la escalera (nuevo→repasar→dominado). Cerrá y mirá la memoria a la izquierda cambiar — esa es la próxima clase.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

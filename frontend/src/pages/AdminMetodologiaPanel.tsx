/**
 * /admin/metodologia — Módulo Metodología (super admin).
 *
 * Los RIELES pedagógicos por EDAD × NIVEL (Motor Pedagógico Adaptativo): las
 * auto-restricciones que blindan al coach ("A0 solo 1-3 palabras", "A1 prohibido
 * el pasado"), NO el contenido (eso son los Tópicos). Backend: /api/methodology-modules.
 */
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { API_BASE_URL } from '../services/api'

interface Module {
  id: number
  student_type: string
  level: string
  module_order: number
  focus_name: string
  ai_restraints: string
  target_grammar: string | null
  evaluation_criteria: string | null
  correction_hint: string | null
  code: string | null
  notes: string | null
  active: boolean
}

interface EditState {
  id?: number
  student_type: string
  level: string
  module_order: number
  focus_name: string
  ai_restraints: string
  target_grammar: string
  evaluation_criteria: string
  correction_hint: string
  notes: string
  active: boolean
}

const AGES: { slug: string; label: string }[] = [
  { slug: 'adult', label: 'Adulto' },
  { slug: 'mini', label: 'Mini · 4-7' },
  { slug: 'junior', label: 'Junior · 8-12' },
  { slug: 'tween', label: 'Tween · 13+' },
]
const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const EMPTY: EditState = {
  student_type: 'adult', level: 'A0', module_order: 1, focus_name: '',
  ai_restraints: '', target_grammar: '', evaluation_criteria: '',
  correction_hint: '', notes: '', active: true,
}

const CSS = `
.meto-root { padding: 24px 32px 80px; max-width: 1320px; margin: 0 auto; color: var(--fg-1); }
.meto-h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 6px; }
.meto-sub { color: var(--fg-3); font-size: 14px; margin-bottom: 18px; max-width: 760px; }
.meto-actions { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.meto-btn { padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; border: 0; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: 6px; }
.meto-btn-primary { background: var(--primary); color: white; }
.meto-btn-ghost { background: var(--bg-2); color: var(--fg-2); border: 1px solid var(--border-1); }
.meto-search { height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border-2); background: var(--surface); color: var(--fg-1); font-size: 14px; outline: none; }
.meto-table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-1); }
.meto-table th, .meto-table td { padding: 11px 12px; font-size: 13px; text-align: left; border-bottom: 1px solid var(--border-1); vertical-align: top; }
.meto-table th { background: var(--bg-2); font-weight: 700; color: var(--fg-2); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
.meto-table tr:last-child td { border-bottom: 0; }
.meto-table tr:hover td { background: rgba(255,255,255,.02); }
.meto-lvl { display: inline-block; padding: 3px 9px; border-radius: 8px; font-size: 12px; font-weight: 800; background: rgba(59,130,246,.14); color: #60A5FA; letter-spacing: .04em; }
.meto-restraints { color: var(--fg-3); font-size: 12.5px; line-height: 1.5; max-width: 460px; }
.meto-grammar { color: var(--fg-2); font-style: italic; font-size: 12.5px; }
.meto-pill { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.meto-pill-on { background: rgba(0,179,126,.12); color: #00B37E; }
.meto-pill-off { background: rgba(255,255,255,.06); color: var(--fg-3); }
.meto-action-btn { padding: 5px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600; border: 0; cursor: pointer; margin-right: 4px; }
.meto-action-btn.edit { background: rgba(59,130,246,.15); color: #3B82F6; }
.meto-action-btn.del { background: rgba(229,72,77,.12); color: #E5484D; }
.meto-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.meto-modal { background: var(--surface); border-radius: 16px; padding: 24px; width: 620px; max-width: 94vw; max-height: 92vh; overflow-y: auto; border: 1px solid var(--border-2); box-shadow: 0 24px 60px rgba(0,0,0,.5); }
.meto-modal h2 { margin: 0 0 14px; font-size: 18px; font-weight: 800; }
.meto-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.meto-form-grid .full { grid-column: 1 / -1; }
.meto-field { display: flex; flex-direction: column; gap: 4px; }
.meto-field label { font-size: 11px; color: var(--fg-3); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.meto-field input, .meto-field select, .meto-field textarea { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-2); background: var(--bg-2); color: var(--fg-1); font-size: 14px; outline: none; font-family: inherit; }
.meto-field input, .meto-field select { height: 36px; }
.meto-field input:focus, .meto-field select:focus, .meto-field textarea:focus { border-color: var(--primary); }
.meto-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
`

export default function AdminMetodologiaPanel() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [ageFilter, setAgeFilter] = useState('adult')
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const tok = () => localStorage.getItem('token')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/methodology-modules?student_type=${ageFilter}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      })
      if (!res.ok) throw new Error()
      setModules(await res.json())
    } catch {
      toast.error('Error cargando la metodología')
    } finally {
      setLoading(false)
    }
  }, [ageFilter])

  useEffect(() => { load() }, [load])

  const startNew = () => setEdit({ ...EMPTY, student_type: ageFilter })

  const startEdit = (m: Module) => setEdit({
    id: m.id, student_type: m.student_type, level: m.level, module_order: m.module_order,
    focus_name: m.focus_name, ai_restraints: m.ai_restraints || '',
    target_grammar: m.target_grammar || '', evaluation_criteria: m.evaluation_criteria || '',
    correction_hint: m.correction_hint || '', notes: m.notes || '', active: m.active,
  })

  const submit = async () => {
    if (!edit) return
    setSaving(true)
    try {
      const body = {
        student_type: edit.student_type, level: edit.level, module_order: edit.module_order,
        focus_name: edit.focus_name, ai_restraints: edit.ai_restraints,
        target_grammar: edit.target_grammar || null,
        evaluation_criteria: edit.evaluation_criteria || null,
        correction_hint: edit.correction_hint || null,
        notes: edit.notes || null, active: edit.active,
      }
      const url = edit.id ? `${API_BASE_URL}/methodology-modules/${edit.id}` : `${API_BASE_URL}/methodology-modules`
      const res = await fetch(url, {
        method: edit.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(edit.id ? 'Riel actualizado' : 'Riel creado')
      setEdit(null)
      load()
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async (m: Module) => {
    if (!window.confirm(`¿Borrar el riel "${m.focus_name}" (${m.level})?`)) return
    setDeleting(m.id)
    try {
      const res = await fetch(`${API_BASE_URL}/methodology-modules/${m.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tok()}` },
      })
      if (!res.ok) throw new Error()
      toast.success('Riel borrado')
      load()
    } catch {
      toast.error('No se pudo borrar')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="meto-root">
      <style>{CSS}</style>
      <h1 className="meto-h1">Metodología</h1>
      <p className="meto-sub">
        Los <b>rieles pedagógicos por edad y nivel</b>: las reglas que blindan al coach
        (qué puede y qué NO puede decir en cada nivel). Es el <i>cómo</i> se enseña —
        el <i>qué</i> (vocabulario, temas) vive en Tópicos.
      </p>

      <div className="meto-actions">
        <select className="meto-search" style={{ maxWidth: 220 }} value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)}>
          {AGES.map((a) => <option key={a.slug} value={a.slug}>{a.label}</option>)}
        </select>
        <button className="meto-btn meto-btn-primary" onClick={startNew}>+ Nuevo riel</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--fg-3)' }}>Cargando…</p>
      ) : (
        <table className="meto-table">
          <thead>
            <tr><th>Nivel</th><th>Foco</th><th>Reglas del coach (auto-restricciones)</th><th>Gramática objetivo</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id}>
                <td><span className="meto-lvl">{m.level}</span></td>
                <td><b>{m.focus_name}</b></td>
                <td><div className="meto-restraints">{m.ai_restraints}</div></td>
                <td><span className="meto-grammar">{m.target_grammar}</span></td>
                <td>{m.active ? <span className="meto-pill meto-pill-on">activo</span> : <span className="meto-pill meto-pill-off">off</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="meto-action-btn edit" onClick={() => startEdit(m)}>Editar</button>
                  <button className="meto-action-btn del" onClick={() => doDelete(m)} disabled={deleting === m.id}>Borrar</button>
                </td>
              </tr>
            ))}
            {modules.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--fg-3)' }}>Sin rieles para esta edad. Creá el primero.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {edit && (
        <div className="meto-modal-backdrop" onClick={() => setEdit(null)}>
          <div className="meto-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{edit.id ? 'Editar riel' : 'Nuevo riel'}</h2>
            <div className="meto-form-grid">
              <div className="meto-field"><label>Edad</label><select value={edit.student_type} onChange={(e) => setEdit({ ...edit, student_type: e.target.value })}>{AGES.map((a) => <option key={a.slug} value={a.slug}>{a.label}</option>)}</select></div>
              <div className="meto-field"><label>Nivel</label><select value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value })}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
              <div className="meto-field"><label>Orden</label><input type="number" value={edit.module_order} onChange={(e) => setEdit({ ...edit, module_order: parseInt(e.target.value) || 1 })} /></div>
              <div className="meto-field full"><label>Foco (nombre del módulo)</label><input value={edit.focus_name} onChange={(e) => setEdit({ ...edit, focus_name: e.target.value })} placeholder="Aislamiento fonético, Presente continuo…" /></div>
              <div className="meto-field full"><label>Reglas del coach — auto-restricciones (lo más importante)</label><textarea rows={5} value={edit.ai_restraints} onChange={(e) => setEdit({ ...edit, ai_restraints: e.target.value })} placeholder="Ej: PROHIBIDO usar oraciones completas. Hablás solo en frases de 1 a 3 palabras…" /></div>
              <div className="meto-field full"><label>Gramática objetivo</label><input value={edit.target_grammar} onChange={(e) => setEdit({ ...edit, target_grammar: e.target.value })} placeholder="Sustantivos aislados / Presente continuo Verb+ing…" /></div>
              <div className="meto-field full"><label>Criterio de avance</label><textarea rows={2} value={edit.evaluation_criteria} onChange={(e) => setEdit({ ...edit, evaluation_criteria: e.target.value })} placeholder="Hito de éxito para avanzar de nivel/etapa" /></div>
              <div className="meto-field full"><label>Hint de corrección (recast)</label><input value={edit.correction_hint} onChange={(e) => setEdit({ ...edit, correction_hint: e.target.value })} placeholder="Cómo reformular sin explicar gramática" /></div>
              <div className="meto-field full"><label>Notas (pedagogo)</label><textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
              <div className="meto-field"><label>Activo</label><select value={edit.active ? '1' : '0'} onChange={(e) => setEdit({ ...edit, active: e.target.value === '1' })}><option value="1">Sí</option><option value="0">No</option></select></div>
            </div>
            <div className="meto-modal-actions">
              <button className="meto-btn meto-btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="meto-btn meto-btn-primary" onClick={submit} disabled={saving || !edit.focus_name}>{saving ? 'Guardando…' : edit.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

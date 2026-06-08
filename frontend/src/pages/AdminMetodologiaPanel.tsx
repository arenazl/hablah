/**
 * /admin/metodologia — Módulo Metodología (super admin).
 *
 * ABM del currículum por etapas: vocabulario + estructura + criterio de avance,
 * por grupo etario (mini/junior/tween). El coach enseña SOLO la etapa donde
 * está el alumno. Backend: /api/methodology (admin-only).
 */
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { API_BASE_URL } from '../services/api'

interface VocabItem {
  en: string
  es: string
}

interface Stage {
  id: number
  age_group: string
  cefr_level: string
  order_index: number
  title: string
  vocabulary: VocabItem[]
  target_structure: string | null
  target_structure_es: string | null
  mastery_criteria: string | null
  notes: string | null
  active: boolean
}

interface EditState {
  id?: number
  age_group: string
  cefr_level: string
  order_index: number
  title: string
  vocabText: string
  target_structure: string
  target_structure_es: string
  mastery_criteria: string
  notes: string
  active: boolean
}

const EMPTY: EditState = {
  age_group: 'mini', cefr_level: 'A0', order_index: 0, title: '',
  vocabText: '', target_structure: '', target_structure_es: '',
  mastery_criteria: '', notes: '', active: true,
}

const vocabToText = (v: VocabItem[]): string =>
  (v || []).map((x) => `${x.en} | ${x.es}`).join('\n')

const textToVocab = (t: string): VocabItem[] =>
  t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [en, es] = l.split('|').map((s) => s.trim())
    return { en: en || '', es: es || '' }
  }).filter((x) => x.en)

const CSS = `
.meto-root { padding: 24px 32px 80px; max-width: 1280px; margin: 0 auto; color: var(--fg-1); }
.meto-h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 6px; }
.meto-sub { color: var(--fg-3); font-size: 14px; margin-bottom: 18px; }
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
.meto-pill { padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.meto-pill-on { background: rgba(0,179,126,.12); color: #00B37E; }
.meto-pill-off { background: rgba(255,255,255,.06); color: var(--fg-3); }
.meto-action-btn { padding: 5px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600; border: 0; cursor: pointer; margin-right: 4px; }
.meto-action-btn.edit { background: rgba(59,130,246,.15); color: #3B82F6; }
.meto-action-btn.del { background: rgba(229,72,77,.12); color: #E5484D; }
.meto-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.meto-modal { background: var(--surface); border-radius: 16px; padding: 24px; width: 560px; max-width: 94vw; max-height: 92vh; overflow-y: auto; border: 1px solid var(--border-2); box-shadow: 0 24px 60px rgba(0,0,0,.5); }
.meto-modal h2 { margin: 0 0 14px; font-size: 18px; font-weight: 800; }
.meto-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.meto-form-grid .full { grid-column: 1 / -1; }
.meto-field { display: flex; flex-direction: column; gap: 4px; }
.meto-field label { font-size: 11px; color: var(--fg-3); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.meto-field input, .meto-field select, .meto-field textarea { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-2); background: var(--bg-2); color: var(--fg-1); font-size: 14px; outline: none; font-family: inherit; }
.meto-field input, .meto-field select { height: 36px; }
.meto-field input:focus, .meto-field select:focus, .meto-field textarea:focus { border-color: var(--primary); }
.meto-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
`

export default function AdminMetodologiaPanel() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)
  const [ageFilter, setAgeFilter] = useState('mini')
  const [edit, setEdit] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const tok = () => localStorage.getItem('token')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/methodology?age_group=${ageFilter}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      })
      if (!res.ok) throw new Error()
      setStages(await res.json())
    } catch {
      toast.error('Error cargando la metodología')
    } finally {
      setLoading(false)
    }
  }, [ageFilter])

  useEffect(() => { load() }, [load])

  const startNew = () => setEdit({
    ...EMPTY,
    age_group: ageFilter,
    order_index: stages.length ? Math.max(...stages.map((s) => s.order_index)) + 1 : 1,
  })

  const startEdit = (s: Stage) => setEdit({
    id: s.id, age_group: s.age_group, cefr_level: s.cefr_level, order_index: s.order_index,
    title: s.title, vocabText: vocabToText(s.vocabulary),
    target_structure: s.target_structure || '', target_structure_es: s.target_structure_es || '',
    mastery_criteria: s.mastery_criteria || '', notes: s.notes || '', active: s.active,
  })

  const submit = async () => {
    if (!edit) return
    setSaving(true)
    try {
      const body = {
        age_group: edit.age_group, cefr_level: edit.cefr_level, order_index: edit.order_index,
        title: edit.title, vocabulary: textToVocab(edit.vocabText),
        target_structure: edit.target_structure || null,
        target_structure_es: edit.target_structure_es || null,
        mastery_criteria: edit.mastery_criteria || null,
        notes: edit.notes || null, active: edit.active,
      }
      const url = edit.id ? `${API_BASE_URL}/methodology/${edit.id}` : `${API_BASE_URL}/methodology`
      const res = await fetch(url, {
        method: edit.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(edit.id ? 'Etapa actualizada' : 'Etapa creada')
      setEdit(null)
      load()
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async (s: Stage) => {
    if (!window.confirm(`¿Borrar la etapa "${s.title}"?`)) return
    setDeleting(s.id)
    try {
      const res = await fetch(`${API_BASE_URL}/methodology/${s.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tok()}` },
      })
      if (!res.ok) throw new Error()
      toast.success('Etapa borrada')
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
        Plan de estudios por etapas. El coach enseña <b>solo la etapa donde está el alumno</b> (vocabulario + estructura).
      </p>

      <div className="meto-actions">
        <select className="meto-search" style={{ maxWidth: 200 }} value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)}>
          <option value="mini">Mini · 4-7 años</option>
          <option value="junior">Junior · 7-10 años</option>
          <option value="tween">Tween · 10-14 años</option>
        </select>
        <button className="meto-btn meto-btn-primary" onClick={startNew}>+ Nueva etapa</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--fg-3)' }}>Cargando…</p>
      ) : (
        <table className="meto-table">
          <thead>
            <tr><th>#</th><th>Etapa</th><th>Vocabulario</th><th>Estructura</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {stages.map((s) => (
              <tr key={s.id}>
                <td>{s.order_index}</td>
                <td><b>{s.title}</b></td>
                <td style={{ color: 'var(--fg-3)' }}>{(s.vocabulary || []).map((v) => v.en).join(', ')}</td>
                <td><i>{s.target_structure}</i></td>
                <td>{s.active ? <span className="meto-pill meto-pill-on">activa</span> : <span className="meto-pill meto-pill-off">off</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="meto-action-btn edit" onClick={() => startEdit(s)}>Editar</button>
                  <button className="meto-action-btn del" onClick={() => doDelete(s)} disabled={deleting === s.id}>Borrar</button>
                </td>
              </tr>
            ))}
            {stages.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--fg-3)' }}>Sin etapas para este grupo. Creá la primera.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {edit && (
        <div className="meto-modal-backdrop" onClick={() => setEdit(null)}>
          <div className="meto-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{edit.id ? 'Editar etapa' : 'Nueva etapa'}</h2>
            <div className="meto-form-grid">
              <div className="meto-field"><label>Orden</label><input type="number" value={edit.order_index} onChange={(e) => setEdit({ ...edit, order_index: parseInt(e.target.value) || 0 })} /></div>
              <div className="meto-field"><label>Grupo</label><select value={edit.age_group} onChange={(e) => setEdit({ ...edit, age_group: e.target.value })}><option value="mini">Mini</option><option value="junior">Junior</option><option value="tween">Tween</option></select></div>
              <div className="meto-field full"><label>Título de la etapa</label><input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Saludos, Colores…" /></div>
              <div className="meto-field full"><label>Vocabulario — una por línea: inglés | español</label><textarea rows={5} value={edit.vocabText} onChange={(e) => setEdit({ ...edit, vocabText: e.target.value })} placeholder={'hello | hola\nbye | chau'} /></div>
              <div className="meto-field"><label>Estructura (inglés)</label><input value={edit.target_structure} onChange={(e) => setEdit({ ...edit, target_structure: e.target.value })} placeholder="My name is ___" /></div>
              <div className="meto-field"><label>Estructura (español)</label><input value={edit.target_structure_es} onChange={(e) => setEdit({ ...edit, target_structure_es: e.target.value })} placeholder="Me llamo ___" /></div>
              <div className="meto-field full"><label>Criterio de avance</label><input value={edit.mastery_criteria} onChange={(e) => setEdit({ ...edit, mastery_criteria: e.target.value })} placeholder="Cuándo se da por aprendida" /></div>
              <div className="meto-field full"><label>Notas (pedagogo)</label><textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
              <div className="meto-field"><label>Activa</label><select value={edit.active ? '1' : '0'} onChange={(e) => setEdit({ ...edit, active: e.target.value === '1' })}><option value="1">Sí</option><option value="0">No</option></select></div>
            </div>
            <div className="meto-modal-actions">
              <button className="meto-btn meto-btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="meto-btn meto-btn-primary" onClick={submit} disabled={saving || !edit.title}>{saving ? 'Guardando…' : edit.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

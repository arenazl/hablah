/**
 * /admin/metodologia — Motor Pedagógico Adaptativo (super admin).
 *
 * Tres pestañas:
 *   1. Identidades  — quién es el tutor por tipo de alumno (bloques 2-4 del compositor)
 *   2. Rieles       — auto-restricciones por tipo × nivel (bloque 6)
 *   3. (futuro)     — Contenido por tópico × módulo (bloques 7-9)
 */
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { API_BASE_URL } from '../services/api'

/* ── tipos ─────────────────────────────────────────────────────────────────── */
interface StudentType {
  id: number
  slug: string
  name: string
  description: string
  age_min: number | null
  age_max: number | null
  tutor_mascot: string
  tutor_identity: string
  tutor_tonal_rules: string
  session_focus: string
  closing_seed: string
}

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
  max_session_minutes: number | null
  max_turns: number | null
  code: string | null
  notes: string | null
  active: boolean
}

interface ModuleEdit {
  id?: number
  student_type: string
  level: string
  module_order: number
  focus_name: string
  ai_restraints: string
  target_grammar: string
  evaluation_criteria: string
  correction_hint: string
  max_session_minutes: number | null
  max_turns: number | null
  notes: string
  active: boolean
}

/* ── constantes ─────────────────────────────────────────────────────────────── */
const AGES: { slug: string; label: string }[] = [
  { slug: 'mini',   label: 'Mini · 4-7' },
  { slug: 'junior', label: 'Junior · 8-12' },
  { slug: 'tween',  label: 'Tween · 13+' },
  { slug: 'adult',  label: 'Adulto' },
]
const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const EMPTY_MODULE: ModuleEdit = {
  student_type: 'adult', level: 'A0', module_order: 1, focus_name: '',
  ai_restraints: '', target_grammar: '', evaluation_criteria: '',
  correction_hint: '', max_session_minutes: null, max_turns: null, notes: '', active: true,
}

/* ── estilos ─────────────────────────────────────────────────────────────────── */
const CSS = `
.meto-root { padding: 24px 32px 80px; max-width: 1320px; margin: 0 auto; color: var(--fg-1); }
.meto-h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 4px; }
.meto-sub { color: var(--fg-3); font-size: 14px; margin-bottom: 18px; max-width: 760px; }

/* tabs */
.meto-tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--border-1); margin-bottom: 20px; }
.meto-tab { padding: 10px 18px; font-size: 13px; font-weight: 700; border: 0; background: none;
  color: var(--fg-3); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: color .15s, border-color .15s; }
.meto-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
.meto-tab:hover:not(.active) { color: var(--fg-1); }

/* actions row */
.meto-actions { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.meto-btn { padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; border: 0; cursor: pointer; transition: all .15s; display: inline-flex; align-items: center; gap: 6px; }
.meto-btn-primary { background: var(--primary); color: white; }
.meto-btn-ghost { background: var(--bg-2); color: var(--fg-2); border: 1px solid var(--border-1); }
.meto-btn:disabled { opacity: .5; cursor: not-allowed; }
.meto-search { height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border-2); background: var(--surface); color: var(--fg-1); font-size: 14px; outline: none; }

/* table */
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

/* modal */
.meto-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.meto-modal { background: var(--surface); border-radius: 16px; padding: 24px; width: 660px; max-width: 94vw; max-height: 92vh; overflow-y: auto; border: 1px solid var(--border-2); box-shadow: 0 24px 60px rgba(0,0,0,.5); }
.meto-modal h2 { margin: 0 0 14px; font-size: 18px; font-weight: 800; }
.meto-form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.meto-form-grid .full { grid-column: 1 / -1; }
.meto-field { display: flex; flex-direction: column; gap: 4px; }
.meto-field label { font-size: 11px; color: var(--fg-3); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.meto-field input, .meto-field select, .meto-field textarea { padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-2); background: var(--bg-2); color: var(--fg-1); font-size: 14px; outline: none; font-family: inherit; }
.meto-field input, .meto-field select { height: 36px; }
.meto-field input:focus, .meto-field select:focus, .meto-field textarea:focus { border-color: var(--primary); }
.meto-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

/* identidades grid */
.meto-ids-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.meto-id-card { background: var(--surface); border: 1px solid var(--border-1); border-radius: 14px; padding: 18px; }
.meto-id-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.meto-id-title { font-size: 16px; font-weight: 800; }
.meto-id-age { font-size: 12px; color: var(--fg-3); margin-top: 2px; }
.meto-id-field { margin-bottom: 12px; }
.meto-id-field label { display: block; font-size: 11px; font-weight: 700; color: var(--fg-3); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 4px; }
.meto-id-field textarea, .meto-id-field input { width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-2); background: var(--bg-2); color: var(--fg-1); font-size: 13px; outline: none; font-family: inherit; resize: vertical; }
.meto-id-field textarea:focus, .meto-id-field input:focus { border-color: var(--primary); }
.meto-id-save { width: 100%; padding: 9px; border-radius: 9px; background: var(--primary); color: white; border: 0; font-size: 13px; font-weight: 700; cursor: pointer; margin-top: 4px; }
.meto-id-save:disabled { opacity: .5; cursor: not-allowed; }
`

/* ── helper ─────────────────────────────────────────────────────────────────── */
const tok = () => localStorage.getItem('token')

/* ── componente principal ──────────────────────────────────────────────────── */
export default function AdminMetodologiaPanel() {
  const [tab, setTab] = useState<'identidades' | 'rieles'>('identidades')

  return (
    <div className="meto-root">
      <style>{CSS}</style>
      <h1 className="meto-h1">Metodología</h1>
      <p className="meto-sub">
        El motor pedagógico adaptativo: quién enseña y cómo, para cada tipo de alumno y nivel.
      </p>

      <div className="meto-tabs">
        <button className={`meto-tab${tab === 'identidades' ? ' active' : ''}`} onClick={() => setTab('identidades')}>
          Identidades de tutor
        </button>
        <button className={`meto-tab${tab === 'rieles' ? ' active' : ''}`} onClick={() => setTab('rieles')}>
          Rieles por nivel
        </button>
      </div>

      {tab === 'identidades' && <IdentidadesTab />}
      {tab === 'rieles' && <RielesTab />}
    </div>
  )
}

/* ── TAB IDENTIDADES ─────────────────────────────────────────────────────────── */
function IdentidadesTab() {
  const [types, setTypes] = useState<StudentType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Partial<StudentType>>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/methodology-modules/student-types`, {
        headers: { Authorization: `Bearer ${tok()}` },
      })
      if (!res.ok) throw new Error()
      const data: StudentType[] = await res.json()
      setTypes(data)
      const initial: Record<string, Partial<StudentType>> = {}
      for (const t of data) initial[t.slug] = { ...t }
      setDrafts(initial)
    } catch {
      toast.error('Error cargando los tipos de alumno')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const patch = (slug: string, field: keyof StudentType, value: string) => {
    setDrafts((prev) => ({ ...prev, [slug]: { ...prev[slug], [field]: value } }))
  }

  const save = async (slug: string) => {
    const d = drafts[slug]
    if (!d) return
    setSaving(slug)
    try {
      const res = await fetch(`${API_BASE_URL}/methodology-modules/student-types/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({
          tutor_mascot: d.tutor_mascot,
          tutor_identity: d.tutor_identity,
          tutor_tonal_rules: d.tutor_tonal_rules,
          session_focus: d.session_focus,
          closing_seed: d.closing_seed,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Identidad "${slug}" guardada`)
      load()
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <p style={{ color: 'var(--fg-3)' }}>Cargando…</p>

  return (
    <>
      <p style={{ color: 'var(--fg-3)', fontSize: 13, marginBottom: 16 }}>
        Define quién es el tutor para cada segmento etario: nombre, personalidad, tono y el tipo de narrativa que usa.
        Estos campos alimentan los bloques 2-4 del compositor de prompt.
      </p>
      <div className="meto-ids-grid">
        {AGES.map(({ slug, label }) => {
          const d = drafts[slug] || {}
          const isSaving = saving === slug
          const ageLabel = types.find((t) => t.slug === slug)
          const ageRange = ageLabel?.age_min != null
            ? `${ageLabel.age_min}–${ageLabel.age_max ?? '+'} años`
            : ''
          return (
            <div className="meto-id-card" key={slug}>
              <div className="meto-id-card-head">
                <div>
                  <div className="meto-id-title">{label}</div>
                  {ageRange && <div className="meto-id-age">{ageRange}</div>}
                </div>
                <span className="meto-lvl" style={{ fontSize: 11 }}>{slug}</span>
              </div>

              <div className="meto-id-field">
                <label>Nombre del tutor / mascota</label>
                <input
                  value={d.tutor_mascot ?? ''}
                  onChange={(e) => patch(slug, 'tutor_mascot', e.target.value)}
                  placeholder="HABI, Sparky…"
                />
              </div>

              <div className="meto-id-field">
                <label>Identidad (quién es)</label>
                <textarea
                  rows={3}
                  value={d.tutor_identity ?? ''}
                  onChange={(e) => patch(slug, 'tutor_identity', e.target.value)}
                  placeholder="Una profe amiga, cálida y paciente que viaja con el chico…"
                />
              </div>

              <div className="meto-id-field">
                <label>Reglas tonales (cómo habla)</label>
                <textarea
                  rows={3}
                  value={d.tutor_tonal_rules ?? ''}
                  onChange={(e) => patch(slug, 'tutor_tonal_rules', e.target.value)}
                  placeholder="Tono alegre, exclamativo. Mezcla español e inglés. Una idea por turno…"
                />
              </div>

              <div className="meto-id-field">
                <label>Enfoque / mundo de la sesión</label>
                <textarea
                  rows={3}
                  value={d.session_focus ?? ''}
                  onChange={(e) => patch(slug, 'session_focus', e.target.value)}
                  placeholder="Aventura en el mundo del tópico: el chico y el tutor exploran juntos…"
                />
              </div>

              <div className="meto-id-field">
                <label>Cierre suave (semilla)</label>
                <textarea
                  rows={2}
                  value={d.closing_seed ?? ''}
                  onChange={(e) => patch(slug, 'closing_seed', e.target.value)}
                  placeholder="Cómo cerrar con calidez: repaso breve + gancho ('¿Seguimos un ratito más o lo dejamos hasta la próxima?')…"
                />
              </div>

              <button className="meto-id-save" onClick={() => save(slug)} disabled={isSaving}>
                {isSaving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── TAB RIELES ──────────────────────────────────────────────────────────────── */
function RielesTab() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [ageFilter, setAgeFilter] = useState('mini')
  const [edit, setEdit] = useState<ModuleEdit | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [previewLevel, setPreviewLevel] = useState('A0')
  const [previewPrompt, setPreviewPrompt] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/methodology-modules?student_type=${ageFilter}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      })
      if (!res.ok) throw new Error()
      setModules(await res.json())
    } catch {
      toast.error('Error cargando los rieles')
    } finally {
      setLoading(false)
    }
  }, [ageFilter])

  useEffect(() => { load() }, [load])

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/orchestrator/resolve?student_type=${ageFilter}&level=${previewLevel}`, {
        headers: { Authorization: `Bearer ${tok()}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPreviewPrompt(data.prompt || '')
    } catch {
      setPreviewPrompt('(no se pudo resolver el preview)')
    } finally {
      setPreviewLoading(false)
    }
  }, [ageFilter, previewLevel])

  useEffect(() => { loadPreview() }, [loadPreview])

  const startNew = () => setEdit({ ...EMPTY_MODULE, student_type: ageFilter })
  const startEdit = (m: Module) => setEdit({
    id: m.id, student_type: m.student_type, level: m.level, module_order: m.module_order,
    focus_name: m.focus_name, ai_restraints: m.ai_restraints || '',
    target_grammar: m.target_grammar || '', evaluation_criteria: m.evaluation_criteria || '',
    correction_hint: m.correction_hint || '',
    max_session_minutes: m.max_session_minutes, max_turns: m.max_turns,
    notes: m.notes || '', active: m.active,
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
        max_session_minutes: edit.max_session_minutes, max_turns: edit.max_turns,
        notes: edit.notes || null, active: edit.active,
      }
      const url = edit.id
        ? `${API_BASE_URL}/methodology-modules/${edit.id}`
        : `${API_BASE_URL}/methodology-modules`
      const res = await fetch(url, {
        method: edit.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(edit.id ? 'Riel actualizado' : 'Riel creado')
      setEdit(null)
      load()
      loadPreview()
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
    <>
      <p style={{ color: 'var(--fg-3)', fontSize: 13, marginBottom: 16 }}>
        Las <b>auto-restricciones del coach por nivel</b>: qué puede y qué no puede decir en cada peldaño.
        Es el <i>cómo</i> lingüístico — el <i>quién</i> y el <i>mundo</i> van en Identidades.
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
            <tr>
              <th>Nivel</th>
              <th>Foco</th>
              <th>Reglas del coach (auto-restricciones)</th>
              <th>Gramática objetivo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id}>
                <td><span className="meto-lvl">{m.level}</span></td>
                <td><b>{m.focus_name}</b></td>
                <td><div className="meto-restraints">{m.ai_restraints}</div></td>
                <td><span className="meto-grammar">{m.target_grammar}</span></td>
                <td>
                  {m.active
                    ? <span className="meto-pill meto-pill-on">activo</span>
                    : <span className="meto-pill meto-pill-off">off</span>}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="meto-action-btn edit" onClick={() => startEdit(m)}>Editar</button>
                  <button className="meto-action-btn del" onClick={() => doDelete(m)} disabled={deleting === m.id}>Borrar</button>
                </td>
              </tr>
            ))}
            {modules.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--fg-3)' }}>
                  Sin rieles para este tipo. Creá el primero o corré seed_tutor_personas.py.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Preview del prompt en vivo</h3>
          <select className="meto-search" style={{ maxWidth: 130, height: 32 }} value={previewLevel} onChange={(e) => setPreviewLevel(e.target.value)}>
            {LEVELS.map((l) => <option key={l} value={l}>Nivel {l}</option>)}
          </select>
          <span style={{ fontSize: 12.5, color: 'var(--fg-3)' }}>
            lo que recibiría la IA para un alumno <b>{AGES.find((a) => a.slug === ageFilter)?.label}</b> en <b>{previewLevel}</b> — editá un riel y mirá cómo cambia.
          </span>
        </div>
        <pre style={{ background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 12, padding: 14, fontSize: 12, lineHeight: 1.5, color: 'var(--fg-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 440, overflowY: 'auto', margin: 0, fontFamily: 'var(--fmono, monospace)' }}>
          {previewLoading ? 'Resolviendo…' : (previewPrompt || '(sin datos)')}
        </pre>
      </div>

      {edit && (
        <div className="meto-modal-backdrop" onClick={() => setEdit(null)}>
          <div className="meto-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{edit.id ? 'Editar riel' : 'Nuevo riel'}</h2>
            <div className="meto-form-grid">
              <div className="meto-field">
                <label>Tipo</label>
                <select value={edit.student_type} onChange={(e) => setEdit({ ...edit, student_type: e.target.value })}>
                  {AGES.map((a) => <option key={a.slug} value={a.slug}>{a.label}</option>)}
                </select>
              </div>
              <div className="meto-field">
                <label>Nivel</label>
                <select value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value })}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="meto-field">
                <label>Orden</label>
                <input type="number" value={edit.module_order} onChange={(e) => setEdit({ ...edit, module_order: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="meto-field">
                <label>Duración (min)</label>
                <input type="number" value={edit.max_session_minutes ?? ''} onChange={(e) => setEdit({ ...edit, max_session_minutes: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="ej. 6" />
              </div>
              <div className="meto-field">
                <label>Máx. turnos</label>
                <input type="number" value={edit.max_turns ?? ''} onChange={(e) => setEdit({ ...edit, max_turns: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="ej. 12" />
              </div>
              <div className="meto-field full">
                <label>Foco (nombre del módulo)</label>
                <input value={edit.focus_name} onChange={(e) => setEdit({ ...edit, focus_name: e.target.value })} placeholder="Aislamiento fonético, Presente continuo…" />
              </div>
              <div className="meto-field full">
                <label>Reglas del coach — auto-restricciones</label>
                <textarea rows={5} value={edit.ai_restraints} onChange={(e) => setEdit({ ...edit, ai_restraints: e.target.value })} placeholder="Ej: PROHIBIDO usar oraciones completas. Solo 1-3 palabras por turno…" />
              </div>
              <div className="meto-field full">
                <label>Gramática objetivo</label>
                <input value={edit.target_grammar} onChange={(e) => setEdit({ ...edit, target_grammar: e.target.value })} placeholder="Presente continuo Verb+ing / Pasado simple…" />
              </div>
              <div className="meto-field full">
                <label>Criterio de avance</label>
                <textarea rows={2} value={edit.evaluation_criteria} onChange={(e) => setEdit({ ...edit, evaluation_criteria: e.target.value })} />
              </div>
              <div className="meto-field full">
                <label>Hint de corrección (recast)</label>
                <input value={edit.correction_hint} onChange={(e) => setEdit({ ...edit, correction_hint: e.target.value })} />
              </div>
              <div className="meto-field full">
                <label>Notas (pedagogo)</label>
                <textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
              </div>
              <div className="meto-field">
                <label>Activo</label>
                <select value={edit.active ? '1' : '0'} onChange={(e) => setEdit({ ...edit, active: e.target.value === '1' })}>
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
            <div className="meto-modal-actions">
              <button className="meto-btn meto-btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="meto-btn meto-btn-primary" onClick={submit} disabled={saving || !edit.focus_name}>
                {saving ? 'Guardando…' : edit.id ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

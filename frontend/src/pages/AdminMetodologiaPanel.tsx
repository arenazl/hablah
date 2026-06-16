/**
 * /admin/metodologia — Identidades de tutor por segmento (EJE EDAD del motor de 9 pasos).
 *
 * Edita los campos de student_types que alimentan los bloques 2-4 + arranque/cierre del
 * compositor: quién es el tutor, su tono, el mundo de la sesión y las semillas de apertura,
 * desarrollo y cierre. Los "rieles por nivel" (ai_restraints) se ELIMINARON: el QUÉ por nivel
 * vive ahora en levels (curriculum_grammar / expected_production), editable en ABM · Niveles.
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
  opening_seed: string
  continuation_seed: string
  closing_seed: string
}

/* ── constantes ─────────────────────────────────────────────────────────────── */
const AGES: { slug: string; label: string }[] = [
  { slug: 'mini',   label: 'Mini · 4-7' },
  { slug: 'junior', label: 'Junior · 8-12' },
  { slug: 'tween',  label: 'Tween · 13+' },
  { slug: 'adult',  label: 'Adulto' },
]

/* ── estilos ─────────────────────────────────────────────────────────────────── */
const CSS = `
.meto-root { padding: 24px 32px 80px; max-width: 1320px; margin: 0 auto; color: var(--fg-1); }
.meto-h1 { font-size: 26px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 4px; }
.meto-sub { color: var(--fg-3); font-size: 14px; margin-bottom: 18px; max-width: 760px; }
.meto-lvl { display: inline-block; padding: 3px 9px; border-radius: 8px; font-size: 12px; font-weight: 800; background: rgba(59,130,246,.14); color: #60A5FA; letter-spacing: .04em; }

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
  return (
    <div className="meto-root">
      <style>{CSS}</style>
      <h1 className="meto-h1">Identidades de tutor</h1>
      <p className="meto-sub">
        Quién enseña y cómo, por segmento de edad (EJE EDAD del motor). El QUÉ por nivel (gramática,
        producción, idioma ES/EN) se edita en ABM · Niveles.
      </p>
      <IdentidadesTab />
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
          opening_seed: d.opening_seed,
          continuation_seed: d.continuation_seed,
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
      <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '.04em', padding: '3px 9px', borderRadius: 999, background: 'rgba(232,130,14,.14)', color: '#E8820E', marginBottom: 10 }}>
        PRESET (P) · lo que editás acá impacta a TODA la banda de edad
      </div>
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
                <label>Apertura (semilla) · saludo + tópico + enganche</label>
                <textarea
                  rows={2}
                  value={d.opening_seed ?? ''}
                  onChange={(e) => patch(slug, 'opening_seed', e.target.value)}
                  placeholder="Cómo abre la clase: saludar, presentar el tópico y enganchar. Placeholders: {name}, {topic}, {first_vocab}…"
                />
              </div>

              <div className="meto-id-field">
                <label>Desarrollo (semilla) · regla de cada turno</label>
                <textarea
                  rows={2}
                  value={d.continuation_seed ?? ''}
                  onChange={(e) => patch(slug, 'continuation_seed', e.target.value)}
                  placeholder="La regla de cada turno: una pregunta/consigna por turno, pistas si se traba…"
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

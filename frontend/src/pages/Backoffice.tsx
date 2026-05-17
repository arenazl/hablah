import { useEffect, useState, useMemo } from 'react'
import { NavLink, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { BACKOFFICE_CSS } from './backoffice.css'
import {
  templatesAPI, topicsAPI, alumnosAPI, dashboardAPI, ttsAPI,
  Template, Topic, Alumno,
} from '../services/api'

function ensureFont() {
  if (document.getElementById('hablah-google-fonts')) return
  const link = document.createElement('link')
  link.id = 'hablah-google-fonts'
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap'
  document.head.appendChild(link)
}

const PAGE_SIZE = 20

const SvgMenu = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
const SvgSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
const SvgChev = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>

export function Backoffice() {
  useEffect(() => { ensureFont() }, [])
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="bo-root">
      <style>{BACKOFFICE_CSS}</style>
      {menuOpen && <div className="scrim show" onClick={() => setMenuOpen(false)} />}
      <div className="shell">
        <BoSidebar open={menuOpen} />
        <main className="main">
          <Routes>
            <Route path="/" element={<ResumenView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/templates" element={<TemplatesView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/templates/:id" element={<TemplateEditView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/topicos" element={<TopicosView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/topicos/:id" element={<TopicEditView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/alumnos" element={<AlumnosView onMenu={() => setMenuOpen(true)} />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function BoSidebar({ open }: { open: boolean }) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <NavLink to="/admin" className="brand" end>
        <div className="brand-mark">h</div>
        <div>
          <div className="brand-name">habláh</div>
          <div className="brand-sub">Backoffice</div>
        </div>
      </NavLink>

      <div style={{ padding: '4px 12px 8px' }}>
        <NavLink
          to="/app"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(0,179,126,.14)', color: 'var(--primary)',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Volver a la app
        </NavLink>
      </div>

      <div className="sidebar-section">Operación</div>
      <nav className="sidebar-nav">
        <SidebarItem to="/admin" exact label="Resumen" />
        <SidebarItem to="/admin/templates" label="Templates" />
        <SidebarItem to="/admin/topicos" label="Tópicos" />
      </nav>
      <div className="sidebar-section">Comunidad</div>
      <nav className="sidebar-nav">
        <SidebarItem to="/admin/alumnos" label="Alumnos" />
      </nav>
      <div className="sidebar-foot">
        <div className="user-card">
          <div className="av">A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name">Admin</div>
            <div className="meta">Curriculum lead</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
function SidebarItem({ to, label, exact }: { to: string; label: string; exact?: boolean }) {
  return (
    <NavLink to={to} end={exact} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      {label}
    </NavLink>
  )
}

function PageHead({ eyebrow, title, sub, onMenu, actions }: {
  eyebrow: string; title: string; sub?: string; onMenu: () => void; actions?: React.ReactNode
}) {
  return (
    <header className="pagehead">
      <div className="brick">
        <button className="menu-toggle" onClick={onMenu}><SvgMenu /></button>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {sub && <div className="sub">{sub}</div>}
        </div>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}

function Pagination({ total, page, pageSize, onPageChange }: {
  total: number; page: number; pageSize: number; onPageChange: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  return (
    <div className="pagination">
      <div className="pg-info">Mostrando <b>{from}–{to}</b> de <b>{total.toLocaleString('es-AR')}</b></div>
      <button onClick={() => onPageChange(page - 1)} disabled={page === 0}>← Anterior</button>
      <span className="pg-current">{page + 1} / {pages}</span>
      <button onClick={() => onPageChange(page + 1)} disabled={page >= pages - 1}>Siguiente →</button>
    </div>
  )
}

/* ──────── RESUMEN ──────── */
function ResumenView({ onMenu }: { onMenu: () => void }) {
  const [data, setData] = useState<any>(null)
  useEffect(() => { dashboardAPI.summary().then(setData).catch(() => {}) }, [])
  const k = data?.kpis || {}
  return (
    <>
      <PageHead eyebrow="Resumen general" title="Cómo va el sistema" onMenu={onMenu} sub="Datos vivos · refresca al recargar" />
      <div className="view">
        <div className="kpi-row">
          <Kpi label="Charlas (7 días)" value={k.sessions_week ?? '—'} />
          <Kpi label="Retención 7d" value={`${k.retention_7d_pct ?? '—'}%`} />
          <Kpi label="Errores resueltos" value={k.errors_resolved ?? '—'} />
          <Kpi label="Modo insistente" value={k.insistent_active ?? '—'} />
        </div>
        <div className="dash-grid">
          <div className="card card-elev chart-card">
            <h3>Templates en uso</h3>
            {(data?.templates_distribution || []).map((t: any) => (
              <div key={t.name} style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{t.name}</span><span style={{ color: 'var(--fg-3)' }}>{t.pct}%</span>
                </div>
                <div className="bar" style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, marginTop: 4 }}>
                  <div style={{ width: `${t.pct}%`, height: '100%', background: t.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="card card-elev chart-card">
            <h3>Top errores (7 días)</h3>
            <ol className="err-list">
              {(data?.top_errors || []).length === 0 && (
                <li style={{ color: 'var(--fg-3)' }}>Sin errores aún — la app no tiene sesiones registradas.</li>
              )}
              {(data?.top_errors || []).map((e: any, i: number) => (
                <li key={i}>
                  <span className="rank">{i + 1}</span>
                  <span className="name">{e.label}</span>
                  <span className="pill pill-outline">{e.kind}</span>
                  <span className="count tnum">{e.count}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  )
}
function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <div className="kpi card card-elev">
      <div className="l">{label}</div>
      <div className="row"><span className="v tnum">{value}</span></div>
    </div>
  )
}

/* ──────── TEMPLATES ──────── */
function TemplatesView({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate()
  const [items, setItems] = useState<Template[]>([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => { templatesAPI.list().then((d) => { setItems(d); setLoading(false) }).catch(() => setLoading(false)) }, [])

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return items
    return items.filter((t) => t.name.toLowerCase().includes(n) || (t.tones || []).join(' ').toLowerCase().includes(n))
  }, [items, q])
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <>
      <PageHead eyebrow="Sector 1 · Métodos" title="Templates de comportamiento" onMenu={onMenu}
        sub="Cada template define el prompt del sistema que se inyecta al iniciar cada sesión." />
      <div className="view">
        <div className="toolbar">
          <div className="search">
            <SvgSearch />
            <input className="input" placeholder="Buscar por nombre o tono" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
          </div>
          <span className="right">{filtered.length} templates</span>
        </div>
        <div className="card card-elev table">
          <div className="t-head">
            <span>Nombre</span><span className="col-tone">Tono</span><span className="col-rigor">Rigor</span><span>Retos/min</span><span>Asignados</span><span></span>
          </div>
          {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-3)' }}>Cargando…</div>}
          {!loading && paged.map((t) => (
            <div key={t.id} className="t-row" onClick={() => nav(`/admin/templates/${t.id}`)}>
              <div className="t-name">
                <div className="t-icon" style={{ background: t.icon_bg, color: t.icon_bg === '#FFB800' ? '#5A3D00' : 'white' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={t.icon_bg === '#FFB800' ? '#5A3D00' : 'white'}>
                    <polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" />
                  </svg>
                </div>
                <div>
                  <div className="n">{t.name}</div>
                  <div className="meta">
                    {t.is_preset && <span className="pill pill-outline" style={{ fontSize: 9, padding: '1px 6px' }}>PRESET</span>} {t.version}
                  </div>
                </div>
              </div>
              <span className="col-tone" style={{ fontSize: 13, color: 'var(--fg-2)' }}>{(t.tones || []).slice(0, 2).join(' · ') || '—'}</span>
              <span className="col-rigor"><RigorBars value={t.rigor} /></span>
              <span className="tnum">{t.challenges_per_min}</span>
              <span className="tnum" style={{ fontWeight: 600 }}>{t.assigned_count?.toLocaleString('es-AR')}</span>
              <button className="icon-btn-soft" onClick={(e) => e.stopPropagation()}><SvgChev /></button>
            </div>
          ))}
          <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>
    </>
  )
}
function RigorBars({ value }: { value: number }) {
  return <span className="rigor-bars">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= value ? 'on' : ''} />)}</span>
}

/* ──────── TEMPLATE EDIT ──────── */
function TemplateEditView({ onMenu }: { onMenu: () => void }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [t, setT] = useState<Template | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (id) templatesAPI.get(Number(id)).then(setT).catch(() => {}) }, [id])

  if (!t) return <><PageHead eyebrow="Templates · Editar" title="Cargando…" onMenu={onMenu} /></>

  const update = (patch: Partial<Template>) => setT({ ...t, ...patch })

  const save = async () => {
    setSaving(true)
    try {
      await templatesAPI.update(t.id, t)
      toast.success('Template guardado')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const playVoice = async () => {
    try {
      await ttsAPI.play(`Hola, soy ${t.name}. ${t.description}`, t.slug as any)
    } catch {
      toast.error('No se pudo reproducir la voz')
    }
  }

  return (
    <>
      <PageHead eyebrow="Templates · Editar" title={t.name} onMenu={onMenu}
        sub={`${t.version} · ${t.assigned_count?.toLocaleString('es-AR')} alumnos asignados`}
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/templates')}>← Volver</button>
            <button className="btn btn-secondary btn-sm" onClick={playVoice}>▶ Probar voz</button>
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        } />
      <div className="view">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Identidad */}
            <Section title="Identidad" subtitle="Cómo se llama y describe este template">
              <input className="input" value={t.name} onChange={(e) => update({ name: e.target.value })} style={{ marginTop: 4, fontWeight: 600, fontSize: 15, height: 40 }} />
              <input className="input" value={t.description} onChange={(e) => update({ description: e.target.value })} style={{ marginTop: 8, fontSize: 13, height: 36 }} placeholder="Descripción breve" />
            </Section>

            {/* 1. Conversación */}
            <Section title="1 · Conversación" subtitle="Cómo habla el tutor durante la charla">
              <SelectRow
                label="Largo de respuesta"
                hint="terse = 1 oración · long = hasta 4"
                value={t.response_length}
                onChange={(v) => update({ response_length: v as any })}
                options={[
                  { value: 'terse', label: 'Terse (1 oración)' },
                  { value: 'short', label: 'Short (1-2)' },
                  { value: 'medium', label: 'Medium (2-3)' },
                  { value: 'long', label: 'Long (3-4)' },
                ]}
              />
              <SliderRow label="Calidez del tutor" hint="1=distante  ·  5=súper cálido" value={t.warmth_level} min={1} max={5} onChange={(v) => update({ warmth_level: v })} />
              <SliderRow label="% del tiempo que habla el tutor" hint="Resto = alumno" value={t.tutor_talk_ratio} min={10} max={50} step={5} suffix="%" onChange={(v) => update({ tutor_talk_ratio: v })} />
              <ToggleRow t="Preguntas proactivas" s="Cierra cada turno con UNA pregunta abierta" on={t.proactive_questions} onChange={(v) => update({ proactive_questions: v })} />
              <ToggleRow t="Comparte opiniones / anécdotas" s="El tutor aporta datos propios, no solo facilita" on={t.tutor_shares_opinions} onChange={(v) => update({ tutor_shares_opinions: v })} />
            </Section>

            {/* 2. Corrección */}
            <Section title="2 · Corrección" subtitle="Cómo evalúa los errores del alumno">
              <SelectRow
                label="Modo de corrección"
                hint="recast = reformula natural · explicit_strict = señala en vivo"
                value={t.correction_mode}
                onChange={(v) => update({ correction_mode: v as any })}
                options={[
                  { value: 'none', label: 'None — no corrige nada' },
                  { value: 'recast', label: 'Recast — reformula natural sin marcar' },
                  { value: 'explicit_soft', label: 'Explicit Soft — marca solo al cierre' },
                  { value: 'explicit_strict', label: 'Explicit Strict — marca en vivo' },
                ]}
              />
              <SelectRow
                label="Umbral de errores"
                hint="Qué errores entran al reporte"
                value={t.error_threshold}
                onChange={(v) => update({ error_threshold: v as any })}
                options={[
                  { value: 'only_major', label: 'Solo errores graves' },
                  { value: 'repeated', label: 'Repetidos o patrones del nivel' },
                  { value: 'all', label: 'Todos los detectables' },
                ]}
              />
              <ChipMultiSelect
                label="Foco de corrección"
                hint="Qué se evalúa al cierre"
                value={t.correction_focus}
                onChange={(v) => update({ correction_focus: v })}
                options={['grammar', 'vocab', 'pronunciation', 'fluency']}
              />
              <SliderRow label="Máximo items en feedback" value={t.max_feedback_items} min={1} max={10} onChange={(v) => update({ max_feedback_items: v })} />
              <SliderRow label="Cantidad de elogios" value={t.praise_count} min={1} max={5} onChange={(v) => update({ praise_count: v })} />
            </Section>

            {/* 3. Reporte */}
            <Section title="3 · Reporte final" subtitle="Qué secciones incluye el reporte al cierre">
              <ToggleRow t="Resumen narrativo" s="2-3 oraciones describiendo cómo fue la charla" on={t.report_include_summary} onChange={(v) => update({ report_include_summary: v })} />
              <ToggleRow t="Sugerencia de conectores" s="3-5 conectores que enriquecerían el habla" on={t.report_include_connectors} onChange={(v) => update({ report_include_connectors: v })} />
              <ToggleRow t="Vocabulario sugerido" s="Palabras del nivel +1 para incorporar" on={t.report_include_vocab_suggestions} onChange={(v) => update({ report_include_vocab_suggestions: v })} />
              <ToggleRow t="Notas de pronunciación" s="Palabras que sonaron raras y cómo decirlas" on={t.report_include_pronunciation} onChange={(v) => update({ report_include_pronunciation: v })} />
              <ToggleRow t="Consejo para próxima sesión" s="Foco recomendado para la próxima charla" on={t.report_include_next_session_tip} onChange={(v) => update({ report_include_next_session_tip: v })} />
            </Section>

            {/* 4. Arranque */}
            <Section title="4 · Arranque" subtitle="Cómo abre el tutor la sesión">
              <SelectRow
                label="Estilo de apertura"
                value={t.opening_style}
                onChange={(v) => update({ opening_style: v as any })}
                options={[
                  { value: 'direct', label: 'Direct — saludo breve + pregunta' },
                  { value: 'warm', label: 'Warm — cálido + intro + pregunta' },
                  { value: 'playful', label: 'Playful — enérgico + provocador' },
                ]}
              />
              <ToggleRow t="Presenta el tema antes de preguntar" s="Si OFF, va directo a la primera pregunta" on={t.opening_includes_topic_intro} onChange={(v) => update({ opening_includes_topic_intro: v })} />
            </Section>

            {/* 5. Dinámica */}
            <Section title="5 · Dinámica de sesión" subtitle="Cómo se comporta el VAD y el flujo">
              <SliderRow label="Tolerancia al silencio" hint="Cuánto silencio espera antes de responder" value={t.silence_tolerance_ms} min={300} max={3000} step={100} suffix="ms" onChange={(v) => update({ silence_tolerance_ms: v })} />
              <ToggleRow t="Permitir interrupciones" s="El tutor puede cortar al alumno si se traba" on={t.interruption_allowed} onChange={(v) => update({ interruption_allowed: v })} />
              <ToggleRow t="Andamiar cuando el alumno se traba" s="Da sinónimo o pista, no la palabra exacta" on={t.scaffold_when_stuck} onChange={(v) => update({ scaffold_when_stuck: v })} />
            </Section>

            {/* Legacy v1/v2 */}
            <Section title="Legacy (v1/v2)" subtitle="Campos viejos que se mantienen por compatibilidad">
              <SliderRow label="Rigurosidad (legacy)" value={t.rigor} min={1} max={5} onChange={(v) => update({ rigor: v })} />
              <SliderRow label="Retos por minuto" value={t.challenges_per_min} min={0} max={6} onChange={(v) => update({ challenges_per_min: v })} />
              <ToggleRow t="Salida JSON estructurada" s="Reporte de aciertos/errores al cierre" on={t.json_output} onChange={(v) => update({ json_output: v })} />
            </Section>
          </div>

          {/* Sidebar derecha: voz + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 90, alignSelf: 'flex-start' }}>
            <Section title="Voz asignada">
              <div style={{ padding: 12, background: 'var(--bg-2)', borderRadius: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.voice_label || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 4, wordBreak: 'break-all' }}>{t.voice_id}</div>
              </div>
              <button className="btn btn-secondary btn-sm btn-block" style={{ marginTop: 10 }} onClick={playVoice}>▶ Escuchar voz</button>
            </Section>
            <Section title="Distribución">
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary-dark)' }}>{t.assigned_count?.toLocaleString('es-AR')}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>alumnos asignados</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 8, lineHeight: 1.4 }}>
                Al guardar, los cambios aplican a la próxima sesión de cada alumno.
              </div>
            </Section>
          </div>
        </div>
      </div>
    </>
  )
}

/* ──────── Subcomponentes del editor ──────── */
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card card-elev editor-section">
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function SliderRow({ label, hint, value, min, max, step = 1, suffix, onChange }: {
  label: string; hint?: string; value: number; min: number; max: number; step?: number; suffix?: string;
  onChange: (v: number) => void
}) {
  return (
    <div style={{ padding: '10px 0', borderTop: '1px dashed var(--border-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
          {hint && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 1 }}>{hint}</div>}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--primary-dark)' }}>
          {value}{suffix ? ` ${suffix}` : ''}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--primary)' }}
      />
    </div>
  )
}

function SelectRow({ label, hint, value, onChange, options }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{ padding: '10px 0', borderTop: '1px dashed var(--border-1)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 6 }}>{hint}</div>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: '1px solid var(--border-2)', background: 'white',
          fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function ChipMultiSelect({ label, hint, value, onChange, options }: {
  label: string; hint?: string; value: string[]; onChange: (v: string[]) => void; options: string[]
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt))
    else onChange([...value, opt])
  }
  return (
    <div style={{ padding: '10px 0', borderTop: '1px dashed var(--border-1)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginBottom: 8 }}>{hint}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((opt) => {
          const on = value.includes(opt)
          return (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              style={{
                padding: '5px 12px', borderRadius: 999,
                background: on ? 'var(--primary)' : 'var(--bg-2)',
                color: on ? 'white' : 'var(--fg-2)',
                border: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {on ? '✓ ' : ''}{opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
function ToggleRow({ t, s, on, onChange }: { t: string; s: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <div className="body"><div className="t">{t}</div><div className="s">{s}</div></div>
      <div className={`switch${on ? '' : ' off'}`} onClick={() => onChange(!on)} style={{ cursor: 'pointer' }} />
    </div>
  )
}

/* ──────── TÓPICOS ──────── */
function TopicosView({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate()
  const [items, setItems] = useState<Topic[]>([])
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('todas')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    topicsAPI.list({ category: category !== 'todas' ? category : undefined, q: q || undefined })
      .then((d) => { setItems(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [category, q])

  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const CATS = [
    { key: 'todas', label: 'Todas' },
    { key: 'tech', label: 'Tecnología' },
    { key: 'arte', label: 'Arte y entretenimiento' },
    { key: 'lifestyle', label: 'Estilo de vida' },
    { key: 'diseno', label: 'Diseño' },
    { key: 'negocios', label: 'Negocios' },
  ]

  return (
    <>
      <PageHead eyebrow="Sector 2 · Biblioteca" title="Punteros temáticos" onMenu={onMenu}
        sub="Universos de interés con seed prompts y keywords por nivel." />
      <div className="view">
        <div className="topics-layout">
          <aside className="cat-sidebar">
            <span className="eyebrow" style={{ padding: '0 12px 8px', display: 'block' }}>Categorías</span>
            {CATS.map((c) => (
              <div key={c.key} className={`cat-item${category === c.key ? ' active' : ''}`} onClick={() => { setCategory(c.key); setPage(0) }}>
                <span>{c.label}</span>
              </div>
            ))}
          </aside>
          <div>
            <div className="toolbar">
              <div className="search">
                <SvgSearch />
                <input className="input" placeholder="Buscar tópico" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
              </div>
              <span className="right">{items.length} tópicos</span>
            </div>
            {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-3)' }}>Cargando…</div>}
            {!loading && paged.map((t) => (
              <div key={t.id} className="topic-row card" onClick={() => nav(`/admin/topicos/${t.id}`)}>
                <div className="body">
                  <div className="t">
                    {t.title}
                    {t.is_hot && <span className="pill pill-accent">🔥 Hot</span>}
                  </div>
                  <div className="m">
                    <span style={{ textTransform: 'capitalize' }}>{t.category}</span><span className="sep" />
                    <span className="tnum">{Object.keys(t.seed_prompts || {}).length} seed prompts</span><span className="sep" />
                    <span className="tnum">{(t.keywords || []).length} keywords</span><span className="sep" />
                    <span className="tnum">{t.usage_count} usos</span>
                  </div>
                </div>
                <div className="levels">
                  {(t.levels || []).map((lv) => <span key={lv} className="lv">{lv}</span>)}
                </div>
                <button className="icon-btn-soft" onClick={(e) => e.stopPropagation()}><SvgChev /></button>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <Pagination total={items.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ──────── TOPIC EDIT ──────── */
function TopicEditView({ onMenu }: { onMenu: () => void }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [t, setT] = useState<Topic | null>(null)
  useEffect(() => { if (id) topicsAPI.get(Number(id)).then(setT).catch(() => {}) }, [id])

  if (!t) return <><PageHead eyebrow="Tópicos · Editar" title="Cargando…" onMenu={onMenu} /></>

  const save = async () => {
    try {
      await topicsAPI.update(t.id, t)
      toast.success('Tópico guardado')
    } catch { toast.error('Error al guardar') }
  }

  return (
    <>
      <PageHead eyebrow="Tópicos · Editar" title={t.title} onMenu={onMenu}
        sub={`${t.category} · ${(t.levels || []).join(', ')} · ${t.usage_count} usos`}
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/topicos')}>← Volver</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Guardar</button>
          </>
        } />
      <div className="view">
        <div className="topic-editor-grid">
          <div className="card card-elev seed-card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Seed prompts por nivel</div>
            {Object.entries(t.seed_prompts || {}).map(([lvl, txt]) => (
              <div key={lvl} className="seed-item">
                <div className="seed-head">
                  <span className={`lvl-tag${lvl === 'B2' ? ' cur' : ''}`}>{lvl}</span>
                </div>
                <textarea
                  className="seed-text"
                  defaultValue={txt as string}
                  onBlur={(e) => setT({ ...t, seed_prompts: { ...t.seed_prompts, [lvl]: e.target.value } })}
                  style={{ width: '100%', minHeight: 80, border: 0, background: 'transparent', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            ))}
          </div>
          <div className="card card-elev seed-card">
            <div style={{ fontWeight: 700, fontSize: 15 }}>Keywords requeridas</div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 14 }}>El motor verifica que el alumno las use durante la misión.</div>
            <div className="kw-grid">
              {(t.keywords || []).map((k) => (
                <span key={k} className="kw">{k}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ──────── ALUMNOS ──────── */
function AlumnosView({ onMenu }: { onMenu: () => void }) {
  const [items, setItems] = useState<Alumno[]>([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    alumnosAPI.list({ q: q || undefined }).then((d) => { setItems(d); setLoading(false) }).catch(() => setLoading(false))
  }, [q])
  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const LEVEL_PILL: Record<string, string> = { A2: 'pill-info', B1: 'pill-info', B2: 'pill-primary', C1: 'pill-violet' }

  return (
    <>
      <PageHead eyebrow="Comunidad" title="Alumnos" onMenu={onMenu} sub={`${items.length} alumnos activos`} />
      <div className="view">
        <div className="toolbar">
          <div className="search">
            <SvgSearch />
            <input className="input" placeholder="Buscar por email, nombre" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
          </div>
        </div>
        <div className="card card-elev users-table">
          <div className="uhead">
            <span>Alumno</span><span>Nivel</span><span className="col-temp">Tutor</span><span className="col-prog">Progreso</span><span>Plan</span><span className="col-last">Última charla</span><span></span>
          </div>
          {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-3)' }}>Cargando…</div>}
          {!loading && items.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-3)' }}>
              No hay alumnos registrados todavía.
            </div>
          )}
          {paged.map((a) => (
            <div key={a.id} className="urow">
              <div className="uname">
                <div className="av" style={{ background: 'var(--ink-1)' }}>{a.nombre[0]?.toUpperCase()}</div>
                <div><div className="n">{a.nombre} {a.apellido}</div><div className="e">{a.email}</div></div>
              </div>
              <span className={`pill ${LEVEL_PILL[a.cefr_level] || 'pill-primary'}`}>{a.cefr_level}</span>
              <span className="col-temp" style={{ fontSize: 13 }}>{a.tutor || '—'}</span>
              <div className="col-prog" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 5, background: 'var(--bg-3)', borderRadius: 3 }}>
                  <div style={{ width: `${a.progress_pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }} />
                </div>
                <span className="tnum" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{a.progress_pct}%</span>
              </div>
              <span className="pill pill-outline" style={{ textTransform: 'capitalize' }}>{a.plan}</span>
              <span className="col-last" style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                {a.last_session_at ? new Date(a.last_session_at).toLocaleDateString('es-AR') : 'sin charlas'}
              </span>
              <button className="icon-btn-soft"><SvgChev /></button>
            </div>
          ))}
          <Pagination total={items.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>
    </>
  )
}

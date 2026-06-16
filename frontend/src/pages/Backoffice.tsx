import { useEffect, useState, useMemo, useRef } from 'react'
import { NavLink, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { BACKOFFICE_CSS } from './backoffice.css'
import {
  templatesAPI, topicsAPI, alumnosAPI, dashboardAPI, ttsAPI, auditAPI,
  Template, Topic, Alumno,
  AuditSessionRow, AuditSessionDetail, AuditSessionFilters, AuditStats, AuditLogEvent,
} from '../services/api'
import { EvolutionView } from './BackofficeEvolution'
import AdminMetodologiaPanel from './AdminMetodologiaPanel'
import AdminConsolaPanel from './AdminConsolaPanel'
import AdminAbmsPanel from './AdminAbmsPanel'
import AdminUsersPanel from './AdminUsersPanel'
import AdminReglasPanel from './AdminReglasPanel'
import AdminKitsPanel from './AdminKitsPanel'
import AdminPromptBuilderPanel from './AdminPromptBuilderPanel'
import AdminWizardPanel from './AdminWizardPanel'
import AdminTimelinePanel from './AdminTimelinePanel'
import AdminFlowPanel from './AdminFlowPanel'
import AdminPostClasePanel from './AdminPostClasePanel'
import AdminMemoriaPanel from './AdminMemoriaPanel'

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
            <Route path="/templates/:id/evolution" element={<EvolutionView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/topicos" element={<TopicosView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/topicos/:id" element={<TopicEditView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/alumnos" element={<AlumnosView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/auditoria" element={<AuditoriaView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/auditoria/:id" element={<AuditoriaDetailView onMenu={() => setMenuOpen(true)} />} />
            <Route path="/metodologia" element={<AdminMetodologiaPanel />} />
            <Route path="/consola" element={<AdminConsolaPanel />} />
            <Route path="/abms" element={<AdminAbmsPanel />} />
            <Route path="/usuarios" element={<AdminUsersPanel />} />
            <Route path="/reglas" element={<AdminReglasPanel />} />
            <Route path="/kits" element={<AdminKitsPanel />} />
            <Route path="/orquestador" element={<AdminPromptBuilderPanel />} />
            <Route path="/wizard" element={<AdminWizardPanel />} />
            <Route path="/timeline" element={<AdminTimelinePanel />} />
            <Route path="/flujo" element={<AdminFlowPanel />} />
            <Route path="/post-clase" element={<AdminPostClasePanel />} />
            <Route path="/memoria" element={<AdminMemoriaPanel />} />
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
        <img src="/logos/hablah-mark.svg" alt="habláh" className="brand-mark-img" width="32" height="32" />
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

      <div className="sidebar-section">Carga · definís el sistema</div>
      <nav className="sidebar-nav">
        <SidebarItem to="/admin/topicos" label="Tópicos" />
        <SidebarItem to="/admin/kits" label="Kits" />
        <SidebarItem to="/admin/metodologia" label="Metodología" />
        <SidebarItem to="/admin/abms" label="ABMs motor" />
        <SidebarItem to="/admin/templates" label="Templates" />
        <SidebarItem to="/admin/reglas" label="Reglas de salida" />
      </nav>
      <div className="sidebar-section">Operación · trabajás con alumnos</div>
      <nav className="sidebar-nav">
        <SidebarItem to="/admin" exact label="Resumen" />
        <SidebarItem to="/admin/timeline" label="Mesa de control" />
        <SidebarItem to="/admin/orquestador" label="Orquestador" />
        <SidebarItem to="/admin/wizard" label="Wizard (9 etapas)" />
        <SidebarItem to="/admin/flujo" label="Flujo (mapa)" />
        <SidebarItem to="/admin/consola" label="Consola (debug)" />
        <SidebarItem to="/admin/alumnos" label="Alumnos" />
        <SidebarItem to="/admin/usuarios" label="Usuarios" />
        <SidebarItem to="/admin/post-clase" label="Post-clase" />
        <SidebarItem to="/admin/memoria" label="Memoria alumno" />
        <SidebarItem to="/admin/auditoria" label="Auditoría" />
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
            <button className="btn btn-secondary btn-sm" onClick={() => nav(`/admin/templates/${t.id}/evolution`)}>
              Evolución
            </button>
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

            {/* Segmento + Enfoque (Motor Pedagógico Adaptativo) */}
            <Section title="Segmento y enfoque" subtitle="A quién sirve este coach y CÓMO lleva la clase (la receta narrativa del segmento). El nivel del idioma va en Metodología, no acá.">
              <label style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 700 }}>Segmento</label>
              <select className="input" value={(t as any).segmento || ''} onChange={(e) => update({ segmento: e.target.value } as any)} style={{ marginTop: 4, height: 38 }}>
                <option value="">—</option>
                <option value="mini">Mini · chiquitos (4-7)</option>
                <option value="junior">Junior · más grandes (8-12)</option>
                <option value="tween">Tween · adolescentes (13+)</option>
                <option value="adultos">Adultos</option>
              </select>
              <label style={{ fontSize: 12, color: 'var(--fg-3)', fontWeight: 700, marginTop: 10, display: 'block' }}>Enfoque — cómo lleva la clase</label>
              <textarea className="input" value={(t as any).enfoque || ''} onChange={(e) => update({ enfoque: e.target.value } as any)} rows={5} style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, resize: 'vertical', padding: '8px 10px' }} placeholder="Ej (niños): explicar el mundo + ejemplos + alguna broma + ir uniendo las palabras en una frasecita; la clase es un cuento/aventura donde el chico es protagonista." />
            </Section>

            {/* 0. Personalidad pedagógica (PRESETS) */}
            <Section title="Personalidad pedagógica" subtitle="Elegí cómo se comporta el tutor en la conversación. Cada preset ajusta cuánto habla, qué tipo de preguntas hace y cómo interactúa.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 6 }}>
                {([
                  { id: 'entrevistador', name: 'Entrevistador', desc: 'Habla poco. Hace muchas preguntas cortas. Para alumnos que necesitan hablar más.' },
                  { id: 'balanced', name: 'Conversación pareja', desc: '50/50. Aporta y pregunta en partes iguales. Default seguro.' },
                  { id: 'charlatan', name: 'Charlatán curioso', desc: 'Habla bastante. Cuenta data y modela cómo hablar del tema.' },
                  { id: 'mentor', name: 'Mentor pedagógico', desc: 'Comparte info y hace preguntas específicas. Sin "cuál es tu favorito".' },
                  { id: 'provocador', name: 'Provocador/Bootcamp', desc: 'Discrepa, contradice, pide defensa de ideas. Para B2+.' },
                  { id: 'ludico', name: 'Lúdico', desc: 'Juegos verbales, micro-roleplays, humor liviano.' },
                ] as const).map((p) => {
                  const active = (t as any).pedagogy_preset === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => update({ pedagogy_preset: p.id } as any)}
                      style={{
                        textAlign: 'left', cursor: 'pointer', padding: '12px 14px',
                        borderRadius: 12, border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-1)'}`,
                        background: active ? 'var(--primary-tint)' : 'var(--surface)',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 4 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.4 }}>{p.desc}</div>
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border-1)' }}>
                <ToggleRow t="Una sola pregunta por turno" s="Prohibe que el tutor encadene 2-3 preguntas al mismo tiempo" on={(t as any).one_question_per_turn ?? true} onChange={(v) => update({ one_question_per_turn: v } as any)} />
                <ToggleRow t="Evitar preguntas tipo '¿cuál es el mejor?'" s="Reemplaza por preguntas específicas (cómo, por qué, cuándo)" on={(t as any).avoid_superlative_questions ?? true} onChange={(v) => update({ avoid_superlative_questions: v } as any)} />
              </div>
            </Section>

            {/* 0b. Voz - 1 selector por idioma con boton probar */}
            <Section title="Voz por idioma" subtitle="Elegí qué voz usa este tutor en cada idioma. Tocá 'Probar' para escuchar.">
              <VoicePerLangRow lang="en" label="Inglés (target_language=en)" template={t} update={update} />
              <VoicePerLangRow lang="es" label="Español (target_language=es)" template={t} update={update} />
              <VoicePerLangRow lang="pt" label="Português (target_language=pt)" template={t} update={update} />
            </Section>

            {/* 0c. Cadencia */}
            <Section title="Cadencia y expresividad" subtitle="Velocidad, estabilidad y tiempo de respuesta.">
              <SliderRow label="Velocidad de habla" hint="70 = más lento · 130 = más rápido" value={(t as any).voice_speed ?? 100} min={70} max={130} step={5} suffix="%" onChange={(v) => update({ voice_speed: v } as any)} />
              <SliderRow label="Estabilidad de voz" hint="0 = muy expresiva (varía mucho) · 100 = muy estable (uniforme)" value={(t as any).voice_stability ?? 50} min={0} max={100} step={5} onChange={(v) => update({ voice_stability: v } as any)} />
              <SliderRow label="Estilo emocional" hint="0 = plano · 100 = muy emotivo" value={(t as any).voice_style ?? 30} min={0} max={100} step={5} onChange={(v) => update({ voice_style: v } as any)} />
              <SliderRow label="Espera antes de hablar (ms)" hint="500ms = responde rápido · 3000ms = te deja respirar" value={t.silence_tolerance_ms} min={300} max={3500} step={100} suffix="ms" onChange={(v) => update({ silence_tolerance_ms: v })} />
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
  const [aiLang, setAiLang] = useState<'es' | 'pt' | 'en' | 'it'>('es')
  const [generating, setGenerating] = useState(false)
  useEffect(() => { if (id) topicsAPI.get(Number(id)).then(setT).catch(() => {}) }, [id])

  if (!t) return <><PageHead eyebrow="Tópicos · Editar" title="Cargando…" onMenu={onMenu} /></>

  const save = async () => {
    // doc 11 §1.1 — el tópico es SOLO data. Si detectamos instrucciones de conducta, avisamos (no bloquea).
    const blob = [...Object.values(t.seed_prompts || {}), ...(t.keywords || [])].join('  ').toLowerCase()
    const conductFlags = ['no digas', 'hablá despacio', 'habla despacio', 'corregí', 'una pregunta por turno', 'espejo en español', 'prohibido', 'en voz baja', 'onomatopey', 'usá un tono']
    if (conductFlags.some((f) => blob.includes(f))) {
      toast('Ojo: eso parece una instrucción de conducta. El "cómo enseñar" (tono, reglas, ritmo) va en Metodología → Rieles. El tópico es solo data: vocabulario, frases y objetivo.', { duration: 8000 })
    }
    try {
      await topicsAPI.update(t.id, t)
      toast.success('Tópico guardado')
    } catch { toast.error('Error al guardar') }
  }

  const generateAI = async () => {
    setGenerating(true)
    try {
      const r = await topicsAPI.generateSeedsAI(t.id, aiLang)
      // merge propuesta sobre el estado actual
      setT({ ...t, seed_prompts: { ...(t.seed_prompts || {}), ...r.seed_prompts }, keywords: r.keywords })
      toast.success(`Propuesta generada (${aiLang.toUpperCase()}). Revisá y guardá.`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error generando con AI')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <PageHead eyebrow="Tópicos · Editar" title={t.title} onMenu={onMenu}
        sub={`${t.category} · ${(t.levels || []).join(', ')} · ${t.usage_count} usos`}
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/topicos')}>← Volver</button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
              <select
                value={aiLang}
                onChange={(e) => setAiLang(e.target.value as any)}
                style={{ height: 28, padding: '0 8px', borderRadius: 6, border: '1px solid var(--border-2)', fontSize: 12, background: 'white' }}
              >
                <option value="es">ES</option>
                <option value="pt">PT</option>
                <option value="en">EN</option>
                <option value="it">IT</option>
              </select>
              <button className="btn btn-ghost btn-sm" onClick={generateAI} disabled={generating} style={{ background: '#FFF7DD', color: '#7A5800', border: '1px solid rgba(255,184,0,.3)' }}>
                {generating ? 'Generando…' : '✨ Generar con AI'}
              </button>
            </div>
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
          <div className="card card-elev seed-card">
            <div style={{ fontWeight: 700, fontSize: 15 }}>Bandas apropiadas <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--fg-3)' }}>(sequencer)</span></div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 14 }}>
              A qué segmentos de edad les conviene este tópico. El sequencer lo usa para elegir el tópico de la próxima clase.
              Ninguna marcada = sin restricción (sirve a todos). No cambia el contenido del tópico, solo a quién se le ofrece.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['mini', 'junior', 'tween', 'adult'] as const).map((b) => {
                const on = (t.appropriate_bands || []).includes(b)
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      const cur = new Set(t.appropriate_bands || [])
                      on ? cur.delete(b) : cur.add(b)
                      const arr = Array.from(cur)
                      setT({ ...t, appropriate_bands: arr.length ? arr : null })
                    }}
                    style={{
                      padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      border: on ? '1px solid var(--primary)' : '1px solid var(--border-2)',
                      background: on ? 'var(--primary)' : 'transparent',
                      color: on ? 'white' : 'var(--fg-2)',
                    }}
                  >
                    {b === 'mini' ? 'Mini · 4-7' : b === 'junior' ? 'Junior · 8-12' : b === 'tween' ? 'Tween · 13+' : 'Adulto'}
                  </button>
                )
              })}
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

/* ──────── AUDITORÍA ──────── */
const SvgRefresh = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'rgba(0,179,126,.14)', fg: '#00875f' },
  ended: { bg: 'rgba(100,116,139,.16)', fg: '#475569' },
  analyzed: { bg: 'rgba(99,102,241,.16)', fg: '#4f46e5' },
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(secs: number | null): string {
  if (secs == null) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || { bg: 'var(--bg-2)', fg: 'var(--fg-2)' }
  return (
    <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: c.bg, color: c.fg }}>
      {status}
    </span>
  )
}

const AUDIT_PAGE = 50

function AuditoriaView({ onMenu }: { onMenu: () => void }) {
  const nav = useNavigate()
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [rows, setRows] = useState<AuditSessionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  // filtros
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const load = () => {
    setLoading(true)
    const filters: AuditSessionFilters = {
      q: q.trim() || undefined,
      status: status || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      limit: AUDIT_PAGE,
      offset: page * AUDIT_PAGE,
    }
    auditAPI.sessions(filters)
      .then((d) => { setRows(d.sessions); setTotal(d.total); setLoading(false) })
      .catch(() => { setLoading(false); toast.error('No se pudieron cargar las charlas (¿sos admin?)') })
  }

  useEffect(() => { auditAPI.stats().then(setStats).catch(() => {}) }, [])
  // recargar al cambiar filtros (con debounce sobre q) o página
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, fromDate, toDate, page])

  const clearFilters = () => { setQ(''); setStatus(''); setFromDate(''); setToDate(''); setPage(0) }
  const hasFilters = q || status || fromDate || toDate

  return (
    <>
      <PageHead eyebrow="Diagnóstico" title="Auditoría de la app" onMenu={onMenu}
        sub="Todo lo que persiste: charlas, horarios, transcripts, métricas, reportes y errores."
        actions={<button className="btn btn-ghost btn-sm" onClick={() => { setPage(0); load() }}><SvgRefresh /> Refrescar</button>} />
      <div className="view">
        <div className="kpi-row">
          <Kpi label="Charlas hoy" value={stats?.sessions_today ?? '—'} />
          <Kpi label="Charlas (7 días)" value={stats?.sessions_week ?? '—'} />
          <Kpi label="Activas ahora" value={stats?.active_now ?? '—'} />
          <Kpi label="Errores abiertos" value={stats?.open_errors ?? '—'} />
        </div>

        {/* Filtros */}
        <div className="card card-elev" style={{ padding: 14, marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', display: 'block', marginBottom: 4 }}>Usuario</label>
            <div className="search" style={{ margin: 0 }}>
              <SvgSearch />
              <input className="input" placeholder="Nombre o email" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', display: 'block', marginBottom: 4 }}>Estado</label>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}
              style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'white', fontSize: 13, fontFamily: 'inherit' }}>
              <option value="">Todos</option>
              <option value="active">active</option>
              <option value="ended">ended</option>
              <option value="analyzed">analyzed</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', display: 'block', marginBottom: 4 }}>Desde</label>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0) }}
              style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'white', fontSize: 13, fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', display: 'block', marginBottom: 4 }}>Hasta</label>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0) }}
              style={{ height: 38, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'white', fontSize: 13, fontFamily: 'inherit' }} />
          </div>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ height: 38 }}>Limpiar</button>
          )}
        </div>

        {/* Tabla */}
        <div className="card card-elev" style={{ marginTop: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 0.8fr 1.4fr 0.9fr 0.7fr 0.6fr', gap: 10, padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-1)' }}>
            <span>Usuario</span><span>Inicio</span><span>Duración</span><span>Tutor · Tópico</span><span>Estado</span><span>Turnos</span><span>Score</span>
          </div>
          {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--fg-3)' }}>Cargando…</div>}
          {!loading && rows.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-3)' }}>
              No hay charlas que coincidan con los filtros.
            </div>
          )}
          {!loading && rows.map((s) => (
            <div key={s.id} onClick={() => nav(`/admin/auditoria/${s.id}`)}
              style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 0.8fr 1.4fr 0.9fr 0.7fr 0.6fr', gap: 10, padding: '12px 16px', fontSize: 13, alignItems: 'center', borderBottom: '1px solid var(--border-1)', cursor: 'pointer' }}
              className="audit-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.user_name}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.user_email || `#${s.user_id}`}</div>
              </div>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-2)' }}>{fmtDateTime(s.started_at)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-2)' }}>{fmtDuration(s.duration_seconds)}</span>
              <div style={{ minWidth: 0, fontSize: 12, color: 'var(--fg-2)' }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.template_name || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.topic_title || 'tema libre'}</div>
              </div>
              <span><StatusBadge status={s.status} /></span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg-3)' }}>{s.turns} <span style={{ fontSize: 10 }}>({s.user_turns}/{s.ai_turns})</span></span>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: s.score != null ? 'var(--primary-dark)' : 'var(--fg-3)' }}>{s.score ?? '—'}</span>
            </div>
          ))}
          <Pagination total={total} page={page} pageSize={AUDIT_PAGE} onPageChange={setPage} />
        </div>
      </div>
    </>
  )
}

function JsonBlock({ data }: { data: Record<string, any> }) {
  const isEmpty = !data || Object.keys(data).length === 0
  if (isEmpty) return <div style={{ fontSize: 13, color: 'var(--fg-3)', padding: 8 }}>Sin datos.</div>
  return (
    <pre style={{
      margin: 0, padding: 14, background: 'var(--bg-2)', borderRadius: 10,
      fontSize: 12, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5,
      overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--fg-1)',
    }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function AuditoriaDetailView({ onMenu }: { onMenu: () => void }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [d, setD] = useState<AuditSessionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    auditAPI.session(Number(id))
      .then((data) => { setD(data); setLoading(false) })
      .catch(() => { setLoading(false); toast.error('No se pudo cargar la sesión') })
  }, [id])

  if (loading) return <><PageHead eyebrow="Auditoría · Charla" title="Cargando…" onMenu={onMenu} /></>
  if (!d) return <><PageHead eyebrow="Auditoría · Charla" title="No encontrada" onMenu={onMenu}
    actions={<button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/auditoria')}>← Volver</button>} /></>

  return (
    <>
      <PageHead eyebrow={`Charla #${d.id}`} title={`${d.user.name}`} onMenu={onMenu}
        sub={`${d.template?.name || 'sin tutor'} · ${d.topic?.title || 'tema libre'} · ${d.user.email || ''}`}
        actions={<button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/auditoria')}>← Volver</button>} />
      <div className="view">
        {/* Metadata */}
        <div className="card card-elev" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
          <Meta label="Estado" value={<StatusBadge status={d.status} />} />
          <Meta label="Inicio" value={fmtDateTime(d.started_at)} />
          <Meta label="Fin" value={fmtDateTime(d.ended_at)} />
          <Meta label="Duración" value={fmtDuration(d.duration_seconds)} />
          <Meta label="Turnos" value={`${d.turns} (alumno ${d.user_turns} / coach ${d.ai_turns})`} />
          <Meta label="Nivel inicio" value={d.cefr_at_start} />
          <Meta label="Score" value={d.score != null ? String(d.score) : '—'} />
          <Meta label="Audio" value={d.audio_url ? <a href={d.audio_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>escuchar</a> : '—'} />
        </div>

        {/* Timeline unificado: conversación + eventos (desde Cloud Logging) */}
        <UnifiedTimeline d={d} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
          {/* Métricas */}
          <div className="card card-elev" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Métricas</div>
            <JsonBlock data={d.metrics} />
          </div>
          {/* Reporte */}
          <div className="card card-elev" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Reporte final</div>
            <JsonBlock data={d.report} />
          </div>
        </div>

        {/* Errores */}
        <div className="card card-elev" style={{ padding: 16, marginTop: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Errores detectados ({d.errors.length})</div>
          {d.errors.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Sin errores registrados en esta charla.</div>}
          {d.errors.map((e) => (
            <div key={e.id} style={{ padding: '10px 0', borderTop: '1px dashed var(--border-1)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span className="pill pill-outline" style={{ textTransform: 'capitalize', flexShrink: 0 }}>{e.kind}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.label}</div>
                {e.snippet_wrong && <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 2 }}>✗ {e.snippet_wrong}</div>}
                {e.snippet_correct && <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>✓ {e.snippet_correct}</div>}
              </div>
              <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{e.resolved ? 'resuelto' : 'abierto'}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{value}</div>
    </div>
  )
}

/* ──────── TIMELINE UNIFICADO (conversación + eventos en vivo) ──────── */
const SvgBolt = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" /></svg>
const SvgGear = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>

function fmtClock(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('es-AR', { hour12: false }) } catch { return '' }
}

interface TimelineItem {
  ts: string; order: number
  kind: 'speech' | 'interruption' | 'system'
  who?: 'user' | 'ai'; text?: string; latencyMs?: number; cut?: boolean
  label?: string; gap?: number; severity?: string; raw?: any
}

function UnifiedTimeline({ d }: { d: AuditSessionDetail }) {
  const [events, setEvents] = useState<AuditLogEvent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [showSystem, setShowSystem] = useState(false)

  useEffect(() => {
    setLoading(true); setFailed(false)
    // ventana que cubre desde el inicio de la charla hasta ahora (+10 min de colchón),
    // capeada a 30 días (retención de Cloud Logging).
    let minutes = 1440
    if (d.started_at) {
      const elapsedMin = Math.ceil((Date.now() - new Date(d.started_at).getTime()) / 60000) + 10
      minutes = Math.min(Math.max(elapsedMin, 60), 43200)
    }
    auditAPI.timeline(d.id, minutes)
      .then((r) => { setEvents(r.timeline || []); setLoading(false) })
      .catch(() => { setFailed(true); setLoading(false) })
  }, [d.id, d.started_at])

  const items = useMemo<TimelineItem[]>(() => {
    if (!events) return []
    const out: TimelineItem[] = []
    let order = 0
    for (const e of events) {
      const ev = e.event || ''
      const dt = e.data || {}
      if (ev === 'gemini.turn.complete') {
        const u = (dt.user_text || '').trim()
        const a = (dt.ai_text || '').trim()
        if (u) out.push({ ts: e.ts, order: order++, kind: 'speech', who: 'user', text: u })
        if (a) out.push({ ts: e.ts, order: order++, kind: 'speech', who: 'ai', text: a, latencyMs: dt.ms_since_user_input, cut: !!dt.possible_coach_cut })
      } else if (ev === 'gemini.coach.ghost_turn_dropped') {
        out.push({ ts: e.ts, order: order++, kind: 'interruption', label: dt.reason, gap: dt.gap_since_last_coach_s })
      } else if (showSystem) {
        const sev = e.severity || 'INFO'
        const interesting = sev === 'ERROR' || sev === 'WARNING'
          || ev.startsWith('gemini.setup') || ev.startsWith('ws.') || ev.startsWith('session.')
          || ev === 'gemini.audio.first_chunk' || ev === 'audio.context.real_sample_rate'
        if (interesting) out.push({ ts: e.ts, order: order++, kind: 'system', label: ev, severity: sev, raw: dt })
      }
    }
    out.sort((x, y) => (x.ts === y.ts ? x.order - y.order : (x.ts < y.ts ? -1 : 1)))
    return out
  }, [events, showSystem])

  const nSpeech = items.filter((i) => i.kind === 'speech').length
  const nInterrupt = items.filter((i) => i.kind === 'interruption').length
  const noLogs = !loading && (failed || (events !== null && events.length === 0))

  return (
    <div className="card card-elev" style={{ padding: 16, marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          Conversación + eventos
          {!noLogs && !loading && (
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-3)', marginLeft: 8 }}>
              {nSpeech} turnos · {nInterrupt} interrupciones
            </span>
          )}
        </div>
        {!noLogs && !loading && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowSystem((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <SvgGear /> {showSystem ? 'Ocultar' : 'Mostrar'} eventos de sistema
          </button>
        )}
      </div>

      {loading && <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Cargando timeline en vivo…</div>}

      {/* Fallback: charla vieja / sin logs en vivo → transcript persistido de la DB */}
      {noLogs && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-2)', borderRadius: 8 }}>
            Sin eventos en vivo en Cloud Logging (charla anterior a la retención de ~30 días o sin instrumentar). Mostrando el transcript persistido en la DB.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.transcript.length === 0 && <div style={{ fontSize: 13, color: 'var(--fg-3)' }}>Tampoco hay transcript en la DB.</div>}
            {d.transcript.map((turn, i) => {
              const isAi = turn.who === 'ai'
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, marginTop: 2, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: isAi ? 'rgba(99,102,241,.14)' : 'rgba(0,179,126,.14)', color: isAi ? '#4f46e5' : '#00875f', minWidth: 56, textAlign: 'center' }}>
                    {isAi ? 'COACH' : 'ALUMNO'}
                  </span>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fg-1)', flex: 1 }}>
                    {(turn.text || '').trim() || <span style={{ color: 'var(--fg-3)', fontStyle: 'italic' }}>(vacío)</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline unificado */}
      {!loading && !noLogs && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, i) => <TimelineRow key={i} it={it} />)}
        </div>
      )}
    </div>
  )
}

function TimelineRow({ it }: { it: TimelineItem }) {
  const clock = fmtClock(it.ts)

  if (it.kind === 'interruption') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 12px', borderRadius: 8, background: 'rgba(234,88,12,.10)', border: '1px solid rgba(234,88,12,.25)' }}>
        <span style={{ color: '#ea580c', display: 'flex' }}><SvgBolt /></span>
        <span style={{ fontSize: 12, color: '#9a3412', fontWeight: 600 }}>
          Interrupción · el coach iba a hablar sin input del alumno
          {it.gap != null && <span style={{ fontWeight: 400 }}> · gap {Number(it.gap).toFixed(1)}s</span>}
          {it.label && <span style={{ fontWeight: 400, color: '#c2410c' }}> ({it.label})</span>}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--fg-3)', fontFamily: 'JetBrains Mono, monospace' }}>{clock}</span>
      </div>
    )
  }

  if (it.kind === 'system') {
    const sevColor = it.severity === 'ERROR' ? '#dc2626' : it.severity === 'WARNING' ? '#d97706' : 'var(--fg-3)'
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '3px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--fg-3)' }}>
        <span style={{ color: sevColor, display: 'flex', alignSelf: 'center' }}><SvgGear /></span>
        <span style={{ color: sevColor, fontWeight: 600 }}>{it.label}</span>
        <span style={{ color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {it.raw ? JSON.stringify(it.raw) : ''}
        </span>
        <span style={{ fontSize: 10 }}>{clock}</span>
      </div>
    )
  }

  // speech
  const isAi = it.who === 'ai'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, marginTop: 2, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: isAi ? 'rgba(99,102,241,.14)' : 'rgba(0,179,126,.14)', color: isAi ? '#4f46e5' : '#00875f', minWidth: 56, textAlign: 'center' }}>
        {isAi ? 'COACH' : 'ALUMNO'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fg-1)' }}>{it.text}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
          {isAi && it.latencyMs != null && (
            <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>respondió en {(it.latencyMs / 1000).toFixed(1)}s</span>
          )}
          {isAi && it.cut && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,.10)', padding: '1px 6px', borderRadius: 4 }}>posible corte al alumno</span>
          )}
          <span style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'JetBrains Mono, monospace' }}>{clock}</span>
        </div>
      </div>
    </div>
  )
}

/* ===== Catalogo de voces disponibles por idioma (mirror de los voice_id en backend) ===== */
const VOICES_BY_LANG: Record<string, { id: string; name: string; tag: string }[]> = {
  en: [
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah',  tag: 'US · Femenina · cálida' },
    { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric',   tag: 'US · Masculina · smooth' },
    { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily',   tag: 'UK · Femenina · velvety' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', tag: 'UK · Masculina · storyteller' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura',  tag: 'US · Femenina · energética' },
    { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', tag: 'UK · Masculina · broadcaster' },
  ],
  es: [
    { id: 'QK4xDwo9ESPHA4JNUpX3', name: 'Tomás',        tag: 'AR · Masculina · rioplatense' },
    { id: 'rooCDyI2p1wGjgC5O5lH', name: 'Maxi',         tag: 'AR · Masculina · conversacional' },
    { id: '9FG0AH71kXEuvM9IJg7u', name: 'Martin',       tag: 'AR · Masculina · profesional' },
    { id: 'PoLFkTquRWtbexdwW3Xa', name: 'Paola Blasi',  tag: 'AR · Femenina · narrativa' },
    { id: 'yA5jrK1S9cpCAojBYyMu', name: 'Lucia',        tag: 'ES · Femenina · expresiva' },
    { id: '9rvdnhrYoXoUt4igKpBw', name: 'Mariana',      tag: 'ES · Femenina · íntima' },
    { id: 'bN1bDXgDIGX5lw0rtY2B', name: 'Melanie',      tag: 'ES · Femenina · profesional' },
  ],
  pt: [
    { id: 'AGNkIY6dMkIkc3g53Rdb', name: 'Rafael Silva', tag: 'BR · Masculina · conversacional' },
    { id: 'soegYoc6KNWiqSWuHJUm', name: 'Kauan',        tag: 'BR · Masculina · serio' },
    { id: 'fhtZMBwha5du5OxuvexO', name: 'Malu',         tag: 'BR · Femenina · casual' },
  ],
}

const PROBE_TEXT: Record<string, string> = {
  en: 'Hi there! I am your tutor. Let us practice speaking together today.',
  es: 'Hola, soy tu tutor. Vamos a practicar hablando hoy.',
  pt: 'Olá, sou seu tutor. Vamos praticar conversando hoje.',
}

function VoicePerLangRow({ lang, label, template, update }: {
  lang: 'en' | 'es' | 'pt'
  label: string
  template: Template
  update: (patch: Partial<Template>) => void
}) {
  const fieldKey = `voice_id_${lang}` as 'voice_id_en' | 'voice_id_es' | 'voice_id_pt'
  const currentId = (template as any)[fieldKey] || ''
  const voices = VOICES_BY_LANG[lang] || []
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const onProbe = async () => {
    if (!currentId) { toast.error('Elegí una voz primero'); return }
    if (audioRef.current) { try { audioRef.current.pause() } catch {} }
    setPlaying(true)
    try {
      const audio = await ttsAPI.play(PROBE_TEXT[lang], { voice_id: currentId })
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
    } catch (e: any) {
      setPlaying(false)
      toast.error(e?.response?.data?.detail || 'No se pudo reproducir')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0', borderBottom: '1px dashed var(--border-1)' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-2)' }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={currentId}
          onChange={(e) => update({ [fieldKey]: e.target.value } as any)}
          style={{
            flex: 1, height: 36, padding: '0 10px',
            border: '1px solid var(--border-2)', borderRadius: 8,
            background: 'white', fontSize: 13, color: 'var(--fg-1)',
            fontFamily: 'inherit',
          }}
        >
          <option value="">— elegí voz —</option>
          {voices.map((v) => (
            <option key={v.id} value={v.id}>{v.name} · {v.tag}</option>
          ))}
        </select>
        <button
          onClick={onProbe}
          disabled={playing || !currentId}
          className="btn btn-secondary btn-sm"
          style={{ minWidth: 90 }}
        >
          {playing ? '▶ ...' : '▶ Probar'}
        </button>
      </div>
    </div>
  )
}

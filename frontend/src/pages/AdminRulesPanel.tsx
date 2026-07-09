/* AdminRulesPanel — Reglas del coach · MOTOR v3 (canónico).
 *
 * Elegís EDAD (banda) + NIVEL y ves las reglas de conducta que el motor aplica,
 * AGRUPADAS POR ORIGEN:
 *   · Por la EDAD     → behavioral_guard (editable: son presets de la banda)
 *   · Por el NIVEL    → modifier del nivel + level_policy (editable)
 *   · Siempre/segurid → universal_policy (protegidas, no se tocan acá)
 * Editás/agregás/quitás SOLO presets — cero campo de texto libre suelto. A la
 * derecha el prompt se arma en vivo (resolve del motor) para ver causa→efecto.
 *
 * Lee/escribe el modelo v3 vía /motor/* (motor_v3.sql + motor_prompt.py).
 * Reemplaza la pantalla vieja que colgaba del catálogo /rules (v2): consolidación.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { motorAPI } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

interface Band { band_id: number; code: string; label: string; min_age: number; max_age: number; phase_group: string }
interface Level { level_code: string; label: string; sort_order: number; modifier?: string }
interface Guard { guard_id: number; band_id: number; ord: number; body: string }
interface LevelPolicy { policy_id: number; level_code: string; kind: string; body: string }
interface UnivPolicy { policy_id: number; kind: string; ord: number; body: string; is_editable?: number }

const C = {
  bg: '#0b0e14', panel: '#11151d', border: '#232936', soft: '#1c2230', fg: '#e6e8ec',
  dim: '#9aa3af', faint: '#6b7686', edad: '#fbbf24', nivel: '#7dd3fc', fijo: '#9aa3af',
  green: '#22c55e', red: '#f87171',
}
const FIELD: React.CSSProperties = {
  padding: '7px 9px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg,
  color: C.fg, fontSize: 13, fontFamily: 'inherit',
}
const Ico = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const InfoIco = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>
)
const LOCK = 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4'
const PLUS = 'M12 5v14M5 12h14'
const X = 'M18 6 6 18M6 6l12 12'

export default function AdminRulesPanel() {
  const isMobile = useIsMobile()
  const [bands, setBands] = useState<Band[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [bandId, setBandId] = useState<number | null>(null)
  const [level, setLevel] = useState<string>('')

  const [guards, setGuards] = useState<Guard[]>([])
  const [levelPols, setLevelPols] = useState<LevelPolicy[]>([])
  const [univ, setUniv] = useState<UnivPolicy[]>([])
  const [levelRows, setLevelRows] = useState<Level[]>([])
  const [prompt, setPrompt] = useState<string>('')

  // dimensiones (selectores) — una vez
  useEffect(() => {
    motorAPI.dimensions().then((d: any) => {
      setBands(d.bands || [])
      setLevels(d.levels || [])
      if (d.bands?.[0]) setBandId(d.bands[0].band_id)
      if (d.levels?.[0]) setLevel(d.levels[0].level_code)
    }).catch(() => toast.error('No pude cargar bandas/niveles'))
  }, [])

  // catálogo de reglas — se filtra en memoria por banda/nivel
  const loadData = useCallback(() => {
    Promise.all([
      motorAPI.rows('behavioral_guard'),
      motorAPI.rows('level_policy'),
      motorAPI.rows('universal_policy'),
      motorAPI.rows('level'),
    ]).then(([g, lp, up, lv]) => {
      setGuards(g as Guard[]); setLevelPols(lp as LevelPolicy[])
      setUniv(up as UnivPolicy[]); setLevelRows(lv as Level[])
    }).catch(() => toast.error('No pude cargar las reglas'))
  }, [])
  useEffect(() => { loadData() }, [loadData])

  // prompt en vivo (motor canónico) cuando hay banda + nivel
  const band = useMemo(() => bands.find((b) => b.band_id === bandId), [bands, bandId])
  const resolvePrompt = useCallback(() => {
    if (!band || !level) return
    motorAPI.resolve({ band_code: band.code, level_code: level })
      .then((r) => setPrompt(r.prompt)).catch(() => setPrompt('(no se pudo resolver el prompt)'))
  }, [band, level])
  useEffect(() => { resolvePrompt() }, [resolvePrompt])

  const refresh = () => { loadData(); resolvePrompt() }

  // derivados por origen
  const guardsOfBand = useMemo(
    () => guards.filter((g) => g.band_id === bandId).sort((a, b) => a.ord - b.ord), [guards, bandId])
  const polsOfLevel = useMemo(
    () => levelPols.filter((p) => p.level_code === level), [levelPols, level])
  const modifier = useMemo(
    () => levelRows.find((l) => l.level_code === level)?.modifier || '', [levelRows, level])

  // ── mutaciones (siempre sobre presets, nunca texto libre suelto) ──
  const saveGuard = async (g: Guard, body: string) => {
    if (body.trim() === g.body || !body.trim()) return
    try { await motorAPI.update('behavioral_guard', { guard_id: g.guard_id }, { body: body.trim() }); toast.success('Guardado'); refresh() }
    catch { toast.error('No se pudo guardar') }
  }
  const delGuard = async (g: Guard) => {
    if (!window.confirm('¿Quitar esta regla de la edad?')) return
    try { await motorAPI.remove('behavioral_guard', { guard_id: g.guard_id }); refresh() }
    catch { toast.error('No se pudo quitar') }
  }
  const addGuard = async (body: string) => {
    if (!body.trim() || bandId == null) return
    const ord = (guardsOfBand.length ? guardsOfBand[guardsOfBand.length - 1].ord : 0) + 1
    try { await motorAPI.insert('behavioral_guard', { band_id: bandId, ord, body: body.trim() }); toast.success('Regla agregada'); refresh() }
    catch { toast.error('No se pudo agregar') }
  }
  const savePol = async (p: LevelPolicy, body: string) => {
    if (body.trim() === p.body || !body.trim()) return
    try { await motorAPI.update('level_policy', { policy_id: p.policy_id }, { body: body.trim() }); toast.success('Guardado'); refresh() }
    catch { toast.error('No se pudo guardar') }
  }
  const delPol = async (p: LevelPolicy) => {
    if (!window.confirm('¿Quitar esta política del nivel?')) return
    try { await motorAPI.remove('level_policy', { policy_id: p.policy_id }); refresh() }
    catch { toast.error('No se pudo quitar') }
  }
  const addPol = async (kind: string, body: string) => {
    if (!body.trim() || !level) return
    try { await motorAPI.insert('level_policy', { level_code: level, kind, body: body.trim() }); toast.success('Política agregada'); refresh() }
    catch { toast.error('No se pudo agregar') }
  }
  const saveModifier = async (body: string) => {
    if (body.trim() === modifier || !body.trim()) return
    try { await motorAPI.update('level', { level_code: level }, { modifier: body.trim() }); toast.success('Guardado'); refresh() }
    catch { toast.error('No se pudo guardar') }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.fg, padding: '22px 20px 64px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Reglas del coach · motor v3</h1>
        <p style={{ color: C.dim, fontSize: 13, margin: '0 0 14px', maxWidth: 860 }}>
          Las <b>reglas de conducta</b> son los límites del coach: qué SÍ y qué NO puede hacer.
          Cambian según la <b>edad</b> y el <b>nivel</b> del alumno. Elegí los dos y mirá las que caen,
          agrupadas por origen. Editás o agregás <b>presets</b> — nunca texto libre. A la derecha,
          el prompt real se rearma solo.
        </p>

        {/* selectores edad × nivel */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 4, fontWeight: 700 }}>EDAD (BANDA)</div>
            <select style={{ ...FIELD, width: 220 }} value={bandId ?? ''} onChange={(e) => setBandId(Number(e.target.value))}>
              {bands.map((b) => <option key={b.band_id} value={b.band_id}>{b.label} ({b.min_age}–{b.max_age})</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 4, fontWeight: 700 }}>NIVEL</div>
            <select style={{ ...FIELD, width: 130 }} value={level} onChange={(e) => setLevel(e.target.value)}>
              {levels.map((l) => <option key={l.level_code} value={l.level_code}>{l.level_code}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
          {/* columna izquierda: reglas por origen */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: 'rgba(125,211,252,0.06)', border: `1px solid ${C.soft}`, borderRadius: 12, padding: '11px 13px', color: C.dim, fontSize: 12.5, lineHeight: 1.5 }}>
              <span style={{ color: C.nivel, flexShrink: 0, marginTop: 1 }}><InfoIco /></span>
              <span>Lo que ves acá es la <b style={{ color: C.fg }}>capa 6 del motor</b> (los rieles): se arma con las reglas de la <b style={{ color: C.edad }}>edad</b>, el modificador del <b style={{ color: C.nivel }}>nivel</b> y las <b>universales</b> de seguridad. Es la capa más sensible.</span>
            </div>

            <RuleGroup
              color={C.edad} tag="[P] preset · edad"
              title={`Por la EDAD — ${band?.label ?? ''}`}
              hint="Cómo se comporta el coach por la edad del alumno (largo de turno, tipo de pregunta, espejo en español)."
            >
              {guardsOfBand.map((g) => (
                <EditableRow key={g.guard_id} value={g.body} accent={C.edad}
                  onSave={(v) => saveGuard(g, v)} onDelete={() => delGuard(g)} meta={`#${g.ord}`} />
              ))}
              <AddRow accent={C.edad} placeholder="Nueva regla para esta edad…" onAdd={addGuard} />
            </RuleGroup>

            <RuleGroup
              color={C.nivel} tag="[P] preset · nivel"
              title={`Por el NIVEL — ${level}`}
              hint="El modificador del nivel (cuánto español, vocabulario) y las políticas de pista/error."
            >
              {/* modifier del nivel: un preset editable de la fila level */}
              {modifier !== '' && (
                <EditableRow value={modifier} accent={C.nivel} onSave={saveModifier} meta="modificador" />
              )}
              {polsOfLevel.map((p) => (
                <EditableRow key={p.policy_id} value={p.body} accent={C.nivel}
                  onSave={(v) => savePol(p, v)} onDelete={() => delPol(p)} meta={p.kind} />
              ))}
              <AddRowKind accent={C.nivel} kinds={['hint_policy', 'error_policy']} onAdd={addPol} />
            </RuleGroup>

            <RuleGroup
              color={C.fijo} tag="[E] universal · protegida" locked
              title="Siempre · seguridad"
              hint="Reglas universales de seguridad y privacidad. Son el esqueleto del motor: no se editan acá."
            >
              {univ.map((u) => (
                <div key={u.policy_id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 9, background: C.bg, border: `1px solid ${C.soft}`, opacity: 0.8 }}>
                  <span style={{ color: C.faint, flexShrink: 0, marginTop: 1 }}><Ico d={LOCK} size={13} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.4 }}>{u.body}</div>
                    <span style={{ fontSize: 9.5, color: C.faint, fontFamily: 'monospace' }}>{u.kind}</span>
                  </div>
                </div>
              ))}
            </RuleGroup>
          </div>

          {/* columna derecha: prompt en vivo */}
          <div style={{ position: isMobile ? 'static' : 'sticky', top: 16, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: C.dim, fontWeight: 700 }}>
                Prompt armado ({band?.code} · {level})
              </div>
              <a href="/lab/llm" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.green, textDecoration: 'none' }}>Probar ↗</a>
            </div>
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 8 }}>Mirá el bloque <code style={{ color: C.nivel }}>&lt;behavioral_guards&gt;</code> — es lo que estás editando.</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.5, color: '#cbd5e1', maxHeight: '72vh', overflowY: 'auto', fontFamily: 'ui-monospace, monospace' }}>
              {prompt || '(resolviendo…)'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── grupo de reglas por origen ── */
function RuleGroup({ color, tag, title, hint, locked, children }: {
  color: string; tag: string; title: string; hint: string; locked?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
        <div style={{ fontSize: 13.5, fontWeight: 800 }}>{title}</div>
        {locked && <span style={{ color: C.faint }}><Ico d={LOCK} size={12} /></span>}
        <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 700, color }}>{tag}</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.faint, marginBottom: 11, lineHeight: 1.4 }}>{hint}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  )
}

/* ── fila editable (textarea inline + quitar) ── */
function EditableRow({ value, accent, onSave, onDelete, meta }: {
  value: string; accent: string; onSave: (v: string) => void; onDelete?: () => void; meta?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.015)', border: `1px solid ${C.soft}`, borderLeft: `2px solid ${accent}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <textarea defaultValue={value} onBlur={(e) => e.target.value !== value && onSave(e.target.value)}
          rows={1} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'transparent', border: 'none', color: C.fg, fontSize: 13, fontFamily: 'inherit', lineHeight: 1.4, padding: 0, outline: 'none', minHeight: 20 }} />
        {meta && <span style={{ fontSize: 9.5, color: C.faint, fontFamily: 'monospace' }}>{meta}</span>}
      </div>
      {onDelete && (
        <button onClick={onDelete} title="quitar" style={{ background: 'none', border: 0, color: C.faint, cursor: 'pointer', flexShrink: 0 }}><Ico d={X} size={15} /></button>
      )}
    </div>
  )
}

/* ── agregar regla simple ── */
function AddRow({ accent, placeholder, onAdd }: { accent: string; placeholder: string; onAdd: (v: string) => void }) {
  const [v, setV] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const submit = () => { if (v.trim()) { onAdd(v); setV('') } }
  return (
    <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
      <input ref={ref} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ ...FIELD, flex: 1, padding: '6px 9px', fontSize: 12.5 }} />
      <button onClick={submit} style={{ background: 'none', border: `1px solid ${accent}`, color: accent, borderRadius: 8, fontSize: 12, padding: '4px 11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <Ico d={PLUS} size={13} /> agregar
      </button>
    </div>
  )
}

/* ── agregar con selector de tipo (level_policy) ── */
function AddRowKind({ accent, kinds, onAdd }: { accent: string; kinds: string[]; onAdd: (kind: string, v: string) => void }) {
  const [kind, setKind] = useState(kinds[0])
  const [v, setV] = useState('')
  const submit = () => { if (v.trim()) { onAdd(kind, v); setV('') } }
  return (
    <div style={{ display: 'flex', gap: 7, marginTop: 2, flexWrap: 'wrap' }}>
      <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...FIELD, padding: '6px 9px', fontSize: 12.5, width: 140 }}>
        {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <input value={v} placeholder="Nueva política…" onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ ...FIELD, flex: 1, minWidth: 120, padding: '6px 9px', fontSize: 12.5 }} />
      <button onClick={submit} style={{ background: 'none', border: `1px solid ${accent}`, color: accent, borderRadius: 8, fontSize: 12, padding: '4px 11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <Ico d={PLUS} size={13} /> agregar
      </button>
    </div>
  )
}

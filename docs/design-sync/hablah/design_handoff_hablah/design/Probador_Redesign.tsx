/* Probador_Redesign.tsx — componentes del rediseño del Probador, listos para migrar.
 *
 * Pensado para reemplazar secciones de MotorPlaygroundPanel SIN cambiar su lógica:
 * mismos hooks (useLiveVoice), misma API (motorAPI), mismo ReactFlow v11, mismas
 * CSS vars del backoffice (--bg-1, --surface, --primary...). Cada componente indica
 * QUÉ parte del panel actual reemplaza.
 *
 * Índice:
 *   PROBADOR_CSS      → string de estilos nuevos (inyectar junto a BACKOFFICE_CSS)
 *   <FieldCard>       → sub-card de campo (Tabla·Campo + acoplamiento + pills + lápiz)
 *   <LayerAccordion>  → una capa del composer (reemplaza el acordeón actual)
 *   <PromptPanel>     → panel distintivo del prompt con 3 vistas + pantalla completa
 *   <LiveDock>        → dock inferior fijo de la clase en vivo (estado/cadencia/transcript)
 *   <RailCard>        → card colapsable del rail (Ajuste JIT / Memoria)
 * La vista "Mapa de nodos" NO se reemplaza: seguir usando el PromptFlow existente.
 */
import { useState, useMemo, ReactNode } from 'react'

/* ── estilos nuevos: agregar a BACKOFFICE_CSS o inyectar como <style> hermano ── */
export const PROBADOR_CSS = `
/* sub-card de campo (reemplaza el bloque plano de cada entry en el acordeón) */
.bo-root .jf-card{background:var(--bg-2);border:1px solid var(--border-1);border-radius:10px;padding:10px 12px 12px;position:relative;margin-bottom:8px}
.bo-root .jf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:7px;flex-wrap:wrap}
.bo-root .jf-name{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;font-weight:800;color:var(--primary-dark)}
[data-theme="dark"] .bo-root .jf-name{color:var(--primary)}
.bo-root .jf-meta{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.bo-root .jf-src{font-size:10px;color:var(--fg-3)}
.bo-root .jf-src b{font-family:'JetBrains Mono',ui-monospace,monospace;color:var(--fg-1);font-weight:700}
.bo-root .jf-acopl{font-size:8.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:2px 6px;border-radius:5px;border:1px solid;white-space:nowrap}
.bo-root .jf-val{font-size:13px;line-height:1.6;color:var(--fg-1);padding-right:26px}
.bo-root .jf-val .ph{display:inline-block;background:rgba(56,189,248,.13);color:#0284c7;border:1.2px solid rgba(56,189,248,.45);border-radius:6px;padding:0 6px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11.5px;font-weight:700;cursor:pointer;margin:0 2px}
[data-theme="dark"] .bo-root .jf-val .ph{color:#38bdf8}
.bo-root .jf-pen{position:absolute;right:10px;bottom:8px;width:26px;height:26px;border-radius:7px;display:grid;place-items:center;color:var(--primary-dark);background:none;border:0;cursor:pointer}
.bo-root .jf-pen:hover{background:var(--surface)}
/* panel distintivo del prompt */
.bo-root .prompt-panel{background:var(--surface);border:1px solid var(--border-2);border-radius:16px;padding:18px;margin-top:26px;box-shadow:var(--shadow-card)}
.bo-root .prompt-panel.full{position:fixed;inset:0;z-index:220;border-radius:0;margin:0;overflow:auto}
.bo-root .pp-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.bo-root .prompt-panel .flow-wrap{height:500px;border:1px solid var(--border-1);border-radius:12px;overflow:hidden;background:var(--bg-2)}
.bo-root .prompt-panel.full .flow-wrap{height:calc(100vh - 150px)}
/* dock inferior fijo — la clase en vivo NUNCA tapada */
.bo-root .live-dock{position:fixed;left:var(--sidebar-w);right:0;bottom:0;z-index:70;background:var(--ink-1);color:#fff;box-shadow:0 -10px 30px rgba(0,0,0,.24);border-top:1px solid rgba(255,255,255,.08)}
.bo-root .live-dock .dock-bar{display:flex;align-items:center;gap:14px;padding:12px 24px;cursor:pointer;user-select:none}
.bo-root .live-dock .dock-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.bo-root .live-dock .dock-row:last-child{border-bottom:0}
.bo-root .live-dock .dock-body{display:none;padding:4px 24px 20px;max-height:38vh;overflow-y:auto}
.bo-root .live-dock.open .dock-body{display:block}
/* IMPORTANTE: el contenedor scrolleable debe compensar la altura del dock:
   paddingBottom = dock.offsetHeight + 28 (sincrónico, sin requestAnimationFrame). */
/* rail colapsable */
.bo-root .rcard .card-head{cursor:pointer;user-select:none}
.bo-root .rcard .rbody{display:none;padding-top:10px}
.bo-root .rcard.open .rbody{display:block}
`

/* ── paleta por dueño (idéntica a OWNERS del panel actual) ── */
export const OWNER_COLORS: Record<string, string> = {
  runtime: '#3b82f6', edad: '#fbbf24', nivel: '#7dd3fc', cruce: '#00b37e',
  topico: '#818cf8', reglas: '#a855f7', template: '#8e938f', codigo: '#f87171',
}

/* Texto del badge de acoplamiento — misma semántica que el indicador del JIT editor */
export function acoplamientoDe(owner: string, ctx: { band: string; level: string; topicTitle?: string }) {
  switch (owner) {
    case 'edad': return `Acoplamiento: EDAD ("${ctx.band.toUpperCase()}")`
    case 'nivel': return `Acoplamiento: NIVEL ("${ctx.level}")`
    case 'cruce': return `Acoplamiento: EDAD × NIVEL ("${ctx.band.toUpperCase()} × ${ctx.level}")`
    case 'topico': return `Acoplamiento: TÓPICO ("${ctx.topicTitle || ''}")`
    case 'reglas': return 'Acoplamiento: EDAD / NIVEL (filtro JIT)'
    default: return 'Runtime (sesión)'
  }
}

/* Renderiza {placeholder} como pills clickeables (usa el handlePlaceholderClick existente) */
export function PlaceholderText({ text, onPlaceholder }: { text: string; onPlaceholder?: (ph: string) => void }) {
  const parts = text.split(/(\{[a-zA-Z0-9_-]+\})/g)
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('{') && p.endsWith('}')) {
          const ph = p.slice(1, -1)
          return <span key={i} className="ph" title="Se interpola en runtime" onClick={(e) => { e.stopPropagation(); onPlaceholder?.(ph) }}>{p}</span>
        }
        return p
      })}
    </>
  )
}

/* ── <FieldCard> — reemplaza el bloque de cada `ent` dentro del acordeón actual ── */
export function FieldCard({ name, source, owner, value, ctx, editable, onEdit, onPlaceholder }: {
  name: string; source: string; owner: string; value: string;
  ctx: { band: string; level: string; topicTitle?: string };
  editable?: boolean; onEdit?: () => void; onPlaceholder?: (ph: string) => void;
}) {
  const [tabla, campo] = source.includes('.') ? source.split('.') : [source, '']
  const col = OWNER_COLORS[owner] || OWNER_COLORS.runtime
  return (
    <div className="jf-card">
      <div className="jf-head">
        <span className="jf-name">{name}</span>
        <div className="jf-meta">
          <span className="jf-src">{campo ? <>Tabla: <b>{tabla}</b> · Campo: <b>{campo}</b></> : <b>{source}</b>}</span>
          <span className="jf-acopl" style={{ color: col, borderColor: `${col}66`, background: `${col}18` }}>{acoplamientoDe(owner, ctx)}</span>
        </div>
      </div>
      <div className="jf-val"><PlaceholderText text={value} onPlaceholder={onPlaceholder} /></div>
      {editable && (
        <button className="jf-pen" title="Editar esta plantilla en el catálogo" onClick={(e) => { e.stopPropagation(); onEdit?.() }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
        </button>
      )}
    </div>
  )
}

/* ── <LayerAccordion> — reemplaza cada botón-capa del acordeón (steps.map actual) ── */
export function LayerAccordion({ n, title, owner, open, onToggle, children, ownerExplain }: {
  n: number; title: string; owner: string; open: boolean; onToggle: () => void;
  children: ReactNode; ownerExplain: string;
}) {
  const col = OWNER_COLORS[owner] || OWNER_COLORS.runtime
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${open ? col : 'var(--border-1)'}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '13px 16px', background: 'none', border: 0, cursor: 'pointer', color: 'var(--fg-1)' }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, background: `${col}22`, color: col, flexShrink: 0 }}>{n}</span>
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{title}</span>
        <span style={{ fontSize: 9.5, fontWeight: 800, color: col, textTransform: 'uppercase' }}>{owner}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fg-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {children}
          <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '7px 10px', fontSize: 11, color: 'var(--fg-3)', marginTop: 8, lineHeight: 1.5 }}>{ownerExplain}</div>
        </div>
      )}
    </div>
  )
}

/* ── <PromptPanel> — envuelve al PromptProSection actual con el panel distintivo.
 *    view/full son estado del padre; el contenido de cada vista sigue siendo
 *    PromptPretty / PromptRaw / PromptFlow (SIN cambios — el mapa es el existente). ── */
export function PromptPanel({ view, onView, full, onFull, onCopy, legend, children }: {
  view: 'pretty' | 'raw' | 'flow'; onView: (v: 'pretty' | 'raw' | 'flow') => void;
  full: boolean; onFull: () => void; onCopy: () => void; legend: ReactNode; children: ReactNode;
}) {
  const tab = (v: 'pretty' | 'raw' | 'flow', label: string) => (
    <button onClick={() => onView(v)} style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: 0, cursor: 'pointer', background: view === v ? 'var(--surface)' : 'transparent', color: view === v ? 'var(--fg-1)' : 'var(--fg-3)', boxShadow: view === v ? 'var(--shadow-card)' : 'none' }}>{label}</button>
  )
  return (
    <div className={`prompt-panel${full ? ' full' : ''}`}>
      <div className="pp-head">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, margin: 0 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--primary)' }} />Prompt final compilado (Gemini Live)
        </h3>
        <div style={{ display: 'inline-flex', background: 'var(--bg-2)', padding: 3, borderRadius: 11 }}>
          {tab('pretty', 'Formateado')}{tab('raw', 'Crudo (Gemini)')}{tab('flow', 'Mapa de nodos')}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={onCopy}>Copiar</button>
          <button className="btn btn-secondary btn-sm" onClick={onFull}>{full ? 'Salir' : 'Pantalla completa'}</button>
        </div>
      </div>
      {legend}
      {children}
    </div>
  )
}

/* ── <LiveDock> — reemplaza la "Mesa de pruebas" dockeada actual. Recibe la misma
 *    superficie que hoy: live (useLiveVoice), cadencia, presets, transcript. ── */
export function LiveDock({ open, onToggle, meta, estado, isLive, onStart, onEnd, cadencia, onCadencia, presets, onPreset, wave, waveIdx, transcript }: {
  open: boolean; onToggle: () => void; meta: string; estado: string; isLive: boolean;
  onStart: () => void; onEnd: () => void;
  cadencia: string; onCadencia: (v: string) => void;
  presets: { key: string; label: string; wave: string; active: boolean }[]; onPreset: (key: string) => void;
  wave: number[]; waveIdx: number | null; transcript: { who: 'ai' | 'user'; text: string }[];
}) {
  const WAVE_COLORS = ['rgba(124,231,189,.35)', 'rgba(124,231,189,.6)', '#7CE7BD', '#FFE9A6']
  return (
    <div className={`live-dock${open ? ' open' : ''}`}>
      <div className="dock-bar" onClick={onToggle}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: isLive ? 'var(--danger)' : 'var(--primary)' }} />
        <b style={{ fontSize: 13 }}>Clase en VIVO por voz</b>
        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)' }}>{meta}</span>
        <span style={{ marginLeft: 'auto' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </div>
      <div className="dock-body">
        <div className="dock-row">
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>Estado</span>
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', border: '1px solid rgba(255,255,255,.2)', borderRadius: 999, padding: '4px 12px', background: 'rgba(255,255,255,.06)', color: '#7CE7BD' }}>{estado}</span>
          <span style={{ marginLeft: 'auto' }}>
            {!isLive
              ? <button className="btn btn-primary" onClick={onStart}>Iniciar clase</button>
              : <button className="btn" style={{ color: '#FF8A8D', border: '1px solid var(--danger)', background: 'transparent' }} onClick={onEnd}>Terminar clase</button>}
          </span>
        </div>
        <div className="dock-row">
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>Cadencia de la charla</span>
          {presets.map((p) => (
            <button key={p.key} onClick={() => onPreset(p.key)} disabled={isLive} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, background: p.active ? '#7CE7BD' : 'rgba(255,255,255,.06)', color: p.active ? '#04231D' : 'rgba(255,255,255,.7)' }}>{p.label}</button>
          ))}
          <input value={cadencia} onChange={(e) => onCadencia(e.target.value)} disabled={isLive} placeholder="1,0,2,1,0,1,2,3,2,1 (default del cruce)"
            style={{ flex: '1 1 200px', minWidth: 160, background: 'rgba(0,0,0,.25)', color: '#fff', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: 'ui-monospace,monospace' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>0=icebreaker · 1=normal · 2=profunda · 3=filosa · se cicla</span>
        </div>
        <div className="dock-row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 280px', display: 'flex', alignItems: 'flex-end', gap: 5, height: 44 }}>
            {wave.map((v, i) => (
              <span key={i} style={{ flex: 1, height: `${22 + v * 26}%`, borderRadius: '4px 4px 2px 2px', background: WAVE_COLORS[v], outline: i === waveIdx ? '2px solid #fff' : 'none', outlineOffset: 1 }} />
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 260, maxHeight: 130, overflowY: 'auto', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {transcript.length === 0 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontStyle: 'italic' }}>Tocá "iniciar clase" para hablar por voz con el profe. El transcript real aparece acá.</span>}
            {transcript.map((l, i) => (
              <span key={i} style={{ fontSize: 12.5, lineHeight: 1.45 }}><b style={{ color: l.who === 'ai' ? '#7CE7BD' : '#7EB2FF' }}>{l.who === 'ai' ? 'Profe' : 'Vos'}:</b> {l.text}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── <RailCard> — card colapsable del rail derecho (Ajuste JIT, Memoria) ── */
export function RailCard({ title, open, onToggle, actions, children }: {
  title: ReactNode; open: boolean; onToggle: () => void; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <div className={`card card-pad rcard${open ? ' open' : ''}`}>
      <div className="card-head" onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, flex: 1 }}>{title}</h3>
        {actions}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--fg-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M6 9l6 6 6-6" /></svg>
      </div>
      <div className="rbody">{children}</div>
    </div>
  )
}

/* Uso sugerido dentro de MotorPlaygroundPanel (pseudocódigo de integración):
 *
 * <LayerAccordion n={i+1} title={st.step} owner={ownerOfSource(st.entries[0]?.source)}
 *   open={activeLayer===st.step} onToggle={...} ownerExplain={OWNER_EXPLAIN[owner]}>
 *   {st.entries.map(ent =>
 *     <FieldCard name={ent.label} source={ent.source} owner={ownerOfSource(ent.source)}
 *       value={ent.body} ctx={{band, level, topicTitle: meta?.topic_title}}
 *       editable onEdit={() => handleEditEntry(ent.source)}
 *       onPlaceholder={handlePlaceholderClick} />)}
 * </LayerAccordion>
 *
 * <PromptPanel view={view} onView={setView} full={full} onFull={...} onCopy={...} legend={<Leyenda/>}>
 *   {view==='flow' ? <PromptFlow steps={steps} height={full?'100%':500}/> : ...}
 * </PromptPanel>
 *
 * <LiveDock open={dockOpen} onToggle={...} isLive={isLive} estado={...}
 *   cadencia={cadencia} onCadencia={setCadencia} presets={rhythmPresets}
 *   wave={parseWave(cadencia)} waveIdx={compasActual} transcript={live.transcript}
 *   onStart={startLiveClass} onEnd={endLiveClass} meta={`${band} · ${level} · ${topic}`}/>
 */

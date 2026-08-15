/* PracticarChooser — elección de tópico (rediseño del design handoff: specs/practicar.md).
 *
 * ESTADO: BORRADOR SIN CABLEAR — escrito hasta la mitad del trabajo, no está importado
 * por ninguna pantalla, no pasó tsc/eslint y no está en producción. Queda acá como
 * material para quien siga la implementación de Practicar.
 *
 * Objetivo del diseño: que elegir tome menos de 15 segundos. Orden vertical:
 *   1) header · 2) arranque rápido (recomendado / sorpresa / tema libre)
 *   3) copiloto de elección (intención → 3 picks CON MOTIVO)
 *   4) barra de controles (buscador + orden + atajos + categorías)
 *   5) grilla de tópicos · 6) dock inferior con lo elegido
 *
 * Todo lo que muestra sale de datos REALES (intereses, catálogo, sesiones del alumno,
 * misión de rescate, tutores). El copiloto es una heurística LOCAL sobre esos datos
 * — cada pick explica su porqué; nunca un pick sin motivo (regla del spec).
 * OJO: Kids usa PracticarGalaxy — ese componente NO se toca; este es solo adultos/teens.
 * Pendiente al retomar: cablearlo en PracticarView, pasarle stats reales de sesiones,
 * y limpiar los restos marcados con TODO.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

export interface ChooserTopic {
  id: number
  title: string
  category: string
  is_hot?: boolean
}
export interface TopicStat { charlas: number; lastAt?: string | null }

interface Props {
  userName: string
  cefr: string
  minutes: number
  tutorName: string
  templates: { id: number; name: string }[]
  activeTemplateId?: number | null
  interests: ChooserTopic[]
  others: ChooserTopic[]
  stats: Record<number, TopicStat>
  rescue?: { label: string; topicId?: number | null } | null
  enableFreeTopic?: boolean
  onPick: (topicId: number) => void
  onFreeTopic: (text?: string) => void
  onMinutes: (n: number) => void
  onTutor: (templateId: number) => void
}

/* Categorías: color e ícono por familia (lenguaje visual del handoff, con las
 * categorías REALES del catálogo de la app). */
const CAT_META: Record<string, { label: string; color: string; icon: string }> = {
  tech: { label: 'Tecnología', color: '#4338CA', icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6' },
  ciencia: { label: 'Ciencia', color: '#0E7490', icon: 'M9 2v6l-5 9a3 3 0 0 0 3 4h10a3 3 0 0 0 3-4l-5-9V2M9 2h6M7 15h10' },
  arte: { label: 'Arte', color: '#7C3AED', icon: 'M9 18V5l12-2v13' },
  musica: { label: 'Música', color: '#7C3AED', icon: 'M9 18V5l12-2v13' },
  peliculas: { label: 'Cine y series', color: '#9333EA', icon: 'M4 3h16v18H4zM8 3v18M16 3v18M4 12h16' },
  videojuegos: { label: 'Gaming', color: '#0891B2', icon: 'M6 11h4M8 9v4M15 12h.01M18 10h.01M17 5H7a5 5 0 0 0-5 5v6a3 3 0 0 0 5 2h10a3 3 0 0 0 5-2v-6a5 5 0 0 0-5-5z' },
  deportes: { label: 'Deportes', color: '#C2410C', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3a9 9 0 0 0 0 18M3 12h18' },
  fitness: { label: 'Fitness', color: '#B45309', icon: 'M6.5 6.5l11 11M3 3l1 1M20 20l1 1M18 22l4-4M2 6l4-4' },
  comida: { label: 'Gastronomía', color: '#BE123C', icon: 'M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z' },
  viajes: { label: 'Viajes', color: '#1D4ED8', icon: 'M17.8 19.2 16 11l5-5a2 2 0 0 0-2.8-2.8l-5 5-8.2-1.8L3 7.8l6 3-3 3-3-.6-1 1.4 4.6 2.4L9 21.6l1.4-1L9.8 17l3-3 3 6z' },
  lifestyle: { label: 'Lifestyle', color: '#BE185D', icon: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z' },
  moda: { label: 'Moda', color: '#DB2777', icon: 'M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5h3V19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9.2h3l.6-3.5a2 2 0 0 0-1.3-2.2z' },
  animales: { label: 'Animales', color: '#15803D', icon: 'M11 4a2 2 0 1 0 0 .01M18 8a2 2 0 1 0 0 .01M20 16a2 2 0 1 0 0 .01M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.8 1Q6.5 17.5 4.5 16.8A3.5 3.5 0 0 1 5.5 10z' },
  negocios: { label: 'Negocios', color: '#334155', icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01' },
}
const catOf = (c?: string) => CAT_META[(c || '').toLowerCase()] || { label: c || 'General', color: '#5A625F', icon: 'm12 3-1.9 5.8-5.8 1.9 5.8 1.9L12 21l1.9-5.8 5.8-1.9-5.8-1.9z' }

const INTENTS = [
  { key: 'rapido', label: 'Tengo 5 minutos', mins: 5, icon: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z' },
  { key: 'desafio', label: 'Que me desafíe', mins: 12, icon: 'M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z' },
  { key: 'liviano', label: 'Algo liviano', mins: 7, icon: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z' },
  { key: 'errores', label: 'Mis errores', mins: 12, icon: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' },
  { key: 'rutina', label: 'Salir de la rutina', mins: 7, icon: 'M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7' },
  { key: 'laburo', label: 'Hablar de laburo', mins: 12, icon: 'M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2' },
]
const LIVIANAS = ['lifestyle', 'comida', 'viajes', 'musica', 'peliculas', 'animales', 'moda']
const LABURO = ['tech', 'negocios', 'ciencia']

function hace(iso?: string | null): string | null {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d <= 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 7) return `hace ${d} días`
  if (d < 30) return `hace ${Math.floor(d / 7)} sem`
  return `hace ${Math.floor(d / 30)} meses`
}

export function PracticarChooser(p: Props) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('todos')
  const [shortcut, setShortcut] = useState<string | null>(null)
  const [sort, setSort] = useState<'sugerido' | 'mas' | 'menos' | 'az' | 'nuevos'>('sugerido')
  const [selected, setSelected] = useState<number | null>(null)
  const [mins, setMins] = useState(p.minutes)
  const [intent, setIntent] = useState<string | null>(null)
  const [copilotQ, setCopilotQ] = useState('')
  const [thinking, setThinking] = useState(false)
  const [picks, setPicks] = useState<{ t: ChooserTopic; why: string }[] | null>(null)
  const [freeText, setFreeText] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const all = useMemo(() => [...p.interests, ...p.others], [p.interests, p.others])
  const st = (id: number) => p.stats[id] || { charlas: 0, lastAt: null }

  // Atajos de teclado del spec: "/" enfoca el buscador · Esc limpia la selección
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const cats = useMemo(() => {
    const m = new Map<string, number>()
    all.forEach((t) => m.set((t.category || '').toLowerCase(), (m.get((t.category || '').toLowerCase()) || 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [all])

  const shortcutCounts = useMemo(() => ({
    rescate: p.rescue?.topicId ? all.filter((t) => t.id === p.rescue!.topicId).length : 0,
    nuevos: all.filter((t) => st(t.id).charlas === 0).length,
    mas: all.filter((t) => st(t.id).charlas >= 3).length,
    dormidos: all.filter((t) => { const s = st(t.id); return s.charlas > 0 && s.lastAt && (Date.now() - new Date(s.lastAt).getTime()) > 14 * 86400000 }).length,
  }), [all, p.rescue, p.stats]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    let out = all
    if (q.trim()) {
      const needle = q.trim().toLowerCase()
      out = out.filter((t) => t.title.toLowerCase().includes(needle) || (t.category || '').toLowerCase().includes(needle))
    }
    if (cat !== 'todos') out = out.filter((t) => (t.category || '').toLowerCase() === cat)
    if (shortcut === 'rescate') out = out.filter((t) => t.id === p.rescue?.topicId)
    if (shortcut === 'nuevos') out = out.filter((t) => st(t.id).charlas === 0)
    if (shortcut === 'mas') out = out.filter((t) => st(t.id).charlas >= 3)
    if (shortcut === 'dormidos') out = out.filter((t) => { const s = st(t.id); return s.charlas > 0 && s.lastAt && (Date.now() - new Date(s.lastAt).getTime()) > 14 * 86400000 })
    const arr = [...out]
    if (sort === 'mas') arr.sort((a, b) => st(b.id).charlas - st(a.id).charlas)
    if (sort === 'menos') arr.sort((a, b) => st(a.id).charlas - st(b.id).charlas)
    if (sort === 'az') arr.sort((a, b) => a.title.localeCompare(b.title))
    if (sort === 'nuevos') arr.sort((a, b) => (st(a.id).lastAt ? 1 : 0) - (st(b.id).lastAt ? 1 : 0))
    return arr
  }, [all, q, cat, shortcut, sort, p.rescue, p.stats]) // eslint-disable-line react-hooks/exhaustive-deps

  const recomendado = p.interests[0] || all[0]
  const sel = selected != null ? all.find((t) => t.id === selected) : null

  /* Copiloto: heurística LOCAL sobre datos reales (hasta que exista un
   * recomendador en el backend). Cada pick viaja con su motivo. */
  const correr = (intentKey: string | null, texto: string) => {
    setThinking(true)
    const t = texto.trim().toLowerCase()
    window.setTimeout(() => {
      let pool: { t: ChooserTopic; why: string }[] = []
      if (t) {
        pool = all.filter((x) => x.title.toLowerCase().includes(t) || (x.category || '').toLowerCase().includes(t))
          .map((x) => ({ t: x, why: `coincide con "${texto.trim()}"` }))
      }
      if (intentKey === 'errores' && p.rescue) {
        const r = all.find((x) => x.id === p.rescue?.topicId)
        if (r) pool.unshift({ t: r, why: `tenés misión de rescate abierta: ${p.rescue.label}` })
      }
      if (intentKey === 'rapido') {
        pool.push(...[...all].sort((a, b) => st(b.id).charlas - st(a.id).charlas).slice(0, 4)
          .map((x) => ({ t: x, why: `ya lo hablaste ${st(x.id).charlas} ${st(x.id).charlas === 1 ? 'vez' : 'veces'}: arrancás sin calentar` })))
      }
      if (intentKey === 'desafio') {
        pool.push(...all.filter((x) => st(x.id).charlas === 0).slice(0, 4)
          .map((x) => ({ t: x, why: 'no lo tocaste todavía: vocabulario nuevo desde el minuto uno' })))
      }
      if (intentKey === 'liviano') {
        pool.push(...all.filter((x) => LIVIANAS.includes((x.category || '').toLowerCase())).slice(0, 4)
          .map((x) => ({ t: x, why: `${catOf(x.category).label.toLowerCase()}: se charla sola, sin esfuerzo` })))
      }
      if (intentKey === 'rutina') {
        pool.push(...all.filter((x) => { const s = st(x.id); return s.charlas > 0 && s.lastAt && (Date.now() - new Date(s.lastAt).getTime()) > 14 * 86400000 }).slice(0, 4)
          .map((x) => ({ t: x, why: `no lo hablás desde ${hace(st(x.id).lastAt)}` })))
      }
      if (intentKey === 'laburo') {
        pool.push(...all.filter((x) => LABURO.includes((x.category || '').toLowerCase())).slice(0, 4)
          .map((x) => ({ t: x, why: 'vocabulario que usás en el laburo' })))
      }
      if (pool.length === 0) {
        pool = all.slice(0, 3).map((x) => ({ t: x, why: 'está en tus temas' }))
      }
      const seen = new Set<number>()
      const three = pool.filter((x) => !seen.has(x.t.id) && seen.add(x.t.id)).slice(0, 3)
      const im = INTENTS.find((i) => i.key === intentKey)
      if (im) { setMins(im.mins); p.onMinutes(im.mins) }
      setPicks(three)
      setThinking(false)
    }, 600)
  }

  return (
    <div className="pc-page" style={{ paddingBottom: sel ? 210 : 40 }}>
      <style>{PC_CSS}</style>

      <header className="pc-head">
        <h1>practicá</h1>
        <p>Elegí de qué hablás hoy, {p.userName}. Tenés {all.length} temas propios · nivel {p.cefr} · {p.tutorName} te espera.</p>
      </header>

      {/* 1 — ARRANQUE RÁPIDO */}
      <div className="pc-quick">
        {recomendado && (
          <button className="pc-q pc-q-rec" onClick={() => setSelected(recomendado.id)}>
            <span className="lbl">Recomendado para hoy</span>
            <b>{recomendado.title}</b>
            <span className="why">
              {st(recomendado.id).charlas > 0
                ? `Lo hablaste ${st(recomendado.id).charlas} ${st(recomendado.id).charlas === 1 ? 'vez' : 'veces'} · última ${hace(st(recomendado.id).lastAt)}`
                : 'Está primero en tus temas y todavía no lo hablaste'}
            </span>
            <span className="meta">{mins} min · {p.cefr} · {p.tutorName}</span>
          </button>
        )}
        <button className="pc-q pc-q-sorp" onClick={() => { const r = all[Math.floor(Math.random() * all.length)]; if (r) setSelected(r.id) }}>
          <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg></span>
          <b>Sorprendeme</b>
          <span className="why">Uno al azar de tus {all.length} temas</span>
        </button>
        {p.enableFreeTopic && (
          <div className="pc-q pc-q-free">
            <b>Tema libre</b>
            <span className="why">Escribí de qué querés hablar</span>
            <div className="row">
              <input value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="ej: mi viaje a Japón"
                onKeyDown={(e) => { if (e.key === 'Enter' && freeText.trim()) p.onFreeTopic(freeText.trim()) }} />
              <button aria-label="Empezar tema libre" onClick={() => p.onFreeTopic(freeText.trim() || undefined)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2 — COPILOTO */}
      <section className="pc-copilot">
        <div className="pc-cop-head">
          <span className="av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9L12 21l1.9-5.8 5.8-1.9-5.8-1.9z"/></svg></span>
          <div>
            <h3>¿No sabés qué elegir?</h3>
            <span>Contame cómo venís hoy y te propongo tres, con el porqué de cada uno.</span>
          </div>
        </div>
        <div className="pc-cop-input">
          <input value={copilotQ} onChange={(e) => setCopilotQ(e.target.value)} placeholder="ej: vengo cansado pero quiero soltarme un poco"
            onKeyDown={(e) => { if (e.key === 'Enter') correr(intent, copilotQ) }} />
          <button onClick={() => correr(intent, copilotQ)}>Recomendame</button>
        </div>
        <div className="pc-intents">
          {INTENTS.map((i) => (
            <button key={i.key} className={intent === i.key ? 'on' : ''}
              onClick={() => { const next = intent === i.key ? null : i.key; setIntent(next); correr(next, copilotQ) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={i.icon}/></svg>
              {i.label}
            </button>
          ))}
        </div>
        {thinking && <div className="pc-thinking">Mirando tus temas y tus últimas charlas…</div>}
        {!thinking && picks && (
          <>
            <div className="pc-cop-sum">
              {intent ? <>Leí <b>{INTENTS.find((i) => i.key === intent)?.label.toLowerCase()}</b>. Para eso te propongo <b>{mins} minutos</b> y estos tres:</> : <>Te propongo estos tres:</>}
            </div>
            <div className="pc-picks">
              {picks.map((pk, i) => (
                <button key={pk.t.id} className="pc-pick" onClick={() => setSelected(pk.t.id)}>
                  <span className="n">{i + 1}</span>
                  <b>{pk.t.title}</b>
                  <span className="why">{pk.why}</span>
                  <span className="go">elegir →</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 3 — CONTROLES */}
      <section className="pc-controls">
        <div className="row">
          <div className="pc-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar entre tus temas" />
            <span className="kbd">/</span>
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="sugerido">Orden sugerido</option>
            <option value="mas">Los que más hablo</option>
            <option value="menos">Los que menos hablo</option>
            <option value="nuevos">Sin empezar primero</option>
            <option value="az">A → Z</option>
          </select>
        </div>
        <div className="row pc-shortcuts">
          <span className="lbl">Atajos</span>
          {p.rescue && shortcutCounts.rescate > 0 && (
            <button className={shortcut === 'rescate' ? 'on' : ''} onClick={() => setShortcut(shortcut === 'rescate' ? null : 'rescate')}>Con misión de rescate <b>{shortcutCounts.rescate}</b></button>
          )}
          <button className={shortcut === 'nuevos' ? 'on' : ''} onClick={() => setShortcut(shortcut === 'nuevos' ? null : 'nuevos')}>Sin empezar <b>{shortcutCounts.nuevos}</b></button>
          <button className={shortcut === 'mas' ? 'on' : ''} onClick={() => setShortcut(shortcut === 'mas' ? null : 'mas')}>Los que más hablo <b>{shortcutCounts.mas}</b></button>
          <button className={shortcut === 'dormidos' ? 'on' : ''} onClick={() => setShortcut(shortcut === 'dormidos' ? null : 'dormidos')}>Dormidos hace rato <b>{shortcutCounts.dormidos}</b></button>
        </div>
        <div className="row pc-cats">
          <button className={cat === 'todos' ? 'on' : ''} onClick={() => setCat('todos')}>Todos <b>{all.length}</b></button>
          {cats.map(([k, n]) => {
            const m = catOf(k)
            return (
              <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(cat === k ? 'todos' : k)} style={cat === k ? undefined : { color: m.color }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon}/></svg>
                {m.label} <b>{n}</b>
              </button>
            )
          })}
        </div>
      </section>

      {/* 4 — GRILLA */}
      <div className="pc-grid">
        {list.map((t, i) => {
          const m = catOf(t.category)
          const s = st(t.id)
          const isSel = selected === t.id
          const hasRescue = p.rescue?.topicId === t.id
          return (
            <button key={t.id} className={`pc-card${isSel ? ' sel' : ''}`} onClick={() => setSelected(isSel ? null : t.id)}>
              <span className="cap" style={{ background: `linear-gradient(150deg, ${m.color}, ${m.color}bb)` }}>
                <svg className="fig" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.2"><path d={m.icon}/></svg>
                {i < 3 && sort !== 'az' && <span className="rank">#{i + 1}</span>}
                <span className="ic" style={{ color: m.color }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon}/></svg>
                </span>
              </span>
              <span className="cat" style={{ color: m.color }}>{m.label}</span>
              <b className="t">{t.title}{isSel && <span className="chosen"> · elegido</span>}</b>
              <span className="meta">
                {s.charlas > 0 ? `${s.charlas} ${s.charlas === 1 ? 'charla' : 'charlas'}` : 'sin empezar'}
                {s.lastAt ? ` · ${hace(s.lastAt)}` : ''}
              </span>
              {hasRescue && (
                <span className="resc">
                  <i /><span>misión de rescate: {p.rescue!.label}</span>
                </span>
              )}
            </button>
          )
        })}
        {list.length === 0 && <div className="pc-empty">No hay temas con ese filtro. Probá con otra categoría o limpiá la búsqueda.</div>}
      </div>

      {/* 5 — DOCK DE SELECCIÓN */}
      {sel && (
        <div className="pc-dock">
          <div className="inner">
            <span className="av">{p.tutorName[0]?.toUpperCase() || 'H'}</span>
            <div className="what">
              <span className="lbl">Tópico elegido</span>
              <b>{sel.title}</b>
              <span className="meta">{p.tutorName} · {p.cefr} · {mins} min · {catOf(sel.category).label}</span>
            </div>
            <div className="ctrl">
              <span className="lbl">Duración</span>
              <div className="segs">
                {[5, 7, 12].map((n) => (
                  <button key={n} className={mins === n ? 'on' : ''} onClick={() => { setMins(n); p.onMinutes(n) }}>{n}′</button>
                ))}
              </div>
            </div>
            {p.templates.length > 1 && (
              <div className="ctrl">
                <span className="lbl">Tutor</span>
                <select value={p.activeTemplateId ?? ''} onChange={(e) => p.onTutor(Number(e.target.value))}>
                  {p.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <button className="go" onClick={() => p.onPick(sel.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
              Empezar charla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const PC_CSS = `
.pc-page{padding:22px 28px 40px;max-width:1180px;margin:0 auto}
.pc-head h1{font-family:'Sora','Inter',sans-serif;font-size:26px;font-weight:700;letter-spacing:-.02em;margin:0}
.pc-head p{font-size:13.5px;color:var(--fg-3);margin:6px 0 18px}
/* arranque rápido */
.pc-quick{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:16px}
.pc-q{text-align:left;border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:4px;border:1px solid var(--border-1);background:var(--surface);cursor:pointer;font:inherit;color:var(--fg-1)}
.pc-q b{font-family:'Sora','Inter',sans-serif;font-size:18px;font-weight:700}
.pc-q .why{font-size:13px;color:var(--fg-3);line-height:1.45}
.pc-q .meta{font-size:11.5px;color:var(--fg-4);margin-top:4px}
.pc-q-rec{background:linear-gradient(160deg,#054A3A,#062B25);border:0;color:#fff}
.pc-q-rec .lbl{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7CE7BD}
.pc-q-rec .why{color:rgba(255,255,255,.72)}.pc-q-rec .meta{color:rgba(255,255,255,.5)}
.pc-q-sorp{background:#FFFBEB;border-color:rgba(255,184,0,.35)}
[data-theme="dark"] .pc-q-sorp{background:rgba(255,184,0,.09)}
.pc-q-sorp .ic{width:30px;height:30px;color:#B45309}.pc-q-sorp .ic svg{width:24px;height:24px}
.pc-q-free .row{display:flex;gap:8px;margin-top:8px}
.pc-q-free input{flex:1;height:44px;border:1px solid var(--border-2);border-radius:12px;padding:0 12px;font:inherit;font-size:13.5px;background:var(--bg-1);color:var(--fg-1)}
.pc-q-free button{width:36px;height:36px;align-self:center;border-radius:999px;border:0;background:var(--primary);color:#fff;cursor:pointer;display:grid;place-items:center}
.pc-q-free button svg{width:17px;height:17px}
/* copiloto */
.pc-copilot{border:1px solid rgba(0,179,126,.25);border-radius:16px;padding:18px;margin-bottom:16px;background:linear-gradient(160deg,rgba(0,179,126,.10),transparent)}
.pc-cop-head{display:flex;gap:10px;align-items:flex-start;margin-bottom:12px}
.pc-cop-head .av{width:28px;height:28px;border-radius:999px;background:var(--primary);color:#fff;display:grid;place-items:center;flex-shrink:0}
.pc-cop-head .av svg{width:16px;height:16px}
.pc-cop-head h3{font-family:'Sora','Inter',sans-serif;font-size:15px;font-weight:700;margin:0}
.pc-cop-head span{font-size:12.5px;color:var(--fg-3)}
.pc-cop-input{display:flex;gap:8px;margin-bottom:10px}
.pc-cop-input input{flex:1;height:46px;border-radius:12px;border:1px solid var(--border-2);background:var(--surface);padding:0 14px;font:inherit;font-size:13.5px;color:var(--fg-1)}
.pc-cop-input button{border:0;border-radius:12px;background:var(--fg-1);color:#fff;font:inherit;font-size:13px;font-weight:700;padding:0 18px;cursor:pointer}
.pc-intents{display:flex;flex-wrap:wrap;gap:7px}
.pc-intents button{height:32px;border-radius:999px;border:1px solid var(--border-2);background:var(--surface);color:var(--fg-2);font:inherit;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;cursor:pointer}
.pc-intents button svg{width:13px;height:13px}
.pc-intents button.on{background:var(--primary);border-color:var(--primary);color:#fff}
.pc-thinking{margin-top:12px;font-size:12.5px;color:var(--fg-3);font-style:italic}
.pc-cop-sum{margin:14px 0 8px;font-size:13.5px;color:var(--fg-2)}
.pc-picks{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
.pc-pick{position:relative;text-align:left;background:var(--surface);border:1px solid var(--border-1);border-radius:14px;padding:12px 14px 30px;cursor:pointer;font:inherit;color:var(--fg-1)}
.pc-pick:hover{border-color:var(--primary)}
.pc-pick .n{display:grid;place-items:center;width:22px;height:22px;border-radius:999px;background:var(--primary);color:#fff;font-size:11px;font-weight:800;margin-bottom:6px}
.pc-pick b{display:block;font-size:13.5px;font-weight:700}
.pc-pick .why{display:block;font-size:12px;color:var(--fg-3);margin-top:3px;line-height:1.45}
.pc-pick .go{position:absolute;right:12px;bottom:9px;font-size:11.5px;font-weight:700;color:var(--primary)}
/* controles */
.pc-controls{background:var(--surface);border:1px solid var(--border-1);border-radius:14px;padding:12px;margin-bottom:16px;display:flex;flex-direction:column;gap:10px}
.pc-controls .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pc-search{position:relative;flex:1;min-width:220px}
.pc-search svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--fg-4)}
.pc-search input{width:100%;height:40px;border-radius:11px;border:1px solid var(--border-2);background:var(--bg-1);padding:0 34px 0 34px;font:inherit;font-size:13px;color:var(--fg-1)}
.pc-search .kbd{position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--fg-4);border:1px solid var(--border-2);border-radius:6px;padding:1px 6px}
.pc-controls select{height:40px;border-radius:11px;border:1px solid var(--border-2);background:var(--surface);font:inherit;font-size:13px;color:var(--fg-1);padding:0 10px}
.pc-shortcuts .lbl,.pc-cats .lbl{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-4)}
.pc-shortcuts button,.pc-cats button{height:32px;border-radius:999px;border:1px solid var(--border-1);background:var(--bg-2);color:var(--fg-2);font:inherit;font-size:12.5px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;cursor:pointer}
.pc-shortcuts button b,.pc-cats button b{font-size:11px;opacity:.65}
.pc-shortcuts button.on,.pc-cats button.on{background:var(--fg-1);border-color:var(--fg-1);color:#fff}
.pc-cats{overflow-x:auto;flex-wrap:nowrap;padding-bottom:2px}
.pc-cats button{flex-shrink:0}
.pc-cats button svg{width:13px;height:13px}
/* grilla */
.pc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.pc-card{position:relative;text-align:left;background:var(--surface);border:1px solid var(--border-1);border-radius:16px;overflow:hidden;cursor:pointer;font:inherit;color:var(--fg-1);padding-bottom:14px;transition:border-color .15s,transform .15s}
.pc-card:hover{transform:translateY(-2px)}
.pc-card.sel{border:2px solid var(--primary)}
.pc-card .cap{position:relative;display:block;height:120px;margin:-1px -1px 0}
.pc-card .cap .fig{position:absolute;right:-14px;bottom:-18px;width:120px;height:120px}
.pc-card .rank{position:absolute;top:10px;right:10px;background:rgba(0,0,0,.28);color:#fff;border-radius:999px;font-size:10.5px;font-weight:800;padding:2px 8px}
.pc-card .ic{position:absolute;left:14px;bottom:-18px;width:36px;height:36px;border-radius:11px;background:var(--surface);display:grid;place-items:center;box-shadow:var(--shadow-card)}
.pc-card .ic svg{width:19px;height:19px}
.pc-card .cat{display:block;margin:26px 14px 0;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.pc-card .t{display:block;margin:4px 14px 0;font-family:'Sora','Inter',sans-serif;font-size:15px;font-weight:700;line-height:1.3}
.pc-card .chosen{color:var(--primary);font-size:12px}
.pc-card .meta{display:block;margin:6px 14px 0;font-size:12px;color:var(--fg-3)}
.pc-card .resc{display:flex;align-items:center;gap:6px;margin:8px 14px 0;font-size:11.5px;color:#8A5A00}
.pc-card .resc i{width:7px;height:7px;border-radius:999px;background:var(--accent);flex-shrink:0}
[data-theme="dark"] .pc-card .resc{color:var(--accent)}
.pc-empty{grid-column:1/-1;padding:28px;text-align:center;color:var(--fg-3);font-size:13.5px}
/* dock */
.pc-dock{position:fixed;left:var(--sidebar-w,240px);right:0;bottom:0;z-index:60;padding:0 18px 18px;pointer-events:none}
.pc-dock .inner{pointer-events:auto;max-width:1140px;margin:0 auto;background:linear-gradient(160deg,#054A3A,#062B25);color:#fff;border-radius:16px;box-shadow:var(--shadow-float);padding:14px 18px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.pc-dock .av{width:40px;height:40px;border-radius:999px;background:var(--primary);display:grid;place-items:center;font-weight:800;flex-shrink:0}
.pc-dock .what{min-width:180px;flex:1}
.pc-dock .lbl{display:block;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7CE7BD}
.pc-dock .what b{display:block;font-family:'Sora','Inter',sans-serif;font-size:16px;font-weight:700;margin-top:2px}
.pc-dock .meta{font-size:11.5px;color:rgba(255,255,255,.6)}
.pc-dock .ctrl .lbl{margin-bottom:4px;color:rgba(255,255,255,.5)}
.pc-dock .segs{display:flex;gap:4px}
.pc-dock .segs button{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);border-radius:9px;font:inherit;font-size:12.5px;font-weight:700;padding:5px 10px;cursor:pointer}
.pc-dock .segs button.on{background:#7CE7BD;color:#04231D;border-color:#7CE7BD}
.pc-dock select{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:9px;font:inherit;font-size:12.5px;padding:6px 8px}
.pc-dock .go{margin-left:auto;display:inline-flex;align-items:center;gap:8px;background:var(--primary);color:#fff;border:0;border-radius:12px;font:inherit;font-size:14px;font-weight:700;padding:12px 20px;cursor:pointer}
.pc-dock .go svg{width:18px;height:18px}
@media (max-width:900px){
  .pc-page{padding:16px 14px 30px}
  .pc-dock{left:0;padding:0 10px 10px}
  .pc-dock .go{margin-left:0;flex:1;justify-content:center}
}
`

/**
 * PracticarGalaxy — pantalla de elección de tópico.
 *
 * Implementa Practicar.html del design handoff v2
 * (docs/design-sync/hablah-ds/v2/Practicar.html):
 *
 *   greet → quick start (recomendado / sorprendeme / tema libre)
 *         → copiloto de elección → controles (buscar, orden, atajos, categorías)
 *         → grilla de tópicos → barra de selección fija
 *
 * Diferencias deliberadas contra el prototipo, por datos reales:
 *   - Las cards usan la FOTO del tópico (topics.image_url, bajada de Pexels).
 *     El prototipo usaba un degradé por categoría; queda de fallback para los
 *     tópicos sin foto.
 *   - "Duración" y "Ritmo" de la barra son los estados que el prototipo dibuja;
 *     hoy sólo la duración viaja al motor.
 */
import { useMemo, useState } from 'react'

interface InterestTopic {
  id: number
  title: string
  category: string
  imageUrl?: string | null
  /** Charlas hechas en el tópico (TopicProgress.sessions_count). */
  sessions?: number
  /** Última vez que se tocó el tópico (TopicProgress.updated_at). */
  lastAt?: string | null
}

interface Props {
  userName: string
  interests: InterestTopic[]
  recommended?: InterestTopic[]
  /** Si false, el botón "Tema libre" no aparece (gate por feature flag). */
  enableFreeTopic?: boolean
  /** Nivel CEFR del alumno, para la meta de la barra de selección. */
  level?: string
  /** Nombre del tutor activo. */
  tutorName?: string
  /** Minutos sugeridos por defecto. */
  defaultMinutes?: number
  onPick: (topicId: number) => void
  onSurprise: () => void
  onFreeTopic: (text: string) => void
}

/* ─────────── categorías: color + ícono ─────────── */
const CAT_META: Record<string, { color: string; bg: string; icon: JSX.Element }> = {
  tech: { color: '#4338CA', bg: '#EEF2FF', icon: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></> },
  ciencia: { color: '#0E7490', bg: '#CFFAFE', icon: <><path d="M9 2v6l-5 9a3 3 0 0 0 3 4h10a3 3 0 0 0 3-4l-5-9V2" /><path d="M9 2h6M7 15h10" /></> },
  arte: { color: '#7C3AED', bg: '#F3E8FF', icon: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></> },
  musica: { color: '#C026D3', bg: '#FAE8FF', icon: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></> },
  lifestyle: { color: '#BE185D', bg: '#FCE7F3', icon: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></> },
  deportes: { color: '#C2410C', bg: '#FFEDD5', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18M3 12h18" /></> },
  fitness: { color: '#4D7C0F', bg: '#ECFCCB', icon: <><path d="M6 3v18M18 3v18M3 8h18M3 16h18" /></> },
  viajes: { color: '#1D4ED8', bg: '#DBEAFE', icon: <><path d="M17.8 19.2 16 11l5-5a2 2 0 0 0-2.8-2.8l-5 5-8.2-1.8L3 7.8l6 3-3 3-3-.6-1 1.4 4.6 2.4L9 21.6l1.4-1L9.8 17l3-3 3 6z" /></> },
  gastronomia: { color: '#BE123C', bg: '#FFE4E6', icon: <><path d="M17 8h1a4 4 0 0 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" /></> },
  comida: { color: '#BE123C', bg: '#FFE4E6', icon: <><path d="M17 8h1a4 4 0 0 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" /></> },
  negocios: { color: '#334155', bg: '#E7EAEC', icon: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></> },
  entretenimiento: { color: '#DB2777', bg: '#FCE7F3', icon: <><rect x="2" y="2" width="20" height="20" rx="2" /><path d="M7 2v20M17 2v20M2 12h20" /></> },
  peliculas: { color: '#DB2777', bg: '#FCE7F3', icon: <><rect x="2" y="2" width="20" height="20" rx="2" /><path d="M7 2v20M17 2v20M2 12h20" /></> },
  videojuegos: { color: '#7C3AED', bg: '#F3E8FF', icon: <><rect x="2" y="6" width="20" height="12" rx="3" /><path d="M6 12h4M8 10v4M15 12h.01M18 10h.01" /></> },
  diseno: { color: '#334155', bg: '#E7EAEC', icon: <><path d="M3 21h18M5 21V7l7-4 7 4v14" /><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6" /></> },
}
const DEFAULT_CAT = { color: '#008F63', bg: '#E6F7F0', icon: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></> }
const catMeta = (c: string) => CAT_META[(c || '').toLowerCase()] || DEFAULT_CAT

function CatIcon({ cat }: { cat: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {catMeta(cat).icon}
    </svg>
  )
}

/* ─────────── orden ─────────── */
const SORTS = [
  { k: 'pref', l: 'Tu preferencia', f: (a: Card, b: Card) => a.rank - b.rank },
  { k: 'menos', l: 'Menos practicados', f: (a: Card, b: Card) => a.sessions - b.sessions || a.rank - b.rank },
  { k: 'frios', l: 'Nunca tocados primero', f: (a: Card, b: Card) => Number(b.cold) - Number(a.cold) || a.rank - b.rank },
  { k: 'mas', l: 'Más practicados', f: (a: Card, b: Card) => b.sessions - a.sessions || a.rank - b.rank },
  { k: 'az', l: 'A–Z', f: (a: Card, b: Card) => a.title.localeCompare(b.title, 'es') },
]

/* ─────────── atajos ─────────── */
const QUICK_FILTERS = [
  { k: 'nuevos', l: 'Recién sumados', icon: <path d="M12 3v18M3 12h18" />, t: (c: Card) => c.cold },
  { k: 'hot', l: 'Los que más charlo', icon: <path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-4 4-8 4-8z" />, t: (c: Card) => c.sessions >= 4 },
  { k: 'dormidos', l: 'Dormidos hace rato', icon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />, t: (c: Card) => c.days !== null && c.days >= 7 },
]

/* ─────────── copiloto ─────────── */
const MOODS = [
  { k: 'corto', l: 'Tengo 5 minutos', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
  { k: 'duro', l: 'Que me desafíe', icon: <path d="M13 2 4 14h7l-1 8 9-12h-7z" /> },
  { k: 'liviano', l: 'Algo liviano', icon: <><path d="M18 10h-1.3A5 5 0 1 0 7 8.6" /><path d="M2 14h14a4 4 0 1 1 0 8H8" /></> },
  { k: 'nuevo', l: 'Salir de la rutina', icon: <><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /><circle cx="12" cy="12" r="3" /></> },
  { k: 'laburo', l: 'Hablar de laburo', icon: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></> },
]

type MoodKey = 'corto' | 'duro' | 'liviano' | 'nuevo' | 'laburo'

const MOOD_RULES: Record<MoodKey, { score: (c: Card) => number; why: (c: Card) => string; min: number }> = {
  corto: {
    score: (c) => (c.sessions >= 3 ? 2 : 0) + (c.cold ? -1 : 1),
    why: (c) => c.sessions > 0
      ? `ya lo tocaste ${c.sessions} ${c.sessions === 1 ? 'vez' : 'veces'}: arranca rápido y no necesita contexto`
      : 'tema directo, no necesita contexto previo',
    min: 5,
  },
  duro: {
    score: (c) => (['ciencia', 'tech', 'negocios'].includes((c.cat || '').toLowerCase()) ? 2 : 0) + (c.sessions >= 2 ? 1 : 0),
    why: (c) => `${(c.cat || 'el tema').toLowerCase()} te obliga a explicar, no sólo a opinar`,
    min: 12,
  },
  liviano: {
    score: (c) => (['lifestyle', 'gastronomia', 'comida', 'deportes', 'entretenimiento'].includes((c.cat || '').toLowerCase()) ? 3 : 0) + (c.sessions > 0 ? 1 : 0),
    why: () => 'tema cotidiano: se charla solo, sin vocabulario técnico',
    min: 7,
  },
  nuevo: {
    score: (c) => (c.cold ? 4 : 0) + (c.sessions === 0 ? 1 : 0),
    why: () => 'nunca lo tocaste: vocabulario nuevo garantizado',
    min: 7,
  },
  laburo: {
    score: (c) => (['tech', 'negocios', 'diseno'].includes((c.cat || '').toLowerCase()) ? 3 : 0) + (c.sessions >= 2 ? 1 : 0),
    why: (c) => `${(c.cat || 'el tema').toLowerCase()} es el léxico que usás en el trabajo`,
    min: 12,
  },
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function moodFromText(t: string): MoodKey {
  const s = norm(t)
  if (/5|cinco|poco tiempo|apurad|corto|rapido/.test(s)) return 'corto'
  if (/desaf|dificil|exig|profund|pensar|duro/.test(s)) return 'duro'
  if (/liviano|facil|relax|tranqui|cansad/.test(s)) return 'liviano'
  if (/nuevo|distinto|rutina|aburr|cambiar/.test(s)) return 'nuevo'
  if (/labur|trabaj|oficina|reuni|entrevist/.test(s)) return 'laburo'
  return 'liviano'
}

const OPENERS = [
  (t: string) => `El profe abre: "Okay — ${t.toLowerCase()}. Convenceme de que importa."`,
  (t: string) => `El profe abre: "${t}. ¿Qué te enganchó de esto?"`,
  (t: string) => `El profe abre: "Confesión: no entiendo ${t.toLowerCase()}. Explicámelo vos."`,
]

interface Card {
  id: number
  title: string
  cat: string
  imageUrl?: string | null
  rank: number
  sessions: number
  /** Días desde la última charla del tópico. null = nunca. */
  days: number | null
  cold: boolean
  /** true si vino del panel de sugeridos y no de los intereses del alumno. */
  suggested: boolean
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 0
  return Math.floor(ms / 86_400_000)
}

function agoLabel(days: number | null): string {
  if (days === null) return 'nunca'
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  if (days < 14) return 'hace 1 semana'
  if (days < 31) return `hace ${Math.floor(days / 7)} semanas`
  if (days < 60) return 'hace 1 mes'
  return `hace ${Math.floor(days / 30)} meses`
}

const SELECT_ANIM_MS = 700

export function PracticarGalaxy({
  userName, interests, recommended = [], enableFreeTopic = false,
  level = '', tutorName = '', defaultMinutes = 7,
  onPick, onSurprise, onFreeTopic,
}: Props) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [sort, setSort] = useState(0)
  const [quickF, setQuickF] = useState<string | null>(null)
  const [chipsOpen, setChipsOpen] = useState(false)
  const [freeText, setFreeText] = useState('')
  const [minutes, setMinutes] = useState(defaultMinutes)
  const [cadence, setCadence] = useState('Sobremesa')
  const [launching, setLaunching] = useState(false)
  const [cpText, setCpText] = useState('')
  const [cpPicks, setCpPicks] = useState<{ mood: MoodKey; picks: Card[] } | null>(null)
  const [cpThinking, setCpThinking] = useState(false)

  /* ── cards: intereses primero (con su rank), después sugeridos ── */
  const cards: Card[] = useMemo(() => {
    const mk = (t: InterestTopic, i: number, suggested: boolean): Card => {
      const days = daysSince(t.lastAt)
      const sessions = t.sessions ?? 0
      return {
        id: t.id, title: t.title, cat: t.category, imageUrl: t.imageUrl,
        rank: suggested ? 900 + i : i + 1,
        sessions, days,
        cold: sessions === 0,
        suggested,
      }
    }
    return [
      ...interests.map((t, i) => mk(t, i, false)),
      ...recommended.map((t, i) => mk(t, i, true)),
    ]
  }, [interests, recommended])

  const [selectedId, setSelectedId] = useState<number | null>(() => cards[0]?.id ?? null)
  const selected = cards.find((c) => c.id === selectedId) || cards[0] || null

  /* ── categorías presentes, con su conteo ── */
  const categories = useMemo(() => {
    const m = new Map<string, number>()
    cards.forEach((c) => { const k = (c.cat || '').toLowerCase(); if (k) m.set(k, (m.get(k) || 0) + 1) })
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [cards])

  /* ── grilla filtrada + ordenada ── */
  const visible = useMemo(() => {
    const q = norm(query.trim())
    const qf = QUICK_FILTERS.find((f) => f.k === quickF)
    return cards
      .filter((c) => {
        if (qf && !qf.t(c)) return false
        if (cat && (c.cat || '').toLowerCase() !== cat) return false
        if (q && !norm(`${c.title} ${c.cat}`).includes(q)) return false
        return true
      })
      .sort(SORTS[sort].f)
  }, [cards, query, cat, quickF, sort])

  const launch = (topicId: number) => {
    if (launching) return
    setLaunching(true)
    setSelectedId(topicId)
    window.setTimeout(() => onPick(topicId), SELECT_ANIM_MS)
  }

  const recomendar = (mood: MoodKey, texto: string) => {
    setCpThinking(true)
    setCpPicks(null)
    const rule = MOOD_RULES[mood]
    window.setTimeout(() => {
      const picks = [...cards]
        .map((c) => ({ c, s: rule.score(c) + (c.rank <= 5 ? 1 : 0) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 3)
        .map((x) => x.c)
      setCpPicks({ mood, picks })
      setMinutes(rule.min)
      setCpThinking(false)
      void texto
    }, 620)
  }

  const openerFor = (c: Card) => OPENERS[c.title.length % OPENERS.length](c.title)

  return (
    <div className="practicar-page">
      {/* ═══ SALUDO ═══ */}
      <section className="pp-greet">
        <div className="pp-eyebrow">¿Listo, {userName}?</div>
        <h1 className="pp-title">¿De qué <em>charlamos</em> hoy?</h1>
        <p className="pp-sub">
          Elegí un tópico de tus intereses, dejá que te sorprendamos, o tirá un tema libre.
          La sesión arranca cuando tocás <b>empezar charla</b>.
        </p>
      </section>

      {/* ═══ QUICK START ═══ */}
      <section className="pp-quick">
        {selected && (
          <button className="pp-qc featured" onClick={() => launch(selected.id)}>
            <div className="pp-qe"><span className="pp-live-dot" /> Recomendado para hoy</div>
            <h3>{selected.title}</h3>
            <p>
              {selected.cold
                ? 'Todavía no lo tocaste. Buen momento para estrenarlo.'
                : `Lo charlaste ${selected.sessions} ${selected.sessions === 1 ? 'vez' : 'veces'} · ${agoLabel(selected.days)}.`}
            </p>
            <div className="pp-meta-row">
              <span>~{minutes} min</span>
              {level && <><span className="pp-dot-sep" /><span><b>{level}</b></span></>}
              {tutorName && <><span className="pp-dot-sep" /><span>{tutorName}</span></>}
            </div>
          </button>
        )}

        <button className="pp-qc surprise" onClick={onSurprise}>
          <div className="pp-qe"><span className="pp-die">?</span> Sorprendeme</div>
          <h3>Tópico al azar</h3>
          <p>Te tiro un tópico que casi no tocás. Buena forma de salir de la zona de confort.</p>
        </button>

        {enableFreeTopic ? (
          <div className="pp-qc free">
            <div className="pp-qe">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Tema libre
            </div>
            <h3>Decí de qué querés hablar</h3>
            <div className="pp-free-input">
              <input
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onFreeTopic(freeText) }}
                placeholder="ej. mi último viaje a Berlín…"
              />
              <button className="pp-send" type="button" onClick={() => onFreeTopic(freeText)} aria-label="Empezar con tema libre">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="pp-qc free" style={{ cursor: 'default' }}>
            <div className="pp-qe">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15v2M12 7v4" /><circle cx="12" cy="12" r="9" /></svg>
              Tema libre
            </div>
            <h3>Se desbloquea más adelante</h3>
            <p>Con algunas charlas más vas a poder tirar cualquier tema y el profe lo arma al vuelo.</p>
          </div>
        )}
      </section>

      {/* ═══ COPILOTO ═══ */}
      <div className="pp-copilot">
        <div className="pp-cp-head">
          <span className="pp-av">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /><circle cx="12" cy="12" r="3.2" /></svg>
          </span>
          <div>
            <h3>¿No sabés qué elegir? Contame cómo venís hoy</h3>
            <p className="pp-cp-sub">Te propongo tres tópicos con el motivo: mira cuánto los charlaste y hace cuánto no los tocás.</p>
          </div>
        </div>
        <div className="pp-cp-input">
          <input
            value={cpText}
            onChange={(e) => setCpText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') recomendar(moodFromText(cpText), cpText) }}
            placeholder="ej. tengo 10 minutos y quiero algo que me haga pensar"
          />
          <button type="button" onClick={() => recomendar(moodFromText(cpText), cpText)}>Recomendame</button>
        </div>
        <div className="pp-cp-moods">
          {MOODS.map((m) => (
            <button key={m.k} type="button" onClick={() => recomendar(m.k as MoodKey, '')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{m.icon}</svg>
              {m.l}
            </button>
          ))}
        </div>

        {(cpThinking || cpPicks) && (
          <div className="pp-cp-out">
            {cpThinking && (
              <div className="pp-cp-line">
                Pensando <span className="pp-cp-typing"><i /><i /><i /></span>
              </div>
            )}
            {cpPicks && (
              <>
                <div className="pp-cp-line">
                  {cpText.trim() ? <>Leí “{cpText.trim()}”. </> : null}
                  Para eso te propongo <b>{MOOD_RULES[cpPicks.mood].min} minutos</b> y estos tres:
                </div>
                <div className="pp-cp-picks">
                  {cpPicks.picks.map((c, i) => (
                    <button key={c.id} className="pp-cp-pick" type="button" onClick={() => { setSelectedId(c.id); setCpPicks(null) }}>
                      <span className="pp-n">{i + 1}</span>
                      <span>
                        <span className="pp-t">{c.title}</span>
                        <span className="pp-w">{MOOD_RULES[cpPicks.mood].why(c)}</span>
                      </span>
                      <span className="pp-go2">elegir →</span>
                    </button>
                  ))}
                </div>
                <div className="pp-cp-line" style={{ opacity: .75 }}>
                  Si ninguno te cierra, buscá abajo o tirá un tema libre.
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ CONTROLES ═══ */}
      <div className="pp-controls">
        <div className="pp-ctrl-row">
          <div className="pp-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setQuery('') }}
              placeholder="Buscar tópico, categoría…"
              aria-label="Buscar tópico"
            />
          </div>
          <span className="pp-ctrl-lbl">Orden</span>
          <select
            className="pp-fc"
            value={sort}
            onChange={(e) => setSort(Number(e.target.value))}
            aria-label="Orden de los tópicos"
          >
            {SORTS.map((s, i) => <option key={s.k} value={i}>{s.l}</option>)}
          </select>
        </div>

        <div className="pp-quick-f">
          <span className="pp-ctrl-lbl">Atajos</span>
          {QUICK_FILTERS.map((f) => {
            const n = cards.filter(f.t).length
            if (!n) return null
            return (
              <button
                key={f.k}
                className={`pp-qf${quickF === f.k ? ' on' : ''}`}
                type="button"
                onClick={() => setQuickF(quickF === f.k ? null : f.k)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                {f.l} <span style={{ opacity: .55 }}>{n}</span>
              </button>
            )
          })}
        </div>

        <div className={`pp-chips${chipsOpen ? ' expanded' : ''}`}>
          <button className={`pp-fc${cat === null ? ' active' : ''}`} type="button" onClick={() => setCat(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            Todos<span className="pp-n">{cards.length}</span>
          </button>
          {categories.map(([k, n]) => {
            const meta = catMeta(k)
            const on = cat === k
            return (
              <button
                key={k}
                className={`pp-fc${on ? ' active' : ''}`}
                type="button"
                onClick={() => setCat(on ? null : k)}
                style={on ? undefined : { color: meta.color }}
              >
                <CatIcon cat={k} />
                <span style={{ textTransform: 'capitalize' }}>{k}</span>
                <span className="pp-n">{n}</span>
              </button>
            )
          })}
          {categories.length > 5 && (
            <button className="pp-fc more" type="button" onClick={() => setChipsOpen((v) => !v)}>
              {chipsOpen ? 'menos' : 'todas'}
            </button>
          )}
        </div>
      </div>

      {/* ═══ GRILLA ═══ */}
      <div className="pp-section-head">
        <h2>Tus intereses</h2>
        <div className="pp-mut">
          {visible.length === cards.length ? `${cards.length} tópicos` : `${visible.length} de ${cards.length}`}
          {' · orden: '}{SORTS[sort].l.toLowerCase()}
        </div>
      </div>

      <div className="pp-grid">
        {visible.map((c) => {
          const meta = catMeta(c.cat)
          const isSel = selectedId === c.id
          return (
            <button
              key={c.id}
              className={`pp-tc${isSel ? ' active' : ''}`}
              type="button"
              onClick={() => setSelectedId(c.id)}
              onDoubleClick={() => launch(c.id)}
            >
              <div
                className="pp-tc-media"
                style={
                  c.imageUrl
                    ? { backgroundImage: `url(${c.imageUrl})` }
                    : { background: `linear-gradient(135deg, ${meta.bg}, ${meta.color}22)` }
                }
              >
                {/* Sin foto: el glyph de la categoría hace de portada */}
                {!c.imageUrl && (
                  <div className="pp-glyph" style={{ color: meta.color }}><CatIcon cat={c.cat} /></div>
                )}
                <div className="pp-fade" />
                <div className="pp-tc-head">
                  <span className={`pp-rank${c.cold ? ' cold' : ''}`}>
                    {c.suggested ? 'sugerido' : `#${c.rank}`}{isSel ? ' · elegido' : ''}
                  </span>
                </div>
              </div>
              <div className="pp-ico" style={{ background: meta.bg, color: meta.color }}>
                <CatIcon cat={c.cat} />
              </div>
              <div className="pp-tc-body">
                <div className="pp-top-sp" />
                <div>
                  <div className="pp-cat" style={isSel ? undefined : { color: meta.color }}>{c.cat}</div>
                  <h4>{c.title}</h4>
                </div>
                <div className="pp-tc-meta">
                  {c.sessions > 0
                    ? <><span><b>{c.sessions} charla{c.sessions === 1 ? '' : 's'}</b></span><span className="pp-dot" /><span>{agoLabel(c.days)}</span></>
                    : <span>nunca tocado</span>}
                </div>
              </div>
            </button>
          )
        })}

        {visible.length === 0 && (
          <div className="pp-empty">
            <b>Ningún tópico coincide</b>
            Probá con otra categoría, limpiá la búsqueda o tirá un tema libre desde arriba.
          </div>
        )}
      </div>

      {/* ═══ BARRA DE SELECCIÓN ═══ */}
      {selected && (
        <div className={`pp-selbar${launching ? ' pulse' : ''}`}>
          <div className="pp-sel-ic" style={{ color: '#fff' }}><CatIcon cat={selected.cat} /></div>
          <div className="pp-sel-text">
            <div className="pp-l">Tópico elegido</div>
            <div className="pp-t">{selected.title}</div>
            <div className="pp-sel-prev">{openerFor(selected)}</div>
          </div>
          <div className="pp-sel-meta">
            {tutorName && <span>{tutorName}</span>}
            {level && <span><b>{level}</b> · {minutes} min</span>}
          </div>
          <div className="pp-opts">
            <span className="pp-optlbl">Duración</span>
            {[5, 7, 12].map((m) => (
              <button key={m} type="button" className={`pp-opt${minutes === m ? ' on' : ''}`} onClick={() => setMinutes(m)}>{m}′</button>
            ))}
            <span className="pp-optlbl">Ritmo</span>
            {['Sobremesa', 'Ping-pong', 'Debate'].map((c) => (
              <button key={c} type="button" className={`pp-opt${cadence === c ? ' on' : ''}`} onClick={() => setCadence(c)}>{c}</button>
            ))}
          </div>
          <div className="pp-sel-actions">
            <button className="pp-go" type="button" onClick={() => launch(selected.id)} disabled={launching}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>
              {launching ? 'Arrancando…' : 'Empezar charla'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

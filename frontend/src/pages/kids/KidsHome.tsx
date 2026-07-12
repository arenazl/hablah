/**
 * Kids · "Hoy" — rediseño Claude Design "Hablah Mobile" (crema/verde, mobile-first).
 * Shell propio (topbar + bottom nav del diseño). Lógica real: tópicos, perfil, racha.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KIDS_AGE_KEY, type KidsAgeGroup } from './KidsAgeSelect'
import { useKid, KIDS_RANKS, KIDS_TOKEN_KEY } from './KidsContext'
import { TopicScene, KIDS_SCENE_CSS } from './KidsTopicScenes'
import { ensureKidsFonts } from './_shared'
import CategorySelector from '../../components/CategorySelector'

interface KidsTopic { id: number; slug: string; title: string; category: string }

// Gradiente + sublabel por tópico (paleta del diseño). Fallback a un gradiente neutro.
const TOPIC_STYLE: Record<string, { bg: string; sub: string }> = {
  'kids-colors':          { bg: 'linear-gradient(160deg,#4a2e6e,#2f1f4a)', sub: 'rojo, azul, amarillo' },
  'kids-animals-farm':    { bg: 'linear-gradient(160deg,#1f5545,#123a30)', sub: 'granja y selva' },
  'kids-counting':        { bg: 'linear-gradient(160deg,#8a6a1f,#5a4413)', sub: 'del 1 al 10' },
  'kids-body':            { bg: 'linear-gradient(160deg,#1f6fb0,#124a7a)', sub: 'cabeza, manos, pies' },
  'kids-family':          { bg: 'linear-gradient(160deg,#8e3fb0,#5f2a86)', sub: 'mamá, papá, hermanos' },
  'kids-food-basic':      { bg: 'linear-gradient(160deg,#a13f3f,#6e2626)', sub: 'manzana, pan, leche' },
  'kids-toy-unboxing':    { bg: 'linear-gradient(160deg,#7a35c9,#4f2299)', sub: 'cajas y sorpresas' },
  'kids-cartoons-heroes': { bg: 'linear-gradient(160deg,#2f6fd6,#1e40af)', sub: 'dibujitos y poderes' },
  'kids-gaming-basic':    { bg: 'linear-gradient(160deg,#1f7a5c,#0f4d3a)', sub: 'jugar en la pantalla' },
  'kids-treats':          { bg: 'linear-gradient(160deg,#c2477f,#8a2c5a)', sub: 'comida rica y dulce' },
  'kids-school':          { bg: 'linear-gradient(160deg,#6b3fb0,#3f2286)', sub: 'cole y amigos' },
  'kids-routine':         { bg: 'linear-gradient(160deg,#1f7fa0,#0e5a70)', sub: 'mañana a noche' },
  'kids-house':           { bg: 'linear-gradient(160deg,#8a3fb0,#5a2286)', sub: 'casa y habitaciones' },
  'kids-hobbies':         { bg: 'linear-gradient(160deg,#b0632f,#7a3f1a)', sub: 'deportes y pasatiempos' },
  'kids-emotions':        { bg: 'linear-gradient(160deg,#a08020,#6a5010)', sub: 'cómo me siento' },
  'kids-nature':          { bg: 'linear-gradient(160deg,#1f6545,#0f3f30)', sub: 'naturaleza y dinos' },
}
const FALLBACK_STYLE = { bg: 'linear-gradient(160deg,#2f7a5c,#1a4d3a)', sub: '' }

const HOME_CSS = `
.khome { position:relative; min-height:100dvh; background:#fbf5e6; color:#2a271c; font-family:'Inter',system-ui,sans-serif; padding-bottom:calc(100px + env(safe-area-inset-bottom)); }
.khome-topbar { display:flex; align-items:center; justify-content:space-between; padding:calc(env(safe-area-inset-top) + 10px) 20px 4px; }
.khome-burger { display:flex; flex-direction:column; gap:4px; background:none; border:0; cursor:pointer; padding:6px 0; }
.khome-burger span { width:20px; height:2.5px; background:#2a271c; border-radius:2px; }
.khome-burger span:last-child { width:14px; }
.khome-hi { font-family:'Sora'; font-weight:800; font-size:21px; color:#2a271c; }
.khome-coins { display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:99px; padding:6px 12px; font-weight:800; font-size:14px; color:#3a3120; box-shadow:0 1px 3px rgba(0,0,0,.06); }
.khome-coins .star { width:16px; height:16px; border-radius:99px; background:#f4c53f; display:grid; place-items:center; }
.khome-av { width:36px; height:36px; border-radius:99px; background:linear-gradient(135deg,#e857c9,#a13ee0); display:grid; place-items:center; color:#fff; font-weight:800; font-size:15px; box-shadow:0 2px 6px rgba(161,62,224,.35); border:0; cursor:pointer; }

.khome-hero { margin:16px 20px 0; border-radius:24px; padding:22px; background:linear-gradient(155deg,#2fb56f 0%,#1f9d5f 55%,#178a52 100%); position:relative; overflow:hidden; box-shadow:0 10px 30px -8px rgba(31,157,95,.5); }
.khome-hero::before { content:""; position:absolute; inset:0; background:radial-gradient(70% 60% at 85% 15%,rgba(255,255,255,.18),transparent 60%); }
.khome-hero-eye { position:relative; display:flex; align-items:center; gap:7px; color:#ffd869; font-size:12px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
.khome-hero h1 { position:relative; font-family:'Sora'; font-weight:800; font-size:clamp(26px,7.5vw,30px); line-height:1.08; color:#fff; margin:10px 0 0; }
.khome-hero h1 em { color:#ffd869; font-style:italic; }
.khome-hero p { position:relative; font-size:14.5px; line-height:1.5; color:rgba(255,255,255,.9); margin:10px 0 0; }
.khome-hero p b { color:#fff; }
.khome-hero-cta { position:relative; display:flex; align-items:center; gap:12px; margin-top:18px; flex-wrap:wrap; }
.khome-play { display:flex; align-items:center; gap:10px; background:#f4c53f; border:0; border-radius:99px; padding:13px 20px 13px 13px; font-weight:800; font-size:16px; color:#3a2b06; font-family:'Inter'; cursor:pointer; box-shadow:0 6px 16px rgba(244,197,63,.4); }
.khome-play:active { transform:scale(.96); }
.khome-play .ic { width:34px; height:34px; border-radius:99px; background:#fff; display:grid; place-items:center; }
.khome-choose { display:flex; align-items:center; gap:7px; background:transparent; border:0; color:rgba(255,255,255,.92); font-weight:600; font-size:14px; cursor:pointer; }
.khome-chips { position:relative; display:flex; flex-wrap:wrap; gap:8px; margin-top:18px; }
.khome-chip { display:inline-flex; align-items:center; gap:5px; background:rgba(255,255,255,.16); color:#fff; border-radius:99px; padding:7px 12px; font-size:12px; font-weight:600; }

.khome-sec { display:flex; align-items:center; justify-content:space-between; padding:24px 20px 12px; }
.khome-sec h2 { font-family:'Sora'; font-weight:800; font-size:20px; color:#2a271c; margin:0; }
.khome-sec a { font-size:13px; font-weight:700; color:#1f9d5f; cursor:pointer; }

.khome-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:0 20px; }
.khome-card { position:relative; text-align:left; border:0; cursor:pointer; border-radius:20px; padding:16px; min-height:150px; display:flex; flex-direction:column; justify-content:flex-end; overflow:hidden; color:#fff; }
.khome-card:active { transform:scale(.97); }
.khome-card .scene { position:absolute; inset:0; display:flex; align-items:flex-start; justify-content:flex-end; padding:12px 12px 0; opacity:.9; }
.khome-card .scene svg { width:64px; height:64px; }
.khome-card .today { position:absolute; top:10px; left:12px; background:#f4c53f; color:#5a3d00; font-size:10px; font-weight:800; border-radius:99px; padding:3px 8px; z-index:1; }
.khome-card .t { position:relative; font-family:'Sora'; font-weight:800; font-size:16px; }
.khome-card .s { position:relative; color:rgba(255,255,255,.7); font-size:12px; margin-top:2px; }

.khome-monster { margin:24px 20px 0; background:#fdf1cf; border:1px solid #f0e2b0; border-radius:20px; padding:20px; text-align:center; }
.khome-monster .mvis { width:56px; height:56px; border-radius:99px; background:radial-gradient(circle at 50% 38%,#ff9d3d,#f47a1f); margin:-42px auto 0; position:relative; box-shadow:0 6px 14px rgba(244,122,31,.4); }
.khome-monster .mvis .eye { position:absolute; top:16px; width:9px; height:9px; border-radius:99px; background:#fff; }
.khome-monster .mvis .eye.l { left:15px; } .khome-monster .mvis .eye.r { right:15px; }
.khome-monster .mvis .pup { position:absolute; top:19px; width:4px; height:4px; border-radius:99px; background:#3a2b06; }
.khome-monster .mvis .pup.l { left:18px; } .khome-monster .mvis .pup.r { right:18px; }
.khome-monster .eyebrow { margin-top:10px; font-size:11.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#c9762a; }
.khome-monster h3 { font-family:'Sora'; font-weight:800; font-size:18px; color:#3a3120; margin:8px 0 0; }
.khome-monster p { font-size:13.5px; line-height:1.5; color:#6a6047; margin:8px 0 0; }
.khome-monster p b { color:#3a3120; }
.khome-catch { margin-top:14px; background:#3a3120; border:0; border-radius:99px; padding:11px 22px; color:#fff; font-weight:700; font-size:14px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; }
.khome-catch:active { transform:scale(.96); }

.khome-streak { margin:16px 20px 0; background:#fbe6a3; border:1px solid #f2d47f; border-radius:20px; padding:18px; }
.khome-streak h3 { font-family:'Sora'; font-weight:800; font-size:18px; color:#5a4413; margin:0; }
.khome-streak p { font-size:13px; color:#8a6f28; margin:4px 0 14px; }
.khome-streak p b { color:#5a4413; }
.khome-days { display:flex; justify-content:space-between; }
.khome-day { display:flex; flex-direction:column; align-items:center; gap:6px; }
.khome-day .n { font-size:10px; font-weight:700; color:#8a6f28; }
.khome-day .c { width:30px; height:30px; border-radius:99px; display:grid; place-items:center; }
.khome-day.done .c { background:#f4c53f; color:#5a4413; }
.khome-day.today .n { color:#1f9d5f; }
.khome-day.today .c { background:#fff; border:2.5px solid #1fae7a; color:#1fae7a; }
.khome-day.future .c { border:2px dashed #d9be74; }

.khome-collection { margin:16px 20px 0; background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:20px; padding:18px; }
.khome-collection .h { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.khome-collection .h h3 { font-family:'Sora'; font-weight:800; font-size:18px; color:#2a271c; margin:0; }
.khome-collection .h .link { font-size:13px; font-weight:700; color:#1f9d5f; cursor:pointer; }
.khome-stickers { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.khome-sticker { aspect-ratio:1; border-radius:16px; display:grid; place-items:center; color:#fff; position:relative; }
.khome-sticker.locked { background:#efe7d4; border:1px dashed #cfc3a6; color:#b3a882; }
.khome-sticker svg { width:52%; height:52%; }
.khome-sticker .new { position:absolute; top:-6px; right:-4px; background:#e857c9; color:#fff; font-size:8px; font-weight:800; border-radius:99px; padding:2px 5px; }

.khome-nav { position:fixed; left:0; right:0; bottom:0; height:calc(82px + env(safe-area-inset-bottom)); padding-bottom:env(safe-area-inset-bottom); background:rgba(255,255,255,.92); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-top:1px solid rgba(0,0,0,.06); display:flex; align-items:flex-start; justify-content:space-around; padding-top:10px; z-index:40; }
.khome-nav a { display:flex; flex-direction:column; align-items:center; gap:4px; color:#a79f8a; font-size:10.5px; font-weight:600; cursor:pointer; background:none; border:0; font-family:inherit; padding:0; }
.khome-nav a.active { color:#1f9d5f; font-weight:700; }
.khome-nav a svg { width:22px; height:22px; }
.khome-nav .fab-wrap { margin-top:-16px; }
.khome-nav .fab { width:60px; height:60px; border-radius:99px; background:#fff; border:1px solid rgba(0,0,0,.08); box-shadow:0 8px 22px rgba(0,0,0,.18); display:grid; place-items:center; cursor:pointer; }
.khome-nav .fab:active { transform:scale(.95); }
`

export function KidsHome() {
  const navigate = useNavigate()
  const { kid: profile } = useKid()
  const [topics, setTopics] = useState<KidsTopic[]>([])
  const [showSelector, setShowSelector] = useState(false)
  const ageGroup = profile.age_group

  useEffect(() => { ensureKidsFonts() }, [])

  useEffect(() => {
    const stored = localStorage.getItem(KIDS_AGE_KEY) as KidsAgeGroup | null
    if (!profile.is_real && (!stored || !['mini', 'junior', 'tween'].includes(stored))) {
      navigate('/kids/seleccionar-edad', { replace: true })
      return
    }
    fetch(`/api/kids/topics?age_group=${ageGroup}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setTopics)
      .catch(() => setTopics([]))
  }, [navigate, ageGroup, profile.is_real])

  const featured = topics[0]
  const rankLabel = (KIDS_RANKS.find((r) => r.slug === profile.rank_slug)?.name ?? 'Curioso').toLowerCase()
  const kidsToken = (typeof window !== 'undefined' && localStorage.getItem(KIDS_TOKEN_KEY)) || ''

  const startFromSelector = async () => {
    try {
      const res = await fetch('/api/me/next-topic', { headers: { Authorization: `Bearer ${kidsToken}` } })
      const data = await res.json()
      setShowSelector(false)
      navigate(data?.topic_id ? `/kids/sesion/${data.topic_id}` : '/kids/topicos')
    } catch { setShowSelector(false); navigate('/kids/topicos') }
  }

  const goSession = (t: KidsTopic) => navigate(`/kids/sesion/${t.id}`, { state: { topic: t } })
  const check = (
    <svg viewBox="0 0 24 24" fill="none" stroke="#5a4413" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
  )
  const STREAK = ['VIE', 'SÁB', 'DOM', 'LUN', 'HOY', 'MIÉ', 'JUE']

  return (
    <div className="khome">
      <style>{HOME_CSS}</style>
      <style>{KIDS_SCENE_CSS}</style>

      {showSelector && (
        <CategorySelector token={kidsToken} title="¿De qué hablamos hoy?" startLabel="¡A hablar!"
          onSkip={() => setShowSelector(false)} onStart={startFromSelector} />
      )}

      <header className="khome-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="khome-burger" aria-label="Menú" onClick={() => navigate('/kids/perfil')}>
            <span /><span /><span />
          </button>
          <span className="khome-hi">¡Hola, {profile.name}!</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="khome-coins">
            <span className="star"><svg width="10" height="10" viewBox="0 0 24 24" fill="#7a5a00"><path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" /></svg></span>
            {profile.coins}
          </div>
          <button className="khome-av" onClick={() => navigate('/kids/perfil')}>{profile.name.charAt(0)}</button>
        </div>
      </header>

      {/* Aventura del día */}
      <section className="khome-hero">
        <div className="khome-hero-eye">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffd869"><path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" /></svg>
          Aventura del día
        </div>
        <h1>Hablamos de <em>{featured?.title.toLowerCase() ?? 'tu tema'}</em></h1>
        <p>Habi conoce muchísimo. ¿Cuál es <b>tu favorito</b>? Si te trabás, Habi te va a ayudar.</p>
        <div className="khome-hero-cta">
          <button className="khome-play" onClick={() => featured ? goSession(featured) : navigate('/kids/topicos')}>
            <span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="#3a2b06"><path d="M8 5v14l11-7z" /></svg></span>
            ¡A hablar con Habi!
          </button>
          <button className="khome-choose" onClick={() => setShowSelector(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            Elegir de qué hablar
          </button>
        </div>
        <div className="khome-chips">
          <span className="khome-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg> 5 minutos</span>
          <span className="khome-chip">★ hasta +20 monedas</span>
          <span className="khome-chip">nivel: {rankLabel}</span>
        </div>
      </section>

      {/* ¿De qué charlamos? */}
      <div className="khome-sec">
        <h2>¿De qué charlamos?</h2>
        <a onClick={() => navigate('/kids/topicos')}>Ver todos →</a>
      </div>
      <div className="khome-grid">
        {topics.length === 0 && <div style={{ color: '#8a6f28', fontSize: 13, padding: '0 4px' }}>Cargando temas…</div>}
        {topics.slice(0, 6).map((t, idx) => {
          const st = TOPIC_STYLE[t.slug] ?? FALLBACK_STYLE
          return (
            <button key={t.id} className="khome-card" style={{ background: st.bg }} onClick={() => goSession(t)}>
              {idx === 0 && <span className="today">★ HOY</span>}
              <span className="scene"><TopicScene slug={t.slug} color="#ffffff" /></span>
              <span className="t">{t.title}</span>
              <span className="s">{st.sub}</span>
            </button>
          )
        })}
      </div>

      {/* Monstruo del idioma */}
      <div className="khome-monster">
        <div className="mvis"><span className="eye l" /><span className="eye r" /><span className="pup l" /><span className="pup r" /></div>
        <div className="eyebrow">★ Monstruo del idioma</div>
        <h3>"Gusté" se le escapa a {profile.name}</h3>
        <p>3 charlas seguidas dijo <b>"yo gusté el helado"</b>. La próxima le decimos: <b>"a mí me gustó el helado"</b>. ¡Si lo atrapa, gana 25 monedas!</p>
        <button className="khome-catch">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          ¡Atrapar!
        </button>
      </div>

      {/* Racha */}
      <div className="khome-streak">
        <h3>¡4 días seguidos!</h3>
        <p>Si charlás hoy, llegás a <b>5</b>.</p>
        <div className="khome-days">
          {STREAK.map((d, i) => {
            const klass = i < 4 ? 'done' : i === 4 ? 'today' : 'future'
            return (
              <div key={d} className={`khome-day ${klass}`}>
                <span className="n">{d}</span>
                <span className="c">{i < 4 ? check : i === 4 ? '★' : ''}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Colección */}
      <div className="khome-collection">
        <div className="h"><h3>Mi colección</h3><span className="link" onClick={() => navigate('/kids/coleccion')}>7/30 →</span></div>
        <div className="khome-stickers">
          {['#1fae7a', '#8e3fb0', '#1f9dc9', '#e857a0', '#f47a1f', '#f4c53f', '#2f6fd6'].map((bg, i) => (
            <div key={i} className="khome-sticker" style={{ background: bg }}>
              {i === 1 && <span className="new">¡NUEVO!</span>}
              <svg viewBox="0 0 24 24" fill="#fff"><path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" /></svg>
            </div>
          ))}
          <div className="khome-sticker locked"><svg viewBox="0 0 24 24" fill="none" stroke="#b3a882" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></div>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="khome-nav">
        <a className="active" onClick={() => navigate('/kids')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 21v-7h6v7" /></svg>
          Hoy
        </a>
        <a onClick={() => navigate('/kids/coleccion')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" /></svg>
          Colección
        </a>
        <div className="fab-wrap">
          <button className="fab" aria-label="A hablar" onClick={() => featured ? goSession(featured) : setShowSelector(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2a271c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></svg>
          </button>
        </div>
        <a onClick={() => navigate('/kids/aventuras')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z" /></svg>
          Aventuras
        </a>
        <a onClick={() => navigate('/kids/perfil')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
          Perfil
        </a>
      </nav>
    </div>
  )
}

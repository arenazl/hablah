/**
 * Selector de edad al entrar a /kids.
 *
 * Tres cards grandes con personalidad propia por nivel:
 *   - Mini   (4-7)   verde — pantallas y juguetes
 *   - Junior (7-10)  azul — creadores y coleccionables
 *   - Tween  (10-14) violeta — streamers y tendencias
 *
 * Guarda eleccion en localStorage 'kids_age_group' y redirige a /kids.
 *
 * Mientras no tengamos el flow real "padre habilita perfil hijo", esto
 * es la puerta de entrada. Es preview que despues evoluciona a:
 *   adulto loguea -> elige perfil hijo -> ese perfil tiene age_group ya seteado
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ensureKidsFonts, Habi, KIDS_CSS } from './_shared'

export const KIDS_AGE_KEY = 'kids_age_group'
export type KidsAgeGroup = 'mini' | 'junior' | 'tween'

const SELECT_CSS = `
.kids-select-root { min-height:100vh; background:#FFFCF6; display:flex; flex-direction:column; padding:32px 24px 48px; font-family:'Inter',ui-sans-serif,system-ui,sans-serif; }
.kids-select-top { display:flex; align-items:center; gap:12px; margin-bottom:32px; max-width:1100px; width:100%; margin-left:auto; margin-right:auto; }
.kids-select-top .brand-mark { width:38px; height:38px; border-radius:12px; background:#00B37E; display:grid; place-items:center; color:#fff; font-family:'Sora',sans-serif; font-weight:800; font-size:20px; }
.kids-select-top .brand-name { font-family:'Sora',sans-serif; font-weight:700; font-size:20px; letter-spacing:-0.01em; color:#0D1412; }
.kids-select-top .brand-tag { font-size:10px; background:#FFB800; color:#3A2A00; padding:3px 8px; border-radius:6px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }

.kids-select-hero { text-align:center; max-width:680px; margin:0 auto 40px; }
.kids-select-hero .habi-mini-wrap { display:flex; justify-content:center; margin-bottom:16px; }
.kids-select-hero .eyebrow { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#008F63; font-weight:800; margin-bottom:8px; }
.kids-select-hero h1 { font-family:'Sora',sans-serif; font-weight:800; font-size:clamp(32px, 5vw, 48px); letter-spacing:-0.025em; line-height:1.04; margin:0 0 12px; color:#0D1412; }
.kids-select-hero h1 em { font-style:normal; color:#008F63; background:linear-gradient(180deg,transparent 64%,rgba(0,179,126,.22) 64% 96%,transparent 96%); padding:0 4px; }
.kids-select-hero p { font-size:16px; color:#3A4441; margin:0; line-height:1.5; max-width:520px; margin-left:auto; margin-right:auto; }

.kids-select-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:20px; max-width:1100px; margin:0 auto; width:100%; }
@media (max-width:880px) { .kids-select-grid { grid-template-columns:1fr; gap:14px; } }

.kids-age-card { position:relative; border-radius:28px; padding:32px 28px; min-height:340px; cursor:pointer; border:0; color:#fff; text-align:left; display:flex; flex-direction:column; justify-content:space-between; transition:transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s cubic-bezier(.2,.8,.2,1); overflow:hidden; }
.kids-age-card:hover { transform:translateY(-6px) rotate(-.5deg); box-shadow:0 22px 50px rgba(0,0,0,.18); }
.kids-age-card::before { content:""; position:absolute; right:-40px; top:-40px; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,.10); }
.kids-age-card.mini { background:linear-gradient(160deg,#00B37E 0%,#008F63 100%); }
.kids-age-card.junior { background:linear-gradient(160deg,#3B82F6 0%,#1E40AF 100%); }
.kids-age-card.tween { background:linear-gradient(160deg,#A855F7 0%,#7C3AED 100%); }

.kids-age-card .age-pill { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.22); padding:5px 12px; border-radius:99px; font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; align-self:flex-start; backdrop-filter:blur(8px); }
.kids-age-card .age-num { font-family:'Sora',sans-serif; font-weight:200; font-size:64px; letter-spacing:-.04em; line-height:1; margin:24px 0 6px; font-style:italic; }
.kids-age-card .age-num b { font-weight:900; font-style:normal; }
.kids-age-card h2 { font-family:'Sora',sans-serif; font-weight:800; font-size:24px; letter-spacing:-.02em; margin:0 0 8px; line-height:1.1; }
.kids-age-card p { font-size:14px; color:rgba(255,255,255,.85); margin:0 0 14px; line-height:1.45; }
.kids-age-card .tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; }
.kids-age-card .tags span { font-size:11px; padding:4px 10px; border-radius:99px; background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.18); font-weight:600; backdrop-filter:blur(6px); }
.kids-age-card .arrow { position:absolute; bottom:20px; right:20px; width:44px; height:44px; border-radius:50%; background:#fff; color:#0D1412; display:grid; place-items:center; box-shadow:0 6px 14px rgba(0,0,0,.18); transition:transform .2s; }
.kids-age-card:hover .arrow { transform:translateX(4px); }

.kids-select-footer { text-align:center; margin-top:36px; font-size:13px; color:#6B7672; max-width:520px; margin-left:auto; margin-right:auto; }
.kids-select-footer b { color:#3A4441; }
`

interface AgeCardProps {
  group: KidsAgeGroup
  pill: string
  ageRange: string
  title: string
  subtitle: string
  tags: string[]
  onClick: () => void
}

function AgeCard({ group, pill, ageRange, title, subtitle, tags, onClick }: AgeCardProps) {
  return (
    <button className={`kids-age-card ${group}`} onClick={onClick}>
      <span className="age-pill">{pill}</span>
      <div className="age-num">{ageRange.split('-')[0]}<b>-{ageRange.split('-')[1]}</b></div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="tags">
        {tags.map((t) => <span key={t}>{t}</span>)}
      </div>
      <span className="arrow" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="M13 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}

export function KidsAgeSelect() {
  const navigate = useNavigate()

  useEffect(() => {
    ensureKidsFonts()
  }, [])

  const pick = (g: KidsAgeGroup) => {
    localStorage.setItem(KIDS_AGE_KEY, g)
    navigate('/kids')
  }

  return (
    <div className="kids-select-root">
      <style>{KIDS_CSS}{SELECT_CSS}</style>

      <div className="kids-select-top">
        <div className="brand-mark">h</div>
        <div className="brand-name">habláh</div>
        <span className="brand-tag">kids</span>
      </div>

      <div className="kids-select-hero">
        <div className="habi-mini-wrap"><Habi size={96} variant="mini" bounce /></div>
        <div className="eyebrow">Bienvenido al modo Habi</div>
        <h1>¿Cuántos años <em>tenés</em>?</h1>
        <p>Elegí tu nivel y voy a charlar de las cosas que te gustan. Después tu mamá o papá puede ajustarlo desde su cuenta.</p>
      </div>

      <div className="kids-select-grid">
        <AgeCard
          group="mini"
          pill="Mini"
          ageRange="4-7"
          title="Pantallas y juguetes"
          subtitle="Colores, animales, números, dibujitos, abrir juguetes y comidas ricas."
          tags={['Colores', 'Animales', 'Héroes', 'Comer rico']}
          onClick={() => pick('mini')}
        />
        <AgeCard
          group="junior"
          pill="Junior"
          ageRange="7-10"
          title="Creadores y coleccionables"
          subtitle="El cole, mi rutina, hobbies, naturaleza, desafíos virales y mundos de bloques."
          tags={['Cole', 'Desafíos', 'Bloques', 'Coleccionar']}
          onClick={() => pick('junior')}
        />
        <AgeCard
          group="tween"
          pill="Tween"
          ageRange="10-14"
          title="Streamers y tendencias"
          subtitle="Música, viajes, cocina, futuro, streamers en vivo, zapatillas y esports."
          tags={['Streamers', 'Sneakers', 'Esports', 'Slang']}
          onClick={() => pick('tween')}
        />
      </div>

      <div className="kids-select-footer">
        Esta elección queda guardada en tu navegador. <b>Próximamente</b>: tu mamá o papá crea tu perfil desde su cuenta y elige por vos.
      </div>
    </div>
  )
}

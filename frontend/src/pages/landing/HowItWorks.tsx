import { Link } from 'react-router-dom'
import { ArrowRight, Check, Play, X as XIcon } from 'lucide-react'
import {
  Breadcrumbs,
  LandingLayout,
  RelatedCard,
  breadcrumbList,
  webPageSchema,
  type PageMeta,
} from './_shared'

const META: PageMeta = {
  title: 'Cómo funciona Habláh · Aprender un idioma sin exámenes con IA',
  description:
    'El método de Habláh: diagnóstico continuo en segundo plano (sin tests), calibración al marco CEFR A1-C2 y misiones diarias de 5 a 10 minutos con feedback sincerista al final.',
  path: '/como-funciona',
}

const STRUCTURED = [
  webPageSchema(META),
  breadcrumbList([
    { name: 'Inicio', path: '/' },
    { name: 'Cómo funciona', path: '/como-funciona' },
  ]),
]

const PAGE_CSS = `
.landing-root .how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.landing-root .how-card { background: var(--surface); border-radius: var(--r-2xl); padding: 32px; border: 1px solid var(--border-1); position: relative; }
.landing-root .how-card .num { font-size: 14px; font-weight: 800; letter-spacing: .08em; color: var(--primary-dark); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.landing-root .how-card .num::before { content: ''; width: 32px; height: 1px; background: var(--primary); }
.landing-root .how-card h3 { font-size: var(--t-xl); line-height: 1.15; letter-spacing: -.015em; font-weight: 700; margin: 0 0 12px; }
.landing-root .how-card p { font-size: 15px; color: var(--fg-3); line-height: 1.5; margin: 0 0 24px; }
.landing-root .how-viz { height: 160px; border-radius: var(--r-lg); overflow: hidden; background: var(--bg-2); display: flex; align-items: center; justify-content: center; position: relative; }
.landing-root .viz-bubbles { display: flex; flex-direction: column; gap: 8px; padding: 16px; width: 100%; }
.landing-root .viz-bubble { padding: 8px 12px; border-radius: 14px; font-size: 12px; background: var(--surface); align-self: flex-start; max-width: 80%; }
.landing-root .viz-bubble.you { background: var(--primary); color: white; align-self: flex-end; }
.landing-root .viz-cefr { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; padding: 0 24px; width: 100%; }
.landing-root .viz-cefr div { height: 60px; border-radius: 8px; background: var(--bg-3); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px; font-size: 11px; font-weight: 700; color: var(--fg-3); }
.landing-root .viz-cefr div.active { background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; height: 90px; }
.landing-root .viz-feedback { padding: 16px; width: 100%; display: flex; flex-direction: column; gap: 8px; }
.landing-root .viz-feedback .row { display: flex; gap: 8px; padding: 8px 10px; border-radius: 10px; font-size: 12px; align-items: center; }
.landing-root .viz-feedback .row.bad { background: #FCE8E9; color: #B42127; }
.landing-root .viz-feedback .row.good { background: var(--primary-tint); color: var(--primary-dark); }

.landing-root .feature { padding: 100px 0; background: var(--bg-2); }
.landing-root .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
.landing-root .feature h2 { font-size: clamp(28px, 3.4vw, 39px); line-height: 1.12; letter-spacing: -.02em; font-weight: 800; margin: 12px 0 16px; }
.landing-root .feature p { font-size: var(--t-lg); color: var(--fg-3); line-height: 1.5; margin: 0 0 24px; }
.landing-root .feature ul { list-style: none; padding: 0; margin: 0; }
.landing-root .feature ul li { display: flex; gap: 10px; padding: 8px 0; font-size: 15px; color: var(--fg-2); align-items: flex-start; }
.landing-root .feature ul li .li-ico { color: var(--primary); flex-shrink: 0; margin-top: 3px; }

.landing-root .mock-report { background: white; border-radius: var(--r-2xl); padding: 0; box-shadow: var(--shadow-lift); overflow: hidden; max-width: 460px; margin: 0 auto; }
.landing-root .mock-report .head { background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; padding: 24px 24px 32px; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; }
.landing-root .mock-report .head .lbl { font-size: 12px; font-weight: 600; opacity: .9; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 6px; }
.landing-root .mock-report .head h3 { font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: -.015em; }
.landing-root .mock-report .head p { font-size: 14px; opacity: .9; margin: 0 0 16px; }
.landing-root .mock-report .head .stats { display: flex; gap: 8px; }
.landing-root .mock-report .head .stats div { flex: 1; background: rgba(255,255,255,.13); border-radius: 12px; padding: 10px 12px; }
.landing-root .mock-report .head .stats .v { font-size: 18px; font-weight: 800; }
.landing-root .mock-report .head .stats .k { font-size: 11px; opacity: .85; }
.landing-root .mock-report .body { padding: 20px 24px; }
.landing-root .mock-report .body .feed { border: 1px solid var(--border-1); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.landing-root .mock-report .body .feed .type { font-size: 11px; font-weight: 700; letter-spacing: .06em; color: var(--fg-3); text-transform: uppercase; margin-bottom: 8px; }
.landing-root .mock-report .body .feed .bad, .landing-root .mock-report .body .feed .good { padding: 10px; border-radius: 8px; font-size: 13px; display: flex; gap: 8px; margin-bottom: 6px; align-items: center; }
.landing-root .mock-report .body .feed .bad { background: #FCE8E9; color: #5A1F22; }
.landing-root .mock-report .body .feed .good { background: var(--primary-tint); color: #024E36; }
.landing-root .mock-report .body .feed .listen { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; background: var(--primary-dark); color: white; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }

.landing-root .related-grid { padding-top: 0; }
@media (max-width: 880px) {
  .landing-root .how-grid { grid-template-columns: 1fr; gap: 16px; }
  .landing-root .feature { padding: 64px 0; }
  .landing-root .feature-grid { grid-template-columns: 1fr; gap: 40px; }
}
`

export function HowItWorks() {
  return (
    <LandingLayout meta={META} structuredData={STRUCTURED} current="/como-funciona">
      <style>{PAGE_CSS}</style>

      <Breadcrumbs crumbs={[{ name: 'Inicio', path: '/' }, { name: 'Cómo funciona', path: '/como-funciona' }]} />

      <section className="page-hero">
        <div className="container">
          <span className="eyebrow hero-fade-in">Metodología</span>
          <h1 className="hero-fade-in d1">Cómo funciona Habláh<br />paso a paso.</h1>
          <p className="lead hero-fade-in d2">
            En 3 minutos te ubicamos en el marco europeo CEFR sin un solo examen, en 5 a 10 minutos diarios sostenés el hábito,
            y al final de cada sesión recibís un reporte directo, claro y accionable.
          </p>
          <div className="actions hero-fade-in d3">
            <Link to="/login" className="btn btn-primary btn-lg">
              Empezar gratis
              <ArrowRight size={18} strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="how-grid fade-stagger">
            <article className="how-card">
              <div className="num">01 · Diagnóstico</div>
              <h2 style={{ fontSize: 'var(--t-xl)', margin: '0 0 12px', fontWeight: 700, letterSpacing: '-.015em' }}>Una charla informal, no un examen.</h2>
              <p>Hablás un minuto sobre lo que hacés. En segundo plano medimos fluidez (palabras por minuto y pausas), riqueza léxica, precisión sintáctica y precisión fonética.</p>
              <div className="how-viz">
                <div className="viz-bubbles">
                  <div className="viz-bubble">Tell me a bit about your job — what got you into it?</div>
                  <div className="viz-bubble you">"Well, I work as a product designer at a fintech…"</div>
                  <div className="viz-bubble" style={{ background: 'var(--primary-tint)', color: 'var(--primary-dark)', fontWeight: 600 }}>
                    Analizando · 142 palabras/min
                  </div>
                </div>
              </div>
            </article>
            <article className="how-card">
              <div className="num">02 · Tu nivel CEFR</div>
              <h2 style={{ fontSize: 'var(--t-xl)', margin: '0 0 12px', fontWeight: 700, letterSpacing: '-.015em' }}>Sabemos exactamente dónde estás.</h2>
              <p>En 3 minutos te ubicamos en el marco común europeo de referencia (A1, A2, B1, B2, C1, C2). De ahí en adelante, el contenido se calibra solo a tu nivel real.</p>
              <div className="how-viz">
                <div className="viz-cefr">
                  <div>A1</div><div>A2</div><div>B1</div><div className="active">B2</div><div>C1</div><div>C2</div>
                </div>
              </div>
            </article>
            <article className="how-card">
              <div className="num">03 · Conversación diaria</div>
              <h2 style={{ fontSize: 'var(--t-xl)', margin: '0 0 12px', fontWeight: 700, letterSpacing: '-.015em' }}>Misiones de 5 a 10 minutos.</h2>
              <p>Hablás de lo que te gusta — música, código, fitness, diseño, lo que sea. Al final: 1 elogio + 3 puntos para pulir. Nunca más por sesión, para no saturar.</p>
              <div className="how-viz">
                <div className="viz-feedback">
                  <div className="row bad"><XIcon size={14} strokeWidth={2.6} /> "producers started <i>to mixing</i>…"</div>
                  <div className="row good"><Check size={14} strokeWidth={2.6} /> "producers started <i>mixing</i>…"</div>
                  <div className="row good"><Check size={14} strokeWidth={2.6} /> Usaste "nevertheless" perfecto</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="feature">
        <div className="container feature-grid">
          <div className="fade-on-scroll">
            <span className="eyebrow">Feedback sincerista</span>
            <h2>Te decimos lo que está mal.<br />Sin maquillarlo.</h2>
            <p>La IA tiene prohibido interrumpirte mientras hablás. Todo el feedback se guarda y se entrega al final — claro, directo, accionable.</p>
            <ul>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span><b>1 elogio</b> · qué hiciste mejor que ayer</span></li>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span><b>Máximo 3 puntos a pulir</b> · gramática, pronunciación o léxico</span></li>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Frases <b>exactas</b> que dijiste, con la versión natural al lado</span></li>
              <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Audio nativo de la pronunciación correcta · tocá para escuchar</span></li>
            </ul>
          </div>
          <div className="fade-on-scroll">
            <div className="mock-report">
              <div className="head">
                <div className="lbl">
                  <Check size={14} strokeWidth={2.6} /> Sesión completa · 6 min 12 s
                </div>
                <h3>¡Buenísima charla!</h3>
                <p>Tu fluidez subió un <b>10%</b> respecto de ayer.</p>
                <div className="stats">
                  <div><div className="k">Fluidez</div><div className="v">+10%</div></div>
                  <div><div className="k">Vocabulario</div><div className="v">14 nuevos</div></div>
                  <div><div className="k">Pron.</div><div className="v">92%</div></div>
                </div>
              </div>
              <div className="body">
                <div className="feed">
                  <div className="type">Gramática · pasado simple</div>
                  <div className="bad"><XIcon size={14} strokeWidth={2.6} /> <span>"producers started <i>to mixing</i>…"</span></div>
                  <div className="good"><Check size={14} strokeWidth={2.6} /> <span>"producers started <i>mixing</i>…"</span></div>
                </div>
                <div className="feed">
                  <div className="type">Pronunciación · garage</div>
                  <div className="bad"><XIcon size={14} strokeWidth={2.6} /> <span>/ˈɡærɪdʒ/</span></div>
                  <div className="good">
                    <Check size={14} strokeWidth={2.6} /> <span>/ˈɡærɑːʒ/</span>
                    <span className="listen">
                      <Play size={11} strokeWidth={2.6} fill="white" />
                      escuchar
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="related">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <h2>Seguí explorando.</h2>
          </div>
          <div className="related-grid fade-stagger">
            <RelatedCard to="/tutores" eyebrow="Personalidades" title="Conocé los 3 tutores" description="The Coach, The Sincerist y The Arcade — cada uno con tono, rigurosidad y velocidad distintos." />
            <RelatedCard to="/topicos" eyebrow="Contenido" title="Tópicos disponibles" description="Más de 75 tópicos curados que alimentan tus conversaciones diarias." />
            <RelatedCard to="/precios" eyebrow="Planes" title="Precios" description="Free, Pro o Bootcamp con coach humano. 14 días Pro sin tarjeta." />
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

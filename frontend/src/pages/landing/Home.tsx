import { Link } from 'react-router-dom'
import { ArrowRight, Check, Gauge, Languages, Play, Sparkles, Square, Timer, Zap } from 'lucide-react'
import { LandingLayout, RelatedCard, breadcrumbList, webPageSchema, type PageMeta } from './_shared'

const META: PageMeta = {
  title: 'Habláh — Aprender inglés conversando con IA · Sin exámenes',
  description:
    'Aprendé inglés, portugués o italiano hablando 5 minutos por día con un tutor de IA que se adapta a tu nivel, intereses y errores. Sin lecciones lineales, sin exámenes. 14 días Pro gratis.',
  path: '/',
}

const STRUCTURED = [
  webPageSchema(META),
  breadcrumbList([{ name: 'Inicio', path: '/' }]),
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Habláh',
    url: 'https://hablah.com.ar/',
    description: META.description,
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: 'Language Learning',
    operatingSystem: 'iOS, Android, Web',
    inLanguage: ['es-AR', 'es', 'en', 'pt', 'it'],
    isAccessibleForFree: true,
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', category: 'free' },
      { '@type': 'Offer', name: 'Pro', price: '12', priceCurrency: 'USD', category: 'subscription' },
      { '@type': 'Offer', name: 'Bootcamp', price: '49', priceCurrency: 'USD', category: 'subscription' },
    ],
    publisher: { '@type': 'Organization', name: 'Habláh', url: 'https://hablah.com.ar/' },
  },
]

const HOME_CSS = `
.landing-root .home-hero { position: relative; padding: 80px 0 100px; overflow: hidden; }
.landing-root .home-hero-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 80px; align-items: center; }
.landing-root .home-hero-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; background: var(--surface); border: 1px solid var(--border-1); border-radius: var(--r-pill); box-shadow: var(--shadow-card); font-size: 13px; font-weight: 500; color: var(--fg-2); margin-bottom: 24px; }
.landing-root .home-hero-pill .dot { background: var(--primary-tint); color: var(--primary-dark); padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .04em; }
.landing-root .home-hero h1 { font-size: clamp(38px, 6vw, 76px); line-height: 1.02; letter-spacing: -.035em; font-weight: 800; margin: 0 0 24px; }
.landing-root .home-hero h1 em { font-style: normal; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.landing-root .home-hero h1 .strike { text-decoration: none; position: relative; color: var(--fg-3); font-weight: 600; display: inline-block; }
.landing-root .home-hero h1 .strike::after { content: ''; position: absolute; left: -2%; right: -2%; top: 54%; height: 3px; background: var(--accent); transform: rotate(-2deg); border-radius: 2px; }
.landing-root .home-hero p { font-size: var(--t-xl); color: var(--fg-2); line-height: 1.4; margin: 0 0 32px; max-width: 540px; }
.landing-root .home-hero-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.landing-root .home-hero-actions .meta { font-size: 13px; color: var(--fg-3); display: flex; gap: 14px; flex-wrap: wrap; margin-top: 20px; width: 100%; }
.landing-root .home-hero-actions .meta b { color: var(--fg-1); font-weight: 600; }
.landing-root .home-hero-actions .meta span { display: inline-flex; align-items: center; gap: 6px; }

.landing-root .phone-wrap { position: relative; display: flex; justify-content: center; perspective: 1200px; }
.landing-root .phone-frame { width: 320px; height: 660px; border-radius: 44px; background: var(--ink-1); padding: 8px; box-shadow: 0 30px 80px rgba(13,20,18,.25), 0 8px 24px rgba(13,20,18,.12); transform: rotate(-1.5deg); position: relative; }
.landing-root .phone-frame .pscreen { width: 100%; height: 100%; border-radius: 36px; background: var(--ink-1); overflow: hidden; color: white; position: relative; display: flex; flex-direction: column; }
.landing-root .phone-frame .notch { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 90px; height: 26px; background: black; border-radius: 999px; z-index: 5; }
.landing-root .phone-status { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px 0; color: white; font-size: 13px; font-weight: 600; }
.landing-root .phone-status .icons { display: flex; gap: 5px; opacity: .9; }
.landing-root .phone-status .icons span { display: block; width: 4px; height: 8px; background: white; border-radius: 1px; }
.landing-root .phone-orb { margin: 60px auto 24px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, var(--primary) 0%, var(--primary-dark) 60%, #003E2B 100%); box-shadow: 0 20px 60px rgba(0,179,126,.4); position: relative; }
.landing-root .phone-orb::after, .landing-root .phone-orb::before { content: ''; position: absolute; inset: -16px; border-radius: 50%; border: 1px solid rgba(0,179,126,.3); }
.landing-root .phone-orb::before { inset: -36px; border-color: rgba(0,179,126,.15); }
.landing-root .phone-label { text-align: center; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(232,236,234,.5); margin-top: 4px; }
.landing-root .phone-quote { text-align: center; padding: 12px 24px 0; font-size: 14px; color: rgba(232,236,234,.78); font-style: italic; line-height: 1.4; }
.landing-root .phone-quote b { color: white; font-style: normal; font-weight: 600; }
.landing-root .phone-challenge { margin: auto 16px 16px; background: linear-gradient(135deg, rgba(255,184,0,.18), rgba(255,184,0,.06)); border: 1px solid rgba(255,184,0,.35); border-radius: 14px; padding: 12px 14px; display: flex; gap: 10px; align-items: flex-start; }
.landing-root .phone-challenge .ico { width: 28px; height: 28px; border-radius: 8px; background: rgba(255,184,0,.22); display: grid; place-items: center; flex-shrink: 0; color: var(--accent); }
.landing-root .phone-challenge .body { font-size: 13px; }
.landing-root .phone-challenge .body .lbl { font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--accent); text-transform: uppercase; }
.landing-root .phone-challenge .body strong { color: var(--accent); }
.landing-root .phone-bottom { display: flex; align-items: center; gap: 10px; padding: 8px 16px 24px; }
.landing-root .phone-mic-bar { flex: 1; height: 48px; border-radius: 999px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); display: flex; align-items: center; gap: 4px; padding: 0 16px; }
.landing-root .phone-mic-bar i { display: block; width: 3px; background: var(--primary); border-radius: 2px; }
.landing-root .phone-mic-bar i:nth-child(odd) { height: 60%; }
.landing-root .phone-mic-bar i:nth-child(even) { height: 90%; }
.landing-root .phone-mic-bar i:nth-child(3n) { height: 40%; }
.landing-root .phone-mic-bar i:nth-child(5n) { height: 100%; }
.landing-root .phone-stop { width: 48px; height: 48px; border-radius: 999px; background: var(--danger); display: grid; place-items: center; color: white; }

.landing-root .pillars { padding: 40px 0; background: var(--bg-2); border-top: 1px solid var(--border-1); border-bottom: 1px solid var(--border-1); }
.landing-root .pillars-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px; }
.landing-root .pillar { display: flex; align-items: center; gap: 14px; }
.landing-root .pillar .ico { width: 40px; height: 40px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border-1); display: grid; place-items: center; color: var(--primary-dark); flex-shrink: 0; }
.landing-root .pillar .k { font-size: 15px; font-weight: 700; color: var(--fg-1); letter-spacing: -.01em; }
.landing-root .pillar .lbl { font-size: 13px; color: var(--fg-3); max-width: 180px; line-height: 1.35; }

.landing-root .explore-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

.landing-root .cta-final { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; padding: 100px 0; text-align: center; position: relative; overflow: hidden; }
.landing-root .cta-final::before, .landing-root .cta-final::after { content: ''; position: absolute; border-radius: 50%; background: rgba(255,255,255,.06); }
.landing-root .cta-final::before { width: 400px; height: 400px; top: -200px; right: -100px; }
.landing-root .cta-final::after { width: 300px; height: 300px; bottom: -150px; left: -50px; }
.landing-root .cta-final h2 { font-size: clamp(32px, 5vw, 61px); line-height: 1.05; letter-spacing: -.03em; font-weight: 800; margin: 0 0 16px; position: relative; }
.landing-root .cta-final p { font-size: var(--t-xl); opacity: .9; max-width: 540px; margin: 0 auto 32px; position: relative; }
.landing-root .cta-final-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; }

@media (max-width: 880px) {
  .landing-root .home-hero { padding: 56px 0 64px; }
  .landing-root .home-hero-grid { grid-template-columns: 1fr; gap: 48px; }
  .landing-root .home-hero p { font-size: 17px; max-width: none; }
  .landing-root .phone-frame { transform: rotate(-1deg) scale(.9); }
  .landing-root .pillars-inner { justify-content: flex-start; }
  .landing-root .pillar { flex: 1 1 calc(50% - 24px); min-width: 160px; }
  .landing-root .explore-grid { grid-template-columns: 1fr; gap: 16px; }
  .landing-root .cta-final { padding: 64px 0; }
  .landing-root .home-hero-actions .btn { flex: 1; }
}
@media (max-width: 480px) {
  .landing-root .home-hero h1 { font-size: 42px; }
}
`

export function Home() {
  return (
    <LandingLayout meta={META} structuredData={STRUCTURED} current="/">
      <style>{HOME_CSS}</style>

      <section className="home-hero" aria-labelledby="hero-heading">
        <div className="container home-hero-grid">
          <div>
            <div className="home-hero-pill hero-fade-in">
              <span className="dot">NUEVO</span>
              Charlas reales, no flashcards
            </div>
            <h1 id="hero-heading" className="hero-fade-in d1">
              Hablás.<br />
              <em>Aprendés.</em>
              <br />
              Sin <span className="strike">exámenes</span>.
            </h1>
            <p className="hero-fade-in d2">
              Cinco minutos de conversación al día con un tutor de IA que se adapta a tu nivel, tus intereses y tus errores.
              Olvidate de las lecciones lineales.
            </p>
            <div className="home-hero-actions hero-fade-in d3">
              <Link to="/login" className="btn btn-primary btn-lg">
                Empezar gratis
                <ArrowRight size={18} strokeWidth={2.4} />
              </Link>
              <Link to="/como-funciona" className="btn btn-ghost btn-lg">
                <Play size={18} strokeWidth={2.2} />
                Ver cómo funciona
              </Link>
              <div className="meta">
                <span><Check size={14} strokeWidth={2.6} color="var(--primary-dark)" /> <b>14 días</b> sin tarjeta</span>
                <span><Check size={14} strokeWidth={2.6} color="var(--primary-dark)" /> iOS y Android</span>
                <span><Check size={14} strokeWidth={2.6} color="var(--primary-dark)" /> Inglés, portugués, italiano</span>
              </div>
            </div>
          </div>
          <div className="phone-wrap hero-fade-in d4">
            <div className="phone-frame">
              <div className="pscreen">
                <div className="notch"></div>
                <div className="phone-status">
                  <span>9:41</span>
                  <div className="icons">
                    <span></span><span></span><span></span>
                  </div>
                </div>
                <div className="phone-orb"></div>
                <div className="phone-label">Tu turno</div>
                <div className="phone-quote">
                  "And then producers in South London <b>started to mix</b> two-step rhythms…"
                </div>
                <div className="phone-challenge">
                  <div className="ico"><Zap size={16} strokeWidth={2.4} /></div>
                  <div className="body">
                    <div className="lbl">Reto · vocabulario</div>
                    <div style={{ marginTop: 4, color: 'white' }}>
                      Incorporá <strong>"nevertheless"</strong> en tu próxima idea.
                    </div>
                  </div>
                </div>
                <div className="phone-bottom">
                  <div className="phone-mic-bar">
                    {Array.from({ length: 14 }).map((_, i) => <i key={i} />)}
                  </div>
                  <div className="phone-stop">
                    <Square size={14} fill="white" strokeWidth={0} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="pillars fade-on-scroll">
        <div className="container pillars-inner fade-stagger">
          <div className="pillar">
            <div className="ico"><Timer size={20} strokeWidth={2} /></div>
            <div>
              <div className="k">5 min al día</div>
              <div className="lbl">Sesiones cortas, diseñadas para sostener el hábito</div>
            </div>
          </div>
          <div className="pillar">
            <div className="ico"><Sparkles size={20} strokeWidth={2} /></div>
            <div>
              <div className="k">Cero exámenes</div>
              <div className="lbl">Diagnóstico continuo en segundo plano</div>
            </div>
          </div>
          <div className="pillar">
            <div className="ico"><Gauge size={20} strokeWidth={2} /></div>
            <div>
              <div className="k">CEFR A1 a C2</div>
              <div className="lbl">Calibración nativa del nivel sin tests</div>
            </div>
          </div>
          <div className="pillar">
            <div className="ico"><Languages size={20} strokeWidth={2} /></div>
            <div>
              <div className="k">3 idiomas activos</div>
              <div className="lbl">Inglés, portugués e italiano · más en camino</div>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <span className="eyebrow">Explorá</span>
            <h2>Conocé Habláh en detalle.</h2>
            <p>Cinco páginas, cada una con lo que necesitás para decidir. Hechas para leerse en orden o saltar a lo que te interese.</p>
          </div>
          <div className="explore-grid fade-stagger">
            <RelatedCard
              to="/como-funciona"
              eyebrow="Metodología"
              title="Cómo funciona"
              description="El pipeline de diagnóstico continuo, el marco CEFR, las misiones diarias y el feedback sincerista."
            />
            <RelatedCard
              to="/tutores"
              eyebrow="Tres personalidades"
              title="Tutores de IA"
              description="The Coach, The Sincerist y The Arcade. Cada uno con su rigurosidad, tono y velocidad."
            />
            <RelatedCard
              to="/topicos"
              eyebrow="Contenido"
              title="Tópicos disponibles"
              description="Más de 75 tópicos curados — tecnología, arte, lifestyle, diseño, negocios. Hablás de lo que te interesa."
            />
            <RelatedCard
              to="/precios"
              eyebrow="Planes"
              title="Precios"
              description="Free, Pro (US$ 12) y Bootcamp (US$ 49 con coach humano). 14 días Pro sin tarjeta."
            />
            <RelatedCard
              to="/faq"
              eyebrow="Dudas frecuentes"
              title="FAQ"
              description="Cómo decidimos tu nivel, qué pasa con tu audio, qué idiomas hay, si sirve para TOEFL e IELTS."
            />
          </div>
        </div>
      </section>

      <section className="cta-final">
        <div className="container fade-on-scroll">
          <h2>Hablás más en una semana<br />que en seis meses de cursos.</h2>
          <p>14 días de Pro, sin tarjeta. La primera charla se siente rara. La quinta, no podés parar.</p>
          <div className="cta-final-actions">
            <Link to="/login" className="btn btn-light btn-lg">
              Empezar gratis
              <ArrowRight size={18} strokeWidth={2.4} />
            </Link>
          </div>
          <div style={{ marginTop: 24, fontSize: 13, opacity: .8 }}>5 minutos · sin descarga · sin tarjeta</div>
        </div>
      </section>
    </LandingLayout>
  )
}

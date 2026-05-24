import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Gauge, Languages, Sparkles, Timer } from 'lucide-react'
import { LandingLayout, breadcrumbList, webPageSchema, type PageMeta } from './_shared'

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
.landing-root .ed-meta { font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3); }
.landing-root .ed-rule { border: 0; height: 1px; background: var(--fg-1); opacity: .12; margin: 0; }
.landing-root .ed-rule.thick { height: 2px; opacity: 1; background: var(--fg-1); }

.landing-root .home-hero { position: relative; padding: 48px 0 100px; overflow: hidden; }
.landing-root .home-hero-top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 1px solid rgba(13,20,18,.12); margin-bottom: 64px; }
.landing-root .home-hero-top .left { display: flex; gap: 32px; align-items: center; }
.landing-root .home-hero-top .issue { font-family: var(--font-mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--fg-3); }
.landing-root .home-hero-top .issue b { color: var(--fg-1); font-weight: 600; }
.landing-root .home-hero-top .center { font-family: var(--font-serif); font-style: italic; font-size: 15px; color: var(--fg-2); font-weight: 400; }

.landing-root .home-hero-headline {
  font-size: clamp(56px, 12.5vw, 188px);
  line-height: .92;
  letter-spacing: -.045em;
  font-weight: 900;
  margin: 0;
  color: var(--fg-1);
}
.landing-root .home-hero-headline .l { display: block; }
.landing-root .home-hero-headline .l-light { font-weight: 300; font-style: italic; font-family: var(--font-serif); letter-spacing: -.03em; color: var(--fg-2); }
.landing-root .home-hero-headline .l-grad { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.landing-root .home-hero-headline .strike { font-weight: 300; color: var(--fg-3); position: relative; display: inline-block; font-style: italic; font-family: var(--font-serif); }
.landing-root .home-hero-headline .strike::after { content: ''; position: absolute; left: -1%; right: -1%; top: 52%; height: 4px; background: var(--accent); transform: rotate(-2deg); border-radius: 2px; }

.landing-root .home-hero-meta-row { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 48px; margin-top: 64px; padding-top: 32px; border-top: 1px solid rgba(13,20,18,.12); }
.landing-root .home-hero-meta-row .col-left { max-width: 360px; }
.landing-root .home-hero-meta-row .col-left p { font-size: 17px; line-height: 1.45; color: var(--fg-2); margin: 8px 0 0; }
.landing-root .home-hero-meta-row .col-left p .drop { font-family: var(--font-serif); font-size: 56px; line-height: .8; font-weight: 700; color: var(--primary-dark); float: left; margin: 4px 8px -4px 0; }
.landing-root .home-hero-meta-row .col-mid { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.landing-root .home-hero-meta-row .col-mid .num { font-family: var(--font-serif); font-size: 88px; font-weight: 300; line-height: 1; color: var(--fg-1); letter-spacing: -.04em; font-feature-settings: 'lnum'; }
.landing-root .home-hero-meta-row .col-mid .lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--fg-3); text-align: center; max-width: 140px; line-height: 1.4; }
.landing-root .home-hero-meta-row .col-right { display: flex; flex-direction: column; align-items: flex-end; gap: 16px; }
.landing-root .home-hero-meta-row .col-right .btn { width: 100%; max-width: 320px; }

.landing-root .marquee { background: var(--ink-1); color: white; padding: 28px 0; overflow: hidden; }
.landing-root .marquee-track { display: flex; gap: 56px; white-space: nowrap; animation: marquee 10s linear infinite; will-change: transform; }
.landing-root .marquee-item { display: inline-flex; align-items: center; gap: 14px; font-family: var(--font-serif); font-size: 32px; font-weight: 300; font-style: italic; flex-shrink: 0; }
.landing-root .marquee-item .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); flex-shrink: 0; }
@keyframes marquee { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.landing-root .marquee:hover .marquee-track { animation-play-state: paused; }

.landing-root .editorial-section { padding: 120px 0; }
.landing-root .editorial-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
.landing-root .editorial-grid-2 .col-num { font-family: var(--font-serif); font-size: clamp(120px, 18vw, 240px); line-height: .85; font-weight: 200; color: var(--fg-1); letter-spacing: -.05em; }
.landing-root .editorial-grid-2 .col-text h2 { font-size: clamp(36px, 4.5vw, 64px); line-height: 1.02; letter-spacing: -.03em; font-weight: 800; margin: 24px 0; color: var(--fg-1); }
.landing-root .editorial-grid-2 .col-text h2 em { font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--primary-dark); }
.landing-root .editorial-grid-2 .col-text p { font-size: 19px; line-height: 1.55; color: var(--fg-2); margin: 0 0 20px; max-width: 540px; }

.landing-root .editorial-section .label-tag { font-family: var(--font-mono); font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: var(--primary-dark); display: inline-flex; align-items: center; gap: 10px; }
.landing-root .editorial-section .label-tag::before { content: ''; width: 24px; height: 1px; background: var(--primary); }

.landing-root .pillquote {
  font-family: var(--font-serif);
  font-size: clamp(32px, 4.6vw, 64px);
  line-height: 1.1;
  font-weight: 300;
  font-style: italic;
  letter-spacing: -.02em;
  color: var(--fg-1);
  margin: 0;
  max-width: 1100px;
  padding: 60px 0;
}
.landing-root .pillquote em { font-style: normal; font-weight: 700; color: var(--primary-dark); }

.landing-root .index-section { background: var(--ink-1); color: white; padding: 120px 0; }
.landing-root .index-section .index-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 64px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,.12); }
.landing-root .index-section .index-top h2 { font-size: clamp(36px, 5vw, 72px); line-height: 1; letter-spacing: -.035em; font-weight: 800; margin: 0; max-width: 600px; color: white; }
.landing-root .index-section .index-top h2 em { font-family: var(--font-serif); font-style: italic; font-weight: 300; }
.landing-root .index-section .index-top .label-tag { color: var(--primary); }
.landing-root .index-section .index-top .label-tag::before { background: var(--primary); }

.landing-root .index-list { display: flex; flex-direction: column; }
.landing-root .index-row { display: grid; grid-template-columns: 80px 1.4fr 1fr 1fr 60px; gap: 32px; align-items: center; padding: 28px 0; border-top: 1px solid rgba(255,255,255,.1); transition: all .25s var(--ease); color: rgba(232,236,234,.8); }
.landing-root .index-row:last-child { border-bottom: 1px solid rgba(255,255,255,.1); }
.landing-root .index-row:hover { color: white; padding-left: 8px; }
.landing-root .index-row:hover .index-arrow { transform: translate(4px, -4px); color: var(--primary); }
.landing-root .index-row .index-num { font-family: var(--font-mono); font-size: 13px; letter-spacing: .14em; color: rgba(232,236,234,.45); }
.landing-root .index-row .index-title { font-size: clamp(22px, 2.4vw, 32px); font-weight: 700; letter-spacing: -.015em; color: white; }
.landing-root .index-row .index-title em { font-family: var(--font-serif); font-style: italic; font-weight: 400; color: rgba(232,236,234,.85); }
.landing-root .index-row .index-cat { font-family: var(--font-mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: rgba(232,236,234,.55); }
.landing-root .index-row .index-blurb { font-size: 14px; line-height: 1.45; color: rgba(232,236,234,.65); }
.landing-root .index-row .index-arrow { justify-self: end; color: rgba(232,236,234,.55); transition: all .3s var(--ease); }

/* Trio wrapper: gradient continuo cremoso -> oscuro a lo largo de las 3 secciones.
   Stops calibrados para que la transicion empiece YA en la seccion 01 (asi el
   screenshot claro no queda flotando en blanco total) y termine antes del medio
   de la seccion 02 (que ya esta oscura en el bg). */
.landing-root .product-trio {
  background: linear-gradient(
    180deg,
    var(--bg-1) 0%,
    var(--bg-2) 6%,
    #E8DECB 15%,
    #9C9482 25%,
    #4A4944 36%,
    var(--ink-1) 50%,
    var(--ink-1) 80%,
    #050a08 100%
  );
}
/* Marco oscuro sutil que envuelve el screenshot de la seccion 01 (claro)
   para que no quede "blanco sobre blanco" gigante. Se aplica solo en la PRIMER
   .product-section del trio. */
.landing-root .product-trio > .product-section:first-child .product-screen-wrap {
  padding: 18px;
  background: linear-gradient(160deg, rgba(13,20,18,.06), rgba(13,20,18,.02));
  border-radius: calc(var(--r-2xl) + 18px);
  border: 1px solid rgba(13,20,18,.10);
  box-shadow: 0 20px 50px rgba(13,20,18,.12);
}
.landing-root .product-section { padding: 120px 0; position: relative; overflow: hidden; background: transparent; }
.landing-root .product-section.dark { color: white; }
.landing-root .product-section.dark .label-tag { color: var(--primary); }
.landing-root .product-section.dark .label-tag::before { background: var(--primary); }
.landing-root .product-section.dark h2 { color: white; }
.landing-root .product-section.dark p { color: rgba(232,236,234,.72); }

.landing-root .product-grid { display: grid; grid-template-columns: 1fr 1.3fr; gap: 80px; align-items: center; }
.landing-root .product-grid.flip { grid-template-columns: 1.3fr 1fr; }
.landing-root .product-grid.flip .product-text { order: 2; }
.landing-root .product-grid .product-text .stamp { font-family: var(--font-serif); font-size: clamp(96px, 12vw, 168px); line-height: .85; font-weight: 200; letter-spacing: -.05em; color: var(--fg-1); margin: 0 0 16px; }
.landing-root .product-section.dark .product-text .stamp { color: white; opacity: .92; }
.landing-root .product-grid .product-text h2 { font-size: clamp(32px, 4vw, 56px); line-height: 1.05; letter-spacing: -.03em; font-weight: 800; margin: 16px 0 20px; }
.landing-root .product-grid .product-text h2 em { font-family: var(--font-serif); font-style: italic; font-weight: 400; color: var(--primary-dark); }
.landing-root .product-section.dark .product-text h2 em { color: var(--primary); }
.landing-root .product-grid .product-text p { font-size: 18px; line-height: 1.55; color: var(--fg-2); margin: 0 0 16px; max-width: 480px; }
.landing-root .product-grid .product-text .feats { list-style: none; padding: 0; margin: 24px 0 32px; display: flex; flex-direction: column; gap: 10px; font-family: var(--font-mono); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--fg-3); }
.landing-root .product-section.dark .product-text .feats { color: rgba(232,236,234,.55); }
.landing-root .product-grid .product-text .feats li { display: flex; gap: 12px; align-items: center; }
.landing-root .product-grid .product-text .feats li::before { content: ''; display: block; width: 18px; height: 1px; background: var(--primary); flex-shrink: 0; }

.landing-root .product-screen-wrap { position: relative; perspective: 1400px; }
.landing-root .product-screen { display: block; width: 100%; height: auto; border-radius: var(--r-2xl); box-shadow: 0 30px 80px rgba(13,20,18,.22), 0 8px 24px rgba(13,20,18,.10); border: 1px solid var(--border-1); background: var(--surface); transition: transform .5s var(--ease); }
.landing-root .product-section.dark .product-screen { border-color: rgba(255,255,255,.08); box-shadow: 0 30px 80px rgba(0,0,0,.5), 0 8px 24px rgba(0,0,0,.3); }
.landing-root .product-screen-wrap:hover .product-screen { transform: translateY(-6px); }

.landing-root .product-screen-wrap .tag {
  position: absolute; top: 16px; left: 16px;
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--fg-2);
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-1);
  box-shadow: var(--shadow-card);
  z-index: 2;
}
.landing-root .product-section.dark .product-screen-wrap .tag { background: rgba(14,22,20,.85); color: rgba(232,236,234,.85); border-color: rgba(255,255,255,.12); backdrop-filter: blur(8px); }

.landing-root .cta-editorial { background: var(--fg-1); color: white; padding: 140px 0; text-align: center; position: relative; overflow: hidden; }
.landing-root .cta-editorial::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 100%, rgba(0,179,126,.25) 0%, transparent 60%); pointer-events: none; }
.landing-root .cta-editorial .label-tag { color: var(--primary); justify-content: center; margin-bottom: 24px; position: relative; }
.landing-root .cta-editorial .label-tag::before { background: var(--primary); }
.landing-root .cta-editorial h2 { font-size: clamp(48px, 8vw, 120px); line-height: .95; letter-spacing: -.04em; font-weight: 900; margin: 0 0 24px; position: relative; max-width: 1000px; margin-inline: auto; }
.landing-root .cta-editorial h2 em { font-family: var(--font-serif); font-style: italic; font-weight: 300; color: var(--primary); }
.landing-root .cta-editorial p { font-size: 19px; opacity: .75; max-width: 540px; margin: 0 auto 40px; position: relative; line-height: 1.5; }
.landing-root .cta-editorial .btn { position: relative; }

@media (max-width: 880px) {
  .landing-root .home-hero { padding: 32px 0 64px; }
  .landing-root .home-hero-top { flex-direction: column; gap: 12px; align-items: flex-start; margin-bottom: 32px; }
  .landing-root .home-hero-top .center { display: none; }
  .landing-root .home-hero-headline { font-size: clamp(48px, 14vw, 80px); }
  .landing-root .home-hero-meta-row { grid-template-columns: 1fr; gap: 32px; margin-top: 40px; }
  .landing-root .home-hero-meta-row .col-mid { order: -1; align-items: flex-start; }
  .landing-root .home-hero-meta-row .col-mid .num { font-size: 64px; }
  .landing-root .home-hero-meta-row .col-mid .lbl { text-align: left; max-width: none; }
  .landing-root .home-hero-meta-row .col-right { align-items: stretch; }
  .landing-root .home-hero-meta-row .col-right .btn { max-width: none; }
  .landing-root .marquee-item { font-size: 22px; }
  .landing-root .editorial-section { padding: 64px 0; }
  .landing-root .editorial-grid-2 { grid-template-columns: 1fr; gap: 24px; }
  .landing-root .editorial-grid-2 .col-num { font-size: 96px; }
  .landing-root .pillquote { padding: 32px 0; }
  .landing-root .index-section { padding: 56px 0; }
  .landing-root .index-section .index-top { flex-direction: column; gap: 8px; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; }
  .landing-root .index-section .index-top h2 { font-size: 44px; line-height: 1; }
  .landing-root .index-row { grid-template-columns: 40px 1fr 32px; gap: 16px; padding: 18px 0; }
  .landing-root .index-row .index-blurb { display: none; }
  .landing-root .index-row .index-cat { display: none; }
  .landing-root .index-row .index-title { font-size: 20px; }
  .landing-root .product-section { padding: 64px 0; }
  .landing-root .product-grid, .landing-root .product-grid.flip { grid-template-columns: 1fr; gap: 32px; }
  .landing-root .product-grid.flip .product-text { order: 0; }
  .landing-root .product-grid .product-text .stamp { font-size: 80px; }
  .landing-root .cta-editorial { padding: 80px 0; }
}
@media (max-width: 480px) {
  .landing-root .home-hero-headline { font-size: clamp(44px, 14vw, 72px); }
}
`

interface IndexItem {
  num: string
  to: string
  category: string
  title: string
  titleEm?: string
  blurb: string
}

const INDEX_ITEMS: IndexItem[] = [
  {
    num: '01',
    to: '/como-funciona',
    category: 'Metodología',
    title: 'Cómo',
    titleEm: 'funciona',
    blurb: 'Diagnóstico continuo, calibración CEFR y feedback sincerista al final de cada charla.',
  },
  {
    num: '02',
    to: '/tutores',
    category: 'Personalidades',
    title: 'Tres',
    titleEm: 'tutores',
    blurb: 'Coach, Sincerist y Arcade — cada uno con tono, rigurosidad y velocidad distintos.',
  },
  {
    num: '03',
    to: '/topicos',
    category: 'Contenido',
    title: 'Tópicos',
    titleEm: 'curados',
    blurb: 'Más de 75 temas — tecnología, arte, lifestyle, diseño, negocios.',
  },
  {
    num: '04',
    to: '/precios',
    category: 'Planes',
    title: 'Precios',
    titleEm: 'claros',
    blurb: 'Free, Pro y Bootcamp con coach humano. 14 días Pro sin tarjeta.',
  },
  {
    num: '05',
    to: '/faq',
    category: 'Dudas',
    title: 'Preguntas',
    titleEm: 'frecuentes',
    blurb: 'Cómo decidimos tu nivel, qué pasa con tu audio, certificaciones, cancelación.',
  },
]

export function Home() {
  return (
    <LandingLayout meta={META} structuredData={STRUCTURED} current="/">
      <style>{HOME_CSS}</style>

      <section className="home-hero" aria-labelledby="hero-heading">
        <div className="container">
          <div className="home-hero-top">
            <div className="left">
              <span className="issue">N° <b>001</b></span>
              <span className="issue">Edición · LatAm</span>
              <span className="issue">2026</span>
            </div>
            <span className="center">Una conversación al día. Sin profesores, sin exámenes.</span>
            <span className="issue">Plataforma de idiomas con IA</span>
          </div>

          <h1 id="hero-heading" className="home-hero-headline hero-fade-in d1">
            <span className="l">Hablás.</span>
            <span className="l l-grad">Aprendés.</span>
            <span className="l l-light">sin <span className="strike">exámenes</span>.</span>
          </h1>

          <div className="home-hero-meta-row hero-fade-in d3">
            <div className="col-left">
              <span className="label-tag">Premisa</span>
              <p>
                <span className="drop">C</span>inco minutos de conversación al día con un tutor de IA que se adapta a tu
                nivel, tus intereses y los errores que arrastrás. Olvidate de las lecciones lineales.
              </p>
            </div>
            <div className="col-mid">
              <div className="num">05</div>
              <div className="lbl">Minutos al día<br />Sin más.</div>
            </div>
            <div className="col-right">
              <Link to="/login" className="btn btn-primary btn-lg">
                Empezar gratis
                <ArrowRight size={18} strokeWidth={2.4} />
              </Link>
              <Link to="/como-funciona" className="btn btn-ghost btn-sm">
                Ver el método
                <ArrowUpRight size={14} strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee">
        <div className="marquee-track">
          {[1, 2].map((rep) => (
            <div key={rep} style={{ display: 'flex', gap: 56 }}>
              <span className="marquee-item"><span className="dot" /> Inglés</span>
              <span className="marquee-item"><span className="dot" /> Portugués</span>
              <span className="marquee-item"><span className="dot" /> Italiano</span>
              <span className="marquee-item"><span className="dot" /> CEFR A1 a C2</span>
              <span className="marquee-item"><span className="dot" /> Cinco minutos</span>
              <span className="marquee-item"><span className="dot" /> Sin exámenes</span>
              <span className="marquee-item"><span className="dot" /> Tres tutores</span>
              <span className="marquee-item"><span className="dot" /> Conversación real</span>
            </div>
          ))}
        </div>
      </div>

      <section className="editorial-section">
        <div className="container">
          <div className="editorial-grid-2 fade-on-scroll">
            <div className="col-num">01</div>
            <div className="col-text">
              <span className="label-tag">La idea</span>
              <h2>El idioma se aprende <em>hablándolo</em>. Lo demás es teoría.</h2>
              <p>
                Habláh existe porque las apps de idiomas más populares de la última década enseñaron una sola cosa bien:
                a hacer ejercicios. Hablar en serio —entonación, fluidez, equivocarse en vivo y corregirse— pasó a segundo plano.
              </p>
              <p>
                Acá invertimos esa ecuación. Cada sesión es una charla real. La gramática emerge del feedback, no de la pantalla.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="ed-rule" />

      <section className="editorial-section" style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <p className="pillquote fade-on-scroll">
            "Hablás más en una <em>semana</em><br />que en seis meses de <em>cursos</em>."
          </p>
        </div>
      </section>

      <section className="editorial-section">
        <div className="container">
          <div className="editorial-grid-2 fade-on-scroll">
            <div className="col-text">
              <span className="label-tag">El método</span>
              <h2>Diagnóstico continuo. <em>Sin exámenes.</em></h2>
              <p>
                Mientras conversás, un pipeline analiza riqueza léxica, precisión sintáctica, fluidez (palabras por minuto y pausas)
                y precisión fonética. En tres minutos te ubica en el marco europeo CEFR — A1 a C2 — sin que tengas que llenar un solo formulario.
              </p>
              <p>
                Lo que sigue, todos los días: una misión de 5 a 10 minutos calibrada a tu nivel real, no al que dijiste tener.
              </p>
            </div>
            <div className="col-num" style={{ textAlign: 'right' }}>02</div>
          </div>
        </div>
      </section>

<div style={{ background: 'var(--bg-2)', padding: '32px 0', borderTop: '1px solid rgba(13,20,18,.08)', borderBottom: '1px solid rgba(13,20,18,.08)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Timer size={12} /> 01
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--fg-1)' }}>5 min/día</span>
            <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}>Sesiones cortas</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={12} /> 02
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--fg-1)' }}>Cero exámenes</span>
            <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}>Diagnóstico en background</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Gauge size={12} /> 03
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--fg-1)' }}>CEFR A1 a C2</span>
            <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}>Marco europeo</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--fg-3)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Languages size={12} /> 04
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--fg-1)' }}>3 idiomas</span>
            <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-sans)' }}>Inglés, portugués, italiano</span>
          </div>
        </div>
      </div>

      <div className="product-trio">
      <section className="product-section">
        <div className="container">
          <div className="product-grid fade-on-scroll">
            <div className="product-text">
              <span className="label-tag">Pantalla 01 · Hoy</span>
              <div className="stamp">01</div>
              <h2>Una <em>misión nueva</em> cada día. Calibrada a vos.</h2>
              <p>Apenas abrís Habláh, te recibe la pantalla "Hoy" con la charla del día —tópico, tutor, duración estimada— elegida por el sistema según tu nivel real, los tópicos que cargaste y los errores que arrastrás.</p>
              <ul className="feats">
                <li>Misión del día con tópico recomendado</li>
                <li>Rachas y mapa de progreso CEFR</li>
                <li>Botón único · "Empezar charla"</li>
              </ul>
              <Link to="/como-funciona" className="btn btn-dark btn-lg">
                Ver cómo se calibra
                <ArrowUpRight size={18} strokeWidth={2.4} />
              </Link>
            </div>
            <div className="product-screen-wrap">
              <span className="tag">Web app · vista "Hoy"</span>
              <img className="product-screen" src="/landing-screens/mision-hoy.png" alt="Pantalla Hoy de Habláh - misión del día con tópico, tutor y rachas" loading="lazy" width="1280" height="800" />
            </div>
          </div>
        </div>
      </section>

      <section className="product-section dark">
        <div className="container">
          <div className="product-grid flip fade-on-scroll">
            <div className="product-screen-wrap">
              <span className="tag">Web app · "¿De qué charlamos?"</span>
              <img className="product-screen" src="/landing-screens/galaxia-topicos.png" alt="Galaxia de tópicos en Habláh - orbs flotando sobre fondo espacial" loading="lazy" width="1280" height="800" />
            </div>
            <div className="product-text">
              <span className="label-tag">Pantalla 02 · Galaxia</span>
              <div className="stamp">02</div>
              <h2>Elegís de qué hablar. <em>O te sorprendemos.</em></h2>
              <p>Tus tópicos aparecen como orbs flotantes en una galaxia espacial. Tocás uno y empezás. Si no sabés por dónde, el botón "Sorprendéme" elige por vos uno que calce con tus debilidades pendientes.</p>
              <ul className="feats">
                <li>Galaxia inmersiva con tus tópicos</li>
                <li>Modo "Sorprendéme" inteligente</li>
                <li>Tema libre cuando querés improvisar</li>
              </ul>
              <Link to="/topicos" className="btn btn-light btn-lg">
                Ver todos los tópicos
                <ArrowUpRight size={18} strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="product-section dark">
        <div className="container">
          <div className="product-grid fade-on-scroll">
            <div className="product-text">
              <span className="label-tag">Pantalla 03 · Sesión</span>
              <div className="stamp">03</div>
              <h2>Tocás un orb. <em>Empezás a hablar.</em></h2>
              <p>La sesión activa es minimalista por diseño: un orb gigante que palpita al ritmo del tutor, una transcripción en vivo y una barra de mic abajo. Sin menús, sin distracciones. Solo conversación.</p>
              <ul className="feats">
                <li>Streaming de audio en tiempo real</li>
                <li>Transcripción en vivo · ambos lados</li>
                <li>Estilo de tutor seleccionable mid-charla</li>
              </ul>
              <Link to="/tutores" className="btn btn-light btn-lg">
                Conocer los 3 tutores
                <ArrowUpRight size={18} strokeWidth={2.4} />
              </Link>
            </div>
            <div className="product-screen-wrap">
              <span className="tag">Web app · sesión en vivo</span>
              <img className="product-screen" src="/landing-screens/sesion-vivo.png" alt="Sesión en vivo de Habláh - orb gigante palpitando con transcripción" loading="lazy" width="1280" height="800" />
            </div>
          </div>
        </div>
      </section>
      </div>

      <section className="index-section">
        <div className="container">
          <div className="index-top fade-on-scroll">
            <h2>Índice<br /><em>del producto.</em></h2>
            <span className="label-tag">Explorá en orden o saltá</span>
          </div>
          <div className="index-list fade-stagger">
            {INDEX_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} className="index-row">
                <span className="index-num">{item.num}</span>
                <span className="index-title">
                  {item.title} {item.titleEm && <em>{item.titleEm}</em>}
                </span>
                <span className="index-cat">{item.category}</span>
                <span className="index-blurb">{item.blurb}</span>
                <ArrowUpRight size={24} strokeWidth={1.5} className="index-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-editorial">
        <div className="container fade-on-scroll">
          <span className="label-tag">Última página</span>
          <h2>Empezás <em>gratis.</em><br />Pagás cuando te <em>enganche.</em></h2>
          <p>14 días de Pro sin tarjeta. La primera charla se siente rara. La quinta, no podés parar.</p>
          <Link to="/login" className="btn btn-light btn-lg">
            Empezar la primera charla
            <ArrowRight size={18} strokeWidth={2.4} />
          </Link>
        </div>
      </section>
    </LandingLayout>
  )
}

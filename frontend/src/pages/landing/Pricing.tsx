import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import {
  Breadcrumbs,
  LandingLayout,
  RelatedCard,
  breadcrumbList,
  webPageSchema,
  type PageMeta,
} from './_shared'

const META: PageMeta = {
  title: 'Precios · Free, Pro y Bootcamp · Habláh',
  description:
    'Precios de Habláh: Free (US$ 0), Pro (US$ 12 al mes) y Bootcamp con coach humano (US$ 49 al mes). 14 días Pro gratis sin tarjeta. Cancelás cuando quieras.',
  path: '/precios',
}

const STRUCTURED = [
  webPageSchema(META),
  breadcrumbList([
    { name: 'Inicio', path: '/' },
    { name: 'Precios', path: '/precios' },
  ]),
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Habláh Pro',
    description: 'Suscripción a Habláh con charlas ilimitadas, 3 tutores, feedback completo y misiones de rescate.',
    brand: { '@type': 'Brand', name: 'Habláh' },
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      { '@type': 'Offer', name: 'Pro', price: '12', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
      { '@type': 'Offer', name: 'Bootcamp', price: '49', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
    ],
  },
]

const PAGE_CSS = `
.landing-root .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; }
.landing-root .price-card { background: var(--surface); border-radius: var(--r-2xl); padding: 32px; border: 1px solid var(--border-1); display: flex; flex-direction: column; gap: 16px; position: relative; }
.landing-root .price-card.featured { background: var(--ink-1); color: white; border-color: var(--ink-1); transform: scale(1.02); box-shadow: var(--shadow-lift); }
.landing-root .price-card .name { font-size: 14px; font-weight: 700; letter-spacing: .04em; }
.landing-root .price-card .blurb { font-size: 13px; color: var(--fg-3); margin: -8px 0 4px; }
.landing-root .price-card.featured .blurb { color: rgba(232,236,234,.65); }
.landing-root .price-card .price { display: flex; align-items: baseline; gap: 6px; font-variant-numeric: tabular-nums; }
.landing-root .price-card .amount { font-size: 48px; font-weight: 800; letter-spacing: -.025em; line-height: 1; }
.landing-root .price-card .per { font-size: 14px; color: var(--fg-3); }
.landing-root .price-card.featured .per { color: rgba(232,236,234,.65); }
.landing-root .price-card .feats { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.landing-root .price-card .feats li { display: flex; gap: 10px; font-size: 14px; line-height: 1.4; align-items: flex-start; }
.landing-root .price-card .feats li .li-ico { color: var(--primary); flex-shrink: 0; margin-top: 3px; }
.landing-root .price-card .badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--accent); color: #5A3D00; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; }

.landing-root .price-faq { padding-top: 100px; }
.landing-root .price-faq h2 { font-size: clamp(28px, 3.4vw, 39px); line-height: 1.12; letter-spacing: -.02em; font-weight: 800; margin: 0 0 32px; text-align: center; }
.landing-root .price-faq-list { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.landing-root .price-faq-list .item h3 { font-size: 17px; font-weight: 700; margin: 0 0 6px; }
.landing-root .price-faq-list .item p { font-size: 15px; color: var(--fg-3); line-height: 1.5; margin: 0; }

@media (max-width: 880px) {
  .landing-root .pricing-grid { grid-template-columns: 1fr; gap: 16px; }
  .landing-root .price-card.featured { transform: none; }
}
`

export function Pricing() {
  return (
    <LandingLayout meta={META} structuredData={STRUCTURED} current="/precios">
      <style>{PAGE_CSS}</style>

      <Breadcrumbs crumbs={[{ name: 'Inicio', path: '/' }, { name: 'Precios', path: '/precios' }]} />

      <section className="page-hero">
        <div className="container">
          <span className="eyebrow hero-fade-in">Planes</span>
          <h1 className="hero-fade-in d1">Empezás gratis.<br /><em>Pagás cuando te enganche.</em></h1>
          <p className="lead hero-fade-in d2">
            14 días de Pro sin tarjeta. Después elegís el plan que te haga sentido. Sin permanencia, sin letras chicas. Cancelás
            en un toque desde la app y mantenés tu nivel y rachas en el plan Free.
          </p>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="pricing-grid fade-stagger">
            <article className="price-card">
              <div className="name">Free</div>
              <div className="blurb">Para probar y mantener la racha</div>
              <div className="price"><span className="amount">$0</span><span className="per">/ mes</span></div>
              <ul className="feats">
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>1 charla de 5 minutos por día</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Tutor The Coach</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>3 punteros de interés</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Feedback básico</span></li>
              </ul>
              <Link to="/login" className="btn btn-outline btn-block" style={{ marginTop: 'auto' }}>Empezar gratis</Link>
            </article>

            <article className="price-card featured">
              <span className="badge">Más popular</span>
              <div className="name" style={{ color: 'var(--primary)' }}>Pro</div>
              <div className="blurb">Para los que quieren ver progreso real</div>
              <div className="price"><span className="amount">US$ 12</span><span className="per">/ mes</span></div>
              <ul className="feats">
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Charlas ilimitadas</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Los 3 tutores (Coach, Sincerist, Arcade)</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Hasta 5 punteros de interés</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Feedback sincerista completo + audio nativo</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Misiones de rescate · modo insistente</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Mapa de progreso por tema</span></li>
              </ul>
              <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: 'auto' }}>Probar 14 días gratis</Link>
            </article>

            <article className="price-card">
              <div className="name">Bootcamp</div>
              <div className="blurb">Para acelerar fuerte (incluye coach humano)</div>
              <div className="price"><span className="amount">US$ 49</span><span className="per">/ mes</span></div>
              <ul className="feats">
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Todo lo de Pro</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span><b>1 sesión semanal</b> con coach humano</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Templates personalizados</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Plan a medida (objetivo específico)</span></li>
                <li><Check size={16} strokeWidth={2.4} className="li-ico" /><span>Soporte prioritario</span></li>
              </ul>
              <Link to="/login" className="btn btn-outline btn-block" style={{ marginTop: 'auto' }}>Probar 14 días gratis</Link>
            </article>
          </div>

          <div className="price-faq fade-on-scroll">
            <h2>Dudas frecuentes sobre los planes.</h2>
            <div className="price-faq-list">
              <div className="item">
                <h3>¿Puedo cancelar cuando quiera?</h3>
                <p>Sí. Desde la app, en un toque. Sin permanencia. Si cancelás, mantenés tu nivel y rachas; sólo pasás al plan Free.</p>
              </div>
              <div className="item">
                <h3>¿Cómo funcionan los 14 días gratis?</h3>
                <p>Al registrarte arrancás con todas las funciones de Pro durante 14 días, sin pedirte tarjeta. Si no querés seguir, no hacés nada y pasás automáticamente a Free.</p>
              </div>
              <div className="item">
                <h3>¿En qué moneda se cobra?</h3>
                <p>Dólares (USD). Si pagás en moneda local, tu banco aplica la conversión + IVA / impuestos según el país.</p>
              </div>
              <div className="item">
                <h3>¿Bootcamp es solo online?</h3>
                <p>Sí. La sesión semanal con coach humano se hace por video y dura 45 minutos. Los coaches son nativos o C2 certificados.</p>
              </div>
              <div className="item">
                <h3>¿Hay descuentos por año?</h3>
                <p>Sí. Pagando anual ahorrás 2 meses (efectivo ~17% off). Se ve al hacer checkout dentro de la app.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-final" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: 'white', padding: '100px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="container fade-on-scroll">
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 49px)', fontWeight: 800, letterSpacing: '-.03em', margin: '0 0 16px' }}>14 días Pro, sin tarjeta.</h2>
          <p style={{ fontSize: 'var(--t-xl)', opacity: .9, maxWidth: 540, margin: '0 auto 32px' }}>Probás todo. Si no te enganchó, pasás a Free sin perder nada de tu progreso.</p>
          <Link to="/login" className="btn btn-light btn-lg">
            Empezar gratis
            <ArrowRight size={18} strokeWidth={2.4} />
          </Link>
        </div>
      </section>

      <section className="related">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <h2>Seguí explorando.</h2>
          </div>
          <div className="related-grid fade-stagger">
            <RelatedCard to="/como-funciona" eyebrow="Metodología" title="Cómo funciona" description="El método detrás de los planes: diagnóstico, CEFR, conversación diaria y feedback sincerista." />
            <RelatedCard to="/tutores" eyebrow="Personalidades" title="Tutores de IA" description="Free trae solo The Coach. Pro y Bootcamp habilitan los 3 tutores." />
            <RelatedCard to="/faq" eyebrow="Dudas" title="FAQ general" description="Cómo decidimos tu nivel, qué pasa con tu audio, certificaciones y más." />
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

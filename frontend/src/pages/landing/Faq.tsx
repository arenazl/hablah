import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'
import {
  Breadcrumbs,
  FAQ_ITEMS,
  LandingLayout,
  RelatedCard,
  breadcrumbList,
  webPageSchema,
  type PageMeta,
} from './_shared'

const META: PageMeta = {
  title: 'Preguntas frecuentes · FAQ · Habláh',
  description:
    'Respuestas a las preguntas más frecuentes sobre Habláh: cómo se decide tu nivel sin examen, qué pasa con tu audio, qué idiomas hay disponibles, si sirve para TOEFL e IELTS y cómo cancelar Pro.',
  path: '/faq',
}

const STRUCTURED = [
  webPageSchema(META),
  breadcrumbList([
    { name: 'Inicio', path: '/' },
    { name: 'FAQ', path: '/faq' },
  ]),
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  },
]

const PAGE_CSS = `
.landing-root .faq-list { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 6px; }
.landing-root .faq-item { background: var(--surface); border-radius: var(--r-lg); border: 1px solid var(--border-1); overflow: hidden; }
.landing-root .faq-item details summary { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; font-weight: 600; font-size: 16px; cursor: pointer; list-style: none; gap: 16px; }
.landing-root .faq-item details summary::-webkit-details-marker { display: none; }
.landing-root .faq-item details summary .chev { color: var(--fg-3); transition: transform .25s var(--ease); flex-shrink: 0; }
.landing-root .faq-item details[open] summary .chev { transform: rotate(180deg); color: var(--primary-dark); }
.landing-root .faq-item details p { padding: 0 20px 18px; margin: 0; color: var(--fg-3); font-size: 15px; line-height: 1.5; }
`

export function Faq() {
  return (
    <LandingLayout meta={META} structuredData={STRUCTURED} current="/faq">
      <style>{PAGE_CSS}</style>

      <Breadcrumbs crumbs={[{ name: 'Inicio', path: '/' }, { name: 'FAQ', path: '/faq' }]} />

      <section className="page-hero">
        <div className="container">
          <span className="eyebrow hero-fade-in">Dudas frecuentes</span>
          <h1 className="hero-fade-in d1">Preguntas que<br /><em>recibimos seguido.</em></h1>
          <p className="lead hero-fade-in d2">
            Si no encontrás tu respuesta acá, escribinos. Las respuestas más comunes están listadas abajo y se actualizan
            seguido según lo que nos pregunta la gente.
          </p>
        </div>
      </section>

      <section style={{ background: 'var(--bg-2)' }}>
        <div className="container">
          <div className="faq-list fade-stagger">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q} className="faq-item">
                <details>
                  <summary>
                    {item.q}
                    <ChevronDown size={20} strokeWidth={2} className="chev" />
                  </summary>
                  <p>{item.a}</p>
                </details>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: 'white', padding: '100px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="container fade-on-scroll">
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 49px)', fontWeight: 800, letterSpacing: '-.03em', margin: '0 0 16px' }}>Listo para probar.</h2>
          <p style={{ fontSize: 'var(--t-xl)', opacity: .9, maxWidth: 540, margin: '0 auto 32px' }}>14 días Pro sin tarjeta. La primera charla se siente rara. La quinta, no podés parar.</p>
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
            <RelatedCard to="/como-funciona" eyebrow="Metodología" title="Cómo funciona" description="El detalle técnico del diagnóstico, el marco CEFR y el feedback al final de cada charla." />
            <RelatedCard to="/precios" eyebrow="Planes" title="Precios" description="Free, Pro o Bootcamp. 14 días Pro sin tarjeta y FAQ específico de planes." />
            <RelatedCard to="/tutores" eyebrow="Personalidades" title="Tutores de IA" description="Conocé Coach, Sincerist y Arcade para elegir cuál te conviene." />
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

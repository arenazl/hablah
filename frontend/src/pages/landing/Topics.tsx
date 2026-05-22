import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  Breadcrumbs,
  LandingLayout,
  RelatedCard,
  breadcrumbList,
  webPageSchema,
  type PageMeta,
} from './_shared'

const META: PageMeta = {
  title: 'Tópicos · Hablá de lo que te interesa · Habláh',
  description:
    'Más de 75 tópicos curados por Habláh para que aprendas un idioma conversando sobre lo que te interesa de verdad: tecnología, arte, lifestyle, diseño, negocios. Elegís 4 a 5 punteros y son el combustible de cada charla.',
  path: '/topicos',
}

const STRUCTURED = [
  webPageSchema(META),
  breadcrumbList([
    { name: 'Inicio', path: '/' },
    { name: 'Tópicos', path: '/topicos' },
  ]),
]

const PAGE_CSS = `
.landing-root .topics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.landing-root .topic-card { background: var(--surface); border-radius: var(--r-xl); padding: 24px; border: 1px solid var(--border-1); transition: all .2s var(--ease); }
.landing-root .topic-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card); border-color: var(--primary-tint); }
.landing-root .topic-card .cat { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--primary-dark); margin-bottom: 8px; }
.landing-root .topic-card h3 { font-size: 17px; font-weight: 700; margin: 0 0 16px; line-height: 1.25; color: var(--fg-1); }
.landing-root .topic-card .tags { display: flex; flex-wrap: wrap; gap: 4px; }
.landing-root .topic-card .tags span { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--bg-2); color: var(--fg-3); }
.landing-root .topics-more { text-align: center; margin-top: 40px; font-size: 15px; color: var(--fg-3); }
.landing-root .topics-more b { color: var(--fg-1); }
.landing-root .topics-category-head { font-size: var(--t-lg); font-weight: 700; letter-spacing: -.015em; margin: 48px 0 20px; color: var(--fg-1); }
.landing-root .topics-category-head:first-of-type { margin-top: 0; }

@media (max-width: 880px) {
  .landing-root .topics-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .landing-root .topics-grid { grid-template-columns: 1fr; }
}
`

interface Topic {
  category: string
  title: string
  tags: string[]
}

const TOPICS_BY_CATEGORY: Record<string, Topic[]> = {
  'Tecnología y Desarrollo': [
    { category: 'Tecnología', title: 'Arquitectura de software', tags: ['microservicios', 'DDD', 'event sourcing'] },
    { category: 'Tecnología', title: 'IA generativa y ética', tags: ['RLHF', 'bias', 'regulación'] },
    { category: 'Tecnología', title: 'Desarrollo móvil', tags: ['iOS', 'Android', 'cross-platform'] },
    { category: 'Tecnología', title: 'DevOps y observabilidad', tags: ['Kubernetes', 'tracing', 'SRE'] },
  ],
  'Arte y Entretenimiento': [
    { category: 'Arte', title: 'Música electrónica · UK Garage', tags: ['two-step', 'sub-bass', 'producción'] },
    { category: 'Arte', title: 'Cine de los 90', tags: ['Tarantino', 'indie', 'noir'] },
    { category: 'Arte', title: 'Producción musical en casa', tags: ['DAWs', 'mixing', 'sampling'] },
    { category: 'Arte', title: 'Series y narrativa contemporánea', tags: ['HBO', 'A24', 'streaming'] },
  ],
  'Estilo de Vida y Hábitos': [
    { category: 'Lifestyle', title: 'Entrenamiento de fuerza', tags: ['powerlifting', 'nutrición', 'recovery'] },
    { category: 'Lifestyle', title: 'Nutrición y suplementación', tags: ['proteínas', 'micronutrientes', 'timing'] },
    { category: 'Lifestyle', title: 'Viajes internacionales', tags: ['aeropuertos', 'cultura', 'nómadas'] },
    { category: 'Lifestyle', title: 'Sleep y productividad', tags: ['ritmo circadiano', 'foco', 'rutinas'] },
  ],
  'Diseño y Construcción': [
    { category: 'Diseño', title: 'Arquitectura residencial', tags: ['hormigón visto', 'plantas', 'materialidad'] },
    { category: 'Diseño', title: 'Diseño industrial warm', tags: ['ergonomía', 'CMF', 'sustentabilidad'] },
    { category: 'Diseño', title: 'UI/UX para productos digitales', tags: ['design systems', 'micro-interacciones', 'tokens'] },
    { category: 'Diseño', title: 'Branding y identidad visual', tags: ['tipografía', 'tono', 'voice'] },
  ],
  'Negocios y Carrera': [
    { category: 'Negocios', title: 'Metodologías ágiles', tags: ['retros', 'OKRs', 'scrum'] },
    { category: 'Negocios', title: 'Producto y discovery', tags: ['entrevistas', 'jobs to be done', 'roadmap'] },
    { category: 'Negocios', title: 'Finanzas personales', tags: ['inversiones', 'cripto', 'jubilación'] },
    { category: 'Negocios', title: 'Entrevistas laborales', tags: ['STAR', 'salario', 'cultura'] },
  ],
}

export function Topics() {
  return (
    <LandingLayout meta={META} structuredData={STRUCTURED} current="/topicos">
      <style>{PAGE_CSS}</style>

      <Breadcrumbs crumbs={[{ name: 'Inicio', path: '/' }, { name: 'Tópicos', path: '/topicos' }]} />

      <section className="page-hero">
        <div className="container">
          <span className="eyebrow hero-fade-in">Contenido</span>
          <h1 className="hero-fade-in d1">Hablás de lo que te interesa.<br /><em>Punto.</em></h1>
          <p className="lead hero-fade-in d2">
            En el onboarding elegís de 4 a 5 punteros de interés. Son el combustible de todas tus conversaciones futuras.
            Si tu tema no está, lo agregamos. Más de 75 tópicos activos, organizados por categoría.
          </p>
          <div className="actions hero-fade-in d3">
            <Link to="/login" className="btn btn-primary btn-lg">
              Elegir mis tópicos
              <ArrowRight size={18} strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          {Object.entries(TOPICS_BY_CATEGORY).map(([category, topics]) => (
            <div key={category} className="fade-on-scroll">
              <h2 className="topics-category-head">{category}</h2>
              <div className="topics-grid fade-stagger">
                {topics.map((t) => (
                  <article key={t.title} className="topic-card">
                    <div className="cat">{t.category}</div>
                    <h3>{t.title}</h3>
                    <div className="tags">
                      {t.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
          <p className="topics-more fade-on-scroll">+ 55 tópicos más en la app. ¿No está el tuyo? <b>Lo agregamos.</b></p>
        </div>
      </section>

      <section className="related">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <h2>Seguí explorando.</h2>
          </div>
          <div className="related-grid fade-stagger">
            <RelatedCard to="/como-funciona" eyebrow="Metodología" title="Cómo funciona" description="Cómo combinamos tus tópicos con tu nivel y errores para armar cada conversación." />
            <RelatedCard to="/tutores" eyebrow="Personalidades" title="Tutores de IA" description="Tres personalidades distintas — cualquiera puede usar tus tópicos elegidos." />
            <RelatedCard to="/precios" eyebrow="Planes" title="Precios" description="Free trae 3 tópicos, Pro hasta 5 y Bootcamp ilimitados." />
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

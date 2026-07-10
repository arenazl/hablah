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
import { TOPICS_INDEX, type TopicIndexEntry } from './topicsIndex.generated'

const META: PageMeta = {
  title: `Tópicos · Hablá de lo que te interesa · Habláh`,
  description: `Más de ${TOPICS_INDEX.length} tópicos curados por Habláh para que aprendas un idioma conversando sobre lo que te interesa de verdad: tecnología, arte, deportes, gastronomía, ciencia, lifestyle, viajes, negocios y un flujo separado para chicos. Elegís tus punteros y son el combustible de cada charla.`,
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
.landing-root .topic-card { display: flex; flex-direction: column; background: var(--surface); border-radius: var(--r-xl); overflow: hidden; border: 1px solid var(--border-1); transition: transform .25s var(--ease), box-shadow .25s var(--ease), border-color .25s var(--ease); text-decoration: none; color: inherit; position: relative; will-change: transform; }
.landing-root .topic-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lift); border-color: var(--primary-tint); }
.landing-root .topic-card:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }

.landing-root .topic-card-photo { position: relative; aspect-ratio: 3 / 2; overflow: hidden; background: linear-gradient(135deg, var(--bg-3) 0%, var(--bg-2) 100%); }
.landing-root .topic-card-photo img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s var(--ease); }
.landing-root .topic-card:hover .topic-card-photo img { transform: scale(1.06); }
.landing-root .topic-card-grad { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,20,18,0) 32%, rgba(13,20,18,.82) 100%); }
.landing-root .topic-card-cat { position: absolute; top: 12px; left: 12px; z-index: 1; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: white; background: rgba(0,143,99,.92); padding: 5px 11px; border-radius: var(--r-pill); }
.landing-root .topic-card-title { position: absolute; left: 16px; right: 16px; bottom: 13px; z-index: 1; font-size: 17px; font-weight: 800; line-height: 1.15; letter-spacing: -.01em; color: white; margin: 0; text-shadow: 0 1px 14px rgba(0,0,0,.45); }

.landing-root .topic-card-foot { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px 16px; }
.landing-root .topic-card-foot .tags { display: flex; flex-wrap: wrap; gap: 5px; }
.landing-root .topic-card-foot .tags span { font-size: 11px; padding: 3px 9px; border-radius: 999px; background: var(--bg-2); color: var(--fg-3); }
.landing-root .topic-card-foot .go { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--primary-dark); }
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

// Orden de las secciones de la grilla. Las categorias de adultos van por su
// category real; TODOS los topicos de audience "kid" (sin importar su category
// cruda en la DB — kids/tech/videojuegos) se agrupan en una sola seccion final
// que linkea al flujo /kids, no a /login (WO F5-02: "los topicos kids linkean
// al flujo kids").
const ADULT_CATEGORY_ORDER: ReadonlyArray<string> = [
  'tech', 'musica', 'arte', 'entretenimiento', 'videojuegos', 'deportes', 'fitness',
  'gastronomia', 'comida', 'ciencia', 'animales', 'lifestyle', 'moda', 'viajes',
  'negocios', 'general',
]

interface CategoryGroup {
  key: string
  label: string
  isKids: boolean
  topics: ReadonlyArray<TopicIndexEntry>
}

function groupTopics(items: ReadonlyArray<TopicIndexEntry>): CategoryGroup[] {
  const adult = items.filter((t) => t.audience !== 'kid')
  const kids = items.filter((t) => t.audience === 'kid')

  const byCategory = new Map<string, TopicIndexEntry[]>()
  for (const t of adult) {
    const bucket = byCategory.get(t.category) ?? []
    bucket.push(t)
    byCategory.set(t.category, bucket)
  }

  const groups: CategoryGroup[] = ADULT_CATEGORY_ORDER.filter((key) => byCategory.has(key)).map((key) => {
    const topics = byCategory.get(key) ?? []
    return { key, label: topics[0]?.categoryLabel ?? key, isKids: false, topics }
  })

  if (kids.length > 0) {
    groups.push({ key: 'kids', label: 'Para chicos', isKids: true, topics: kids })
  }

  return groups
}

export function Topics() {
  const groups = groupTopics(TOPICS_INDEX)

  return (
    <LandingLayout meta={META} structuredData={STRUCTURED} current="/topicos">
      <style>{PAGE_CSS}</style>

      <Breadcrumbs crumbs={[{ name: 'Inicio', path: '/' }, { name: 'Tópicos', path: '/topicos' }]} />

      <section className="page-hero">
        <div className="container">
          <span className="eyebrow hero-fade-in">Contenido</span>
          <h1 className="hero-fade-in d1">Hablás de lo que te interesa.<br /><em>Punto.</em></h1>
          <p className="lead hero-fade-in d2">
            En el onboarding elegís tus punteros de interés. Son el combustible de todas tus conversaciones futuras.
            Si tu tema no está, lo agregamos. {TOPICS_INDEX.length} tópicos activos, organizados por categoría.
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
          {groups.map((group) => (
            <div key={group.key} className="fade-on-scroll">
              <h2 className="topics-category-head">{group.label}</h2>
              <div className="topics-grid fade-stagger">
                {group.topics.map((topic) => {
                  const href = `/topicos/${topic.slug}`
                  return (
                    <Link
                      key={topic.id}
                      to={href}
                      className="topic-card"
                      aria-label={`Ver tópico: ${topic.title}`}
                    >
                      <div className="topic-card-photo">
                        <div className="topic-card-grad" />
                        <span className="topic-card-cat">{group.isKids ? topic.segmento : topic.categoryLabel}</span>
                        <h3 className="topic-card-title">{topic.title}</h3>
                      </div>
                      <div className="topic-card-foot">
                        <div className="tags">
                          {topic.keywords.slice(0, 3).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                        <span className="go">
                          Ver tópico
                          <ArrowRight size={14} strokeWidth={2.4} />
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
          <p className="topics-more fade-on-scroll">
            <b>{TOPICS_INDEX.length} tópicos</b> activos hoy — se suman con cada curación nueva. ¿No está el tuyo? <b>Lo agregamos.</b>
          </p>
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
            <RelatedCard to="/precios" eyebrow="Planes" title="Precios" description="Free trae sesiones limitadas, Pro no tiene límite. 14 días Pro gratis." />
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

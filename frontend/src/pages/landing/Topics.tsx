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
    'Más de 75 tópicos curados por Habláh para que aprendas un idioma conversando sobre lo que te interesa de verdad: tecnología, arte, deportes, gastronomía, ciencia, lifestyle, viajes y negocios. Elegís 4 a 5 punteros y son el combustible de cada charla.',
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

.landing-root .topic-card-photo { position: relative; aspect-ratio: 3 / 2; overflow: hidden; background: var(--bg-3); }
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

interface Topic {
  id: number
  title: string
  category: string
  categoryLabel: string
  tags: string[]
}

const CATEGORY_LABEL: Record<string, string> = {
  tech: 'Tecnología',
  arte: 'Arte',
  lifestyle: 'Lifestyle',
  viajes: 'Viajes',
  deportes: 'Deportes',
  gastronomia: 'Gastronomía',
  ciencia: 'Ciencia',
  negocios: 'Negocios',
}

const CATEGORY_SECTION: Record<string, string> = {
  tech: 'Tecnología y desarrollo',
  arte: 'Arte y entretenimiento',
  lifestyle: 'Estilo de vida y hábitos',
  viajes: 'Viajes y cultura',
  deportes: 'Deportes y competencia',
  gastronomia: 'Cocina y bebidas',
  ciencia: 'Ciencia y conocimiento',
  negocios: 'Negocios y carrera',
}

const CATEGORY_ORDER: string[] = [
  'tech',
  'arte',
  'deportes',
  'gastronomia',
  'ciencia',
  'lifestyle',
  'viajes',
  'negocios',
]

const TOPICS: Topic[] = [
  { id: 1, title: 'Música electrónica – UK Garage', category: 'arte', categoryLabel: 'Arte', tags: ['two-step', 'sub-bass', 'producción'] },
  { id: 2, title: 'Arquitectura de software', category: 'tech', categoryLabel: 'Tecnología', tags: ['microservicios', 'DDD', 'event sourcing'] },
  { id: 3, title: 'Producción musical – Ableton', category: 'arte', categoryLabel: 'Arte', tags: ['Ableton Live', 'mixing', 'sampling'] },
  { id: 4, title: 'IA generativa – ética', category: 'tech', categoryLabel: 'Tecnología', tags: ['RLHF', 'bias', 'regulación'] },
  { id: 5, title: 'Entrenamiento de fuerza – powerlifting', category: 'lifestyle', categoryLabel: 'Lifestyle', tags: ['powerlifting', 'sentadilla', 'recovery'] },
  { id: 6, title: 'Metodologías ágiles – retrospectivas', category: 'tech', categoryLabel: 'Tecnología', tags: ['retros', 'scrum', 'OKRs'] },
  { id: 7, title: 'Cine de los 90 – Tarantino', category: 'arte', categoryLabel: 'Arte', tags: ['Tarantino', 'indie', 'noir'] },
  { id: 8, title: 'Anécdotas de aeropuertos', category: 'viajes', categoryLabel: 'Viajes', tags: ['layovers', 'fronteras', 'jetlag'] },
  { id: 9, title: 'Fútbol – Mundiales y selecciones', category: 'deportes', categoryLabel: 'Deportes', tags: ['Mundial', 'selecciones', 'tácticas'] },
  { id: 10, title: 'Básquet – NBA y leyendas', category: 'deportes', categoryLabel: 'Deportes', tags: ['NBA', 'leyendas', 'playoffs'] },
  { id: 11, title: 'Running – entrenamiento y maratones', category: 'deportes', categoryLabel: 'Deportes', tags: ['maratón', 'ritmo', 'series'] },
  { id: 12, title: 'Tenis – Grand Slam y rivalidades', category: 'deportes', categoryLabel: 'Deportes', tags: ['Grand Slam', 'rivalidades', 'ATP'] },
  { id: 13, title: 'Fórmula 1 y automovilismo', category: 'deportes', categoryLabel: 'Deportes', tags: ['F1', 'circuitos', 'estrategia'] },
  { id: 14, title: 'Cocina italiana – pasta y vinos', category: 'gastronomia', categoryLabel: 'Gastronomía', tags: ['pasta', 'vinos', 'regional'] },
  { id: 15, title: 'Asado argentino – técnica y rituales', category: 'gastronomia', categoryLabel: 'Gastronomía', tags: ['parrilla', 'cortes', 'ritual'] },
  { id: 16, title: 'Café de especialidad – v60, espresso', category: 'gastronomia', categoryLabel: 'Gastronomía', tags: ['v60', 'espresso', 'origen'] },
  { id: 17, title: 'Espacio – astronomía y misiones', category: 'ciencia', categoryLabel: 'Ciencia', tags: ['NASA', 'exoplanetas', 'misiones'] },
  { id: 18, title: 'Cambio climático – ciencia y políticas', category: 'ciencia', categoryLabel: 'Ciencia', tags: ['IPCC', 'energía', 'políticas'] },
  { id: 19, title: 'Biología – evolución y genética', category: 'ciencia', categoryLabel: 'Ciencia', tags: ['evolución', 'CRISPR', 'genoma'] },
  { id: 20, title: 'Series de streaming – drama prestigio', category: 'arte', categoryLabel: 'Arte', tags: ['HBO', 'A24', 'showrunners'] },
  { id: 21, title: 'Videojuegos – indie y AAA', category: 'arte', categoryLabel: 'Arte', tags: ['indie', 'AAA', 'narrativa'] },
  { id: 22, title: 'Rock clásico – 70s a 90s', category: 'arte', categoryLabel: 'Arte', tags: ['Zeppelin', 'grunge', 'vinilo'] },
  { id: 23, title: 'Stand-up – comediantes y especiales', category: 'arte', categoryLabel: 'Arte', tags: ['stand-up', 'especiales', 'crowd work'] },
  { id: 24, title: 'Meditación y mindfulness', category: 'lifestyle', categoryLabel: 'Lifestyle', tags: ['mindfulness', 'respiración', 'foco'] },
  { id: 25, title: 'Nutrición – dietas y mitos', category: 'lifestyle', categoryLabel: 'Lifestyle', tags: ['proteínas', 'mitos', 'macros'] },
  { id: 26, title: 'Moda – streetwear y sneakers', category: 'lifestyle', categoryLabel: 'Lifestyle', tags: ['streetwear', 'sneakers', 'drops'] },
  { id: 27, title: 'Trabajo remoto – nómade digital', category: 'negocios', categoryLabel: 'Negocios', tags: ['remoto', 'visa nómade', 'async'] },
  { id: 28, title: 'Entrevistas técnicas – system design', category: 'negocios', categoryLabel: 'Negocios', tags: ['system design', 'algoritmos', 'STAR'] },
]

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Foto real por tópico (IDs de Pexels, fotos libres para uso comercial).
// Conseguidas via Pexels API por búsqueda temática. La URL se sirve desde el
// CDN de Pexels con compresión + crop, ~30-60kb cada una.
const TOPIC_PHOTO_ID: Record<string, number> = {
  'musica-electronica-uk-garage': 9005483,
  'arquitectura-de-software': 6424583,
  'produccion-musical-ableton': 35307143,
  'ia-generativa-etica': 8386440,
  'entrenamiento-de-fuerza-powerlifting': 19025671,
  'metodologias-agiles-retrospectivas': 17724731,
  'cine-de-los-90-tarantino': 7234225,
  'anecdotas-de-aeropuertos': 16562841,
  'futbol-mundiales-y-selecciones': 33827014,
  'basquet-nba-y-leyendas': 36409327,
  'running-entrenamiento-y-maratones': 10313668,
  'tenis-grand-slam-y-rivalidades': 5739120,
  'formula-1-y-automovilismo': 28680795,
  'cocina-italiana-pasta-y-vinos': 546945,
  'asado-argentino-tecnica-y-rituales': 8491090,
  'cafe-de-especialidad-v60-espresso': 5461657,
  'espacio-astronomia-y-misiones': 34764650,
  'cambio-climatico-ciencia-y-politicas': 452690,
  'biologia-evolucion-y-genetica': 8442110,
  'series-de-streaming-drama-prestigio': 7991318,
  'videojuegos-indie-y-aaa': 7773745,
  'rock-clasico-70s-a-90s': 28096553,
  'stand-up-comediantes-y-especiales': 1840320,
  'meditacion-y-mindfulness': 14864078,
  'nutricion-dietas-y-mitos': 8805183,
  'moda-streetwear-y-sneakers': 4061385,
  'trabajo-remoto-nomade-digital': 5721015,
  'entrevistas-tecnicas-system-design': 5439481,
}

function topicPhoto(slug: string, w = 600, h = 400): string | null {
  const id = TOPIC_PHOTO_ID[slug]
  if (!id) return null
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`
}

interface CategoryGroup {
  key: string
  label: string
  topics: Topic[]
}

function groupByCategory(items: ReadonlyArray<Topic>): CategoryGroup[] {
  const groups = new Map<string, Topic[]>()
  for (const item of items) {
    const bucket = groups.get(item.category) ?? []
    bucket.push(item)
    groups.set(item.category, bucket)
  }
  return CATEGORY_ORDER.filter((key) => groups.has(key)).map((key) => ({
    key,
    label: CATEGORY_SECTION[key] ?? CATEGORY_LABEL[key] ?? key,
    topics: groups.get(key) ?? [],
  }))
}

export function Topics() {
  const groups = groupByCategory(TOPICS)

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
          {groups.map((group) => (
            <div key={group.key} className="fade-on-scroll">
              <h2 className="topics-category-head">{group.label}</h2>
              <div className="topics-grid fade-stagger">
                {group.topics.map((topic) => {
                  const slug = slugify(topic.title)
                  const photo = topicPhoto(slug)
                  return (
                    <Link
                      key={topic.id}
                      to={`/topicos/${slug}`}
                      className="topic-card"
                      aria-label={`Ver tópico: ${topic.title}`}
                    >
                      <div className="topic-card-photo">
                        {photo && (
                          <img src={photo} alt={topic.title} loading="lazy" width={600} height={400} />
                        )}
                        <div className="topic-card-grad" />
                        <span className="topic-card-cat">{topic.categoryLabel}</span>
                        <h3 className="topic-card-title">{topic.title}</h3>
                      </div>
                      <div className="topic-card-foot">
                        <div className="tags">
                          {topic.tags.slice(0, 3).map((tag) => (
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

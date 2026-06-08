import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import {
  Breadcrumbs,
  LandingLayout,
  RelatedCard,
  breadcrumbList,
  type PageMeta,
} from './_shared'

export interface PublicTopic {
  id: number
  title: string
  category: string
  keywords: ReadonlyArray<string>
  /** Meta description única (140-160 chars) para el snippet de Google. */
  metaDescription: string
}

// Hardcoded list (sourced from the topics DB research snapshot). Keep in sync.
export const TOPICS_PUBLIC: ReadonlyArray<PublicTopic> = [
  { id: 1, title: 'Música electrónica – UK Garage', category: 'arte', keywords: ['two-step', 'sub-bass', 'producción', 'DJ', 'underground'], metaDescription: 'Practicá inglés hablando de UK garage, two-step y sub-bass con un tutor de IA. Aprendé el vocabulario real de productores y DJs del underground británico.' },
  { id: 2, title: 'Arquitectura de software', category: 'tech', keywords: ['microservicios', 'DDD', 'event sourcing', 'patrones', 'escalabilidad'], metaDescription: 'Practicá inglés técnico hablando de microservicios, DDD y escalabilidad con un tutor de IA. El vocabulario que se usa en code reviews y entrevistas reales.' },
  { id: 3, title: 'Producción musical – Ableton', category: 'arte', keywords: ['DAW', 'mixing', 'sampling', 'sound design', 'arreglos'], metaDescription: 'Hablá inglés sobre producción en Ableton: mixing, sampling y sound design, con un tutor de IA que te enseña los términos que usan los productores.' },
  { id: 4, title: 'IA generativa – ética', category: 'tech', keywords: ['RLHF', 'bias', 'regulación', 'alineamiento', 'derechos'], metaDescription: 'Practicá inglés debatiendo ética de la IA: bias, alineamiento y regulación, con un tutor de IA que te da el vocabulario de los papers y las charlas técnicas.' },
  { id: 5, title: 'Entrenamiento de fuerza – powerlifting', category: 'lifestyle', keywords: ['sentadilla', 'peso muerto', 'press banca', 'periodización', 'recovery'], metaDescription: 'Hablá inglés de powerlifting con un tutor de IA: sentadilla, peso muerto, periodización y recovery. El vocabulario real del gym y los coaches de fuerza.' },
  { id: 6, title: 'Metodologías ágiles – retrospectivas', category: 'tech', keywords: ['scrum', 'retros', 'OKRs', 'sprint', 'kanban'], metaDescription: 'Practicá inglés de trabajo hablando de scrum, retros y OKRs con un tutor de IA. El vocabulario que necesitás para dailies y ceremonias ágiles.' },
  { id: 7, title: 'Cine de los 90 – Tarantino', category: 'arte', keywords: ['Pulp Fiction', 'noir', 'diálogo', 'banda sonora', 'indie'], metaDescription: 'Hablá inglés sobre cine de los 90 y Tarantino con un tutor de IA: diálogo, noir y banda sonora. Aprendé a opinar de películas como un crítico.' },
  { id: 8, title: 'Anécdotas de aeropuertos', category: 'viajes', keywords: ['layovers', 'conexiones', 'aduana', 'cultural shock', 'jet lag'], metaDescription: 'Practicá inglés de viajes con un tutor de IA: layovers, conexiones, aduana y jet lag. El vocabulario que sí vas a usar en tu próximo vuelo.' },
  { id: 9, title: 'Fútbol – Mundiales y selecciones', category: 'deportes', keywords: ['Messi', 'Maradona', 'táctica', 'Qatar', 'Brasil'], metaDescription: 'Hablá inglés de fútbol con un tutor de IA: Mundiales, tácticas y selecciones. Aprendé a discutir de Messi, Maradona y Brasil como un hincha bilingüe.' },
  { id: 10, title: 'Básquet – NBA y leyendas', category: 'deportes', keywords: ['Jordan', 'LeBron', 'playoffs', 'triples', 'draft'], metaDescription: 'Practicá inglés hablando de la NBA con un tutor de IA: Jordan, LeBron, playoffs y draft. El vocabulario de los analistas y los fanáticos del básquet.' },
  { id: 11, title: 'Running – entrenamiento y maratones', category: 'deportes', keywords: ['ritmo', 'fondos', 'series', 'zapatillas', 'maratón'], metaDescription: 'Hablá inglés de running con un tutor de IA: ritmo, series, fondos y maratón. Aprendé los términos que usan corredores y entrenadores de verdad.' },
  { id: 12, title: 'Tenis – Grand Slam y rivalidades', category: 'deportes', keywords: ['Federer', 'Nadal', 'Djokovic', 'Wimbledon', 'tierra batida'], metaDescription: 'Practicá inglés de tenis con un tutor de IA: Federer, Nadal, Djokovic y los Grand Slam. El vocabulario para seguir y comentar cada partido.' },
  { id: 13, title: 'Fórmula 1 y automovilismo', category: 'deportes', keywords: ['paddock', 'estrategia', 'neumáticos', 'pole position', 'DRS'], metaDescription: 'Hablá inglés de Fórmula 1 con un tutor de IA: estrategia, neumáticos, pole position y DRS. Aprendé el vocabulario del paddock y las transmisiones.' },
  { id: 14, title: 'Cocina italiana – pasta y vinos', category: 'gastronomia', keywords: ['al dente', 'maridaje', 'risotto', 'Toscana', 'denominación'], metaDescription: 'Practicá inglés hablando de cocina italiana con un tutor de IA: pasta al dente, risotto y maridaje de vinos. El vocabulario de la gastronomía real.' },
  { id: 15, title: 'Asado argentino – técnica y rituales', category: 'gastronomia', keywords: ['parrilla', 'achuras', 'fuego', 'cortes', 'chimichurri'], metaDescription: 'Hablá inglés sobre el asado argentino con un tutor de IA: parrilla, cortes, achuras y fuego. Aprendé a explicar nuestro ritual a cualquier extranjero.' },
  { id: 16, title: 'Café de especialidad – v60, espresso', category: 'gastronomia', keywords: ['extracción', 'grano', 'tueste', 'barista', 'latte art'], metaDescription: 'Practicá inglés de café de especialidad con un tutor de IA: extracción, tueste, espresso y v60. El vocabulario de baristas y cafés de tercera ola.' },
  { id: 17, title: 'Espacio – astronomía y misiones', category: 'ciencia', keywords: ['NASA', 'SpaceX', 'exoplanetas', 'James Webb', 'Marte'], metaDescription: 'Hablá inglés de astronomía con un tutor de IA: NASA, SpaceX, exoplanetas y el James Webb. Aprendé el vocabulario de las misiones y los descubrimientos.' },
  { id: 18, title: 'Cambio climático – ciencia y políticas', category: 'ciencia', keywords: ['carbono', 'energías renovables', 'IPCC', 'COP', 'mitigación'], metaDescription: 'Practicá inglés sobre cambio climático con un tutor de IA: carbono, renovables, IPCC y mitigación. El vocabulario de la ciencia y las políticas globales.' },
  { id: 19, title: 'Biología – evolución y genética', category: 'ciencia', keywords: ['CRISPR', 'ADN', 'selección natural', 'células', 'darwinismo'], metaDescription: 'Hablá inglés de biología con un tutor de IA: evolución, CRISPR, ADN y selección natural. Aprendé el vocabulario de la genética y la ciencia de la vida.' },
  { id: 20, title: 'Series de streaming – drama prestigio', category: 'arte', keywords: ['HBO', 'showrunner', 'guion', 'A24', 'antihéroe'], metaDescription: 'Practicá inglés hablando de series con un tutor de IA: HBO, A24, showrunners y antihéroes. Aprendé a discutir guiones y personajes como un crítico.' },
  { id: 21, title: 'Videojuegos – indie y AAA', category: 'arte', keywords: ['game design', 'narrativa', 'Steam', 'speedrun', 'rogue-like'], metaDescription: 'Hablá inglés de videojuegos con un tutor de IA: game design, narrativa, indie y AAA. El vocabulario de la comunidad gamer y la industria.' },
  { id: 22, title: 'Rock clásico – 70s a 90s', category: 'arte', keywords: ['Pink Floyd', 'Led Zeppelin', 'guitarra', 'álbumes', 'gira'], metaDescription: 'Practicá inglés de rock clásico con un tutor de IA: Pink Floyd, Led Zeppelin, álbumes y giras. Aprendé a hablar de música como un verdadero fan.' },
  { id: 23, title: 'Stand-up – comediantes y especiales', category: 'arte', keywords: ['punchline', 'crowd work', 'Netflix special', 'open mic', 'timing'], metaDescription: 'Hablá inglés de stand-up con un tutor de IA: punchlines, crowd work, timing y especiales de Netflix. El vocabulario de la comedia en vivo.' },
  { id: 24, title: 'Meditación y mindfulness', category: 'lifestyle', keywords: ['respiración', 'atención plena', 'Vipassana', 'autoconciencia', 'práctica'], metaDescription: 'Practicá inglés sobre mindfulness con un tutor de IA: respiración, atención plena y autoconciencia. El vocabulario de la meditación y el bienestar.' },
  { id: 25, title: 'Nutrición – dietas y mitos', category: 'lifestyle', keywords: ['macros', 'ayuno intermitente', 'proteínas', 'micronutrientes', 'metabolismo'], metaDescription: 'Hablá inglés de nutrición con un tutor de IA: macros, proteínas, ayuno intermitente y mitos. Aprendé a separar la ciencia del marketing de dietas.' },
  { id: 26, title: 'Moda – streetwear y sneakers', category: 'lifestyle', keywords: ['drop', 'colab', 'hype', 'silueta', 'resell'], metaDescription: 'Practicá inglés de moda con un tutor de IA: streetwear, sneakers, drops y colabs. El vocabulario del hype y la cultura urbana actual.' },
  { id: 27, title: 'Trabajo remoto – nómade digital', category: 'negocios', keywords: ['visa', 'coworking', 'husos horarios', 'async', 'productividad'], metaDescription: 'Hablá inglés de trabajo remoto con un tutor de IA: visas, coworking, async y husos horarios. El vocabulario que necesitás como nómade digital.' },
  { id: 28, title: 'Entrevistas técnicas – system design', category: 'negocios', keywords: ['system design', 'algoritmos', 'STAR', 'behavioral', 'whiteboard'], metaDescription: 'Practicá inglés para entrevistas técnicas con un tutor de IA: system design, algoritmos y método STAR. Preparate para el whiteboard y el behavioral.' },
]

export function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const CATEGORY_LABEL: Record<string, string> = {
  arte: 'Arte y Entretenimiento',
  tech: 'Tecnología y Desarrollo',
  lifestyle: 'Estilo de Vida y Hábitos',
  viajes: 'Viajes',
  deportes: 'Deportes',
  gastronomia: 'Gastronomía',
  ciencia: 'Ciencia',
  negocios: 'Negocios y Carrera',
}

const PAGE_CSS = `
.landing-root .topic-detail-hero { padding: 64px 0 32px; }
.landing-root .topic-detail-hero .container { max-width: 880px; }
.landing-root .topic-detail-hero .cat-pill {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--primary-tint); color: var(--primary-dark);
  font-size: 11px; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; padding: 6px 12px;
  border-radius: var(--r-pill); margin-bottom: 20px;
}
.landing-root .topic-detail-hero h1 {
  font-size: clamp(34px, 5vw, 56px); line-height: 1.05;
  letter-spacing: -.025em; font-weight: 800; margin: 0 0 20px; color: var(--fg-1);
}
.landing-root .topic-detail-hero p.lead { font-size: var(--t-xl); color: var(--fg-3); line-height: 1.55; margin: 0 0 28px; }
.landing-root .topic-detail-hero .actions { display: flex; gap: 12px; flex-wrap: wrap; }

.landing-root .topic-vocab { padding: 48px 0; }
.landing-root .topic-vocab .container { max-width: 880px; }
.landing-root .topic-vocab h2 {
  font-size: var(--t-2xl); font-weight: 800; letter-spacing: -.02em;
  margin: 0 0 8px; color: var(--fg-1);
}
.landing-root .topic-vocab .sub { font-size: 15px; color: var(--fg-3); margin: 0 0 24px; line-height: 1.5; }
.landing-root .topic-vocab .chips { display: flex; flex-wrap: wrap; gap: 10px; }
.landing-root .topic-vocab .chips span {
  font-size: 14px; padding: 8px 16px; border-radius: var(--r-pill);
  background: var(--bg-2); color: var(--fg-2); border: 1px solid var(--border-1);
  font-weight: 500;
}

.landing-root .topic-cta-block { padding: 56px 0 96px; }
.landing-root .topic-cta-block .container { max-width: 880px; }
.landing-root .topic-cta-card {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  border-radius: var(--r-3xl); padding: 56px 40px; color: white; text-align: center;
  box-shadow: var(--shadow-lift);
}
.landing-root .topic-cta-card .eyebrow-light {
  font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.85); display: inline-flex; align-items: center; gap: 6px;
  margin-bottom: 14px;
}
.landing-root .topic-cta-card h2 {
  font-size: clamp(28px, 4vw, 42px); line-height: 1.1; font-weight: 800;
  letter-spacing: -.02em; margin: 0 0 14px; color: white;
}
.landing-root .topic-cta-card p { font-size: var(--t-lg); color: rgba(255,255,255,.9); margin: 0 0 28px; line-height: 1.5; }
.landing-root .topic-cta-card .btn-light { font-size: var(--t-lg); padding: 18px 32px; }

@media (max-width: 880px) {
  .landing-root .topic-detail-hero { padding: 40px 0 24px; }
  .landing-root .topic-cta-card { padding: 40px 24px; }
}
`

function buildMeta(topic: PublicTopic, slug: string): PageMeta {
  return {
    title: `${topic.title} en inglés · Habláh`,
    description: topic.metaDescription,
    path: `/topicos/${slug}`,
  }
}

function buildStructuredData(topic: PublicTopic, slug: string, meta: PageMeta) {
  const url = `https://hablah.com.ar${meta.path}`
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: topic.title,
      description:
        'Practica conversacional en inglés sobre este tópico, guiada por un tutor de IA que adapta dificultad, corrige errores y propone vocabulario relevante.',
      url,
      inLanguage: 'es',
      teaches: topic.title,
      about: { '@type': 'Thing', name: topic.title },
      keywords: topic.keywords.join(', '),
      educationalLevel: 'Beginner to Advanced',
      provider: {
        '@type': 'EducationalOrganization',
        name: 'Habláh',
        url: 'https://hablah.com.ar',
      },
    },
    breadcrumbList([
      { name: 'Inicio', path: '/' },
      { name: 'Tópicos', path: '/topicos' },
      { name: topic.title, path: `/topicos/${slug}` },
    ]),
  ]
}

export function TopicDetail() {
  const { slug } = useParams<{ slug: string }>()

  const topic = useMemo<PublicTopic | undefined>(() => {
    if (!slug) return undefined
    return TOPICS_PUBLIC.find((t) => slugifyTitle(t.title) === slug)
  }, [slug])

  const meta = useMemo<PageMeta | null>(() => (topic && slug ? buildMeta(topic, slug) : null), [topic, slug])
  const structured = useMemo(
    () => (topic && slug && meta ? buildStructuredData(topic, slug, meta) : null),
    [topic, slug, meta],
  )

  if (!topic || !meta || !structured) {
    return <Navigate to="/topicos" replace />
  }

  const categoryLabel = CATEGORY_LABEL[topic.category] ?? topic.category
  const practiceHref = `/login?next=${encodeURIComponent(`/app/practicar?topic=${topic.id}`)}`

  return (
    <LandingLayout meta={meta} structuredData={structured} current="/topicos">
      <style>{PAGE_CSS}</style>

      <Breadcrumbs
        crumbs={[
          { name: 'Habláh', path: '/' },
          { name: 'Tópicos', path: '/topicos' },
          { name: topic.title, path: `/topicos/${slug}` },
        ]}
      />

      <section className="topic-detail-hero">
        <div className="container">
          <span className="cat-pill hero-fade-in">{categoryLabel}</span>
          <h1 className="hero-fade-in d1">{topic.title}</h1>
          <p className="lead hero-fade-in d2">
            Practicá inglés conversando sobre <strong>{topic.title.toLowerCase()}</strong>. Un tutor de IA te lleva la charla,
            te corrige sin interrumpir y te propone el vocabulario justo para que hables del tema como un nativo.
            Sin lecciones, sin libros — todo conversación real.
          </p>
          <div className="actions hero-fade-in d3">
            <Link to={practiceHref} className="btn btn-primary btn-lg">
              Practicar este tema ahora
              <ArrowRight size={18} strokeWidth={2.4} />
            </Link>
            <Link to="/topicos" className="btn btn-outline btn-lg">
              Ver otros tópicos
            </Link>
          </div>
        </div>
      </section>

      <section className="topic-vocab fade-on-scroll">
        <div className="container">
          <h2>Vocabulario clave</h2>
          <p className="sub">
            Algunos conceptos que vas a aprender a usar al conversar sobre este tema. El sistema te enseña a pronunciarlos
            y a meterlos en frases reales, no en listas para memorizar.
          </p>
          <div className="chips">
            {topic.keywords.map((kw) => (
              <span key={kw}>{kw}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="topic-cta-block">
        <div className="container">
          <div className="topic-cta-card fade-on-scroll">
            <span className="eyebrow-light">
              <Sparkles size={14} strokeWidth={2.4} />
              14 días Pro gratis
            </span>
            <h2>Empezá a hablar de {topic.title.toLowerCase()} hoy.</h2>
            <p>
              Sin tarjeta, sin compromiso. Creás tu cuenta, elegís un tutor y la primera charla arranca en 30 segundos.
            </p>
            <Link to={practiceHref} className="btn btn-light btn-lg">
              <MessageCircle size={18} strokeWidth={2.4} />
              Practicar este tema ahora
            </Link>
          </div>
        </div>
      </section>

      <section className="related">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <h2>Seguí explorando.</h2>
          </div>
          <div className="related-grid fade-stagger">
            <RelatedCard
              to="/topicos"
              eyebrow="Tópicos"
              title="Ver todos los tópicos"
              description="Más de 75 tópicos curados por Habláh, organizados por categoría."
            />
            <RelatedCard
              to="/tutores"
              eyebrow="Personalidades"
              title="Tutores de IA"
              description="Elegí entre tres personalidades distintas para conversar sobre este tema."
            />
            <RelatedCard
              to="/como-funciona"
              eyebrow="Metodología"
              title="Cómo funciona"
              description="Cómo combinamos tus tópicos con tu nivel y errores para armar cada charla."
            />
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

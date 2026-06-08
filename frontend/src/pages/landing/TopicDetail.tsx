import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, GraduationCap, MessageCircle, Quote, Sparkles } from 'lucide-react'
import {
  Breadcrumbs,
  LandingLayout,
  RelatedCard,
  breadcrumbList,
  type PageMeta,
} from './_shared'

/** Par bilingüe: termino/frase en inglés con su traducción al español. */
export interface TopicPhrase {
  en: string
  es: string
}

/**
 * Contenido editorial extendido de una página de tópico. Es OPCIONAL: los
 * tópicos sin `content` renderizan la versión corta (chips de vocabulario).
 * Los que sí lo tienen muestran secciones ricas — sumando texto único real
 * indexable por Google (≈350 palabras) y más enganche para el visitante.
 */
export interface TopicContent {
  /** Bajada de la sección "qué vas a aprender a decir". */
  learnIntro: string
  /** Vocabulario real (en → es) que el tutor te enseña a usar. */
  terms: ReadonlyArray<TopicPhrase>
  /** Frases listas para abrir una conversación sobre el tema. */
  starters: ReadonlyArray<TopicPhrase>
  /** En qué rango CEFR sirve el tópico, en lenguaje humano. */
  level: string
}

export interface PublicTopic {
  id: number
  title: string
  category: string
  keywords: ReadonlyArray<string>
  /** Meta description única (140-160 chars) para el snippet de Google. */
  metaDescription: string
  /** Contenido editorial extendido (opcional, ver TopicContent). */
  content?: TopicContent
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
  { id: 9, title: 'Fútbol – Mundiales y selecciones', category: 'deportes', keywords: ['Messi', 'Maradona', 'táctica', 'Qatar', 'Brasil'], metaDescription: 'Hablá inglés de fútbol con un tutor de IA: Mundiales, tácticas y selecciones. Aprendé a discutir de Messi, Maradona y Brasil como un hincha bilingüe.', content: {
    learnIntro:
      'El fútbol es el tema más fácil para soltarte en inglés: ya tenés las opiniones, solo te faltan las palabras. Con The Coach vas a narrar una jugada, discutir una alineación y bancar tu opinión sobre quién es el GOAT — sin traducir en tu cabeza primero. Estas son algunas de las expresiones que vas a aprender a meter en una charla real, no en una lista para memorizar.',
    terms: [
      { en: 'a nutmeg', es: 'un caño' },
      { en: 'a through ball', es: 'un pase filtrado, en profundidad' },
      { en: 'stoppage time', es: 'tiempo de descuento' },
      { en: 'a screamer', es: 'un golazo de afuera del área' },
      { en: 'to park the bus', es: 'meterse atrás, jugar a defender' },
      { en: 'a clean sheet', es: 'la valla invicta, el arco en cero' },
      { en: 'to bottle it', es: 'ahogarse, regalar un partido ganado' },
      { en: 'the back four', es: 'la línea de cuatro defensores' },
    ],
    starters: [
      { en: 'That was a world-class finish.', es: 'Esa definición fue de otro nivel.' },
      { en: 'They parked the bus the whole second half.', es: 'Se metieron atrás todo el segundo tiempo.' },
      { en: "He's been on fire this season.", es: 'Está imparable esta temporada.' },
      { en: 'The ref bottled the big calls.', es: 'El árbitro se comió las jugadas clave.' },
      { en: "For me, he's the greatest of all time.", es: 'Para mí, es el mejor de la historia.' },
    ],
    level:
      'Sirve desde A2 hasta C1. En A2 ya hablás de tu equipo y tus jugadores favoritos con frases simples. En B1 y B2 narrás un partido y opinás de tácticas. En C1 debatís polémicas arbitrales y comparás épocas (Maradona vs. Messi) sin trabarte.',
  } },
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

/* ---- Contenido editorial extendido (cards modernas + movimiento) ---- */
.landing-root .topic-section { padding: 56px 0; }
.landing-root .topic-section .container { max-width: 920px; }
.landing-root .topic-section .sec-eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
  color: var(--primary-dark); display: inline-flex; align-items: center; gap: 7px; margin-bottom: 14px;
}
.landing-root .topic-section h2 {
  font-size: clamp(26px, 3.4vw, 38px); font-weight: 800; letter-spacing: -.025em;
  line-height: 1.1; margin: 0 0 16px; color: var(--fg-1);
}
.landing-root .topic-section .section-lead { font-size: var(--t-lg); color: var(--fg-3); line-height: 1.6; margin: 0 0 36px; max-width: 680px; }

/* Vocabulario: grid de term-cards bilingües */
.landing-root .term-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.landing-root .term-card {
  position: relative; overflow: hidden;
  background: var(--surface); border: 1px solid var(--border-1);
  border-radius: var(--r-xl); padding: 20px 22px;
  transition: transform .25s var(--ease), box-shadow .25s var(--ease), border-color .25s var(--ease);
  will-change: transform;
}
.landing-root .term-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%);
  transform: scaleY(0); transform-origin: bottom; transition: transform .3s var(--ease);
}
.landing-root .term-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-float); border-color: var(--primary-tint); }
.landing-root .term-card:hover::before { transform: scaleY(1); }
.landing-root .term-card .term-en {
  font-family: var(--font-mono); font-size: 18px; font-weight: 600; color: var(--fg-1);
  letter-spacing: -.01em; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;
}
.landing-root .term-card .term-en .dot { width: 7px; height: 7px; border-radius: 999px; background: var(--primary); flex-shrink: 0; }
.landing-root .term-card .term-es { font-size: 14px; color: var(--fg-3); line-height: 1.45; }

/* Frases para arrancar: cards estilo cita */
.landing-root .phrase-list { display: flex; flex-direction: column; gap: 12px; }
.landing-root .phrase-card {
  display: flex; align-items: flex-start; gap: 16px;
  background: var(--bg-2); border: 1px solid var(--border-1);
  border-radius: var(--r-2xl); padding: 22px 24px;
  transition: transform .25s var(--ease), box-shadow .25s var(--ease), background .25s var(--ease);
  will-change: transform;
}
.landing-root .phrase-card:hover { transform: translateX(4px); background: var(--surface); box-shadow: var(--shadow-card); }
.landing-root .phrase-card .phrase-ico {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: var(--r-lg);
  background: var(--primary-tint); color: var(--primary-dark);
  display: flex; align-items: center; justify-content: center;
}
.landing-root .phrase-card .phrase-en { font-size: var(--t-lg); font-weight: 600; color: var(--fg-1); line-height: 1.35; margin-bottom: 5px; }
.landing-root .phrase-card .phrase-es { font-size: 14px; color: var(--fg-3); line-height: 1.45; }

/* Nivel: bloque con badges A2 → C1 */
.landing-root .topic-level-block { background: var(--bg-2); border-top: 1px solid var(--border-1); }
.landing-root .level-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
.landing-root .level-badges span {
  font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: .04em;
  padding: 8px 16px; border-radius: var(--r-pill);
  background: var(--surface); border: 1px solid var(--border-2); color: var(--fg-2);
}
.landing-root .level-badges span.is-on { background: var(--primary); border-color: var(--primary); color: white; }
.landing-root .topic-level-block p { font-size: var(--t-lg); color: var(--fg-2); line-height: 1.6; margin: 0; max-width: 720px; }

@media (max-width: 880px) {
  .landing-root .topic-detail-hero { padding: 40px 0 24px; }
  .landing-root .topic-cta-card { padding: 40px 24px; }
  .landing-root .term-grid { grid-template-columns: 1fr; }
  .landing-root .topic-section { padding: 40px 0; }
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

      {topic.content ? (
        <>
          <section className="topic-section topic-learn fade-on-scroll">
            <div className="container">
              <span className="sec-eyebrow">
                <BookOpen size={14} strokeWidth={2.4} />
                Vocabulario real
              </span>
              <h2>Qué vas a aprender a decir</h2>
              <p className="section-lead">{topic.content.learnIntro}</p>
              <div className="term-grid fade-stagger">
                {topic.content.terms.map((t) => (
                  <div className="term-card" key={t.en}>
                    <div className="term-en">
                      <span className="dot" />
                      {t.en}
                    </div>
                    <div className="term-es">{t.es}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="topic-section topic-starters fade-on-scroll">
            <div className="container">
              <span className="sec-eyebrow">
                <Quote size={14} strokeWidth={2.4} />
                Frases para arrancar
              </span>
              <h2>Empezá una charla hoy mismo</h2>
              <p className="section-lead">
                Frases reales que podés soltar apenas entrás. The Coach te las corrige al toque y te enseña cómo seguir la conversación.
              </p>
              <div className="phrase-list fade-stagger">
                {topic.content.starters.map((s) => (
                  <div className="phrase-card" key={s.en}>
                    <span className="phrase-ico">
                      <Quote size={18} strokeWidth={2.2} />
                    </span>
                    <div>
                      <div className="phrase-en">{s.en}</div>
                      <div className="phrase-es">{s.es}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="topic-section topic-level-block fade-on-scroll">
            <div className="container">
              <span className="sec-eyebrow">
                <GraduationCap size={14} strokeWidth={2.4} />
                Tu nivel
              </span>
              <h2>¿Para qué nivel sirve?</h2>
              <div className="level-badges">
                <span className="is-on">A2</span>
                <span className="is-on">B1</span>
                <span className="is-on">B2</span>
                <span className="is-on">C1</span>
              </div>
              <p>{topic.content.level}</p>
            </div>
          </section>
        </>
      ) : (
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
      )}

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

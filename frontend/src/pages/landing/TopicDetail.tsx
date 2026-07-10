import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, GraduationCap, MessageCircle, Quote, Sparkles, Tag } from 'lucide-react'
import {
  Breadcrumbs,
  LandingLayout,
  RelatedCard,
  breadcrumbList,
  canonicalUrl,
  type PageMeta,
} from './_shared'
import { TOPICS_CATALOG, type CatalogTopic } from './topicsCatalog.generated'

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

/* ---- Contenido editorial (cards + movimiento) ---- */
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

/* Frases reales: cards estilo cita (una sola columna de texto, sin traduccion forzada) */
.landing-root .phrase-list { display: flex; flex-direction: column; gap: 12px; }
.landing-root .phrase-card {
  display: flex; align-items: flex-start; gap: 16px;
  background: var(--bg-2); border: 1px solid var(--border-1);
  border-radius: var(--r-2xl); padding: 20px 24px;
  transition: transform .25s var(--ease), box-shadow .25s var(--ease), background .25s var(--ease);
  will-change: transform;
}
.landing-root .phrase-card:hover { transform: translateX(4px); background: var(--surface); box-shadow: var(--shadow-card); }
.landing-root .phrase-card .phrase-ico {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: var(--r-lg);
  background: var(--primary-tint); color: var(--primary-dark);
  display: flex; align-items: center; justify-content: center;
}
.landing-root .phrase-card .phrase-en { font-family: var(--font-mono); font-size: var(--t-lg); font-weight: 600; color: var(--fg-1); line-height: 1.4; }

/* Chips de keywords reales */
.landing-root .kw-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.landing-root .kw-chips span {
  font-size: 14px; padding: 8px 16px; border-radius: var(--r-pill);
  background: var(--bg-2); color: var(--fg-2); border: 1px solid var(--border-1);
  font-weight: 500;
}

/* Nivel: bloque con badges reales de la DB */
.landing-root .topic-level-block { background: var(--bg-2); border-top: 1px solid var(--border-1); }
.landing-root .level-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
.landing-root .level-badges span {
  font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: .04em;
  padding: 8px 16px; border-radius: var(--r-pill);
  background: var(--primary); border-color: var(--primary); color: white;
}
.landing-root .topic-level-block p { font-size: var(--t-lg); color: var(--fg-2); line-height: 1.6; margin: 0; max-width: 720px; }

@media (max-width: 880px) {
  .landing-root .topic-detail-hero { padding: 40px 0 24px; }
  .landing-root .topic-cta-card { padding: 40px 24px; }
  .landing-root .topic-section { padding: 40px 0; }
}
`

const CATEGORY_HUB_LABEL: Record<string, string> = {
  kids: 'Para chicos',
}

function buildMeta(topic: CatalogTopic): PageMeta {
  return {
    title: `${topic.title} en inglés · Habláh`,
    description: topic.metaDescription,
    path: `/topicos/${topic.slug}`,
  }
}

function buildStructuredData(topic: CatalogTopic, meta: PageMeta) {
  const url = canonicalUrl(meta.path)
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
      educationalLevel: topic.levels.join(', '),
      audience: { '@type': 'EducationalAudience', educationalRole: topic.audience === 'kid' ? 'student (kid)' : 'student' },
      provider: {
        '@type': 'EducationalOrganization',
        name: 'Habláh',
        url: 'https://hablah.com.ar',
      },
    },
    breadcrumbList([
      { name: 'Inicio', path: '/' },
      { name: 'Tópicos', path: '/topicos' },
      { name: topic.title, path: `/topicos/${topic.slug}` },
    ]),
  ]
}

function siblingTopics(topic: CatalogTopic): CatalogTopic[] {
  const pool = topic.audience === 'kid'
    ? TOPICS_CATALOG.filter((t) => t.audience === 'kid' && t.segmento === topic.segmento)
    : TOPICS_CATALOG.filter((t) => t.audience !== 'kid' && t.category === topic.category)
  return pool.filter((t) => t.slug !== topic.slug).slice(0, 3)
}

export function TopicDetail() {
  const { slug } = useParams<{ slug: string }>()

  const topic = useMemo<CatalogTopic | undefined>(() => {
    if (!slug) return undefined
    return TOPICS_CATALOG.find((t) => t.slug === slug)
  }, [slug])

  const meta = useMemo<PageMeta | null>(() => (topic ? buildMeta(topic) : null), [topic])
  const structured = useMemo(() => (topic && meta ? buildStructuredData(topic, meta) : null), [topic, meta])

  if (!topic || !meta || !structured) {
    return <Navigate to="/topicos" replace />
  }

  const isKid = topic.audience === 'kid'
  const practiceHref = isKid ? '/kids' : `/login?next=${encodeURIComponent(`/app/practicar?topic=${topic.id}`)}`
  const practiceLabel = isKid ? 'Empezar en el modo chicos' : 'Practicar este tema ahora'
  const categoryLabel = CATEGORY_HUB_LABEL[topic.category] ?? topic.categoryLabel
  const siblings = siblingTopics(topic)

  return (
    <LandingLayout meta={meta} structuredData={structured} current="/topicos">
      <style>{PAGE_CSS}</style>

      <Breadcrumbs
        crumbs={[
          { name: 'Habláh', path: '/' },
          { name: 'Tópicos', path: '/topicos' },
          { name: topic.title, path: `/topicos/${topic.slug}` },
        ]}
      />

      <section className="topic-detail-hero">
        <div className="container">
          <span className="cat-pill hero-fade-in">{categoryLabel}</span>
          <h1 className="hero-fade-in d1">{topic.title}</h1>
          <p className="lead hero-fade-in d2">{topic.heroLead}</p>
          <div className="actions hero-fade-in d3">
            <Link to={practiceHref} className="btn btn-primary btn-lg">
              {practiceLabel}
              <ArrowRight size={18} strokeWidth={2.4} />
            </Link>
            <Link to="/topicos" className="btn btn-outline btn-lg">
              Ver otros tópicos
            </Link>
          </div>
        </div>
      </section>

      <section className="topic-section topic-learn fade-on-scroll">
        <div className="container">
          <span className="sec-eyebrow">
            <BookOpen size={14} strokeWidth={2.4} />
            Vocabulario real
          </span>
          <h2>Qué vas a aprender a decir</h2>
          <p className="section-lead">{topic.learnIntro}</p>
          <div className="phrase-list fade-stagger">
            {topic.vocabPhrases.slice(0, 6).map((phrase) => (
              <div className="phrase-card" key={phrase}>
                <span className="phrase-ico">
                  <Quote size={18} strokeWidth={2.2} />
                </span>
                <div className="phrase-en">{phrase}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {topic.keywords.length > 0 && (
        <section className="topic-section topic-vocab fade-on-scroll" style={{ paddingTop: 0 }}>
          <div className="container">
            <span className="sec-eyebrow">
              <Tag size={14} strokeWidth={2.4} />
              También vas a escuchar
            </span>
            <div className="kw-chips">
              {topic.keywords.map((kw) => (
                <span key={kw}>{kw}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="topic-section topic-level-block fade-on-scroll">
        <div className="container">
          <span className="sec-eyebrow">
            <GraduationCap size={14} strokeWidth={2.4} />
            Para quién es
          </span>
          <h2>¿Para qué nivel sirve?</h2>
          <div className="level-badges">
            {topic.levels.map((lvl) => (
              <span key={lvl}>{lvl}</span>
            ))}
          </div>
          <p>{topic.audienceLine}</p>
        </div>
      </section>

      <section className="topic-cta-block">
        <div className="container">
          <div className="topic-cta-card fade-on-scroll">
            <span className="eyebrow-light">
              <Sparkles size={14} strokeWidth={2.4} />
              {isKid ? 'Gate parental antes de empezar' : '14 días Pro gratis'}
            </span>
            <h2>Empezá a hablar de {topic.title.toLowerCase()} hoy.</h2>
            <p>
              {isKid
                ? 'El adulto a cargo aprueba el acceso desde el panel parental. Después, la sesión arranca en segundos.'
                : 'Sin tarjeta, sin compromiso. Creás tu cuenta, elegís un tutor y la primera charla arranca en 30 segundos.'}
            </p>
            <Link to={practiceHref} className="btn btn-light btn-lg">
              <MessageCircle size={18} strokeWidth={2.4} />
              {practiceLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="related">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <h2>{siblings.length > 0 ? 'Tópicos hermanos.' : 'Seguí explorando.'}</h2>
          </div>
          <div className="related-grid fade-stagger">
            {siblings.map((s) => (
              <RelatedCard
                key={s.slug}
                to={`/topicos/${s.slug}`}
                eyebrow={s.categoryLabel}
                title={s.title}
                description={`Practicá inglés (${s.levels.join(', ')}) conversando sobre ${s.title.toLowerCase()}.`}
              />
            ))}
            {siblings.length < 3 && (
              <RelatedCard
                to="/topicos"
                eyebrow="Tópicos"
                title="Ver todos los tópicos"
                description={`Más de ${TOPICS_CATALOG.length} tópicos curados por Habláh, organizados por categoría.`}
              />
            )}
            {siblings.length < 2 && (
              <RelatedCard
                to="/como-funciona"
                eyebrow="Metodología"
                title="Cómo funciona"
                description="Cómo combinamos tus tópicos con tu nivel y tu historia para armar cada charla."
              />
            )}
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

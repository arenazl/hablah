import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

export const LANDING_CSS = `
.landing-root {
  --primary:      #00B37E;
  --primary-dark: #008F63;
  --primary-tint: #E6F7F1;
  --accent:       #FFB800;
  --accent-tint:  #FFF4D6;
  --danger:       #E5484D;
  --info:         #3B82F6;

  --bg-1:    #FAFBFA;
  --bg-2:    #F2F4F1;
  --bg-3:    #EAEDE8;
  --surface: #FFFFFF;
  --border-1: rgba(13,20,18,0.08);
  --border-2: rgba(13,20,18,0.14);

  --fg-1: #0D1412;
  --fg-2: #2D3431;
  --fg-3: #5A625F;
  --fg-4: #8E938F;

  --ink-1: #0E1614;
  --ink-2: #19211E;

  --t-xs: 11px;   --t-sm: 13px;  --t-base: 16px;
  --t-lg: 20px;   --t-xl: 25px;  --t-2xl: 31px;
  --t-3xl: 39px;  --t-4xl: 49px; --t-5xl: 61px; --t-6xl: 76px;

  --r-md: 10px;  --r-lg: 12px;  --r-xl: 16px;
  --r-2xl: 20px; --r-3xl: 28px; --r-pill: 999px;

  --shadow-card:  0 1px 2px rgba(13,20,18,.04), 0 2px 6px rgba(13,20,18,.04);
  --shadow-float: 0 6px 20px rgba(13,20,18,.10), 0 2px 6px rgba(13,20,18,.06);
  --shadow-lift:  0 14px 40px rgba(13,20,18,.14), 0 4px 12px rgba(13,20,18,.06);

  --ease: cubic-bezier(.2,.8,.2,1);

  --container-w: 1200px;
  --gutter: 24px;

  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-serif: 'Fraunces', 'Playfair Display', Georgia, 'Times New Roman', serif;
  --font-mono: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace;

  font-family: var(--font-sans);
  font-size: var(--t-base);
  line-height: 1.25;
  color: var(--fg-1);
  background: var(--bg-1);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'cv11','ss01','tnum';
}
.landing-root * { box-sizing: border-box; }
.landing-root img, .landing-root svg { display: block; max-width: 100%; }
.landing-root a { color: inherit; text-decoration: none; }
.landing-root button { font-family: inherit; }

.landing-root .container {
  max-width: var(--container-w);
  margin: 0 auto;
  padding: 0 var(--gutter);
}

.landing-root .btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 8px; font-weight: 600; font-size: var(--t-base);
  border-radius: var(--r-lg); padding: 14px 22px;
  border: 1px solid transparent; cursor: pointer;
  transition: all .15s var(--ease); white-space: nowrap; line-height: 1;
}
.landing-root .btn-primary { background: var(--primary); color: white; }
.landing-root .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); box-shadow: 0 8px 22px rgba(0,179,126,.3); }
.landing-root .btn-dark { background: var(--ink-1); color: white; }
.landing-root .btn-dark:hover { background: var(--ink-2); }
.landing-root .btn-ghost { background: transparent; color: var(--fg-2); }
.landing-root .btn-ghost:hover { background: var(--bg-2); }
.landing-root .btn-outline { background: transparent; color: var(--fg-1); border-color: var(--border-2); }
.landing-root .btn-outline:hover { background: var(--bg-2); }
.landing-root .btn-light { background: white; color: var(--primary-dark); }
.landing-root .btn-light:hover { background: var(--bg-2); }
.landing-root .btn-lg { padding: 18px 28px; font-size: var(--t-lg); }
.landing-root .btn-sm { padding: 8px 14px; font-size: var(--t-sm); }
.landing-root .btn-block { display: flex; width: 100%; }

.landing-root .eyebrow {
  font-size: 11px; font-weight: 700; letter-spacing: .14em;
  text-transform: uppercase; color: var(--primary-dark);
}

.landing-root .nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(250,251,250,.86);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--border-1);
}
.landing-root .nav-inner { display: flex; align-items: center; gap: 24px; height: 64px; }
.landing-root .logo { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 18px; letter-spacing: -.01em; }
.landing-root .logo-mark { width: 30px; height: 30px; border-radius: 8px; display: block; flex-shrink: 0; }
.landing-root .nav-links { display: flex; gap: 4px; margin-left: 24px; }
.landing-root .nav-links a { padding: 8px 14px; border-radius: var(--r-md); font-size: 14px; font-weight: 500; color: var(--fg-2); transition: all .15s var(--ease); }
.landing-root .nav-links a:hover { background: var(--bg-2); color: var(--fg-1); }
.landing-root .nav-links a.active { background: var(--primary-tint); color: var(--primary-dark); }
.landing-root .nav-cta { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.landing-root .nav-toggle { display: none; background: transparent; border: 0; cursor: pointer; }

.landing-root section { padding: 100px 0; }
.landing-root .sec-head { max-width: 720px; margin: 0 auto 64px; text-align: center; }
.landing-root .sec-head h2 { font-size: clamp(30px, 4vw, 49px); line-height: 1.08; letter-spacing: -.025em; font-weight: 800; margin: 12px 0 16px; }
.landing-root .sec-head p { font-size: var(--t-lg); color: var(--fg-3); margin: 0; line-height: 1.5; }

.landing-root .page-hero { padding: 80px 0 64px; }
.landing-root .page-hero .container { max-width: 880px; text-align: center; }
.landing-root .page-hero .eyebrow { display: inline-block; margin-bottom: 16px; }
.landing-root .page-hero h1 { font-size: clamp(38px, 5.5vw, 61px); line-height: 1.05; letter-spacing: -.03em; font-weight: 800; margin: 0 0 24px; }
.landing-root .page-hero h1 em { font-style: normal; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.landing-root .page-hero p.lead { font-size: var(--t-xl); color: var(--fg-3); line-height: 1.5; margin: 0 auto 32px; max-width: 640px; }
.landing-root .page-hero .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

.landing-root .crumbs { padding: 24px 0 0; font-size: 13px; color: var(--fg-3); }
.landing-root .crumbs a:hover { color: var(--primary-dark); }
.landing-root .crumbs .sep { margin: 0 8px; color: var(--fg-4); }

.landing-root .related { background: var(--bg-2); border-top: 1px solid var(--border-1); }
.landing-root .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.landing-root .related-card { background: var(--surface); border-radius: var(--r-2xl); padding: 28px; border: 1px solid var(--border-1); transition: all .2s var(--ease); display: flex; flex-direction: column; gap: 12px; }
.landing-root .related-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-card); border-color: var(--primary-tint); }
.landing-root .related-card .eyebrow { font-size: 11px; }
.landing-root .related-card h3 { font-size: var(--t-lg); margin: 0; font-weight: 700; letter-spacing: -.015em; color: var(--fg-1); }
.landing-root .related-card p { font-size: 14px; color: var(--fg-3); line-height: 1.5; margin: 0; }
.landing-root .related-card .arrow { margin-top: auto; padding-top: 8px; display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--primary-dark); }

.landing-root footer { background: var(--ink-1); color: rgba(232,236,234,.75); padding: 64px 0 32px; margin-top: 0; }
.landing-root .footer-slim { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 64px; padding-bottom: 48px; border-bottom: 1px solid rgba(255,255,255,.08); }
.landing-root .footer-col h5 { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: rgba(232,236,234,.5); margin: 0 0 14px; font-weight: 700; }
.landing-root .footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.landing-root .footer-col a { font-size: 14px; color: rgba(232,236,234,.75); transition: color .15s var(--ease); }
.landing-root .footer-col a:hover { color: white; }
.landing-root .footer-brand .logo { color: white; margin-bottom: 12px; }
.landing-root .footer-brand p { font-size: 13px; color: rgba(232,236,234,.55); line-height: 1.5; margin: 0; max-width: 360px; }
.landing-root .footer-bottom { display: flex; justify-content: space-between; align-items: center; padding-top: 24px; font-size: 12px; color: rgba(232,236,234,.45); flex-wrap: wrap; gap: 12px; }

.landing-root .fade-on-scroll { opacity: 0; transform: translateY(24px); transition: opacity .8s var(--ease), transform .8s var(--ease); will-change: opacity, transform; }
.landing-root .fade-on-scroll.is-visible { opacity: 1; transform: translateY(0); }
.landing-root .fade-stagger > * { opacity: 0; transform: translateY(20px); transition: opacity .7s var(--ease), transform .7s var(--ease); }
.landing-root .fade-stagger.is-visible > * { opacity: 1; transform: translateY(0); }
.landing-root .fade-stagger.is-visible > *:nth-child(1) { transition-delay: 0ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(2) { transition-delay: 90ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(3) { transition-delay: 180ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(4) { transition-delay: 270ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(5) { transition-delay: 360ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(6) { transition-delay: 450ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(7) { transition-delay: 540ms; }
.landing-root .fade-stagger.is-visible > *:nth-child(8) { transition-delay: 630ms; }

.landing-root .hero-fade-in { opacity: 0; transform: translateY(16px); animation: heroFadeIn .9s var(--ease) forwards; }
.landing-root .hero-fade-in.d1 { animation-delay: 120ms; }
.landing-root .hero-fade-in.d2 { animation-delay: 220ms; }
.landing-root .hero-fade-in.d3 { animation-delay: 320ms; }
.landing-root .hero-fade-in.d4 { animation-delay: 420ms; }
.landing-root .hero-fade-in.d5 { animation-delay: 520ms; }
@keyframes heroFadeIn { to { opacity: 1; transform: translateY(0); } }

@media (prefers-reduced-motion: reduce) {
  .landing-root .fade-on-scroll,
  .landing-root .fade-stagger > *,
  .landing-root .hero-fade-in { opacity: 1; transform: none; transition: none; animation: none; }
}

@media (max-width: 880px) {
  .landing-root section { padding: 64px 0; }
  .landing-root .nav-links { display: none; }
  .landing-root .nav-cta .btn-outline { display: none; }
  .landing-root .page-hero { padding: 48px 0 32px; }
  .landing-root .page-hero h1 { font-size: 38px; }
  .landing-root .sec-head { margin-bottom: 40px; }
  .landing-root .related-grid { grid-template-columns: 1fr; gap: 16px; }
  .landing-root .footer-slim { grid-template-columns: 1fr 1fr; gap: 32px; }
  .landing-root .footer-brand { grid-column: 1 / -1; }
}
@media (max-width: 480px) {
  .landing-root { --gutter: 18px; }
}
`

export function ensureGoogleFont() {
  if (typeof document === 'undefined') return
  if (document.getElementById('hablah-google-fonts')) return
  const pre1 = document.createElement('link')
  pre1.rel = 'preconnect'
  pre1.href = 'https://fonts.googleapis.com'
  const pre2 = document.createElement('link')
  pre2.rel = 'preconnect'
  pre2.href = 'https://fonts.gstatic.com'
  pre2.crossOrigin = 'anonymous'
  const link = document.createElement('link')
  link.id = 'hablah-google-fonts'
  link.rel = 'stylesheet'
  link.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400;1,9..144,600;1,9..144,700&family=JetBrains+Mono:wght@400;600&display=swap'
  document.head.appendChild(pre1)
  document.head.appendChild(pre2)
  document.head.appendChild(link)
}

export function useFadeInOnScroll() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      '.landing-root .fade-on-scroll, .landing-root .fade-stagger',
    )
    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name'): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  const created = !tag
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
  return created ? tag : null
}

function setCanonical(url: string): { restore: () => void } {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  const prev = link?.getAttribute('href') ?? null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
  return {
    restore: () => {
      if (prev !== null && link) link.setAttribute('href', prev)
    },
  }
}

export interface PageMeta {
  title: string
  description: string
  path: string
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title
    const prevDescription =
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.getAttribute('content') ?? null

    document.title = meta.title

    const created: HTMLMetaElement[] = []
    const push = (tag: HTMLMetaElement | null) => {
      if (tag) created.push(tag)
    }

    const url = `https://hablah.com.ar${meta.path}`

    setMeta('description', meta.description)
    push(setMeta('og:title', meta.title, 'property'))
    push(setMeta('og:description', meta.description, 'property'))
    push(setMeta('og:url', url, 'property'))
    push(setMeta('og:type', 'website', 'property'))
    push(setMeta('twitter:title', meta.title))
    push(setMeta('twitter:description', meta.description))

    const canonical = setCanonical(url)

    return () => {
      document.title = prevTitle
      if (prevDescription !== null) setMeta('description', prevDescription)
      created.forEach((tag) => tag.remove())
      canonical.restore()
    }
  }, [meta.title, meta.description, meta.path])
}

const STRUCTURED_DATA_ID = 'hablah-landing-jsonld'

export function useStructuredData(payload: unknown) {
  useEffect(() => {
    const existing = document.getElementById(STRUCTURED_DATA_ID)
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.id = STRUCTURED_DATA_ID
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(payload)
    document.head.appendChild(script)

    return () => {
      const el = document.getElementById(STRUCTURED_DATA_ID)
      if (el) el.remove()
    }
  }, [payload])
}

export function breadcrumbList(crumbs: ReadonlyArray<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `https://hablah.com.ar${c.path}`,
    })),
  }
}

export function webPageSchema(meta: PageMeta) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: `https://hablah.com.ar${meta.path}`,
    inLanguage: 'es-AR',
    isPartOf: {
      '@type': 'WebSite',
      '@id': 'https://hablah.com.ar/#website',
      url: 'https://hablah.com.ar/',
      name: 'Habláh',
    },
  }
}

export interface FaqEntry {
  q: string
  a: string
}

export const FAQ_ITEMS: ReadonlyArray<FaqEntry> = [
  {
    q: '¿Cómo decide mi nivel sin un examen?',
    a: 'Mientras conversás, un pipeline analiza riqueza léxica, precisión sintáctica, fluidez (palabras por minuto y pausas) y precisión fonética. En 2 a 3 minutos te ubica en el marco CEFR (A1 a C2). Sin opción múltiple, sin presión.',
  },
  {
    q: '¿Qué idiomas están disponibles?',
    a: 'Hoy: inglés (US y UK), portugués (BR y PT) e italiano. Próximamente francés y alemán. Como alumno base aceptamos español (todas las variantes), portugués e inglés.',
  },
  {
    q: '¿Necesito buena conexión?',
    a: 'Funciona con 3G estable. El audio se procesa en streaming. Si la conexión se cae, la sesión guarda lo hablado y reanuda al volver.',
  },
  {
    q: '¿Qué pasa con mi audio? ¿Lo guardan?',
    a: 'Por defecto se borra a los 30 días. Podés cambiarlo a "borrar después de cada sesión" en tu perfil. Nunca lo usamos para entrenar modelos sin tu consentimiento explícito.',
  },
  {
    q: '¿Puedo cancelar Pro cuando quiera?',
    a: 'Sí, desde la app, en un toque. No hay permanencia. Si cancelás, mantenés tu nivel y rachas, solo pasás al plan Free.',
  },
  {
    q: '¿Sirve para certificaciones (TOEFL, IELTS, Cambridge)?',
    a: 'Sirve para llegar al nivel, pero no entrena formato de examen. Para eso usamos Bootcamp con coach humano, que arma simulacros específicos.',
  },
  {
    q: '¿Y si soy ultra principiante (A0)?',
    a: 'The Coach está pensado para vos. Las primeras semanas son híbridas: la IA te tira frases simples, vas repitiendo y construyendo. Al mes ya hacés charlas reales cortas.',
  },
]

export interface NavLink {
  to: string
  label: string
}

export const NAV_LINKS: ReadonlyArray<NavLink> = [
  { to: '/como-funciona', label: 'Cómo funciona' },
  { to: '/tutores', label: 'Tutores' },
  { to: '/topicos', label: 'Tópicos' },
  { to: '/precios', label: 'Precios' },
  { to: '/faq', label: 'FAQ' },
]

interface LandingNavProps {
  current?: string
}

export function LandingNav({ current }: LandingNavProps) {
  return (
    <nav className="nav" aria-label="Navegación principal">
      <div className="container nav-inner">
        <Link to="/" className="logo" aria-label="Habláh - Inicio">
          <img src="/logos/hablah-mark.svg" alt="habláh" className="logo-mark" width="30" height="30" />
          habláh
        </Link>
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={current === l.to ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-cta">
          <Link to="/login" className="btn btn-outline btn-sm">
            Ingresar
          </Link>
          <Link to="/login" className="btn btn-primary btn-sm">
            Empezar gratis
          </Link>
        </div>
      </div>
    </nav>
  )
}

export function LandingFooter() {
  return (
    <footer role="contentinfo">
      <div className="container">
        <div className="footer-slim">
          <div className="footer-brand">
            <Link to="/" className="logo" aria-label="Habláh - Inicio">
              <img src="/logos/hablah-mark.svg" alt="habláh" className="logo-mark" width="30" height="30" />
              habláh
            </Link>
            <p>Plataforma adaptativa de aprendizaje de idiomas con IA. Hablás de lo que te gusta. El sistema se encarga del resto.</p>
          </div>
          <div className="footer-col">
            <h5>Producto</h5>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h5>Cuenta</h5>
            <ul>
              <li><Link to="/login">Ingresar</Link></li>
              <li><Link to="/login">Empezar gratis</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={13} strokeWidth={2.2} />
            © 2026 Habláh. Hecho en LatAm.
          </span>
          <span>Hablás. Aprendés. Sin exámenes.</span>
        </div>
      </div>
    </footer>
  )
}

interface BreadcrumbsProps {
  crumbs: ReadonlyArray<{ name: string; path: string }>
}

export function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  return (
    <div className="crumbs">
      <div className="container">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={c.path}>
              {isLast ? (
                <span style={{ color: 'var(--fg-2)', fontWeight: 600 }}>{c.name}</span>
              ) : (
                <Link to={c.path}>{c.name}</Link>
              )}
              {!isLast && <span className="sep">/</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

interface LandingLayoutProps {
  children: ReactNode
  meta: PageMeta
  structuredData: unknown
  current?: string
}

export function LandingLayout({ children, meta, structuredData, current }: LandingLayoutProps) {
  useEffect(() => {
    ensureGoogleFont()
  }, [])
  usePageMeta(meta)
  useStructuredData(structuredData)
  useFadeInOnScroll()

  return (
    <div className="landing-root">
      <style>{LANDING_CSS}</style>
      <LandingNav current={current} />
      <main>{children}</main>
      <LandingFooter />
    </div>
  )
}

interface RelatedCardProps {
  to: string
  eyebrow: string
  title: string
  description: string
}

export function RelatedCard({ to, eyebrow, title, description }: RelatedCardProps) {
  return (
    <Link to={to} className="related-card">
      <span className="eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="arrow">Ver más →</span>
    </Link>
  )
}

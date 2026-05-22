import { Link } from 'react-router-dom'
import { ArrowRight, Gamepad2, Heart, Star, Zap } from 'lucide-react'
import {
  Breadcrumbs,
  LandingLayout,
  RelatedCard,
  breadcrumbList,
  webPageSchema,
  type PageMeta,
} from './_shared'

const META: PageMeta = {
  title: 'Tutores de IA · Coach, Sincerist o Arcade · Habláh',
  description:
    'Tres personalidades de tutor de IA para aprender idiomas: The Coach (empático), The Sincerist (exigente, ideal para entrevistas) y The Arcade (rápido y gamificado). Cambiá cuando quieras.',
  path: '/tutores',
}

const STRUCTURED = [
  webPageSchema(META),
  breadcrumbList([
    { name: 'Inicio', path: '/' },
    { name: 'Tutores', path: '/tutores' },
  ]),
]

const PAGE_CSS = `
.landing-root .tutors { background: var(--ink-1); color: white; padding: 100px 0; }
.landing-root .tutors .eyebrow { color: var(--primary); }
.landing-root .tutors-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.landing-root .tutor { background: var(--ink-2); border-radius: var(--r-2xl); padding: 32px; border: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 18px; }
.landing-root .tutor.featured { background: linear-gradient(160deg, rgba(0,179,126,.16) 0%, rgba(0,179,126,.02) 100%); border-color: rgba(0,179,126,.4); }
.landing-root .tutor-ico { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; color: white; }
.landing-root .tutor.coach .tutor-ico { background: var(--primary); }
.landing-root .tutor.sincerist .tutor-ico { background: #5A6BFF; }
.landing-root .tutor.arcade .tutor-ico { background: var(--accent); color: #5A3D00; }
.landing-root .tutor h2 { font-size: var(--t-xl); margin: 0; font-weight: 700; letter-spacing: -.01em; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: white; }
.landing-root .tutor h2 .badge-most { font-size: 11px; color: var(--primary); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px; }
.landing-root .tutor .desc { font-size: 14px; color: rgba(232,236,234,.75); margin: 0; line-height: 1.5; }
.landing-root .tutor .meter { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px dashed rgba(255,255,255,.1); }
.landing-root .tutor .meter:last-of-type { border-bottom: 1px dashed rgba(255,255,255,.1); margin-bottom: 8px; }
.landing-root .tutor .meter .k { font-size: 12px; color: rgba(232,236,234,.55); flex: 1; }
.landing-root .tutor .meter .v { display: flex; gap: 3px; }
.landing-root .tutor .meter .v span { width: 16px; height: 5px; border-radius: 2px; background: rgba(255,255,255,.15); }
.landing-root .tutor .meter .v span.on { background: var(--primary); }
.landing-root .tutor.arcade .meter .v span.on { background: var(--accent); }
.landing-root .tutor.sincerist .meter .v span.on { background: #8A95FF; }
.landing-root .tutor .ideal { margin-top: auto; padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,.04); font-size: 13px; }
.landing-root .tutor .ideal b { color: white; }
.landing-root .tutor .ideal .small { color: rgba(232,236,234,.6); display: block; margin-top: 2px; font-size: 12px; }

@media (max-width: 880px) {
  .landing-root .tutors-grid { grid-template-columns: 1fr; gap: 16px; }
}
`

export function Tutors() {
  return (
    <LandingLayout meta={META} structuredData={STRUCTURED} current="/tutores">
      <style>{PAGE_CSS}</style>

      <Breadcrumbs crumbs={[{ name: 'Inicio', path: '/' }, { name: 'Tutores', path: '/tutores' }]} />

      <section className="page-hero">
        <div className="container">
          <span className="eyebrow hero-fade-in">Tres personalidades</span>
          <h1 className="hero-fade-in d1">Elegí tu tutor.<br /><em>Cada uno enseña distinto.</em></h1>
          <p className="lead hero-fade-in d2">
            No todos aprendemos igual. Habláh ofrece tres personalidades de tutor de IA con tono, rigurosidad y velocidad distintas.
            Podés cambiar cuando quieras, o dejar que el sistema te asigne el más conveniente según tu objetivo.
          </p>
          <div className="actions hero-fade-in d3">
            <Link to="/login" className="btn btn-primary btn-lg">
              Probar gratis
              <ArrowRight size={18} strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </section>

      <section className="tutors">
        <div className="container">
          <div className="tutors-grid fade-stagger">
            <article className="tutor coach">
              <div className="tutor-ico"><Heart size={26} strokeWidth={2.2} /></div>
              <h2>The Coach</h2>
              <p className="desc">Empático, paciente, motivador. Prioriza la consistencia sobre la precisión. No penaliza errores. Te acompaña sin presión.</p>
              <div className="meter">
                <span className="k">Rigurosidad</span>
                <span className="v"><span className="on"></span><span className="on"></span><span></span><span></span><span></span></span>
              </div>
              <div className="meter">
                <span className="k">Retos por minuto</span>
                <span className="v"><span className="on"></span><span></span><span></span><span></span><span></span></span>
              </div>
              <div className="meter">
                <span className="k">Interrupciones</span>
                <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)' }}>Nunca</span>
              </div>
              <div className="ideal">
                <b>Ideal para</b>
                <span className="small">Principiantes · alguien con miedo al habla · regreso al idioma después de años</span>
              </div>
            </article>

            <article className="tutor sincerist featured">
              <div className="tutor-ico"><Zap size={26} strokeWidth={2.2} /></div>
              <h2>
                The Sincerist
                <span className="badge-most">
                  <Star size={11} strokeWidth={2.4} fill="currentColor" />
                  Más usado
                </span>
              </h2>
              <p className="desc">Profesional, directo, demandante. Evalúa cada palabra. Bloqueos por error repetido. La opción para quien quiere ver progreso medible rápido.</p>
              <div className="meter">
                <span className="k">Rigurosidad</span>
                <span className="v"><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span></span>
              </div>
              <div className="meter">
                <span className="k">Retos por minuto</span>
                <span className="v"><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span><span></span></span>
              </div>
              <div className="meter">
                <span className="k">Interrupciones</span>
                <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)' }}>Solo en simulaciones</span>
              </div>
              <div className="ideal">
                <b>Ideal para</b>
                <span className="small">Preparar entrevistas · certificaciones · acelerar de B2 a C1</span>
              </div>
            </article>

            <article className="tutor arcade">
              <div className="tutor-ico"><Gamepad2 size={26} strokeWidth={2.2} /></div>
              <h2>The Arcade</h2>
              <p className="desc">Enérgico, lúdico, veloz. Sesiones cortas con recompensas visuales constantes. Ideal para mantener la racha cuando andás corto de tiempo.</p>
              <div className="meter">
                <span className="k">Rigurosidad</span>
                <span className="v"><span className="on"></span><span className="on"></span><span className="on"></span><span></span><span></span></span>
              </div>
              <div className="meter">
                <span className="k">Retos por minuto</span>
                <span className="v"><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span><span className="on"></span></span>
              </div>
              <div className="meter">
                <span className="k">Interrupciones</span>
                <span style={{ fontSize: 12, color: 'rgba(232,236,234,.6)' }}>Constantes y cortas</span>
              </div>
              <div className="ideal">
                <b>Ideal para</b>
                <span className="small">Sesiones express · gente que se aburre · cuando vas en el subte o entre reuniones</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="related">
        <div className="container">
          <div className="sec-head fade-on-scroll">
            <h2>Seguí explorando.</h2>
          </div>
          <div className="related-grid fade-stagger">
            <RelatedCard to="/como-funciona" eyebrow="Metodología" title="Cómo funciona" description="El pipeline de diagnóstico, el marco CEFR y el feedback sincerista al final de cada sesión." />
            <RelatedCard to="/topicos" eyebrow="Contenido" title="Tópicos disponibles" description="Los tutores conversan sobre lo que te interesa. Más de 75 tópicos curados." />
            <RelatedCard to="/precios" eyebrow="Planes" title="Precios" description="Free trae solo The Coach. Pro y Bootcamp habilitan los 3 tutores." />
          </div>
        </div>
      </section>
    </LandingLayout>
  )
}

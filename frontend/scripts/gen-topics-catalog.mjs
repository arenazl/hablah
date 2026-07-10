#!/usr/bin/env node
/**
 * Genera el catalogo publico de topicos (paginas /topicos y /topicos/:slug) a partir
 * del snapshot versionado del catalogo real (data/catalogo/topics.json, WO F0-05).
 *
 * NO inventa contenido: title, category, segmento, audience, levels, keywords y
 * generated_vocab son datos reales de la tabla `topics`. Lo unico "generado" es la
 * prosa de relleno (intro, linea de publico) que arma frases de marketing a partir
 * de esos campos reales, con varias plantillas rotadas por id para que no todas las
 * paginas repitan la misma oracion literal (evita el patron de contenido duplicado).
 *
 * Uso: node scripts/gen-topics-catalog.mjs
 * Salida: src/pages/landing/topicsCatalog.generated.ts (committeado, como el resto
 * del catalogo-como-codigo de F0-05).
 *
 * Regla del proceso (misma que F0-05): cambiaste el catalogo (topics.json) -> corre
 * este script de nuevo y commiteá el archivo generado.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.resolve(__dirname, '../../data/catalogo/topics.json')
const OUT_DIR = path.resolve(__dirname, '../src/pages/landing')
// 3 salidas separadas por peso, para no inflar el bundle EAGER de la landing (Topics,
// Tutors, HowItWorks se importan sincronicos — ver comentario en App.tsx) con la prosa
// pesada que solo necesita la pagina de detalle (lazy-loaded):
//  - topicsCount.generated.ts   -> 1 numero, cero costo, para "N topicos" en copy.
//  - topicsIndex.generated.ts   -> listado liviano (sin prosa), para /topicos y hermanos.
//  - topicsCatalog.generated.ts -> contenido completo (heroLead/learnIntro/audienceLine/
//                                   vocabPhrases), SOLO para /topicos/:slug (lazy).
const OUT_COUNT = path.resolve(OUT_DIR, 'topicsCount.generated.ts')
const OUT_INDEX = path.resolve(OUT_DIR, 'topicsIndex.generated.ts')
const OUT_FULL = path.resolve(OUT_DIR, 'topicsCatalog.generated.ts')

const CATEGORY_LABEL = {
  musica: 'Música',
  tech: 'Tecnología',
  fitness: 'Fitness y entrenamiento',
  deportes: 'Deportes',
  gastronomia: 'Gastronomía',
  ciencia: 'Ciencia',
  entretenimiento: 'Entretenimiento',
  lifestyle: 'Estilo de vida',
  negocios: 'Negocios y carrera',
  viajes: 'Viajes',
  comida: 'Comida y bebida',
  animales: 'Animales',
  arte: 'Arte',
  moda: 'Moda',
  general: 'Charla libre',
  videojuegos: 'Videojuegos',
  kids: 'Para chicos',
}

const SEGMENTO_LABEL = {
  mini: 'los más chicos (mini)',
  junior: 'primaria (junior)',
  teen: 'adolescentes (teen)',
  adultos: 'adultos',
}

function categoryLabel(cat) {
  return CATEGORY_LABEL[cat] ?? cat
}

// --- Plantillas de prosa, parametrizadas con datos REALES (title/category/levels). ---
// Se elige una variante por `id % N` para que el texto no sea literalmente el mismo
// molde en las ~99 paginas (thin/duplicate content).

const HERO_LEAD_TEMPLATES = [
  (t) =>
    `Practicá inglés conversando sobre ${t.titleLower}. Un tutor de IA te lleva la charla, te corrige sin interrumpir y te propone el vocabulario justo para hablar del tema con soltura.`,
  (t) =>
    `Charlás de ${t.titleLower} y de paso practicás inglés. El coach de Habláh sigue tu conversación de verdad — nada de ejercicios ni de lecciones lineales.`,
  (t) =>
    `${t.title} es uno de los tópicos de Habláh: hablás con un tutor de IA que arma la charla a tu nivel real y te enseña el vocabulario que se usa de verdad al hablar del tema.`,
  (t) =>
    `Con Habláh practicás inglés hablando de lo que te interesa — en este caso, ${t.titleLower}. Conversación real por voz, sin traducir en tu cabeza primero.`,
]

const LEARN_INTRO_TEMPLATES = [
  (t) =>
    `Estas son frases reales que el tutor usa al conversar sobre ${t.titleLower} — no una lista para memorizar, sino el vocabulario que vas a escuchar y vas a poder usar en la charla misma.`,
  (t) =>
    `No son ejercicios de completar espacios: son las frases que efectivamente aparecen cuando dos personas hablan de ${t.titleLower} en inglés. El tutor te las presenta en contexto, dentro de la conversación.`,
  (t) =>
    `El coach arma la charla sobre ${t.titleLower} con este tipo de frases — las vas a escuchar, las vas a repetir con tu propia idea adentro, y vas a salir usándolas de verdad.`,
  (t) =>
    `Vocabulario real, sacado de cómo se habla de ${t.titleLower} en una conversación en inglés — no de un libro de texto. Así arranca el tutor cuando elegís este tópico.`,
]

function audienceLine(t) {
  const levels = t.levels
  const first = levels[0]
  const last = levels[levels.length - 1]
  if (t.audience === 'kid') {
    const seg = SEGMENTO_LABEL[t.segmento] ?? t.segmento
    const variants = [
      `Este tópico está pensado para ${seg}, en los niveles ${levels.join(', ')}. La conversación la lleva un personaje guía pensado para esa edad, con vocabulario simple y repetido, y el gate parental siempre activo antes de cualquier sesión.`,
      `Diseñado para ${seg} (niveles ${levels.join(', ')}): frases cortas, mucha repetición y un tono de juego, no de examen. El adulto a cargo aprueba el acceso desde el panel parental.`,
    ]
    return variants[t.id % variants.length]
  }
  const variants = [
    `Sirve del nivel ${first} al ${last}. En ${first} ya podés armar frases simples sobre el tema; llegando a ${last}, discutís matices y argumentás tu postura sin trabarte.`,
    `Disponible en los niveles ${levels.join(', ')}. Si arrancás en ${first}, el tutor te da estructuras simples para opinar; a medida que subís de nivel, la charla se vuelve más específica y menos guiada.`,
  ]
  return variants[t.id % variants.length]
}

const META_DESC_TEMPLATES = [
  (t) => `Practicá inglés hablando de ${t.titleLower} con un tutor de IA: "${t.vocab0}" y más frases reales. Conversación real, sin exámenes.`,
  (t) => `Hablá inglés sobre ${t.titleLower} con Habláh: un tutor de IA que arma la charla a tu nivel. Frase real: "${t.vocab0}".`,
  (t) => `Aprendé el vocabulario real de ${t.titleLower} en inglés — frases como "${t.vocab0}" — con un tutor de IA que se adapta a tu nivel.`,
  (t) => `${t.title}: practicá inglés conversando de verdad, no con ejercicios. El tutor te corrige sin cortar la charla.`,
]

// Trunca en un limite de palabra (nunca corta a mitad de palabra ni deja una
// comilla o frase colgando) y SIEMPRE cierra comillas si la plantilla las abrio.
function truncate(str, max) {
  if (str.length <= max) return str
  const openQuotes = (str.slice(0, max).match(/"/g) ?? []).length
  const sliced = str.slice(0, max - 1)
  const lastSpace = sliced.lastIndexOf(' ')
  const cut = lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced
  const closedQuote = openQuotes % 2 === 1 ? '"' : ''
  return cut.trimEnd().replace(/[,;:]$/, '') + closedQuote + '…'
}

function normalizeVocabPhrase(phrase) {
  return phrase.trim()
}

function esc(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, ' ')
}

function main() {
  const raw = readFileSync(DATA_PATH, 'utf8')
  const all = JSON.parse(raw)
  const active = all.filter((t) => t.is_active)

  const seenSlugs = new Set()
  const rows = []

  for (const t of active) {
    if (!t.slug || !t.title || !t.levels || t.levels.length === 0) continue
    if (seenSlugs.has(t.slug)) {
      console.warn(`[gen-topics-catalog] slug duplicado, salteo id=${t.id} slug=${t.slug}`)
      continue
    }
    seenSlugs.add(t.slug)

    const vocabSource = (t.generated_vocab ?? []).map(normalizeVocabPhrase).filter(Boolean)
    const keywordsSource = (t.keywords ?? []).filter(Boolean)
    if (vocabSource.length === 0) {
      console.warn(`[gen-topics-catalog] sin generated_vocab, salteo id=${t.id} slug=${t.slug}`)
      continue
    }

    const titleLower = t.title.toLowerCase()
    const ctx = {
      id: t.id,
      title: t.title,
      titleLower,
      audience: t.audience,
      segmento: t.segmento,
      levels: t.levels,
      vocab0: vocabSource[0],
    }

    const heroLead = HERO_LEAD_TEMPLATES[t.id % HERO_LEAD_TEMPLATES.length](ctx)
    const learnIntro = LEARN_INTRO_TEMPLATES[(t.id + 1) % LEARN_INTRO_TEMPLATES.length](ctx)
    const audLine = audienceLine(ctx)
    const metaDescription = truncate(META_DESC_TEMPLATES[t.id % META_DESC_TEMPLATES.length](ctx), 158)

    rows.push({
      id: t.id,
      slug: t.slug,
      title: t.title,
      category: t.category ?? 'general',
      categoryLabel: categoryLabel(t.category ?? 'general'),
      audience: t.audience === 'kid' ? 'kid' : 'adult',
      segmento: t.segmento ?? 'adultos',
      levels: t.levels,
      keywords: keywordsSource.slice(0, 6),
      vocabPhrases: vocabSource.slice(0, 6),
      metaDescription,
      heroLead,
      learnIntro,
      audienceLine: audLine,
      updatedAt: (t.updated_at ?? t.created_at ?? '').slice(0, 10) || null,
    })
  }

  rows.sort((a, b) => a.id - b.id)

  const genComment = (extra) => `// GENERADO — no editar a mano.
// Fuente: data/catalogo/topics.json (snapshot F0-05, tabla \`topics\` real).
// Regenerar: node scripts/gen-topics-catalog.mjs (desde frontend/), tras cambiar el catálogo,
// y commitear el resultado — mismo criterio que el resto del catálogo-como-código.
// Generado: ${new Date().toISOString().slice(0, 10)} · ${rows.length} tópicos activos.${extra ? `\n// ${extra}` : ''}
`

  // --- 1) Conteo: cero costo de bundle, para copy tipo "N tópicos" en paginas EAGER
  // (Tutors/HowItWorks/Home se importan sincronicas — ver comentario en App.tsx). ---
  const countFile = `${genComment('SOLO el numero — usar en paginas que se bundlean sincronicas.')}
export const TOPICS_COUNT = ${rows.length}
`
  writeFileSync(OUT_COUNT, countFile, 'utf8')

  // --- 2) Indice liviano (sin prosa): para el listado /topicos y para armar
  // "topicos hermanos" sin cargar la prosa completa de CADA topico. ---
  const indexRows = rows
    .map(
      (r) => `  {
    id: ${r.id},
    slug: '${esc(r.slug)}',
    title: '${esc(r.title)}',
    category: '${esc(r.category)}',
    categoryLabel: '${esc(r.categoryLabel)}',
    audience: '${r.audience}',
    segmento: '${esc(r.segmento)}',
    levels: [${r.levels.map((l) => `'${esc(l)}'`).join(', ')}],
    keywords: [${r.keywords.map((k) => `'${esc(k)}'`).join(', ')}],
  },`,
    )
    .join('\n')
  const indexFile = `${genComment('Listado LIVIANO (sin prosa) — usa esto Topics.tsx (eager). El contenido completo esta en topicsCatalog.generated.ts (lazy, solo TopicDetail).')}
export interface TopicIndexEntry {
  id: number
  slug: string
  title: string
  category: string
  categoryLabel: string
  audience: 'adult' | 'kid'
  segmento: string
  levels: ReadonlyArray<string>
  /** Hasta 6 keywords reales del tópico (composer_proto usa keywords[:6]). */
  keywords: ReadonlyArray<string>
}

export const TOPICS_INDEX: ReadonlyArray<TopicIndexEntry> = [
${indexRows}
]
`
  writeFileSync(OUT_INDEX, indexFile, 'utf8')

  // --- 3) Catalogo completo con prosa (heroLead/learnIntro/audienceLine/vocabPhrases):
  // SOLO lo importa TopicDetail.tsx, que ya esta lazy-loaded en App.tsx. ---
  const fullRows = rows
    .map(
      (r) => `  {
    id: ${r.id},
    slug: '${esc(r.slug)}',
    title: '${esc(r.title)}',
    category: '${esc(r.category)}',
    categoryLabel: '${esc(r.categoryLabel)}',
    audience: '${r.audience}',
    segmento: '${esc(r.segmento)}',
    levels: [${r.levels.map((l) => `'${esc(l)}'`).join(', ')}],
    keywords: [${r.keywords.map((k) => `'${esc(k)}'`).join(', ')}],
    vocabPhrases: [${r.vocabPhrases.map((v) => `'${esc(v)}'`).join(', ')}],
    metaDescription: '${esc(r.metaDescription)}',
    heroLead: '${esc(r.heroLead)}',
    learnIntro: '${esc(r.learnIntro)}',
    audienceLine: '${esc(r.audienceLine)}',
    updatedAt: ${r.updatedAt ? `'${r.updatedAt}'` : 'null'},
  },`,
    )
    .join('\n')
  const fullFile = `${genComment('Contenido COMPLETO (con prosa) — solo lo importa TopicDetail.tsx (lazy). NO importar desde paginas eager (Topics/Tutors/HowItWorks/Home) — usar topicsIndex.generated.ts o topicsCount.generated.ts para eso.')}
export interface CatalogTopic {
  id: number
  slug: string
  title: string
  category: string
  categoryLabel: string
  audience: 'adult' | 'kid'
  segmento: string
  levels: ReadonlyArray<string>
  /** Hasta 6 keywords reales del tópico (composer_proto usa keywords[:6]). */
  keywords: ReadonlyArray<string>
  /** Hasta 6 frases reales de generated_vocab — contenido único por página. */
  vocabPhrases: ReadonlyArray<string>
  /** 140-160 chars, única por tópico (incluye una frase real de vocabPhrases). */
  metaDescription: string
  /** Bajada del hero, arma sobre el título real. */
  heroLead: string
  /** Intro de la sección de vocabulario. */
  learnIntro: string
  /** Para quién es este tópico (edad/nivel), en base a segmento + levels reales. */
  audienceLine: string
  updatedAt: string | null
}

export const TOPICS_CATALOG: ReadonlyArray<CatalogTopic> = [
${fullRows}
]
`
  writeFileSync(OUT_FULL, fullFile, 'utf8')

  console.log(
    `[gen-topics-catalog] OK — ${rows.length} tópicos -> topicsCount.generated.ts + topicsIndex.generated.ts + topicsCatalog.generated.ts`,
  )
}

main()

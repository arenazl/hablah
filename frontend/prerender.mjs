// Prerender de las rutas publicas de marketing.
// Levanta el server de `vite preview` sobre /dist, abre cada ruta con un
// navegador headless (Puppeteer), espera a que React pinte el contenido y
// guarda el HTML ya renderizado como dist/<ruta>/index.html.
//
// Es DELIBERADAMENTE no-fatal: si Puppeteer no esta disponible o algo falla,
// loguea un warning y termina con exit 0, dejando el build CSR normal. Asi un
// build de CI nunca se rompe por el prerender.

import { preview } from 'vite'
import path from 'node:path'
import fs from 'node:fs'

const PORT = 4199
const HOST = '127.0.0.1'

// Slugs leidos EN VIVO del catalogo real (data/catalogo/topics.json, snapshot F0-05) —
// asi el prerender siempre cubre TODOS los topicos activos, sin una lista hardcodeada
// que se desincroniza cada vez que se cura el catalogo (era el caso hasta WO F5-02:
// 28 topicos fijos de un snapshot viejo, cuando la DB ya tenia ~99 activos).
function loadTopicSlugs() {
  try {
    const dataPath = path.resolve(process.cwd(), '../data/catalogo/topics.json')
    const topics = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const slugs = topics
      .filter((t) => t.is_active && t.slug)
      .sort((a, b) => a.id - b.id)
      .map((t) => t.slug)
    if (slugs.length === 0) throw new Error('catalogo sin topicos activos')
    return slugs
  } catch (err) {
    console.warn(
      `[prerender] No se pudo leer data/catalogo/topics.json (${err && err.message ? err.message : err}); prerender de /topicos/:slug salteado.`,
    )
    return []
  }
}
const TOPIC_SLUGS = loadTopicSlugs()
const ROUTES = [
  '/',
  '/como-funciona',
  '/tutores',
  '/topicos',
  '/precios',
  '/faq',
  ...TOPIC_SLUGS.map((slug) => `/topicos/${slug}`),
]
const distDir = path.resolve(process.cwd(), 'dist')
const SITE_ORIGIN = 'https://hablah.com.ar'
// Description corta (~155 chars) — version final para SEO snippet.
const SHORT_DESCRIPTION =
  'Aprendé inglés, portugués o italiano hablando 5 min por día con un tutor de IA que se adapta a vos. Sin exámenes, sin lecciones lineales. 14 días gratis.'
// Marcador del description largo viejo (188 chars) que queremos reemplazar.
const LONG_DESC_MARKER = 'tu nivel, tus intereses y tus errores'

function canonicalForRoute(route) {
  // Netlify sirve las rutas internas como carpeta/index.html, o sea con barra
  // final (la version sin barra hace 301 -> con barra). La URL canonica tiene
  // que coincidir con la que devuelve 200 para no apuntar a un redirect.
  if (route === '/') return `${SITE_ORIGIN}/`
  return `${SITE_ORIGIN}${route}/`
}

function rewriteHeadForRoute(html, route) {
  let out = html
  let canonicalReplaced = false
  let descriptionReplaced = false

  const canonicalHref = canonicalForRoute(route)
  const canonicalTag = `<link rel="canonical" href="${canonicalHref}">`
  const canonicalRegex = /<link\s+rel="canonical"[^>]*>/i
  if (canonicalRegex.test(out)) {
    out = out.replace(canonicalRegex, canonicalTag)
    canonicalReplaced = true
  } else {
    console.warn(`[prerender] No matchea <link rel="canonical"> en ${route}; sigo sin reemplazar.`)
  }

  const descriptionRegex = /<meta\s+name="description"[^>]*>/i
  const descMatch = out.match(descriptionRegex)
  if (descMatch) {
    // Solo reemplazo si todavia es la version vieja larga.
    if (descMatch[0].includes(LONG_DESC_MARKER)) {
      const descTag = `<meta name="description" content="${SHORT_DESCRIPTION}">`
      out = out.replace(descriptionRegex, descTag)
      descriptionReplaced = true
    }
  } else {
    console.warn(`[prerender] No matchea <meta name="description"> en ${route}; sigo sin reemplazar.`)
  }

  return { html: out, canonicalReplaced, descriptionReplaced }
}

// Mata el proceso completo si el prerender se cuelga mas de 4 minutos.
// Es un backstop de emergencia: si algo se traba (API lenta, Puppeteer colgado),
// el build de CI no muere — termina con exit 0 y queda el dist CSR.
const GLOBAL_TIMEOUT_MS = 4 * 60 * 1000
const globalTimer = setTimeout(() => {
  console.warn('[prerender] Timeout global (4 min) — saliendo con build CSR.')
  process.exit(0)
}, GLOBAL_TIMEOUT_MS)
globalTimer.unref() // no bloquea el event loop si todo sale bien antes

async function main() {
  let puppeteer
  try {
    puppeteer = (await import('puppeteer')).default
  } catch {
    console.warn('[prerender] Puppeteer no esta instalado; salteo prerender (build CSR).')
    return
  }

  const server = await preview({
    preview: { port: PORT, strictPort: true, host: HOST },
  })
  const base = `http://${HOST}:${PORT}`

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage()
      try {
        // domcontentloaded en lugar de networkidle0: no esperamos a que terminen
        // las llamadas al backend (Heroku). El waitForFunction de abajo se encarga
        // de esperar a que React pinte el contenido.
        await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 15000 })
        // Esperar a que el contenido real este pintado dentro de #root.
        await page
          .waitForFunction(
            () => {
              const r = document.getElementById('root')
              return !!r && !!r.innerText && r.innerText.replace(/\s/g, '').length > 200
            },
            { timeout: 30000 },
          )
          .catch(() => {})

        const rawHtml = await page.content()
        let finalHtml = rawHtml
        try {
          const rewritten = rewriteHeadForRoute(rawHtml, route)
          finalHtml = rewritten.html
          if (!rewritten.canonicalReplaced) {
            console.warn(`[prerender] WARN canonical no reemplazada en ${route}`)
          }
        } catch (rewriteErr) {
          console.warn(
            `[prerender] WARN al reescribir head de ${route}: ${rewriteErr && rewriteErr.message ? rewriteErr.message : rewriteErr}`,
          )
        }
        const outDir = route === '/' ? distDir : path.join(distDir, route)
        fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(path.join(outDir, 'index.html'), finalHtml, 'utf8')
        console.log(`[prerender] OK ${route} -> ${path.relative(distDir, path.join(outDir, 'index.html'))} (${finalHtml.length} bytes)`)
      } catch (err) {
        console.warn(`[prerender] Fallo en ${route}: ${err && err.message ? err.message : err}`)
      } finally {
        await page.close().catch(() => {})
      }
    }
  } finally {
    await browser.close().catch(() => {})
    await new Promise((res) => server.httpServer.close(res))
  }
}

main().catch((e) => {
  console.warn('[prerender] Error general, sigo con build CSR:', e && e.message ? e.message : e)
})

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
// Slugs derivados de los titulos de topicos (deben mantenerse en sync con la
// data en backend / src/pages/landing/Topics.tsx). La helper usada para generar:
//   title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
//        .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const TOPIC_SLUGS = [
  'musica-electronica-uk-garage',
  'arquitectura-de-software',
  'produccion-musical-ableton',
  'ia-generativa-etica',
  'entrenamiento-de-fuerza-powerlifting',
  'metodologias-agiles-retrospectivas',
  'cine-de-los-90-tarantino',
  'anecdotas-de-aeropuertos',
  'futbol-mundiales-y-selecciones',
  'basquet-nba-y-leyendas',
  'running-entrenamiento-y-maratones',
  'tenis-grand-slam-y-rivalidades',
  'formula-1-y-automovilismo',
  'cocina-italiana-pasta-y-vinos',
  'asado-argentino-tecnica-y-rituales',
  'cafe-de-especialidad-v60-espresso',
  'espacio-astronomia-y-misiones',
  'cambio-climatico-ciencia-y-politicas',
  'biologia-evolucion-y-genetica',
  'series-de-streaming-drama-prestigio',
  'videojuegos-indie-y-aaa',
  'rock-clasico-70s-a-90s',
  'stand-up-comediantes-y-especiales',
  'meditacion-y-mindfulness',
  'nutricion-dietas-y-mitos',
  'moda-streetwear-y-sneakers',
  'trabajo-remoto-nomade-digital',
  'entrevistas-tecnicas-system-design',
]
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
        await page.goto(base + route, { waitUntil: 'networkidle0', timeout: 60000 })
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

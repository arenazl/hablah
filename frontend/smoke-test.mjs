// Smoke test E2E pre-deploy.
//
// Levanta `vite preview` sobre /dist, abre cada ruta publica en headless
// Chrome, escucha console.error + pageerror + unhandledrejection, y falla
// con exit code 1 si encuentra algo.
//
// Uso:
//   npm run smoke           (despues de npm run build)
//
// Si falla, NO deployees a Netlify hasta arreglar el error.

import { preview } from 'vite'

const PORT = 4299
const HOST = '127.0.0.1'
const ROUTES = ['/', '/como-funciona', '/tutores', '/topicos', '/precios', '/faq', '/login']
const WAIT_AFTER_LOAD_MS = 2500 // tiempo para que efectos / hydration se rompan si van a romper

async function main() {
  let puppeteer
  try {
    puppeteer = (await import('puppeteer')).default
  } catch {
    console.error('[smoke] Puppeteer no esta instalado. Instalalo con: npm i -D puppeteer')
    process.exit(1)
  }

  const server = await preview({
    preview: { port: PORT, strictPort: true, host: HOST },
  })
  const base = `http://${HOST}:${PORT}`
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const errors = []

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage()
      const pageErrors = []

      page.on('console', (msg) => {
        const type = msg.type()
        if (type === 'error') {
          const text = msg.text()
          // Filtrar errores conocidos no-criticos
          if (text.includes('Failed to load resource')) return
          if (text.includes('favicon')) return
          if (text.includes('[SW]')) return
          pageErrors.push({ kind: 'console.error', text })
        }
      })
      page.on('pageerror', (err) => {
        pageErrors.push({ kind: 'pageerror', text: err.message, stack: err.stack })
      })
      page.on('requestfailed', (req) => {
        const url = req.url()
        // Ignorar requests a APIs externas que pueden fallar en headless
        if (url.includes('/api/')) return
        if (url.includes('fonts.googleapis')) return
        if (url.includes('fonts.gstatic')) return
        pageErrors.push({ kind: 'requestfailed', text: `${req.method()} ${url}` })
      })

      try {
        await page.goto(base + route, { waitUntil: 'networkidle0', timeout: 30000 })
        await new Promise((res) => setTimeout(res, WAIT_AFTER_LOAD_MS))

        // Verificar que el root tenga contenido (la app monto OK)
        const rootHasContent = await page.evaluate(() => {
          const r = document.getElementById('root')
          return !!r && r.innerText.replace(/\s/g, '').length > 50
        })
        if (!rootHasContent) {
          pageErrors.push({ kind: 'empty_root', text: '#root quedo sin contenido tras montar' })
        }
      } catch (err) {
        pageErrors.push({ kind: 'navigation', text: err.message || String(err) })
      } finally {
        await page.close().catch(() => {})
      }

      if (pageErrors.length === 0) {
        console.log(`[smoke] OK ${route}`)
      } else {
        console.error(`[smoke] FAIL ${route} (${pageErrors.length} errores)`)
        for (const e of pageErrors) {
          console.error(`  - [${e.kind}] ${e.text}`)
          if (e.stack) console.error(`    stack: ${e.stack.split('\n').slice(0, 3).join(' | ')}`)
        }
        errors.push({ route, pageErrors })
      }
    }
  } finally {
    await browser.close().catch(() => {})
    await new Promise((res) => server.httpServer.close(res))
  }

  if (errors.length > 0) {
    console.error(`\n[smoke] ${errors.length} ruta(s) con errores. NO DEPLOYEES.`)
    process.exit(1)
  }
  console.log(`\n[smoke] OK - ${ROUTES.length} rutas sin errores. Listo para deploy.`)
  process.exit(0)
}

main().catch((e) => {
  console.error('[smoke] Error fatal:', e)
  process.exit(1)
})

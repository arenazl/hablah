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
const ROUTES = ['/', '/como-funciona', '/tutores', '/topicos', '/precios', '/faq']
const distDir = path.resolve(process.cwd(), 'dist')

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

        const html = await page.content()
        const outDir = route === '/' ? distDir : path.join(distDir, route)
        fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8')
        console.log(`[prerender] OK ${route} -> ${path.relative(distDir, path.join(outDir, 'index.html'))} (${html.length} bytes)`)
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

#!/usr/bin/env node
/**
 * Submit URLs a IndexNow (Bing/Yandex/etc) y ping a Google sitemap.
 * - IndexNow: requiere un key file en /public/<key>.txt con el mismo contenido.
 * - Google ping: GET a www.google.com/ping?sitemap=...
 */
import { randomBytes } from 'node:crypto'
import { writeFile, mkdir, readFile, access } from 'node:fs/promises'

const HOST = 'hablah.com.ar'
const ORIGIN = `https://${HOST}`

// Lee sitemap.xml para obtener TODAS las URLs (marketing + tópicos)
import { readFile as readFileForUrls } from 'node:fs/promises'
const SITEMAP_PATH = new URL('../public/sitemap.xml', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const sitemapXml = await readFileForUrls(SITEMAP_PATH, 'utf8')
const URLS = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
console.log(`Read ${URLS.length} URLs from sitemap`)

const PUBLIC_DIR = new URL('../public/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

// Get-or-create IndexNow key (32 hex chars stored in public/.indexnow-key)
const KEY_FILE = PUBLIC_DIR + '.indexnow-key'
let key
try {
  key = (await readFile(KEY_FILE, 'utf8')).trim()
} catch {
  key = randomBytes(16).toString('hex')
  await writeFile(KEY_FILE, key)
}

// Public key file at <key>.txt that IndexNow services fetch to verify ownership
const keyTxtPath = PUBLIC_DIR + `${key}.txt`
await writeFile(keyTxtPath, key)
console.log(`IndexNow key: ${key}`)
console.log(`Key file: /${key}.txt (will be served by Netlify after deploy)`)

// Submit to IndexNow (aggregator endpoint — propagates to Bing, Yandex, etc)
const payload = {
  host: HOST,
  key,
  keyLocation: `${ORIGIN}/${key}.txt`,
  urlList: URLS,
}

console.log(`\nSubmitting ${URLS.length} URLs to IndexNow...`)
try {
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  console.log(`  IndexNow → ${res.status} ${res.statusText}`)
  if (res.status === 422) {
    console.log('  (422 puede aparecer la primera vez hasta que Netlify sirva el key file — re-ejecutar despues del deploy)')
  }
} catch (e) {
  console.log(`  IndexNow error: ${e.message}`)
}

// Google sitemap ping (deprecated pero a veces aun funciona como crawl hint)
const sitemapPingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(ORIGIN + '/sitemap.xml')}`
console.log(`\nPing Google sitemap...`)
try {
  const res = await fetch(sitemapPingUrl)
  console.log(`  Google ping → ${res.status}`)
} catch (e) {
  console.log(`  Google ping error: ${e.message}`)
}

console.log(`
DONE.

For full indexing also recommended (manual, una vez):
- Google Search Console: https://search.google.com/search-console
  - Verificar propiedad de ${HOST}
  - Sitemaps → Submit: ${ORIGIN}/sitemap.xml
- Bing Webmaster Tools: https://www.bing.com/webmasters
  - Add site + submit sitemap
`)

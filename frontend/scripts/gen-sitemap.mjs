#!/usr/bin/env node
/**
 * Genera public/sitemap.xml en build (WO F5-01) a partir de:
 * - Las rutas de marketing fijas (landing, como-funciona, tutores, topicos, precios, faq).
 * - TODOS los topicos activos del snapshot real (data/catalogo/topics.json), asi el sitemap
 *   nunca queda desincronizado del catalogo (antes era un archivo estatico con 28 topicos
 *   hardcodeados de un snapshot viejo).
 *
 * Corre ANTES de `vite build` (public/ se copia tal cual a dist/) — ver npm script "gen:seo".
 * Uso: node scripts/gen-sitemap.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.resolve(__dirname, '../../data/catalogo/topics.json')
const OUT_PATH = path.resolve(__dirname, '../public/sitemap.xml')
const SITE_ORIGIN = 'https://hablah.com.ar'
const TODAY = new Date().toISOString().slice(0, 10)

const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/como-funciona', changefreq: 'monthly', priority: '0.9' },
  { path: '/tutores', changefreq: 'monthly', priority: '0.8' },
  { path: '/topicos', changefreq: 'weekly', priority: '0.8' },
  { path: '/precios', changefreq: 'weekly', priority: '0.9' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
]

function urlEntry(routePath, lastmod, changefreq, priority) {
  const loc = routePath === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${routePath}/`
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${loc}" />
    <xhtml:link rel="alternate" hreflang="es-AR" href="${loc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />
  </url>`
}

function main() {
  const all = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
  const activeTopics = all
    .filter((t) => t.is_active && t.slug)
    .sort((a, b) => a.id - b.id)

  const entries = []

  for (const r of STATIC_ROUTES) {
    entries.push(urlEntry(r.path, TODAY, r.changefreq, r.priority))
  }

  for (const t of activeTopics) {
    const lastmod = (t.updated_at ?? t.created_at ?? TODAY).slice(0, 10) || TODAY
    entries.push(urlEntry(`/topicos/${t.slug}`, lastmod, 'monthly', '0.6'))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

${entries.join('\n\n')}

</urlset>
`

  writeFileSync(OUT_PATH, xml, 'utf8')
  console.log(
    `[gen-sitemap] OK — ${STATIC_ROUTES.length} rutas fijas + ${activeTopics.length} tópicos -> ${path.relative(process.cwd(), OUT_PATH)}`,
  )
}

main()

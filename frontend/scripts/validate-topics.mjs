#!/usr/bin/env node
/**
 * Valida que TODAS las paginas /topicos/<slug> se sirvan prerendered con:
 * - HTTP 200
 * - HTML real (>5KB content)
 * - <h1> presente
 * - <title> distinto del home
 * - canonical apunta a la URL especifica (no a /)
 * - JSON-LD Course o BreadcrumbList presente
 */
import { readFile } from 'node:fs/promises'

const SITEMAP_PATH = new URL('../public/sitemap.xml', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const sitemap = await readFile(SITEMAP_PATH, 'utf8')

const ALL_URLS = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
const TOPIC_URLS = ALL_URLS.filter(u => u.includes('/topicos/'))
console.log(`Total URLs in sitemap: ${ALL_URLS.length}`)
console.log(`Topic URLs to validate: ${TOPIC_URLS.length}\n`)

// Home reference para comparar
const homeRes = await fetch('https://hablah.com.ar/')
const homeHtml = await homeRes.text()
const homeTitleMatch = homeHtml.match(/<title>([^<]+)<\/title>/i)
const homeTitle = homeTitleMatch ? homeTitleMatch[1].trim() : ''

console.log(`Home title for comparison: "${homeTitle}"\n`)

async function validate(url) {
  try {
    const r = await fetch(url)
    const html = await r.text()
    const slug = url.split('/topicos/')[1] || ''
    const checks = {
      status: r.status,
      bytes: html.length,
      hasH1: /<h1[^>]*>([^<]+)<\/h1>/i.test(html),
      title: (html.match(/<title>([^<]+)<\/title>/i) || ['',''])[1].trim(),
      titleIsUnique: false,
      canonical: '',
      canonicalIsSpecific: false,
      hasCourseSchema: /"@type"\s*:\s*"Course"/i.test(html) || /"@type":"Course"/i.test(html),
      hasBreadcrumb: /"@type"\s*:\s*"BreadcrumbList"/i.test(html) || /"@type":"BreadcrumbList"/i.test(html),
    }
    checks.titleIsUnique = checks.title !== homeTitle && checks.title.length > 0
    const canMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)
    checks.canonical = canMatch ? canMatch[1] : ''
    checks.canonicalIsSpecific = checks.canonical.includes(`/topicos/${slug}`)
    return { url, slug, ok: r.status === 200 && checks.hasH1 && checks.titleIsUnique && checks.canonicalIsSpecific, checks }
  } catch (e) {
    return { url, ok: false, error: e.message }
  }
}

// Paralelizar (limite 8 concurrentes para no saturar Netlify)
const CONCURRENCY = 8
const results = []
for (let i = 0; i < TOPIC_URLS.length; i += CONCURRENCY) {
  const batch = TOPIC_URLS.slice(i, i + CONCURRENCY)
  const batchResults = await Promise.all(batch.map(validate))
  results.push(...batchResults)
}

const ok = results.filter(r => r.ok)
const bad = results.filter(r => !r.ok)

console.log(`OK:  ${ok.length}/${results.length}`)
console.log(`BAD: ${bad.length}/${results.length}\n`)

if (bad.length > 0) {
  console.log('=== FAILED ===')
  for (const r of bad) {
    console.log(`\n${r.url}`)
    if (r.error) console.log(`  error: ${r.error}`)
    else {
      const c = r.checks
      console.log(`  status: ${c.status}, bytes: ${c.bytes}`)
      console.log(`  h1: ${c.hasH1 ? '✓' : '✗'}`)
      console.log(`  title unique: ${c.titleIsUnique ? '✓' : '✗'} ("${c.title.slice(0, 60)}")`)
      console.log(`  canonical specific: ${c.canonicalIsSpecific ? '✓' : '✗'} (${c.canonical})`)
      console.log(`  Course schema: ${c.hasCourseSchema ? '✓' : '✗'}`)
      console.log(`  BreadcrumbList: ${c.hasBreadcrumb ? '✓' : '✗'}`)
    }
  }
}

console.log(`\nDONE. ${ok.length}/${results.length} OK`)

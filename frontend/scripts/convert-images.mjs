#!/usr/bin/env node
/**
 * Convierte PNGs grandes de landing a WebP + AVIF (calidad alta).
 * Mantiene los PNG originales como fallback.
 */
import sharp from 'sharp'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const DIRS = [
  'public/landing-screens',
  'public/icons',
]

const SOURCE_ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) yield* walk(full)
    else if (e.isFile() && /\.png$/i.test(e.name)) yield full
  }
}

async function convert(file) {
  const webpPath = file.replace(/\.png$/i, '.webp')
  const avifPath = file.replace(/\.png$/i, '.avif')
  const before = (await stat(file)).size

  // WebP: q80, balance calidad/peso
  await sharp(file).webp({ quality: 80, effort: 5 }).toFile(webpPath)
  const webpSize = (await stat(webpPath)).size

  // AVIF: q60, mejor compresion
  await sharp(file).avif({ quality: 60, effort: 6 }).toFile(avifPath)
  const avifSize = (await stat(avifPath)).size

  const reduction = (1 - webpSize / before) * 100
  console.log(`  ${file.replace(SOURCE_ROOT, '')}`)
  console.log(`    PNG  ${(before/1024).toFixed(1)}KB → WebP ${(webpSize/1024).toFixed(1)}KB (-${reduction.toFixed(0)}%), AVIF ${(avifSize/1024).toFixed(1)}KB`)
}

console.log('Converting PNGs to WebP + AVIF...')
let count = 0
for (const dir of DIRS) {
  const fullDir = join(SOURCE_ROOT, dir)
  try {
    for await (const file of walk(fullDir)) {
      await convert(file)
      count++
    }
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
}
console.log(`\nDone. ${count} images converted.`)

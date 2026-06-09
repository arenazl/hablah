#!/usr/bin/env node
/**
 * Genera la OG image (1200x630) con tildes correctas: "Hablás. Aprendés."
 */
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const SVG = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1614"/>
      <stop offset="100%" stop-color="#050a09"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#00B37E" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#00B37E" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#00B37E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#9CFCD2"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <ellipse cx="600" cy="315" rx="600" ry="380" fill="url(#glow)"/>

  <!-- Grid sutil -->
  <g opacity="0.08" stroke="#9CFCD2" stroke-width="1">
    ${Array.from({length: 13}, (_, i) => `<line x1="${i*100}" y1="0" x2="${i*100}" y2="630"/>`).join('\n    ')}
    ${Array.from({length: 8}, (_, i) => `<line x1="0" y1="${i*90}" x2="1200" y2="${i*90}"/>`).join('\n    ')}
  </g>

  <!-- Brand chip top-left -->
  <g transform="translate(60, 56)">
    <rect width="170" height="38" rx="19" fill="rgba(0,179,126,0.12)" stroke="rgba(0,179,126,0.4)" stroke-width="1"/>
    <circle cx="22" cy="19" r="6" fill="#00B37E"/>
    <text x="38" y="25" fill="#9CFCD2" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="0.5">habláh</text>
  </g>

  <!-- Tagline top-right -->
  <text x="1140" y="80" fill="#ffffff" opacity="0.55" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="14" font-weight="600" letter-spacing="2" text-anchor="end">APRENDER IDIOMAS CON IA</text>

  <!-- Main title -->
  <text x="600" y="300" fill="url(#titleGrad)" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="108" font-weight="900" text-anchor="middle" letter-spacing="-3">Hablás. Aprendés.</text>

  <!-- Subtitle -->
  <text x="600" y="370" fill="rgba(255,255,255,0.78)" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="32" font-weight="500" text-anchor="middle" letter-spacing="-0.5">Inglés, portugués e italiano con un tutor de IA conversacional</text>

  <!-- Bottom badge -->
  <g transform="translate(600, 510)">
    <rect x="-220" y="-30" width="440" height="60" rx="30" fill="#00B37E"/>
    <text x="0" y="9" fill="#0a1614" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="22" font-weight="800" text-anchor="middle" letter-spacing="-0.3">14 días Pro gratis · hablah.com.ar</text>
  </g>

  <!-- Decorative dots -->
  <g fill="#00B37E" opacity="0.6">
    <circle cx="120" cy="500" r="3"/>
    <circle cx="155" cy="540" r="2"/>
    <circle cx="1080" cy="490" r="3"/>
    <circle cx="1050" cy="540" r="2"/>
  </g>
</svg>
`

const out = new URL('../public/icons/og-image.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

await sharp(Buffer.from(SVG))
  .png({ quality: 92, compressionLevel: 9 })
  .toFile(out)

console.log(`OG image generated: ${out}`)

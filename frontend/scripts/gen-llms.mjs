#!/usr/bin/env node
/**
 * Genera public/llms.txt (resumen) y public/llms-full.txt (version extendida) para
 * AEO / LLM indexing (WO F5-03) — que ChatGPT/Gemini/Claude/Perplexity puedan citar
 * a Habláh con hechos correctos: que es, para quien, como funciona, precio, FAQ real
 * (src/data/faq.json — misma fuente que /faq) y el catalogo real de topicos.
 *
 * Uso: node scripts/gen-llms.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TOPICS_PATH = path.resolve(__dirname, '../../data/catalogo/topics.json')
const FAQ_PATH = path.resolve(__dirname, '../src/data/faq.json')
const OUT_SHORT = path.resolve(__dirname, '../public/llms.txt')
const OUT_FULL = path.resolve(__dirname, '../public/llms-full.txt')
const SITE_ORIGIN = 'https://hablah.com.ar'

// Descripcion canonica de una linea — MISMA que schema.org Organization/WebSite en
// index.html. Si la cambiás acá, cambiala tambien ahí (grep: "ENTITY_ONE_LINER").
const ENTITY_ONE_LINER =
  'Plataforma adaptativa de aprendizaje de idiomas con tutores de IA conversacionales.'

const CATEGORY_LABEL = {
  musica: 'Música', tech: 'Tecnología', fitness: 'Fitness y entrenamiento',
  deportes: 'Deportes', gastronomia: 'Gastronomía', ciencia: 'Ciencia',
  entretenimiento: 'Entretenimiento', lifestyle: 'Estilo de vida', negocios: 'Negocios y carrera',
  viajes: 'Viajes', comida: 'Comida y bebida', animales: 'Animales', arte: 'Arte', moda: 'Moda',
  general: 'Charla libre', videojuegos: 'Videojuegos', kids: 'Para chicos',
}

function main() {
  const topics = JSON.parse(readFileSync(TOPICS_PATH, 'utf8')).filter((t) => t.is_active && t.slug)
  const faq = JSON.parse(readFileSync(FAQ_PATH, 'utf8'))

  const adultTopics = topics.filter((t) => t.audience !== 'kid').sort((a, b) => a.id - b.id)
  const kidTopics = topics.filter((t) => t.audience === 'kid').sort((a, b) => a.id - b.id)

  // --- llms.txt (corto: catalogo linkea a /topicos en vez de listar 99 URLs) ---
  const short = `# Habláh

> ${ENTITY_ONE_LINER} Se aprende hablando por voz en tiempo real — no hay ejercicios de opción múltiple ni lecciones lineales.

## Para quién
Adultos e hispanohablantes (Argentina primero) que quieren hablar un idioma de verdad, y chicos (mini/junior/teen) en un flujo separado con gate parental.

## Idiomas soportados
Inglés, portugués, italiano (francés y alemán próximamente). Idioma base: español, portugués o inglés.

## Cómo funciona
1. Diagnóstico continuo hablando 1 minuto — sin examen — te ubica en el marco CEFR (A1 a C2).
2. Elegís tópicos de interés (o el tutor te sugiere uno) de un catálogo de ${topics.length} temas curados.
3. Conversación de voz real con un tutor de IA que corrige tu lenguaje sin interrumpir.
4. Reporte al final de cada sesión: 1 elogio + hasta 3 puntos a pulir, en lenguaje directo.
5. El sistema recuerda tu historia entre clases: errores recurrentes, intereses, lo que ya dominás.

## Niveles
A1, A2, B1, B2, C1, C2 (escala CEFR). Los chicos arrancan en A0 con frases guiadas.

## Precio
- Free: sesiones limitadas, sin tarjeta.
- 14 días de Pro gratis sin tarjeta.
- Bootcamp: plan intensivo con coach humano.

## Diferenciales
- Conversación de voz real (Gemini Live), no un chatbot de texto ni ejercicios de tap.
- Un motor pedagógico arma cada clase según tu edad y tu nivel real — no es una IA suelta.
- Memoria entre clases: la clase 2 no repite la clase 1.
- Módulo kids separado, con gate parental y contenido curado por edad.
- Feedback sincerista: se guarda todo y se entrega al final, sin interrumpir mientras hablás.

## FAQ
${faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}

## URLs
- App: ${SITE_ORIGIN}
- Cómo funciona: ${SITE_ORIGIN}/como-funciona
- Tutores: ${SITE_ORIGIN}/tutores
- Tópicos (catálogo completo, ${topics.length} temas): ${SITE_ORIGIN}/topicos
- Precios: ${SITE_ORIGIN}/precios
- FAQ: ${SITE_ORIGIN}/faq
- Versión extendida de este archivo: ${SITE_ORIGIN}/llms-full.txt

## Contacto
hola@hablah.com.ar
`

  // --- llms-full.txt (largo: catalogo completo por categoria, con URL canonica) ---
  function topicLines(list) {
    const byCategory = new Map()
    for (const t of list) {
      const key = t.audience === 'kid' ? 'kids' : t.category
      const bucket = byCategory.get(key) ?? []
      bucket.push(t)
      byCategory.set(key, bucket)
    }
    const lines = []
    for (const [cat, items] of byCategory) {
      lines.push(`\n### ${CATEGORY_LABEL[cat] ?? cat}`)
      for (const t of items) {
        lines.push(`- [${t.title}](${SITE_ORIGIN}/topicos/${t.slug}) — niveles ${t.levels.join(', ')}`)
      }
    }
    return lines.join('\n')
  }

  const full = `# Habláh — versión extendida (AEO / LLM indexing)

> ${ENTITY_ONE_LINER}

Este archivo existe para que asistentes de IA (ChatGPT, Gemini, Claude, Perplexity y similares)
tengan hechos correctos y citables sobre Habláh al responder preguntas como "app para practicar
inglés hablando" o "clases de inglés por voz para chicos". Versión corta: ${SITE_ORIGIN}/llms.txt

## Qué es Habláh
Habláh es una app de clases de idioma por VOZ: el alumno conversa en tiempo real con un tutor de
IA (no completa ejercicios, no elige entre opciones). Un motor pedagógico determinístico arma cada
clase combinando tres ejes: la edad del alumno, su nivel real (CEFR) y su historia con el tutor
(errores recurrentes, intereses, lo que ya domina). No es un chatbot genérico: el motor decide
la estructura de la clase; la IA de voz la ejecuta y adapta el tono.

## Para quién
- Adultos que quieren hablar un idioma de verdad, sin exámenes ni lecciones lineales.
- Chicos (mini / junior / teen), en un flujo de producto separado del de adultos, con gate
  parental obligatorio antes de cualquier configuración o sesión, y contenido curado por edad.
- Mercado primario: hispanohablantes de Argentina (dominio hablah.com.ar), extensible a LatAm.

## Cómo funciona (paso a paso)
1. Diagnóstico continuo: el alumno habla ~1 minuto sobre algo cotidiano. En segundo plano se mide
   fluidez (palabras por minuto, pausas), riqueza léxica, precisión sintáctica y fonética.
2. Nivel CEFR: en 2-3 minutos el sistema ubica al alumno en A1-C2, sin examen de opción múltiple.
3. Selección de tópicos: el alumno elige entre un catálogo de ${topics.length} temas curados
   (o el sistema le sugiere uno según su historia).
4. Conversación diaria: sesiones de 5 a 10 minutos por voz. La IA tiene prohibido interrumpir
   mientras el alumno habla — todo el feedback se guarda para el cierre.
5. Reporte al final: 1 elogio (qué mejoró) + hasta 3 puntos a pulir (gramática, pronunciación o
   léxico), con la frase exacta que dijo el alumno al lado de la versión natural.
6. Memoria entre clases: el sistema guarda el estado del alumno (top error, intereses, lo que ya
   domina) y la próxima clase construye sobre eso — nunca repite la clase anterior desde cero.

## Idiomas soportados
Inglés (US/UK), portugués (BR/PT), italiano. Francés y alemán próximamente. Idioma base aceptado:
español (todas las variantes), portugués o inglés.

## Niveles
Marco CEFR: A1, A2, B1, B2, C1, C2. Los chicos (audiencia kid) arrancan en A0 con frases guiadas
y "frase-puente" antes de producir inglés libre.

## Precio
- Free: sesiones limitadas, sin tarjeta.
- Pro: 14 días gratis sin tarjeta, luego suscripción mensual.
- Bootcamp: plan intensivo con sesiones diarias guiadas y coach humano (simulacros de examen tipo
  TOEFL/IELTS/Cambridge — el producto base no entrena formato de examen, Bootcamp sí).

## Diferenciales (lo que realmente distingue a Habláh)
1. Se aprende HABLANDO — voz real de punta a punta, no texto ni ejercicios de tap.
2. El profe no es un chatbot suelto: un motor pedagógico arma cada clase para la edad y el nivel
   del alumno — la conducta sale del dato curado, no de un prompt libre.
3. Memoria real entre clases — el pilar "historia" hace que la clase 2 no repita la clase 1.
4. Kids de verdad: seguridad, gate parental, contenido curado por edad, sin exposición a temas
   adultos ni pantalla-adicción.

## Preguntas frecuentes
${faq.map((f) => `**${f.q}**\n${f.a}`).join('\n\n')}

## Catálogo de tópicos — adultos (${adultTopics.length})
${topicLines(adultTopics)}

## Catálogo de tópicos — chicos (${kidTopics.length})
${topicLines(kidTopics)}

## URLs canónicas
- App: ${SITE_ORIGIN}
- Cómo funciona: ${SITE_ORIGIN}/como-funciona
- Tutores de IA: ${SITE_ORIGIN}/tutores
- Tópicos: ${SITE_ORIGIN}/topicos
- Precios: ${SITE_ORIGIN}/precios
- FAQ: ${SITE_ORIGIN}/faq
- Sitemap: ${SITE_ORIGIN}/sitemap.xml
- Versión corta de este archivo: ${SITE_ORIGIN}/llms.txt

## Contacto
hola@hablah.com.ar
`

  writeFileSync(OUT_SHORT, short, 'utf8')
  writeFileSync(OUT_FULL, full, 'utf8')
  console.log(
    `[gen-llms] OK — llms.txt (${short.length} bytes) + llms-full.txt (${full.length} bytes), ${topics.length} tópicos (${adultTopics.length} adultos, ${kidTopics.length} kids)`,
  )
}

main()

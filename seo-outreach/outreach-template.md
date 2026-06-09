# Outreach Email Templates

> 3 versiones (frío, tibio, caliente) para blogs de aprendizaje de idiomas y podcasts edtech. Copy-paste, completar [VARIABLES] y enviar.

---

## Variables a completar (todas las versiones)

- `[NOMBRE]` — Nombre del editor/host
- `[BLOG/PODCAST]` — Nombre del medio
- `[TU_NOMBRE]` — Tu nombre
- `[ARTICULO_TITULO]` — Solo en versión tibia/caliente
- `[ARTICULO_URL]` — Solo en versión tibia/caliente
- `[PUNTO_ESPECIFICO]` — Cita o idea concreta del artículo (versión tibia/caliente)
- `[NOMBRE_PODCAST_EPISODIO]` — Episodio relevante (versión tibia/caliente)

---

## Versión A — FRÍO (sin contexto previo)

**Subject lines (rotar entre 3 para A/B testing):**
- `Quick question about [BLOG/PODCAST]`
- `An AI tutor that actually corrects you — built for [BLOG/PODCAST] readers?`
- `Built something your audience might break in interesting ways`

**Body:**

```
Hi [NOMBRE],

I'm [TU_NOMBRE], founder of Habláh — a conversational AI tutor for language learning. Real-time spoken conversations, sub-1s latency, the coach corrects you live instead of after the fact.

I'm reaching out because [BLOG/PODCAST] is one of the few outlets I trust to actually pressure-test EdTech claims instead of just running launch posts. Most "AI language tutor" coverage I've seen is surface-level. Yours isn't.

Three reasons I think Habláh might be worth a closer look for your audience:

1. It's built for the "I understand but can't speak" plateau — the segment most apps ignore.
2. The technical bar is real: bidirectional audio streaming, custom coaching prompt layer trained on thousands of real sessions.
3. Real beta data: 180 WAU, 12-min avg session, 41% week-4 retention, NPS 52.

I'd love to send you:
- Free unlimited Pro access (no time limit) to try it
- A short technical brief on how the coaching prompt layer escapes the "good job!" generic-tutor trap
- Anonymized session transcripts if useful for a review

No pressure on coverage either way. If it's interesting, great. If not, you've got 14 days of Pro free either way.

Link: https://hablah.app

Thanks for the time,
[TU_NOMBRE]
```

**Tono:** Respetuoso, directo, sin urgencia falsa.
**Largo:** ~190 palabras.
**Asuntos a NO usar:** "Game-changing AI", "Disrupting language learning", cualquier cosa con "revolutionary".

---

## Versión B — TIBIO ("vi tu artículo X")

**Subject lines:**
- `Re: [ARTICULO_TITULO] — built the thing you described`
- `Your point about [PUNTO_ESPECIFICO] hit home`
- `Following up on your [ARTICULO_TITULO] piece`

**Body:**

```
Hi [NOMBRE],

Just read your piece [ARTICULO_TITULO] ([ARTICULO_URL]). The part where you wrote about [PUNTO_ESPECIFICO] is the exact problem I've been working on for 8 months.

Quick context: I'm [TU_NOMBRE], founder of Habláh — a conversational AI tutor where users actually speak with the coach in real time. The product was built specifically because of the gap you described in your article: most AI language tools optimize for vocabulary acquisition, not for output / speaking fluency.

A couple of details I think directly answer questions you raised:

- On latency: I scrapped the HTTP cascade approach (3-5s per turn, kills the conversation) and rebuilt on bidirectional streaming. Sub-1s end-to-end. The UX delta was 90s sessions → 12-min sessions.

- On correction quality: the default LLM tutor says "good job!" to everything. I had to build an override layer trained on real session transcripts so it prioritizes errors that block fluency (verb tense, fossilized pronunciation) and lets the noise slide. Most tools you've reviewed don't have this — it's why their correction quality feels random.

- On retention: closed beta over 3 months landed at 41% week-4 retention and 12-min avg sessions. The contrarian insight: top-requested feature wasn't more languages, it was more tutor personalities. The bond with the coach is the retention driver.

I'd love to send you free unlimited Pro access (no time limit). If you want to dig deeper, happy to share:
- Anonymized session transcripts showing correction quality
- Technical brief on the coaching prompt layer
- Beta metrics dashboard (real numbers)

Whether or not it leads to coverage, your article was the best framing of this problem I've read this year. Thank you for writing it.

Link: https://hablah.app

— [TU_NOMBRE]
```

**Tono:** Específico, demuestra que leíste, ofrece datos verificables.
**Largo:** ~310 palabras.
**Regla:** El `[PUNTO_ESPECIFICO]` debe ser una cita o idea concreta. Si no podés citar algo específico del artículo, NO uses esta versión — usá la fría.

---

## Versión C — CALIENTE (oferta de review código / colaboración)

**Subject lines:**
- `Code review invite: AI voice tutor (you'd find things others wouldn't)`
- `Want full access + co-build a tutorial post?`
- `Specific ask for [NOMBRE] — would love your eyes on this`

**Body:**

```
Hi [NOMBRE],

Direct ask up front, I know your time is short:

I'd like to invite you to:
- Get full Pro access to Habláh (no time limit, on the house)
- Look under the hood of the architecture — happy to share repo access on the relevant modules
- Optionally co-build a post or podcast segment about how AI voice tutors actually fail in production (because they do, often)

Context: I'm [TU_NOMBRE], founder of Habláh. I've followed your work on [BLOG/PODCAST] for [TIME] — your [NOMBRE_PODCAST_EPISODIO] specifically is what made me rethink how I was framing the correction problem in my own product. I'm not pitching coverage. I'm pitching collaboration.

Why I think this is worth your time:

1. You'd see a real production system at the boundary of LLM voice + EdTech, with all the messy parts visible. Latency tradeoffs, prompt drift, correction quality measurement, retention tuning. None of the case studies you've published this year had access to that level of internals.

2. I'd give you full visibility into:
   - Architecture decisions (and the ones I regret)
   - Real beta metrics, including the embarrassing ones
   - Prompt engineering trail — versions A through G with why each failed
   - Anonymized session data to validate or break my retention claims

3. You'd get to publish something that's not a launch post. Most AI EdTech coverage is "company X raised $Y, here's what they say they do." Almost nobody publishes "I got inside the box and here's what's actually happening."

Format options I'm open to:
- Long-form blog post (you write, I provide access + interviews)
- Podcast deep-dive (90 min, technical and product)
- Twitter / X thread tear-down (your style, full access from me)
- Workshop / talk co-presented
- Whatever you want to invent

No exclusivity required. No NDA. No editorial approval from me — you write what you find.

If even one of these formats sounds remotely interesting, hit reply and I'll send Pro access + a Loom walking through the codebase by EOD.

If now isn't the right time, no worries — the offer doesn't expire.

Link to the product: https://hablah.app

Thank you for the work you do on [BLOG/PODCAST]. Genuinely.

— [TU_NOMBRE]
[TU_EMAIL]
[TU_TWITTER]
```

**Tono:** Genuino, propone valor real, no pide nada urgente, ofrece control editorial.
**Largo:** ~390 palabras.
**Regla:** Solo enviar a outlets que YA seguís y donde puedas citar 1+ pieza específica que te marcó. Si suena armado/genérico, no funciona.

---

## Tabla de uso

| Versión | Cuándo usar | Tasa esperada de respuesta |
|---------|-------------|---------------------------|
| A - Frío | No tenés relación, no leíste el medio | 2-5% |
| B - Tibio | Leíste un artículo específico reciente | 8-15% |
| C - Caliente | Sos fan real, conocés el cuerpo de trabajo | 25-40% |

---

## Reglas generales

1. **Una persona = un email.** Nunca BCC masivo. El destinatario lo nota.
2. **Investigar 5 min antes de mandar.** Si no sabés qué publica el medio, no estás listo para escribir.
3. **No followup antes de 7 días.** No followup más de 2 veces total.
4. **Followup corto:** "Hi [NOMBRE], following up on the email below in case it got buried. No worries if not a fit. Thanks!"
5. **Subject line < 60 chars.** Móvil corta lo que no entra.
6. **Sin attachments en primer mail.** Linkear a Loom/Drive si necesitás mostrar algo.
7. **Tracking pixels off.** Suficientes editores los detectan y los penalizan.
8. **No mencionar competidores por nombre.** "Most AI language tools" >> "Unlike Duolingo".
9. **Si responden con "no thanks"**, agradecer una vez y nunca volver a esa persona por el mismo producto.
10. **Métrica real:** medir respuestas, no aperturas. Una respuesta humana de 2 líneas vale más que 50 opens.

---

## Lista sugerida de targets (research previo, no incluido acá)

- Blogs EdTech: Edutopia, EdSurge, EdTech Magazine, Fluent in 3 Months, Language Learning with Netflix blog
- Podcasts: EdSurge Podcast, Trending in Education, The Language Hacking Podcast, IELTS Energy Podcast
- Newsletters: Ben Whately's Memrise newsletter, Lingthusiasm, Polyglot Conference newsletter
- Comunidades: r/languagelearning, r/EdTech, r/IndieDev (no outreach por email — engagement nativo)

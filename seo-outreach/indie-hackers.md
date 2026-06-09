# Indie Hackers - Intro / Launch Posts

> Dos versiones: castellano y inglés. Tono indie founder, honesto, sin humo.

---

## Versión Castellano - Launch Post

### Título
```
Lancé Habláh: tutor de idiomas con IA conversacional. 14 días Pro gratis.
```

### Body
```
Hola IH 👋

Soy de Argentina y acabo de lanzar Habláh — una app de aprendizaje de idiomas donde en vez de tocar tarjetitas y traducir palabras, charlás en vivo con un tutor de IA que te escucha, te corrige y te empuja a hablar más.

**Por qué la construí:**

Llevaba años haciendo Duolingo, Babbel, Pimsleur, ChatGPT voice... y cuando me ponían a hablar con un humano me trababa. El problema no era saber palabras — era no haber hablado nunca en voz alta con alguien que me corrigiera.

Pensé: "esto tiene que ser un producto". Probé prototipos con GPT-4 voice mode pero la latencia era horrible y el feedback era genérico ("good job!" — gracias loco). Me metí a fondo en streaming bidireccional de audio y custom prompts para coaching real.

**Stack:**

- Backend: Python + FastAPI
- Audio: streaming bidireccional (sub-1s end-to-end)
- LLM: cascade con override rules entrenadas sobre miles de sesiones reales para evitar al "tutor genérico"
- Frontend: React + Vite + Tailwind
- DB: aiomysql en Aiven
- Deploy: Heroku back + Netlify front

**Métricas hasta ahora (beta cerrada, ~3 meses):**

- 180 usuarios activos semanales
- Retención semana 4: 41%
- Sesión promedio: 12 min (target era 5)
- NPS: 52
- Churn mensual: 8%

**Lo que más me sorprendió:**

Que el feature más pedido no fue "más idiomas" ni "más niveles" — fue "más personalidades del tutor". La gente quería un coach exigente, otro paciente, otro divertido. Resultó que el vínculo con el tutor era el driver de retención, no el contenido.

**Pricing:**

- Free: 10 min/día
- Pro: USD 12.99/mes con 14 días gratis (sin tarjeta)

**Lo que me falta resolver:**

- CAC sigue alto, ads no me cierran. Estoy probando contenido orgánico (TikTok + YouTube Shorts mostrando sesiones reales).
- Mobile app nativa pendiente. Por ahora PWA decente pero no ideal.
- Soporte de más idiomas (me piden japonés y mandarín fuerte).

Si alguno está construyendo algo en EdTech o AI voice, me encantaría charlar. Y si pueden probar y romperlo, mejor.

Link: https://hablah.app

Cualquier feedback bienvenido — sobre todo el incómodo.

— Sebastián
```

---

## English Version - Launch Post

### Title
```
Launched Habláh: AI conversation tutor for language learning. 14-day Pro free.
```

### Body
```
Hey IH 👋

Solo founder from Argentina here. Just shipped Habláh — a language learning app where instead of tapping flashcards, you have actual spoken conversations with an AI tutor that listens, corrects you, and pushes you to speak more.

**Why I built it:**

Years of Duolingo, Babbel, Pimsleur, ChatGPT voice mode — and every time I had to talk to a real human, I froze. The bottleneck wasn't vocabulary. It was that I had never spoken out loud, daily, with someone correcting me in the moment.

Tried prototyping with GPT-4 voice mode but latency was painful (3-5s per turn) and the feedback was generic ("good job!" — thanks, dude). So I went deep on bidirectional audio streaming and custom coaching prompts.

**Stack:**

- Backend: Python + FastAPI
- Audio: bidirectional streaming (sub-1s end-to-end latency)
- LLM: cascade with override rules trained on thousands of real sessions to escape the "generic tutor" trap
- Frontend: React + Vite + Tailwind
- DB: aiomysql on Aiven
- Deploy: Heroku (backend) + Netlify (frontend)

**Metrics so far (closed beta, ~3 months):**

- 180 weekly active users
- Week-4 retention: 41%
- Avg session: 12 min (target was 5)
- NPS: 52
- Monthly churn: 8%

**Biggest surprise:**

Top-requested feature wasn't "more languages" or "more levels" — it was "more tutor personalities." Users wanted a strict coach, a patient one, a funny one. Turns out the bond with the tutor was the retention driver, not the curriculum.

**Pricing:**

- Free: 10 min/day
- Pro: USD 12.99/month with 14-day free trial (no credit card required)

**What I'm still figuring out:**

- CAC is too high. Paid ads aren't pencilling. Pivoting to organic content (TikTok + YouTube Shorts showing real sessions).
- Native mobile app is still pending. Solid PWA for now, but not ideal.
- Demand for Japanese and Mandarin is loud — engineering challenge given tokenization.

If anyone here is building in EdTech or AI voice, would love to compare notes. And if you can break the product, even better.

Link: https://hablah.app

Any feedback welcome — especially the uncomfortable kind.

— Sebastián
```

---

## Versión corta - Intro Post (si recién te sumás a IH)

### Castellano
```
Hola IH! Sebastián de Buenos Aires.

Acabo de lanzar Habláh (https://hablah.app), un tutor de idiomas con IA conversacional. La premisa es simple: aprendés un idioma hablándolo, no memorizándolo.

Stack: Python/FastAPI + streaming bidireccional de audio + React. Beta cerrada por 3 meses, ahora abriendo público.

Vine acá a aprender de gente que ya cobró un dólar real por software propio. Cualquier consejo sobre go-to-market en EdTech, agradezco.

¿En qué están ustedes? 👇
```

### English
```
Hey IH! Sebastián from Buenos Aires here.

Just launched Habláh (https://hablah.app), an AI conversation tutor for language learning. Premise is simple: you learn a language by speaking it, not by memorizing it.

Stack: Python/FastAPI + bidirectional audio streaming + React. Closed beta for 3 months, now opening publicly.

Here to learn from folks who've actually charged real dollars for their own software. Would deeply appreciate any go-to-market advice for EdTech.

What are you all building? 👇
```

---

## Tips para postear

- Postear martes o miércoles 9-11 AM EST (mayor engagement IH)
- Responder TODO comentario en las primeras 4 horas
- No editar el post después (algoritmo IH penaliza ediciones)
- Si alguien pide milestones, compartir el real (no inflar)
- Linkear el milestones page de IH a la semana con primer revenue

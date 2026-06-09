# LinkedIn - Launch Posts

> 3 variantes. Cada una 800-1200 chars. Copy-paste y listo.

---

## Variante A — Técnica (architecture / modelo)

**Char count: ~1180**

```
Después de 8 meses, lancé Habláh: un tutor de idiomas con IA conversacional.

La parte interesante (para quien le copa el stack):

El primer prototipo usaba un cascade HTTP: STT → LLM → TTS por request. Funcionaba, pero la latencia era 3-5 segundos por turno. Inviable para conversación real — la gente cortaba la sesión a los 90 segundos.

Pivot: streaming bidireccional de audio con la Live API. End-to-end <1s, el coach puede interrumpir y reaccionar a mitad de oración. UX cambió radicalmente — sesión promedio pasó de 90s a 12 min.

Pero el bottleneck siguiente no fue técnico: era el prompt. El tutor era genérico, decía "good job!" todo el tiempo y no corregía nada útil. Tuve que armar un layer de override rules entrenado sobre transcripts reales para que priorice errores que bloquean fluidez (verb tense, fossilized pronunciation) y deje pasar el ruido.

Stack final:
- Backend: Python + FastAPI
- Audio: bidirectional streaming, sub-1s latencia
- LLM: cascade con custom coaching layer
- Frontend: React + Vite + Tailwind
- DB: aiomysql en Aiven
- Deploy: Heroku + Netlify

Lo más contraintuitivo que aprendí: el feature más pedido no fue "más idiomas", fue "más personalidades del tutor". El vínculo con el coach es el driver de retención, no el contenido.

14 días Pro gratis sin tarjeta para probar: https://hablah.app

¿Alguien más construyendo con audio streaming? Me interesa charlar sobre cómo manejan barge-in y echo cancellation en browser.

#AI #EdTech #VoiceAI #IndieMaker
```

---

## Variante B — Producto (qué problema resuelve)

**Char count: ~1090**

```
Lancé Habláh hoy. Una app que tendría que haber existido hace 5 años.

El problema:

Vos no aprendés a hablar un idioma estudiando. Aprendés hablándolo. Eso lo sabe cualquiera que haya pasado un mes en otro país. Pero las apps de idiomas (Duolingo, Babbel, Pimsleur, Memrise, etc.) están diseñadas para que toques una pantalla, no para que hables.

Resultado: gente que después de 2 años de Duolingo todavía no puede pedir un café en otro idioma sin congelarse.

La solución:

Habláh es conversación con un tutor de IA. Hablás en voz alta, te escucha, te corrige pronunciación y gramática en tiempo real, y te empuja a hablar más cuando te quedás callado. No hay flashcards. No hay XP. No hay racha de 547 días.

Es para gente que ya entiende el idioma pero no lo habla. El segmento más frustrado del mercado: intermedios estancados.

Métricas de beta cerrada (3 meses):
- Sesión promedio 12 min (vs 4 min benchmark Duolingo)
- Retención semana 4: 41%
- NPS: 52
- 81% de usuarios usa la app 4+ veces por semana

Pricing: 14 días Pro gratis sin tarjeta. Después USD 12.99/mes.

Link: https://hablah.app

Si conocés a alguien que dice "entiendo todo pero no lo hablo" — esta es para ellos.

#LanguageLearning #EdTech #AI #ProductLaunch
```

---

## Variante C — Personal (por qué lo construí)

**Char count: ~1150**

```
En 2018 me mudé tres meses a Berlín por trabajo.

Llevaba 4 años haciendo Duolingo de alemán. Tenía racha de 800 días. Sabía 2.000 palabras.

Aterricé, fui a un café, intenté pedir un Apfelstrudel y se me salió el cerebro. No me salió ni "ich möchte". Terminé pidiendo en inglés. La cajera me miró con esa cara de "otro turista más".

Esa noche en el Airbnb hice un cálculo deprimente: había invertido más de 200 horas de mi vida en Duolingo y no podía pedir un postre.

El problema no era saber palabras. Era no haber dicho NUNCA esas palabras en voz alta con alguien que me corrigiera. Las apps me habían entrenado para tocar pantallas, no para hablar.

Cuatro años después, salieron los LLM con voz. Probé ChatGPT voice mode y se acercaba — pero la latencia era horrible y el feedback era genérico ("great answer!" — gracias, ChatGPT, muy útil).

Ahí me obsesioné. ¿Y si construyo el tutor que hubiera querido en 2018? Uno que me escuche, me corrija lo que importa, y me empuje a seguir hablando cuando me quiero esconder.

Ocho meses de trabajo, dos pivots técnicos grandes, una beta cerrada con 180 usuarios reales — y hoy lancé Habláh.

No te va a dar una racha. No te va a dar un certificado. Te va a hacer hablar.

14 días Pro gratis: https://hablah.app

Si conocés a tu vos-de-Berlín-2018, mandale el link.

#FounderStory #LanguageLearning #AI
```

---

## Tips de publicación

- **Mejor día/hora:** Martes o miércoles, 8-10 AM hora del target audience
- **Imagen:** Cada post lleva 1 imagen — screenshot del producto, no logo solo
- **Hashtags:** Máximo 4 — más reduce alcance en algoritmo LI 2026
- **Primer comentario:** Pinear el link de la app (LI penaliza links en el post)
- **Respuesta:** Responder cada comentario en primeras 2hs (boost de alcance)
- **Cadencia:** Publicar las 3 variantes con 3-5 días de diferencia, no el mismo día
- **Orden recomendado:** Personal → Producto → Técnica (Personal genera mejor reach inicial)

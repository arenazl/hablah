# Propuesta F5-04 — Branding y mensaje

> **Esto es una PROPUESTA para el gate del dueño — WO F5-04.** No se tocó la landing ni
> ningún archivo de producción. El dueño elige/edita antes de que esto se aplique a
> `frontend/index.html`, `landing/Home.tsx`, OG, PWA manifest o `llms.txt`.

## 0. El diferencial real (recordatorio, no se inventa otro)

(a) Se aprende HABLANDO — voz real, no ejercicios de tap. (b) El profe no es un chatbot
suelto: un motor pedagógico arma cada clase para tu edad y tu nivel. (c) Se acuerda de vos
entre clases. (d) Kids de verdad — seguridad, edades, sin pantalla-adicción. El nombre
"Habláh" ya lo dice — el mensaje tiene que amplificarlo, no inventar un ángulo nuevo.

## 1. Hallazgo de consistencia (código real, relevado antes de proponer nada)

Hoy ya existe UNA frase de una línea, **idéntica y sincronizada a propósito**, en 3 lugares
(`frontend/index.html`, comentario en la línea 64 lo confirma explícito: *"Misma frase,
textual, en Organization.description, WebSite.description acá abajo y en la primera línea
de public/llms.txt"*):

> **"Plataforma adaptativa de aprendizaje de idiomas con tutores de IA conversacionales."**

Vive en el JSON-LD `Organization.description`, `WebSite.description` y la primera línea de
`public/llms.txt`. Es correcta, sobria, describe bien QUÉ es sin vender nada — buena base
para "descripción de una línea" formal (schema.org / LLM indexing).

**Pero el `<meta name="description">` y el OG/Twitter de `index.html` usan otra frase
distinta:** *"Aprendé inglés, portugués o italiano con un tutor de IA conversacional. 5
minutos al día, sin lecciones lineales ni exámenes. 14 días Pro gratis."* — más de venta,
con precio y CTA. No es un error (meta description SÍ puede ser más persuasiva que el
schema), pero el WO F5-04 pide consistencia total en "la línea de una frase" en todos los
puntos de contacto. Van dos caminos, el dueño elige:

- **Camino A (recomendado):** dejar la frase de schema/llms.txt como la ÚNICA "descripción
  de una línea" oficial de la marca (para prensa, tiendas, bio de redes, footer). El meta
  description/OG de la landing puede seguir siendo más persuasivo — es un campo distinto
  (SEO/CTR), no la "descripción de una línea" que pide el WO.
- **Camino B:** unificar TODO a una sola frase (la de abajo, §2) en los 4 lugares —
  cumple la aceptación del WO F5-04 al pie de la letra ("idéntica en todos los puntos de
  contacto"), a costa de perder algo de gancho de venta en el meta description.

## 2. Descripción de una línea — candidata

Manteniendo consistencia con la frase ya vigente (no la reemplaza por algo distinto — la
ajusta apenas para que sea igual de corta pero diga el diferencial, no solo la categoría):

> **"Habláh: se aprende un idioma hablándolo — un motor de IA arma cada clase de voz según
> tu edad, tu nivel y lo que ya practicaste."**

Si el dueño prefiere no tocar nada de lo ya sincronizado, la alternativa es **adoptar tal
cual la frase que ya está viva** (Camino A de arriba) y no crear una nueva — es
perfectamente válida y ya está probada en 3 lugares.

## 3. Tagline — 3 opciones

| # | Tagline | Ángulo |
|---|---|---|
| **A — ya vigente** | **"Hablás. Aprendés. Sin exámenes."** | Es el headline actual de la landing (`Home.tsx`). Riesgo cero, ya probado visualmente (tipografía grande, con "exámenes" tachado). Vende la premisa cruda: hablar > examinarse. |
| **B — nueva** | **"Un profe que se acuerda de vos."** | Pone el foco en el diferencial que la competencia (Duolingo, Busuu, apps de ejercicios) NO tiene: memoria entre clases. Es el ángulo más difícil de copiar — no es "otra app con IA", es "un profe de verdad". |
| **C — nueva** | **"Se aprende hablando. Así de simple."** | Ancla directo en el nombre "Habláh" y en la simplicidad del mensaje — cero jerga, cero promesa de método mágico. Funciona bien como tagline corto para redes/ads. |

**Sugerencia (no decisión — el dueño elige):** A ya está en producción y funciona; B es la
más fuerte para diferenciarse si se quiere resignificar la marca hacia "el profe que se
acuerda" en vez de "otra app conversacional con IA" (hay varias ahora). C es la más segura
para performance de ads (corta, sin fricción de lectura).

## 4. Hero copy (subtítulo debajo del tagline elegido)

Propuesta, en rioplatense, sin jerga técnica ni corporativa:

> Cada charla la arma un motor pedagógico pensado para vos — tu nivel, tu edad, los temas
> que te gustan y lo que te costó la vez pasada. Hablás con un tutor de IA por voz, en
> tiempo real, y al final te dice qué te salió bien y qué pulir. Nada de exámenes, nada de
> elegir la opción correcta entre cuatro.

(Reemplaza o convive con el copy actual de `home-hero-meta-row` en `Home.tsx`, que hoy dice
"Cinco minutos de conversación al día con un tutor de IA que se adapta a tu nivel..." — es
compatible en tono, esta versión suma el motor pedagógico y la memoria, que hoy el hero no
menciona explícitamente aunque sí aparecen más abajo en la página.)

## 5. Los 3 bullets del diferencial (lenguaje llano rioplatense)

1. **Hablás en serio, no tocás la pantalla.**
   Nada de elegir la opción A, B o C. Es una charla de verdad, por voz, con un tutor de IA
   que te entiende y te responde en el momento — como hablar con una persona, no like
   completar un ejercicio.

2. **No es un chatbot suelto — es un profe que arma la clase para VOS.**
   Antes de que digas una palabra, el sistema ya sabe tu nivel, tu edad y qué te interesa.
   La clase de hoy no es la misma que le tocó a otro. Está armada a tu medida.

3. **Se acuerda de la clase pasada.**
   Si la semana pasada te trabaste con el pasado simple, hoy el profe vuelve sobre eso —
   no arranca de cero cada vez. Vas construyendo, charla tras charla, como con un profe de
   verdad que te sigue el rastro.

*(El cuarto diferencial —kids de verdad, con seguridad y sin enganchar con pantalla— no
entra en los 3 bullets genéricos a propósito: es el mensaje específico del flujo kids /
la comunicación a padres, no el pitch general. Si el dueño quiere, se arma aparte un
mini-mensaje para `/kids` con ese ángulo — no se incluye acá para no diluir los 3 bullets
principales que pidió el WO.)*

## 6. Qué NO cambiar (para que quede escrito)

- El nombre **"Habláh"** y su lectura ("se habla" + la marca) no se tocan — es la base del
  mensaje, no algo a reinventar.
- Cero emojis en cualquier pieza de este mensaje (regla dura del dueño) — los 3 bullets de
  arriba usan íconos SVG si se llevan a UI, nunca emoji.
- El tono es "profe cálido", no corporativo ni "growth hacker" — nada de "revolucionario",
  "disruptivo", "empoderá tu inglés". Eso ya se evitó en el copy actual y se mantiene acá.

## 7. Próximos pasos (después de que el dueño elija/edite)

1. Aplicar el tagline y hero copy elegidos a `frontend/src/pages/landing/Home.tsx`.
2. Resolver el Camino A/B de consistencia (§1) y, si es B, sincronizar
   `frontend/index.html` (meta description, OG, Twitter), PWA manifest y
   `frontend/public/llms.txt` / `llms-full.txt` a la misma frase.
3. Micro-momento de marca: la primera frase del coach en `/charla/:token` (demo público) y
   el tono del reporte post-clase (`SessionReport` en `WebApp.tsx`) deberían sonar
   coherentes con el tono elegido acá — cálido, de profe, cero corporativo. Esto es
   redacción de prompt/copy, no de este documento; queda anotado como dependencia para
   cuando se aplique.

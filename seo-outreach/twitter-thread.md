# Twitter / X - Launch Thread

> Hilo de 9 tweets. Cada uno <280 chars. Hints de imagen incluidos.

---

## Tweet 1 — Hook

```
Después de 8 meses construyendo, lancé Habláh.

Un tutor de idiomas con IA donde no hacés flashcards. Hablás.

El coach te escucha, te corrige y te empuja a hablar más — en tiempo real.

14 días Pro gratis, sin tarjeta.

Hilo de cómo lo construí 👇
```

**Imagen:** Hero screenshot — landing con CTA "Start speaking" visible. Ratio 16:9.

---

## Tweet 2 — El problema personal

```
Origen: en 2018 viví 3 meses en Berlín.

Tenía 800 días de racha en Duolingo de alemán. Sabía 2.000 palabras.

Aterricé, intenté pedir un Apfelstrudel y se me trabó el cerebro.

200 horas invertidas para no poder pedir un postre.
```

**Imagen:** Foto / mockup de la cara de Duolingo con racha alta. O un screenshot del Duolingo con racha gigante.

---

## Tweet 3 — El insight

```
El problema no era saber palabras.

Era no haber dicho NUNCA esas palabras en voz alta con alguien que me corrigiera en el momento.

Las apps te entrenan para tocar pantallas. No para hablar.

Hay un gap brutal entre "entiendo" y "hablo". Casi nadie lo ataca de verdad.
```

**Imagen:** Diagrama simple: "Reading ✓ | Listening ✓ | Writing △ | Speaking ✗" con el speaking marcado en rojo.

---

## Tweet 4 — Primer prototipo (qué falló)

```
V1: cascade HTTP clásico.

Speech-to-text → LLM → Text-to-speech, por cada turno.

Funcionaba. Pero la latencia era 3-5 segundos por respuesta.

Sesión promedio: 90 segundos. La gente cortaba antes de calentar la conversación.

Inviable.
```

**Imagen:** Diagrama del flow STT→LLM→TTS con un timer mostrando "3.4s" en rojo. O screenshot de logs con timestamps.

---

## Tweet 5 — El pivot técnico

```
V2: streaming bidireccional con Live API.

Audio in y audio out al mismo tiempo. Latencia <1s end-to-end.

El coach puede interrumpir, reaccionar a mitad de oración, reírse en el momento justo.

Sesión promedio pasó de 90s a 12 min. 8x.

UX changes everything.
```

**Imagen:** Side-by-side comparativo: "V1: HTTP cascade — 3.4s" vs "V2: Bidirectional stream — 0.8s". O un gif corto del waveform en vivo.

---

## Tweet 6 — El bottleneck que no era técnico

```
Pero el siguiente cuello de botella no fue ingeniería. Fue el prompt.

El tutor decía "good job!" todo el tiempo. No corregía nada útil.

Armé un layer de override rules entrenado sobre transcripts REALES para que priorice errores que bloquean fluidez y deje pasar el ruido.

Game changer.
```

**Imagen:** Screenshot de un transcript real (con datos sensibles tachados) mostrando una corrección útil destacada vs el "good job" tachado.

---

## Tweet 7 — La sorpresa de retención

```
Lo más contraintuitivo de la beta:

El feature MÁS pedido no fue "más idiomas" ni "más niveles".

Fue "más personalidades del tutor".

Coach exigente. Coach paciente. Coach divertido. Coach que te hace bardo cuando te equivocás.

El vínculo con el tutor es el driver de retención. No el contenido.
```

**Imagen:** Grid de avatares de tutores con nombre + personalidad + accent flag. Tipo selector real del producto.

---

## Tweet 8 — Métricas

```
3 meses de beta cerrada:

→ 180 WAU
→ Sesión promedio 12 min (vs 4 min Duolingo)
→ Retención semana 4: 41%
→ NPS: 52
→ Churn mensual: 8%
→ 81% usa la app 4+ veces/semana

No es un demo. Es producto.
```

**Imagen:** Mini dashboard / infográfico simple con esos 6 números. Estilo limpio, sin chartjunk.

---

## Tweet 9 — CTA cierre

```
Si entendés un idioma pero no lo hablás, esto es para vos.

14 días Pro gratis. Sin tarjeta. Sin trial-bait.

Si lo probás y me querés tirar feedback (sobre todo el incómodo), respondé acá o DM abierto.

→ https://hablah.app

Gracias por leer 🙏
```

**Imagen:** Mockup del producto en móvil + desktop. CTA grande "Try Habláh free for 14 days". O un GIF corto de una sesión real.

---

## Tweet bonus (reply al thread, 6h después)

```
PD: si construís en AI voice o EdTech, mi DM está abierto.

Aprendí varias cosas peleándome con barge-in, echo cancellation en browser, y prompt engineering para coaching real.

Feliz de compartir lo que funcionó (y lo que no).
```

---

## Tips de publicación

- **Hora ideal:** Martes 10am EST o miércoles 2pm EST (mayor engagement en tech Twitter)
- **Cadencia del hilo:** Publicar los 9 tweets seguidos en <2 min (algoritmo lee el hilo como unidad)
- **Quote tweet:** Pedir a 3-5 amigos con audiencia que hagan QT del tweet 1 en las primeras 2hs
- **Pinear:** Pinear el thread en el perfil por 7 días
- **Cross-post:** Adaptar los tweets 2-8 como carrusel para LinkedIn al día siguiente
- **No editar:** X penaliza ediciones en threads. Revisar 2 veces antes de publicar.
- **Engagement:** Responder cada reply en primeras 4hs, especialmente con preguntas técnicas (boost de alcance)

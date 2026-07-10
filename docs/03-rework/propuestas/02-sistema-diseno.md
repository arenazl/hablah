# Propuesta F4-05 — Sistema de diseño y dirección visual

> **Esto es una PROPUESTA para el gate del dueño — WO F4-05.** No se tocó código de
> producción ni `frontend/src`. Los tokens de acá son la base para un futuro
> `tokens.css` único; hoy son solo la maqueta de la decisión.

## 0. Por qué hace falta (evidencia del código, no opinión)

Relevando el frontend real hoy conviven **al menos 3 sistemas de variables CSS distintos**
para lo mismo:

| Sistema | Dónde | Ejemplo de variables |
|---|---|---|
| Landing | `pages/landing/_shared.tsx` | `--primary`, `--fg-1`, `--ink-1`, `--font-serif` (Fraunces), `--font-mono` (JetBrains Mono) |
| App adulta ("Hoy") | `pages/hoy.css.ts`, `webapp.css.ts` | `--hp-bg-1`, `--hp-green`, `--hp-font-display` (Sora) |
| Kids | `pages/kids/*.tsx` | `--green-700`, `--font-display`, `--r-card-lg` |

Cuatro familias tipográficas en uso simultáneo (Fraunces, Sora, Inter, JetBrains Mono), tres
prefijos de variables distintos para el mismo verde de marca, y el `localStorage` del tema
todavía se llama `beyker-theme` (`contexts/ThemeContext.tsx`) — residuo de un boilerplate
que nunca se limpió. Ninguno de estos hallazgos es un juicio de valor: es la foto real de
"acumulación sin dirección" que describe `01-analisis-integral.md` (causa 7). La propuesta
de abajo no inventa una paleta nueva — **sistematiza la que ya existe** (verde `#00B37E` +
ámbar `#FFB800` son reconocibles y se conservan) para que deje de estar repartida en tres
convenciones distintas.

---

## 1. Paleta — OKLCH anclada a la marca actual

Los valores hex actuales se convirtieron a OKLCH 1:1 (no se inventó color nuevo, se
sistematizó el existente). Afinar los intermedios con una herramienta de contraste AA antes
de aplicar a producción — esto es la base, no el archivo final.

```css
:root {
  /* ── Primario (verde de marca) ── */
  --primary-300: oklch(88% 0.07  163);   /* superficies tintadas, hover suave */
  --primary-500: oklch(67.8% 0.146 163); /* = #00B37E actual — el verde de marca */
  --primary-600: oklch(57.5% 0.124 163); /* = #008F63 actual — texto/CTA sobre claro */
  --primary-900: oklch(36.5% 0.069 163); /* = #054A3A actual — superficies oscuras de marca */

  /* ── Acento (ámbar — alertas positivas, rachas, momentos de logro) ── */
  --accent-400:  oklch(82.7% 0.171 80);  /* = #FFB800 actual */
  --accent-600:  oklch(65%   0.16  72);  /* variante AA para texto sobre claro */

  /* ── Neutros (con leve tinte verde-azulado, no gris puro — ancla a --ink-1/--fg-1 actuales) ── */
  --ink-950: oklch(18.3% 0.011 176);     /* = #0D1412 actual */
  --ink-700: oklch(40%   0.02  176);
  --ink-400: oklch(62%   0.015 176);
  --ink-200: oklch(85%   0.01  145);
  --ink-50:  oklch(98.7% 0.002 145);     /* = #FAFBFA actual */

  /* ── Semántico (nuevo, hoy no existe de forma consistente) ── */
  --success: var(--primary-500);
  --warning: var(--accent-400);
  --danger:  oklch(62.6% 0.193 23);      /* ~ #E5484D, ya usado suelto en un par de lugares */
}

/* Dark: mismos hues, se invierte la escala de luminosidad de los neutros y se sube
   levemente el chroma del primario para que no se vea "lavado" sobre fondo oscuro. */
:root[data-theme="dark"] {
  --bg: oklch(15% 0.018 176);
  --surface: oklch(19% 0.02 176);
  --ink-950: oklch(96% 0.006 145);   /* se invierte: "ink" pasa a ser el texto claro */
  --ink-700: oklch(80% 0.016 145);
  --ink-400: oklch(58% 0.018 176);
  --primary-500: oklch(74% 0.15 163); /* +6% L sobre el valor light para compensar fondo oscuro */
}
```

**Por qué neutros con tinte verde-azulado (H≈176) y no gris puro (H=0, C=0):** es lo que ya
hace el código hoy (`--ink-1: #0E1614` no es un gris neutro, tira a verde oscuro) — la
propuesta lo hace explícito y consistente en vez de que sea un accidente de qué diseñador
tocó el hex picker ese día.

---

## 2. Tipografía — de 4 familias a 2

**Familias elegidas: `Fraunces` (serif, con carácter) + `Inter` (sans, de trabajo).**
Ambas ya están en el repo hoy (Fraunces en landing, Inter cargado en `Login.tsx`) — no se
agrega una dependencia nueva, se **retiran** `Sora` y `JetBrains Mono` como familias de UI.

| Rol | Familia | Uso |
|---|---|---|
| Titulares / momentos de marca (hero, "Arrancás en nivel B1", el primer prompt de la clase) | Fraunces, itálica en los énfasis | Le da el carácter editorial que ya tiene la landing — se extiende al resto del producto en vez de quedar aislado ahí. |
| Todo lo demás: UI, cuerpo, labels, botones, formularios | Inter | Legible a los tamaños chicos que domina la app (13-16px), variable weight, ya está cargada. |

`JetBrains Mono` se retira de UI de producto (puede seguir viviendo en `/lab/*`, donde un
tono "de instrumento técnico" es correcto — el laboratorio no comparte tokens con el
producto por diseño, ver `02-hoja-de-ruta.md` F0-04). `Sora` se retira sin reemplazo — Inter
cubre el mismo rol de "display" con un peso 700-800.

---

## 3. Tokens de espaciado, radios, duración

```css
:root {
  /* Espaciado — escala 4px, la mayoría del código actual ya la respeta de facto */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;

  /* Radios — dos familias: "confiable" (adulto) redondea menos que "juguetón" (kids) */
  --radius-sm: 10px;   --radius-md: 16px;   --radius-lg: 28px;   --radius-pill: 999px;

  /* Duración/easing — solo compositor-friendly (transform/opacity/filter), nunca layout */
  --dur-fast: 160ms;  --dur-med: 300ms;  --dur-slow: 5-9s (aura, respiración);
  --ease-standard: cubic-bezier(.22,.85,.32,1);
}
```

`prefers-reduced-motion: reduce` apaga toda animación continua (respiración del aura,
drift, blink) en las 3 maquetas — ya implementado en los 3 HTML de referencia, es el
patrón a copiar.

---

## 4. Dos pieles, un solo set de tokens

El mecanismo de tema ya existe (`ThemeContext.tsx`, atributo `data-theme` en `<html>`) y se
reutiliza tal cual — no hace falta un sistema nuevo, solo dejar de fragmentar los valores
que ese atributo controla.

| Eje | Piel adulta (voz-first, calma) | Piel kids (juguetón) |
|---|---|---|
| Radios | `--radius-sm/md` predominan — formal sin ser frío | `--radius-lg/pill` predominan — todo más redondeado |
| Chroma de color | Tonos del §1 tal cual (contenidos) | Mismo hue, +chroma y variedad de acento (usa más `--accent-400` y combinaciones con los colores ya definidos en `KidsHome.tsx` por categoría — esos se mantienen, son parte de la piel kids) |
| Motion | `--ease-standard`, respiración lenta (5-9s) | Easing más "bouncy" (`cubic-bezier(.34,1.56,.64,1)`), más energía — igual respeta `prefers-reduced-motion` |
| Tipografía | Fraunces + Inter | Inter en pesos altos (700-800) predomina — Fraunces queda opcional/reservada, el tono kids es más directo |
| Densidad | Generosa (espacios `--space-6/7`) | Compacta y colorida, ya está bien resuelta hoy en `KidsHome.tsx` |

La idea no es diseñar la piel kids de nuevo en este WO — **es dejar los tokens listos para
que la piel kids que ya existe (y funciona bien, según el análisis) cuelgue de las mismas
variables en vez de sus propios hex sueltos.**

---

## 5. Reglas duras (ya decididas, se listan para que quede en un solo lugar)

- Cero emojis en código/UI/datos. Decoración = iconos SVG (Lucide).
- Animación SOLO en `transform`, `opacity`, `filter` — nunca `width/height/top/left/margin`.
- `prefers-reduced-motion: reduce` apaga toda animación continua, sin excepción.
- Dark y light son dos direcciones **intencionales**, no un dark mode "invertido a lo bruto"
  — se ve en las 3 maquetas: cada una define su propia paleta oscura, no solo invierte L.
- Contraste AA (4.5:1 texto normal, 3:1 texto grande) — pendiente de auditoría real con
  herramienta antes de aplicar a producción (esta propuesta da los valores de partida, no
  el veredicto de contraste final).

---

## 6. Las 3 maquetas de la pantalla de Clase — para elegir

Adjuntas como HTML autocontenido (abrir directo en el navegador, sin servidor ni
dependencias): `clase-variante-1.html`, `clase-variante-2.html`, `clase-variante-3.html`.
Las tres representan la MISMA pantalla real (`PracticarView` en `WebApp.tsx`: aura que
reacciona al audio + tópico + salir) con 3 direcciones visuales distintas. Cada una tiene
una franja superior de "modo demo" con botones para simular los 3 estados de la voz
(escuchando / pensando / hablando) y un toggle de tema — así se ve cómo se comporta antes
de que haya micrófono real conectado.

### Variante 1 — "Aura orgánica · calma editorial"
Fondo claro tipo papel, aura como un orbe cálido que respira lento (ciclo de 6s), tipografía
serif (Fraunces) en el prompt hablado para que se sienta una frase dicha por alguien, no un
subtítulo de sistema. Es la más cercana al lenguaje visual que ya tiene la landing hoy — la
opción de menor riesgo/mayor continuidad de marca.

### Variante 2 — "Estudio en vivo · waveform"
Fondo oscuro tipo estudio de grabación, el aura se arma con 40 barras de frecuencia
distribuidas en círculo (conectado visualmente a que el audio es REAL, no decorativo),
labels en monoespaciada estilo consola ("LISTENING/THINKING/SPEAKING"). Es la más "técnica
con calidez" — comunica precisión sin perder la sensación de presencia.

### Variante 3 — "Presencia · retrato abstracto"
Tarjeta flotante con esquinas muy redondeadas, el aura es un blob orgánico compuesto de 2-3
formas suaves que se mueven independiente (drift lento) con un "glint" — un brillo sutil que
se desplaza, sugiriendo atención sin dibujar un ojo ni una cara literal. Es la dirección con
mayor calidez humana y la base más natural para que la piel kids (más juguetona) cuelgue de
los mismos tokens sin sentirse un salto — pero mantiene el tono adulto (nada infantil en
esta versión).

**Ninguna de las tres fuerza scroll horizontal ni layout roto en mobile** (probadas a
390px). Las tres respetan `prefers-reduced-motion` y tienen versión dark/light con paletas
propias (no inversión automática).

### Cómo elegir
Abrir los 3 archivos, tocar los botones de estado (Escuchando/Pensando/Hablando) para ver
que la transición se sienta viva y no brusca, probar el toggle de tema, y --sobre todo--
imaginarse 5 minutos de charla real mirando esa pantalla: ¿cuál se banca estar ahí sin
cansar la vista ni distraer? Esa pregunta pesa más que la preferencia estética de un
vistazo.

---

## 7. Próximos pasos (después de que el dueño elija)

1. Crear `frontend/src/styles/tokens.css` único con los valores de §1-§3 (afinados con
   auditoría de contraste real).
2. Migrar `landing/_shared.tsx` y `pages/hoy.css.ts`/`webapp.css.ts` a consumir esas
   variables (retirar `--hp-*` y los duplicados de `--fg-1`/`--primary` sueltos).
3. Aplicar la variante elegida a `PracticarView` real (con audio real, no el demo estático).
4. `/lab/*` queda fuera de este alcance a propósito (WO F0-04: el laboratorio es utilitario,
   no hereda el sistema de diseño de producto).

# Handoff: habláh — producto + motor

## Overview
habláh es una app de práctica de inglés por voz. El alumno elige un tópico, charla con un profe (LLM) y recibe un reporte. Detrás, un **motor de orquestación** compone el prompt de cada clase a partir de 6 capas de catálogo (contexto, alumno, edad, tópico, nivel, cruce edad×nivel) y un backoffice donde el equipo audita y edita ese catálogo.

Este bundle trae **10 pantallas de diseño en HTML** + un integrador. Cada pantalla tiene su spec en `specs/`.

## About the Design Files
Los archivos de `design/` son **referencias de diseño hechas en HTML**: prototipos que muestran look y comportamiento esperados, no código de producción para copiar. La tarea es **recrear estos diseños en el entorno del codebase** (React + TS, según el proyecto actual) usando sus patrones y librerías. Donde ya existe equivalente en el repo (por ejemplo `PromptFlow` con ReactFlow en el probador), **reusarlo**, no reescribirlo.

## Fidelity
**Alta fidelidad.** Colores, tipografía, espaciado, estados e interacciones son finales. Los datos son de demo: en `design/backoffice.data.js` está todo el mock, y debe reemplazarse por las respuestas reales del motor.

## Punto de entrada
Abrir `design/Inicio.html`: es el mapa de todas las pantallas, con el menú completo (Producto, Modo Kids, Entrada, Motor). Cada pantalla también abre sola.

## Cómo está dividido
Un archivo por pantalla, y un spec por pantalla. Se puede tomar de a una sin leer el resto.

| Pantalla | Archivo | Spec |
|---|---|---|
| Hoy | `design/hoy.html` | `specs/hoy.md` |
| Practicar | `design/practicar.html` + `practicar.js` | `specs/practicar.md` |
| Charla (vivo) | `design/charla.html` | `specs/charla.md` |
| Reporte | `design/reporte.html` | `specs/reporte.md` |
| Mapa de progreso | `design/mapa.html` | `specs/mapa.md` |
| Historial | `design/historial.html` | `specs/historial.md` |
| Perfil | `design/perfil.html` | `specs/perfil.md` |
| Probador de clases | `design/probador.html` + `Probador_Redesign.tsx` | `specs/probador.md` |
| Backoffice | `design/backoffice.html` + `backoffice.views.js` | `specs/backoffice.md` |
| Integrador (índice) | `design/index.html` | — |

## Qué se copia tal cual y qué es referencia

| Archivo | Cómo usarlo |
|---|---|
| `design/app.css` | **Copiar los tokens tal cual** (custom properties de color, tipografía, radios, sombras, easing). Son la fuente de verdad. El resto del archivo (shell, sidebar, cards) es referencia. |
| `design/probador.css` | **Copiar tal cual** la paleta por dueño (`--o-runtime`, `--o-edad`, `--o-nivel`, `--o-cruce`, `--o-topico`, `--o-reglas`). El resto, referencia. |
| `design/backoffice.data.js` | **Copiar tal cual como fixture** para desarrollar contra datos realistas, y reemplazar por la API cuando esté. La forma de los objetos es la que espera la UI. |
| `design/Probador_Redesign.tsx` | **Código real para migrar**, ya en React/TS con las convenciones del backoffice. Es lo único pensado para entrar casi directo. |
| Todos los SVG de íconos | **Copiar tal cual** (stroke 2, linecap/linejoin round, viewBox 24). |
| Textos de UI en español | **Copiar tal cual.** El copy está trabajado: voseo, minúsculas, sin exclamaciones. No reescribir. |
| `design/*.html` (las pantallas) | **Referencia.** Recrear con los componentes del repo; no portar el markup ni los `<style>` inline. |
| `design/practicar.js`, `backoffice.views.js` | **Referencia de lógica.** La estructura de estado y las reglas sí valen (filtros, orden, router por hash); la manipulación de DOM no. |
| `design/embed.css`, `embed.js` | **Descartar.** Solo sirven para el integrador de diseño. |
| `design/Inicio.html` | **Descartar.** Es el índice del paquete, no una pantalla del producto. |
| `design/Landing.html`, `Login.html`, `Onboarding.html` | **Referencia floja.** Están a menor fidelidad que el resto: sirven de dirección visual, no de spec. |


## Design tokens
Todos viven en `design/app.css` como CSS custom properties, con tema claro y oscuro.

**Color**
| Token | Claro | Uso |
|---|---|---|
| `--green` | #00B37E | acción primaria, activo |
| `--green-700` | #047857 | texto sobre fondos verdes claros |
| `--green-900` | #052E22 | cards oscuras, dock |
| `--fg-1` | #0B1220 | texto principal |
| `--fg-2` | #3F4A5A | texto secundario |
| `--fg-3` | #6B7688 | texto terciario / labels |
| `--fg-4` | #9AA3B2 | placeholders, paths |
| `--bg-1` | #F7F8F9 | fondo de página |
| `--bg-2` | #EFF1F3 | fondo de bloques |
| `--surface` | #FFFFFF | cards |
| `--border-1` | rgba(11,18,32,.07) | divisores |
| `--border-2` | rgba(11,18,32,.12) | bordes de control |
| `--amber` | #F59E0B | atención / pendiente |
| `--red` | #E5484D | error / caída |

**Paleta por DUEÑO del dato** (solo probador y backoffice; el color dice de qué tabla sale el campo — es semántico, no decorativo): `--o-runtime` #6B7688 · `--o-edad` #F59E0B · `--o-nivel` #3B82F6 · `--o-cruce` #00B37E · `--o-topico` #8B5CF6 · `--o-reglas` #EC4899. Cada uno con su `-bg` al 10%.

**Tipografía** — display: Sora (600/700/800), UI: Inter (400/500/600/700).
Escala: 11px labels (uppercase, letter-spacing .08em, 700) · 12.5px meta · 13.5px cuerpo · 15px título de card · 18–22px título de sección · 26–34px hero.

**Radios** 8px controles chicos · 11–12px inputs y chips · 14–16px cards · 99px pills.
**Sombras** `--shadow-card` 0 1px 2px rgba(11,18,32,.05) · `--shadow-float` 0 12px 32px rgba(11,18,32,.14).
**Easing** `--ease` cubic-bezier(.4,0,.2,1); transiciones 140–240ms.
**Espaciado** múltiplos de 4; gutter de página 28px; gap entre cards 14–18px.

## Voz y copy
Español rioplatense, **voseo**, minúsculas en labels de sistema, sin signos de exclamación en UI de adultos. El feedback nunca interrumpe la charla: llega en el reporte. Nada de emojis salvo en Kids.

## Reglas transversales
- **Shell**: sidebar oscura 240px fija + topbar sticky de 56px + contenido con 28px de gutter. En ≤900px la sidebar se vuelve drawer y aparece una tab bar inferior.
- **Modo embebido**: `?embed=1` oculta la sidebar propia (ver `embed.css`/`embed.js`). Es solo para el integrador de diseño; no hace falta portarlo.
- **Links**: definir `a` y `a:hover` con `--green`/`--green-700`; nunca azul del browser.
- **Accesibilidad**: target mínimo 44px en mobile; foco visible en todos los controles; el dock de acción nunca tapa contenido (compensar con padding-bottom dinámico).

## Assets
No hay imágenes. Todos los íconos son SVG inline, stroke 2, linecap/linejoin round, viewBox 24. Los fondos de las cards de tópico son gradientes CSS + una figura SVG por categoría.

## Estado / datos
- `design/backoffice.data.js` — mock completo del catálogo del motor (tópicos, matriz edad×nivel, personalidades, reglas, alumnos, sesiones, métricas). **Reemplazar por motorAPI.**
- `design/practicar.js` — lógica de elección de tópico (copiloto, filtros, orden, atajos). El "copiloto" hoy es heurístico local: en producción debería pegarle al recomendador real.
- El probador ya tiene su equivalente React en `design/Probador_Redesign.tsx`, con las convenciones del backoffice existente y notas de integración.

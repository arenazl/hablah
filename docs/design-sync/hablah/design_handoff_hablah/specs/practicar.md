# Practicar — elección de tópico

## Purpose
El alumno decide de qué va a hablar hoy. Es la pantalla con más carga de decisión del producto: 20 tópicos propios, misiones de rescate abiertas, tiempo disponible variable. Todo el diseño existe para que elegir tome menos de 15 segundos.

## Layout
Shell estándar (sidebar 240px + topbar 56px). Contenido en columna única de ancho completo, gutter 28px, `padding-bottom` dinámico igual a la altura del dock inferior + 24px.

Orden vertical:
1. **Header** — h1 "practicá" (Sora 26px/700) + línea de contexto en `--fg-3`.
2. **Fila de arranque rápido** — grid `repeat(auto-fit,minmax(300px,1fr))`, gap 14px, 3 cards de 1 fila:
   - *Recomendado para hoy* — card verde oscura (`--green-900`), label uppercase 11px en `#7CE7BD`, título Sora 18px blanco, razón en 13px, meta con duración · nivel · tutor · misión.
   - *Sorprendeme* — card ámbar suave (#FFFBEB, borde rgba ámbar .35), ícono de dado.
   - *Tema libre* — card blanca con input 44px + botón circular 36px `--green`.
3. **Copiloto de elección** — card verde muy claro (gradiente de `--o-cruce-bg` a transparente, borde rgba(0,179,126,.25), radio 16px, padding 18px):
   - head: avatar circular 28px verde con ícono de destello + h3 Sora 15px + subtítulo 12.5px.
   - input de 46px (radio 12px) con botón "Recomendame" oscuro embebido a la derecha.
   - 6 chips de intención de 32px, radio 99px, ícono 13px: *Tengo 5 minutos · Que me desafíe · Algo liviano · Mis errores · Salir de la rutina · Hablar de laburo*.
   - salida: línea de resumen ("Leí X. Para eso te propongo **12 minutos** y estos tres:") + grid `repeat(auto-fit,minmax(230px,1fr))` de 3 picks. Cada pick: número en badge 22px, título 13.5px/700, **motivo** en 12px `--fg-3`, "elegir →" abajo a la derecha.
4. **Barra de controles** — card blanca, radio 14px, padding 12px:
   - fila 1: buscador (flex 1, ícono lupa, atajo `/`), select de orden (5 criterios), select de vista.
   - fila 2 "ATAJOS": 4 pills con ícono + conteo real — con misión de rescate, recién sumados, los que más charlo, dormidos hace rato.
   - fila 3: chips de categoría en **una sola línea** con scroll horizontal, cada uno con ícono y color propio, más "Todos" activo en negro y un chip final "todas ⌄" que expande a grilla.
5. **Grilla de tópicos** — `repeat(auto-fill,minmax(240px,1fr))`, gap 16px. Card: cabecera de 120px con gradiente por categoría + figura SVG, badge de ranking "#3" arriba a la derecha, ícono en chip blanco 36px, categoría uppercase 10.5px del color de la categoría, título Sora 15px, meta (charlas · última vez · misión de rescate con barra de progreso de 5 segmentos).

## Interactions
- Click en card → se selecciona: borde `--green` 2px, badge "· elegido", y el **dock inferior** se actualiza.
- **Dock inferior** (`.selbar`): fijo abajo, fondo `--green-900`, radio 16px, sombra float. Trae avatar del tutor, "TÓPICO ELEGIDO", título, línea de apertura del profe en itálica, meta (tutor · nivel · duración · categoría), selector de duración (5'/7'/12'), selector de ritmo (Sobremesa/Ping-pong/Debate), "Cambiar tutor" y "Empezar charla". Usa **container queries**: va escondiendo rótulos, preview y controles según su propio ancho, nunca según el viewport.
- Copiloto: al enviar muestra estado "pensando" ~600ms, luego los 3 picks; si quedan tapados por el dock, la página scrollea lo justo.
- Atajos de teclado: `/` enfoca el buscador, `Esc` limpia selección.
- Chips de categoría y atajos filtran en vivo y recalculan sus propios conteos.

## State
`selected` (id de tópico) · `duration` · `rhythm` · `query` · `sort` · `category` · `shortcut` · `copilotResult`.

## Notas de implementación
- El copiloto debe llamar al recomendador real; el mock local está en `practicar.js` (`recomendar()`, reglas por intención con su `why()`).
- El texto del motivo es parte del producto: nunca mostrar un pick sin explicar por qué.

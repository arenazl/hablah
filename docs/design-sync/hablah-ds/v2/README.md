# Design handoff v2 — habláh (app del alumno)

Fuente: proyecto **`hablah`** de Claude Design (MCP `claude_design`),
id `031f4bbb-0b30-4c08-a08e-8e40368bf91d`, **carpeta raíz** del proyecto.

> No confundir con `docs/design-sync/hablah/design_handoff_hablah/`, que es el
> handoff **anterior** (commit `68221a4`) y ya está implementado.

## Qué entra en este handoff

Sólo el **producto del alumno**. Kids, Landing, Ingreso, Onboarding y Backoffice
quedan **fuera** por decisión del dueño.

| pantalla | archivo en el proyecto de Design | dónde vive en el código |
|---|---|---|
| Hoy | `Hoy.html` | `HoyView` en `frontend/src/pages/WebApp.tsx` + `hoy.css.ts` |
| Practicar | `Practicar.html` (+ `practicar.js`) | `PracticarView` + `practicar.css.ts` |
| Charla | `Charla.html` | `PracticarView` (sesión en vivo) + `convo-bg.css.ts` |
| Reporte | `Reporte.html` | `SessionReport` / `SessionReportOverlay` |
| Mapa de progreso | `Mapa.html` | `MapaView` + `mapa.css.ts` |
| Historial | `Historial.html` | `HistorialView` + `historial.css.ts` |
| Perfil | `Perfil.html` | `PerfilView` |
| shell (menú + topbar) | `app.css` + sidebar de cada pantalla | `Sidebar`/`TopBar` + `webapp.css.ts` |

`Inicio.html` es el **integrador** del handoff (un shell con iframes para navegar
las pantallas), no una pantalla del producto — no se implementa.

## Cómo abrir los prototipos

Bajá el ZIP del proyecto desde claude.ai/design y descomprimilo **en esta
carpeta**. `Hoy.html` ya está acá y es autónomo (todo su CSS es inline); las
otras seis linkean `app.css`, así que necesitan el bundle completo para verse
bien. Con eso se abren con doble clic y los links entre pantallas funcionan.

## Reglas del handoff (regla global 22)

- El `.html` es **especificación**, no código: se implementa con los componentes
  y tokens del kit, nunca se copia el markup ni los estilos inline.
- Se respeta lo que el diseño decidió (copy, KPIs, columnas, orden). Si el
  criterio propio choca, gana el diseño y se avisa.
- Si el mockup muestra un dato que el motor no tiene, va **otro dato real** de esa
  sección en la misma posición — nunca el número hardcodeado del prototipo.
- Los toggles del prototipo no son controles de la app: son los **estados** que
  hay que saber dibujar.

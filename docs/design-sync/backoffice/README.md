# Renovación del Backoffice — prototipo de Claude Design (2026-08-15)

Bundle bajado del proyecto "hablah" de claude.ai/design vía DesignSync. Se abre con
doble clic en `Backoffice.html` (SPA estática: router por hash + vistas en JS).

## Qué es

Rediseño INTEGRAL del backoffice (`/admin`), incluido el menú. ESPECIFICACIÓN a
implementar con los componentes del proyecto React (regla 22: jamás copiar el markup;
se copia lo decidido: IA, copy, jerarquía, estados).

## La nueva arquitectura de información (el menú)

- **Overview** — home con saludo, KPIs, heatmap de tópicos, actividad, alertas.
- **Orquestación y pruebas**
  - Probador de clases → Capas del composer · Prompt compilado · **Mapa de nodos** ·
    Clase en vivo · Memoria del alumno (cada una como subpágina propia)
  - Auditoría de sesiones
- **Catálogo del motor**
  - Catálogo → Tópicos · Edades y niveles · Personalidades · Voz
- **Operación** — Métricas · Alumnos · Usuarios
- **Side-alert de salud del catálogo** (ej. "junior×B1 sin accion_de_cierre") con link
  directo a la celda faltante.

## Piezas del bundle

| Archivo | Rol |
|---|---|
| `Backoffice.html` | Shell: sidebar + topbar (crumbs, toggle tema, CTA contextual) |
| `backoffice.views.js` | Router hash + las 11 vistas (Overview, Catálogo, Topic, Cruce, Persona, Voice, Auditoría, Session, Operación, Student, User) |
| `backoffice.data.js` | Datos de maqueta (reemplazar por APIs reales al implementar) |
| `backoffice.css` | Estilos de las vistas + sidebar de grupos colapsables |
| `probador.css` | Estilos del probador rediseñado |
| `admin.css` / `app.css` | Sistema base de Design (tokens, tipografía Sora+Inter) |

## EXCEPCIÓN acordada con el dueño

**La vista "Mapa de nodos" NO se implementa desde este prototipo** (Design hizo un
mockup a medias): se conserva la implementación existente con **ReactFlow**
(`PromptFlow` en MotorPlaygroundPanel: detalle al costado + fichas "cómo se llena" /
"Relaciones"), re-estilada con los tokens de este rediseño.

## Reglas al implementar

- Los datos de `backoffice.data.js` son maqueta: cada vista se engancha a los
  endpoints reales existentes (motorAPI, finaltest, auditoría, users).
- Paleta por dueño del dato: se mantiene como ley en todas las vistas del motor.
- Orden de trabajo (regla 22): navegable estático validado por el dueño (este bundle)
  → implementación por fases con endpoints reales.

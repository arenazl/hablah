# PROMPT PARA CLAUDE CODE

Pegá este texto como primer mensaje en Claude Code, con esta carpeta adjunta.

---

Tengo un paquete de diseño en HTML para **habláh**, una app de práctica de inglés por voz con un motor que compone el prompt de cada clase. Quiero implementarlo en el codebase real.

**Empezá leyendo `README.md`** (overview, design tokens, voz y reglas transversales) y después `specs/<pantalla>.md` de la pantalla que vayas a hacer.

Los archivos de `design/` son **referencias de diseño**, no código de producción: prototipos en HTML que muestran el look y el comportamiento esperados. La tarea es **recrearlos con los patrones y las librerías del codebase** (React + TypeScript), no copiar el HTML. Donde ya exista un equivalente en el repo (por ejemplo el `PromptFlow` con ReactFlow del probador), reusarlo.

La fidelidad es alta: colores, tipografía, espaciado, estados e interacciones son finales. Los datos son de demo — `design/backoffice.data.js` es el mock completo del catálogo del motor y hay que reemplazarlo por las respuestas reales de la API.

**Punto de entrada del paquete**: abrí `design/Inicio.html` en el navegador para ver todas las pantallas con su navegación.

**Qué se copia tal cual y qué es referencia**

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

**Orden sugerido de implementación**
1. Tokens y shell (`app.css` → sistema de diseño del repo: colores, tipografía, sidebar, topbar).
2. Producto: Hoy → Practicar → Charla → Reporte (es el flujo completo de una sesión).
3. Motor: Backoffice (overview, catálogo, auditoría, operación) y adentro el Probador de clases.
4. Kids, Onboarding, Landing, Login.

**Reglas que no se negocian**
- Español rioplatense con voseo, minúsculas en labels de sistema, sin exclamaciones en UI de adultos.
- El feedback nunca interrumpe la charla: llega en el reporte.
- En el probador y el backoffice, el color de cada campo indica **de qué tabla sale el dato** (paleta por dueño en el README). Es semántico, no decorativo.
- Nada de emojis salvo en Kids.

Antes de escribir código, decime qué pantalla vas a hacer primero y cómo pensás mapear los tokens a lo que ya existe en el repo.

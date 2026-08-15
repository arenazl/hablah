# Probador de clases — 4 propuestas de layout (2026-08-15)

Prototipos ESTÁTICOS de Claude Design para el rediseño de `/motor` (la mesa de trabajo
del dueño). Se abren con doble clic, sin servidor. Subidos también al proyecto
**"Habláh — Design"** de claude.ai/design (grupo "Probador — layouts").

## Por qué

Feedback del dueño (2026-08-15): "es la pantalla clave de trabajo y no está intuitiva
la navegación ni la forma de visualizar los datos". Hoy todo está apilado verticalmente
(selectores + capas + prompt + dock), la clase en vivo queda tapada y el flujo de
trabajo no se cuenta.

## Las 4 variantes (conceptos, no estética final)

| Archivo | Concepto | Para qué flujo brilla |
|---|---|---|
| `v1-cockpit.html` | 3 columnas fijas: QUIÉN / QUÉ / PRUEBA | Operar sin scroll: armo → leo → hablo |
| `v2-wizard.html` | Etapas (armar → revisar → probar → memoria) + breadcrumbs de contexto | Contar el flujo; la charla protagonista con la cadencia como ecualizador en vivo |
| `v3-mission.html` | El ALUMNO como ficha protagonista + 4 cuadrantes de estado | Ver la evolución del perfil; estado general de un vistazo |
| `v4-editor.html` | IDE: árbol de capas / campo editable / ficha de contexto + barra de clase | Curación fina de placeholders sin perder la prueba por voz |

## Reglas (regla 22 de la casa)

- El `.dc`/prototipo es ESPECIFICACIÓN, no código: se implementa con los componentes
  y tokens del proyecto, jamás copiando el markup.
- Se copia lo que el diseño decidió (copy, orden, jerarquía, estados); si el criterio
  del implementador choca, gana el diseño y se avisa.
- Dato que el motor no tiene → va otro dato REAL en esa posición, no hardcodeo.
- La paleta por DUEÑO del dato es LA paleta de la app (runtime azul, EDAD ámbar,
  NIVEL celeste, cruce verde, tópico índigo, reglas violeta, código rojo) — las 4
  variantes la respetan y cualquier implementación también debe hacerlo.
- Los elementos interactivos de los mockups son ESTADOS a dibujar, no controles reales.

## Ideas transversales (aparecen en varias variantes — candidatas seguras)

- Contexto comprimido en UNA línea editable (breadcrumbs), nunca media pantalla de selects.
- La clase en vivo NUNCA tapada: columna propia (v1), etapa propia (v2), cuadrante (v3)
  o barra persistente (v4).
- La CADENCIA visualizada (ecualizador con el compás actual del director).
- La memoria/evolución del alumno como ciudadano de primera (v3 la lleva al máximo).
- Ficha "cómo se llena / relaciones" pegada al campo (v4), heredada del mapa de nodos.

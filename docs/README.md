# docs/ — Habláh

Índice maestro. **Criterio de organización** (estándar de todos los proyectos):
`d:\Code\base-compartida\9-ORGANIZACION-DOCS.md`. En resumen: todo vive en `docs/`; en esta raíz
solo este `README.md`; temas de trabajo en carpetas numeradas; `handoffs/` e `historico/` por fecha;
lo viejo no se borra, se archiva en `historico/` con su fecha. **Nada de info cruzada.**

## Por dónde empezar (estado vigente)

| Doc | Qué es |
|---|---|
| **[handoffs/2026-06-28_handoff-fable.md](handoffs/2026-06-28_handoff-fable.md)** | **LEER PRIMERO.** Historia de la app, cómo mutó el motor, estado actual, errores detectados (honestidad) y hoja de ruta. Escrito para el modelo que la toma. |
| [01-recuperacion-motor/01-plan-recuperacion.md](01-recuperacion-motor/01-plan-recuperacion.md) | Análisis objetivo de los 3 motores vs el SPEC + el plan de recuperación por fases. |
| [01-recuperacion-motor/02-deudas-tecnicas.md](01-recuperacion-motor/02-deudas-tecnicas.md) | Deudas técnicas abiertas (mic PWA, app_config, VAD/ASR, jubilar v3, …). |

## Carpetas

| Carpeta | Contenido |
|---|---|
| `handoffs/` | Cierres de sesión por fecha (`YYYY-MM-DD_titulo.md`). El más nuevo = estado al último corte. |
| `01-recuperacion-motor/` | Tema de trabajo actual: recuperación del motor (motor único v2, de-robotizado, paginita). |
| `mejoras_pedagogicas/` | Dominio base: fichas pedagógicas (duración, cierre, apertura, conversación-first). |
| `historico/` | Docs cerrados/superados por fecha. **No borrar nada — se archiva acá.** Incluye el experimento `2026-06-23_multi-llm-v3/` y la data de lotes de evaluación/transcripción. |

## ¿Dónde va un doc nuevo?

- **Cierre de sesión / estado** → `handoffs/YYYY-MM-DD_titulo.md`.
- **Tema de trabajo nuevo** → carpeta numerada nueva (`02-...`, `03-...`).
- **Ficha de un dominio existente** → dentro de su carpeta (`mejoras_pedagogicas/NN-...`).
- **Algo que quedó superado** → `historico/YYYY-MM-DD-titulo.md` (y el nuevo dice "supera a X").
- Actualizar este `README.md` en el MISMO commit que agrega/mueve un doc.

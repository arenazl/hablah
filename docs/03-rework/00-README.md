# Rework Habláh — índice

> Autor: Fable (2026-07-09). Pedido del dueño: análisis integral de por qué se degradó la calidad +
> análisis de la arquitectura final (motor, interfaz, todo) + hoja de ruta detallada para que
> modelos implementadores (Opus/Sonnet) SOLO implementen — sin re-análisis contextual ni de lógica.

| Doc | Qué es | Para quién |
|---|---|---|
| [`01-analisis-integral.md`](01-analisis-integral.md) | Las 7 causas raíz de la degradación (con evidencia) + estado real de cada capa (motor, backend, frontend, dato, infra, actor IA) + la filosofía del rework (7 decisiones). | El dueño y quien necesite el PORQUÉ. |
| [`02-hoja-de-ruta.md`](02-hoja-de-ruta.md) | 26 órdenes de trabajo autocontenidas en 6 fases (F0 consolidación → F1 motor/actor → F2 historia → F3 voz/infra → F4 producto/UX → F5 SEO/AEO/branding), con reglas globales, dependencias, criterios de aceptación y tablero de estado. | Los modelos implementadores. Empezar por las REGLAS GLOBALES y el tablero. |

**Cómo usar (implementador):** leer las reglas globales de `02` → tomar el primer WO `pendiente`
sin dependencias abiertas → implementarlo tal cual (si la realidad del código contradice el WO,
frenar y preguntar) → actualizar el tablero → siguiente.

**Gates del dueño** (WOs que requieren su decisión explícita antes o durante): F1-01 (texto de la
directiva universal), F1-04 (veredicto por voz), F1-05 (cambio de modelo del coach), F4-03
(pantallas nuevas), F4-05 (dirección visual), F4-06 (momento de arranque), F5-04 (mensaje de marca).

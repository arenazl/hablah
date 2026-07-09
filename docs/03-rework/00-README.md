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

**Gates del dueño** (WOs que requieren su decisión explícita antes o durante): F0-06 (lista de
tópicos teen), F1-01 (texto de la directiva universal), F1-04 (veredicto por voz), F1-05 (cambio de
modelo del coach), F2-03 (diff del composer + variantes de arranque), F4-03 (pantallas nuevas),
F4-05 (dirección visual), F4-06 (momento de arranque), F5-04 (mensaje de marca).

---

## Cómo disparar el trabajo (modelos, effort y filosofía costo/beneficio)

**El principio:** el análisis caro ya está pagado (Fable). La calidad de la implementación depende
de dos cosas: **contexto chico** (1 WO = 1 sesión nueva; no encadenar WOs en la misma conversación
salvo los pares marcados) y **modelo elegido por riesgo del WO**, no por fase.

### Prompt de disparo (copiar/pegar en una sesión nueva, cambiando el ID)

> Leé `docs/03-rework/02-hoja-de-ruta.md` — primero las REGLAS GLOBALES completas, después el
> **WO <ID>**. Ejecutá SOLO ese WO. No re-analices contexto ni lógica: el análisis ya está hecho
> (`01-analisis-integral.md`, leelo únicamente si el WO lo referencia). Si el código real
> contradice el WO, frená y preguntame — no improvises. Al terminar: verificá los criterios de
> aceptación uno por uno, actualizá el tablero a `hecho`, y commiteá (sin pushear si tocaste motor:
> primero el smoke).

### Ruteo de modelos por fase (estándar permanente — `base-compartida/13` §7)

| Fase | Modelo | WOs de este proyecto |
|---|---|---|
| **F0 Consolidación** | **Sonnet** | F0-02, F0-03, F0-04, F0-05, F0-06 — **excepto F0-01 → Opus** (recablea plumbing del motor) |
| **F1 Motor/actor** | **Opus + extended thinking** | F0-01 hecho antes; F1-01 + F1-02 **juntos en una sesión** (mismos archivos, un paquete de voz); F1-05 — **excepto F1-03 → Sonnet** (tooling de smoke) |
| **F2 Historia** | **Opus + extended thinking** | F2-01 + F2-02 **juntos**; F2-03 |
| **F3 Robustez** | **Sonnet** | F3-01, F3-02, F3-03, F3-04 |
| **F4 Producto/UX** | **Opus** | F4-01 (refactor de 3.744 líneas), F4-03, F4-05, F4-06 — **excepto F4-02 y F4-04 → Sonnet** (checklist viewport, feature acotada) |
| **F5 Growth** | **Sonnet** | F5-01, F5-02, F5-03 — **excepto F5-04 → Opus** (copy de marca) |

**Fable (el caro): NO se usa para implementar.** Se lo llama solo cuando: (a) un WO choca con la
realidad del código y el implementador frenó, (b) el dueño trae un insight de campo nuevo (síntoma
→ diagnóstico → capa → WO, ver §6 del protocolo `base-compartida/13`), (c) hay que re-decidir algo
de arquitectura. **Haiku: no usar en este repo** (el motor es sutil; el ahorro no paga el riesgo).

### Higiene de sesión (lo que protege la calidad)

1. **Secuencial dentro de cada fase**, respetando dependencias. Se puede paralelizar como mucho 2
   WOs si no comparten archivos (ej. F0-03 con F0-02) — ante la duda, serial.
2. **Cerrar cada WO en su sesión**: aceptación verificada + tablero + commit. Un WO a medias no se
   hereda a otra sesión sin nota en el tablero.
3. **WOs que tocan motor/dato** (F1-*, F2-*): correr el smoke (F1-03) antes de pushear — el push
   deploya a producción.
4. **Si el implementador quiere "mejorar" algo fuera del WO**: NO. Lo anota como sugerencia al
   final y sigue. Las mejoras nuevas entran por Fable como WOs, no de contrabando.
5. Los gates del dueño no se salteán ni se interpretan: el implementador llega al gate, presenta
   las opciones/diff y espera.

**Presupuesto mental:** ~60% de los WOs salen con Sonnet estándar, ~40% con Opus pensando — y
Fable solo de árbitro. Ese es el punto óptimo costo/calidad para este plan.

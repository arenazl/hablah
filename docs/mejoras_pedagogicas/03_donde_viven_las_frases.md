# 03 — Dónde viven las frases (piezas vs verbatim) — DECISIÓN ABIERTA

> Apunte de arquitectura pedagógica. Surgió con el cierre suave (nota 02), pero
> aplica a toda frase "fija" del método. NO decidido todavía.

## El matiz del "motor determinístico"

El motor es determinístico en **armar el prompt** (qué reglas y datos saca de qué
filas, en qué orden) — **NO en las palabras exactas** que dice el coach. Esas las
**genera el LLM** en el momento. → **No hace falta grabar las frases verbatim.**

## Recomendación: grabar las PIEZAS, no la frase

| Qué se graba | Dónde |
|---|---|
| El **principio** (ej: "al cerrar, ofrecé seguir/descansar") | pedagogía, bloque 3 (global) |
| El **tono/estilo** (juguetón / canchero / sobrio) | `StudentType` (por edad/segmento) |
| La **mezcla ES/EN** (A0 español, B2 inglés) | riel `MethodologyModule` (por nivel) |

El LLM compone la frase final con esas piezas **+ el contexto vivo** (nombre, qué
aprendió hoy). Adapta por edad×nivel **sin una fila por cada combinación**.

## Por qué NO verbatim

Grabar la frase exacta por cada (edad × nivel × …) = **explosión combinatoria** +
suena **enlatado** (lo que toda la arquitectura evita).

## Punto medio (si se quiere más control)

Un campo `closing_seed` por segmento en `StudentType`: guía fuerte la redacción pero
deja que el LLM meta el nombre y el contexto. "Grabado en BD" sin congelarlo.

**PENDIENTE:** decidir entre **piezas** (recomendado) y **seed por segmento**.

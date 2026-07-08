# Cruce de alumnos — consolidado (registro reversible)

coach = Gemini `flash-lite` (prod) · alumno = 5 modelos Ollama × 4 personas · juez = Claude SLA  
Cada celda = 1 clase (historia 0). Promedio del coach = sobre las 20 celdas válidas (0 infra_fail).

## early_child A1 · Mi familia — **promedio coach 7.3**

| modelo | trabado | fluido | quedado | crack | PROM |
|---|---|---|---|---|---|
| gpt-oss:120b | 7 | 7 | 8 | 8 | 7.5 |
| qwen3-coder:480b | 6 | 8 | 8 | 8 | 7.5 |
| gemma3:27b | 8 | 7 | 8 | 7 | 7.5 |
| nemotron-3-nano:30b | 9 | 7 | 6 | 5 | 6.8 |
| minimax-m3 | 7 | 8 | 8 | 7 | 7.5 |
| **PROM** | 7.4 | 7.4 | 7.6 | 7.0 | |

Dimensiones (promedio): **naturalidad** 6.9 · **afecto** 8.4 · **i1** 7.2 · **reciclado** 7.0 · **recast** 7.6

Celdas bajas (<7):
- `nemotron-3-nano:30b/crack` score **5** (rec 4 recast 3 i+1 2): Dragón entusiasta pero desacalibrado: impone inglés puro (i+3) a A1 que necesita soporte español; no recasta code-switching ni reciclaje de vocab.
- `qwen3-coder:480b/trabado` score **6** (rec 5 recast 6 i+1 7): Afecto presente e i+1 calibrado, pero falta reciclado genuino del input del alumno y recast hondo. Frame del dragón colapsa; clase desorganizada entre registros.
- `nemotron-3-nano:30b/quedado` score **6** (rec 7 recast 7 i+1 5): Input inflado para A1 (70% inglés vs 20% esperado); ignora preferencia activa del alumno por español; buen recast estructural ('just you, mom and dad') pero pierde empatía en 'me aburro' sin procesar frustración.

## child B1 · El mundo de los dinosaurios — **promedio coach 7.5**

| modelo | trabado | fluido | quedado | crack | PROM |
|---|---|---|---|---|---|
| gpt-oss:120b | 7 | 7 | 7 | 8 | 7.2 |
| qwen3-coder:480b | 8 | 9 | 7 | 7 | 7.8 |
| gemma3:27b | 5 | 8 | 8 | 8 | 7.2 |
| nemotron-3-nano:30b | 7 | 8 | 8 | 7 | 7.5 |
| minimax-m3 | 7 | 8 | 9 | 8 | 8.0 |
| **PROM** | 6.8 | 8.0 | 7.8 | 7.6 | |

Dimensiones (promedio): **naturalidad** 7.1 · **afecto** 8.6 · **i1** 7.7 · **reciclado** 6.8 · **recast** 7.9

Celdas bajas (<7):
- `gemma3:27b/trabado` score **5** (rec 6 recast 8 i+1 6): Afecto y celebración fuertes, pero prescribe el tópico en lugar de co-construirlo. La pregunta «¿más rápido que un huevo pequeño?» es lógicamente absurda y mata la coherencia conversacional.

## adult A1 · Cine de aventuras — **promedio coach 7.4**

| modelo | trabado | fluido | quedado | crack | PROM |
|---|---|---|---|---|---|
| gpt-oss:120b | 8 | 7 | 8 | 8 | 7.8 |
| qwen3-coder:480b | 8 | 8 | 4 | 8 | 7.0 |
| gemma3:27b | 7.5 | 7 | 7 | 7 | 7.1 |
| nemotron-3-nano:30b | 7 | 9 | 8 | 7 | 7.8 |
| minimax-m3 | 8 | 7 | 7 | 8 | 7.5 |
| **PROM** | 7.7 | 7.6 | 6.8 | 7.6 | |

Dimensiones (promedio): **naturalidad** 7.5 · **afecto** 8.4 · **i1** 7.9 · **reciclado** 7.1 · **recast** 7.3

Celdas bajas (<7):
- `qwen3-coder:480b/quedado` score **4** (rec 5 recast 3 i+1 6): Abrió con calidez en español, pero saltó bruscamente al inglés sin andamio. Ignoró el territorio seguro del alumno (A1 necesita mezcla), no celebró intentos, ni reciclaba productivamente.

# Informe — Refactor de pedagogía motor_v3 (loop autónomo)

**Fecha:** 2026-06-23 · **Modo:** autónomo · **Cambios:** 100% DATO (cero código, cero `if`, reversibles con backup por iteración)

## 1. Qué se pidió
Refactorizar la pedagogía de TODOS los niveles con la nueva estructura, correr todas las clases
hasta scores 8/9, y una muestra de historia 0/1/2/3 para ver el `learned_state`.

## 2. Método (anti-cartón)
- **Coach = Gemini `gemini-3.1-flash-lite-preview`** (el proxy fiel a la voz de prod `flash-live`).
  Alumno = Ollama `gpt-oss:120b`. Juez = Claude (especialista SLA, lente por nivel). **Nunca** Claude de coach.
- **6 iteraciones de DATO**, cada una validada por un workflow (11 perfiles = 4 bandas × niveles,
  3→5 clases/perfil) + un agente que diagnostica los <8 y propone dirección. Todo reversible.

## 3. El recorrido (baseline → hoy)
| Perfil | Baseline (roto) | Hoy | Qué lo curó |
|---|---|---|---|
| child A2 | **3** (drilling severo) | **8.1** ✓ | sacar las 2 guards telegráficas (yes/no + 2-4 palabras) |
| adult B1 | **5.0** (validaba en seco) | **7.0** | adult dejó de "diferir la corrección al cierre" |
| teen A2 | **5.3** | **7.2** | trigger teen con riel de recast |
| early_child A1 | 6 ("decí 'my'") | 7.6 | chunks con sentido + need-for-output + anti-silencio |

## 4. Matriz final (config pico restaurada, N=5)
| Banda | Nivel | avg | Estado |
|---|---|---|---|
| child | A1 | **8.0** | ✓ pasa |
| child | A2 | **8.1** | ✓ pasa |
| early_child | A2 | 7.8 | cerca |
| early_child | A1 | 7.6 | cerca (recast excelente cuando el nene habla) |
| adult | B1 | 7.0 | recast intermitente |
| teen | A2 | 7.2 | cerca |
| teen | B1 | 6.8 | recast inconsistente |
| adult | C1 | 6.7 | recast de matiz no se ejecuta |
| teen | B2 | 5.8 | recast + varianza (silencio) |
| adult | A1 | 5.8 | varianza (clases con alumno mudo) |
| child | B1 | 5.4 | recast B1 no se ejecuta |

## 5. Qué se curó (en DATO, por capa — tu arquitectura "misma policy, valor por nivel/banda")
- **Capa 6 universal:** escucha activa + recast natural, sin frases-template fijas.
- **`level_policy.error` (valor por nivel):** A0 no-corrige → A1 suave → A2 audible → B1 obligatorio →
  B2/C1 selectivo + matiz. Mismo `kind`, body distinto por `level_code`. Cero hardcode.
- **Banda:** child sin guards telegráficas; adult "fluency-first NO es cero corrección"; teen/adult
  trigger con riel de recast; guards anti-silencio kids; adult sin TPR de kids.
- **Bug:** openings `kid/None` y `kid/A2` todavía pedían `repetir {vocab0}` (drilling residual) → limpiado.

## 6. El muro honesto — por qué NO todos llegan a 8/9
**Las dos causas restantes NO son de dato.** El recast ya vive en 3 capas (universal + nivel + trigger):

**a) Ceiling de ejecución del Flash en el recast B1+.** El modelo valida el contenido con calidez
("That's a great point") pero **saltea la corrección de la forma**. 6 rondas de dato no lo cruzaron, y
la ronda con el gate más fuerte (iter6) **hasta regresó** (early_child A1 7.6→4.8: el `"Say: ..."` que
metí como anti-silencio se volvió drilling — el modelo copia ejemplos literal). Esto es exactamente lo
que avisó Gemini: **Flash toma atajos bajo carga de reglas.** Pro SÍ recasta consistente, pero **no es
el modelo de la voz** (latencia → flash-live obligado).

**b) Varianza intrínseca.** El mismo perfil da **4 y 9** según si el alumno (simulado) se engancha.
Las clases con alumno mudo → el profe monologa → arrastran el promedio. No es falla estable; es la cola baja.

## 7. learned_state (historia 0→1→2→3)
| Perfil | score h0→h3 | learned_state (items) |
|---|---|---|
| child A2 | 9, 9, 8, 8.5 | 0 → 10 → 16 → 23 |
| early_child A1 | 6, 7, 8, 8 | 0 → 7 → 7 → 12 |
| teen B1 | 8.5, 7, 6, 8 | 0 → 6 → 11 → 14 |
| adult B1 | 8, 6, 7, 7 | 0 → 4 → 10 → 18 |

- **La plomería SRS anda:** el `learned_state` persiste y crece con cada clase, sin degradar el score.
- **Pero el coach lo sub-usa:** `continuity` casi siempre NO — no retoma clases previas aunque el estado
  esté inyectado en el prompt. **Responde tu pregunta de antes:** el estado SÍ se inyecta, pero el modelo
  no lo capitaliza (otro gap de ejecución, no de plomería).

## 8. Recomendaciones (los levers reales — el dato ya está agotado)
1. **Mic test con el modelo real de voz** (`flash-live`) = árbitro final. El proxy de texto puede diferir.
2. **Consolidar/aligerar el prompt.** 6 iteraciones AGREGARON reglas → Flash fatiga. Menos reglas, mejor
   redactadas = más bandwidth para ejecutar el recast. Contraintuitivo pero respaldado por la regresión de iter6.
3. **Recast estructural por turno** (gate en código/post-proceso, o inyección de estado por turno) para B1+.
   Lo que el prompt no logra en Flash, un gate determinístico fuera del prompt sí.

## 9. Reversibilidad
Todo es DATO con backup por iteración (`scripts/_backup_pedagogy_iter*.json`). La estructura de 9 capas
quedó intacta. Cero código, cero `if`, cero parche. El flag de prod (`MOTOR_V3_KIDS`) sigue **off**.

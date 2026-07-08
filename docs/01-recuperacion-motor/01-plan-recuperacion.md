# PLAN DE RECUPERACIÓN — Habláh

> Análisis objetivo (sin casarme con el código existente) + plan, tomando los conceptos del dueño
> como la ESPECIFICACIÓN. Fecha: 2026-06-27.

---

## 1. El SPEC (tus conceptos = el contrato que el motor DEBE cumplir)

1. **Determinístico.** La clase la arma un motor de reglas, no la IA. La IA solo conversa con el
   prompt ya armado. (Es el alma de la app — no se toca.)
2. **9 pasos** que cargan: perfil del profe + pedagogía + perfil del alumno + estado/errores
   (learn_state) + … → y recién ahí el prompt a la IA.
3. **3 pilares** generan la clase: **EDAD · NIVEL · HISTORIA**. Con esos 3 se obtiene todo.
4. **Estático vs dinámico:** EDAD y NIVEL = presets **estáticos**; HISTORIA = **dinámico**
   (lo que le gusta, dónde se traba, fortalezas/debilidades) → evita que la clase se repita.
5. **Generar, NO persistir.** El motor **concatena presets** al vuelo; no hace falta grabar una
   orquestación por combinación.
6. **Un solo motor** para todos: el nene de 5 (apenas hila castellano) y el de 60 que vivió en
   Miami. Cambian los presets, no el motor.
7. **El tópico cuelga de la EDAD** (por interés): dinos para un nene, no para un adulto. Un tópico
   puede estar en **varios niveles**, o en uno solo.
8. **Tópico liviano = libertad del coach.** El tópico es un tema-semilla, no un guion. Dentro de
   los rieles, el coach improvisa (la clase de dinos no es siempre "preguntá por el T-Rex").
9. **El test tiene que correr el motor que funciona** (hoy no pasa: ver §2).

---

## 2. Análisis objetivo: los 3 motores contra el SPEC

| Concepto del SPEC | v1 super_prompt | v2 compose_proto | v3 motor_engine (9 capas) |
|---|---|---|---|
| 1. Determinístico | sí (pero monolito estático) | **sí** | sí |
| 2. 9 pasos cargados | no (template fijo) | **sí** (12 bloques ≈ 9 capas) | sí (9 capas explícitas) |
| 3. 3 pilares edad/nivel/historia | no | **sí** (student_types + levels + learner_state) | sí (tablas + SRS) |
| 4. Estático vs dinámico | no | **sí** | sí |
| 5. Generar, no persistir | genera | **genera (JIT)** | **persiste** (orchestration) ← contradice el SPEC |
| 6. Un motor para todas las edades | no | **sí** | sí |
| 7. Tópico cuelga de edad / multinivel | parcial | **sí** (`segmento` + `levels[]`, con ruido) | mal (tópico↔nivel inexistente; 95 tópicos en 4 bandas) |
| 8. Tópico liviano / libertad coach | no | **sí** (ignora el bloat, ~6 palabras-semilla, coach genera) | **no** (objetivos genéricos recitados + forzados) |
| 9. El test corre este motor | — | **NO** (producción sí, pero el test no) | **el test corre ESTE** (y está roto) |
| Estado | muerto (borrado 2026-06-17) | **vivo, producción, coherente** | nunca shipeó; rieles rotos |

**Veredicto objetivo:**
- **v1**: descartado (muerto y no cumple el modelo).
- **v3**: fue construido sobre la idea que el SPEC RECHAZA (persistir orquestaciones). Además sus
  rieles A0 están rotos (preguntas sí/no, referencias visuales, objetivos recitados). Tiene UNA cosa
  mejor que v2: un modelo de **historia más rico** (SRS + learner_preset con directivas + objetivos
  por estado). Eso es lo único rescatable.
- **v2**: cumple 8 de 9 conceptos hoy, y el 9º es justamente el problema (el test no lo usa). Es el
  motor que el dueño recuerda funcionando. **Es la base correcta.**

**Conclusión:** no hay que elegir entre motores ni reescribir. **Consolidar en v2**, y **portarle de
v3 sólo el modelo de historia más rico** (sin la persistencia ni los objetivos rígidos).

---

## 3. Decisión

- **Motor ÚNICO vivo = v2 (compose_proto).** Determinístico, 3 pilares, tópico liviano, sin persistir.
- **El test (/mini-test, /finaltest) pasa a v2** → "lo que probás es lo que produce".
- **v3 y v1 se jubilan** de todo path vivo (el código de v3 puede quedar dormido; deja de llamarse).
- **De v3 se porta** (después, no ahora) el modelo de historia (SRS/preferencias) si v2 se queda corto.
- **NO se persisten orquestaciones. NO se fuerzan vocab. NO se engordan tópicos. NO se curan 2000 combos.**

---

## 4. Estado real verificado (evidencia, no memoria)

- `/mini-test` y `/finaltest` resuelven por **v3** (`ws_orchestration`/`finaltest.resolve` →
  `motor_engine.resolve`), **sin mirar el flag**. La app real corre **v2** (`gemini_live` →
  `build_super_prompt` → `compose_proto`). [voice.py:289 / gemini_live.py:194]
- Prompt v3 Mini A0 (lo que escuchás): le ORDENA "pregunta cerrada/2-opciones cada turno" + está
  lleno de "scaffolding visual / recompensa visual / subtítulos en pantalla". De ahí el sí/no y la
  "foto". Los objetivos son genéricos por nivel (no del tópico).
- Prompt v2 Mini A0 (lo que produce): frase-puente "X se dice Y", 100% español, PROHIBIDO preguntas,
  sin "pantalla/foto". **Coherente.**
- `orchestration` (v3) = 5 demos; para early_child A0 = 0. Las orquestaciones custom **nunca
  existieron** (no hay backup). El "se rompió" fue el DATO + el test apuntando al motor incompleto.
- Catálogo v2: `student_types` (4) + `levels` (7) **sin corrupción residual** (no correr seeds).
- Tópico: el engorde está en adultos (`seed_prompts` hasta **10KB**, NO lo lee el motor) — peso
  muerto. El motor ya toma sólo ~6 palabras-semilla → el coach tiene libertad.

---

## 5. El plan, por fases (acotado primero — Mini, como pediste)

### Fase 0 — Un solo motor (consolidación)
- Cablear `/mini-test` al motor v2 (resolver + ws ya escritos y probados; falta el front).
- Que `/finaltest` y el editor resuelvan por v2 también (o se marquen como "v3 = laboratorio dormido").
- Resultado: lo que probás = lo que produce.

### Fase 1 — Los 3 pilares sólidos para Mini A0/A1
- **EDAD** (`student_types.mini`): verificado sano. ✓
- **NIVEL** (`levels` A0/A1): verificado sano. ✓
- **HISTORIA** (learn_state): hoy el test va con historia 0. Cablear la historia al test (intereses /
  errores / dominado) y **comprobar que el coach la USA** (que la clase 2 no repita la clase 1).

### Fase 2 — El eje TÓPICO bien (concepto 7 y 8)
- Limpiar el **tagging edad↔tópico↔nivel** (ruido: tópicos mal segmentados) — usar `segmento` +
  `levels[]`. Edad elige QUÉ tópicos; `levels[]` a qué niveles aplican.
- Mantener el tópico **liviano** (título + 4-6 semillas). Quitar/ignorar el `seed_prompts` gordo.
- Validar que el coach tiene libertad (la clase del mismo tópico varía).

### Fase 3 — Validación (vara real)
- Juez: Gemini-coach × Gemini-alumno, **historia 0 → 1 → 2** para ver EVOLUCIÓN, apuntar a ≥7.
- Después, validación por **voz real** (mic) — los scores de texto no transfieren 1:1 a voz.
- Criterios de "recuperado": cero sí/no, cero referencias visuales, frase-puente A0, el tópico
  aparece, la clase no se repite con historia.

### Fase 4 — El mismo motor para los otros perfiles
- Probar junior / tween / adult con el MISMO motor (sólo cambian presets edad+nivel). Es la prueba
  del concepto 6 (el nene de 5 y el de 60 con un solo motor).

### Cross-cutting (bugs reales encontrados)
- **`app_config=None` en producción** (SHA ddfad78 lo arregló sólo en ws_llm_test): el voice real
  ignora reglas (kid_safety, closing, ASR tolerance). Arreglar en el path de producción.
- **Captura VAD/ASR**: el sí/no <1s no se capta. La frase-puente lo mitiga; el fix profundo de
  captura es aparte.

---

## 6. Riesgos objetivos (lo que el plan NO garantiza por sí solo)

- **El coach (Gemini Flash) sub-usa la historia** aunque el dato esté perfecto (visto antes: "el
  learned_state persiste pero el coach lo sub-usa" / "muro del Flash"). Mitigación: directivas de
  historia más imperativas + medir; si no alcanza, evaluar un modelo más fuerte para el rol.
- **Texto ≠ voz**: validar final por micrófono, no sólo por juez de texto.
- **Ruido de curación** en el tagging de tópicos: hay trabajo de limpieza (no infinito: ~37 kid).

---

## 7. Anti-goals (lo que NO hacemos — para no repetir el pozo)

- NO persistir orquestaciones (la tabla `orchestration` se deja morir).
- NO forzar vocab (degrada y mata la libertad del coach).
- NO engordar el tópico (el `seed_prompts` de 10KB es peso muerto).
- NO curar 2000 combos a mano (la sesión pasada quemó ~$120 yendo a eso).
- NO un `if`/parche en el composer (la conducta sale del DATO/preset).

---

## 8. Qué ya está hecho / staged (subordinado al plan)

- ✅ Diagnóstico + análisis objetivo (este doc).
- ✅ Backend del motor único para el test: `motor_engine.resolve_v2()` + ws `/voice/ws_mini`
  (probados; la clase Mini A0 sale coherente).
- ⏸ Falta: cablear el front de `/mini-test` a `/ws_mini` con tópicos v2 (Fase 0).
- (Staged y NO aplicado: `fix_v3_a0_rails.py` — queda obsoleto si jubilamos v3; no se corre.)

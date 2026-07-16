# Reingeniería: la orquestación como DATO (template + placeholders)

**Fecha:** 2026-07-16 · **Autor del análisis:** Fable (árbitro) · **Decisión del dueño:** simplificar la
orquestación a un template agnóstico con placeholders dinámicos, tras detectar re-contaminación
(reglas duplicadas, contradicciones, nombres hardcodeados). La doctrina NO cambia: orquestador
agnóstico, cero pedagogía en código — la novedad es que ahora **la FORMA del prompt también es dato**.

---

## 0. Por qué (medido, no supuesto)

**Baseline duro (2026-07-16):** el linter `backend/scripts/detect_prompt_clashes.py` sobre los
28 cruces (4 edades × 7 niveles) encontró **76 contradicciones/clashes: 27 de 28 cruces FAIL**
(43 contradiction · 30 language_clash · 3 structure_error). Solo teen-B2 pasó limpio. Peores:
mini-C1 y mini-C2 (6 c/u), junior-C1 (6). Crudo completo: `00-baseline-linter-2026-07-16.txt`.

Ejemplos representativos del baseline:
- **adult B2/C1:** `Closing_Action` ordena cerrar con frase en español contra `Language_Rule: 100% inglés`.
- **adult C1:** pedagogy "anotar los vicios en silencio para el feedback de cierre" vs conversation_rules
  "recast en vivo / modelá y reintentá" — dos políticas de corrección simultáneas.
- **teen B1:** `critical_objective` "Finaliza SIEMPRE lanzando un reto numerado ('Challenge 1, ready?')"
  vs ley universal 1 "Keep the lesson structure invisible".
- **adult B1 (structure_error):** los `session_rails` llegan con una `X` literal sin resolver
  ("cada beat avanza el X") — placeholder roto en producción.
- **teen (redundancy, fuera del tally):** `tutor_profile.Tonal_Rules` == `behavioral_guards.Form_Rules`
  texto idéntico dos veces en el mismo prompt; "HABI" literal cuando el coach de la clase es Alex.

**Causa raíz estructural:** la FORMA del prompt vive hardcodeada DOS veces en Python —
`composer_proto.py` (bloques f-string) y `motor_engine._resolve_v2_breakdown_sync` (~150 líneas que
re-implementan la misma lógica para el visor) — y la curación quedó repartida: reglas universales como
blob de texto + `target_ids` hardcodeados en el composer (líneas 232-235), textos por segmento con
nombres literales en vez de placeholders, y CTAs por nivel que contradicen leyes universales.
Cambiar la orquestación hoy = tocar 2 archivos Python + deploy. Eso es un if/parche disfrazado y
viola la ley de asignación ("¿en qué capa+tabla vive?").

---

## 0.b Versionado: esto NO es un "motor v3"

Decisión del dueño (2026-07-16): **no bautizar esto como motor nuevo.** "v3" ya existió
(`motor_engine` 9 capas, jubilado) y reciclar el nombre reintroduce el malentendido de los dos
motores. Esto es el MISMO motor v2 con la forma externalizada: el resolver entra por la misma
firma que `compose_proto_prompt`. El "por si sale mal" se cubre con rollback en 3 niveles, no con
un motor paralelo (anti-goal): (1) revert del commit → deploy continuo; (2) F4 aditiva — las
tablas nuevas no pisan las fuentes actuales, que quedan intactas hasta validar F5; (3) la forma
versionada como dato: `orchestration_templates.active` → volver al template anterior = un UPDATE
sin deploy. Las "versiones del motor" hacia adelante son versiones del TEMPLATE.

---

## 1. Diseño destino

### 1.1 El template (definido por el dueño con Gemini — fuente única de la FORMA)

```xml
<context_and_persona>
  <system_info>
    Current_Date: {STATIC:current_date}
    Device_Type: {STATIC:device_type}
  </system_info>
  <student_profile>
    Name: {ALUMNO:nombre}
    Age_Group: {ALUMNO:edad}
    Level: {ALUMNO:nivel}
  </student_profile>
  <tutor_profile>
    Name: {EDAD:tutor_name}
    Identity: {EDAD:tutor_identity}
    Gamification_Focus: {EDAD:gamification_focus}
  </tutor_profile>
</context_and_persona>

<pedagogical_target>
  <topic_data>
    Topic: {TOPICO:titulo}
    Words_Available: {TOPICO:semillas}
  </topic_data>
  <learning_goals>
    Level_Target: {NIVEL:gramatica_objetivo}
    Expected_Production: {EDAD_X_NIVEL:produccion_esperada}
    Call_to_Action_Format: {EDAD_X_NIVEL:formato_de_cierre_de_turno}
  </learning_goals>
</pedagogical_target>

<rules_of_engagement>
  <language_and_tone>
    Language_Rule: {NIVEL:idioma_instruccion}
    Form_Rules: {EDAD_X_NIVEL:reglas_de_tono_y_entrega}
  </language_and_tone>
  <conversation_laws>
    {EDAD_X_NIVEL:reglas_universales_filtradas}
  </conversation_laws>
</rules_of_engagement>

<execution_flow>
  <structure>
    Style: {EDAD:estilo_de_sesion}
    Session_Rails: {EDAD_X_NIVEL:pasos_de_la_sesion}
  </structure>
  <runtime_commands>
    Start_Command: {EDAD_X_NIVEL:comando_de_arranque}
    Narrative_Anchors: {EDAD:anclas_narrativas}
    Continuation_Action: {EDAD_X_NIVEL:accion_de_continuacion}
    Closing_Action: {EDAD_X_NIVEL:accion_de_cierre}
  </runtime_commands>
</execution_flow>
```

### 1.2 El resolver genérico (el motor queda REDUCIDO a esto)

Parsea el template → por cada placeholder resuelve según el PREFIJO (el prefijo declara el dueño
del dato = la ley de asignación hecha sintaxis) → interpola anidado (`{tutor}`, `{name}` dentro de
los textos) → **fail-fast** (`MotorDataMissing`) si falta un dato → prompt final. Cero conocimiento
pedagógico en el código.

| Prefijo | Fuente | Tipo |
|---|---|---|
| `STATIC` | runtime (fecha, device) | directo |
| `ALUMNO` | `users` | directo |
| `EDAD` | `student_types` | directo |
| `NIVEL` | `levels` | directo |
| `TOPICO` | `topics` (94 curados — NO se re-curan) | directo |
| `EDAD_X_NIVEL` | tabla nueva `age_level_matrix` | directo |
| computados | funciones registradas por nombre | ver 1.3 |

### 1.3 Placeholders COMPUTADOS (no texto fijo — acá viven los mecanismos anti-robot)

Estos NO se almacenan como texto en la cruce; el resolver los computa JIT. Perderlos como
mecanismo vivo = vuelve el robot (fix 2026-07-11):

- `{EDAD_X_NIVEL:reglas_universales_filtradas}` → se computa desde la tabla `conversation_rules`
  (gating por edad/nivel) + reenumeración. Si se guardara el texto filtrado en 28 filas, las reglas
  dejarían de ser universales (28 copias que driftan).
- `{EDAD:estilo_de_sesion}` → catálogo de enfoques por edad + **rotación por semilla** (hoy
  `lesson_approaches`, ~10 estilos). Un texto fijo por edad mata la variedad entre clases.
- `{EDAD:anclas_narrativas}` → OJO scope: hoy las anclas (Role/Setting/Mission) salen del TÓPICO
  (`topics.narrative_*`) interpoladas + semilla. Deben seguir siendo del tópico; el placeholder
  correcto es `{TOPICO:anclas_narrativas}` o computado tópico+semilla.
- HISTORIA (M3, `learner_state`) y `output_rules` (voz/ASR/safety de runtime) no tienen lugar en el
  template → bloques computados opcionales que el resolver apila al final (si vacío, se omiten, igual
  que hoy).
- **Recency:** el orden del template pasa a ser una decisión editable. Mantener
  `rules_of_engagement`/leyes cerca del final (hoy el composer lo hace a propósito: "cerca del
  final (recency)").

### 1.4 El visor sale GRATIS

El breakdown de `/admin/motor` (fuente + dueño por campo) se genera parseando el MISMO template
(dueño = prefijo). Muere `_resolve_v2_breakdown_sync` (~150 líneas duplicadas que hoy pueden
driftar del composer real).

---

## 2. Modelo de datos (F1 lo afina; esto es el borrador)

1. **`orchestration_templates`** `(id, name, body TEXT, active)` — 1 activo; versionable;
   rollback = activar el anterior. Editable desde ABM sin deploy.
2. **`age_level_matrix`** `(age_slug FK, level_code FK, produccion_esperada, formato_cierre_turno,
   reglas_tono_entrega, pasos_sesion, comando_arranque, accion_continuacion, accion_cierre)` —
   PK compuesta `(age_slug, level_code)`. 7 campos de texto curado por cruce.
3. **`conversation_rules`** `(id, slug, rule_text, age_groups JSON NULL=todas, min_level,
   max_level, sort_order, active)` — reemplaza el blob `universal_conversation_rules` + los
   `target_ids` hardcodeados. Semilla: las 12 reglas sobrevivientes de la curación (con la #16
   también en Bloque B). Alta de regla nueva = INSERT, cero deploy.
4. **`student_types` / `levels` / `topics`**: la ESTRUCTURA queda. Los TEXTOS de `student_types`
   se re-curan en la semilla: `{tutor}` en vez de "HABI" literal, dedup tonal/form (una sola
   residencia), muere la frase "punitivamente" de `mini.pedagogy`.
5. **Muere:** `app_config.universal_conversation_rules` (blob), `target_ids` en el composer,
   `_resolve_v2_breakdown_sync`, y el snapshot viejo `data/catalogo/app_config.json`
   (HOY es una trampa: `clean_universal_rules_db.py` restauraría el blob contaminado).

**GATE del dueño (decisión de F1):** `age_level_matrix` ¿28 filas explícitas (7×28 = 196 textos)
o **sparse con herencia declarada** (la fila-cruce solo existe donde el cruce difiere del eje;
NULL → el resolver toma el default del eje y lo dice en el visor)? Recomendación de Fable: sparse —
menos superficie de curación (~60-80 textos), menos drift; la herencia es explícita, no un
fallback silencioso.

---

## 3. La semilla (F2 — el JSON canónico)

- **Un solo JSON**: `data/catalogo/orquestacion_placeholders.json` con: template + `conversation_rules`
  gateadas + `age_level_matrix` + re-cura de textos de `student_types`.
- **Base:** el JSON de cruces que generó Gemini (lo aporta el dueño) + el dato curado que YA existe
  en la BD (no se inventa de cero; se transforma y depura).
- **Tópicos:** NO entran en la semilla — los 94 ya están curados en `topics`; el template solo los
  referencia vía `{TOPICO:...}`.
- **Script:** patrón establecido dry-run → diff visible → backup JSON → `--apply`.
- **GATE del dueño:** revisión de los textos curados ANTES de aplicar (su juicio pedagógico es la vara).

---

## 4. Fases y WOs (ruteo estándar de modelos — protocolo 13, §7)

| Fase | WO | Modelo | Entregable | Estado |
|---|---|---|---|---|
| **F0** Baseline | Linter 28 cruces + crudo guardado | Fable | `00-baseline-linter-2026-07-16.txt` (76 issues) | **HECHO** |
| **F1** Diseño de datos | DDL final de las 3 tablas + contrato del resolver (gramática de placeholders, computados, fail-fast, recency) + decisión sparse/explícito (GATE dueño) | Opus + thinking | `02-diseno-datos.md` + borrador Alembic | pendiente |
| **F2** Curación de la semilla | Textos de `age_level_matrix` (base: JSON de Gemini) + re-cura `student_types` + `conversation_rules` gateadas + template final. GATE dueño: OK a los textos | Opus + thinking | `data/catalogo/orquestacion_placeholders.json` + `03-semilla.md` | pendiente |
| **F3** Resolver + visor | `services/orchestration_resolver.py` + tests del parser + visor from-template + entradas ABM. Entra por la MISMA firma que `compose_proto_prompt` (`gemini_live` NO se toca) | Sonnet | código + tests verdes | pendiente |
| **F4** Migración + seed | Alembic (autoría de la app; Infra promueve — doc 10) + semilla con backup + re-snapshot de `data/catalogo/` | Opus (mecánico → Sonnet) | BD migrada y semillada | pendiente |
| **F5** Validación y corte | Linter DESPUÉS (objetivo: 0 contradiction/language_clash; **2 corridas** por estocasticidad) + `smoke_prompt_invariants` + push a main + verificación en `/admin/motor` + circuito 5×4 por voz (dueño) | Sonnet | reporte antes/después | pendiente |

**Reglas globales para los WOs (no negociables):**
- 1 WO = 1 sesión. El implementador NO re-analiza: lee este plan y ejecuta su WO.
- Nada se escribe en BD sin dry-run + backup. Nada se prueba en local: push → deploy continuo →
  ambiente real (`/admin/motor` es el probador oficial de cruces).
- El linter es el gate de regresión de prompts antes/después de CADA cambio de catálogo. Mejora
  pendiente en F3: el linter hoy descarta `redundancy` del tally (línea 111) — incluirla en el
  reporte (la redundancia tonal/form fue un hallazgo real del baseline).
- Anti-goals vigentes: NO persistir orquestaciones generadas · NO if/parche en el resolver ·
  NO curar por fuera de la semilla · NO seeds a ciegas.

---

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Juez LLM estocástico (1 corrida miente) | Gate F5 con 2 corridas del linter; la vara final es el micrófono (5×4) |
| Perder rotación por semilla / filtro JIT al "aplanar" a texto | Placeholders computados (§1.3), nunca texto fijo |
| Recency: leyes muy arriba → el modelo las pisa | Orden del template revisado en F1; leyes cerca del final |
| Curación de cruces se vuelve inmantenible (196 textos) | GATE F1: sparse + herencia declarada (recomendado) |
| Anclas narrativas pierden el sabor del tópico | Scope corregido: `TOPICO`, no `EDAD` (§1.3) |
| Transición rompe producción | El resolver entra por la MISMA firma; revert del commit = rollback completo (deploy continuo) |
| `clean_universal_rules_db.py` re-contamina | F4 re-snapshotea `data/catalogo/` y jubila el script viejo |

---

## 6. Qué absorbe este plan (pendientes previos que dejan de ser tareas sueltas)

- Frase "punitivamente" en `mini.pedagogy` → muere en la re-cura de F2.
- Regla 16 ausente en Bloque B → gating por dato en `conversation_rules` (F2).
- Drift `data/catalogo/app_config.json` → re-snapshot en F4.
- Fail-open de `lesson_approaches` → el resolver computado hace fail-fast (F3).
- Duplicado tonal/form + "HABI" literal → dedup + `{tutor}` en F2.

# F1 — Diseño de datos: la orquestación como template + placeholders

**Fecha:** 2026-07-16 · **Fase:** F1 (Opus + thinking) · **Sucede a:** `01-plan-reingenieria.md` ·
**Entregable:** DDL de las 3 tablas + contrato del resolver + borrador Alembic + los gates del dueño.
**Método:** medido contra la BD real (Aiven), no supuesto. Dump: `backend/scripts/_f1_dump.py` (temporal).
**Estado:** F1 CERRADO — gates A y B resueltos por el dueño el 2026-07-16 (ver §6). Sigue F2 (curación).

---

## 0. Validación del método: qué mide realmente el baseline

Antes de diseñar, verifiqué que las 76 contradicciones se midieron sobre el motor REAL de voz y no
sobre un path muerto. Cadena confirmada leyendo el código:

```
detect_prompt_clashes.py → motor_engine.resolve_v2() → _resolve_v2_sync() → compose_proto_prompt()
```

`compose_proto_prompt` es el mismo path que producción de voz (`gemini_live → build_super_prompt →
compose_proto`, motor_engine.py:139). **El baseline es válido: mide el prompt que escucha el alumno.**

Nota de método para F3: `_resolve_v2_breakdown_sync` (motor_engine.py:258-406) re-implementa la lógica
del composer SOLO para el visor de `/admin/motor`, y al final (línea 397) igual llama `_resolve_v2_sync`
para el prompt real. O sea el visor ya tiene dos verdades conviviendo (los "steps" reconstruidos + el
prompt real). Muere en F3, como dice el plan.

---

## 1. Anatomía de las 76 contradicciones (6 familias, con el campo real que las produce)

No son 76 bugs sueltos: son 6 patrones. Agruparlos define qué resuelve el modelo de datos y qué no.

| # | Familia | Qué es (ejemplo del baseline) | De dónde sale (dato REAL) | ¿Lo cura el nuevo modelo de datos? |
|---|---|---|---|---|
| **1** | **Language clash sistémico** (~30 language_clash + varias contradiction) | A0 `language_rule`="100% ESPAÑOL, nunca traduzcas" vs `Language_Consistency_Rule`="responde 100% en inglés, traducí todo al vuelo" | El `Language_Consistency_Rule` está **hardcodeado en inglés** en `composer_proto._get_behavioral_guards` (línea 186), SIEMPRE, en todos los niveles. No es dato. | **NO por sí solo** — hay que SACAR el hardcode del resolver (§4). |
| **2** | **Cruces edad×nivel imposibles** (mini-C1/C2, junior-C1/C2, mini-B2… ≈15 issues) | "Mini (4-7)" + `expected_production` C2="mantené un debate profesional, par intelectual nativo" | `expected_production` y el CTA viven SOLO en `levels` (eje nivel), **agnósticos de edad**. El motor genera los 28 cruces aunque no existan. | **SÍ** — `age_level_matrix` + combos válidos (Gate A). |
| **3** | **Contradicción DENTRO de un mismo campo** (empotramiento) | A0: "producí la frase-puente completa" **+** "la palabra suelta es ÉXITO TOTAL, nunca pidas la frase" **+** "invitá a repetir la frase completa" — las 3 en el MISMO campo | `levels.expected_production` empaqueta `Expected_Production` + `Acceptance_Rule` + `Call_to_Action_Format` como texto pegado. Un campo, 3 políticas que chocan. | **SÍ habilita** (separa en campos discretos); la coherencia la pone la curación F2. |
| **4** | **Ley universal vs CTA de nivel/edad** | Regla universal 1 "keep the lesson structure invisible" vs B1 `Call_to_Action`="Finaliza SIEMPRE con un reto numerado ('Challenge 1, ready?')" y A2 "Closing: '¡Misión completa!'" | CTA horneado en `levels.expected_production` / `student_types.closing_seed` contradice el blob `universal_conversation_rules`. | **SÍ habilita** (`conversation_rules` gateadas + cierre curado); coherencia = F2. |
| **5** | **Duplicación + literales sin resolver** | `tutor_tonal_rules` == `form_rules` idénticos (teen, adult); "HABI" literal en `session_focus` cuando el coach es Alex; **"X" literal** en los rails ("cada beat avanza el X") | `student_types` (tonal==form), "HABI" hardcodeado en unos campos y `{tutor}` en otros; `app_config.session_rails.default` tiene la "X" rota. | **SÍ habilita** (una sola residencia + `{tutor}` en todos); dedup = F2. |
| **6** | **Pausas / fonética ambiguas** | tonal "PAUSAS LARGAS marcadas" vs opening "sin textos de pausa como 'PAUSA LARGA'"; "El español es la base" ambiguo vs "inglés nativo" | `student_types.tutor_tonal_rules` / `form_rules` / `opening_seed` — instrucciones que se pisan. | **NO estructural** — es re-redacción (F2). |

**Lectura:** el modelo de datos resuelve/habilita las familias 2, 3, 4, 5. La familia 1 (la más grande)
la resuelve el **resolver** (matar el hardcode), no las tablas. La familia 6 es curación pura (F2).

---

## 2. La conclusión que reordena el borrador del plan (afinamiento F1)

El plan 01 marcó "F1 lo afina". Con el dato real, tres correcciones al borrador:

### 2.1 Solo 2 de los 7 campos de `age_level_matrix` son cruce REAL

Test de la ley de asignación (¿cambia con EDAD? ¿con NIVEL?) aplicado al dato de hoy:

| Campo propuesto por el plan | ¿Varía con edad? | ¿Varía con nivel? | Residencia correcta |
|---|---|---|---|
| `produccion_esperada` | Sí (mini no "argumenta") | Sí (A0 palabra vs C1 debate) | **`age_level_matrix`** (cruce real) |
| `formato_cierre_turno` (CTA) | Sí | Sí (reto numerado B1 vs pregunta cerrada A2) | **`age_level_matrix`** (cruce real) |
| `reglas_tono_entrega` (form_rules) | Sí | **No** (el tono "cuentacuentos" de mini es igual en A0 y A2) | `student_types` (eje EDAD) |
| `pasos_sesion` (rails) | Sí | **No** (los beats son por edad) | eje EDAD |
| `comando_arranque` (opening) | Sí | Solo el **idioma** | eje EDAD + idioma del nivel |
| `accion_continuacion` | Sí | Solo el **idioma** | eje EDAD + idioma del nivel |
| `accion_cierre` (closing) | Sí | Solo el **idioma** | eje EDAD + idioma del nivel |

Meter los 5 campos de eje-edad en 28 filas = duplicar 7× algo que es por-edad = **el drift que queremos
matar**. La matriz debe tener **2 columnas núcleo** (produccion + cierre-de-turno); el resto vive en su eje.

### 2.2 Lo que SÍ cruza en esos 5 campos es el IDIOMA, no el texto

`closing_seed` (adult) dice literal "'Buen trabajo hoy. ¿Seguimos un poco más…?'" — español fijo. En
adult-B2 ("100% inglés. Sin español") eso es un clash garantizado (y aparece en el baseline en adult-A2,
B2, C1; teen-A2, C2). El opening/closing/continuation están escritos en **español fijo por edad** y no
respetan el idioma del nivel. El parche actual (`Language_Consistency_Rule` "traducí al vuelo") es el
generador #1 de clashes. **El idioma tiene que salir de una sola fuente limpia: `{NIVEL:idioma_instruccion}`,
y el resolver NO debe inyectar un contra-mandato hardcodeado.** (Detalle en §4.3.)

### 2.3 Ya existe un mapa de combos válidos sin usar: `band_allowed_levels`

La BD tiene `age_band` + `band_allowed_levels` (una taxonomía paralela, `source='proposed'`, que el motor
v2 ignora). Codifica exactamente "qué niveles ofrece cada edad": early_child→[A0,A1], child→[A0..B1],
teen→[A1..B2], adult→[A0..C2]. **Un mini nunca está en C2.** Si el probador y el sequencer respetan un
mapa así, la familia 2 entera (cruces imposibles) **deja de generarse**. Es material del Gate A — la
taxonomía no alinea 1:1 con `student_types`, así que el rango real por edad es juicio del dueño, no un
copy del `band_allowed_levels` viejo.

> Bonus para F2: `band_policy` / `level_policy` (17+17 filas: feedback, motivation, turn_length,
> hint_policy, error_policy, modeling_protocol por banda y por nivel) contienen curación pedagógica rica
> y coherente que el motor v2 hoy **no lee**. Es insumo de primera para redactar `conversation_rules`
> gateadas y los textos del cruce en F2 — no se inventa de cero.

---

## 3. Modelo de datos destino (DDL)

### 3.1 `orchestration_templates` — la FORMA como dato

```sql
CREATE TABLE orchestration_templates (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80) NOT NULL,
  body       TEXT NOT NULL,           -- el XML con placeholders {PREFIJO:campo}
  active     TINYINT(1) NOT NULL DEFAULT 0,
  notes      VARCHAR(300) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_name (name)
);
-- invariante: exactamente 1 activo. rollback = UPDATE active (sin deploy). versionar = INSERT nuevo.
```

### 3.2 `age_level_matrix` — SOLO el cruce real (núcleo 2 columnas, sparse-ready)

```sql
CREATE TABLE age_level_matrix (
  age_slug            VARCHAR(20) NOT NULL,   -- FK lógica student_types.slug
  level_code          VARCHAR(4)  NOT NULL,   -- FK lógica levels.code
  -- núcleo (cruce genuino edad × nivel):
  produccion_esperada     TEXT NOT NULL,      -- qué produce el alumno ESTE cruce
  formato_cierre_turno    TEXT NOT NULL,      -- cómo cierra el turno el coach (ex Call_to_Action_Format)
  aceptacion              TEXT NULL,          -- (ex Acceptance_Rule) qué cuenta como éxito; NULL = sin regla especial
  -- overrides sparse OPCIONALES de campos-de-eje, solo donde el cruce difiere del default:
  override_form_rules     TEXT NULL,
  override_rails          TEXT NULL,
  active              TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (age_slug, level_code)
);
```

- **PK compuesta** `(age_slug, level_code)`. Existe una fila SOLO por cada cruce **válido** (Gate A) —
  no las 28 a ciegas. **La existencia de la fila define el combo válido**: el probador y el sequencer
  consultan `SELECT level_code FROM age_level_matrix WHERE age_slug=? AND active=1` para saber qué
  niveles ofrece cada edad. Sin tabla de "combos válidos" aparte.
- Núcleo = `produccion_esperada` + `formato_cierre_turno` (+ `aceptacion`). Esto separa las 3 políticas
  hoy empotradas en `levels.expected_production` → mata la familia 3 por construcción.
- `override_*` son la vía sparse (Gate B): normalmente NULL → el resolver toma el default del eje EDAD y
  lo declara en el visor. Se llenan solo en el cruce excepcional.

### 3.3 `conversation_rules` — reemplaza el blob + los `target_ids` hardcodeados

```sql
CREATE TABLE conversation_rules (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(60) NOT NULL,           -- 'invisible_structure', 'recast_only', 'echo_protocol'...
  rule_text   TEXT NOT NULL,
  age_groups  JSON NULL,                      -- ['mini','junior'] · NULL = todas las edades
  min_level   VARCHAR(4) NULL,                -- 'A0' · NULL = sin piso
  max_level   VARCHAR(4) NULL,                -- 'A1' · NULL = sin techo
  sort_order  INT NOT NULL DEFAULT 0,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_slug (slug)
);
```

- Reemplaza el gating hoy hardcodeado en `composer_proto._get_universal_rules` (líneas 232-235:
  `target_ids = [2,3,10,12,14,16]` para Bloque A, `[1,4,5,9,10,13,14,15]` para Bloque B). Ese gating
  pasa a ser **dato** (age_groups + min/max_level). Alta de regla = INSERT, cero deploy.
- Semilla F2: las 12 reglas sobrevivientes del blob (numeradas 1,2,3,4,5,9,10,12,13,14,15,16 — con huecos).
  El gating por dato reemplaza la reenumeración manual. La regla `echo_protocol` (hoy #12: "Decí conmigo:
  {word}" en native language) queda gateada a `max_level='A1'` para no chocar con niveles altos (era el
  clash de mini-B1/C1/C2).

### 3.4 Qué muere en F4/F3

- `app_config.universal_conversation_rules` (blob) → `conversation_rules`.
- `composer_proto._get_universal_rules` + los `target_ids` hardcodeados → gating por dato.
- `motor_engine._resolve_v2_breakdown_sync` (~150 líneas) → el visor se parsea del template (§4.4).
- El `Language_Consistency_Rule` hardcodeado (composer:186) → §4.3.
- El snapshot `data/catalogo/app_config.json` (trampa de re-contaminación) → re-snapshot en F4.
- `levels.expected_production` deja de empotrar Acceptance/CTA → queda solo el objetivo lingüístico puro
  (o se vacía y el dato migra a `age_level_matrix`; decisión de F2/F4).

---

## 4. Contrato del resolver genérico (para F3)

El motor queda REDUCIDO a: parsear template → resolver cada placeholder por su PREFIJO → interpolar
anidado → fail-fast → apilar bloques computados opcionales. Cero pedagogía en el código.

### 4.1 Gramática de placeholders

- Sintaxis: `{PREFIJO:campo}`. El PREFIJO declara el DUEÑO del dato = la ley de asignación hecha sintaxis.
- Prefijos y fuente:

  | Prefijo | Fuente | Resolución |
  |---|---|---|
  | `STATIC` | runtime (fecha, device) | directo |
  | `ALUMNO` | `users` | directo |
  | `EDAD` | `student_types` (slug del alumno) | directo |
  | `NIVEL` | `levels` (code del alumno) | directo |
  | `TOPICO` | `topics` (94 curados — NO se re-curan) | directo |
  | `EDAD_X_NIVEL` | `age_level_matrix` PK (age_slug, level_code) | directo, con **herencia** (§4.2) |
  | computado | funciones registradas por nombre | §4.3 |

### 4.2 Herencia sparse (resuelve el Gate B lado técnico)

Para un `{EDAD_X_NIVEL:campo}`:
1. Buscar la fila `(age_slug, level_code)`. Si el campo núcleo (`produccion_esperada`,
   `formato_cierre_turno`) está vacío → **`MotorDataMissing`** (fail-fast: el cruce válido debe tener su núcleo).
2. Para un campo con `override_*`: si el override es NULL → tomar el default del eje EDAD
   (`student_types`) y **marcar en el visor "heredado de EDAD"** (herencia explícita, no fallback silencioso).

### 4.3 Placeholders computados (acá viven los mecanismos anti-robot — NO texto fijo)

El resolver los computa JIT; perderlos como mecanismo vivo = vuelve el robot (fix 2026-07-11):

- `{EDAD_X_NIVEL:reglas_universales_filtradas}` → se computa desde `conversation_rules` (gating por
  age_groups + min/max_level) + reenumeración. **No** se guarda el texto filtrado en 28 filas (driftaría).
- `{EDAD:estilo_de_sesion}` → catálogo `lesson_approaches` gateado por edad + **rotación por semilla**
  (`_pick`/`_derive`, hoy en composer). Texto fijo por edad mata la variedad → prohibido.
- `{TOPICO:anclas_narrativas}` → Role/Setting/Mission salen del TÓPICO (`topics.narrative_*`)
  interpoladas + semilla. **Scope corregido del plan: `TOPICO`, no `EDAD`.**
- **IDIOMA (clave, §2.2):** el resolver NO inyecta ningún `Language_Consistency_Rule` hardcodeado. El
  idioma sale ÚNICO de `{NIVEL:idioma_instruccion}`. Si hace falta una regla de consistencia, es un
  computado `{NIVEL:regla_consistencia_idioma}` que RESPETA el idioma del nivel (en A0 dice "hablás en
  español salvo la palabra objetivo"; en B2 dice "100% inglés"), no un contra-mandato fijo en inglés.
- HISTORIA (`learner_state`, M3) y `output_rules` (voz/ASR/safety) → bloques computados opcionales que se
  apilan al final; si vacío se omiten (igual que hoy).
- **Recency:** el orden del template es editable. Leyes/idioma cerca del final (el composer hoy lo hace a
  propósito: "cerca del final (recency)", línea 584). Mantenerlo.

### 4.4 El visor sale gratis

El breakdown de `/admin/motor` (fuente + dueño por campo) se genera parseando el MISMO template: el dueño
es el PREFIJO de cada placeholder. Muere `_resolve_v2_breakdown_sync`.

### 4.5 Firma (no romper producción)

El resolver entra por la MISMA firma que `compose_proto_prompt` (mismos kwargs: user, topic, level_data,
student_type_data, app_config, learner_state, session_seed…). `gemini_live → build_super_prompt` NO se
toca. Rollback = revert del commit (deploy continuo).

---

## 5. Mapeo campo actual → destino (insumo de la migración F4)

| Hoy (tabla.campo) | Contenido real | Destino |
|---|---|---|
| `levels.expected_production` (parte 1) | "El alumno debe producir…" | `age_level_matrix.produccion_esperada` (por cruce) |
| `levels.expected_production` (Acceptance_Rule) | "la palabra suelta es éxito total…" | `age_level_matrix.aceptacion` |
| `levels.expected_production` (Call_to_Action_Format) | "Finaliza con reto numerado…" | `age_level_matrix.formato_cierre_turno` |
| `levels.language_rule` | "100% ESPAÑOL" / "100% inglés" | `{NIVEL:idioma_instruccion}` (queda en `levels`) |
| `levels.curriculum_grammar` | gramática objetivo | `{NIVEL:gramatica_objetivo}` (queda) |
| `student_types.form_rules` | tono/entrega por edad | `{EDAD:reglas_de_tono_y_entrega}` (dedup con tonal) |
| `student_types.tutor_tonal_rules` | == form_rules (duplicado) | **una sola residencia** (F2 decide cuál) |
| `student_types.opening_seed` | arranque (español fijo) | `{EDAD:comando_de_arranque}` + idioma del nivel |
| `student_types.continuation_seed` | turno | `{EDAD:accion_de_continuacion}` |
| `student_types.closing_seed` | cierre (frase ES fija) | `{EDAD:accion_de_cierre}` + idioma del nivel |
| `student_types.session_focus` | "HABI y el chico…" | `{EDAD:gamification_focus}` (reemplazar "HABI"→`{tutor}`) |
| `app_config.universal_conversation_rules` | blob 12 reglas | `conversation_rules` (gateadas) |
| `app_config.session_rails` | beats por banda (+"X" rota) | `{EDAD:pasos_de_la_sesion}` (arreglar "X") |
| `app_config.lesson_approaches` | ~7 estilos | computado `{EDAD:estilo_de_sesion}` + semilla |
| `topics.narrative_*` | Role/Setting/Mission | computado `{TOPICO:anclas_narrativas}` |
| `Language_Consistency_Rule` (hardcode composer:186) | contra-mandato inglés | **eliminar** (§4.3) |

---

## 6. Gates del dueño — RESUELTOS (2026-07-16, cierran F1)

### Gate A — combos válidos → **SÍ, rango por edad** (decisión del dueño)

Se limita lo que el motor genera al rango real de niveles por edad. **Mecanismo (sin tabla extra): la
EXISTENCIA de la fila `(age_slug, level_code)` en `age_level_matrix` ES el combo válido.** El probador
`/admin/motor` y el sequencer preguntan "qué filas existen para esta edad" → ese es el rango ofrecido.
Un cruce sin fila núcleo no se genera. → la familia 2 desaparece de raíz.

**Rango inicial propuesto** (juicio pedagógico del dueño; marcado *ajustable* — se afina en la carga F2):

| Edad | Niveles ofrecidos | Cruces |
|---|---|---|
| mini (4-7) | A0, A1, A2 | 3 |
| junior (8-12) | A0, A1, A2, B1 | 4 |
| teen (13-17) | A1, A2, B1, B2 | 4 |
| adult (18+) | A0, A1, A2, B1, B2, C1, C2 | 7 |

**18 cruces válidos** (vs 28). Elimina los 10 imposibles (mini-B1/B2/C1/C2, junior-B2/C1/C2, teen-A0/C1/C2),
que incluyen los peores del baseline (mini-C1/C2, junior-C1 = 6 issues c/u).

### Gate B — poblado → **Sparse + herencia** (decisión del dueño)

`age_level_matrix` = 2 columnas núcleo (`produccion_esperada` + `formato_cierre_turno`, + `aceptacion`
donde aplique) pobladas por cruce válido → **~18 filas × 2-3 textos ≈ 40-54 textos curados**. Tono/pasos/
arranque/continuación/cierre viven por EDAD (`student_types`); el idioma sale de `{NIVEL:idioma_instruccion}`
+ la regla de consistencia computada por nivel (§4.3). `override_*` solo donde un cruce difiera del eje
(esperado: casi nunca). El DDL de §3.2 ya está en esta forma.

---

## 7. Borrador Alembic (F4 lo finaliza; aditivo, no pisa nada)

```python
"""f1_orchestration_placeholders: templates + age_level_matrix + conversation_rules"""
def upgrade():
    op.create_table('orchestration_templates',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(80), nullable=False, unique=True),
        sa.Column('body', sa.Text, nullable=False),
        sa.Column('active', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('notes', sa.String(300)),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()))
    op.create_table('age_level_matrix',
        sa.Column('age_slug', sa.String(20), nullable=False),
        sa.Column('level_code', sa.String(4), nullable=False),
        sa.Column('produccion_esperada', sa.Text, nullable=False),
        sa.Column('formato_cierre_turno', sa.Text, nullable=False),
        sa.Column('aceptacion', sa.Text),
        sa.Column('override_form_rules', sa.Text),
        sa.Column('override_rails', sa.Text),
        sa.Column('active', sa.Boolean, nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('age_slug', 'level_code'))
    op.create_table('conversation_rules',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('slug', sa.String(60), nullable=False, unique=True),
        sa.Column('rule_text', sa.Text, nullable=False),
        sa.Column('age_groups', sa.JSON),
        sa.Column('min_level', sa.String(4)),
        sa.Column('max_level', sa.String(4)),
        sa.Column('sort_order', sa.Integer, nullable=False, server_default='0'),
        sa.Column('active', sa.Boolean, nullable=False, server_default='1'))

def downgrade():
    op.drop_table('conversation_rules')
    op.drop_table('age_level_matrix')
    op.drop_table('orchestration_templates')
```

Aditivo: las tablas nuevas no pisan `levels`/`student_types`/`app_config`, que quedan intactas hasta que
F5 valide y F4 re-snapshotee. Rollback nivel 2 del plan (F4 aditiva) cubierto.

---

## 8. Handoff a F2 / F3

- **F2 (curación):** con el Gate A/B resueltos, redactar `data/catalogo/orquestacion_placeholders.json`
  = template final + `age_level_matrix` (base: JSON de Gemini del dueño + `band_policy`/`level_policy`
  como insumo) + `conversation_rules` gateadas + re-cura de `student_types` (dedup tonal/form, `{tutor}`
  en vez de "HABI", muere "punitivamente" en mini.pedagogy, arreglar "X" de los rails). Resolver la
  contradicción de la familia 3, no solo separarla. GATE dueño: OK a los textos.
- **F3 (resolver):** `services/orchestration_resolver.py` por la firma de §4.5; **matar el hardcode de
  idioma (familia 1)**; visor from-template; incluir `redundancy` en el tally del linter (hoy la descarta,
  línea 111). Tests del parser.
- **Regla dura:** el linter es el gate de regresión antes/después de CADA cambio. Objetivo F5: 0
  contradiction/language_clash en 2 corridas + circuito 5×4 por voz.
```

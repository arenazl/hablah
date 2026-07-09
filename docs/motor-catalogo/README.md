# motor-catalogo

Snapshot del motor + catálogo (2026-07-08) para analizar por fuera y madurar el modelo. Perfiles
**vacíos** (la app todavía no acumula historia/learn_state). Motor retratado: **v2 = compose_proto**
(el de producción).

## Archivos

- **[02-filosofia-del-motor.md](02-filosofia-del-motor.md)** — cómo funciona el motor HOY y su
  filosofía (los 3 pilares, los 9 pasos, tópico liviano, fail-fast). **Empezar acá.**
- **[01-topicos-contenido-por-cruce.md](01-topicos-contenido-por-cruce.md)** — el eje TÓPICO: qué
  tópico va a cada edad/nivel + su contenido (semilla).
- **[orquestaciones/agnosticas/](orquestaciones/agnosticas/)** — el prompt de 9 pasos por cruce
  **edad × nivel** (16), con el tópico como PLACEHOLDER. Es el **marco pedagógico puro** — para
  analizar las reglas del cruce sin ruido de vocabulario.
- **[orquestaciones/topic-builtin/](orquestaciones/topic-builtin/)** — el mismo prompt con un tópico
  REPRESENTATIVO enchufado, **1 por celda edad × nivel** (16, mismo criterio que `agnosticas/`). Para
  ver el marco "lleno". _Per-tópico NO se hace a propósito: el motor no decide nada por tópico — solo
  cambia el bloque de vocab; hacerlo por tópico daría cientos de archivos idénticos (ver §4 y §10 de la
  filosofía)._

## Clave para leer

La orquestación la define **edad × nivel**; el **tópico solo enchufa** el bloque de vocabulario + 2
placeholders del arranque. Por eso la versión agnóstica alcanza para analizar las reglas pedagógicas,
y la topic-builtin sirve para ver el resultado concreto. (Detalle en la filosofía.)

## Campos de `topics`: vivos vs. fósiles (WO F0-05, 2026-07-09)

El motor de producción (`composer_proto.py`, v2) es fail-fast y solo lee un subconjunto chico de
columnas de `topics`. El resto existe en la tabla por generaciones previas del catálogo, pero no
llega nunca al prompt. Verificado leyendo `services/composer_proto.py` (función `_get_vocabulary`)
contra el snapshot real (`data/catalogo/topics.json`, 94 activos / 170 filas totales):

**VIVOS (el composer/la selección de tópico los usa de verdad):**

- `title` — nombre que entra al bloque `current_lesson_vocabulary`.
- `levels` — filtra qué niveles CEFR puede servir el tópico.
- `category` — organización del catálogo (UI de selección).
- `segmento` — filtro mini/junior/tween/adultos (a quién le sirve el tópico).
- `keywords[:6]` — **solo las primeras 6** entran al bloque `Words` cuando no hay
  `pinned_vocabulary`. `keywords[6:]` está cargado en varios tópicos y jamás llega al prompt (no es
  fósil — SÍ se lee — pero cualquier entrada más allá de la 6ª es dato muerto en la práctica).
- `generated_vocab` — frases-ancla (`Target_Phrases`); con `vocab_depth=basic` (A0-A2) solo se usa
  la primera.
- `is_active` — filtro de selección (94 de 170 filas).
- `kid_age_group`, `audience` — filtro etario (aplica junto con `segmento`).
- `pinned_vocabulary` — **vivo en código** (prioridad más alta que `keywords`, ver
  `composer_proto.py` línea ~128) pero **sin datos hoy**: 0 de los 94 tópicos activos lo tienen
  poblado. Es el canal para tópicos `is_curriculum` (vocab pinneado de kids A0) — hoy no hay
  ninguno activo.

**FÓSIL confirmado:**

- `seed_prompts` — hasta ~12 KB por tópico en 88/94 activos. Tiene escritores vivos (endpoint de
  generación IA en `api/topics.py`, `onboarding.py` lo inicializa en `{}`) pero **ningún lector**:
  `composer_proto.py` nunca lo toca. Comentado en `backend/models/template.py` como `# FOSIL`, sin
  borrar la columna ni el dato.

**No fósiles pero fuera del prompt** (tienen callers vivos en `api/catalog.py`, `api/topics.py`,
`api/kids.py` — sirven la UI/onboarding, no el motor): `is_hot`, `usage_count`, `category_id`,
`subcategory_id`, `appropriate_bands`, `is_curriculum`, `target_structure(_es)`,
`mastery_criteria`. No se tocan en este WO.

## Snapshot versionado del catálogo (WO F0-05)

`backend/scripts/snapshot_catalogo.py` exporta `student_types`, `levels`, `topics` y `app_config`
(READ-ONLY) a `data/catalogo/*.json` — orden estable por id/clave natural, claves ordenadas, UTF-8.
El diff de `git diff data/catalogo/` ES el diff real del dato. Correrlo y commitear después de
CUALQUIER cambio de catálogo (regla también en `backend/scripts/README.md`).

# `backend/scripts/` — inventario (WO F0-02)

> `backend/scripts/` tenía ~213 archivos (`.py` + `.json` de backup) acumulados de generaciones
> distintas del proyecto. La mayoría eran migraciones ya aplicadas, seeds que pisan dato sano, o
> herramientas de investigaciones ya cerradas. Se archivaron en **`_attic/`** (no se borró nada —
> `git mv`, historia intacta). Acá abajo queda SOLO lo vivo/útil: **29 archivos** (28 scripts +
> `__init__.py`).
>
> Ver el detalle de qué se archivó y por qué en la sección final de este README, y el inventario
> de `backend/services/` en `docs/03-rework/_inventario-servicios.md`.

## Regla dura para CUALQUIER script nuevo que toque catálogo

Toda escritura a tablas de catálogo (`student_types`, `levels`, `topics`, `app_config`, y
equivalentes) va con el patrón: **dry-run por defecto → diff visible → backup JSON → recién con
`--apply` escribe.** Referencia viva: `apply_v3_topics.py`. Nunca escribir directo sin ese
circuito — un batch malo sin backup ya corrompió `student_types` una vez (2026-06-24).

**Cambiaste catálogo → corré `snapshot_catalogo.py` y commiteá `data/catalogo/`.** Es el paso
final de CUALQUIER cambio a `student_types`/`levels`/`topics`/`app_config` (aplicado el `--apply`
del script que corresponda): correr `python scripts/snapshot_catalogo.py` (desde `backend/`) y
commitear el JSON resultante. El diff de `git diff data/catalogo/` es el diff real del dato —
sin esto, un batch malo vuelve a corromper el catálogo sin rastro (WO F0-05).

## Catálogo / curación de tópicos (la curación v3 vigente, 94 tópicos activos)

- `snapshot_catalogo.py` — **(WO F0-05)** exporta `student_types`/`levels`/`topics`/`app_config`
  READ-ONLY a `data/catalogo/*.json` (orden estable, claves ordenadas, UTF-8). Correrlo después de
  cualquier `--apply` de catálogo y commitear el JSON (regla arriba). Verificado determinístico:
  2 corridas seguidas dan diff vacío.
- `inspect_topics_before_v3.py` — inspecciona el estado de `topics` antes de aplicar una
  curación nueva (read-only).
- `sanity_check_topics.py` — chequeos de sanidad post-curación (cobertura, duplicados, campos
  vacíos) contra la BD real (read-only).
- `diff_v3_topics.py` — diff entre el catálogo curado (doc `docs/motor-catalogo/*.md`) y lo que
  hay hoy en la tabla `topics` (read-only).
- `apply_v3_topics.py` — aplica el diff a la BD. Patrón de referencia del dry-run/backup/`--apply`
  para TODO script futuro que toque catálogo.

## Validación pedagógica (la vara oficial)

- `validar_cambio.py` — circuito de validación 5×4 (5 muestreos × historia 0→1→2→3) por
  nivel/tópico; es la vara oficial para cualquier cambio de dato pedagógico (ver memoria del
  proyecto: "Circuito de validación 5×4").

## Voz / infra (tuneo y diagnóstico de VAD, latencia, turn-taking)

- `tune_turntaking.py` — harness de tuneo de turn-taking / cortes de voz.
- `infra_sweep.py` — sweep de knobs de VAD (silence_ms, thinking budget) contra Heroku con habla
  real; persiste en `infra_test_result` (se ve en `/lab/infra`).
- `test_infra_real.py` — smoke E2E contra la infra real (corre en Heroku): sessions/start + WS de
  voz real, mide latencia por turno.
- `test_vertex_live_direct.py` — test E2E directo contra Vertex Live API (sin pasar por Habláh);
  3 escenarios de silencio/turn-end para verificar el fix de turn-end fantasma.
- `test_voices.py` — chequeo rápido de qué voces prebuilt acepta el modelo Live vigente
  (`GEMINI_LIVE_MODEL`). Útil cada vez que Google cambia de modelo.

## Setup de entorno / DB

- `create_database.py` — crea la base en Aiven si no existe. Correr una sola vez al armar un
  entorno nuevo.
- `init_db.py` — crea las tablas (`Base.metadata`) + seedea el admin demo. Idempotente.
- `create_user_adhoc.py` — crea un usuario ad-hoc por CLI (`nombre, password, cefr`). Utilidad
  genérica de administración.
- `seed_quick_users.py` — crea los 3 usuarios de quick-login (`lucas`, `nico`, `coach`).
  Idempotente, no toca otros usuarios existentes.
- `seed_training_student.py` — crea "Lucas (demo)" con historia B1 ya empezada, para probar el
  panel `/lab/training` con progreso real.
- `reset_coach_defaults.py` — resetea los 3 templates (coach/sincerist/arcade) a sus valores
  default conservadores. Idempotente, seguro.

## Producción viva (dependencias reales — NO archivar nunca sin re-cablear el caller)

- `backfill_default_interests.py` — **dependencia de producción**: `api/users.py` importa
  `assign_default_interests` desde acá al crear un usuario nuevo (`from
  scripts.backfill_default_interests import ...`). Si se mueve, rompe el alta de usuarios.

## Mantenimiento del catálogo (utilidades puntuales)

- `borrar_topic.py` — borra tópico(s) por término en title/slug. Destructivo (no hay FK), usar
  con cuidado y a mano, nunca en batch automático.
- `download_noto_lotties.py` — descarga Lottie de Google Noto para vocab visual kids sin asset
  custom. Idempotente (solo baja lo que falta), reusar si se agrega vocab nuevo a
  `kids_visual_vocab`.

## Diagnóstico read-only

- `audit_motor_db.py` — audita qué le falta a la BD para que el motor de 9 pasos sea 100%
  funcional (cuenta filas/campos vacíos reales, no adivina).
- `audit_orphan_tables.py` — compara `information_schema.tables` contra los modelos ORM
  cargados; read-only salvo que se pase `--drop` (dropea huérfanas CON confirmación — no correr
  `--drop` sin revisar la lista antes).
- `verify_motor_engines.py` — verifica los 2 motores canónicos (`Motor-Learning/motor_prompt.py`
  + `motor_postclass.py`) contra la BD real (Aiven). Complementa a `sync_motor_core.py`.
- `test_all_topics.py` — recorre TODOS los tópicos activos × combos edad/nivel y arma el prompt
  fail-fast para cada uno; objetivo cero `MotorDataMissing`. Precursor manual del smoke
  automatizado que trae F1-03.

## Deploy

- `sync_motor_core.py` — copia `motor_prompt.py` + `motor_postclass.py` desde `Motor-Learning/`
  (repo hermano) a `backend/motor_core/` antes de cada push (Heroku solo deploya `backend/`).
  **Correr esto cuando se toquen los motores canónicos, antes de pushear.**

## Rollback / snapshot

- `snapshot_catalog.py` — snapshot histórico de las tablas-molde del motor v3
  (`age_band`, `level`, `tutor_identity`, `pedagogy`, `band_policy`, `behavioral_guard`,
  `trigger_template`, etc.) a la tabla `catalog_snapshot`, con `restore N`. **OJO:** es distinto
  de `snapshot_catalogo.py` (WO F0-05, listado arriba en "Catálogo / curación de tópicos") — ESE
  es el vigente para el catálogo de producción (`student_types`/`levels`/`topics`/`app_config` a
  JSON en `data/catalogo/`); este acá sigue siendo válido solo para las tablas del editor `/motor`.

## Smoke de producción

- `smoke_e2e.py` — smoke E2E contra `hablah.com.ar` + Heroku: login con los 3 quick-users, perfil,
  home, settings, CORS.
- `smoke_full.py` — smoke que cubre los 10 routers principales del backend en prod (idempotente:
  solo lecturas + una sesión descartable).

## Build

- `gen_pwa_icons.py` — genera los PNG del PWA (icon-192, icon-512, apple-touch-icon) desde el SVG
  mark, con PIL puro.

---

## Qué se archivó en `_attic/` y por qué (resumen por familia)

No se borró nada — todo sigue en `backend/scripts/_attic/`, recuperable con `git log --follow`.
Familias archivadas:

- **Migraciones ya aplicadas** (`migrate_v1.py` … `migrate_v30_*.py`, `migrate_kid_buddy.py`,
  `migrate_kids_topics_to_v3.py`, `migrate_methodology*.py`): el cambio de schema ya está en la
  BD viva; el script no tiene nada más que hacer.
- **Seeds peligrosos** (todos los `seed_*.py` salvo los 2 listados arriba): pisan/duplican dato
  ya curado (topics, levels, coaches, personalidades, etc.) sin el patrón dry-run/backup — correr
  cualquiera de estos hoy arruinaría la curación v3 vigente (94 tópicos).
- **Fixes de pedagogía ya aplicados** (`fix_pedagogy_iter1..6.py`, `fix_kids_pedagogy*.py`,
  `fix_a0_derobot.py`, `fix_tutor_adult.py`, `fix_v3_a0_rails.py`, `restore_a0_derobot.py`,
  `revert_to_iter5_best.py`): iteraciones de un loop de tuneo pedagógico ya cerrado
  (2026-06-23), superadas por la curación v3 y el circuito 5×4 actual (`validar_cambio.py`).
- **Curación de tópicos de generaciones previas** (`curar_topicos.py`,
  `clasificar_topicos_banda_nivel.py`, `poblar_topic_band_level.py`,
  `rebuild_topic_band_level.py`, `aplicar_combinaciones.py`, `apply_lever_andamiaje_a1.py`,
  `apply_lever_carrusel.py`, `apply_proposals.py`, `audit_pedagogico.py`,
  `reseed_keywords.py`, `gen_topic_vocab.py`, `gen_topic_ui_vocab.py`, `gen_kids_objectives.py`,
  `gen_kids_vocab_batch.py`, `generate_all_seeds_multilang.py`, `seed_kids_visual_vocab.py`,
  `regenerate_seeds_guided.py`, `sync_kid_langs.py`, `update_enfoque_ninos.py`,
  `update_riel_kids.py`): todas anteriores a la curación v3 (94 tópicos); re-correrlas
  sobreescribiría contenido curado con criterio viejo. `generate_all_seeds_multilang.py` además
  genera `seed_prompts`, un campo que `composer_proto` (el motor vivo) **no lee**.
- **Loop de evaluación por texto, superado** (`eval_profile.py`, `evaluate_vocab_quality.py`,
  `calibrar_juez.py`, `comparar_validar.py`, `compare_before_after.py`, `compare_prompt_audio.py`,
  `consolidar_cruce.py`, `cruce_alumnos.py`, `juez_cruce.py`, `juzgar_lote.py`, `rejuzgar.py`,
  `demo_4_profiles.py`, `demo_compare.py`, `gen_transcripciones.py`,
  `generar_transcripciones_lote.py`, `run_class_transcript.py`, `vocab_transcripts.py`,
  `sim_clases_v25.py`, `run_loop_all_profiles.py`, `qa_run.py`, `qa_run_claude.py`,
  `_probe_students.py`, `_student_prompts.py`): memoria del proyecto es explícita — "los scores
  de semanas NO valen (medidos sobre texto, no voz)". El circuito vigente es `validar_cambio.py`
  (arriba) + la voz real con micrófono.
- **Motor v3 legacy / superficies ya retiradas** (`run_motor_v3.py`, `smoke_motor_v3.py`,
  `parity_super_prompt.py`): v3 como superficie de test se jubiló en F0-01; `parity_super_prompt`
  comparaba legacy-vs-compositor de una transición ya completada.
- **Smoke duplicados/viejos** (`smoke_a0_c2.py`, `smoke_endpoints.py`, `smoke_motor_api.py`,
  `smoke_motor_transcripts.py`, `smoke_test.py`, `smoke_test_motor.py`): generaciones previas de
  `smoke_e2e.py`/`smoke_full.py` (que se mantienen arriba).
  `test_adult_evolution.py`, `test_history_evolution.py`, `test_integral_dual.py`,
  `test_integral_text.py`, `test_kids_quality.py`, `test_kids_spotcheck.py`,
  `test_multi_evolution.py`, `test_old_vs_new_gemini.py`, `test_ped_isolation.py`,
  `test_vocab_perlita.py`, `test_setup.py`: tests ad-hoc de iteraciones pedagógicas/de modelo ya
  cerradas.
- **Diagnósticos de un bug puntual ya resuelto** (`show_prompt_case.py`, `dump_prompts_v25.py`,
  `run_poda.py`, `deactivate_topic_conteo.py`, `inspect_look_lucas.py`,
  `rename_look_to_lucas.py`, `verify_v25_apilado.py`): investigaciones cerradas, ya no aplican al
  dato/código vigente.
- **`infra_latency_test.py`**: comparaba Heroku vs Cloud Run para decidir el host — la decisión ya
  se tomó (Heroku, 2026-06-07); el sweep de knobs vigente es `infra_sweep.py`.
- **Diagnósticos puntuales `diag_*.py`** (`diag_a0_motor.py`, `diag_kids_topics.py`,
  `diag_last_session.py`, `diag_latest.py`, `diag_prompt_flow.py`, `diag_session_full.py`,
  `diag_topics_motor.py`): diagnósticos ad-hoc de sesiones/bugs puntuales ya cerrados.
- **JSON de backup históricos** (todos los `_backup_*.json` de scripts ya aplicados/archivados) y
  data caches puntuales (`_topics_vocab_in.json`, `kids_vocab_space_ocean.json`).

**Ningún caller vivo apuntaba a estos archivos** — se verificó con `grep -rn "from scripts\.\|import scripts"
backend/ --include="*.py"` antes de mover: el único resultado real distinto de
`backfill_default_interests` fueron dos scripts DENTRO del mismo lote archivado
(`calibrar_juez.py`/`rejuzgar.py` importando `validar_cambio.py`, que se queda en la raíz —
esos imports siguen resolviendo si algún día se quiere revivir esos scripts).

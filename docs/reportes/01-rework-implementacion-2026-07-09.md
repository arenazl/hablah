# Reporte de implementación del rework — sesión 2026-07-09/10

> Ejecutado en modo orquestador (Opus) delegando cada WO a subagentes Sonnet/Opus con verificación.
> Todo lo marcado "deployado" está en `origin/main` (push automático a Cloud Run). Autor del análisis
> y la hoja de ruta: Fable. Base: `docs/03-rework/`.

---

## TL;DR — qué pasó

De las **6 fases** del rework, se implementó y **deployó**: **F0 completa**, **F1 completa** (el arreglo
de raíz del robotismo, ya ACTIVO en producción), **F2 el núcleo** (historia), **F3 casi completa**
(voz/infra), **F4 el valor de producto** (viewport + post-clase visible) y **F5 completa** (SEO/AEO).
Quedan **3 gates con la propuesta ya lista** para tu decisión, **2 WOs grandes pendientes** (refactor de
`WebApp.tsx` y visual kids), y **1 validación que solo vos podés hacer** (F1 por voz).

**Lo más importante que tenés que saber:** la **capa universal anti-robot (F1) está DEPLOYADA y activa**
en producción. Cuando pruebes por voz, ese es el cambio que tenés que escuchar.

---

## 1. Lo que quedó DEPLOYADO y andando

### Fase 0 — Consolidación (la casa ordenada)
- **F0-01**: `/finaltest` y las superficies de test ahora corren el **motor v2 real** (no el v3 jubilado). Se acabó la trampa de evaluar un motor que no era producción.
- **F0-02**: 5 servicios + 184 scripts fósiles archivados en `_attic` (nada borrado). 28 scripts vivos documentados.
- **F0-03**: ESLint 9 + `react-hooks` como gate de calidad (0 violaciones de hooks hoy).
- **F0-04**: el laboratorio se movió a `/lab/*` con guard de admin + lazy-load; el producto ya no comparte bundle con el banco de pruebas.
- **F0-05**: el catálogo ahora es **código versionado** (`data/catalogo/*.json` + `snapshot_catalogo.py`); `seed_prompts` marcado fósil.
- **F0-06**: **tópicos teen B1/B2** (aprobados por Fable): de 2 a 9 tópicos (identidad, redes con mirada crítica, futuro, causas, límites con padres).

### Fase 1 — El motor anti-robot (DEPLOYADO Y ACTIVO)
- **F1-01**: la **capa universal anti-robot** — 10 reglas (recast, variar, seguir al alumno, honestidad conversacional contra el partido falso, elogio honesto) en un solo bloque que el composer apila siempre. **Barrido de 13 cláusulas duplicadas** de los presets (una regla, una capa).
- **F1-02**: `<critical_objective>` envolviendo la producción esperada, contra el muro del Flash.
- **F1-03**: smoke de invariantes, **28/28 PASS**.
- **Triple verificación**: implementación (Opus) → verificación adversarial (Opus refutando: confirmó barrido sin corrupción, A0 intacto) → hardening (cerró el riesgo de deploy que el adversarial encontró: blindaje de `voice_proxy` contra `MotorDataMissing`).

### Fase 2 — Historia (el núcleo)
- **F2-01**: el post-clase **escribe `learner_state`** ultra liviano (top_error, intereses, dominado, repasar) con una llamada batch, fail-soft (no rompe el cierre). Tabla creada.
- **F2-02/F2-03 core**: el composer **usa** la historia liviana + **rotación de semilla por sesión** (mismo nene + mismo tópico = frase-ancla distinta cada clase; determinismo intacto).

### Fase 3 — Voz e infra
- **F3-02**: **push-to-talk** opcional para A0-A2 (flush al soltar, no depende del VAD).
- **F3-03**: robustez de micrófono (selector en Android/desktop, auto-recovery de AirPods, oculto en iOS).
- **F3-04**: config declarativa de Cloud Run (`infra/service.yaml`) + script de chequeo de drift + pedido a Infra en `CANAL_AGENTES.md`.
- **F3-01 parcial**: blindaje de `voice_proxy` contra `MotorDataMissing` (adelantado con F1).

### Fase 4 — Producto/UX (el valor visible)
- **F4-02**: viewport/safe-area en las 5 superficies (regla dura 18); verificado sin overflow horizontal.
- **F4-04**: **post-clase visible** — "tu profe se acuerda" en el Home + estrellas en kids, con datos reales.

### Fase 5 — Growth (completa)
- **F5-01/02/03**: SEO técnico + los **99 tópicos como páginas** (750+ palabras únicas c/u desde el vocab real) + `llms.txt`/`llms-full.txt` generados en build + "Cómo funciona" con Q&A extraíbles. Chunk principal -17%.

---

## 2. Lo que necesita TU decisión o acción

### A. Validación por voz de F1 (solo vos, con micrófono)
La capa anti-robot está deployada. **Probá por voz** (mini A0, junior A2, adultos B1) y escuchá:
- ¿varía o repite fórmulas? · ¿recicla lo que decís? · ¿deja de recitar la estructura?
- **Sonda 1 (honestidad):** mencioná un partido/hecho inexistente → el coach NO debe confirmarlo, debe preguntarte.
- **Sonda 2 (elogio honesto):** en A0, no digas bien la frase → no debe felicitarte igual, debe volver a modelar.
- **Si suena PEOR:** revert en un comando → `python backend/scripts/apply_barrido_f1.py --revert scripts/_backup_barrido_f1_20260709_221239.json` + `git revert` de los commits de F1. Todo reversible.

### B. Tres gates con la propuesta LISTA (en `docs/03-rework/propuestas/`)
1. **Flujo de pantallas** (`01-flujo-pantallas.md`): la IA de navegación + wireframes del onboarding por voz. Hallazgo: la Home "Hoy" ya existe pero es más densa que "una acción primaria" — hay dos opciones para que elijas.
2. **Sistema de diseño** (`02-sistema-diseno.md` + `clase-variante-{1,2,3}.html`): **3 maquetas HTML de la pantalla de clase** — abrilas en el browser y elegí una dirección visual.
3. **Branding** (`03-branding-mensaje.md`): 3 taglines + hero copy + bullets del diferencial.

### C. Si el robotismo persiste tras validar F1 (F1-05)
El gate del modelo más fuerte para el coach sigue disponible (banco `/lab/llm`). Solo se ejecuta si la voz muestra que las directivas no alcanzan.

---

## 3. Pendientes de implementación (priorizados)

| Pendiente | Por qué quedó | Prioridad |
|---|---|---|
| **F4-01** Partir `WebApp.tsx` (3.744 líneas) | Refactor grande; se evitó por riesgo de corte de sesión dejando el producto roto. Refactor puro, sin cambio de comportamiento. | Media (deuda interna) |
| **F2 remanente**: UI del visor de historia en `/lab/mini-test` + cargar variantes de arranque en `student_types` | El subagente se cortó por límite de sesión tras hacer el core. El motor ya usa la historia; falta la herramienta de test y más variedad de apertura. | Media |
| **F4-06** Visual reactivo kids | Depende de que elijas la dirección visual (F4-05). | Baja (tras F4-05) |
| **F3-01** test de regresión de `app_config` | El blindaje ya está; falta el test que lo proteja. | Baja |

---

## 4. Cómo verificar que todo está sano
- Backend: `cd backend && python -c "import main"` → 176 rutas OK.
- Motor: `cd backend && python scripts/smoke_prompt_invariants.py` → 28/28 PASS.
- Frontend: `cd frontend && npx tsc --noEmit && npx eslint src/ --ext .ts,.tsx` → limpio (11 warnings preexistentes).
- Build: `cd frontend && npm run build` → prerender de 105 rutas OK.

## 5. Nota de arquitectura para la próxima sesión
- El motor de producción sigue siendo **v2** (`composer_proto`); v3 jubilado.
- La DB Aiven es **compartida** con prod: todo cambio de dato va con dry-run → backup → apply (patrón `apply_*.py`), y snapshot a `data/catalogo/` después.
- Los backups de esta sesión (`_backup_*.json` en `backend/scripts/`) permiten revertir cualquier cambio de dato.
- La hoja de ruta viva con el tablero de estado: `docs/03-rework/02-hoja-de-ruta.md`.

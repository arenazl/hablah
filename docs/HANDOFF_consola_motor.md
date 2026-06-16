# HANDOFF — Consola del motor (ABMs + orquestador)

> Estado y plan para terminar la consola de administración del motor pedagógico.
> Si el contexto se corta, otro agente (o sesión nueva) continúa desde acá.
> Última actualización: 2026-06-15.

## Reglas de oro (NO romper) — ver memorias del proyecto

1. **Estructura de 9 pasos, CERO parches.** Toda conducta nueva = dato en su bloque/tabla,
   nunca un `if` en el prompt ni en el composer. Ni bolsa de datos (cada bloque lean, una
   responsabilidad). Doc: `docs/mejoras_pedagogicas/00_indice.md`.
2. **Determinismo en 3 capas:** estático nuestro (catálogo + reglas) · IA batch→persistido→
   revisado (los tags de vocab) · IA en vivo solo la conversación. Ver `05_conversacion_first.md`.
3. **Colaboración:** el código lo decide/ejecuta el agente; la arquitectura/pedagogía se charla.
4. **Push directo a prod** (origin + heroku + netlify). DB Aiven schema `hablah`.

## Lo que YA está hecho (schema + seed + vocab, todo en prod DB)

- **Tablas nuevas:** `coaches`, `levels`, `categories`, `subcategories`, `vocab_progress`,
  `reinforcement_queue`, `learner_interests`, `learner_traits`, `session_insights`.
- **Columnas nuevas:** `student_types.closing_seed`; `methodology_modules.max_session_minutes/
  max_turns/language_rule`; `users.gender/preferred_coach_id`; `sessions.raw_session_data`;
  `topics.category_id/subcategory_id/generated_vocab`.
- **Seed cargado:** 8 coaches (F/M × segmento) · 7 niveles (nombres amigables) · 19 rieles
  (con `language_rule` por nivel + duraciones) · cierre por segmento · jerarquía
  Categoría→Subcategoría→Tópico (18 cat, 18 subcat "General", 157 tópicos linkeados) ·
  **157/157 tópicos con `generated_vocab`** (tags-guía de inglés natural, generados por IA batch).
- **Composer:** patitas learner_state (B10) + interaction_state (B11) agregadas (aditivas).
- **Banco `/llm`:** frase-puente A0 + panel de tuneo (anda).

Migraciones: `scripts/migrate_v17..v19`. Seeds: `seed_coaches/levels/method_layer/catalog`.

## Decisiones cerradas del modelo

- Tópicos AGNÓSTICOS (cat→sub→tópico, solo títulos). El nivel cambia el ENFOQUE (riel), no el tópico.
- Vocab = TAGS que guían la charla (no currículo). Generados por IA batch, revisables.
- Coach = persona (F/M por segmento), separada de la pedagogía (StudentType).
- Idioma del coach = SOLO por nivel → PENDIENTE: mover `language_rule` del riel a `levels`
  (hoy está en `methodology_modules`, duplicado por segmento). Se hace en el wire.
- Niveles = 7 CEFR estándar (A0–C2).

## Lo que FALTA construir (la consola)

### 1. Backend CRUD — patrón: `api/methodology_modules.py` (Pydantic Base/Create/Update +
   `_serialize` + GET/POST/PATCH/DELETE + `require_role("admin")`). Registrar en `main.py`.
   - [x] `api/coaches.py` (Coach) — HECHO
   - [ ] `api/catalog.py` (Category + Subcategory)
   - [ ] `api/levels.py` (Level)
   - [ ] extender `api/methodology_modules.py`: agregar al serialize del riel
     `max_session_minutes/max_turns/language_rule`; al de student-type `closing_seed`.
   - [ ] extender `api/topics.py`: exponer/editar `category_id/subcategory_id/generated_vocab`.
   - registrar todos en `main.py` con prefix `/api/coaches`, `/api/catalog`, `/api/levels`.

### 2. Backend ORQUESTADOR — `api/orchestrator.py`
   `GET /api/orchestrator/resolve?student_type=&coach_id=&level=&topic_id=` →
   resuelve las filas, arma los dicts (student_type_data, methodology_module, topic_content
   con los tags), llama `services/composer_proto.compose_proto_prompt(...)`, y devuelve:
   `{ prompt: str, blocks: [{name, source, loaded: bool, preview}], loaded_count, total }`.
   "loaded" = el campo fuente tiene dato real (no fallback). Es el panel "cargado vs falta".

### 3. Frontend — la consola (Backoffice)
   - Patrón ABM: ver `frontend/src/pages/AdminMetodologiaPanel.tsx` + `services/api.ts`.
   - Páginas ABM (una por entidad): Coaches, Niveles, Categorías, Subcategorías, Tópicos (con
     sus tags generados editables), Rieles (ya existe panel metodología).
   - **Orquestador (la estrella):** selectores Segmento/Coach/Nivel/Tópico → llama
     `/orchestrator/resolve` → muestra los 9 pasos en lista (cada uno con su TAG a tabla/campo
     + verde=cargado/rojo=falta) + el PROMPT final en vivo + botón "Probar" (reusa `/llm`).
   - Agregar rutas en `App.tsx` (Backoffice) + wrappers en `services/api.ts`.

### 4. El WIRE — ÚNICO PENDIENTE (lo demás de la consola ya está LIVE)

> §1 (backend CRUD: coaches/catalog/levels), §2 (orquestador) y §3 (frontend:
> /admin/consola + /admin/abms) están HECHOS y deployados. Falta solo esto:
> que la CLASE REAL lea los datos nuevos (hoy el orquestador ya los compone y
> muestra, pero la sesión `/voice/ws` y el banco `/llm` todavía no los usan).

**Regla dura: ADITIVO con fallback.** Si falta el dato, comportamiento actual →
prod byte-idéntico. Verificar con el chequeo "sin dato => 9 bloques" como en v17.

**Pasos concretos:**
1. **`composer_proto.compose_proto_prompt`**: que el bloque 6 (`_get_behavioral_guards`)
   renderice también la **`language_rule`** (viene de `levels`, NO del riel). Pasarla
   como arg nuevo `language_rule: Optional[str]=None` (si None, no se renderiza →
   prod intacto). Y el cierre suave (`closing_seed` del StudentType) como sub-regla
   del bloque 3/enfoque, también opcional.
2. **`services/gemini_live.py::_load_session_context`** (arma los inputs del composer
   para la sesión real): cargar de la BD el **Coach** elegido (`users.preferred_coach_id`
   → `coaches`) y meterlo en `student_type_data` (mascot/identity/tonal = coach), el
   **`levels.language_rule`** del nivel del alumno, las **duraciones** del riel, el
   **`closing_seed`** del student_type. Pasarlos a `compose_proto_prompt`.
3. **Banco `/llm`** (`api/voice.py::voice_ws_llm_test`): pasar también `language_rule`
   (del nivel A0) + el coach, para que el "Now you" se arregle en vivo ahí.
4. **Persistir crudo**: en `services/gemini_live.py::voice_proxy`, al cerrar la sesión,
   volcar los `counters` + target items + timing a `sessions.raw_session_data`
   (observabilidad dev, BLUEPRINT §8 + memoria `project-observabilidad-dev-oro`).
5. Deploy: `git push heroku main` + verificar `/health` 200. Probar en `/llm` que
   el coach A0 ya NO dice "now you" (dice "ahora vos") — ahí está el éxito del wire.

**Referencia del patrón aditivo:** los overrides de `model_override`/VAD en
`gemini_live_engine.py` (cómo se agregó algo opcional sin tocar el path de prod).

## Deploy
`git push origin main && git push heroku main` (backend) · `cd frontend && npm run build &&
netlify deploy --dir=dist --prod` (front). Verificar `/health` 200 tras Heroku.

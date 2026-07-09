# Inventario de `backend/services/` — WO F0-02

> Generado 2026-07-09. Metodología: `grep` de llamadores vivos en `backend/` (excluyendo
> `_attic`, tests y los scripts que este mismo WO archivó) para cada archivo de
> `backend/services/`. Veredicto **vivo** = tiene al menos un caller real en código que se
> ejecuta (routers montados en `main.py`, otro servicio vivo, o un script que sigue en la raíz
> de `backend/scripts/`). Veredicto **fósil** = cero callers en todo `backend/`.
>
> Verificación de no-ruptura: `cd backend && python -c "import main"` (importa TODOS los
> routers de `api/`, que a su vez importan sus servicios) + import explícito de cada símbolo
> lazy-importado (los que viven dentro de un `def`, no a nivel de módulo) — **PASS**, ver
> sección final.

## Tabla

| Servicio | Llamadores | Veredicto |
|---|---|---|
| `composer_proto.py` | `api/voice.py`, `api/finaltest.py` (vía `gemini_live.py`); **motor de producción v2** | VIVO — intocable (regla del WO) |
| `gemini_live.py` | `api/voice.py` (`/ws` — el WS real de producción) | VIVO — intocable (regla del WO) |
| `super_prompt.py` | `api/voice.py` (`ws_room`, `ws_llm_test`) — wrapper de v2 | VIVO — intocable (regla del WO) |
| `motor_engine.py` | `api/voice.py` (`ws_mini` → `resolve_v2`), `api/motor.py` (línea ~205, editor de guards admin), `api/finaltest.py` | VIVO — intocable (regla del WO); `resolve` v3 queda jubilado (docstring ya puesto en F0-01) |
| `motor_protocol.py` | `api/motor.py` (`process`, `student_presets`, `get_or_create_profile`, `wipe_learned_state` — editor admin `/motor`, router montado), `api/finaltest.py` (`mp._parse_json`, `mp._gemini`) | VIVO |
| `composer_rules.py` | `api/rules.py` (router `/api/rules` montado, endpoint de debug de orquestación), `gemini_live.py` (rama condicional `RULES_MOTOR` env, default OFF) | VIVO (parcialmente dormido detrás de flag `RULES_MOTOR=0`; el endpoint de `/api/rules` sí lo ejecuta siempre) |
| `learning_objectives.py` | `gemini_live.py` línea ~78 (`pick_objective` — **incondicional**, producción real) | VIVO |
| `topic_brief.py` | `api/sessions.py` (path `free_topic`, producción real) | VIVO |
| `session_analyzer.py` | `api/sessions.py` (`analyze_session_safe`, dispatch post-clase — el generador del reporte) | VIVO |
| `memory_analyzer.py` | `api/sessions.py` (`analyze_memory_safe`), `gemini_live.py` (`load_learner_state`, bloque 5b del prompt) | VIVO |
| `feature_flags.py` | `api/me.py` (`get_feature_flags`, `mark_intro_seen` — endpoints reales) | VIVO |
| `push_notif.py` | `api/push.py` (router `/api/push` montado) | VIVO |
| `preference_detector.py` | `services/voice_engines/gemini_live_engine.py` (engine default del registry) | VIVO |
| `transcribe.py` | `services/voice_engines/gemini_live_engine.py`, `cascade_engine.py`, `api/diag.py` (router montado) | VIVO |
| `elevenlabs.py` | `api/sessions.py`, `api/tts.py`, `voice_engines/elevenlabs_pipeline_engine.py`, `voice_engines/gemini_text_eleven_engine.py` | VIVO |
| `voice_engine.py` | `api/voice.py` (factory `get_engine`/`available_engines`, usado por `ws_room`, `ws_llm_test`, `ws_mini`) | VIVO |
| `voice_room_engine.py` | `api/voice.py` (`ws_room`, charla multi-participante) | VIVO |
| `voice_engines/gemini_live_engine.py` | Registrado en `voice_engine.py` como engine default (`gemini_live`) | VIVO |
| `voice_engines/cascade_engine.py` | Registrado en `voice_engine.py` (`cascade`), alcanzable por query param en `/lab/llm` y `/mini-test` | VIVO (alcanzable; NO es la elección de producción — memoria del proyecto: "Cascade kills realtime UX") |
| `voice_engines/elevenlabs_pipeline_engine.py` | Registrado en `voice_engine.py` (`elevenlabs_pipeline`) | VIVO (alcanzable, mismo caso que cascade) |
| `voice_engines/gemini_text_eleven_engine.py` | Registrado en `voice_engine.py` (`gemini_text_eleven`) | VIVO (alcanzable, mismo caso que cascade) |
| `cloudinary_service.py` | **ninguno** — cero matches en todo `backend/` | **FÓSIL → movido a `_attic/`** |
| `email.py` | **ninguno** — cero matches en todo `backend/` (el envío de mail vía Brevo SMTP nunca quedó cableado) | **FÓSIL → movido a `_attic/`** |
| `gemini.py` | **ninguno** — servicio genérico "descripciones, lead scoring y bot conversacional", no relacionado al dominio actual de Habláh | **FÓSIL → movido a `_attic/`** |
| `live_analyzer.py` | **ninguno** — analizador turno-a-turno (chip rojo en pantalla), nunca se cableó al WS real | **FÓSIL → movido a `_attic/`** |
| `runtime_prompt.py` | **ninguno** — addon de runtime de una generación previa del prompt (pre-`composer_proto`) | **FÓSIL → movido a `_attic/`** |

## Resumen

- **23 servicios vivos** (18 archivos top-level de `services/` + 4 en `voice_engines/` + el propio
  `voice_engine.py` que orquesta el registry).
- **5 servicios fósiles**, movidos a `backend/services/_attic/`: `cloudinary_service.py`,
  `email.py`, `gemini.py`, `live_analyzer.py`, `runtime_prompt.py`.
- Ningún archivo `_attic` se borró — están intactos, solo reubicados (`git mv`, historia
  preservada).

## Nota de precaución (no mover, aunque parezca fósil)

- `composer_rules.py`: el camino `RULES_MOTOR=1` está dormido en producción (default OFF), pero
  **tiene un caller incondicional** en `api/rules.py` (endpoint de debug de orquestación, router
  montado). Si en el futuro se confirma que ese endpoint tampoco se usa desde ningún panel del
  frontend, recién ahí sería candidato a fósil — no se tocó en este WO por el principio
  conservador (regla del WO: ante la duda, conservar).
- `voice_engines/cascade_engine.py`, `elevenlabs_pipeline_engine.py`,
  `gemini_text_eleven_engine.py`: alcanzables vía query param `engine=` en `/ws_llm_test` y
  `/ws_mini` (banco de pruebas de voz), aunque la producción real (`/ws`) usa `gemini_live.py`
  directamente sin pasar por este registry. Cuentan como VIVOS por tener un caller real
  (`get_engine()`), aunque pedagógicamente estén descartados (ver memoria del proyecto:
  "Cascade kills realtime UX").

## Verificación de no-ruptura (PASS)

```
cd backend && python -c "import main; print('IMPORT_OK', main.app)"
# → IMPORT_OK <fastapi.applications.FastAPI object at ...>
```

Esto importa los 30 routers montados en `main.py` (que a su vez importan sus servicios) sin
`ImportError`. Adicionalmente se probaron a mano los imports *lazy* (los que viven dentro de un
`def`, no a nivel de módulo, y por lo tanto `import main` no los ejercita):
`scripts.backfill_default_interests`, `services.composer_rules`, `services.motor_protocol`,
`services.learning_objectives`, `services.topic_brief`, `services.session_analyzer`,
`services.feature_flags`, y los 4 `voice_engines/*` — los 11 imports dieron OK.

# Handoff — continuación (2026-07-08)

> Cierre de la sesión del 2026-07-08. Complementa `2026-06-28_handoff-fable.md` (leer ese primero).

## Hecho esta sesión (todo pusheado a main)

- **Infra:** Infra (`structure`) migró el backend **Heroku → Cloud Run us-east4** (`hablah-api`,
  proyecto `hablah-prod`). Bajó mucho la latencia. Deploy continuo: push a `origin/main` deploya.
- **Voice arreglado:** el "live unavailable" post-migración era `GEMINI_LIVE_MODEL` **sin el prefijo
  `models/`**; lo corregí en el env var de Cloud Run (`models/gemini-3.1-flash-live-preview`).
  Verificado (setupComplete). Pedido a Infra en `CANAL_AGENTES.md` para que persista con prefijo.
- **app_config:** `gemini_live` lee `config_key/config_value` (raw) → se fue el `Unknown column` del log.
- **Circuitería de voz centralizada:** `useLiveVoice` expone `audioLevel` (mic+coach, throttle+decay);
  WebApp lo usa. La aura reacciona a la voz del alumno en `/practicar`. KidsSession queda con su
  separación coach/mic a propósito.
- **PWA auto-actualizable** (version.json + versionCheck + SW network-first + no-store).
- **`docs/motor-catalogo/`** (para analizar por fuera): filosofía autocontenible (+ algoritmos
  incluidos), cruces perfil×nivel×tópico, y orquestaciones (agnósticas + topic-builtin, 16 c/u).
- Catálogo: 4 edades ✓, 7 niveles ✓, 0/165 tópicos crashean ✓. Ya estaba curado/limpio.

## PRÓXIMO PASO concreto (quedó a mitad — retomar acá)

**Consolidar el catálogo curado a la DB.** El dueño dejó `docs/motor-catalogo/02-topicos-curados-2026.md`
(v2: sin palabras truncadas, sin palabras sueltas → semillas = chunks). Falta **volcarlo a la tabla
`topics`**:
- Por fila: setear **niveles** + **semilla** (→ `keywords`/`generated_vocab`).
- **Actualizar** existentes · **insertar** nuevos (Adicción al celular, Construcción con bloques
  mágicos, Vocabulario de comidas, Suscripciones gaming, Juegos de pelea…) · **deactivar** los sacados.
- **RIESGO = matching:** varios títulos cambiaron (ej. "Comidas ricas"→"Vocabulario de comidas"). Mapear
  viejo→nuevo por id o se **duplican**.
- **Cómo:** script que muestre el **diff (update/insert/deactivate) ANTES de aplicar**, con backup,
  reversible. Que el dueño lo apruebe y recién ahí escribe.

## Pendiente para Fable (lo sutil)

Capa universal anti-robot · loop de HISTORIA (learner_state) · salones múltiples · que la clase
entretenga · jubilar v3 de `/finaltest`. El QUÉ-tópico/curación NO es de Fable (es sentido común, ya
casi listo con el archivo curado).

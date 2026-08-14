# Handoff para GEMINI — estado del motor y de la app (2026-08-14)

> Para Gemini, que sigue trabajando sobre esta base. Contexto autosuficiente: qué venimos
> haciendo, qué problemas hubo, cómo se resolvieron, cómo pasamos de orquestaciones FIJAS a
> orquestaciones por PLACEHOLDERS dinámicos, y el estado real de infraestructura + framework.
> Complementa `2026-07-08_continuacion.md` (histórico) — este documento es el vigente.

---

## 1. Qué es el sistema hoy (foto actual)

- **UN solo motor: v2 = `compose_proto`** (`backend/services/composer_proto.py`). Determinístico,
  9 pasos, GENERA el prompt al vuelo — **no persiste orquestaciones**. v1 y v3 jubilados.
- **3 pilares:** EDAD (`student_types` → el CÓMO se enseña) + NIVEL (`levels` → el QUÉ) +
  HISTORIA (memoria del alumno, hoy casi vacía). Se APILAN, nunca se cruzan a mano.
- **Fail-fast SIN fallback:** si falta un dato de catálogo, el motor lanza `MotorDataMissing`
  y la sesión NO arranca. Es a propósito: el dato se carga en su tabla, no se parchea en código.
- **Semilla determinística por (alumno, tópico, día)** — mismo combo el mismo día = mismo prompt
  byte a byte; la variedad entre clases la pone el modelo en vivo, no el armado.
- **Anti-goals (no re-litigar):** NO persistir orquestaciones · NO forzar vocab · NO if/parche
  en el composer · NO seeds a ciegas · NO deploy manual · NO curar combos a mano.

## 2. De orquestaciones FIJAS a PLACEHOLDERS dinámicos (la reingeniería)

**Problema de origen:** la "forma" del prompt vivía hardcodeada en Python (el peor caso: la regla
de idioma en `composer_proto:186`) y el catálogo acumulaba contradicciones — el linter de prompts
marcó **76 contradicciones** en el baseline (2026-07-16), agrupables en 6 familias; la mayor
(~30 language_clash) era el hardcode de idioma, NO dato.

**Solución — "orquestación como DATO":**
- **Template XML** con placeholders `{DUEÑO:campo}` en la tabla `orchestration_templates`
  (uno activo). Dueños: `STATIC / ALUMNO / EDAD / NIVEL / TOPICO / EDAD_X_NIVEL`.
- **`services/orchestration_resolver.py`** — resolver genérico: parsea el template, resuelve
  cada placeholder por prefijo contra su tabla dueña. Mató el hardcode de idioma.
- **`age_level_matrix`** — tabla-cruce con los **18 combos VÁLIDOS** edad×nivel (fila = combo;
  sparse a propósito: mini llega hasta A2, teen no tiene A0/C1/C2, etc. — un cruce inexistente
  es error de diseño esperado, no bug).
- **`conversation_rules`** — 12 reglas universales gateadas por edad/nivel (bloque A/B).
- Todo **editable por ABM** (las 3 tablas están en ABM_REGISTRY) y visible en el probador.
- Siembra: `backend/scripts/apply_orquestacion_placeholders.py` (DDL + template + cruces +
  re-cura). Los campos nuevos de `student_types` (`estilo_de_sesion`, `anclas_narrativas`)
  los creó este script por ALTER.

**Resultado medido:** linter 76 → 47 → 22 → **15** (~80% menos). De los 15 residuos: ~la mitad
es ruido del juez (marca "violación del 100% inglés" cuando el bot nombra el TÍTULO del tópico,
que legítimamente está en español); el resto es curación fina de DATO (ej: `Level_Target` de
mini A2 demasiado ambicioso, "CERO infantil" en junior, "Imaginate que..." en español dentro de
una regla). Nada requiere código.

## 3. Problemas que tuvimos y cómo se resolvieron (aprendizajes clave)

1. **El "robot"** no era del modelo: era GUION acumulado (120 toques de prompt). Fix: A0 mínimo +
   ley de tejer universal + `lesson_approaches` rotados por semilla. **Ante un síntoma: leer el
   prompt_final real y QUITAR guion, no agregar.**
2. **Forzar vocabulario DEGRADA la clase** (medido: libre 7.7/8.8 vs vocab 6.5). El visual de
   kids pasó a REACTIVO: se muestran imágenes cuando el profe dice la palabra, sin tocar el prompt.
3. **El alumno "mudo" era infra, no pedagogía:** un 429 de Ollama dejaba al alumno simulado sin
   voz y el juez puntuaba 3. Moraleja: **antes de tocar prompts, mirar transcript + eventos**
   (auditoría en `/admin/auditoria` — muestra reglas aplicadas, prompt final y transcript).
4. **El juez SLA sin ancla es ruido** — el dueño lo retiró del circuito: "el juez es la charla
   en sí y cómo me siento al tenerla". La vara REAL es hablar por micrófono.
5. **BUG DE HOY (2026-08-14, fixeado en `1a079bd`):** la app real cortaba con "conversación
   terminada" apenas entrabas. Log real: `prompt NO armable: {EDAD:estilo_de_sesion} (adult, B1)`.
   **Causa:** la reingeniería agregó 2 columnas a `student_types` vía ALTER, pero (a) el ORM
   `StudentType` no las mapeaba y (b) TRES callers arman `student_type_data` A MANO con la lista
   vieja de campos: `gemini_live._load_session_context` (app real), `api/voice.py` (smoke 28
   combos) y `api/orchestrator.py`. El probador `/motor` andaba porque `motor_engine` lee filas
   crudas. **Lección/deuda:** si se agrega un campo al template, hay que agregarlo al ORM + a los
   3 dicts — o mejor, UNIFICAR la carga del eje EDAD en un solo loader (deuda técnica prioritaria).

## 4. Superficies y herramientas (dónde se prueba qué)

| URL | Qué es | Auth |
|---|---|---|
| `https://hablah.com.ar/motor` | **Probador de clases** (9 capas + editor JIT de placeholders + **Clase en VIVO por voz**) | **SIN login** (prod=QA) |
| `/admin/motor` | El mismo probador dentro del backoffice | login |
| `/admin/auditoria` | Diagnóstico de charlas reales (reglas aplicadas + prompt final + transcript) | login |
| `/lab/mini-test`, `/lab/finaltest` | Bancos de prueba históricos (mismo motor) | login |

**El probador `/motor` es la mesa de trabajo del dueño:** elegís edad×nivel×tópico×alumno, ves
las 9 capas y el prompt final, tocás un placeholder → "Guardar y Aplicar" → escribe la tabla
origen → **"Iniciar clase"** (dock inferior, 3 filas colapsables) abre una charla REAL por voz
(WS `/voice/ws_motor`, solo audio) con ese combo. Loop de curación: ajustar → guardar → reiniciar
clase. El WS compone el prompt server-side en cada arranque, así que el cambio entra sin deploy.
Nota: `ws_motor` se llamaba `ws_mini` — se renombró porque sirve TODAS las edades.

## 5. Infraestructura (estado real)

- **Backend:** Cloud Run `hablah-api`, proyecto `hablah-prod`, región **us-east4**. **Deploy
  continuo por push a `origin/main`** (Cloud Build). PROHIBIDO deploy manual y probar en localhost.
- **Frontend:** Netlify build-on-push (vite + prerender Puppeteer). PWA auto-actualizable
  (version.json + SW network-first) — ojo: tras un deploy, una pestaña vieja puede servir el
  bundle anterior; hard refresh y listo.
- **BD:** MySQL en Aiven. El catálogo ES la app: casi todos los cambios de comportamiento son
  UPDATE de tablas, no código.
- **Voz:** Gemini Live, modelo `models/gemini-3.1-flash-live-preview` (half-cascade — sigue mejor
  el prompt que native-audio), `VOICE_ENGINE=gemini_live`, thinking budget bajo por latencia.
  Input de Live SIEMPRE 16kHz. Realtime = streaming bidireccional; nunca cascade HTTP.
- **PROD = QA (regla vigente):** la app no tiene clientes; se puede romper con tal de avanzar.
  Por eso hay guards abiertos QUE HAY QUE REVERTIR AL LANZAR: `/motor` sin AuthGate (App.tsx) y
  `PATCH /api/motor/rows/{table}` sin `_admin` (motor.py) — ambos marcados con comentario.

## 6. Estado de las últimas modificaciones (cronología corta)

- Reingeniería placeholders completa y deployada (`ee65958` → `3fe5487` → `33fa3db`).
- Probador con Clase en VIVO por voz + rename `ws_mini→ws_motor` (`158c7a3`).
- `/motor` público sin auth + `update_row` abierto (`6c60afc`) · ThemeSwitcher (`6b1ea3d`) ·
  dock inferior (`665da5c`) · dock fino con 3 filas colapsables (`9bdef38`).
- Fixes de audio/fonética/tonalidad posteriores (ver `git log`: `a2cdbce`, `898e21f`, `ce4b935`…).
- **HOY: fix del corte en producción (`1a079bd`)** — ver punto 3.5.

## 7. PENDIENTES (en orden — acá se sigue)

1. **Smoke de TODA la app real con el motor nuevo** (pedido explícito del dueño, 2026-08-14).
   El bug de hoy demostró que el probador y la app real comparten motor pero NO comparten el
   loader de datos. Probar con usuario real: adulto (A0/B1), kids (mini/junior) y teen — entrar,
   hablar 2-3 turnos, cerrar. Si algo corta: el log de Cloud Run dice exactamente qué placeholder
   faltó (`prompt NO armable...`). El fix es SIEMPRE dato o loader, no parche en el composer.
2. **Validación por VOZ 5×4** (la vara real): 5 corridas × historia 0-3 por cruce. Cruces
   recomendados por riesgo/cobertura: `mini A0`, `junior A1`, `teen B2`, `adult A0`, `adult C1`
   (control limpio). Se hace en `/motor` hablando.
3. **Curación fina de los residuos del linter** (~8 reales): son UPDATEs de dato vía ABM/probador.
4. **Deuda técnica:** unificar la carga de `student_type_data` en UN loader compartido
   (gemini_live + api/voice + orchestrator + motor_engine) para que no vuelva a pasar lo de hoy.
5. **Kids dinámico (la joya):** conversación más dinámica en kids; el circuito visual reactivo v2
   ya anda (filtro "se dice X" + delay por backlog de audio; `docs/imagenes_sync.md`).

## 8. Advertencias operativas (no pisar estas minas)

- **NO correr seeds viejos** (`seed_tutor_personas`, `seed_v25_*`, `clean_universal_rules_db`):
  restaurarían catálogo desactualizado y re-contaminan la BD viva.
- **Cualquier campo nuevo en el template** exige: columna en BD + ORM + los loaders (ver 3.5).
- Timestamps: todo se comunica en **UTC-3 (ART)**.
- Sin emojis en código/UI/datos — iconos SVG.
- El trabajo termina en `git push origin main`; se prueba en el deploy, nunca en localhost.

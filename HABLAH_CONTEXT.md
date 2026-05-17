# Habláh — Contexto completo del proyecto

> Plataforma adaptativa de aprendizaje de idiomas con IA conversacional por voz.
> Single source of truth de qué hace cada parte, cómo se conecta, dónde está deployado.
> **Última actualización:** 2026-05-17

---

## 1. ¿Qué hace Habláh?

App donde el alumno **conversa por voz en inglés** (o portugués / italiano) con un tutor IA que:

- Se adapta a su **nivel CEFR** (A1..C2).
- Habla de los **tópicos que al alumno le interesan** (música, deportes, tech, etc.).
- Usa una **personalidad configurable** (Coach / Sincerist / Arcade / customs futuros).
- **No corrige durante la charla** (pedagogía moderna: reformula natural).
- Al cierre genera un **reporte con score, elogios, errores, conectores sugeridos, vocabulario nuevo y consejo para la próxima sesión**.

Mantiene **rachas diarias**, detecta **errores recurrentes** y activa **misiones de rescate** cuando el alumno tropieza 3 veces con el mismo error.

---

## 2. URLs en producción

| Capa | URL | Hosting |
|---|---|---|
| **Frontend** | https://hablah-app.netlify.app | Netlify |
| **Backend API** | https://hablah-api-abcaf6c43a5d.herokuapp.com | Heroku |
| **DB MySQL** | `mysql-aiven-arenazl.e.aivencloud.com:23108` schema `hablah` | Aiven |
| **Repo GitHub** | https://github.com/arenazl/hablah | público |
| **Logs Heroku** | `heroku logs -a hablah-api -t` | |
| **Logs Netlify** | https://app.netlify.com/projects/hablah-app/logs | |

### Cuentas demo

| Email | Password | Rol | Puede ver |
|---|---|---|---|
| `admin@hablah.app` | `admin123` | admin | `/app/*` + `/admin/*` |
| `demo@hablah.app` | `demo123` | student | solo `/app/*` |

---

## 3. Stack técnico

### Backend (Python 3.11)
- **FastAPI** 0.104 + `uvicorn[standard]` + `gunicorn` con `UvicornWorker`.
- **SQLAlchemy** async 2.0 + `aiomysql` + `pymysql` (este último solo para `create_database.py`).
- **JWT** con `python-jose` + `passlib[bcrypt]` (token expira 24h).
- **WebSocket** para voz live (FastAPI + `websockets` 12.0).
- **httpx** para todo lo HTTP externo (Gemini, ElevenLabs, Groq, Cloudinary).

### Frontend (React 18.3 + TS strict)
- **Vite 5** bundler, puerto local `5200` con `strictPort: true`.
- **TailwindCSS 3.4** + CSS vars (theming light/dark).
- **axios** 1.7 con interceptor JWT + redirect 401 → `/login`.
- **react-router-dom** 6.26 para SPA routing.
- **sonner** 1.5 para toasts (wrapper `ThemedToaster`).
- **lucide-react** para íconos (nunca emojis Unicode).
- **@headlessui/react** 2.x para modales / transitions.
- **class-variance-authority** + `clsx` + `tailwind-merge` para variantes de componentes.

### Servicios externos (todas las API keys en `.env` de Heroku)

| Servicio | Uso | Modelo / config |
|---|---|---|
| **Gemini 3.1 Flash Live** | Conversación voz bidireccional en vivo (audio nativo, voz Aoede) | `models/gemini-3.1-flash-live-preview` vía WS `wss://generativelanguage.googleapis.com/ws/.../BidiGenerateContent` |
| **Gemini 2.5 Flash** | Análisis post-sesión (transcripción → reporte JSON con score, errores, sugerencias) | `gemini-2.5-flash` REST `:generateContent` con `responseMimeType: application/json` |
| **Groq Whisper** | STT de respaldo (si usamos `elevenlabs_pipeline` engine en vez de Live) | `whisper-large-v3` |
| **ElevenLabs** | TTS premium para feedback escrito + previews de voz en backoffice | `eleven_flash_v2_5` con voces mapeadas a cada tutor (Lucia / Melanie / etc.) |
| **Cloudinary** | Storage de imágenes (avatars, futuros recordings) | folder `hablah/<entidad>/<id>` |
| **Brevo SMTP** | Transactional emails (welcome, reminders) | `smtp-relay.brevo.com:587` |
| **Web Push VAPID** | Notificaciones push browser/PWA | `pywebpush` + claves VAPID |

---

## 4. Modelo de datos (Aiven MySQL, schema `hablah`)

### `users` — alumnos y admins

Campos base: `id, email, hashed_password, nombre, apellido, telefono, foto_url, role (admin|student), is_active, created_at`.

Campos Habláh (extendidos en migración v1):
- `cefr_level` — A1..C2
- `target_language` — en | pt | it
- `base_language` — es
- `accent_preference` — uk | us | neutral
- `active_template_id` — FK lógica a `templates.id`
- `streak_days`, `streak_best`, `last_session_at` — gamificación
- `target_minutes_per_session` — default 7
- `insistent_mode_enabled` — bool, activa modo rescate al detectar errores recurrentes
- `daily_reminder_enabled` — bool, push diario
- `audio_retention_days` — int, default 30
- `plan` — free | pro | bootcamp

### `templates` — personalidades del tutor

Campos base: `id, slug, name, description, rigor (1..5), challenges_per_min (0..6), allow_interruptions, block_on_repeat, json_output, tones (JSON), voice_id, voice_label, icon_bg, is_preset, version, status, assigned_count`.

**Campos configurables v3 (migración v3, 20 columnas nuevas):**

| Categoría | Campos |
|---|---|
| **Conversación** | `response_length` (terse/short/medium/long), `tutor_talk_ratio` (10-50%), `proactive_questions`, `tutor_shares_opinions`, `warmth_level` (1-5) |
| **Corrección** | `correction_mode` (none/recast/explicit_soft/explicit_strict), `correction_focus` (JSON: grammar/vocab/pronunciation/fluency), `error_threshold` (only_major/repeated/all), `max_feedback_items` (1-10), `praise_count` (1-5) |
| **Reporte** | `report_include_summary`, `report_include_connectors`, `report_include_vocab_suggestions`, `report_include_pronunciation`, `report_include_next_session_tip` |
| **Arranque** | `opening_style` (direct/warm/playful), `opening_includes_topic_intro` |
| **Dinámica** | `silence_tolerance_ms` (300-3000), `interruption_allowed`, `scaffold_when_stuck` |

**3 presets seedeados con defaults distintos:**

| Slug | Estilo |
|---|---|
| `coach` | `correction_mode=none`, `warmth=5`, `response_length=medium`, `praise_count=3`. **No corrige nunca, prioriza fluidez y confianza.** |
| `sincerist` | `correction_mode=recast`, `warmth=3`, `response_length=short`, `correction_focus=[grammar,vocab,fluency]`. **Reformula natural, reporte completo al cierre.** |
| `arcade` | `correction_mode=recast`, `warmth=4`, `response_length=terse`, `silence_tolerance_ms=600`, `interruption_allowed=true`. **Sesiones rápidas, ágiles.** |

### `topics` — catálogo de tópicos

Campos: `id, slug, title, category (tech/arte/lifestyle/diseno/negocios/viajes/deportes/gastronomia/ciencia), seed_prompts (JSON {A1, A2, B1, B2, C1, C2}), keywords (JSON list), levels (JSON list), is_hot, is_active, usage_count`.

**31 tópicos seedeados** distribuidos en 9 categorías. Keywords son frases-pivote conversacionales (ej: "rewatchable", "blew my mind"), NO jerga técnica.

### `user_interests` — N-to-N usuario↔topic

Campos: `id, user_id, topic_id, position (0..N), added_at`. **Reordenable con drag&drop** en `/app/perfil`.

### `sessions` — cada charla

Campos: `id, user_id, template_id, topic_id, cefr_at_start, status (active/ended/analyzed), started_at, ended_at, duration_seconds, transcript (JSON: lista de {who, text}), metrics (JSON), report (JSON), score (0-100), is_rescue, audio_url`.

El `report` (poblado por `session_analyzer.py`) tiene:
- `score`, `praise[]`, `feedback[]` (con type/label/snippet_wrong/snippet_correct/why)
- `summary` (si `report_include_summary`)
- `connector_suggestions` (si `report_include_connectors`)
- `vocab_suggestions` (si `report_include_vocab_suggestions`)
- `pronunciation_notes` (si `report_include_pronunciation`)
- `next_session_tip` (si `report_include_next_session_tip`)
- `metrics`: `words_spoken`, `wpm`, `keywords_hit`, `keywords_total`

### `error_logs` — errores recurrentes

Campos: `id, user_id, session_id, kind (grammar/vocab/pronunciation), error_key, label, snippet_wrong, snippet_correct, detected_at, resolved`.

Cada error detectado por el analizador se guarda acá. Si un mismo `error_key` se repite 3 veces sin resolver → trigger de **modo insistente** (misión de rescate forzada).

### `topic_progress` — mapa de progreso por tópico

Campos: `id, user_id, topic_id, stages_done, stages_total (6 default), pct, minutes_spoken, sessions_count, updated_at`.

### `push_subscriptions` — Web Push

VAPID subscriptions del browser para notifs.

---

## 5. Endpoints API (43 totales)

### Públicos
- `GET /health` — estado backend

### Auth `/api/auth/*`
- `POST /login` → `{access_token, token_type, user}`
- `GET /me` → user logueado

### Users `/api/users/*` (alumnos + admins)
- `GET /` — list (cualquier logueado)
- `GET /me`, `PATCH /me` — perfil propio
- `POST /` — crear (admin)
- `PATCH /{id}` — editar (admin)

### Me `/api/me/*`
- `GET /profile` — perfil enriquecido (user + active_template + interests + progress + last_session + total_sessions)
- `PATCH /settings` — toggles (insistent_mode, daily_reminder, audio_retention_days, accent_preference, active_template_id, target_minutes_per_session)

### Templates `/api/templates/*` (admin para mutations)
- `GET /`, `GET /{id}`
- `POST /`, `PATCH /{id}`, `DELETE /{id}` (admin)

### Topics `/api/topics/*`
- `GET /` — list con filtros `?category=...&q=...`
- `GET /categories` — counts por categoría
- `GET /my-interests` — los del user
- `POST /my-interests/reorder` body `{topic_ids:[...]}` (debe ir antes que `/{topic_id}` en routing)
- `POST /my-interests/{topic_id}`, `DELETE /my-interests/{topic_id}`
- `GET /{topic_id}`, `POST /`, `PATCH /{id}`, `DELETE /{id}` (admin)

### Sessions `/api/sessions/*`
- `POST /start` body `{topic_id?, template_id?}` → `{session_id, super_prompt, voice_id, template, topic}`
- `POST /{id}/end` body `{transcript:[{who,text}]}` → analyzer en background
- `GET /` — list de las del user
- `GET /{id}` — detalle
- `GET /{id}/feedback-audio?which=praise|correction_0` — sintetiza con ElevenLabs

### Alumnos `/api/alumnos/*` (admin)
- `GET /?q=&level=` — list paginable
- `GET /{user_id}/errors` — top errores recurrentes

### Dashboard `/api/dashboard/summary` (admin)
KPIs: sessions_week, retention_7d_pct, errors_resolved, insistent_active, templates_distribution, top_errors.

### TTS `/api/tts/*`
- `GET /voices` — catálogo ElevenLabs mapeado a tutores
- `POST /sample?text=&tutor=` → audio/mpeg

### Voice `/api/voice/ws?session_id=&token=` — WebSocket
Protocolo cliente↔backend:
```
→ {type: "audio", data: "<base64 PCM 16kHz mono>"}
→ {type: "end"}
← {type: "audio", data: "<base64 PCM 24kHz>"}
← {type: "transcript", who: "ai"|"user", text}
← {type: "turn_complete"}
← {type: "error", error}
```

### Push `/api/push/*`
- `GET /vapid-public-key`, `POST /subscribe`, `DELETE /subscribe`, `POST /test`

---

## 6. Arquitectura de voz

```
Browser /app/practicar
  │
  │  WebSocket /api/voice/ws?session_id=N&token=JWT
  ▼
Backend voice_proxy()
  │  1. Valida JWT → carga session/user/template/topic
  │  2. Build super_prompt (con config v3 del template)
  │  3. Build VoiceEngineContext con silence_tolerance_ms, interruption_allowed
  │  4. Delega a engine activo (default: gemini_live)
  ▼
services/voice_engines/gemini_live_engine.py
  │
  │  WebSocket wss://generativelanguage.googleapis.com/.../BidiGenerateContent
  ▼
Gemini 3.1 Live API
  - Recibe: realtimeInput.audio (PCM 16kHz mono base64)
  - Devuelve: serverContent.modelTurn (audio nativo Aoede 24kHz)
              serverContent.inputTranscription (lo que dijo el USER)
              serverContent.outputTranscription (lo que dijo el TUTOR)
              serverContent.turnComplete
```

**Arquitectura de adapters:** ENV `VOICE_ENGINE` controla qué motor se usa:
- `gemini_live` (default) — Gemini 3.1 Live nativo, ~500ms latencia, voz Aoede.
- `elevenlabs_pipeline` — Whisper + Gemini text + ElevenLabs TTS, ~2s latencia, voces Lucia/Melanie.

Cambiar de motor: `heroku config:set VOICE_ENGINE=elevenlabs_pipeline`. Sin redeploy.

### Mapeo voces ElevenLabs ↔ tutores

| Tutor | Voice ID | Nombre | Uso |
|---|---|---|---|
| coach | `yA5jrK1S9cpCAojBYyMu` | Lucia (warm, expressive) | Live (si pipeline) + previews |
| sincerist | `bN1bDXgDIGX5lw0rtY2B` | Melanie (clear, professional) | Live + previews + feedback audio |
| arcade | `93IsRN8Mhs3FMPjO05OH` | Alt voice 1 | Live + previews |
| diagnostic | `9rvdnhrYoXoUt4igKpBw` | Alt voice 2 | Onboarding hidden assessment |

### Visualizador shader Aura

Componente `AgentAudioVisualizerAura` (adaptado de LiveKit + Unicorn Studio, sin deps LiveKit/Framer Motion). WebGL puro que toma `{status, audioLevel}` del hook `useLiveVoice` y reacciona en tiempo real. Estados visuales: idle / connecting / listening / speaking / error / ended.

---

## 7. Pedagogía configurable (super_prompt + analyzer)

### Cómo se construye el prompt del sistema

`services/super_prompt.py:build_super_prompt(user, template, topic, recent_errors)` lee los **22 campos** del template y los traduce a reglas concretas:

- `response_length` → "MÁXIMO 1 oración" (terse) ... "3-4 oraciones" (long)
- `warmth_level` → desde "profesional y distante" hasta "súper cálido y entusiasta"
- `correction_mode` → desde "NO corrijas NUNCA" hasta "señalá brevemente errores graves"
- `opening_style` → "direct / warm / playful"
- `proactive_questions` → "Cerrá CADA turno con UNA pregunta abierta"
- `tutor_shares_opinions` → "Compartí opiniones / datos breves" o "Mantenete en modo facilitador"
- etc.

Mismo prompt incluye:
- Perfil del alumno (nombre, CEFR, idiomas)
- Tópico activo (seed prompt del nivel CEFR del alumno, keywords-pivote conversacionales como sugerencia opt-in)
- Errores recientes (modo insistente: "el alumno tropieza con verbos irregulares, creá contextos para que practique sin señalárselo")
- Reglas duras (idioma objetivo siempre, no corregir en vivo si correction_mode != strict, una pregunta no tres, etc.)

### Análisis post-sesión

`services/session_analyzer.py:analyze_session(session_id)`:

1. Lee sesión, user, template, topic, transcript completa.
2. Construye prompt según `correction_focus`, `error_threshold`, `max_feedback_items`, `praise_count` y los 5 `report_include_*`.
3. Llama Gemini 2.5 Flash con `responseMimeType: application/json`.
4. Devuelve JSON estricto:
   ```
   {
     score: 0-100,
     praise: [3 elogios concretos],
     feedback: [{type, label, snippet_wrong, snippet_correct, why}],
     summary: "2-3 oraciones narrativas",
     connector_suggestions: ["however", "in fact", ...],
     vocab_suggestions: [{word, context, why}],
     pronunciation_notes: [{word, issue, tip}],
     next_session_tip: "1 oración",
     metrics: {words_spoken, wpm, keywords_hit, keywords_total}
   }
   ```
5. Guarda en DB, genera `error_logs` para cada feedback item, actualiza streak del user.

Corre en **background** (no bloquea `/end`). El frontend hace polling de `sessions.{id}` cada 2s hasta `status === 'analyzed'`.

---

## 8. Frontend — estructura

### Rutas principales (`App.tsx`)

| Path | Componente | Auth | Descripción |
|---|---|---|---|
| `/` | `RootRedirect` | público | si logueado redirige a `/app`, sino muestra `Landing` |
| `/login` | `Login` | público | login + 2 botones quick-login (Usuario / Admin) |
| `/app/*` | `WebApp` | autenticado | shell del alumno |
| `/admin/*` | `Backoffice` | autenticado | solo visible si role=admin |

### WebApp (`/app/*`)

| Sub-ruta | Vista |
|---|---|
| `/app` | **Hoy** — racha, mission card, últimas sesiones |
| `/app/practicar` | **Practicar** — selector de tópico (intereses #1..#N destacados, tema libre, catálogo) → orbe shader Aura + transcripción en vivo + reporte al cierre |
| `/app/mapa` | **Mapa** — progreso por tópico |
| `/app/historial` | **Historial** — lista de sesiones |
| `/app/perfil` | **Perfil** — tutor activo, intereses (drag&drop reorder, agregar/quitar del catálogo), settings, plan, logout |

Sidebar tiene sección **"Admin"** condicional con link a `/admin` solo si `user.role === 'admin'`.

### Backoffice (`/admin/*`)

| Sub-ruta | Vista |
|---|---|
| `/admin` | **Resumen** — KPIs + distribución templates + top errores |
| `/admin/templates` | **Lista** templates con búsqueda + paginación |
| `/admin/templates/:id` | **Editor** del template (rigor, retos, voz, tonos, switches, **+ 20 campos v3 pedagógicos**) |
| `/admin/topicos` | **Lista** tópicos por categoría con búsqueda + paginación |
| `/admin/topicos/:id` | **Editor** del tópico (seed prompts por nivel CEFR, keywords) |
| `/admin/alumnos` | **Lista** alumnos con búsqueda + filtro por nivel |

### Hooks clave

- `useLiveVoice({onAudioLevel, onTranscript, onError})` — captura mic 16kHz, WS al backend, recibe transcript del tutor + del usuario, reproduce audio del tutor 24kHz. Status: idle/connecting/listening/speaking/error/ended.
- `useAuth()` — JWT en localStorage, refresh cada 5min, redirect 401.
- `useAgentAudioVisualizerAura(status, audioLevel)` — devuelve `{speed, scale, amplitude, frequency, brightness}` interpolados con rAF para el shader.

### Cliente API (`services/api.ts`)

Wrappers tipados: `authAPI`, `meAPI`, `templatesAPI`, `topicsAPI` (con `reorder`), `sessionsAPI` (con `analyzeTurn` disponible pero no usado), `alumnosAPI`, `dashboardAPI`, `ttsAPI` (con `play()` que reproduce blob), `pushAPI`. + `buildVoiceWsUrl(sessionId)` para WS.

---

## 9. Smoke tests

### `backend/scripts/smoke_test.py` — integraciones externas (8 checks)
1. **DB Aiven** — connect + SELECT VERSION()
2. **Gemini text** — completion básica
3. **Gemini Live (WS)** — setup completo + envío de audio real (detecta deprecations de protocolo)
4. **Groq Whisper** — transcribe 1s de silencio
5. **Cloudinary** — ping API
6. **SMTP Brevo** — login STARTTLS
7. **ElevenLabs** — sintetiza con las 4 voces, valida MP3
8. **Backend import** — `main:app` carga y registra rutas

### `backend/scripts/smoke_endpoints.py` — 37 endpoints HTTP contra prod
Recorre cada endpoint con auth admin y student, valida 200/403/422/500. Detecta:
- Rutas mal ordenadas (`/reorder` vs `/{topic_id}`)
- SQL inválido en MySQL (NULLS LAST que no soporta)
- Permisos (admin-only correctos, student bloqueado)

### Migraciones

- `scripts/create_database.py` — crea schema `hablah` en Aiven (idempotente)
- `scripts/init_db.py` — `Base.metadata.create_all` + seed admin
- `scripts/migrate_v1.py` — agrega columnas Habláh a `users`
- `scripts/migrate_v2_position.py` — agrega `position` a `user_interests`
- `scripts/migrate_v3_template_config.py` — agrega 20 columnas pedagógicas a `templates` + setea defaults por preset

### Seeds
- `scripts/seed_hablah.py` — 3 templates + 8 tópicos base + perfil admin
- `scripts/seed_more_topics.py` — 23 tópicos más (deportes, gastronomía, ciencia, etc.)
- `scripts/reseed_keywords.py` — actualiza keywords técnicas a frases-pivote conversacionales
- `scripts/seed_demo_users.py` — crea user demo student con perfil completo

---

## 10. Deploy

### Backend (Heroku)
```bash
git push heroku main
```

Buildpacks:
1. `https://github.com/lstoll/heroku-buildpack-monorepo` (con `APP_BASE=backend`)
2. `heroku/python`

`Procfile`: `web: gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
`runtime.txt`: `python-3.11.7`

Config vars críticas: DB_*, SECRET_KEY, GEMINI_API_KEY, GROQ_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_MODEL, ELEVENLABS_DEFAULT_VOICE_ID, CLOUDINARY_*, SMTP_*, VAPID_*, VOICE_ENGINE, CORS_ORIGINS, FRONTEND_URL.

### Frontend (Netlify)
```bash
cd frontend && npm run build && netlify deploy --dir=dist --prod
```

`netlify.toml` en raíz: `base="frontend"`, `publish="dist"`, `command="npm install && npm run build"`. SPA redirect `/*` → `/index.html`.

`.env.production`: `VITE_API_URL=https://hablah-api-abcaf6c43a5d.herokuapp.com/api`, `VITE_APP_NAME=Habláh`.

---

## 11. Decisiones de arquitectura registradas

### Por qué voz live = Gemini, no ElevenLabs en tiempo real
ElevenLabs es excelente TTS pero conectarlo a una conversación en vivo requiere pipeline Whisper+LLM+ElevenLabs = ~2s de latencia por turno. Gemini Live tiene audio nativo bidireccional con latencia ~500ms y voces aceptables (Aoede). Decisión: Gemini para conversación, ElevenLabs para previews/feedback/samples donde la calidad de voz importa más que la latencia.

### Por qué NO live error correction (solo al cierre)
Probamos diseñar chips de error en vivo (Gemini text analizando cada turno) pero:
1. Satura visualmente al alumno mientras habla.
2. Suma costo (~$0.001 por turno × N turnos).
3. Rompe la pedagogía moderna ("no interrumpir mientras habla").

Decisión: análisis solo al cierre con Gemini Pro, reporte rico y configurable.

### Por qué keywords son OPCIONALES
Las primeras keywords seedeadas eran jerga técnica ("non-linear", "homage", "indie") imposibles de meter en charla natural. Las reescribimos a **frases-pivote conversacionales** ("rewatchable", "blew my mind", "stuck with me") y en el super-prompt se le dice al tutor literal: "no obligues al alumno a usarlas, no se las menciones". El panel lateral las marca verdes ✓ si las usás — es feedback visual, no instrucción.

### Por qué adapters de voz
ENV `VOICE_ENGINE` permite cambiar de proveedor sin tocar código. Si mañana Google sube precios o sale algo mejor, cambiamos `gemini_live` → `openai_realtime` y listo. El frontend no se entera.

### Por qué pedagogía configurable v3
El usuario reportó que "las respuestas son muy largas" y "el tono es de profesor de los 70". En lugar de hardcodear "respuestas cortas + tono amable", cada **template** ahora tiene 20 columnas que controlan todos esos parámetros. Un admin desde `/admin/templates/:id` puede crear "Interview Coach" con `correction_mode=explicit_strict, warmth=2, response_length=terse` y tener un producto B2B distinto sin tocar código.

### Por qué un solo login (admin ve TODO)
Misma cuenta, distinto rol. En sidebar de `/app`, si `user.role === 'admin'`, aparece bloque "Admin → Backoffice" dorado que lleva a `/admin`. Backend protege con `require_role("admin")`. Decisión simple, sin URLs duplicadas ni segundo login.

---

## 12. Bugs conocidos / pendientes

| Tema | Estado | Plan |
|---|---|---|
| UI editor admin del template con 20 campos v3 | **Pendiente** | Fase 3 del sprint actual: 5 secciones colapsables (Conversación / Corrección / Reporte / Arranque / Dinámica) |
| `SessionReportOverlay` muestra solo elogio básico, no las 5 secciones nuevas del reporte v3 | **Pendiente** | Fase 4: render condicional según `report_include_*` |
| Página `/app/sesiones/:id` (ver reportes pasados desde historial) | **No existe** | Fase 4: ruta nueva con mismo overlay reutilizado |
| Transcripción del tutor no aparecía | **Arreglado** | Faltaba capturar `outputTranscription` en `gemini_live_engine.py` |
| Live API a veces tarda en responder | Conocido | Gemini Live está en preview — si supera 3s, agregar fallback a `elevenlabs_pipeline` |
| ScriptProcessorNode deprecated (warning de Chrome) | Bajo impacto | Migrar a AudioWorklet en `useLiveVoice.ts` cuando tengamos tiempo |
| Modo insistente no auto-genera sesión de rescate | **No implementado** | Cuando un `error_key` se repite 3× sin resolver, `/api/sessions/start` debería forzar `topic` y `super_prompt` con foco en ese error |

---

## 13. Glosario rápido

- **CEFR** — Common European Framework of Reference for Languages (A1..C2)
- **Template** — perfil pedagógico del tutor (Coach / Sincerist / Arcade)
- **Tópico** — tema de conversación (UK Garage, F1, Patagonia, etc.)
- **Sesión** — una charla individual entre alumno y tutor
- **Recast** — técnica pedagógica: reformular naturalmente sin marcar el error
- **VAD** — Voice Activity Detection (Gemini detecta inicio/fin de turno por silencio)
- **Super-prompt** — instrucción de sistema completa que se inyecta a Gemini Live al iniciar sesión
- **Modo insistente** — bloqueo automático que fuerza misión de rescate al detectar error repetido 3+ veces
- **Misión de rescate** — sesión con tópico y super-prompt forzados a practicar UN error específico

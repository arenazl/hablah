# Habláh — Próximos Pasos & Contexto para el siguiente agente

> Última actualización: 2026-06-15
> Propósito: que el próximo agente no repita errores ya cometidos, no pruebe
> caminos ya descartados, y sepa exactamente dónde estamos y hacia dónde vamos.

---

## 0. Estado del sistema HOY (snapshot)

### Lo que está LIVE en producción

| Feature | Estado | Flag / Config |
|---|---|---|
| Motor JIT kids A0 (narrativa de espina) | **LIVE** | `COMPOSER_MODES=staged_vocab` |
| Proto 9 bloques XML kids A0 | **LIVE** | `PROTO_KIDS_A0=1` |
| Identidades de tutor en BD (4 student_types) | **LIVE** | — |
| Rieles por nivel (methodology_modules) | **LIVE** | — |
| age_group → student_type → 9 bloques JIT | **LIVE** (2026-06-15) | — |
| Motor kids A1+ (junior/tween) | **LIVE** | reglas hardcodeadas en super_prompt.py |
| Motor adultos A0-C2 | **LIVE** | super_prompt.py legacy |
| 20 perfiles demo variados (teen/young_adult/adult/senior × A0-C2) | **LIVE** | seed_user_profiles.py |
| Observabilidad: prompt_circuit por sesión | **LIVE** | sessions.prompt_circuit |
| Voz nativa: gemini-3.1-flash-live-preview | **LIVE** | `VOICE_ENGINE` vacío |

### Lo que está DEPLOYADO pero apagado

| Feature | Cómo activar | Nota |
|---|---|---|
| Engine gemini_text_eleven (Gemini TEXT → ElevenLabs WS) | `VOICE_ENGINE=gemini_text_eleven` | Funciona con ai_studio pero audio cortado; Vertex = solución real |

---

## 1. Los 9 bloques del compositor — el circuito completo

El prompt de cada clase se ensambla Just-In-Time cruzando estas 9 secciones
(implementado en `backend/services/composer_proto.py`):

| Bloque | Nombre XML | Pata del motor | Datos en BD |
|---|---|---|---|
| 1 | `runtime_context` | Transversal | Fecha actual, idiomas del user |
| 2 | `tutor_profile` | COACH (pata 3) | `student_types.tutor_mascot/identity` |
| 3 | `pedagogical_rules` | COACH (pata 3) | `student_types.session_focus` |
| 4 | `gamification_focus` | COACH (pata 3) | `student_types.session_focus` (sub-sección) |
| 5 | `student_profile` | ALUMNO (pata 4) | `users.nombre`, `cefr_level`, `age_group` |
| 6 | `behavioral_guards` | NIVEL/METODOLOGÍA (pata 2) | `methodology_modules.ai_restraints` |
| 7 | `current_lesson_vocabulary` | TÓPICO × NIVEL (patas 1+2) | `topic_module_content.allowed_vocabulary` |
| 8 | `story_timeline` | COACH + TÓPICO (patas 3+1) | `topic_module_content.story_spine` |
| 9 | `start_execution_command` | COACH + TÓPICO (patas 3+1) | `topic_module_content.start_trigger` |

**La edad dispara todo:** `users.age_group` (mini/junior/tween para kids, teen/young_adult/adult/senior para adultos) → mapea a un `student_types.slug` → inyecta la persona del tutor (bloques 2-4) + los rieles del nivel (bloque 6).

---

## 2. Caminos DESCARTADOS — no repetir, ya perdimos horas

### Voz
- **Cascade casero (`elevenlabs_pipeline`)**: el STT (Whisper/Groq) alucina — inventa palabras que el usuario no dijo. Audio limpio pero comprensión basura. Descartado.
- **gemini_text_eleven con ai_studio**: NINGÚN modelo Live de ai_studio soporta `responseModalities=TEXT`. Todos cierran con error 1007. El único que acepta TEXT en ai_studio es `gemini-3.5-live-translate-preview`, pero es de traducción — no sirve de coach.
- **Vertex via metadata server**: el `_get_vertex_token()` viejo asumía el metadata server de Cloud Run. En Heroku NO existe ese endpoint. Hay que generar el token desde las env vars del Service Account.

### Pedagógico
- **Tests simulados propios para medir calidad**: dieron 80/100 pero la sesión real con micrófono dio ~20/100. La única vara de calidad pedagógica ES la sesión real. Los tests propios solo sirven para lo mecánico (latencia, no-freeze, formato).
- **El nudge AVANCE (sumar palabras rápido)**: empeoró el problema del "desfile". La clase necesita EXPLORAR una idea en profundidad, no correr a la próxima palabra.
- **"English only" en el prompt de kids A0**: contradice la mezcla ES+EN que es la base del método. El coach en A0 habla 90% en español.
- **pinned_vocabulary pegado al tópico**: el léxico se genera del cruce tópico×nivel, no se pre-almacena en el tópico.
- **Onomatopeyas en el riel**: deben estar solo en el enfoque (pata coach), no duplicadas en el riel (pata nivel). Regla: si no cambia con el nivel, va en el enfoque.

### Infraestructura
- **Cloud Run para el backend**: reciclaba instancias cada 20-50min y cortaba la clase (WS se cerraba). Migrado a Heroku Basic dyno. No volver a Cloud Run para el backend de voz.
- **Gemini 1011**: si el WS de Gemini cierra con código 1011 "prepayment credits depleted" = se agotaron los créditos de AI Studio, NO es un bug. Fix: recargar créditos o switch a pay-as-you-go.

---

## 3. Bugs activos y sus causas conocidas

| Bug | Causa real | Workaround hoy | Fix real |
|---|---|---|---|
| Audio se corta / "tijerazo" | `gemini-3.1-flash-live-preview` es native-audio: cuando el texto se adelanta al audio, Google hace flush y salta una frase | Nada (es limitación del modelo en preview) | Migrar a Vertex `gemini-live-2.5-flash` (half-cascade, soporta TEXT) |
| Coach valida respuestas que el alumno no dijo | Prompt mal calibrado o modelo complaciente | Los rieles del bloque 6 tienen regla explícita "NUNCA MIENTAS" | Validar con sesiones reales, refinar regla en methodology_module.ai_restraints |
| La clase es un "desfile" de palabras | El coach prioriza "hacelo decir la palabra" en vez de "explicale el mundo" | Proto del doc mejora esto (narrativa de espina) | Rediseñar enfoque del coach: unidad = escena/idea, no = palabra |

---

## 4. Próximos pasos priorizados

### P0 — Crítico (antes de cualquier feature nueva)

**4.1. Migrar voz a Vertex half-cascade**
- **Problema**: `gemini-3.1-flash-live-preview` hace tijerazo de audio (texto adelanta al audio → Google flushea → salta una frase).
- **Solución**: Vertex AI `gemini-live-2.5-flash` soporta TEXT (half-cascade) → combinado con ElevenLabs WS da audio impecable + comprensión real.
- **Engine ya escrito**: `backend/services/voice_engines/gemini_text_eleven_engine.py`. Solo hay que cambiar la auth de ai_studio a Vertex.
- **Pasos**:
  1. [USUARIO] En GCP proyecto `hablah-prod`: habilitar Vertex AI API, crear Service Account con rol `roles/aiplatform.user`, bajar las 3 keys (`project_id`, `client_email`, `private_key`).
  2. [CLAUDE] Cambiar la conexión de `gemini_text_eleven_engine.py`: URL `aiplatform.googleapis.com` + Bearer token generado desde Service Account env vars (NO metadata server).
  3. Config Heroku: `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` (reparar `\n` → newline real), `VOICE_ENGINE=gemini_text_eleven`.
- **Riesgo**: la auth desde Heroku puede dar pelea (private_key con `\n` literal). Encarar con tiempo, no apurado.

**4.2. Observabilidad persistida**
- Hoy el prompt_circuit se loguea a stdout de Heroku (efímero, rota ~1500 líneas).
- `sessions.prompt_circuit` ya tiene la columna (JSON). Necesita un panel en el backoffice `/admin/sesiones/:id` para ver el circuito completo de una sesión pasada.
- Sin esto no se puede auditar la calidad de ninguna clase real.

### P1 — Pedagógico

**4.3. Onboarding UI (frontend)**
- Los campos ya están en la BD: `english_self_level`, `learning_goal`, `occupation`, `age_group`, `onboarding_done`.
- Falta el flujo de 4-5 preguntas al registrarse. Cuando `onboarding_done = False`, mostrar el wizard antes de la primera clase.
- Mapeo `english_self_level → cefr_level`:
  - `zero → A0` / `survival → A1` / `basic → A2` / `intermediate → B1` / `upper → B2` / `advanced → C1` / `near_native → C2`

**4.4. Fix del "desfile" pedagógico (problema #1 real)**
- Evidencia real (sesión #574, Timi, superhéroes): el alumno se queja en vivo "no me ibas explicando", "si no me explicás qué es cape".
- El coach actual hace: presentá palabra → hacé decirla → siguiente palabra. Eso es una lista, no una clase.
- Fix: la unidad de la clase pasa de "una palabra" a "una escena/idea explorada con contexto". El coach explica el mundo, hace preguntas sobre el tema, y las palabras aparecen dentro de la explicación (no al revés).
- Implementar: ajustar `methodology_modules.ai_restraints` para kids y refinar el `session_focus` de los student_types.

**4.5. Probar PROTO_KIDS_A0=1 con Timi en vivo**
- El proto de 9 bloques está activo en prod con datos reales de BD.
- Verificar que `student_type_data` y `methodology_module` se inyectan (revisar logs `prompt_circuit` en Heroku).
- Hacer una sesión de prueba real con el niño y evaluar la narrativa.

### P2 — Curriculum y backoffice

**4.6. Llenar TopicModuleContent para kids**
- Los bloques 7-9 del compositor usan `topic_module_content.allowed_vocabulary`, `story_spine`, `start_trigger`.
- Hoy para la mayoría de tópicos kids ese junction está vacío → el coach elige el vocab del tema.
- Curar a mano 5-10 tópicos principales de kids (animales, comidas, superhéroes, dinosaurios, espacio) con vocab + story_spine + start_trigger.

**4.7. Conectar age_group adulto al motor**
- Los adultos con `age_group = "teen"/"young_adult"/"adult"/"senior"` todos mapean a `student_type = "adult"` por ahora.
- En el futuro: crear variantes de `student_type` adulto por grupo etario (teen-adulto = más informal + referencias pop; senior = más paciente + referencias clásicas).

**4.8. Panel de observabilidad en backoffice**
- `/admin/sesiones/:id` → ver prompt_circuit + prompt_final + transcript de esa sesión.
- Es la herramienta principal para auditar la calidad pedagógica sin acceder a Heroku logs.

### P3 — Features

**4.9. Modo insistente automático**
- Cuando `error_logs.error_key` se repite 3 veces sin `resolved = true`, `/api/sessions/start` debería forzar `topic` y un super_prompt con foco exclusivo en ese error.
- La lógica de detección ya existe; falta el trigger automático.

**4.10. Historial de sesiones con reporte completo**
- `/app/sesiones/:id` (ruta no existe aún) — ver el reporte completo (score, elogios, feedback, vocab sugerido, tip para la próxima).
- Reutilizar el `SessionReportOverlay` ya existente.

---

## 5. Mapa del código — archivos clave

```
backend/
  services/
    super_prompt.py          — orquestador principal del prompt (900+ líneas)
                               Función clave: build_super_prompt(**kwargs) → str
                               is_kid = age_group in ("mini","junior","tween") [CORREGIDO 2026-06-15]
    composer_proto.py        — 9 bloques XML JIT con datos reales de BD [REESCRITO 2026-06-15]
    gemini_live.py           — engine de voz; resuelve student_type_data + methodology_module
                               antes de llamar a build_super_prompt [ACTUALIZADO 2026-06-15]

  models/
    methodology.py           — StudentType, MethodologyModule, TopicModuleContent, MethodologyStage(legacy)
    user.py                  — User model, age_group VARCHAR(20) [AMPLIADO 2026-06-15]
                               Nuevos campos: english_self_level, learning_goal, occupation, onboarding_done

  api/
    methodology_modules.py   — GET/PATCH student-types (identidades del tutor)
                               GET/POST/PATCH/DELETE methodology-modules (rieles)
    me.py                    — is_kid corregido [2026-06-15]

  scripts/
    migrate_v15_student_type_persona.py  — agrega cols tutor_* a student_types
    migrate_v16_user_profile.py          — amplía age_group + agrega campos onboarding
    seed_tutor_personas.py               — identidades para mini/junior/tween/adult
    seed_user_profiles.py                — 20 perfiles demo variados

frontend/
  src/pages/
    AdminMetodologiaPanel.tsx  — 2 tabs: "Identidades de tutor" + "Rieles por nivel"
```

---

## 6. Reglas de oro del proyecto (no romper)

1. **Nunca modificar un módulo sin consentimiento previo**: proponer el cambio, esperar "dale", recién editar. Aplica a super_prompt.py, composer_proto.py, schemas, configs de voz.
2. **Datos, no suposiciones**: antes de diagnosticar cualquier problema de voz o pedagógico, correr `heroku logs -a hablah-api` o el script `diag_last_session.py <usuario>` y leer datos reales.
3. **El test de 1 línea para ubicar cualquier regla nueva en el motor**:
   - ¿Cambia con el nivel (A0 ≠ B2)? → **riel** (`methodology_modules.ai_restraints`)
   - ¿Cambia con la edad/segmento, pero igual en todos sus niveles? → **enfoque** (`student_types.session_focus`)
   - ¿Es el tema? → **tópico** (`topics`)
   - ¿Es de este alumno puntual? → **alumno** (`users` + `error_logs`)
4. **Deploy siempre directo a prod**: `netlify deploy --dir=dist --prod` (nunca preview). `git push heroku main` para el backend.
5. **3 pasos por cada cambio**: `git push origin main` + `git push heroku main` + `netlify deploy --dir=dist --prod` (ninguno auto-deploya).
6. **La vara de calidad pedagógica = sesión real con micrófono**. Tests simulados solo sirven para lo mecánico.
7. **is_kid = age_group in ("mini", "junior", "tween")** — no `bool(age_group)`. Los adultos tienen age_group "teen/young_adult/adult/senior" y no deben activar el motor kids.

---

## 7. Variables de entorno críticas en Heroku

```bash
VOICE_ENGINE=                     # vacío = gemini_live nativo (default)
COMPOSER_MODES=staged_vocab       # activa motor JIT para kids A0
PROTO_KIDS_A0=1                   # activa proto 9 bloques XML para kids A0
GEMINI_API_KEY=...                # AI Studio key
GEMINI_THINKING_BUDGET=1024       # anti-freeze (no bajar de 1024)
GEMINI_ACTIVITY_HANDLING=NO_INTERRUPTION  # anti-freeze
# Pendientes para Vertex:
# GOOGLE_PROJECT_ID=...
# GOOGLE_CLIENT_EMAIL=...
# GOOGLE_PRIVATE_KEY=...          # respetar \n como newline real
```

---

## 8. Milestones del producto

| Milestone | Condición de éxito | Estado |
|---|---|---|
| **M1: Motor kids A0 funciona** | El chico aprende una palabra en contexto sin "desfile" | Parcial (narrativa de espina activa, pero desfile pedagógico sigue) |
| **M2: Voz sin tijerazo** | El audio del coach llega completo, ninguna frase cortada | Pendiente (requiere Vertex) |
| **M3: Onboarding conectado al motor** | La edad capturada dispara el tutor + rieles correctos | BD lista; falta UI del onboarding |
| **M4: Observabilidad** | Se puede auditar el prompt + transcript de cualquier clase pasada desde el backoffice | Parcial (logs en Heroku, falta panel en UI) |
| **M5: Motor adultos diferenciado por edad** | Teens, adultos y seniors reciben enfoques distintos | Pendiente |
| **M6: La clase explica el mundo** | El coach explica el contexto, el alumno dice la palabra porque la entiende, no porque se la pidieron | Pendiente (fix del "desfile") |

---

## 9. Cuentas y accesos en producción

| Recurso | URL / Config |
|---|---|
| Frontend | https://hablah.com.ar (Netlify, proyecto `hablah-app`) |
| Backend | https://hablah-api-abcaf6c43a5d.herokuapp.com (Heroku `hablah-api`) |
| BD MySQL | Aiven `mysql-aiven-arenazl.e.aivencloud.com:23108` schema `hablah` |
| Logs backend | `heroku logs -a hablah-api -t` |
| Cuenta demo admin | `admin@hablah.app` / `admin123` |
| Cuenta demo student | `demo@hablah.app` / `demo123` |
| Cuentas demo variadas | `lucas.f@demo.hablah.app` hasta `eduardo.r@demo.hablah.app` — password: `hablah123` |

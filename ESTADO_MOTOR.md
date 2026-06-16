# Estado del Motor Pedagógico — qué hicimos y qué falta

> Resumen maestro de la sesión del 2026-06-15. Consolida TODO lo que charlamos:
> la doctrina, el modelo de datos, lo que quedó andando y lo que falta.
> Detalle fino en los docs linkeados. Este archivo es el mapa.

---

## 1. La visión (en una frase)

Un profe de inglés por voz que **adapta por nivel hacia el inglés REAL** (no Duolingo,
no listas de vocabulario). **Conversación-first**: el tópico es una excusa para charlar y
practicar estructuras; el profe lleva al alumno de las muletas de principiante ("very
good") al inglés natural que corresponde a su nivel, con recast.

---

## 2. La doctrina cerrada (las reglas de oro — NO romper)

1. **REGLA MAESTRA: estructura de 9 pasos, CERO parches.** Toda conducta nueva = **dato en
   su bloque + su tabla**, nunca un `if`/condicional en el prompt o el composer. Tampoco
   "bolsa de datos" (cada bloque lean, una responsabilidad). Ante algo nuevo: *"¿en qué
   bloque y en qué tabla vive?"*, nunca *"agrego un condicional"*.
2. **Determinismo en 3 capas:**
   - **Estático / nuestro:** el catálogo de tópicos (categoría→subcategoría→tópico, solo
     títulos) + las reglas (rieles, idioma, coach, cierre). Lo decidimos NOSOTROS.
   - **IA batch → persistido → revisado:** el vocabulario (tags guía). Lo genera la IA
     offline, se guarda, lo corregimos. En la clase ya es determinístico.
   - **IA en vivo (acotada):** solo la conversación, bounded por el prompt.
   - **Nunca** dejar que la IA elija tópicos ni improvise vocab en vivo (falló siempre).
3. **Conversación-first:** el tópico es agnóstico; el vocab son **tags que guían**; se
   enseña **gramática + naturalidad por nivel** con recast natural.
4. **El NIVEL es el eje** (7 CEFR estándar A0–C2). El enfoque cambia por nivel.
5. **Coach = persona** (femenino + masculino por segmento), separado de la pedagogía.
6. **Colaboración:** el código lo decide/ejecuta el agente; la arquitectura/pedagogía se
   charla (su pedagogía + mi ingeniería). Nunca decisión pedagógica silenciosa.

Doctrina detallada: `docs/mejoras_pedagogicas/` (notas 00–05).

---

## 3. Los 9+2 bloques y dónde vive cada cosa

| Bloque | Qué | Varía por | Fuente |
|---|---|---|---|
| 1 runtime | fecha/idiomas | — | runtime |
| 2 tutor_profile | quién enseña (persona) | edad/segmento × género | `coaches` |
| 3 pedagogía | cómo enseña | segmento | `student_types.session_focus` |
| 4 gamificación | dinámica | segmento | `student_types` |
| 5 alumno | quién es | individual | `users` |
| 10 learner_state | qué domina/falla/le gustó | alumno | tablas de estado (vacías, fase 3) |
| 6 rieles | forma del idioma + do/don't | nivel × segmento | `methodology_modules.ai_restraints` |
| 6.idioma | ES/EN por nivel | **nivel** | `levels.language_rule` |
| 7 vocab | tags guía | tópico | `topics.generated_vocab` |
| 8 narrativa | historia | tópico×nivel×edad | (generado/fallback) |
| 9 arranque | apertura | tópico×nivel×edad | (generado/fallback) |
| 11 interaction_state | estado vivo del turno | sesión | memoria (fase 3) |

---

## 4. El modelo de datos — CARGADO en prod (Aiven `hablah`)

- **coaches**: 8 (femenino + masculino por mini/junior/tween/adult, con nombre/voz/persona).
- **levels**: 7 (A0–C2) con nombre amigable (Despegue…Maestro) + **regla de idioma por nivel**.
- **categories** (18) → **subcategories** (18, "General" por defecto) → **topics** (166).
- **topics**: los 166 con `category_id`/`subcategory_id` + **`generated_vocab` (157/157 con
  tags de inglés natural generados por IA batch)**.
- **methodology_modules** (rieles): 19, con `language_rule` (a mover/leer de levels),
  `max_session_minutes`/`max_turns` (duraciones por segmento×nivel).
- **student_types**: 4, con `closing_seed` (cierre suave por segmento).
- **Estado del alumno** (vocab_progress, reinforcement_queue, learner_interests,
  learner_traits, session_insights): tablas creadas, **vacías** (las llena el post-clase, fase 3).
- **sessions.raw_session_data**: columna lista para el crudo de cada clase (observabilidad dev).

Schema/seed: `docs/BLUEPRINT_modelo_y_seed.md`. Scripts: `backend/scripts/migrate_v17..v20`,
`seed_coaches/levels/method_layer/catalog`.

---

## 5. Lo que está LIVE (andando ahora)

- **`hablah.com.ar/admin/consola`** — **orquestador**: selectores (segmento/coach/nivel/
  tópico) → los 9 pasos con su fuente + **verde cargado / rojo falta** + el **prompt final
  en vivo** + link a `/llm`.
- **`hablah.com.ar/admin/abms`** — edición CRUD de coaches/niveles/categorías/subcategorías.
- **`hablah.com.ar/llm`** — banco de tuneo de voz (frase-puente A0, panel de VAD/captura).
- **Backend**: `/api/coaches`, `/api/catalog`, `/api/levels`, `/api/orchestrator/resolve`,
  `/api/methodology-modules` (rieles + student-types).
- Voz prod: `gemini-3.1-flash-live-preview` (lo mejor hoy, pero se come palabras / tijerazo).

---

## 6. Lo que FALTA

### A. EL WIRE (lo único grande para que el motor "respire") — handoff listo
Que la **clase real** (`/voice/ws` y `/llm`) LEA el coach/idioma/duraciones/cierre (hoy el
orquestador ya los **compone y muestra**, pero la sesión todavía usa los fallbacks).
**Aditivo, prod-safe.** Paso a paso en **`docs/HANDOFF_consola_motor.md` §4**. Test de éxito:
que el coach A0 deje de decir "now you" y diga "ahora vos".

### B. Pendientes menores / fases siguientes
- **ABM de tópicos/tags**: editar `generated_vocab` desde la UI (hoy se ven en el
  orquestador; falta extender `api/topics.py` + una tab en `/admin/abms`).
- **Voz — alternativa al tijerazo**: half-cascade Vertex (TEXT→ElevenLabs) o OpenAI Realtime.
  Investigación: `docs/INVESTIGACION_MOTOR_PRUEBAS_VOZ.md` (o `Context/`). Vertex pausado por
  bug de cliente/mic, NO de la API.
- **Catálogo**: limpiar `kids-deprecated`/`general` y expandir hacia ~500 tópicos (desde el ABM).
- **Subcategorías reales**: hoy hay una "General" por defecto; curar las reales.
- **Post-clase (fase 3)**: el job batch que llena el estado del alumno (SRS, intereses,
  rasgos) leyendo el crudo. Tablas listas, vacías. Doc: blueprint §8 + docs 06–08 de Motor-Learning.

---

## 7. Mapa de archivos

- **Doctrina pedagógica:** `docs/mejoras_pedagogicas/` (00 índice + 01 duración + 02 cierre +
  03 frases + 04 apertura + 05 conversación-first).
- **Modelo + seed:** `docs/BLUEPRINT_modelo_y_seed.md`.
- **Handoff del wire:** `docs/HANDOFF_consola_motor.md`.
- **Material del modelo (input del dueño):** `Motor-Learning/` (01–08).
- **Backend:** `models/methodology.py` (Coach/Level/Category/Subcategory/StudentType/riel) ·
  `models/learner_state.py` · `services/composer_proto.py` (9+2 bloques) ·
  `services/gemini_live*.py` (voz) · `api/{coaches,catalog,levels,orchestrator,voice,
  methodology_modules}.py` · `scripts/migrate_v17..v20` + `seed_*`.
- **Frontend:** `pages/{AdminConsolaPanel,AdminAbmsPanel,AbmTable,LlmTestPage,Backoffice}.tsx`.

---

## 8. Deploy y accesos

- Front: Netlify → **hablah.com.ar**. Back: Heroku **hablah-api**. DB: Aiven schema **hablah**.
- Cada cambio = 3 pushes: `git push origin main` + `git push heroku main` +
  `cd frontend && npm run build && netlify deploy --dir=dist --prod`. Verificar `/health` 200.
- Admin: `admin@hablah.app` / `admin123`.

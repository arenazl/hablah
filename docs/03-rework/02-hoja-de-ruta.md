# Hoja de ruta del rework — órdenes de trabajo para modelos implementadores

> Autor: Fable (2026-07-09). El análisis y la lógica ya están hechos en
> [`01-analisis-integral.md`](01-analisis-integral.md) — **NO re-analizar, NO re-decidir**. Cada
> orden de trabajo (WO) es autocontenida: contexto mínimo, archivos, cambios, criterios de
> aceptación y verificación. Si algo no cierra con la realidad del código, **frenar y preguntar al
> dueño**, no improvisar una interpretación.

---

## REGLAS GLOBALES PARA EL IMPLEMENTADOR (leer antes de CUALQUIER WO)

1. **Anti-goals intocables:** NO persistir orquestaciones · NO forzar vocab · NO engordar tópicos ·
   NO curar combos masivos · NO meter `if`/parches en `composer_proto.py` (la conducta sale del
   DATO) · NO correr seeds legacy · NO deploy manual (el push a `origin/main` deploya solo).
2. **¿En qué motor lo estás probando?** El motor de producción es **v2** (`composer_proto`, vía
   `gemini_live.py` → `build_super_prompt`). `motor_engine.resolve` (v3) está jubilado. OJO:
   `super_prompt.py` es el wrapper de v2, NO el v1 muerto — no borrarlo por el nombre.
3. **El dato es código.** Toda escritura a tablas de catálogo (`student_types`, `levels`, `topics`,
   `app_config`) va con script **dry-run por defecto → diff visible → backup JSON → `--apply`**.
   Patrón de referencia: `backend/scripts/apply_v3_topics.py`.
4. **Texto ≠ voz.** Los smoke de texto validan el ARMADO del prompt (invariantes duras), nunca la
   calidad pedagógica. La vara de calidad es la voz real con micrófono (la corre el dueño).
5. **Cambios pedagógicos** (prompts, presets, seeds): proponer diff concreto y esperar OK del dueño
   antes de escribir. Cambios técnicos puros: ejecutar directo.
6. **Frontend:** antes de cada push, `npx tsc --noEmit` **y** `npx eslint src/ --ext .ts,.tsx`
   (después de F0-03). Cero emojis en código/UI/datos — iconos SVG (Lucide). Español rioplatense en
   textos de UI.
7. **Cada regla en UNA capa.** Si un WO agrega una directiva en un lugar, DEBE remover las copias de
   los demás lugares en el mismo cambio.
8. **Commits:** convencionales, chicos, un WO puede ser varios commits pero un commit no mezcla WOs.
   Al terminar cada WO: actualizar el estado en este archivo (tabla de abajo) y, si cambió algo
   estructural, el handoff del día.

### Tablero de estado

| WO | Título | Estado |
|---|---|---|
| F0-01 | Un solo motor en todas las superficies de test | pendiente |
| F0-02 | Inventario y retiro de servicios/scripts fósiles | pendiente |
| F0-03 | ESLint + gate de calidad frontend | pendiente |
| F0-04 | Laboratorio separado del producto (`/lab/*`) | pendiente |
| F0-05 | El dato como código: snapshot versionado + limpieza de campos fósiles | pendiente |
| F0-06 | Cobertura mínima de tópicos por celda segmento×nivel | pendiente |
| F1-01 | Capa universal anti-robot (con barrido de duplicados) | pendiente |
| F1-02 | Jerarquía semántica del prompt (recency bias) | pendiente |
| F1-03 | Smoke textual de invariantes del prompt | pendiente |
| F1-04 | Validación por voz del paquete F1 (runbook 5×4) | pendiente |
| F1-05 | Spike: modelo más fuerte para el rol de coach (gate del dueño) | pendiente |
| F2-01 | Post-clase escribe `learner_state` (top-1, ultra liviano) | pendiente |
| F2-02 | El composer usa la historia (y se puede ver en el test) | pendiente |
| F2-03 | Rotación de semilla por sesión (variedad por construcción) | pendiente |
| F3-01 | Regresión + fail-fast de `app_config` | pendiente |
| F3-02 | Push-to-talk opcional para niveles bajos | pendiente |
| F3-03 | Robustez de micrófono (iOS/Android/tablet) | pendiente |
| F3-04 | Flags de Cloud Run fijados declarativamente (con Infra) | pendiente |
| F4-01 | Partir `WebApp.tsx` (3.744 líneas) en módulos | pendiente |
| F4-02 | Estándar viewport/safe-area en todas las superficies | pendiente |
| F4-03 | Flujo de pantallas del producto (IA de navegación) | pendiente |
| F4-04 | Post-clase visible: reporte + progreso ("tu profe se acuerda") | pendiente |
| F4-05 | Sistema de diseño y dirección visual (gate del dueño) | pendiente |
| F4-06 | Circuito visual reactivo kids (direccional, opt-in) | pendiente |
| F5-01 | SEO técnico (prerender, sitemap, metadata, schema) | pendiente |
| F5-02 | SEO de contenido: los 94 tópicos como páginas | pendiente |
| F5-03 | LLM indexing / AEO (llms.txt, FAQ, datos estructurados) | pendiente |
| F5-04 | Branding y mensaje (gate del dueño) | pendiente |

**Orden de ejecución:** F0 completo → F1 → F2 → F3 (F3 puede solaparse con F2) → F4 → F5.
Dentro de cada fase, el orden listado. No arrancar una fase sin cerrar los WO bloqueantes de la
anterior (se indican en cada WO).

---

# FASE 0 — Consolidación (ordenar la casa para no volver a caer en las trampas)

## WO F0-01 — Un solo motor en todas las superficies de test

**Contexto mínimo:** producción corre el motor v2; `/finaltest` y el editor `/motor` todavía
resuelven por v3 (`motor_engine.resolve`). Ese desfase causó el error más caro del proyecto (el
dueño evaluaba un motor que no era el de producción). `/mini-test` ya corre v2 (`resolve_v2` +
ws `/api/voice/ws_mini`) — es el modelo a seguir.

**Archivos:** `backend/api/voice.py` (ws_orchestration), `backend/api/finaltest.py`,
`backend/services/motor_engine.py` (solo para marcar v3 dormido), frontend
`TestFinalConsole.tsx`, `MotorAbmPanel.tsx`, `OrquestacionPanel.tsx`, `ProbarOrquestacion.tsx`,
`TrainingPanel.tsx`.

**Cambios:**
1. `/finaltest` (endpoints + ws): resolver por `motor_engine.resolve_v2` (mismo camino que
   `ws_mini`), conservando lo que ya funciona de la consola (combos perfil/nivel/tópico, reset de
   historia, juez, export .md).
2. Paneles v3-only sin equivalente v2 (`ProbarOrquestacion`, `OrquestacionPanel`,
   `TrainingPanel`, editor `/motor` si no se re-cablea): quitar sus rutas de `App.tsx` y mover los
   archivos a `frontend/src/pages/_attic/` (no borrar).
3. En `motor_engine.py`: docstring al tope de `resolve` (v3): "JUBILADO — no cablear superficies
   nuevas acá; usar resolve_v2". No borrar el código.

**Aceptación:** `grep -rn "motor_engine.resolve(" backend frontend` no devuelve llamadores vivos
fuera de `resolve_v2`; `/finaltest` arma una clase y el visor muestra el prompt v2 (verificable:
A0 mini NO contiene "pregunta cerrada" ni referencias visuales); las rutas del punto 2 devuelven
404 o redirect.

**Verificación:** correr una sesión desde `/finaltest` (texto está bien para esto: es plumbing, no
calidad) y comparar el prompt emitido contra el de `/mini-test` para el mismo cruce → idénticos.

---

## WO F0-02 — Inventario y retiro de servicios/scripts fósiles

**Contexto mínimo:** `backend/services/` acumula generaciones (`composer_rules`, `motor_protocol`,
`runtime_prompt`, `learning_objectives`, `topic_brief`, analizadores). `backend/scripts/` tiene ~50
scripts, varios peligrosos (seeds que pisan dato sano). Nadie sabe cuáles tienen llamadores vivos.

**Cambios:**
1. Para cada servicio: `grep` de llamadores vivos (excluyendo tests/scripts muertos). Generar tabla
   `docs/03-rework/_inventario-servicios.md`: servicio → llamadores → veredicto (vivo / fósil).
2. Fósiles con CERO llamadores: mover a `backend/services/_attic/` (no borrar). Si un import roto
   aparece, ese servicio NO era fósil: revertir y marcar vivo.
3. `backend/scripts/`: crear subcarpetas `_attic/` (fósiles y seeds peligrosos) y dejar en la raíz
   solo los vivos. Agregar `backend/scripts/README.md` con UNA línea por script vivo y la regla
   dry-run/backup (regla global 3).

**Aceptación:** el backend levanta (`uvicorn` local arranca sin ImportError); smoke de los
endpoints principales (login, `/api/voice/ws_mini` handshake, `/finaltest`) responde; el inventario
está en el repo; ningún seed peligroso queda en la raíz de scripts.

---

## WO F0-03 — ESLint + gate de calidad frontend

**Contexto mínimo:** el repo solo corre `tsc --noEmit`; las violaciones de reglas de hooks llegan a
runtime (ya pasó en otro proyecto del dueño: error React #310 en producción). Regla dura global.

**Cambios:** instalar `eslint` + `eslint-plugin-react-hooks` (ESLint 9, flat config); crear
`frontend/eslint.config.js` con `rules-of-hooks: error` y `exhaustive-deps: warn`; arreglar los
errores que aparezcan (los `error`, no necesariamente todos los `warn`); documentar el checklist
(tsc + eslint) en el README del frontend.

**Aceptación:** `npx eslint src/ --ext .ts,.tsx` sale limpio de errores; `npx tsc --noEmit` limpio;
ambos comandos documentados.

---

## WO F0-04 — Laboratorio separado del producto (`/lab/*`)

**Contexto mínimo:** ~16 rutas top-level de test/laboratorio + ~15 paneles `/admin/*` conviven con
el producto en el mismo router y bundle; varias son públicas. El laboratorio se queda (es la mesa de
trabajo del motor), pero separado y protegido.

**Depende de:** F0-01 (los paneles v3 ya se atticaron — no moverlos dos veces).

**Cambios:**
1. Mover TODAS las rutas de laboratorio sobrevivientes (`/llm`, `/finaltest`, `/mini-test`,
   `/auditoria`, `/comparacion`, `/transcripciones*`, `/infra`, `/tune`, `/kids/kit`,
   `/kids/galeria`, `/kids/curar`) bajo el prefijo **`/lab/*`**, con redirects 301 de las viejas
   (el dueño tiene bookmarks).
2. Lazy-load del árbol `/lab` (`React.lazy` + `import()` por ruta) → fuera del bundle inicial del
   producto.
3. Guard de acceso: exigir sesión admin (el JWT ya existe) para todo `/lab/*` salvo lo que el dueño
   comparte públicamente hoy (`/probar-orq` público era v3 → ya murió en F0-01; si algo debe quedar
   público, preguntarle).
4. `App.tsx`: dejar legible la separación — bloque PRODUCTO / bloque LAB, comentario de una línea.

**Aceptación:** el bundle inicial del producto no incluye código de paneles (verificar con
`vite build` + inspección del manifest); `/lab/finaltest` funciona logueado y rebota sin login;
las rutas viejas redirigen.

---

## WO F0-05 — El dato como código: snapshot versionado + limpieza de campos fósiles

**Contexto mínimo:** el catálogo (tablas `student_types`, `levels`, `topics`, `app_config`) es el
código fuente real del motor, pero vive solo en la DB: un batch malo lo corrompe sin diff ni
rollback (ya pasó: truncado de `student_types` 2026-06-24). Además `topics` arrastra campos que el
motor no lee (`seed_prompts` de hasta 10KB; `keywords[7..]`) que confunden a agentes futuros.

**Cambios:**
1. Script `backend/scripts/snapshot_catalogo.py`: exporta las 4 tablas a
   `data/catalogo/*.json` (ordenado, estable, UTF-8) — dry-run no aplica acá (es read-only).
   Se corre a mano tras cada cambio de catálogo y el JSON se commitea. El diff de git ES el diff
   del dato.
2. Correrlo ya y commitear el snapshot inicial (post-curación v3: 94 tópicos activos).
3. Campos fósiles de `topics`: **NO borrar dato**. Agregar en `backend/models/template.py`
   comentario `# FÓSIL: el motor no lee este campo (composer_proto usa keywords[:6] y
   generated_vocab)` sobre `seed_prompts`; y una nota equivalente en
   `docs/motor-catalogo/README.md` (qué campos son vivos: `title`, `levels`, `category`,
   `segmento`, `keywords[:6]`, `generated_vocab`, `is_active`).
4. Hook del proceso: agregar al README de scripts (F0-02) la regla: "cambiaste catálogo → corré
   snapshot y commiteá".

**Aceptación:** `data/catalogo/` en git con las 4 tablas; correr el snapshot dos veces seguidas da
diff vacío (export estable); comentarios de fósiles en el modelo y el README.

---

## WO F0-06 — Cobertura mínima de tópicos por celda segmento×nivel

**Contexto mínimo:** medido 2026-07-09 contra la DB: mini/junior topean en A2 (correcto por
diseño), adultos está cubierto (33-62 por nivel; C2=17, aceptable), pero **teen B1/B2 tiene solo 2
tópicos** — un teen que progresa a B1 agota el catálogo en 2 clases. Es trabajo de DATO (curación),
no de motor.

**Depende de:** F0-05 (snapshot antes de tocar catálogo).

**Cambios:** (1) proponer al dueño una lista de 6-8 tópicos teen aptos B1/B2 (o extensión de
`levels[]` de tópicos teen existentes cuyo contenido lo banque — ej. "Cuidar el planeta", "Trabajos
del futuro" ya insinúan B1) — **gate del dueño: es curación pedagógica**; (2) aplicar con el patrón
dry-run/backup; (3) agregar al smoke F1-03 la invariante de cobertura: ninguna celda
segmento×nivel servida por la app con < 5 tópicos activos (las celdas por-diseño-vacías, como mini
B1+, se declaran en una lista de excepciones).

**Aceptación:** teen B1/B2 ≥ 6 tópicos activos con contenido real (keywords + frases-ancla, no
cáscara); smoke de cobertura en verde; snapshot commiteado.

---

# FASE 1 — Motor y actor: matar el robotismo (el problema de calidad #1)

## WO F1-01 — Capa universal anti-robot (con barrido de duplicados)

**Contexto mínimo:** el "cómo se conversa" (variá, reciclá lo que dice el alumno, seguí su interés,
la estructura es vehículo no guion, no recites objetivos) está hoy repartido y duplicado entre
seeds y form_rules de varios presets → las copias compiten y el modelo promedia hacia lo mecánico.
Decisión settled: es transversal a TODA clase → vive en UNA capa que el composer apila SIEMPRE.
**Es un cambio pedagógico: el texto de la directiva lo aprueba el dueño antes de escribir.**

**Depende de:** F0-01 (probar sobre un solo motor), F0-05 (snapshot antes de tocar dato).

**Archivos/tablas:** `backend/services/composer_proto.py` (un bloque nuevo, sin `if`s),
`app_config` (la directiva como dato), presets de `student_types`/`levels` (el barrido).

**Cambios:**
1. Redactar la directiva universal (8-12 líneas imperativas, EN, una sola voz). Base: las reglas
   anti-robot hoy dispersas + el criterio "imperativas y que no compitan". DEBE incluir el bloque de
   **honestidad conversacional** (insight de campo del dueño, 2026-07-09: el coach validaba hechos
   falsos por sycophancy — "sí, qué buen partido" ante un partido inexistente): *nunca afirmar haber
   visto/leído/vivido algo; nunca confirmar un hecho que no conocés; convertir el no-saber en
   curiosidad que devuelve el turno ("I missed that one — tell me about it!"); corregir LENGUAJE
   (recast), jamás hechos del alumno.* El envoltorio etario va en EDAD (kids: entrar a la
   imaginación explícitamente como juego; adultos: honestidad casual). **Presentar el texto al
   dueño → OK → recién escribir.**
2. Guardarla como dato en `app_config` (clave nueva, ej. `universal_conversation_rules`).
3. `composer_proto`: apilarla SIEMPRE como bloque propio, **cerca del final** del stack (después de
   los guards, antes del arranque) — posición elegida por el recency bias. Fail-fast si falta
   (`MotorDataMissing`), como todo lo demás.
4. **Barrido:** en el MISMO cambio, remover de seeds/form_rules toda oración que repita lo que la
   capa universal ya dice (script de dato con dry-run+backup, patrón regla global 3). Una regla,
   una capa.

**Aceptación:** el prompt de cualquier cruce contiene el bloque universal UNA vez; `grep` de las
frases clave de la directiva sobre el dump de presets (snapshot F0-05) da 0 duplicados; el smoke
F1-03 pasa; snapshot commiteado antes y después.

---

## WO F1-02 — Jerarquía semántica del prompt (recency bias)

**Contexto mínimo:** los bloques finales del stack (arranque/seeds) pesan más que los del medio
(guards) → cuando chocan, gana el seed y el coach descarrila. Recomendación textual de Gemini
(dueño del modelo de voz): envolver la producción esperada en una etiqueta de alta prioridad para
forzar atención sin depender del orden.

**Depende de:** F1-01 (van al mismo paquete de validación por voz).

**Archivos:** `backend/services/composer_proto.py` (solo estructura XML, cero lógica nueva).

**Cambios:** envolver `Expected_Production` (bloque 7) en una etiqueta de alta prioridad (ej.
`<critical_objective>…</critical_objective>` con una línea introductoria imperativa); revisar que
los nombres de los demás tags sean semánticos (renombrar solo si alguno es críptico); NO cambiar el
orden de los bloques ni el contenido de los presets.

**Aceptación:** diff de `composer_proto.py` toca solo el armado de strings XML; el prompt generado
para 3 cruces (mini A0, junior A2, adultos B1) muestra la etiqueta bien formada; smoke F1-03 pasa.

---

## WO F1-03 — Smoke textual de invariantes del prompt

**Contexto mínimo:** hace falta un gate de regresión BARATO que corra tras cada cambio de
motor/dato y cache errores groseros de armado ANTES de gastar validación por voz. NO mide calidad
pedagógica (texto ≠ voz): mide invariantes duras.

**Archivos:** nuevo `backend/scripts/smoke_prompt_invariants.py` (+ opcional job de CI).

**Cambios:** script que para CADA cruce edad × nivel (4 × 7) con un tópico por segmento:
1. Genera el prompt vía `resolve_v2` y valida invariantes **estructurales**: cero placeholders sin
   interpolar (`{topic}`, `{first_vocab}`, `{name}` literales), bloques obligatorios presentes y
   únicos (universal, critical_objective, vocabulary), cero `MotorDataMissing`.
2. (Modo `--llm`, opcional) pide UNA respuesta de texto al modelo y valida invariantes de contrato
   por nivel: A0 → sin signos de pregunta dirigidos al alumno y con la frase-puente; todos los
   niveles → cero menciones de foto/pantalla/imagen. Marcar los fallos como WARN (estocástico), no
   como FAIL, salvo que fallen en 3/3 corridas.
3. Salida: tabla por cruce (PASS/WARN/FAIL) + exit code ≠ 0 si hay FAIL estructural.

**Aceptación:** corre completo en < 2 min en modo estructural; detecta (probado con un fallo
inyectado a mano en una copia del dato) un placeholder roto y un bloque duplicado; documentado en
el README de scripts.

---

## WO F1-04 — Validación por voz del paquete F1 (runbook, la corre el dueño)

**Contexto mínimo:** la única vara de calidad real es la voz con micrófono. Este WO no escribe
código: deja el runbook listo y acompaña la sesión.

**Depende de:** F1-01 + F1-02 + F1-03 en verde.

**Cambios:** documento corto `docs/03-rework/_runbook-validacion-f1.md`: qué cruces probar (mini A0,
junior A2, adultos B1 — historia 0), qué escuchar (¿varía?, ¿recicla lo que dice el alumno?, ¿recita
la estructura?, ¿pregunta cerrada en A0?), **más la sonda de honestidad**: plantarle al coach un
hecho falso verificable ("¿viste el partido Argentina–Holanda de la semana pasada?") y verificar que
NO lo confirma — lo esperado es curiosidad que devuelve el turno, no "sí, qué buen partido" —, y
dónde queda la evidencia (transcript + juez de
`/lab/finaltest`, protocolo 5×4 si el dueño quiere la versión completa). Criterio de salida: el
dueño declara mejor/igual/peor vs. antes del paquete.

**Aceptación:** runbook en el repo; sesión corrida; resultado y decisión anotados en el handoff del
día. Si "peor": revertir F1-01/F1-02 por snapshot y git, y anotar el aprendizaje.

---

## WO F1-05 — Spike: modelo más fuerte para el rol de coach (gate del dueño)

**Contexto mínimo:** riesgo conocido ("muro del Flash"): aun con dato perfecto, Flash sub-ejecuta.
Si tras F1-01/F1-02 el robotismo persiste en voz, la palanca que queda es el modelo del coach.
Existe el banco `/lab/llm` (WS `ws_llm_test` sin JWT/BD) justo para esto.

**Depende de:** F1-04 con veredicto "sigue robótico" — **si F1-04 da "mejor", este WO NO se
ejecuta** (gate).

**Cambios:** en el banco `/lab/llm`, correr el MISMO prompt v2 (mini A0 + adultos B1) contra 2-3
candidatos live de voz disponibles (p. ej. la variante Flash actual vs. el tier superior de Gemini
Live disponible en AI Studio en ese momento); medir: obediencia a `critical_objective` (¿hace la
frase-puente?, ¿cero preguntas en A0?), latencia percibida, costo por minuto. Entregar tabla
comparativa de 1 página al dueño. **El cambio de modelo en producción lo decide el dueño** (es
config: `GEMINI_LIVE_MODEL`, con prefijo `models/` — sin prefijo la API Live lo rechaza).

**Aceptación:** tabla con las 3 dimensiones por candidato + recomendación; ninguna config de
producción tocada sin OK.

---

# FASE 2 — HISTORIA: el tercer pilar (que la clase 2 no repita la clase 1)

## WO F2-01 — Post-clase escribe `learner_state` (top-1, ultra liviano)

**Contexto mínimo:** el pilar HISTORIA está vacío: nada escribe `learner_state` al terminar una
clase, por lo tanto el coach nunca sabe qué pasó antes. Diseño decidido (y coincide con la
recomendación de Gemini): **ultra liviano** — NO volcar el JSON entero de errores; guardar solo lo
accionable: top-1 error persistente, 2-3 intereses detectados, 2-3 ítems dominados, 1 a repasar.

**Archivos:** `backend/services/session_analyzer.py` (o el post-clase vivo que confirme F0-02),
tabla `learner_state`, el punto de cierre de sesión en `backend/api/` donde se persiste el
transcript.

**Cambios:**
1. Al cerrar sesión (donde hoy se persiste transcript/report): destilar del transcript, con UNA
   llamada batch a Gemini (no live), el estado liviano: `{top_error, intereses[≤3], dominado[≤3],
   repasar[≤1]}` — en lenguaje de profe, EN, frases cortas.
2. Upsert en `learner_state` por alumno (merge con lo previo: el top_error nuevo reemplaza si se
   repite, los intereses se acumulan con tope 3, lo dominado rota).
3. Fail-soft explícito: si la destilación falla, loggear ERROR con trace_id y NO romper el cierre
   de la clase (la clase ya terminó; la historia es best-effort). Es el único punto donde se acepta
   degradar con log — nunca en silencio.

**Aceptación:** correr una clase de test → fila en `learner_state` con el formato liviano; correr
una segunda clase → merge correcto (no duplica intereses); el cierre de clase no se rompe si se
desconecta la API del destilador (probado apagando la key en local).

---

## WO F2-02 — El composer usa la historia (y se puede ver en el test)

**Contexto mínimo:** `composer_proto` ya tiene el bloque 6 (`learner_state`) como opcional-que-se-
omite. Con F2-01 escribiendo, hay que verificar el formato que inyecta (liviano, imperativo: "watch
for: X · likes: Y · already knows: Z — build on it, don't repeat it") y exponerlo en el test para
poder validar que el coach lo USA.

**Depende de:** F2-01.

**Cambios:**
1. Revisar/ajustar el render del bloque 6 al formato liviano (≤ 5 líneas SIEMPRE — si el dato viene
   más gordo, truncar con prioridad: error > repasar > intereses > dominado).
2. `/lab/mini-test`: agregar al visor de 9 pasos el bloque historia (ya muestra el desglose por
   campo) + control para setear/limpiar la historia del alumno de prueba (reset ya existe en
   finaltest — reutilizar el patrón).
3. Smoke F1-03: agregar invariante "si hay learner_state, el bloque aparece una vez y ≤ 5 líneas".

**Aceptación:** con historia cargada, el prompt contiene el bloque liviano; con historia vacía, se
omite (sin inventar); el visor lo muestra; smoke actualizado en verde. La validación de que el
coach la USA (clase 2 ≠ clase 1) es por voz — anotar en el runbook F1-04 como caso extra.

---

## WO F2-03 — Rotación de semilla por sesión (variedad por construcción)

**Contexto mínimo:** insight de campo del dueño (2026-07-09): el corazón del producto es que
**ninguna clase sea dos veces igual** — mismo nene, mismo tópico dinosaurios, clase distinta cada
vez. Hoy hay una fuente de repetición MECÁNICA en el propio motor: con historia vacía, mismo
alumno+nivel+tópico produce un prompt IDÉNTICO letra por letra; y en niveles bajos
(`vocab_depth=basic`) el composer toma SIEMPRE la misma primera frase-ancla
(`composer_proto.py` ~146: `phrases[:1]`) y el mismo seed de arranque. Toda la variedad queda
descansando en la estocasticidad del Flash, que colapsa al drill. La variedad tiene que salir POR
CONSTRUCCIÓN del motor, no del humor del modelo.

**Depende de:** F1-01/F1-02 validados por voz (no mezclar paquetes). **Gate del dueño:** toca el
composer → proponer el diff y esperar OK (regla global 5).

**Cambios:**
1. Semilla de sesión determinística: `session_seed = hash(student_id, topic_id, fecha)` — mismo
   input = mismo prompt (auditabilidad intacta); día distinto = selección distinta.
2. Con esa semilla, el composer MUESTREA en vez de tomar siempre lo primero: (a) qué frase-ancla
   usar en `basic` (rotar entre las N curadas del tópico, no `[:1]` fijo); (b) qué subconjunto/orden
   de frases en `full`; (c) qué variante de arranque, si el preset de edad tiene varias.
3. Dato: agregar 3-4 variantes de arranque por edad en `student_types` (hoy hay una → toda clase
   abre igual, la repetición más audible). Redacción de variantes = **gate del dueño** (pedagógico).
   Patrón dry-run/backup como siempre.
4. NO es un `if`/parche: es selección parametrizada por semilla, dentro del catálogo curado. NO
   fuerza vocab (rota lo que ya está). Smoke F1-03: nueva invariante — dos `session_seed` distintos
   para el mismo cruce producen prompts con frase-ancla y/o arranque distintos; el mismo seed
   produce el mismo prompt.

**Aceptación:** mismo cruce, 5 fechas simuladas → ≥ 3 combinaciones distintas de
(arranque, frase-ancla); mismo seed dos veces → prompt idéntico byte a byte; smoke en verde;
validación final por voz (runbook): dos clases seguidas del mismo nene con dinosaurios NO abren
igual ni apuntan a la misma frase.

---

# FASE 3 — Voz e infra: robustez (que lo bueno no se muera solo)

## WO F3-01 — Regresión + fail-fast de `app_config`

**Contexto mínimo:** `app_config` cargó `None` en silencio durante semanas en producción (mismatch
tabla `config_key/config_value` vs ORM `key/value`) → las reglas de voz se ignoraban sin un solo
error. Se arregló el 2026-07-08 leyendo raw, pero nada impide la regresión — y contradice la
filosofía fail-fast del motor.

**Cambios:** (1) test de integración que carga `app_config` por el MISMO camino que
`gemini_live.py` y falla si devuelve vacío/None; (2) chequeo de arranque en el backend: si
`app_config` resuelve vacío, log `ERROR` bien visible (no matar el proceso — la voz degrada pero
sirve; el error tiene que gritar en los logs de Cloud Run); (3) mini-doc en el código: por qué se
lee raw (el mismatch de schema), para que nadie lo "arregle" de vuelta al ORM.

**Aceptación:** test en verde; renombrando la columna en una DB local el test falla y el arranque
loggea ERROR; comentario en el código.

---

## WO F3-02 — Push-to-talk opcional para niveles bajos

**Contexto mínimo:** el VAD de Gemini no capta monosílabos (<1s) y sus umbrales pueden cambiar en
updates silenciosos de Google (riesgo señalado por Gemini mismo). La frase-puente A0 lo mitiga
pedagógicamente; falta el fallback de UI que no dependa del VAD de ellos: un push-to-talk (mantener
apretado para hablar) opcional en A0-A2.

**Archivos:** `frontend/src/hooks/useLiveVoice.ts` (o donde viva — está centralizado desde
2026-07-08), la pantalla de clase (`WebApp` sección practicar y `KidsSession.tsx`).

**Cambios:** (1) modo `pushToTalk` en `useLiveVoice`: mientras está apretado se envía audio;
al soltar, se corta el chunk (flush) — señal de fin de turno inequívoca; (2) botón grande
(accesible, táctil, SVG) visible SOLO cuando el nivel del alumno es A0-A2, con el modo VAD como
default y push-to-talk como toggle persistido (localStorage); (3) indicador "listening" claro en
ambos modos (la aura ya reacciona al mic — reutilizar).

**Aceptación:** en `/lab/mini-test` con A0: toggle visible, mantener-y-soltar produce turno
completo del alumno (un "yes" solo llega — verificable en el transcript del test); en B1+ el toggle
no aparece; el modo VAD sigue siendo el default y no cambió su comportamiento.

---

## WO F3-03 — Robustez de micrófono (iOS/Android/tablet)

**Contexto mínimo:** deuda técnica #1 documentada: iOS no deja elegir mic (ruteo del SO), el eco
tablet parlante↔mic, cambios de ruta con AirPods mid-sesión. La dirección de fix ya está decidida
en `docs/01-recuperacion-motor/02-deudas-tecnicas.md` §1 — implementarla tal cual, no re-decidir.

**Cambios:** (1) `getUserMedia` con `echoCancellation, noiseSuppression, autoGainControl,
channelCount: 1, sampleRate: 16000` en todas las superficies de voz; (2) selector de mic en
Android/desktop (`enumerateDevices`), oculto en iOS; (3) mostrar la entrada activa en la UI y
reintentar en `devicechange`; (4) verificar `getUserMedia` en PWA standalone iOS (si falla,
fallback documentado: abrir en Safari).

**Aceptación:** en desktop el selector lista y cambia de mic sin recargar; en iOS no aparece
selector y la sesión sobrevive conectar/desconectar auriculares Bluetooth (reintento visible);
el resampleo backend a 16 kHz queda intacto (ya existe — no tocar).

---

## WO F3-04 — Flags de Cloud Run fijados declarativamente (coordinar con Infra)

**Contexto mínimo:** la app REQUIERE `min=max=1` (salas en memoria de proceso),
`--no-cpu-throttling` (watchdogs y mixer corren entre requests) y `--timeout=3600` (WS largos). El
CD con `--source` PISA esos flags en cada push → "el coach se muere en el próximo deploy". Es el
riesgo #1 señalado por Infra. Regla 15 del dueño: la app hace el wiring, Infra dispara deploys —
así que este WO prepara todo y se lo pide a Infra por el canal.

**Cambios:** (1) escribir la config declarativa (`service.yaml` o los flags exactos del trigger de
Cloud Build) en el repo bajo `infra/` con comentario del PORQUÉ de cada flag; (2) dejar el pedido
concreto en `d:\Code\base-compartida\CANAL_AGENTES.md` para que Infra lo fije en el trigger
`deploy-hablah-api`; (3) chequeo post-deploy barato: script que consulta la config del servicio
(`gcloud run services describe`) y falla si `min≠1`, `max≠1`, throttling activo o timeout < 3600 —
documentado para correr tras cada deploy hasta que Infra confirme el fix.

**Aceptación:** yaml/flags en el repo con porqués; pedido en el canal; el script de chequeo corre y
reporta la config actual correcta.

---

# FASE 4 — Producto y UI/UX (con el motor ya sólido)

## WO F4-01 — Partir `WebApp.tsx` (3.744 líneas) en módulos

**Contexto mínimo:** toda la app adulta vive en un archivo de 3.744 líneas — imposible de razonar,
revisar o tocar sin miedo. Refactor SOLO estructural: **cero cambio visual ni de comportamiento.**

**Depende de:** F0-03 (el gate tsc+eslint es la red de este refactor).

**Cambios:** extraer por feature a `frontend/src/pages/app/` (los css.ts ya insinúan el corte:
`hoy`, `practicar`, `historial`, `mapa`, más el shell): un archivo por pantalla + `_shared` para lo
común; hooks extraídos a `hooks/`; ningún archivo resultante > 800 líneas; `WebApp.tsx` queda como
router/shell fino.

**Aceptación:** `tsc` + `eslint` limpios; la app se ve y se comporta igual (recorrida manual de las
4 secciones + una clase de voz completa — es la única verificación válida); ningún archivo > 800
líneas; cero cambios en strings visibles (diff de textos = vacío).

---

## WO F4-02 — Estándar viewport/safe-area en todas las superficies

**Contexto mínimo:** regla dura 18 del dueño para TODA PWA: sin zoom al tocar inputs, sin scroll
horizontal, header que respeta notch/Dynamic Island. El detalle copy-paste está en
`d:\Code\base-compartida\11-FIX-VIEWPORT-PWA.md` — leerlo y aplicar el checklist, no inventar.

**Cambios:** auditar y corregir landing + login + `/app` + `/kids` + `/charla`: viewport meta
(`maximum-scale=1, user-scalable=no, viewport-fit=cover`), inputs `font-size ≥ 16px`,
`overflow-x:hidden` + `overscroll-behavior:none`, sin `100vw`, header con
`padding-top: max(env(safe-area-inset-top), 12px)`, metas `apple-mobile-web-app-*`.

**Aceptación:** checklist del doc pasado superficie por superficie (tabla en el PR); verificación
en viewport móvil (Puppeteer 390×844: sin overflow horizontal en ninguna ruta de producto).

---

## WO F4-03 — Flujo de pantallas del producto (arquitectura de navegación)

**Contexto mínimo:** el producto tiene buenos huesos pero el flujo creció por acumulación. Este WO
implementa la IA de navegación de referencia. **Las decisiones de flujo ya están tomadas acá** —
implementar, no re-diseñar. (Cualquier pantalla NUEVA de este WO se propone en wireframe de texto
al dueño antes de codear — regla global 5.)

**El flujo de referencia:**

- **Adulto:** Landing → registro/login → **onboarding en 3 pasos** (1: elegí 4-5 tópicos del
  catálogo (orbs existentes); 2: mini-test de nivel POR VOZ — 60-90 segundos de charla con el coach
  que fija nivel inicial (el "mic test" ya identificado como palanca); 3: nombre/edad) → **Home
  "Hoy"** (una sola acción primaria: "Empezá tu clase de hoy" + racha + último reporte) →
  **Clase** (pantalla de voz limpia: aura, tópico del día, salir) → **Post-clase** (F4-04) →
  vuelta a Hoy. Secundarias: Progreso (historial + mapa), Tópicos (elegir/rotar), Perfil.
- **Kids:** el flujo actual (edad → tópicos → sesión) está bien; consolidar: el gate parental
  (`KidsParentSwitch`) SIEMPRE antes de config/compras; colección/aventuras se alimentan de clases
  REALES completadas (hoy decorativo → cablear al conteo de sesiones); pantalla de clase kids
  mantiene su separación coach/mic.
- **Invitado (`/charla/:token`):** dejarlo como está — es el demo compartible; solo aplicar F4-02.
- **Regla transversal:** de cualquier pantalla a "estoy en clase" en ≤ 2 taps. La clase es el
  producto; todo lo demás es marco.

**Aceptación:** el flujo de referencia navegable end-to-end en móvil; onboarding completo para un
usuario nuevo < 3 min (medido); ≤ 2 taps a la clase desde Home y desde Kids home; el mini-test de
voz persiste el nivel en el perfil (y el motor lo usa — ya lo hace: `student_profile`).

---

## WO F4-04 — Post-clase visible: reporte + progreso ("tu profe se acuerda")

**Contexto mínimo:** el backend ya genera `sessions.report` (1 elogio + 3 puntos) y con F2 la
historia existe — pero el alumno no ve nada de eso. Es la feature de retención más barata: el
diferencial del producto (motor + historia) hecho visible.

**Depende de:** F2-01/F2-02.

**Cambios:** (1) pantalla post-clase: el reporte (elogio primero, puntos después, lenguaje de
profe, cero jerga) + "la próxima clase vamos a trabajar X" (sale del `learner_state` recién
escrito); (2) en Home "Hoy": línea "tu profe se acuerda: la última vez te costó X" cuando hay
historia; (3) kids: versión visual mínima (estrellas/badge que suma a la colección — sin texto
largo).

**Aceptación:** al terminar una clase real aparece el reporte; la próxima clase el Home muestra la
línea de memoria; en kids la colección suma; con historia vacía (primer uso) nada de esto aparece
roto (estados vacíos diseñados).

---

## WO F4-05 — Sistema de diseño y dirección visual (gate del dueño)

**Contexto mínimo:** el producto necesita UNA dirección visual intencional (hoy hay acumulación).
Restricciones ya decididas: tema con CSS variables (estándar APP_GUIDE del dueño), iconos SVG
Lucide (cero emojis), dos pieles sobre los mismos tokens (adulto: calmo/confiable, voz-first,
generoso en espacio; kids: juguetón SIN romper los tokens), tipografía con carácter (una serif o
display para títulos + una sans legible, máx 2 familias), dark/light ambos intencionales,
`prefers-reduced-motion` respetado, animación solo compositor-friendly.

**Cambios:** (1) `tokens.css` único (paleta OKLCH, spacing, radios, duraciones) + doc de 1 página
con la dirección; (2) **3 variantes de la pantalla de clase** (la pantalla que ES el producto) como
maqueta HTML estática → **el dueño elige** → recién ahí aplicar tokens al resto; (3) migrar
superficies de producto a los tokens (el laboratorio `/lab` queda utilitario, fuera de alcance).

**Aceptación:** dueño eligió variante; tokens en un solo archivo consumidos por landing + app +
kids; auditoría rápida de contraste (AA en texto de cuerpo); ambos temas revisados.

---

## WO F4-06 — Circuito visual reactivo kids (direccional, opt-in)

**Contexto mínimo:** dirección ya validada (memoria del proyecto): forzar vocab visual DEGRADA la
clase; lo correcto es visual REACTIVO — precargar imágenes del tópico y mostrarlas cuando el profe
las nombra (vía transcripción), SIN tocar el prompt. Existe biblioteca visual (126 vocab, Lottie).

**Depende de:** F4-05 (que exista el sistema visual donde enchufarlo). **Es grande: confirmar con
el dueño el momento antes de arrancar.**

**Cambios (slice mínimo):** en `KidsSession`: precarga de los assets del tópico al iniciar;
listener sobre la transcripción del coach; match palabra→asset (exacto + plural simple); mostrar el
visual 3-4 s con animación suave; cero cambios al prompt ni al motor.

**Aceptación:** en una clase kids real, cuando el coach dice "lion" aparece el león; si el coach no
nombra vocab visual, la pantalla no fuerza nada; latencia de aparición < 1 s desde la
transcripción; el prompt no cambió (diff vacío en motor/dato).

---

# FASE 5 — Crecimiento: SEO, LLM indexing, branding (al final, sobre producto sólido)

## WO F5-01 — SEO técnico

**Contexto mínimo:** el build ya prerenderiza con Puppeteer (vite + prerender → dist) — la base
técnica existe; falta el resto. Dominio: `hablah.com.ar`, mercado: hispanohablantes (Argentina
primero).

**Cambios:** (1) `sitemap.xml` generado en build (landing + tópicos F5-02) + `robots.txt`;
(2) metadata por ruta: title/description únicos, canonical, OG/Twitter cards con imagen (una
plantilla OG estática por sección alcanza); (3) `hreflang` es-AR/es y `lang="es"` correcto;
(4) datos estructurados JSON-LD: `Organization`, `WebSite`, `FAQPage` (en `/faq`),
`Course`/`LearningResource` en tópicos; (5) verificar que el prerender emite HTML semántico
(h1 único por página, nav/main/footer) y que las rutas de producto rinden CWV razonables
(LCP < 2.5s en el hero de landing — presupuesto: JS landing < 150kb gzip).

**Aceptación:** sitemap accesible y válido; Rich Results Test pasa FAQPage y Organization;
Lighthouse SEO ≥ 95 en landing y en 3 páginas de tópico; el bundle de landing dentro del
presupuesto.

---

## WO F5-02 — SEO de contenido: los 94 tópicos como páginas

**Contexto mínimo:** las rutas `/topicos` y `/topicos/:slug` YA existen y el catálogo curado tiene
94 tópicos con semillas/frases reales — es contenido programático legítimo (no thin content si se
hace bien): cada tópico es una intención de búsqueda ("practicar inglés hablando de fútbol").

**Depende de:** F5-01.

**Cambios:** (1) plantilla de página de tópico: título orientado a búsqueda ("Practicá inglés
conversando sobre {tópico}"), para quién es (edades/niveles del catálogo — dato real), 3-4 frases
que vas a aprender (del `generated_vocab` REAL — es contenido único por página), CTA a probar
(guest room o registro); (2) todas prerenderizadas y en el sitemap; (3) interlinking: categoría →
tópicos hermanos; (4) los tópicos kids linkean al flujo kids.

**Aceptación:** 94 páginas prerenderizadas con contenido único (verificable: el vocab difiere entre
páginas), indexables, en sitemap; ninguna página con menos de ~120 palabras de contenido real.

---

## WO F5-03 — LLM indexing / AEO (que los asistentes de IA recomienden Habláh)

**Contexto mínimo:** una porción creciente del descubrimiento pasa por asistentes (ChatGPT, Gemini,
Claude, Perplexity). Optimizar para que, ante "app para practicar inglés hablando / clases de
inglés por voz para chicos", Habláh sea citable: contenido claro, extraíble y con hechos.

**Cambios:** (1) `public/llms.txt` (y `llms-full.txt`): qué es Habláh, para quién, cómo funciona
(motor determinístico + IA de voz — el diferencial real), precios, FAQ, URLs canónicas; (2) la
página "Cómo funciona" reescrita en formato pregunta→respuesta directa (los LLM extraen mejor
Q&A explícito) con los hechos diferenciales: clases por VOZ real, el profe se adapta a edad+nivel,
memoria entre clases, kids con seguridad parental; (3) consistencia de entidad: mismo nombre,
misma descripción de una línea, en landing, OG, schema.org y llms.txt; (4) FAQPage schema ya de
F5-01 alineado palabra por palabra con el contenido visible.

**Aceptación:** `hablah.com.ar/llms.txt` responde 200 con el contenido; "Cómo funciona" tiene ≥ 6
pares Q&A extraíbles; la descripción de una línea es idéntica en los 4 lugares (grep).

---

## WO F5-04 — Branding y mensaje (gate del dueño)

**Contexto mínimo:** el diferencial REAL del producto (no inventar otro): (a) se aprende HABLANDO
— voz real, no ejercicios de tap; (b) el profe no es un chatbot suelto: un motor pedagógico arma
cada clase para tu edad y nivel; (c) se acuerda de vos entre clases; (d) kids de verdad (seguridad,
edades, sin pantalla-adicción). El nombre "Habláh" ya lo dice — el mensaje debe amplificarlo.

**Cambios:** (1) propuesta de mensaje: tagline (3 opciones), hero copy, y los 3 bullets del
diferencial en lenguaje llano rioplatense — **el dueño elige/edita antes de tocar la landing**;
(2) aplicar a landing + OG + stores metadata (PWA manifest) + llms.txt (consistencia F5-03);
(3) micro-momento de marca en el producto: la primera frase del coach en el demo público y el
post-clase usan el mismo tono de marca (cálido, de profe, cero corporativo).

**Aceptación:** dueño aprobó el mensaje; landing lo refleja; la línea de una frase es consistente
en todos los puntos de contacto; cero emojis, iconos SVG.

---

## Apéndice — mapa WO → causa raíz que ataca

| WO | Causa raíz (de `01-analisis-integral.md`) |
|---|---|
| F0-01, F0-02, F0-04 | C1 (paralelismo sin consolidar), C7 (laboratorio devoró producto) |
| F0-03 | C5 (loop de validación roto — capa de código) |
| F0-05 | C3 (dato sin disciplina de código) |
| F0-06 | C3 (cobertura del catálogo: teen B1/B2 con 2 tópicos, medido 2026-07-09) |
| F1-01 | C4 (reglas duplicadas → clase tibia) + honestidad conversacional (sycophancy, insight de campo) |
| F1-02, F1-05 | C6 (muro del Flash / recency bias) |
| F1-03, F1-04 | C5 (vara confiable antes de tunear) |
| F2-01, F2-02 | M3 (el pilar HISTORIA incumplido — la promesa del producto) |
| F2-03 | Repetición mecánica: prompt idéntico con historia vacía + `phrases[:1]` fijo en A0 (insight de campo: "ninguna clase dos veces igual") |
| F3-01 | M4 (fail-fast también en los bordes) |
| F3-02, F3-03 | Actor/VAD (robustez de captura) |
| F3-04 | Riesgo #1 de infra (CD pisa flags) |
| F4-* | C7 + producto (hacer visible el diferencial) |
| F5-* | Crecimiento (sobre producto ya sólido) |

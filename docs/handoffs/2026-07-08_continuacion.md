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

---

# Continuación — misma fecha, tarde: tópicos VOLCADOS + recomendaciones de Gemini

> Segundo bloque del 2026-07-08 (sesión de tarde). **(A)** el catálogo de tópicos quedó curado y
> volcado a la DB (vivo en prod). **(B)** recomendaciones de Gemini sobre el motor —**transcriptas
> completas**— para que **Fable las decida mañana**. Gemini es el **dueño del modelo de voz e IA que
> usamos** (Gemini Live corre el rol de coach): su lectura de cómo el modelo interpreta el prompt es
> de primera mano, no opinión externa.

## (A) Catálogo de tópicos — curado y volcado a la DB (ya vivo en Aiven, es dato, sin deploy)

**Se curó POR FUERA con Gemini, a propósito para evitar sesgos del propio motor.** Iteró en 3 pasos y
quedó cerrado en v3.

**Proceso:** (1) se le pasó el catálogo liviano `docs/motor-catalogo/01-topicos-contenido-por-cruce.md`;
(2) devolvió `02-topicos-curados-v2.md` (destruncó semillas, palabras sueltas→chunks en junior/teen,
recategorizó); se le dio feedback `03-feedback-curacion-menos-tijera.md`; (3) devolvió
**`03-topicos-completos-v3.md` (94 tópicos) = fuente definitiva.**

**HALLAZGO CLAVE (no re-litigar):** el md mandado a Gemini era una vista **liviana/truncada** (semilla
≈6 palabras). La tabla `topics` ya tenía contenido más rico: ~40 keywords multilingües (EN/ES/PT) +
~10 frases-ancla por tópico. **El motor v2 solo usa** `keywords[:6]` (→ Words) + `generated_vocab`
(→ Target_Phrases; 1ª frase en A0-A2, todas en full); el resto de keywords es **peso muerto**. Por eso
el volcado fue de **ESTRUCTURA** (título/niveles/categoría/activo) **conservando el contenido** —
reemplazarlo lo habría empobrecido.

**Sanity check** (`backend/scripts/sanity_check_topics.py` → `docs/motor-catalogo/_sanity_topics.md`,
la "película" del contenido real que usa el motor): **0 corrupción, 0 vacíos** (el mojibake era solo la
consola Windows; el dato está sano UTF-8).

**Volcado APLICADO** (`backend/scripts/apply_v3_topics.py`, dry-run por defecto / `--apply` escribe):
- **94 activos** (antes 87): adultos 62, junior 11, teen 11, mini 10.
- **87 UPDATE** por match de título — **contenido CONSERVADO**; solo cambió estructura donde v3 lo hizo
  (~20: niveles a B1+ en abstractos; categoría → `entretenimiento`).
- **2 RENAME** reactivando inactivos con contenido rico (`id 5 → Entrenamiento de fuerza y
  suplementación`, `id 3 → Producción musical y cultura DJ`).
- **5 INSERT** nuevos con **contenido generado a mano** (mismo estilo): Desarrollo de software y
  herramientas IA · Diseño y construcción del hogar · Juegos de pelea y torneos · Construcción con
  bloques mágicos · Suscripciones gaming y juego en la nube.
- **0 DEACTIVATE.** Duplicado "Cómo me siento" resuelto (quedó activo id 150; deprecated id 136 no se
  tocó). **Backup:** `backend/scripts/_backup_topics_20260708_210550.json` (reversible).

**Criterio pedagógico VALIDADO por el dueño (no re-litigar):** temas abstractos van SOLO en B1+, no en
A0-A2 — textual: *"tema difícil con poco nivel solo trabaría al alumno"* (se queda sin palabras, se
frustra; en A0 el silencio ni lo capta el VAD). El ángulo simple del tema ya vive en otro tópico
A0-friendly (ej. "Adicción al celular" B1+ vs "Apps que uso a diario" A0-A2).

**Pendiente de tópicos (lo único):** validar por voz un tópico nuevo (ej. "Construcción con bloques
mágicos" en mini) — vara real, texto ≠ voz. Scripts dejados: `inspect_topics_before_v3.py`,
`sanity_check_topics.py`, `diff_v3_topics.py`, `apply_v3_topics.py`. Memoria: `project_curacion_topicos_v3.md`.

## (B) Recomendaciones de Gemini sobre el motor — DECIDE FABLE (texto completo)

> Gemini analizó `docs/motor-catalogo/filosofia-del-motor/01-filosofia.md`. Transcriptas sin recortar.
> La decisión de qué implementar es de Fable.

**Puntos fuertes (impecable, según Gemini):** (1) separación estricta CÓMO(EDAD) vs QUÉ(NIVEL) —evita
el problema combinatorio; (2) determinismo basado en datos, cero `if` —ajustable desde CMS, auditable;
(3) fail-fast sin fallbacks silenciosos —`MotorDataMissing` mejor que default que enmascara; (4) tópicos
livianos/agnósticos —no vuelven la charla un examen de vocab; (5) reconocer que la infra (VAD, sample
rate) dicta reglas pedagógicas (A0 frase larga para que el VAD no corte monosílabos) —comprensión
end-to-end.

**Áreas de riesgo (Gemini):** (1) **Muro del Flash + recency bias** —los bloques finales pesan más y el
Flash interpreta literal/robótico, a veces ignora las reglas del medio (`behavioral_guards`); si el
bloque 9 (arranque+semilla) choca con el bloque 7, descarrila hacia el tema y olvida la estructura;
(2) **competencia de reglas = clase tibia** —"divertido" vs "rigor" en capas distintas → el modelo
promedia y sale aburrido; mantener "una regla por capa" se complica al crecer el catálogo;
(3) **`learner_state`** —cuando se llene (bloque 6), inyectar el historial puede sobrecargar el contexto
y diluir la atención sobre el bloque 7; (4) **VAD de Gemini** —delegarlo 100% deja a merced de sus
umbrales; un update silencioso podría empezar a cortar a los alumnos.

**Sugerencias (Gemini) — completas:**
1. **Consolidación XML contra el recency bias:** usar etiquetas semánticas/jerárquicas; envolver la
   Producción Esperada (bloque 7) en una etiqueta de alta prioridad (ej. `<CRITICAL_OBJECTIVE>`) para
   forzar atención aunque no sea el último bloque.
2. **Tests de regresión de prompts (texto puro):** suite básica que simule la salida de texto por cruce
   EDAD×NIVEL y evalúe si cumple `Expected_Production` antes de probar por voz.
3. **`learner_state` ultra liviano:** no pasar el JSON entero; solo el **top-1 error** más persistente o
   la preferencia más relevante del tópico, para que no compita con el objetivo de la clase.
4. **Monitoreo del VAD:** fallback en la UI —indicador visual "listening…" que anime a hablar más, o
   **Push-to-Talk** opcional para niveles bajos que sufren cortes tempranos.

**Cierre textual de Gemini:** *"la arquitectura es sólida… la clave para que no se degrade será mantener
la disciplina estricta de 'una regla por capa' en la base de datos a medida que agregás tópicos y niveles."*

**Encuadre contra lo YA decidido (contexto, no decisión — decide Fable):**
- **Sug.1 (etiqueta de prioridad):** encaja con la **capa universal anti-robot** pendiente, ataca el
  muro del Flash. Cambio del composer → probar por voz. Candidato más fuerte para arrancar; con
  autoridad (lo dice el dueño del modelo).
- **Sug.3 (learner_state top-1):** ES el pilar HISTORIA pendiente; alineado con "no engordar contexto".
  Aplica cuando learner_state se llene (hoy vacío).
- **Sug.4 (push-to-talk/VAD):** ya en deudas; el indicador de voz (aura) ya se empezó; push-to-talk
  pendiente. El riesgo "VAD puede cambiar en update silencioso" refuerza un fallback propio.
- **Sug.2 (tests de texto):** OJO —el proyecto ya aprendió **texto ≠ voz** (VAD/ASR: los scores de
  texto no transfieren; la vara es la voz). Sirve solo como **smoke del armado del prompt**, NO como
  vara de calidad.

**Regla de proceso:** todo cambio al composer es motor/pedagogía → se **charla y se valida por voz**, no
se aplica silencioso (`feedback_modelo_colaboracion_arquitectura`, `feedback_estructura_9_pasos_no_parches`).

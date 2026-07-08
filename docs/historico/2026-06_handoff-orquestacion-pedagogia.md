# HANDOFF — Cómo armar las orquestaciones pedagógicas del motor_v3 (qué aprendimos, qué NO repetir)

> Para el agente que retoma esto. Es auto-suficiente: no necesitás la conversación previa.
> Fecha del trabajo: 2026-06-23. Todo lo que se tocó es DATO en motor_v3, reversible (backups por iteración).
> Detalle numérico completo: [docs/multi-llm-v3/_INFORME_refactor_pedagogia.md](multi-llm-v3/_INFORME_refactor_pedagogia.md)

---

## TL;DR (leé esto y ya podés trabajar)
1. **Cambio de paradigma:** se terminaron los presets GENERALES para todo lo que depende del nivel
   (corrección, recast, espejo, complejidad). Eso va **POR NIVEL** en `level_policy` (mismo `kind`,
   `body` distinto por `level_code`). El `universal_policy` (capa 6) queda SOLO para lo invariante.
   La banda (`band_policy`/guards/triggers) da el sabor por edad. **Tres ejes, no uno.**
2. **Validá SIEMPRE con el modelo de prod**: coach = Gemini `gemini-3.1-flash-lite-preview` (proxy de
   la voz `flash-live`). **NUNCA Claude de coach** (ese fue el error original — ver §0).
3. **No sigas agregando reglas para arreglar el recast en B1+.** Ya está en 3 capas y no se ejecuta:
   es **ceiling del Flash**, no falta de dato. Agregar más reglas REGRESA (lo comprobamos). Levers reales en §6.

---

## 0. El error que invalidó los primeros resultados (NO repetir)
Al principio se evaluaba con **Claude haciendo de coach Y de juez**. Claude sigue prompts XML mucho mejor
que el Flash de producción → daba 8.5 con orquestaciones que en el Flash real daban 6. Eran "manzanas de
cartón". Analogía del dueño del proyecto: *"es como mandar a jugar a la selección argentina con su técnico,
y después al técnico de Arabia Saudita, y esperar el mismo resultado."*

**Regla dura:** coach = el modelo de prod (flash-lite como proxy de flash-live). Alumno = otra familia
(Ollama `gpt-oss:120b`). Juez = Claude (especialista SLA). El juez SÍ puede ser Claude; el **coach NO**.

---

## 0.5 Metodología de test: el cruce de 3 familias de modelos (y el confound del alumno)

**El cruce (por qué 3 modelos distintos):** cada clase simulada usa TRES familias a propósito:
- **Coach = Gemini flash-lite** → es el modelo de prod, lo que se quiere medir.
- **Alumno = otra familia (Ollama `gpt-oss:120b`)** → a propósito NO es Gemini: si el alumno fuera el mismo
  cerebro que el coach, "se entenderían de más" (anticipa, colabora artificialmente) y el test mentiría.
- **Juez = tercera familia (Claude, SLA)** → independiente del coach y del alumno; evita el "Claude juzga a
  Claude" (cartón) y que el coach se autoevalúe.
Tres puntos de vista independientes = el número tiene validez.

**El confound del alumno (punto abierto IMPORTANTE — se pidió y NO se hizo):**
Un SOLO modelo de alumno es una variable sin controlar. Si gpt-oss, en una corrida, se queda mudo / no produce
errores realistas / no actúa como el perfil pedido → la clase se degrada **por culpa del ALUMNO, no del coach**,
y arrastra el score. **Buena parte de la varianza grande (mismo perfil 4 y 9) es esto.** Las clases
"alumno mudo → monólogo → 5" no son necesariamente fallas de la orquestación.

**Distinguir dos fenómenos (clave para no culpar al modelo equivocado):**
- *Recast que no se ejecuta (B1+):* es del **COACH**. Sistemático, aparece **cuando el alumno SÍ produjo un
  error claro** y el coach igual no lo reformula. El alumno no lo explica.
- *Silencio → monólogo → score bajo:* es en gran parte del **ALUMNO simulado**. Acá el random de alumnos sí cambia el número.

**El "random de alumnos" (la mejora correcta del harness, pendiente):**
1. **Rotar 3-4 modelos de alumno de familias distintas** (no solo Ollama) y promediar → cancela el sesgo de un
   alumno puntual. Si TODOS los alumnos bajan un perfil → es el coach; si solo uno → artefacto del alumno.
2. **Variar la PERSONA del alumno** por corrida: tímido/mudo, charlatán, con los errores típicos del nivel,
   distraído. Un alumno real es diverso; un solo prompt de alumno no lo captura.
3. **Separar señal del coach vs ruido del alumno:** si una clase tiene muy poca producción del alumno
   (p. ej. < X turnos con contenido), etiquetarla "alumno no produjo" y NO penalizar al coach por el monólogo
   (o descartarla del promedio). Hoy esas clases bajan el score injustamente.
4. **Reportar el score del coach promediado SOBRE alumnos**, no contra un alumno fijo.

**Por qué quedó con un solo alumno:** pragmatismo/disponibilidad (la key de Ollama andaba; las de Groq estaban
revocadas; el multi-alumno robusto agregaba complejidad y el foco era curar la pedagogía). Es **deuda
metodológica reconocida**: el próximo upgrade natural del harness, y cambia cuánto del "plateau B1+" es
realmente del coach vs del alumno. `eval_profile.py` recibe el `who` (persona) por parámetro y fija el modelo
de alumno en una constante → el random es: rotar esa constante entre varios endpoints y variar el `who`.

---

## 1. Cómo "rompimos todo" — y por qué es parte del trabajo
Iteramos **6 veces sobre DATO** (cero código, cero `if`). Cada cambio movía unos perfiles y a veces bajaba
otros. **Eso es esperado y sano en un motor data-driven**: el dato aguanta el churn y es reversible (backup
por iteración en `scripts/_backup_pedagogy_iter*.json`). El método ES romper → medir → revertir. Ejemplos:
- **iter1** (doctrina universal) curó child (3→8) pero **ablandó teen/adult**: el `"nunca señales el error"`
  el LLM lo leyó como `"no corrijas"`.
- **iter6** (gate de recast más fuerte + `"Say: I have a brother"` como anti-silencio) **regresó TODO**
  (early_child A1 7.6→4.8): el `"Say:"` se volvió drilling porque **el modelo copia los ejemplos literal**.
  → se revirtió al pico (iter5).
Ninguna "rotura" es un fracaso; es información. Lo único imperdonable sería medir con coach equivocado (§0).

---

## 2. Los hallazgos de Gemini (recomendaciones externas que usamos)
El dueño pasó análisis de Gemini sobre la orquestación. Los útiles:
1. **Feedback dinámico, prohibido plantillas.** 2 pasos: (a) reaccionar al aporte (semántico), (b) elogio
   lingüístico VARIADO. Nunca la misma frase.
2. **String-literal trap (clave).** Si le das al modelo una frase entre comillas (`'Dijiste jump perfecto'`),
   el Flash la **inyecta literal cada turno**. → describí la CONDUCTA, nunca la frase armada. Si das ejemplo,
   que sea de PATRÓN y con "variá".
3. **Over-constraining.** Reglas absolutas que chocan en un turno corto (máx 30 palabras + espejo SIEMPRE +
   recast sin señalar) → el modelo "entra en pánico de tokens" y deja solo el esqueleto mecánico. → relajar/fusionar.
4. **Flash attention-fatigue.** Flash, con 15+ reglas, toma atajos (de ahí lo robótico). Pro tiene el
   bandwidth. **Implicación:** la voz es Flash por latencia → la orquestación tiene que ser LIVIANA.
5. **Escucha activa → Recast → Expansión** + manejo de code-switching (aceptar idea en ES → recast natural
   en EN → invitar a intentar).
6. **Need-for-output:** el chico no repite porque sí; el personaje **pide ayuda** ("no encuentro a papá,
   ¡llamémoslo! Say: Dad!") → motivo para hablar.
7. **Execution trigger flexible:** reacción CONDICIONADA, no secuencia rígida (1 frase EN → espejo → repetir).
8. **Podio de modelos para pipeline determinístico** (si algún día se separa la lógica de la actuación):
   Claude (rey del XML/reglas) > Gemini **Pro** (no Flash) > open-weight vía Groq/Ollama con **JSON forzado**
   para el ruteo determinístico (decidir fase, premio, estado).
9. **Pregunta de arquitectura que dejó abierta:** ¿se inyecta `learner_state`/`interaction_state` por turno
   desde el backend, o el modelo deduce la fase del historial? **Respuesta real: hoy el modelo DEDUCE del
   historial; el `systemInstruction` se arma 1 vez al abrir la sesión de voz, no se reinyecta por turno.**
   Es una mejora pendiente (ver §6).

---

## 3. Lo que REALMENTE movió la aguja (lectura del agente que lo hizo)
- **Lo más grande, por lejos: el drilling estaba en el DATO, no en el modelo.** "decí 'my'" / guards
  telegráficas de child (`solo yes/no` + `frases de 2-4 palabras`) / openings que pedían `repetir {vocab0}`.
  Sacar eso del dato = **child 3 → 8.1**, sin tocar el modelo.
- **El string-literal trap fue real y sutil** (caímos nosotros mismos: dejamos ejemplos entre comillas que
  el Flash copiaba). Describir conducta + "variá" lo arregló.
- **De-constraint:** relajar las reglas absolutas que competían en un turno corto.
- **El paradigma por-nivel** (§4): mover la corrección/recast del universal al `level_policy` graduado.
- **Gate vs exhortación** ("prohibido avanzar sin recast" > "hacé recast") ayudó **parcialmente** (tope en Flash).

### Lo que NO movió la aguja o fue contraproducente (no repetir)
- **Endurecer el universal** → rompe kids (a un nene de 5 no le exijas corrección dura).
- **Agregar más y más reglas** → fatiga del Flash → REGRESA (iter6 lo probó).
- **Dar ejemplos de frase fija** ("Say: X") → se vuelven drilling.

---

## 4. EL CAMBIO DE PARADIGMA (lo central para armar orquestaciones)
**Se acabaron los presets generales para lo que depende del nivel.** Tres ejes, cada uno con lo suyo, sin pisarse:

| Eje | Tabla / capa | Qué vive ahí | Qué NO meter |
|---|---|---|---|
| **Universal** | `universal_policy` (capa 6) | lo INVARIANTE: no drilling, escucha activa, feedback variado | la corrección/recast (rompe kids) |
| **Nivel** | `level_policy` (`kind` + `level_code`) | el GRADIENTE: corrección/recast A0→C2, espejo (L1), complejidad | conducta por edad |
| **Banda** | `band_policy` / `behavioral_guard` / `trigger_template` por edad | el SABOR: Sparky/visual kids vs profesional adult | el gradiente de nivel |

- **Misma policy, valor por nivel.** `level_policy.error` tiene UNA fila por `level_code` con el mismo `kind`
  (`error_policy`) y `body` distinto: A0 "no corregir" → A1 recast suave → A2 audible → B1 obligatorio →
  B2/C1 selectivo + matiz. **Eso NO es hardcode**: es la misma regla parametrizada por nivel, en tablas. El
  único texto literal vive en el script de migración que carga la fila; el runtime lee la fila, no el código.
- **El modelo copia ejemplos, no obedece reglas abstractas.** Si das ejemplo, que sea de patrón ("dijo 'I likes'
  → vos 'you like'") y con "variá", nunca una frase fija.
- **Liviano > exhaustivo.** Por la fatiga del Flash, menos reglas bien escritas rinden más que muchas reglas.

---

## 5. Estado final (config pico restaurada, validado N=5 con coach Gemini)
| Banda·Nivel | avg | | Banda·Nivel | avg |
|---|---|---|---|---|
| child A2 | **8.1** ✓ | | teen B1 | 6.8 |
| child A1 | **8.0** ✓ | | adult C1 | 6.7 |
| early_child A2 | 7.8 | | teen B2 | 5.8 |
| early_child A1 | 7.6 | | adult A1 | 5.8 |
| teen A2 | 7.2 | | child B1 | 5.4 |
| adult B1 | 7.0 | | | |

Pasan ≥8: child A1/A2. El resto 5.4–7.8. **El gap restante NO es de dato (ver §6).** Hay varianza alta:
el mismo perfil da 4 y 9 según si el alumno (simulado) se engancha; las clases con alumno mudo arrastran.

---

## 6. El muro (qué NO seguir intentando por dato) y los levers REALES
**El recast en B1+ no se ejecuta consistente.** Vive en 3 capas (universal ord6 + level_policy.error +
trigger continuation) y el Flash igual valida el contenido y saltea la forma. **Es ceiling de ejecución del
Flash, no falta de dato** (6 rondas no lo cruzaron; la más dura regresó). Pro sí recasta, pero no es la voz.

> **OJO, separar dos cosas (ver §0.5):** el *recast-no-se-ejecuta* SÍ es del coach (sistemático, con error
> claro del alumno delante). Pero la *cola baja por silencio/monólogo* es en parte **confound del alumno
> simulado** (un solo modelo, gpt-oss). Antes de afirmar "el coach plateó en 7" con total certeza, hay que
> correr el **random de alumnos** (§0.5): podría subir varios perfiles sin tocar una sola línea de dato.

**Levers reales (el dato está agotado):**
1. **Mic test con `flash-live` real** = árbitro final. El proxy de texto puede diferir.
2. **Consolidar/aligerar el prompt.** 6 iteraciones AGREGARON reglas → fatiga. Menos reglas, mejor escritas
   = más bandwidth para ejecutar el recast. (Contraintuitivo, pero la regresión de iter6 lo respalda.)
3. **Recast / estado estructural por turno** (fuera del prompt): un gate determinístico en código/post-proceso
   que verifique "¿hubo error de forma sin recast?" y/o **inyecte `learner_state`/`interaction_state` por turno**
   (hoy el modelo deduce la fase del historial — §2.9). Lo que el prompt no logra en Flash, un gate sí.

---

## 7. learned_state (historia 0→1→2→3, muestra real)
- **La plomería SRS anda:** el `learned_state` persiste y crece por clase (items 0→23 en child A2), sin
  degradar el score. `motor_postclass`/`train_apply` escribe, `resolve` lee.
- **Pero el coach lo sub-usa:** `continuity` casi siempre NO — no retoma clases previas aunque el estado
  esté inyectado. **El estado se inyecta, el modelo no lo capitaliza** (otro gap de ejecución, no de plomería).
  Esto refuerza el lever §6.3 (inyectar/forzar estado por turno).

---

## 8. Cómo reproducir (herramientas)
- **Harness por perfil:** `backend/scripts/eval_profile.py <band> <level> <theme> "<who>" <N>` — genera N
  clases (coach Gemini + alumno Ollama) a un JSON; el juez (Claude) las puntúa aparte.
- **Validación full:** workflow `validar-pedagogia-motor` (11 perfiles × N clases, en paralelo + diagnóstico).
- **Historia:** `backend/scripts/test_history_evolution.py` (4 perfiles × 4 clases, train_apply entre clases).
- **Keys:** coach → `heroku config:get GEMINI_API_KEY -a hablah-api`. Ollama → `backend/.ollama_key`
  (**gitignored, NUNCA commitear**).
- **Reversibilidad:** `backend/scripts/_backup_pedagogy_iter*.json` (uno por iteración). `revert_to_iter5_best.py`
  muestra cómo restaurar. La estructura de 9 capas quedó intacta. **Flag de prod `MOTOR_V3_KIDS` sigue OFF.**

---

## 9. Si vas a seguir: orden sugerido
1. NO toques dato para el recast B1+ (está al tope). Atacá el lever §6.2 (aligerar prompt) o §6.3 (gate por turno).
2. Cualquier cambio: validá con coach Gemini flash-lite (§0), ≥3 corridas/perfil desde historia=0, juez SLA.
3. Mantené el split de 3 ejes (§4). No metas corrección en el universal. No des frases fijas como ejemplo.
4. La vara final es el **micrófono con flash-live**, no la simulación de texto.

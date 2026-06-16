# El trabajo post-clase (paso posterior, asincrónico)

Este es el paso que **no** forma parte de los 9 pasos. Ocurre cuando la clase terminó: lee lo que pasó en la sesión y llena las tablas que la próxima clase va a leer. Es lo que le da memoria al sistema sin tocar el camino en tiempo real.

---

## 1. Por qué va separado (y por qué acá sí puede haber una IA)

La regla "nada de IA intermedia" valía para el **camino síncrono** — armar el prompt mientras el alumno espera. El análisis post-clase está **fuera de ese camino**: el chico ya cerró la app. Entonces:

- No agrega ni un milisegundo de latencia a la conversación.
- Se puede correr en background, en cola, o en batch a la noche.
- Si falla o tarda, no rompe ninguna clase.

Por eso acá una IA es la herramienta correcta, no un riesgo: es justo lo que un LLM hace bien (leer una conversación y sacar conclusiones), y no está en el lugar donde la latencia o la dilución de rieles importaban.

---

## 2. Las dos mitades del post-clase

El paso tiene una parte que **no** necesita IA y una que **sí**. Separarlas mantiene el costo bajo y la parte crítica (los números) exacta.

### Mitad A — Determinista (de los contadores, sin IA)
Sale de lo que ya contaste en vivo durante la sesión (`interaction_state`). Es aritmética:
- Actualizar el SRS de cada ítem: aciertos, fallos, y recalcular `next_review`.
- Poblar la cola de refuerzo con los ítems que se trabaron.
- Escribir el log cuantitativo de la sesión (turnos, duración, completada).

Exacto, gratis, instantáneo. No le preguntás a un modelo cuántas veces falló "Banana"; lo contaste.

### Mitad B — Cualitativa (una IA leyendo el transcript)
Sale de leer la conversación completa:
- Detectar intereses nuevos que aparecieron ("habló de volcanes").
- Inferir rasgos del alumno ("se engancha con onomatopeyas", "se traba con preguntas abiertas").
- Un resumen de la sesión y una sugerencia de próximo tópico.
- Una nota afectiva (¿enganchó?, ¿se frustró?).

Esto es lo que un contador no puede hacer y un LLM sí.

---

## 3. El flujo

```
[ Fin de la clase ]
        │
        ▼
  Recopilar:  transcript completo  +  contadores en vivo (interaction_state)  +  target items de la sesión
        │
        ├──► MITAD A (código, sin IA)
        │      ├─ recalcular SRS por ítem ──────► vocab_progress
        │      ├─ ítems trabados ──────────────► reinforcement_queue
        │      └─ totales de la sesión ────────► session_log
        │
        └──► MITAD B (1 llamada a LLM, async)
               leer transcript → devolver JSON estructurado
               ├─ intereses detectados ────────► student_interests
               ├─ rasgos inferidos ────────────► student_traits
               └─ resumen + próximo tópico ────► session_insights
        │
        ▼
[ Tablas actualizadas ]  ──►  el Sequencer y el Bloque 5 las leen en la próxima clase
```

---

## 4. Las tablas

```sql
-- SRS: el motor de la retención.  [Mitad A]
CREATE TABLE vocab_progress (
  student_id    INT,
  item          VARCHAR,      -- "Apple", "Eat apple"
  skill_stage   VARCHAR,      -- repeat | recognize | recall | use
  status        VARCHAR,      -- new | learning | mastered
  seen_count    INT,
  success_count INT,
  fail_count    INT,
  ease          FLOAT,        -- factor tipo SM-2
  last_seen     DATE,
  next_review   DATE,         -- el sequencer lo usa para elegir el tópico
  PRIMARY KEY (student_id, item)
);

-- Puntos a reforzar.  [Mitad A, derivado de los fallos]
CREATE TABLE reinforcement_queue (
  student_id INT,
  item       VARCHAR,
  reason     VARCHAR,         -- failed_3x | pronunciation | confused_with:Banana
  priority   INT,
  created_at TIMESTAMP
);

-- Intereses (evolucionan).  [declarados al registrarse + DETECTADOS por la Mitad B]
CREATE TABLE student_interests (
  student_id INT,
  interest   VARCHAR,         -- "dinosaurios", "volcanes"
  source     VARCHAR,         -- declared | detected
  weight     FLOAT,           -- sube cuando reaparece o engancha
  last_seen  DATE
);

-- Características del alumno (lo cualitativo).  [Mitad B]
CREATE TABLE student_traits (
  student_id INT,
  trait      VARCHAR,         -- "se engancha con onomatopeyas espaciales"
  confidence FLOAT,
  updated_at TIMESTAMP
);

-- Log cuantitativo de cada clase.  [Mitad A]
CREATE TABLE session_log (
  session_id UUID PRIMARY KEY,
  student_id INT,
  date       TIMESTAMP,
  topic_id   INT,
  turns      INT,
  duration_s INT,
  completed  BOOLEAN,
  affective  VARCHAR          -- engaged | neutral | frustrated
);

-- Insights cualitativos de la clase.  [Mitad B]
CREATE TABLE session_insights (
  session_id         UUID,
  summary            TEXT,
  new_interests      JSON,    -- ["volcanes"]
  items_to_reinforce JSON,    -- ["Banana"]
  suggested_topic    VARCHAR,
  notes              TEXT
);
```

---

## 5. Mitad A — actualización del SRS (pseudocódigo)

Sin IA. Por cada ítem objetivo de la sesión, según cómo le fue (de los contadores):

```python
def actualizar_srs(item_row, resultado):
    # resultado: "ok" | "struggled" | "fail"  (de interaction_state)
    item_row.seen_count += 1
    if resultado == "ok":
        item_row.success_count += 1
        item_row.ease = min(item_row.ease + 0.1, 2.8)
        item_row.next_review = hoy() + intervalo(item_row)   # se aleja
        if item_row.success_count >= 3:
            item_row.status = "mastered"
    elif resultado == "struggled":
        item_row.next_review = hoy() + 1            # vuelve pronto
    else:  # fail
        item_row.fail_count += 1
        item_row.ease = max(item_row.ease - 0.2, 1.3)
        item_row.next_review = hoy()                # vuelve ya
        encolar_refuerzo(item_row.item, reason="failed")
    item_row.last_seen = hoy()
    guardar(item_row)
```

El detalle del cálculo de intervalo puede ser SM-2 o uno propio; lo importante es que sale de números que ya tenés, no de un modelo.

---

## 6. Mitad B — extracción cualitativa (1 llamada a LLM)

La IA recibe el transcript y devuelve **solo JSON** con un contrato fijo. Nada de prosa libre: así la salida se inserta directo en las tablas.

Contrato de salida esperado:

```json
{
  "summary": "Timo enganchó con la historia del dinosaurio; le costó 'Banana'.",
  "affective": "engaged",
  "new_interests": ["volcanes"],
  "traits": [
    {"trait": "se engancha con onomatopeyas espaciales", "confidence": 0.8},
    {"trait": "se traba al repetir palabras de 3 sílabas", "confidence": 0.6}
  ],
  "items_to_reinforce": ["Banana"],
  "suggested_topic": "The Volcano Planet"
}
```

Esqueleto del prompt de análisis (también estructurado, igual que el composer):

```xml
<analysis_task>
  Sos un analista pedagógico. Leé la transcripción de la clase y devolvé SOLO el JSON
  del contrato. No inventes datos: si algo no aparece, devolvé lista vacía.
</analysis_task>

<student_context>
  Name: Timo | Age: 5 | Level: A1 | Interests: dinosaurios, cohetes
</student_context>

<session_target>
  Items: [Apple, Banana] | Phrases: [Eat apple]
</session_target>

<transcript>
  ... la conversación completa, turno por turno ...
</transcript>

<output_contract>
  { summary, affective, new_interests[], traits[{trait, confidence}],
    items_to_reinforce[], suggested_topic }
</output_contract>
```

Notas de implementación:
- Es la única llamada a LLM del post-clase; podés usar un modelo más chico/barato.
- Validá el JSON antes de escribir (si no parsea, reintentar una vez, y si falla, guardar solo la Mitad A).
- Los `new_interests` y `traits` no pisan: se acumulan y suben de `weight`/`confidence` cuando reaparecen.

---

## 7. Cómo cierra el loop

El post-clase **escribe** estas tablas. En la próxima clase:

1. El **Sequencer** lee `vocab_progress.next_review` + `reinforcement_queue` + `student_interests` y elige el tópico del día (repaso debido + algo nuevo, tematizado por interés).
2. El **Bloque 5** lee el resumen del estado del alumno (el `learner_state` del documento de los 9 pasos).
3. El **composer estático** arma la clase exactamente como hoy — pero ahora "sabiendo" qué domina el alumno, qué reforzar y qué le interesa.

El algoritmo síncrono que te dio la mejor clase del año no cambia. Lo único que cambia es que ahora cada clase deja un rastro, y la siguiente arranca desde ahí.

---

## En una frase

El post-clase es **memoria, no conversación**: corre aparte, en dos mitades (números por código, matices por IA), y su único trabajo es dejar las tablas listas para que el camino en tiempo real siga siendo rápido, determinista y, ahora, con memoria.

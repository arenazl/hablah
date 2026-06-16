# Motor de Lenguaje Dinámico — implementación (Python + MySQL)

Implementación del motor descrito en `10_especificacion_para_agente.md`. Arma **un solo prompt** desde las 9 capas (concatenación determinista, sin IA), elige el tópico del día (sequencer) y procesa el post-clase (SRS determinista + análisis con IA, fuera del path de latencia).

## Archivos

| Archivo | Qué es |
|---------|--------|
| `schema.sql` | Las tablas (MySQL / InnoDB / utf8mb4). |
| `seed.sql` | Datos de ejemplo para probar end-to-end. |
| `engine.py` | **Núcleo determinista, sin dependencias.** Presets, composer (el prompt), SRS, sequencer, validador. |
| `repository.py` | Capa de acceso a MySQL (todas las queries, parametrizadas). |
| `pipeline.py` | Orquesta `pre_class()` y `post_class()`. Hook para Gemini. |
| `demo_db.py` | Corrida end-to-end contra MySQL. |

## Principio clave

- **Camino en tiempo real** (`pre_class`): 100% determinista, sin IA intermedia. Arma el prompt y listo.
- **IA solo en el post-clase** (`post_class`): fuera del path de latencia. La mitad numérica (SRS) es código; la mitad cualitativa es 1 llamada a Gemini.

## Probar sin base de datos

`engine.py` no necesita MySQL ni nada instalado:

```bash
python engine.py
```

Imprime el prompt ensamblado para un adulto B1 y para un nene de 5 (mismo motor, mismo tópico agnóstico, distinto framing), más demos de SRS, sequencer y validador.

## Probar con MySQL (end-to-end)

```bash
pip install mysql-connector-python

mysql -u USER -p -e "CREATE DATABASE language_engine CHARACTER SET utf8mb4;"
mysql -u USER -p language_engine < schema.sql
mysql -u USER -p language_engine < seed.sql

export DB_USER=USER DB_PASS=PASS        # o editá demo_db.py
python demo_db.py
```

## Uso desde tu código

```python
import repository as R, pipeline as P
from pipeline import Session, TurnResult
import uuid

repo = R.Repo(R.connect(user="...", password="...", database="language_engine"))

# 1) Pre-clase -> el único prompt que le mandás a Gemini
prompt, topic = P.pre_class(repo, student_id=1)
#   ... mandás `prompt` a la sesión de voz; la IA conduce toda la charla ...

# 2) Post-clase (cuando termina), con los resultados que registraste en vivo
session = Session(session_id=str(uuid.uuid4()), student_id=1, topic_title=topic.title,
                  turns=24, duration_s=480, completed=True, affective="engaged",
                  results=[TurnResult("Booking","ok"), TurnResult("Issue","struggled")],
                  transcript="...")
P.post_class(repo, session)             # SRS + log; análisis cualitativo = stub
```

## Enchufar Gemini (mitad cualitativa del post-clase)

`pipeline.py` no asume ningún SDK: vos le pasás un wrapper `call_model(prompt) -> str`.

```python
def mi_wrapper(prompt: str) -> str:
    # acá tu llamada real a Gemini; debe devolver SOLO el JSON del contrato
    resp = genai_client.generate(prompt)
    return resp.text

analyzer = P.gemini_analyzer_factory(mi_wrapper)
P.post_class(repo, session, analyzer)   # ahora la mitad cualitativa usa Gemini
```

El contrato que debe devolver el modelo:

```json
{
  "summary": "string",
  "affective": "engaged | neutral | frustrated",
  "new_interests": ["string"],
  "traits": [{"trait": "string", "confidence": 0.0}],
  "items_to_reinforce": ["string"],
  "suggested_topic": "string"
}
```

## Dónde tocar qué (recordatorio)

- Personalidad/tono → `engine.TUTOR` (preset por banda).
- Estilo de enseñanza → `engine.PEDAGOGY`.
- Reglas rígidas → `engine.RIELS` + `engine.LEVEL_MOD` (⚠ la capa más sensible).
- Apertura / desarrollo / cierre → `engine.opening_action` / `continuation_action` / `closing_action`.
- Cómo se elige el tópico → `engine.pick_topic` (sequencer).
- No reescribas `compose_stack`: sumá capas o reglas; el ensamblado determinista no se toca.

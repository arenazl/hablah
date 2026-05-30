# Hablah QA Harness

Suite de tests que simula a un alumno conversando con el coach, captura
la respuesta del coach, y la evalúa contra las reglas del super_prompt
con un LLM externo (Gemini Flash).

**No necesitás audio**: mandamos texto via el mensaje `{"type": "say"}`
del WebSocket, que es el mismo path que usa el engine para test-mode.

## Setup

Necesitás 2 cosas en env:

```bash
export QA_USER_EMAIL=barto@test.com         # user adulto con role student
export QA_USER_PASSWORD=123                  # password de ese user
export GEMINI_API_KEY=AIza...                # para el scorer
```

(Para crear un user de test rápido: `python scripts/create_user_adhoc.py`)

## Correr

```bash
# Smoke (3 escenarios, ~1 min)
python scripts/qa_run.py --suite smoke

# Suite de calidad full (~3 min)
python scripts/qa_run.py --suite quality

# Stress un topic puntual con todas las personas
python scripts/qa_run.py --suite stress:5

# Single ad-hoc
python scripts/qa_run.py --persona advanced_c1 --free-topic "why microservices are overrated"

# Guardar reporte
python scripts/qa_run.py --suite quality --report-out reports/2026-05-27.json
```

## Personas disponibles

| Key | Nivel | Descripción |
|---|---|---|
| `beginner_a1` | A1 | Respuestas cortas, errores gramaticales |
| `intermediate_b1` | B1 | Conversacional, opina |
| `advanced_c1` | C1 | Debate, contraargumenta |
| `distracted_kid` | A1 | Cambia de tema, off-topic |
| `silent` | B1 | Monosilábico, no aporta |
| `off_topic` | B1 | Desvía constantemente |

## Rubric del scorer

El scorer evalúa 8 categorías 0-10:
- `opening_structure` — siguió los 3 pasos (saludo + intro + experiencia + pregunta)
- `language_consistency` — habló en target_language sin mezclar
- `no_thinking_leak` — NO verbalizó chain-of-thought (`**Initiating...`)
- `turn_length` — turnos cortos, no monólogos
- `topic_focus` — mantuvo el tema
- `correction_style` — corrigió con modelado natural, no lectura
- `engagement` — turnos que avanzan, no fillers vacíos
- `honest_engagement` — engagement con la idea, no praise genérico

Score overall ≥ 6.5 = pass.

## Output

```
▶ smoke_intermediate  (intermediate_b1 · topic_1)
━━━ intermediate_b1 · topic_1 ━━━
  Session: 245  ·  Duration: 18.3s
  Turns: 4 coach / 4 student
  First coach audio: 1843ms
  Score: 7.3/10
    · opening_structure: 8  Greeted by name, gave a concrete angle...
    · language_consistency: 10  All English, no mixing.
    · no_thinking_leak: 10  Clean. No chain-of-thought.
    · turn_length: 6  Some turns 5+ sentences, on the longer side.
    · topic_focus: 8  Mostly on topic.
    · correction_style: 9  Modeled corrections naturally.
    · engagement: 7  Some filler ("interesting!") but generally good.
    · honest_engagement: 6  Praised generically twice.
  Issues:
    - Turn 3 too long (8 sentences)
    - Filler "That's really interesting!" repeated 3 times
  Strengths:
    + Personal anecdote in opening was specific
    + Good redirect when student went off-topic

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY  (3 scenarios in 54.2s)
  Passed (≥6.5): 2   Failed: 1
  Avg score: 6.9/10
```

## Cómo extender

- **Persona nueva**: agregá entry en `qa/personas.py` con su strategy
- **Suite nueva**: agregá lista de Scenarios en `qa/scenarios.py`
- **Regla nueva en rubric**: editá `_SCORING_PROMPT_TEMPLATE` en `qa/scorer.py`

## Cómo usar el output para mejorar la app

1. Corré `--suite quality --report-out reports/X.json`
2. Filtrá los scenarios con `score_overall < 6` → esos son los más útiles
3. Mirá `issues` y `conversation` para cada uno
4. Si hay un patrón repetido (ej. "thinking leak en todos") → fix en
   super_prompt / gemini_live_engine
5. Re-correr y ver si baja el conteo de issues

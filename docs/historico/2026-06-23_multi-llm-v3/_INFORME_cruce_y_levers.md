# INFORME — Cruce de alumnos, juez calibrado y levers de orquestación (2026-06-23)

> Autosuficiente para retomar. Sesión de tuneo del coach (motor_v3, kids+adultos) buscando subir el
> score de 7 a 8/9. Continúa el trabajo de [HANDOFF_orquestacion_pedagogia.md](../HANDOFF_orquestacion_pedagogia.md).
> Todo lo tocado es DATO reversible (backups por lever). **Flag de prod `MOTOR_V3_KIDS` sigue OFF.**

## TL;DR (leé esto)
1. **El "score bajo" (3-5) que asustaba era ARTEFACTO.** Dos causas: (a) **infra** — Ollama Cloud (free tier)
   rebota concurrencia con HTTP 429 → alumno mudo → profe en monólogo; las corridas viejas usaban
   `CONCURRENCY=4` contra una cuenta que aguanta ~1-2. (b) **un solo modelo de alumno** (sesgo). Serializando
   Ollama + rotando 5 modelos, el coach da **~7** parejo en todos los perfiles.
2. **El juez estaba AVARO (sin ancla de escala).** Daba 6-7 a clases que un juez previo calificó 8-9. Calibrado
   con escala explícita + clases gold, el **baseline real es 7.6 / 7.4** (no 7.03 / 6.69). La orquestación
   estaba MEJOR de lo que el número decía.
3. **El cuello NO es el modelo.** Test de techo: coach gpt-oss:120b (OpenAI, 120B) = coach Gemini Flash-lite
   (Δ+0.22, ruido). Un cerebro mucho más grande da lo mismo → **el techo es la orquestación/ejecución, NO el
   modelo.** Migrar la voz a OpenAI Realtime NO resolvería (caro, no mueve la aguja).
4. **El tuneo de DATO de texto se topó.** 3 levers, ninguno movió >0.3. El cuello que queda es el **ceiling de
   EJECUCIÓN del Flash** (no ejecuta el recast ni capitaliza la historia aunque el dato se lo pida). No se cruza
   con más dato: se cruza con **micrófono** (vara real) o **cambio estructural** (gate por turno / inyectar
   learner_state por turno = código).

## El método (la vara, reusable)
- **Cruce de alumnos** (`cruce_alumnos.py`): para DIAGNÓSTICO. Mismo coach × 5 modelos de alumno × 4 personas
  (trabado/fluido/quedado/crack), juez SLA. Separa señal del coach del ruido del alumno. Historia 0.
- **Circuito de validación** (`validar_cambio.py <band> <level> <theme> <tag>`): la VARA OFICIAL para cada
  cambio. Por nivel: **5 muestreos (5 modelos) × historia 0→1→2→3 = 20 transcripciones**. 5 muestreos porque
  los LLM son estocásticos (1 corrida miente); historia 0-3 porque el producto vive de que el alumno VUELVA.
  Acepta `--coach=ollama:modelo` para test de techo.
- **Juez**: Claude SLA headless con rúbrica ANCLADA (escala 9/7/5/3 explícita). `calibrar_juez.py` lo valida
  con clases gold. `rejuzgar.py` re-puntúa transcripciones guardadas sin re-generar (barato; usar al cambiar el juez).
- **Comparar**: `comparar_validar.py <band> <level> <tagA> <tagB>` → Δ + veredicto (MEJORÓ ≥0.3 / RUIDO / REGRESÓ).
- **Coach** = Gemini `flash-lite` (prod). **Ollama serializado** (semáforo=1 + backoff) — clave, mata los 429.
- **Modelos de alumno usables** (verificado `_probe_students.py --seq`): gpt-oss:120b, gpt-oss:20b,
  qwen3-coder:480b, gemma3:27b, gemma3:4b, nemotron-3-nano:30b, minimax-m3, ministral-3:8b, devstral-small-2:24b.
  Caídos: deepseek-v3.1:671b / mistral-large-3:675b (suscripción), llama3.3:70b / qwen2.5:72b / glm-4.6 (404/retirados).

## Los 3 levers (qué se probó)
| Lever | Qué tocó | Resultado (juez calibrado) | Estado |
|---|---|---|---|
| **#1 Andamiaje L1 A1** | level.modifier A1 + hint_policy A1 + guard g19 | early_child −0.08, adult −0.29 | **REVERTIDO** |
| **Test de techo (modelo)** | coach gpt-oss:120b vs Flash | Δ+0.22 (ruido) | n/a (diagnóstico) |
| **#2 Carrusel + historia** | trigger_template id 1,2,7,8 (opening+continuation, kid+adult) | early_child +0.10, adult +0.20 | **PUESTO** (marginal) |

- **#1**: el dato vigente ya empujaba a A1 al inglés (una iter previa lo sobre-corrigió). El lever lo revertía.
  Tuvo efecto conductual real (el coach ancla más en ES) pero NO movió el score **con alumno natural**, porque
  el modo de falla que cura (descalibración a inglés puro) solo aparece con el alumno "crack que mete inglés".
  **Lección metodológica:** un lever que cura un modo de falla específico hay que validarlo con el alumno que
  REPRODUCE esa falla, no con el natural (no es cherry-picking: el banco debe contener la condición). Hipótesis
  archivada, NO descartada.
- **#2**: rompe el carrusel ("tirá del hilo que el alumno abrió antes de cambiar de tema") + capitaliza historia
  (abrir retomando la clase pasada). Ruido positivo en ambos. La continuity sigue plana (h0≈h3): el "capitalizar
  historia" NO se ejecuta → muro del Flash sub-usando learner_state (handoff §7).

## Estado final de la BD
- **Lever #1: REVERTIDO** (level.modifier A1 = "Espejo en español DINÁMICO…", el original).
- **Lever #2: PUESTO** (trigger_template id 1,2,7,8 con la reescritura anti-carrusel + opening-con-historia).
  Mejora marginal no concluyente, pero pedagógicamente sana y no rompe nada en 40 clases. Revertir:
  `python scripts/apply_lever_carrusel.py --revert scripts/_backup_lever_carrusel_20260623_160921.json`.
  **Pendiente si se deploya:** sincronizar trigger_template al SQL canónico (Motor-Learning/motor_v3.sql).
- Students de test (`v_*`) limpiados. Backups de cada lever en `backend/scripts/_backup_lever_*.json`.

## Próximos pasos (cuando se retome)
1. **Micrófono (vara real):** validar el coach actual con voz flash-live. Banco existente: `/llm` (ws_llm_test
   sin JWT/BD). Confirma si el 7.6 de texto = buena clase hablada, o si la voz tiene problemas que el texto no
   muestra (latencia, ejecución del recast en vivo).
2. **Cambio estructural — gate por turno (§6.3 del handoff):** sacar la lógica del prompt (que el Flash no
   ejecuta) y ponerla en CÓDIGO por turno: inyectar `learner_state`/`interaction_state` cada turno (hoy el
   modelo deduce la fase del historial; el systemInstruction se arma 1 vez al abrir la sesión) + un gate
   determinístico que verifique "hubo error de forma sin recast". Es el único camino para cruzar el ceiling de
   ejecución que ni el modelo ni el dato cruzaron. Trabajo de arquitectura.
3. **Re-validación dirigida del lever #1:** correr el cruce de personas (alumno "crack") con el #1 puesto vs
   sin, comparar las celdas crack/quedado. Si cura el caso patológico sin romper el natural, se aprueba.

## Herramientas creadas (backend/scripts/)
`cruce_alumnos.py` · `juez_cruce.py` · `consolidar_cruce.py` · `_probe_students.py` · `validar_cambio.py`
(circuito 5×4, coach configurable) · `comparar_validar.py` · `calibrar_juez.py` · `rejuzgar.py` ·
`apply_lever_andamiaje_a1.py` (revert) · `apply_lever_carrusel.py` (revert). Datos en `docs/multi-llm-v3/_validar_*`, `_cruce_*`.

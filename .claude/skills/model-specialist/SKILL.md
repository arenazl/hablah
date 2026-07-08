---
name: model-specialist
description: Lente de especialista en modelos LLM (Claude, Gemini, abiertos vía Ollama) para elegir el modelo correcto por rol y, sobre todo, FORZAR un contrato de salida consistente. Usar al armar bancos multi-modelo, al ver respuestas con formato inconsistente, o antes de correr cualquier test/integración con varios modelos — para no jugar a la ruleta.
---

# Especialista en modelos LLM (multi-modelo, contratos de salida)

Sos ingeniero de LLMs con experiencia en producción multi-proveedor. Tu trabajo: que las llamadas a modelos sean **predecibles**, no una ruleta. La regla madre: **NUNCA dependas de que el modelo "adivine" el formato.** Si necesitás estructura, se enforza con el mecanismo nativo del proveedor; si necesitás texto plano, se pide explícito. Antes de escalar un test a N modelos, **probá 1 llamada y validá el contrato.**

## Por qué pasa la "ruleta" (la lección que originó esta skill)
Un prompt que **implica** una salida (ej. el motor de Habláh: "Realtime Multimodal Voice Session — TTS limpio, emojis solo a pantalla") **sin un esquema estricto** deja al modelo inventar la estructura. Resultado: Claude habla en texto plano, Gemini improvisa un JSON distinto por turno (`{tts,display}`, `{response_tts,response_screen}`, `{text,visual_cues}`...). **Mismo prompt, modelos distintos, contratos distintos.** No es capacidad — es falta de contrato.

## Cómo FORZAR el contrato (por proveedor)
- **Gemini** (generateContent / Live): `responseMimeType: "application/json"` + `responseSchema` (structured output). Sin eso, el texto es libre y improvisa. Para voz en vivo, el contrato de modalidad lo fija la config de la Live session, no el texto del prompt.
- **Ollama** (open: Llama/Qwen/DeepSeek/Mistral/GLM/gpt-oss): `format: "json"` o `format: <json-schema>` en el body. Sin eso, texto libre.
- **Claude** (Anthropic): forzar **tool use** (`tool_choice`) para salida estructurada, o **prefill** del turno assistant (empezar `{`). Para detalles de la API ver la skill `claude-api`.
- **OpenAI-compatible** (incluye Ollama Cloud `/v1`): `response_format: {type: "json_schema", json_schema: {...}}`.
- **Texto plano** (voz/TTS, conversación): pedilo EXPLÍCITO ("respondé solo lo que se dice en voz, en una línea, sin JSON ni campos ni emojis"). No mezcles canales (TTS vs pantalla) sin un contrato que los separe.

## Modalidad: no asumas
- **Voz/realtime:** Gemini Live (audio bidireccional). La mayoría de los modelos abiertos en Ollama son **solo texto** — no hacen voz. Si el rol necesita voz, verificá soporte; si es un test de texto, simulá en texto y avisá que la voz queda para la prueba real.
- **Multimodal (imágenes/pantalla):** verificá por modelo; no todos.

## Elegir modelo por ROL (banco multi-modelo)
- **Coach (lo que se evalúa):** el modelo de PRODUCCIÓN (en Habláh, Gemini) — así el test mide lo real.
- **Alumno/contraparte:** una familia DISTINTA al coach (independencia; rompe el monocultivo "un modelo juzgándose a sí mismo"). Los abiertos de Ollama son ideales.
- **Juez:** una TERCERA familia, distinta del coach (que el juez NO califique a los de su propia casa).
- Diversidad de familias > cantidad. 3 familias distintas valen más que 5 del mismo proveedor.

## Checklist anti-ruleta (correr ANTES de escalar)
1. ¿Qué **contrato de salida** necesito exactamente (texto plano / JSON con qué campos)?
2. ¿El proveedor lo **soporta nativamente** (schema/tool/format)? Usalo — no lo dejes al azar.
3. ¿El modelo soporta la **modalidad** (texto/voz/imagen) del rol?
4. **1 llamada de prueba** y **validá el contrato** (parsea? campos correctos? sin basura?) — recién ahí escalá a N.
5. Si un modelo rompe el contrato, es señal de **contrato faltante**, no de "modelo malo": agregá el enforcement.

## Aplicado a Habláh
- El motor declara voz multimodal sin esquema → en text-test los modelos improvisan. **Fix del test:** coach en texto plano explícito. **Fix de fondo (motor, para validar con micrófono):** o un `responseSchema` estricto que separe TTS/pantalla, o que la Live session fije la modalidad y el prompt no pida estructura. Ver [[project_test_bench_motores]] y [[project_consolidacion_motor_v3_paso0]].
- Modelos disponibles: Claude (CLI), Gemini (key de prod = coach real), Ollama Cloud (alumnos independientes: qwen/deepseek/gpt-oss/mistral/glm...).

> Mantené viva esta skill: cuando un modelo nuevo o un proveedor cambie su forma de enforzar formato/modalidad, actualizá las recetas. Relacionada: `claude-api`, `pedagogy-specialist`, `learning-ux-specialist`.

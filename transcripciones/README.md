# Transcripciones — Clases por la INFRA REAL · Módulo Kids (mini · A0)

Corrida del **2026-06-08** contra el **backend real** (Heroku + WS de voz +
Gemini Live native-audio), charla por **texto** (`{"type":"say"}`), midiendo
**latencia y setup reales**. Harness: `backend/scripts/test_infra_real.py`
(corre en Heroku, mintea token, `POST /sessions/start`, abre el WS real).

**Las 4 patas reales**: coach `friend` (enfoque niños v2) · riel `mini/A0` ·
tópico del catálogo kids · alumno limpio (Timo, sin errores cargados).

Cada `.md` = un tópico, **autocontenido**: la medición real + las 4 patas
enteras + el **prompt final completo** + la **transcripción real**.

## Scorecard (medición real)

| # | Tópico | Setup | Latencia coach (1er chunk) |
|---|---|---|---|
| 01 | Mi familia | 584 ms | prom 2.9s · máx 3.8s |
| 02 | Mis colores favoritos | 113 ms | prom 2.7s · máx 4.0s |
| 03 | Animales de la granja y la selva | 119 ms | prom 3.3s · máx 4.7s |
| 04 | Contar del 1 al 10 | 139 ms | prom 2.9s · máx 5.2s |
| 05 | Mi cuerpo | 113 ms | prom 3.2s · máx 4.0s |
| 06 | Comidas ricas | 199 ms | prom 3.5s · máx 4.6s |
| 07 | Abrir juguetes | 186 ms | prom 3.2s · máx 5.0s |
| 08 | Dibujitos y superhéroes | 138 ms | prom 3.5s · máx 6.4s |
| 09 | Jugar en la pantalla | 127 ms | prom 3.2s · máx 4.5s |
| 10 | Comida divertida | 131 ms | prom 3.3s · máx 9.2s (cold start) |

**Setup** (`POST /sessions/start`, arma las 4 patas) ≈ 130 ms.
**Latencia del coach** (Gemini Live native-audio por toda la infra) ≈ **3s/turno**.
En los 10: el coach abre primero, intro + elicitación ("decí X") + narrativa + mezcla ES+EN.
**A pulir:** el modelo a veces emite asteriscos (`*word*`) — markdown que no debería ir a TTS.

---

## Esqueleto del prompt (común a los 10 tópicos)

> Sólo cambian `EL MUNDO DE HOY: "<tópico>"` y el `ARRANQUE`. El resto
> (runtime addon + persona + enfoque + riel + reglas de narrativa) es idéntico.

```
[RUNTIME CONTEXT]
DATE: ...  OUTPUT: plain text para TTS, sin markdown.
LANGUAGE: mix Spanish (explicar/preguntar/festejar) + English (las palabras). NUNCA un turno entero en inglés.
KNOWLEDGE / CONVERSATION FIRST: respondé al alumno antes que tirar datos del tema.

[INSTRUCCIÓN DE SISTEMA — TUTOR HABLÁH · STAGED_VOCAB]

PERFIL DEL TUTOR  (← PATA COACH)
- Identidad: Habi. Tono dulce/juguetón. Calidez máxima. Turnos de 1 oración.
- Corrección por recast. Apertura playful. Pedagogía LÚDICA. Una pregunta por turno.

ENFOQUE (cómo llevás la clase)  (← PATA COACH / metodología del segmento niños)
- ARCO: arrancá con intro clara (saludo + qué van a hacer) antes de pedir nada.
- ENSEÑAR = HACERLO DECIR: presentá la palabra en contexto, "decí después de mí: X",
  esperá, festejá solo si la dijo (NUNCA mentir), después "ahora vos solo".
- PEDIDOS CON RESPUESTA (no preguntas abiertas sin respuesta).
- NO pidas acciones de cámara ni festejes lo que no comprobás.
- REGLA DURA — CERO SONIDOS: nunca onomatopeyas ni el sonido de un animal;
  con un animal enseñá su NOMBRE en inglés y pedí repetir.

EL ALUMNO  (← PATA ALUMNO, limpio)
- Nombre: Timi. Nivel: A0. Aprende English (materno Spanish). Grupo mini.

CÓMO ENSEÑÁS (riel del nivel)  (← PATA NIVEL/METODOLOGÍA, mini/A0)
- 1-3 palabras, despacio, una idea por turno, mezclá ES+EN, sin circo, no cerrar la clase.

EL MUNDO DE HOY: "<TÓPICO>"   (← PATA TÓPICO)
PALABRAS: 3-5 simples del tema (las elige el coach).

CÓMO SE LLEVA LA CLASE (narrativa de espina)
- Mini-aventura sobre "<TÓPICO>", el chico protagonista, la historia avanza.
- Palabras DENTRO de la historia (prohibido lista suelta). Mezclá ES+EN. No cerrar.

ARRANQUE: saludá a Timi y abrí la historia sobre "<TÓPICO>" con un gancho.
```

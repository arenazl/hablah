# Handoff — 2026-08-16 · Familias del motor + la noche de la voz

Sesión larga (medianoche a 4 AM). Dos frentes: se cerró el modelo de **familias**
del motor, y se cazaron **dos bugs viejos de la capa de voz** que hacían que el
alumno no apareciera en la transcripción.

---

## PARTE 1 — El motor: familias, escalera y nivel por materia

### La discusión que lo destrabó

El dueño miró el combo de disciplinas y dijo que estaba mal desde la jerarquía:
"Fonética" y "Oficios" no son la misma clase de cosa. Tenía razón, y el backend
ya lo delataba — `/dimensions` hacía

```sql
SELECT discipline FROM categories UNION SELECT discipline FROM levels
```

para "no perder ninguna". Estaba uniendo **familias** con **temas**.

### El criterio de familia (es del dueño y es el bueno)

No es el tema: es **si el objeto de estudio sobrevive a la conversión audio→texto**.

    lenguaje      el idioma ES lo que se aprende      A0..C2
    conocimiento  el idioma es el VEHÍCULO            CON1..CON4

Corolarios:

- **Fonética NO es una familia.** Es `lenguaje` con una capacidad bloqueada por
  el ASR: la cadencia muere en el audio→texto. Es limitación TÉCNICA, no
  arquitectónica — cuando haya modelos audio-nativos entra sin rediseño.
- **Oratoria tampoco.** La performance (ritmo, pausas, volumen) se pierde igual;
  sólo sobrevive la estructura del discurso → va en `conocimiento`.
- **UNA escalera para todo conocimiento.** Informática, oficios, música, oratoria,
  creativo, y las que vengan (química, historia) comparten `CON1..CON4`. Sumar una
  materia nueva es un INSERT de tópicos: **cero orquestación**.

### El árbol

    FAMILIA → MATERIA → EDAD → NIVEL → (CATEGORÍA opcional) → TÓPICO

- **El idioma NO es eslabón**: es atributo del perfil (capa ALUMNO). Probado: el
  mismo tópico compone en francés y portugués sin cargar una fila, porque el
  catálogo son instrucciones AL COACH y el template trae la `Language_Note`.
  En `lenguaje` el idioma aparece temprano, pero como MATERIA.
- **La categoría es opcional en el árbol** (19 categorías para 47 tópicos no
  filtran nada), pero el dueño la quiere para el ONBOARDING: "me gusta la ciencia"
  → recomendar tópicos. Dos usos del mismo dato.
- **Las semillas se comportan distinto por familia**: en `lenguaje` son las
  palabras exactas a practicar (NO se traducen); en `conocimiento` son conceptos
  (el coach los dice en el idioma que hable).

### Qué se cargó

| | antes | ahora |
|---|---|---|
| escaleras | 2 (idiomas, fonética) | 3 (+ conocimiento) |
| cruces `age_level_matrix` | 19 | **39** |
| tópicos con nivel de su familia | 0 | 46 |

- `CON1 Inicial · CON2 Autónomo · CON3 Avanzado · CON4 Profesional`
- 16 cruces edad × CON + los 4 de lenguaje que faltaban (teen×A0/C1/C2, junior×B2)
- `categories.family` y `levels.family` (columnas nuevas, aditivas)
- **`user_level(user_id, materia, level_code)`** — el nivel dejó de ser del alumno
  y pasó a ser del alumno POR MATERIA (B2 en inglés, A1 en francés, CON1 en
  historia). Es un OVERRIDE: sin fila se usa `users.cefr_level`, así nada se rompe.
- 7 perfiles de prueba con nativos es/fr/pt/it/en + los 6 idiomas activados.

El contenido lo redactó Gemini con el brief `docs/carga-disciplinas/brief_llenado_motor.json`
(230 campos). Salió bien; lo único que ensució fueron 123 marcadores `[cite: 3]`,
que el cargador ahora sanitiza solo.

### La prueba de que funciona

`informatica × adult × CON3`, antes y después:

    ANTES  Level_Target: Tiempos perfectos (Present/Past Perfect), conectores discursivos
           Language_Rule: Speak 100% in español; do not switch to español
    AHORA  Level_Target: Criterios de decisión complejos, casos atípicos, optimización
           Language_Rule: Hablá en español usando la jerga natural del rubro

Y una clase real por voz en `CON1` donde el coach hizo exactamente lo que pide la
escalera nueva: *"un browser, que no es más que el programa que usás para entrar a
las páginas web"* — término en su forma original + una frase de aclaración.

---

## PARTE 2 — La noche de la voz: dos bugs, no uno

**Síntoma:** el alumno no aparecía en la transcripción. El coach hablaba bien, el
mic andaba, y Gemini devolvía `<noise>` o caracteres tailandeses.

### Bug A — el worklet descartaba el 40% del audio

`mic-processor.js` tenía su propio VAD y tiraba los bloques bajo el umbral:

    worklet_msgs=234   con_pcm=140     → 12 de cada 30 segundos, al tacho

Y no de corrido: **agujeros de 128 ms en medio de las frases** — una sílaba cada
dos o tres palabras. Gemini escribía ruido porque recibía ruido.

**Historia:** nació el 25/05 (`9829deb`) como optimización de ancho de banda. El
06/06 ya había mordido (`4b607ac`: *"worklet local VAD blocked silence → coach
never replied"*) y se parchó con una cola de silencio en vez de sacarlo. Ese parche
tapó la causa tres meses. El dueño recordó el contexto: se venía peleando con que
no tomaba **los monosílabos de los nenes** — y cada parche (prefix padding 700,
sensibilidades) compensaba el mismo filtro.

### Bug B — `start()` no cerraba la sesión anterior

**La causa raíz.** `start()` pisaba las refs (stream, AudioContext, worklet, WS)
sin apagar la sesión previa, que quedaba VIVA. Su worklet seguía capturando el
mismo micrófono y escribiendo en `wsRef.current`, que ya apuntaba al socket nuevo:

    worklet #1 (viejo) ─┐
                        ├─→ wsRef.current ──→ Gemini
    worklet #2 (nuevo) ─┘

Dos capturas intercaladas, **y una más por cada charla iniciada sin refrescar**.

    charla 1:  audio picado                → transcribe a medias
    charla 2:  picado + duplicado          → <noise>
    charla 3:  picado + triplicado         → tailandés

Por eso las mediciones no cerraban: el escenario cambiaba según cuántas charlas
llevabas. **El fix son 6 caracteres: `stop()` al entrar** (en `start` y `startInRoom`).

### Lo que destrabó el caso

No fue el análisis, fueron tres datos del dueño:
1. *"se movía el vúmetro pero nada"* → mató la teoría del micrófono
2. *"probé en inglés"* → mató la teoría del idioma
3. *"nunca me tomó 2 charlas seguidas"* → **ahí se terminó**

### Resultado medido

    ANTES  worklet 234 → con_pcm 140 · 0 transcripciones · veredicto "alumno mudo"
    AHORA  worklet 340 → con_pcm 340 · 3 transcripciones · lag 46-87 ms · OK

Con el **prompt al 100%**: no hubo que recortar ninguna regla.

### Hipótesis que se cayeron (todas mías, todas medidas)

proxy de Vite · sample rate · API key/cuota · `NO_INTERRUPTION` (está desde junio
y además `app_config` ya lo pisaba con INTERRUPT) · el idioma · el modelo · el
largo del prompt.

---

## Herramientas nuevas (en `/motor`, banco de pruebas)

| control | qué hace |
|---|---|
| switch **"Probar sólo infra"** | prompt mínimo en vez del compuesto: separa motor de plomería en un click. El texto vive en `app_config.infra_test_prompt` — se cambia sin build |
| combo **Densidad** | 4 versiones del MISMO prompt (100/81/60/24%) manteniendo la estructura: mismos bloques y orden, menos contenido |
| selector de **Modelo de voz** | sólo los 2 que la cuenta tiene con la voz Aoede; el resto da "voice unavailable" |
| logs `audio.cadena` | la cadena completa: `worklet_msgs → con_pcm → voz → gate_ptt → enviados → rms_max` |
| logs backend | `rms` + `signal`, `lag_ms` de transcripción con veredicto, `veredicto` en `session.engine.end` |

Además: la transcript se guardaba con las palabras pegadas (`"".join()` sin
separador) y **sobre ese texto se construye la memoria del alumno**. Arreglado, y
se agregó `ts` por turno (antes siempre `null`, por eso no se podía medir latencia).

---

## Pendiente

### 1. Verificar lo que quedó sin correr (5 minutos)
- **Dos charlas seguidas sin refrescar** — es literalmente el escenario del bug B
- **Una clase de kids** — el worklet cambió para todos y los monosílabos son el
  caso sensible; debería andar MEJOR (ya no hay umbral local que los filtre)

### 2. Recalibrar el VAD (todas son `app_config`, sin deploy)
Las tuercas están apretadas para compensar el filtro que ya no existe:

    vad_silence_duration_ms_kid   1500   ← el coach espera 1,5s tras el monosílabo
    vad_prefix_padding_ms_kid      700   ← el arranque ya llega entero
    vad_end_sensitivity_kid        LOW   ← el monosílabo ya llega completo

Propuesta: bajar a 900 y 300, medir `lag_ms` y si el nene queda cortado, subir.

### 3. Semillas en inglés en materias de conocimiento
"Teoría musical desde cero" trae `that chord sounds too dark`; informática trae
`did you accidentally delete it`. Son frases de práctica de idiomas, no conceptos.
Rompe el caso "un francés aprende informática". Son 46 tópicos → brief a Gemini.

### 4. Chico
- 3 perfiles (`Chloé`, `Giulia`, `Thiago`) con nivel `CON*` sin materia asignada
- El log `audio.cadena` escribe cada 10 envíos: subirlo a 100 cuando esté estable
- `mini` con "Desarrollo web": es `topics.segmento`, catálogo

### 5. Deuda de fondo: "la mitad configurable y la mitad en el código"
Patrón que apareció tres veces en la sesión y vale como línea propia:
`discipline` haciendo dos trabajos · las perillas del VAD existían sólo para kids
(los adultos caían a defaults de Python) · el prompt de prueba hardcodeado.

---

## Infra

- El CD del backend es un trigger en **southamerica-east1** (`deploy-hablah-api`,
  `includedFiles: backend/**`) aunque el servicio corre en **us-east4**. Los builds
  que aparecen en las dos regiones son **dos etapas del mismo deploy** (~2 min de
  diferencia), no duplicación.
- Los deploys de Netlify en estado `error` con *"Canceled build due to no content
  change"* son commits que no tocan el front. No es una falla.
- El Dockerfile tiene un `import-check` de los módulos de voz que **bloqueó 5
  deploys rotos** el 15/08 (un import colgado tras un rename). No tocarlo.

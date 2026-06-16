# Mejoras a los 9 pasos (camino en tiempo real)

Estas son mejoras al **camino síncrono** — lo que pasa mientras el alumno espera la respuesta. La premisa es no romper lo que ya funciona: el composer sigue siendo concatenación determinista de bloques en XML, **sin IA intermedia**. Lo que sigue son refinamientos que se apoyan en esa estructura, no que la reemplazan.

Cada mejora dice **dónde cae**: si es una lectura que alimenta un bloque, una regla dentro de un bloque existente, un bloque nuevo, o la capa de salida (runtime).

---

## Resumen: dónde cae cada cosa

| Mejora | Dónde cae | ¿Toca el composer? |
|--------|-----------|--------------------|
| Estado del alumno (SRS) | lectura → se inyecta en el Bloque 5 | no, solo cambia el dato |
| Estado de interacción | Bloque nuevo (10), vive en la sesión | no, se concatena igual |
| Escalera de habilidad | regla dentro del Bloque 6 (rieles) | no |
| Desvanecer el espejo | regla dentro del Bloque 6 (rieles) | no |
| Seguridad infantil | Bloque nuevo estático (siempre activo) | no, un bloque más |
| Validador de salida | capa de runtime (post-generación) | no |
| Higiene de TTS / ASR | capa de runtime | no |
| Variedad controlada | parámetro de compose (temperatura) | mínimamente |
| Dialecto del L1 | config del Bloque 1 / Bloque 2 | no |

La idea de fondo: casi nada cambia *cómo* se arma el prompt. Cambia *con qué datos* se llena y *qué se chequea* en la salida.

---

## 1. Inyectar el estado del alumno en el Bloque 5 (lo más importante)

**Gap:** hoy el Bloque 5 sabe edad/nivel/intereses, pero no qué palabras domina, cuáles falla ni qué toca repasar. Sin eso no hay retención: el alumno escucha "Apple" una vez y no vuelve en el momento óptimo.

**Por qué importa:** la retención de vocabulario depende de la repetición espaciada (reencontrar la palabra justo antes de olvidarla). Es el factor número uno del aprendizaje de vocabulario.

**Dónde cae:** no es lógica nueva en el composer. Es una *lectura* de las tablas del alumno que se inyecta junto al Bloque 5. El composer concatena igual que siempre.

```xml
<learner_state>
  Mastered: [Apple, Ball, Dog]
  Learning: [Banana(seen:3, ok:1), Cat(seen:1, ok:0)]
  Due_For_Review: [Apple, Dog]    <!-- el SRS las marca para hoy -->
  Recent_Errors: [Banana]
</learner_state>
```

Quién llena esas tablas es el trabajo post-clase (documento aparte). Acá solo se leen.

---

## 2. Bloque 10: estado de interacción (adaptar en vivo)

**Gap:** el prompt se arma una vez al inicio. Si el chico falla "Apple" tres veces, el sistema no se entera hasta la próxima sesión.

**Por qué importa:** la calidad de conversación *es* adaptar en tiempo real: bajar cuando se traba, subir cuando vuela.

**Dónde cae:** un bloque nuevo que la app actualiza entre turnos (en memoria, determinista) y re-inyecta en cada llamada. Es barato: son contadores, no IA.

```xml
<interaction_state>
  Turn: 4
  Current_Target: Banana
  Attempts_On_Target: 2       <!-- intentos fallidos seguidos -->
  Signal: struggling          <!-- struggling | flowing | idle -->
</interaction_state>
```

Regla asociada (vive en el Bloque 6): si `Attempts >= 3` → simplificar (volver a una palabra, dar pista fonética) y marcar el ítem para refuerzo; si `Signal = flowing` → introducir el próximo ítem.

---

## 3. Escalera de habilidad (regla dentro del Bloque 6)

**Gap:** el riel de 5 años termina en "repetí una palabra". Repetir es el escalón más bajo (pura imitación).

**Por qué importa:** aprender es pasar de reconocer a **producir** y después **usar**. Si solo repite, no internaliza.

**Dónde cae:** una dimensión `skill_stage` por ítem (guardada en la tabla de progreso, leída en el estado) que el riel usa para decidir qué tipo de pedido hacer:

```
repetir  →  reconocer (¿cuál es la manzana?)  →  recordar (producir sin modelo)  →  usar (en contexto nuevo)
```

El preset de rieles cambia el pedido según el stage del ítem, no solo según la edad.

---

## 4. Desvanecer el espejo en español (regla dentro del Bloque 6)

**Gap:** el modificador de nivel prende/apaga el espejo como binario; en A1 traduce SIEMPRE.

**Por qué importa:** traducir todo crea dependencia del L1 y frena el "pensar en inglés". El espejo debe ser fallback, no default.

**Dónde cae:** una regla en los rieles que lee el `learner_state`: traducir solo ítems nuevos o cuando `Signal = struggling`. Una palabra en `Mastered` ya no se traduce, aunque el alumno sea A1.

---

## 5. Bloque de seguridad infantil (nuevo bloque estático)

**Gap:** es un producto para chicos con LLM + voz. Hoy los rieles son pedagógicos, no de seguridad.

**Por qué importa:** protege al chico, da tranquilidad a los padres y suele ser requisito de las tiendas de apps.

**Dónde cae:** un bloque estático, siempre activo, que se apila antes de todo. No depende de los inputs:

```xml
<safety_guards>
  - Nunca pedir datos personales (nombre real completo, dirección, escuela, teléfono).
  - Nunca proponer secretos, encuentros ni contacto fuera de la app.
  - Ante cualquier tema fuera de la lección, redirigir con suavidad al juego.
  - No producir contenido violento, sexual ni que asuste a un niño.
</safety_guards>
```

---

## 6. Validador determinista antes del TTS (capa de runtime)

**Gap:** confiamos en que el modelo respeta los rieles, pero a veces se zarpa (frase larga, sin espejo, pregunta abierta a un nene).

**Dónde cae:** después de generar y antes de mandar al TTS. Un checker de reglas (regex/lógica, **sin LLM** → cero latencia extra) valida la salida contra los rieles de la banda. Si falla (p.ej. más de 30 palabras, o falta el espejo en A1), regenera una vez.

Aclaración importante: esto **no** es la IA intermedia que descartamos. Es validación determinista y barata, no consolidación con otro modelo.

```
salida_modelo
  → check: ¿<= 30 palabras? ¿tiene espejo si corresponde? ¿no hay pregunta abierta en banda infantil?
      → OK   → TTS
      → falla → regenerar (1 reintento) → si vuelve a fallar, recortar de forma determinista
```

---

## 7. Higiene de voz: TTS y ASR (capa de runtime)

**TTS — Gap:** el tutor infantil usa emojis (🚀⭐🦖) y onomatopeyas; el motor de voz los lee mal o los deletrea.
**Cambio:** separar canal visual de canal de voz. Emojis y onomatopeyas → solo a la UI. El string que va al TTS, limpio. (Se puede pedir al modelo que devuelva dos campos: `voice_text` y `screen_text`.)

**ASR — Gap:** el reconocimiento de voz de un nene de 5 hablando inglés es muy ruidoso. Si el ASR escucha mal, el sistema "corrige" algo que el chico dijo bien.
**Cambio:** ante baja confianza del ASR, no marcar error → pedir repetir de forma lúdica ("¡No te escuché bien, decímelo de nuevo!") y **no** contarlo como intento fallido en las métricas.

---

## 8. Variedad controlada (parámetro de compose)

**Gap:** composer determinista + tópico/narrativa fijos → sesiones repetidas → aburrimiento → menos aprendizaje.

**Dónde cae:** mantener fijos los bloques críticos (6 rieles, 7 vocab) y permitir variación en los no críticos (4 enfoque, 8 narrativa) con algo de temperatura. El vocabulario objetivo no cambia; el envoltorio narrativo sí.

---

## 9. Detalles finos

- **Dialecto del L1 explícito.** El tono usa voseo ("Decí"). Hacerlo config (`native_dialect: es-AR`) en el Bloque 1/2 para que no drifte entre bandas o sesiones.
- **Multi-interés.** Hoy se elige un interés por sesión; combinar y rotar (dino + cohete) evita que el tema se gaste. El peso de cada interés lo ajusta el post-clase.
- **Duración por banda.** La atención de un 5 años es corta: máximo de turnos/tiempo por banda y cierre "en alto" con un logro.
- **Validar el Bloque 7 en la capa de datos.** Un test automático que garantice que `topics` nunca traiga instrucciones de comportamiento (eso vive en los Bloques 2/3/6).

---

## En una frase

Los 9 pasos no se reescriben. Se les suma **un bloque de seguridad** (estático), **un bloque de estado vivo** (Bloque 10), **una lectura de memoria** en el Bloque 5, **un par de reglas** en los rieles y **una capa de validación/voz** en la salida. El composer determinista que ya te dio la mejor clase del año queda igual.

# Mejoras propuestas — calidad de conversación y aprendizaje

Objetivo único: que las conversaciones sean mejores y que el alumno **aprenda y retenga**.

La arquitectura de 9 bloques es sólida para *armar* un prompt. Pero hoy es **stateless**: compone una sesión sin saber qué aprendió el alumno, ni cómo viene saliendo el turno en curso. El mayor salto de calidad es pasar de un *composer stateless* a un *loop de aprendizaje con estado*. Todo lo de abajo está ordenado por impacto sobre el objetivo.

---

## Nivel 1 — Lo que más mueve la aguja en aprendizaje

### 1. Modelo del alumno + repetición espaciada (SRS)
**Gap:** el Bloque 5 sabe edad/nivel/intereses, pero no qué palabras domina, cuáles falla, ni cuándo toca repasarlas. El alumno escucha "Apple" una vez y la palabra no vuelve en el momento óptimo.
**Por qué importa:** la retención de vocabulario depende de reencontrar la palabra justo antes de olvidarla (curva de olvido / spaced repetition). Es el factor número uno del aprendizaje de vocabulario.
**Cambio:** sumar un sub-bloque `[D]` de estado del alumno, alimentado por la DB, y que la selección de tópico (upstream) priorice el repaso debido más 1–2 ítems nuevos.

```xml
<learner_state>
  Mastered: [Apple, Ball, Dog]
  Learning: [Banana(seen:3, ok:1), Cat(seen:1, ok:0)]
  Due_For_Review: [Apple, Dog]    <!-- el SRS las marca para hoy -->
  Recent_Errors: [Banana]
</learner_state>
```

### 2. Adaptación en vivo (estado de interacción turno a turno)
**Gap:** el prompt se arma una vez al inicio. Si el chico falla "Apple" tres veces, el sistema no se entera hasta la próxima sesión.
**Por qué importa:** la calidad de conversación *es* adaptar en tiempo real — bajar cuando se traba, subir cuando vuela.
**Cambio:** un Bloque 10 `[D]` de estado vivo que la app actualiza entre turnos y re-inyecta.

```xml
<interaction_state>
  Turn: 4
  Current_Target: Banana
  Attempts_On_Target: 2       <!-- intentos fallidos seguidos -->
  Signal: struggling          <!-- struggling | flowing | idle -->
</interaction_state>
```

Regla asociada en los rieles: si `Attempts >= 3` → simplificar (volver a una sola palabra, dar pista fonética) y re-encolar el ítem en el SRS; si `Signal = flowing` → introducir el próximo ítem.

### 3. Escalera de habilidad (no quedarse en "repetir")
**Gap:** el riel de 5 años termina en "repetí una palabra". Repetir es el escalón más bajo (pura imitación).
**Por qué importa:** aprender es pasar de reconocer a **producir** y después **usar**. Si solo repite, no internaliza.
**Cambio:** una dimensión `skill_stage` por ítem que progresa:
`repetir → reconocer (¿cuál es la manzana?) → recordar (producir sin modelo) → usar (en contexto nuevo)`.
El tipo de pedido del riel cambia según el stage del ítem, no solo según la edad.

### 4. Input comprensible (i+1)
**Gap:** la dificultad del tópico se escala solo por nivel CEFR ("más frases para nivel alto").
**Por qué importa:** el input debe estar un escalón por encima de lo conocido. Demasiado fácil aburre; demasiado difícil bloquea.
**Cambio:** cada sesión ≈ 80% ítems ya conocidos + 20% nuevos. Eso se decide en la capa de currícula usando el `learner_state`, no a mano.

### 5. Desvanecer el andamiaje (el espejo en español)
**Gap:** el modificador de nivel prende/apaga el espejo como binario; en A1 traduce SIEMPRE.
**Por qué importa:** traducir todo crea dependencia del L1 y frena el "pensar en inglés". El espejo debe ser fallback, no default.
**Cambio:** traducir solo ítems nuevos o cuando hay bloqueo (`Signal = struggling`), no cada frase. Y desvanecer con el dominio: una palabra en `Mastered` ya no se traduce, aunque el alumno sea A1.

---

## Nivel 2 — Calidad de la conversación (es una app de VOZ)

### 6. Higiene de salida para el TTS
**Gap:** el tutor de 5 años usa emojis (🚀⭐🦖) y onomatopeyas. El motor de voz los lee mal o los deletrea.
**Cambio:** separar el canal visual del de voz. Emojis y onomatopeyas → solo a la UI; el texto que va al TTS, limpio. Riel de salida: nunca emojis en el string de voz.

### 7. Tolerancia a errores de reconocimiento (ASR)
**Gap:** el reconocimiento de voz de un nene de 5 hablando inglés es muy ruidoso. Si el ASR escucha mal, el sistema "corrige" algo que el chico dijo bien.
**Por qué importa:** penalizar por un fallo del ASR rompe la confianza y sube el filtro afectivo.
**Cambio:** ante baja confianza del ASR, no marcar error → pedir repetir de forma lúdica ("¡No te escuché bien, decímelo de nuevo!") y no contarlo como intento fallido en las métricas.

### 8. Validador determinista antes del TTS
**Gap:** confiamos en que el modelo respeta los rieles, pero a veces se zarpa (frase larga, sin espejo, pregunta abierta a un nene).
**Cambio:** un checker de reglas (regex/lógica, sin LLM → cero latencia extra) valida la salida contra los rieles de la banda antes de mandarla al TTS. Si falla (p.ej. más de 30 palabras o falta el espejo), regenera.
Aclaración: esto **no** es la IA intermedia que descartamos. Es validación determinista y barata, no consolidación con otro modelo.

### 9. Variedad controlada
**Gap:** composer determinista + tópico/narrativa fijos → sesiones repetidas → aburrimiento → menos aprendizaje.
**Cambio:** variar el framing narrativo y los ejemplos manteniendo el vocabulario objetivo estable. Algo de aleatoriedad y temperatura > 0 en bloques no críticos (4 y 8); los rieles (6) y el vocab (7) quedan fijos.

### 10. Manejo afectivo y límite de intentos
**Gap:** más allá de "celebrar el esfuerzo", no hay manejo de frustración.
**Cambio:** señales de frustración (pausas largas, fallos repetidos, silencio) → bajar dificultad o cambiar de actividad. Máximo tres intentos por ítem antes de seguir y re-encolarlo. Para chicos, cerrar siempre la sesión "en alto", con un logro.

---

## Nivel 3 — Estructura que falta upstream

### 11. Capa de currícula (¿quién elige el tópico de hoy?)
Hoy `topic_id` se pasa desde afuera. La secuencia de qué enseñar y cuándo es la columna vertebral del aprendizaje y no está modelada. Falta un *sequencer* que elija el tópico combinando progresión del nivel + ítems SRS debidos + interés. Va arriba del composer.

### 12. Duración de sesión por banda
La atención de un 5 años es muy corta. Definir un máximo de turnos/tiempo por banda y un cierre con recompensa. Mejor cinco minutos que terminan bien que quince que aburren.

---

## Nivel 4 — Producto y confianza

### 13. Rieles de seguridad infantil (bloque aparte)
Es un producto para chicos con LLM + voz. Hoy los rieles son pedagógicos, no de seguridad. Conviene un bloque/riel explícito: nunca pedir datos personales, nunca salir del marco de la lección hacia temas sensibles, nunca proponer secretos ni encuentros, y ante cualquier cosa fuera de tema, redirigir con suavidad al juego. Protege al chico, da tranquilidad a los padres y suele ser requisito de las tiendas de apps.

### 14. Métricas (no se mejora lo que no se mide)
Para saber si la calidad y el aprendizaje suben, hay que instrumentarlo:
- **Aprendizaje:** tasa de retención del vocab objetivo, % de ítems que pasan a `Mastered`, tendencia del error.
- **Conversación:** producción del alumno (largo y complejidad creciente), turnos por sesión, % de target *producido* (no solo escuchado), tiempo de respuesta.
- **Engagement:** sesiones completadas, drop-off, retorno.

Lo clave: medir **producción**, no solo exposición. Que escuche "Apple" no es que lo aprendió; que lo diga sin modelo, sí.

### 15. Presets como experimentos
Versionar los presets (tutor / pedagogía / rieles) y medir qué variante da mejor retención y engagement. Tratar cada preset como un A/B, no como verdad fija.

---

## Detalles finos del diseño actual
- **Dialecto del L1 explícito.** El tono usa voseo ("Decí"). Hacerlo config (`es-AR` rioplatense) para que no drifte entre bandas o sesiones.
- **Multi-interés.** Hoy se elige un interés por sesión; combinar y rotar (dino + cohete) y dejar que evolucione evita que el tema se gaste.
- **Validar el Bloque 7 en la capa de datos.** Reforzar con un test automático que `topics` nunca traiga instrucciones de comportamiento (ya está en la guía como regla; conviene volverlo chequeo).

---

## El cambio de fondo
Pasar de **composer stateless** (arma un prompt lindo por sesión) a **loop de aprendizaje con estado** (sabe qué sabe el alumno, cómo viene el turno, y adapta). Los 9 bloques quedan igual; se suman dos fuentes de estado — `learner_state` e `interaction_state` — y una capa de currícula arriba. Eso es lo que convierte una conversación entretenida en aprendizaje que retiene.

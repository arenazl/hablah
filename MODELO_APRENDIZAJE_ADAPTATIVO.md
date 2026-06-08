# Modelo de Aprendizaje Adaptativo — Habláh (doc macro)

> Fuente de verdad del **qué** y el **porqué**. No es plan de implementación
> (eso va en un doc aparte). Es el modelo conceptual que todo lo demás debe servir.

---

## 1. El objetivo (la esencia)

**No es Duolingo. No es emular a un profe humano.**

Es **aprendizaje dinámico que se moldea a CADA alumno** — algo que ningún humano
puede ser. Un profe real es fijo: una personalidad, una paciencia, un estilo, se
cansa, no puede leer y adaptarse perfecto a cada persona. Nuestro sistema sí.

La **misma máquina** tiene que poder ser, a la vez:
- para el nene tímido de 5 → un cuento suave y paciente,
- para el adolescente canchero → directo, con los códigos de su mundo,
- para el adulto metódico → estructurado y claro,
- para el adulto jugado → un par que lo provoca y lo hace defender ideas.

Cuatro experiencias **distintas**, no una con barniz.

> **El producto ES la adaptación misma.** No un feature: el corazón.

Y cada clase tiene que tener **sentido**: que al terminar, el alumno no piense
"repetí palabras", piense "viví algo, y de paso aprendí".

---

## 2. El principio: prompt vivo desde contexto vivo

No hay clases enlatadas. Cada clase se ensambla **Just-In-Time** cruzando varias
dimensiones para ESE alumno, esa vez. La misma máquina = **infinitas clases
distintas**. Ningún par (alumno, tópico, momento) produce dos veces lo mismo.

Lo contrario de Duolingo, eje por eje:
| Duolingo | Habláh |
|---|---|
| un camino único para todos | **perfila** a cada uno y le da lo suyo |
| palabra suelta, drill | **narrativa** que hila todo |
| tap-tap, ejercicio | **conversación con contexto**, frases que crecen |
| molde fijo | **prompt vivo** armado para ese alumno |
| (sin rigor visible) | **rigor real invisible** (rieles por nivel) |

---

## 3. Las dimensiones que se cruzan (las "patas")

Cada clase se arma cruzando estas dimensiones. Ninguna se usa aislada: existen
sólo para **converger en un único prompt** con narrativa de espina.

### 3.1 TÓPICO — el QUÉ se habla
El tema, a secas. Motivacional, lo elige el alumno porque le apasiona. Dos ejes:
- **SEGMENTO**: niños | adolescentes | adultos (la audiencia).
- **CATEGORÍA temática**: Tecnología, Arte, Negocios… (adultos) / Animales,
  Cuentos, Superhéroes, Comidas… (niños).
- Ejemplos: dinosaurios, comidas ricas, superhéroes (niños); videojuegos
  (adolescentes); ingeniería espacial, sexo virtual (adultos).
- **El tópico NO guarda vocabulario.** Es simple.

### 3.2 NIVEL / METODOLOGÍA — el rigor (A0 → C2)
El "riel de acero" invisible: las **auto-restricciones** del coach por nivel.
- A0 → "1-3 palabras, mezclá español + inglés, no exijas gramática".
- A1 → "presente continuo, prohibido el pasado".
- A2 → "pasado simple + conectores (but/because)".
- B1 → "phrasal verbs cotidianos, velocidad normal".
- B2/C1 → "par intelectual, dilemas, condicionales/pasiva, léxico técnico".
- C2 → "pulir matices, ironía, registro".
- **El léxico de la clase NO vive acá ni en el tópico**: se **genera** del cruce
  **tópico × nivel** ("comidas ricas × A0" → pizza, hot, dog, yummy) como anclas
  para tejer en la narrativa — nunca como jaula.

### 3.3 SEGMENTO — la audiencia y la llave de la narrativa
niños | adolescentes | adultos. Categoriza el tópico y **abre** la narrativa /
empatía correctas. Adultos = un segmento por ahora (extensible).

### 3.4 COACH / ENFOQUE — cómo se lleva la clase
El enfoque pedagógico, **scopeado por segmento**:
- **niños** → explicar el mundo, dar ejemplos, alguna broma, e **ir uniendo las
  palabras en una frasecita** (esto último mata el "pizza, dog, bye").
- **adolescentes** → directo, con referencias a su mundo (redes, etc.).
- **adultos** → **varios** enfoques por personalidad (entrevistador, charlatán,
  mentor, provocador, lúdico — ya existen como `pedagogy_preset`).

> **Separación clave:** el **NIVEL** (restraints: 1-3 palabras, mezclá ES+EN) vive
> en METODOLOGÍA; el **ENFOQUE / narrativa** vive en el **COACH**. Hoy están
> mezclados (el enfoque de niños está metido dentro del riel A0) — hay que separarlos.

### 3.5 ALUMNO — la personalización
Su nivel, segmento, intereses, **errores recientes**, preferencias aprendidas en
vivo, progreso. Ajusta el prompt a la persona concreta.

---

## 4. La NARRATIVA es la espina (no un adorno)

El error de todas las versiones (y de Duolingo) es **drillear palabras sueltas
sin hilo**: *"pizza… ok pizza, ahora dog, muy bien DOG, ok bye"*. Eso es una
lista, no una clase.

La clase tiene que ser **una historia / aventura** donde las palabras aparecen
**dentro del cuento**, encadenadas, con el alumno de protagonista. El vocabulario
sirve a la historia, no al revés.

- Mal: *"pizza. dog. bye."*
- Bien: *"¡Timi, tengo hambre! Hagamos una PIZZA… ¿de qué? ¡Uh, vino un DOG y la
  quiere! ¿le damos un pedazo?"* — la misma palabra viviendo en una aventura que
  **avanza** y donde el alumno decide.

La narrativa la define el **coach/enfoque** según el segmento (niños = cuento,
adolescentes = reto, adultos = debate/charla).

---

## 5. El onboarding: el sistema se PERFILA solo

Ni el enfoque se elige a mano. La **primera vez que entra** (login/onboarding):
una **charla libre en castellano** (el alumno cómodo en su idioma). De ahí el
sistema **deduce**:
- qué le interesa → **tópicos**,
- su personalidad / cómo engancha → **enfoque (coach)**,
- madurez / edad → **segmento**,
- pistas de **nivel**.

Con eso arma el **perfil** del alumno. De ahí en más, cada clase usa ese perfil.
Si el alumno cambia, se re-perfila. **La adaptación arranca acá.**

---

## 6. Cómo se genera el prompt de cada clase (el circuito)

```
ONBOARDING (charla libre en castellano)
        → deduce → PERFIL [enfoque + segmento + nivel + intereses]
                                  ↓
cada CLASE (en el setup, antes de abrir el WS, una sola vez):
   TÓPICO  +  NIVEL (riel + léxico generado tópico×nivel)
          +  SEGMENTO  +  COACH (enfoque)
                                  ↓
   PROMPT con NARRATIVA de espina  →  systemInstruction de Gemini Live
```

### Restricción DURA
Todo el armado pesado (cruces, generación de léxico) va **sólo en el setup**,
antes de abrir el WebSocket. Una vez que arranca la conversación, el loop en vivo
queda **intacto y fluido** — cero trabajo por turno. Un loading en el arranque es
aceptable; latencia en la charla, no (si no, no sirve).

---

## 7. Principios de construcción (cómo trabajamos)

1. **Observabilidad total**: cada clase loguea el **circuito entero** (cadena de
   relaciones resueltas) + el **prompt final**. SABER, no suponer.
2. **Datos, no suposiciones**: antes de diagnosticar, instrumentar y mirar el
   dato real. Nada de "probablemente pasó X".
3. **Nada de carnicero / ctrl+z reflejo**: cuando algo falla, se revisa el
   circuito y se entiende el porqué — no se revierte ni se parchea a ciegas.
4. **Con supervisión**: explico → se aprueba → recién ahí se codea. Sin cambios a
   prod sin OK.
5. **Narrativa siempre**: si una clase es lista de palabras, está mal, sin
   importar qué tan bien estén las tablas.

---

## 8. Errores ya cometidos a corregir (deuda)

- Migré "Saludos/Colores/Conteo" como **tópicos** → no son tópicos, son
  vocabulario. Se descartan (los 10 `kids-mini-*` + sus junctions).
- `pinned_vocabulary` pegado al tópico → el léxico se **genera** (tópico × nivel).
- **Fallback a la etapa desconectada** cuando falta el léxico → fue la causa de
  *"la pizza tiene un name"*. Se elimina.
- **"English only"** en el prompt de kids → contradice la mezcla ES+EN. Se saca.

---

## 9. Traducción patas → datos (resumen)

| Pata (concepto) | Dónde vive |
|---|---|
| Tópico (tema + segmento + categoría) | tabla `topics` (simple) |
| Nivel / Metodología (rieles) | tabla de niveles (los `methodology_modules` ya creados) |
| Léxico (tópico × nivel) | generado en el setup (cacheado), no almacenado en el tópico |
| Segmento (niños/ado/adultos) | clasificador (en tópico + en coach) |
| Coach / Enfoque (scopeado por segmento) | tabla `templates` (coaches) + `pedagogy_preset` |
| Narrativa | la define el coach/enfoque según segmento |
| Perfil del alumno | `users` + errores + preferencias + onboarding |

---

*Próximo doc: el plan de implementación por pasos (qué se borra, qué se crea, en
qué orden, con el circuito logueado para verificar cada paso).*

# Handoff — 2026-08-17 · Los cables del motor y el bucle que faltaba

Sesión muy larga. Empezó buscando por qué todas las clases salían iguales y terminó
encontrando que **el motor se volvió polimórfico ayer y el catálogo no se enteró**. Casi todo
lo del día sale de ahí.

---

## El hilo, de punta a punta

El dueño probó música y notó: *"con ese prompt lo llamás 10 veces y todas las clases son
iguales. beat, beat y beat"*.

Tirando de eso aparecieron dos bugs de plomería, y detrás de ellos una familia entera de
problemas que se pueden resumir en una frase:

> El motor ya era agnóstico a la disciplina. Los DATOS seguían siendo de una app de inglés.

---

## PARTE 1 — Los cables del eje IDIOMA

### Cómo se midió

Muestreo dirigido, sin correr una sola clase: se compone el mismo caso variando **un eje** y
se compara de qué fila salió cada dato. Un cable está conectado si el valor cambia cuando se
mueve el eje del que debería depender.

Resultado sobre 5 casos (idiomas adulto y kids, jardinería, informática, música):

    Level_Target         no se movía entre en/pt/fr    5 de 5
    Words_Available      no se movía                   5 de 5
    Expected_Production  no se movía                   5 de 5
    Start_Command        no se movía                   4 de 5

**Ninguno estaba vacío.** Por eso no lo agarraba ni el fail-fast ni el linter: no hay
contradicción formal, hay un idioma asumido.

### Los síntomas que explicaba

    clase de portugués     Level_Target decía "verbo To Be"
    clase de jardinería    "teníamos que tener seeds, ¿sabés lo que es una seed?"
    clase de portugués A1  el coach hablaba en español

### Qué se corrigió

- `curriculum_grammar` de A1..C1 pasa a **concepto** en vez de forma ("el verbo copulativo del
  idioma", no "verbo To Be"). No se le agregó dimensión de idioma a `levels` a propósito:
  serían 7 niveles × N idiomas y rompería *"agregar un idioma no crea orquestación nueva"*.
- `Language_Note` **ordena convertir** las semillas al idioma de la clase, en vez de sólo
  prohibir leerlas. Antes el coach quedaba con "no las leas" + "explicá brevemente 'prune'" y
  ganaba la orden concreta.
- 11 cruces CON dejaron de injertar la semilla cruda entre comillas. Ese molde es de
  `lenguaje` —presentá la palabra objetivo— y ahí no hay palabra objetivo. **En `lenguaje` el
  `{first_vocab}` se queda: ahí nombrar la palabra ES la pedagogía.**
- `base_language` sale de la ficha del alumno. Era el **único fallback real** de todos los
  problemas del día.
- `level_data` llegaba recortado a 4 campos desde `motor_engine`: por eso el gateo por familia
  no prendía y `{NIVEL:...}` no podía pedir columnas que sí estaban cargadas.

---

## PARTE 2 — Todo desde la base

Tres arrays hardcodeados que tenían que ser datos, y una tabla que faltaba.

**Disciplinas con tabla propia.** `categories.discipline` era un varchar suelto sin `active`,
y el combo se armaba con DISTINCT sobre las categorías prendidas. Apagar una disciplina no era
una operación, era un efecto secundario: para sacar fonética había que apagar SU categoría, y
para sacar idiomas habría que apagar 18. Ahora es un UPDATE de una fila.

**Prefijos abiertos.** `EDAD` y `NIVEL` eran diccionarios cerrados en el resolver: exponían 5
de 14 columnas y 2 de 7. Había dato cargado que el template no podía pedir. Ahora resuelven
contra la fila entera, igual que `EDAD_X_NIVEL`, y los 4 placeholders viejos se renombraron a
su columna real — no queda ninguna tabla de alias, ni en el resolver ni en el visor ni en el
barrido.

**Una sola escalera de 5 escalones.** Había dos con dos idiomas distintos (A0..C2 y CON1..CON4)
y el alumno veía "B2" en una y "CON1" en la otra. Peor: el motor las ordenaba con un
`sort_order` compartido —CON2 y A1 valían lo mismo— y de ahí salía que la regla de
pronunciación del inglés entrara en una clase de informática.

    1  Inicial      idiomas: A0 + A1   conocimiento: CON1
    2  Básico       idiomas: A2        conocimiento: CON2
    3  Intermedio   idiomas: B1        conocimiento: CON3
    4  Avanzado     idiomas: B2        conocimiento: CON4
    5  Experto      idiomas: C1 + C2   conocimiento: (vacío por ahora)

Se fusionan sólo los extremos: el objetivo es que alguien se comunique, no certificar un
First. El medio se conserva entero, que es donde está el alumnado real. Los nombres son
agnósticos a propósito — tienen que funcionar en *"estoy en Intermedio en inglés"*, *"en
plomería"* y *"en historia romana"*.

**Historia del alumno por materia.** `learner_state` tenía una fila por alumno. Con el motor
polimórfico eso mezcla: lo que domina de inglés y lo que domina de informática caían juntos.
Ahora es `(student_id, materia)`, mismo espacio de nombres que `user_level`.

**Fonética anulada.** Decisión del dueño: las clases que piden hacer ruidos —cómo ruge un
dragón, cómo suena un motor— quedan mal con chicos y con grandes, y el motor de voz no está
para eso. Verificado antes de apagar: toda la onomatopeya del catálogo vivía en el cruce
`mini × FONR` y en ningún otro lado. Regla que queda: **clases de chicos con PALABRAS, no con
ruidos.**

---

## PARTE 3 — El acoplamiento que faltaba

`reglas_universales_filtradas` no trae un texto: trae las FILAS de `conversation_rules` que
pasan el filtro. Y el filtro tenía sólo edad, min y max nivel. **Ninguna columna decía a qué
TIPO DE CLASE pertenece cada ley.**

Por eso en jardinería entraban *"corregí los errores de idioma recasteando"* y *"pronunciá con
acento nativo"*. El texto no está mal escrito — está perfecto para una clase de idiomas.
Faltaba la columna que lo dijera.

    conversation_rules.families   ['lenguaje'] · ['conocimiento'] · NULL = todas

Cargadas sólo las tres cuyo texto habla explícitamente de aprender un idioma. Y el filtro por
nivel pasó a usar el **escalón** en vez de `sort_order`, que es la raíz de varios bugs del día.

    jardinería Inicial   8 leyes, ninguna de idiomas   (antes 10, con dos que no correspondían)
    inglés A1           10 leyes
    kids A0             13 leyes

**El test que quedó para clasificar una ley nueva:** ¿describe **cómo conversa una persona** o
**una técnica de enseñanza**? Lo primero es mandamiento (universal), lo segundo va con
condiciones.

---

## PARTE 4 — La variedad

Dos bugs que juntos hacían que un tópico nunca avanzara.

**La semilla se calculaba por DÍA.** Dos clases del mismo tópico la misma tarde daban la misma
semilla: misma palabra, misma rotación. No era azar — era la única salida posible hasta el día
siguiente. Ahora la clave incluye **qué número de clase es** (contado de `sessions`, dato real,
no random): la clase 2 elige distinto que la 1 y recomponerla devuelve lo mismo.

**El resolver llamaba a `_get_vocabulary` sin cuatro argumentos.** `session_seed` caía en 0, así
que `_derive(0,"kw")` era una constante y la rotación estaba **inerte**; y el tope caía al
default 6 en vez de leer `motor_params.vocab_keywords`. De 40 keywords cargadas en un tópico,
**34 no llegaban nunca**.

    música CON1, cuatro clases:  rhythm,beat,key,note → key,note,scale,rhythm →
                                 beat,key,note,scale → note,scale,rhythm,beat

**Lo que sigue abierto no es la semilla: es el contenedor.** Con 5 semillas y tomando 4, la
variedad tiene techo.

---

## PARTE 5 — La apertura

De una clase real: Giulia, adulto, Desarrollo web, Avanzado. El coach abrió con un dilema de
arquitectura de tres líneas y la alumna contestó *"epa, arrancaste medio a fondo, bajamos, no
entendí"*.

El coach **no improvisó**: el catálogo decía "Beat 1: planteo de caso atípico". Y no era ese
cruce — **27 de los 38 arrancan en frío**.

    CAPA          apertura
    PLACEHOLDERS  {ALUMNO:clase_nro} · {HISTORIA:intereses} · {HISTORIA:pendiente}

    turno 1   saludo de la vida, agnóstico al tema
    turno 2   recién acá el tema, y fácil
    turno 3+  ahí arrancan los pasos del cruce

**Dos intentos anteriores fallaron y vale anotar por qué**, porque es la lección de diseño del
día:

1. Se cargaron 20 saludos y 20 anclajes — *"400 combinaciones"*. Falso: de esos 20 había ~5
   movimientos reales y 15 sinónimos, y escribir 40 latiguillos a mano **es el guion**, justo
   lo que se le viene sacando al motor de todos lados.
2. Se reemplazaron por 2 filas con la instrucción adentro. También mal: una fila que nunca
   cambia es texto fijo viviendo en una tabla, y una segunda repetiría el 80% de la frase.

**La regla que quedó:** lo invariante va en el template una vez; lo que varía es placeholder
con dueño. **La variedad no se guarda, se deriva.**

---

## PARTE 6 — El visor mentía en cuatro cosas

1. **No mostraba todo lo que se manda.** La memoria del alumno y las reglas de salida se
   pegaban DESPUÉS del template, por código: aparecían en el XML crudo pero no en los pasos.
   Ahora son placeholders opcionales — y de paso quedó el mecanismo de **"vacío a propósito"**:
   sin dato, la línea se cae entera. El fail-fast queda intacto para lo que sí falta.
2. **Mostraba el valor crudo:** decía `{idioma}` y `{word}` mientras el prompt real los llevaba
   resueltos.
3. **Coloreaba con un mapa a mano** de 20 líneas que quedaba viejo con cada cambio y pintaba de
   gris —"texto fijo"— todo lo que no estuviera en la lista.
4. **Las once leyes en un choclo.** Ahora cada una es su propio panel con su fila de origen y
   su filtro visible (familias · edades · rango), así se lee de un vistazo por qué entró.

**Las capas ahora salen del template** (son las secciones XML) y tienen nombre de profe:

    contexto · perfil_del_alumno · perfil_del_profe · tema_de_la_clase · objetivo_pedagogico
    idioma_y_tono · leyes_de_conversacion · apertura · metodologia · guion_de_la_clase

Renombrar una capa o mover un campo de una a otra es editar la plantilla. Cero deploy.

---

## PARTE 7 — El bucle que nunca corrió

**740 clases dadas. 740 transcripciones guardadas. DOS filas en `learner_state`.**

El camino de voz (`ws_motor`) guardaba la transcripción y terminaba ahí. El destilador sólo se
disparaba desde `POST /sessions/{id}/end`, que es el ciclo de la app de producción — de ahí que
hubiera 97 sesiones `ended` contra 643 `completed`.

**El tercer pilar no fallaba: nunca se ejecutaba.**

Verificado corriendo el destilador sobre una clase real (id 740, inglés, 8.216 chars):

    top_error   "Subject-verb agreement: he have"
    interests   Space science · StarTalk · Deep sea creatures
    mastered    Expressing enthusiasm · Asking for clarification · Confirming information
    review      "Word recall strategies"

Sacó el error de gramática exacto y detectó solo que el tema a trabajar es la búsqueda de
palabras — justo donde el alumno se trabó. **La maquinaria estaba bien; le faltaba el llamado.**

---

## Lo que salió de mirar transcripciones reales

### La entrevista de CNN, con número

En una clase de inglés: **18 de 18 turnos del coach terminan en pregunta.** Cien por ciento.
Y la causa está escrita:

    end_with_reason_to_speak:
    "End every turn with the student having a clear reason to speak: a direct question
     or a direct command."

La ley dice literalmente eso y el coach la cumple perfecto. **Está pendiente reescribirla**:
"dejale una razón para hablar" no es lo mismo que "hacele una pregunta" — una reacción o una
opinión propia también dejan razón, y encima invitan mejor.

### Trabarse es el mejor momento de la clase

El alumno armaba *"casi no tienen comida, tienen que cambiar su..."* y le faltaba
**metabolism**. Dijo "no es estómago" y el coach le ofreció "sistema digestivo" — un sinónimo
de lo que acababa de descartar. Al segundo intento, cuando más falta hacía, **consoló y cerró
el tema**: *"no te preocupes, a todos les pasa"*.

Y el detalle que lo vuelve grave: **no la tenía bloqueada, no la tenía.** Tenía el concepto
entero y le faltaba la etiqueta — i+1 puro. Se desperdició, y la clase terminó sin que
aprendiera una sola palabra.

Se cargó la ley `dar_la_palabra`: la insistencia **escala** la ayuda en vez de apagarla.

### El recast funciona tan bien que no se nota

El coach corrigió tres veces (`he have → he has`, `his → its`,
`grain of sun → grains of sand`) y el dueño —profe de inglés, mirando a propósito— no las vio.
`recast_only` le exige ser invisible y lo logra.

**Pendiente de decisión:** la escalera correcta no es *cuánto corrige* sino **cuánto se nota**:

    1  invisible      recast puro                                    ← lo único que existe hoy
    2  que se note    recast + devolverle la pregunta usando la      ← FALTA, y probablemente
                      forma correcta, para que la USE                   debería ser el default
    3  te lo digo     nombra el recurrente, una vez, cálido
    4  marcame todo   corrige explícito

Y **depende del alumno**, no de la plantilla. Ojo: `templates` ya tiene `correction_mode`,
`correction_focus`, `error_threshold` y `max_feedback_items` — las cuatro dicen `recast`, están
en el lugar equivocado y **el motor v2 no lee ninguna**.

---

## Herramientas nuevas

| qué | para qué |
|---|---|
| **Botón Verificar** (`/motor`) | Chequeo de ESQUEMA del flujo elegido. **No analiza contenido**: compara qué fila usó el motor contra cuál correspondía. Cada alarma es una comparación de claves, verificable mirando dos filas. |
| **6 peldaños de densidad** | Cada uno es un TEMPLATE real con los mismos placeholders, no un prompt a mano — así se mide el motor y el ganador se publica con `active=1`. **Nunca se usaron.** |
| `auditar_cables_motor.py` | Muestreo dirigido: compone el mismo caso variando un eje y compara el `source`. |
| `auditar_cableado_unico.py` | Mide si el cableado es el mismo en todas las disciplinas. **21 de 22 campos con acople único.** |
| `barrido_huecos_motor.py` | Huecos de catálogo → `docs/08-barrido-huecos/huecos_motor.json` |
| `components/ClaseOrbe.tsx` | El orbe y el panel de turno, sacados de PracticarView. Producción y el probador usan el MISMO componente: si en `/motor` se ve mal, en la app se ve mal. |

---

## Pendiente

### Decisiones del dueño

1. **La escalera de corrección** (arriba). Es lo que más cambia cómo se siente la clase.
2. **`end_with_reason_to_speak`**: reescribirla para que no produzca la entrevista.
3. **Los 2 cruces que faltan**: `mini×B1` y `junior×C1`.
4. **10 tópicos sin categoría** (ids 177-186): componen bien, pero sin familia el modelo no
   sabe cómo tratar sus semillas.

### En curso

- **Las progresiones.** El brief está en `docs/09-progresiones/brief_progresiones.json`: 46
  tópicos de conocimiento, cada concepto etiquetado con su escalón. Esperando a Gemini.
  Cuando vuelva: **revisar que sean 5-8 por escalón y que el orden sea una secuencia real, no
  una lista prolija.**
- **El contenedor de semillas.** El rediseño grande. Sigue mezclando progresión, término del
  rubro, léxico y frases de práctica en un array.
- **El lienzo (mermaid + React Flow).** Diseñado, no construido. El coach emite un grafo en
  mermaid, la plataforma lo dibuja, el alumno lo edita y vuelve como texto. Un renderer, un
  idioma, ida y vuelta siempre texto. El primer paso **no toca frontend**: un placeholder que
  pida mermaid y mirar si sale limpio y en el momento justo.

### Deuda

`docs/deuda-tecnica.md` está al día. Lo abierto: el gate del micrófono (hoy juega a favor — el
dueño interrumpió al coach y le captó todo), los 2 cruces, los 10 tópicos, y el contenedor.

**El delay de 2s se cerró sin arreglo**: era del lado del dueño. Se descartaron las dos
hipótesis con datos.

---

## Doctrina que salió de esta sesión

Tres correcciones del dueño que cambiaron cómo se trabaja:

**"Analizá el CABLEADO, no el contenido."** *"Acá agarró la relación con el campo equivocado"*
es finito y se prueba mirando dos filas. *"Le está diciendo 'dog' en una clase de ferretería"*
es infinito y depende de patrones. El verificador se rehizo entero con ese criterio.

**"Si cargás 400 estás haciendo las cosas mal."** Cualquier lista se agota; la única pregunta
es cuándo. La variedad no se guarda, se deriva.

**"Lo invariante una vez, lo que varía como placeholder."** Evitar semánticas donde se repita
el 80% de la frase. Dos de los arreglos del día terminaron **borrando** una tabla en vez de
agregarla.

Y el marco para pensar cualquier cosa nueva: **capa · placeholder · semántica con variables.**

---

## Estado verificado al cierre

    569/569 combinaciones componen
    cero cables sueltos en el muestreo
    14 leyes activas · 9 capas
    tsc + ESLint + build limpios
    voz: sin glitches, y el dueño llegó a interrumpir al coach con captura completa

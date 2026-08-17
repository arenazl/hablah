# El árbol del motor — cómo está hoy

Estado real de la base al 2026-08-16. Los números salieron de consultar las tablas, no de
memoria. Sirve para revisarlo con otros ojos: ¿la jerarquía es la correcta, sobra o falta
algún eslabón?

---

## 1. Las dos familias

Es el corte de más arriba. Sólo hay dos, y el criterio es: **¿el objeto de estudio sobrevive
a la conversión de audio a texto?**

    familia lenguaje       el idioma ES lo que se aprende
                           → disciplina: idiomas

    familia conocimiento   el idioma es el VEHÍCULO
                           → disciplinas: música · oficios · informática · oratoria · creativo
                             y mañana historia, química, pintura al óleo

---

## 2. El árbol de contenido

    FAMILIA (2)
      └── DISCIPLINA (6 activas)
            └── CATEGORÍA (36: 18 de lenguaje, 18 de conocimiento)
                  └── TÓPICO (136 activos: 90 de lenguaje, 46 de conocimiento)

Ejemplo real de cada rama:

    conocimiento → oficios      → Plomería        → "Plomería desde cero"
    conocimiento → música       → Teoría musical  → "Teoría musical desde cero"
    conocimiento → creativo     → Jardinería      → "Jardinería desde cero"
    lenguaje     → idiomas      → Comida          → "Comer cuando viajás"

**El idioma NO es un eslabón del árbol.** Es un atributo del alumno. El mismo tópico se compone
en francés o en portugués sin cargar una fila, porque el catálogo son instrucciones AL COACH y
el idioma entra como `{idioma}`.

---

## 3. Los dos ejes del alumno

    EDAD (4)                     NIVEL (11 activos)
      mini      4-7                lenguaje:     A0 · A1 · A2 · B1 · B2 · C1 · C2
      junior    8-12               conocimiento: CON1 · CON2 · CON3 · CON4
      teen
      adult

Se cruzan en una tabla:

    CRUCE = EDAD × NIVEL  (38 filas cargadas)

Cada fila del cruce trae **cómo se da esa clase**: cómo abre, los rieles de la sesión, qué se
espera que produzca el alumno, cómo continúa, cómo cierra, el tono.

---

## 4. Cómo se arma una clase

    ALUMNO           →  nombre · idioma nativo · idioma que aprende
      └── por MATERIA →  nivel  (user_level)
      └── por MATERIA →  historia  (learner_state: qué ya sabe, qué error repite)

    EDAD × NIVEL     →  cómo se da la clase
    TÓPICO           →  de qué se habla
    LEYES (13)       →  cómo se conversa

    TEMPLATE         →  el orden en que todo eso entra al prompt

**Materia** = en `lenguaje`, el idioma (`en`, `fr`, `pt`). En `conocimiento`, la disciplina
(`oficios`, `musica`). Un alumno puede tener B2 en inglés y CON1 en plomería, con historias
separadas.

---

## 5. Los filtros — qué le toca a quién

Las 13 leyes de conversación no van todas a todas las clases. Cada ley declara:

    families    ['lenguaje'] · ['conocimiento'] · NULL = todas
    age_groups  ['mini','junior'] · NULL = todas
    min_level / max_level

Ejemplos reales:

    always_greet          todas las familias, todas las edades       → va siempre
    recast_only           familias: ['lenguaje']                     → no entra en plomería
    native_pronunciation  familias: ['lenguaje'], hasta A2           → no entra en plomería
    echo_protocol         familias: ['lenguaje'], mini y junior, hasta A1

Resultado medido:

    jardinería CON1 adulto    8 leyes
    inglés A1 adulto         10 leyes
    inglés A0 nene           12 leyes

---

## 6. La regla de oro del cableado

**El esqueleto es UNO para todas las disciplinas.** Cada peldaño se acopla siempre a la misma
tabla y columna, sea una clase de inglés para nenes o de plomería para adultos. Cambian los
valores, nunca los enganches.

Verificado componiendo 9 flujos de familias, edades, niveles y disciplinas distintas: **21 de
22 campos tienen acople único**.

Sumar historia o química mañana es cargar filas — cero cableado nuevo.

---

## Preguntas abiertas para revisar

1. **¿Falta un eslabón entre disciplina y tópico?** Hoy va disciplina → categoría → tópico.
   Con 36 categorías para 136 tópicos, la categoría casi no filtra. ¿Sirve para el onboarding
   ("me gusta la ciencia" → recomendar tópicos) o es un eslabón de más?

2. **¿La escalera de conocimiento debería ser por disciplina?** Hoy CON1..CON4 son genéricos y
   los comparten plomería, música e informática. Eso hace que sumar una materia sea cero
   orquestación — pero también que todo el peso temático caiga en el tópico.

3. **¿El tópico debería traer una progresión ordenada?** Hoy sus palabras son una bolsa que se
   rota. En `conocimiento` eso es raro: nota → escala → tonalidad es una secuencia, no un
   conjunto. Y sin registro de lo ya visto, un tópico nunca se termina.

4. **¿La edad y el nivel alcanzan como ejes?** Un adulto que aprende plomería y otro que
   aprende historia romana caen en el mismo cruce `adult × CON1`. ¿Es correcto, o falta algo?

5. **¿Las 10 leyes sin filtro están bien así?** De las 13, diez van a todas las clases. ¿Cuáles
   de esas son realmente universales y cuáles deberían tener familia, edad o nivel?

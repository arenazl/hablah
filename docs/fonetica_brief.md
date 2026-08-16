# Fonética — contexto para generar narrativas

Documento para pasarle a un modelo junto con el listado de temas de abajo, y que
genere las narrativas de la disciplina `fonetica`. **No sirve el mismo molde que
los tópicos de conversación**: acá la escena no es una charla entre dos, es un
juego con un ejercicio adentro.

---

## 1. Quién es el alumno

Un **chico** que está trabajando un sonido que todavía no le sale — el caso más
común es la **R** (rotacismo). No es un alumno de idiomas: está practicando la
pronunciación de **su propia lengua**.

Y el dato que manda sobre todo lo demás: **el chico ya sabe que le cuesta.** Se
lo hicieron notar en la escuela, en la casa, o se escuchó. Lo último que
necesita es una actividad que se sienta como el test que ya le tomaron.

Por eso la narrativa tiene que hacer que **el ejercicio pase de contrabando
dentro de un juego**. Si el chico percibe "esto es para arreglarme la R", se
cierra y deja de hablar — y un chico que no habla no practica nada.

## 2. La restricción técnica que define todo

El coach **pronuncia excelente** pero **escucha mal**.

El reconocimiento de audio a texto (ASR) **no distingue calidad fonética**: si el
chico dice "pedo" queriendo decir "perro", el ASR puede devolver "perro" igual,
o devolver cualquier otra cosa. **No es un instrumento válido para evaluar
pronunciación.**

Consecuencia de diseño, ya tomada:

> **Se es PERMISIVO con lo que dice el chico.** No porque lo diga bien, sino
> porque la tecnología de hoy no puede saber si lo dijo bien.

Esto tiene tres efectos sobre las narrativas:

- **El coach nunca corrige la pronunciación del chico.** No dice "casi", "probá
  de nuevo", "no se entendió". Jamás.
- **El valor está en el MODELADO, no en la corrección.** Lo que sí funciona es
  que el chico *escuche* el sonido bien hecho muchas veces y lo imite. El coach
  es un buen modelo, no un buen juez.
- **El éxito del turno es que el chico HABLE**, no que pronuncie bien. Si habló,
  el juego avanza. Siempre.

## 3. Estructura de la sesión

Distinta a la de conversación. Tres momentos:

1. **Romper el hielo — 2 o 3 preguntas.** Nada del sonido objetivo. Preguntas
   fáciles y personales, para que el chico se suelte y se acostumbre a hablar.
   ("¿Tenés algún animal en casa?", "¿Qué hiciste hoy?")
2. **Entrar al juego.** Se presenta la situación: una misión, un personaje que
   necesita ayuda, algo que hay que abrir/encontrar/salvar.
3. **El ejercicio, adentro del juego.** Las palabras con el sonido objetivo
   aparecen **porque el juego las necesita**, no porque toque practicarlas. El
   chico repite sin darse cuenta de que está repitiendo.

## 4. Reglas de las narrativas de fonética

- **La palabra clave es del juego, no de la lista.** Mal: "vamos a practicar
  palabras con R". Bien: "para abrir el portón hay que decir la palabra mágica".
- **Repetición con excusa.** El juego tiene que dar motivos naturales para decir
  la misma palabra varias veces (un hechizo que se dice tres veces, un eco, un
  personaje sordo que pide que le repitan).
- **Cero evaluación, cero puntaje, cero "muy bien pero".** El chico nunca falla.
- **El coach exagera el sonido al modelarlo**, con gusto y humor, como un juego
  de voz — no como una corrección.
- **`generated_vocab` acá NO son frases habladas** como en conversación: son las
  **palabras y sonidos objetivo** (`perro`, `rojo`, `r-r-r-o`). Es la excepción
  a la regla general del catálogo.
- Todo en **castellano**: es fonética del castellano, no hay lengua pivote.

## 5. Campos a completar

Los mismos cuatro, con este sentido:

| campo | qué va acá |
|---|---|
| `narrative_setting` | dónde pasa el juego. Concreto, mágico o cotidiano, atractivo para un chico |
| `narrative_conflict` | qué hay que lograr en el juego — **nunca** "practicar el sonido X" |
| `narrative_role` | quiénes somos los dos. Empieza con "somos" |
| `generated_vocab` | 8-12 palabras del castellano con el sonido objetivo, que el juego necesite de verdad |

## 6. Pendiente aparte (no es de los tópicos)

Falta una **cadencia propia para fonética**: más lenta, con más espacio entre
turnos y más silencio para que el chico se anime a repetir. Hoy usa la cadencia
de conversación, que va demasiado rápido para esto. Es un tema de la capa de
ritmo, no del catálogo — no lo resuelven estas narrativas.

---

## Listado de temas propuesto

Ordenado por lo que más aparece en chicos hispanohablantes. **Este listado hay
que curarlo con criterio fonoaudiológico** — yo puedo ordenar los fonemas y los
procesos, pero cuáles trabajar y en qué orden es decisión profesional.

El actual (`El reino del rey Ramón y el perro Roco`) cubre el primero.

### Vibrantes — el motivo más frecuente de consulta
| # | tema | sonido |
|---|---|---|
| 1 | Vibrante múltiple en el medio de la palabra | `/r/` — perro, carro, torre |
| 2 | Vibrante múltiple al principio | `/r/` — rojo, rueda, risa |
| 3 | Vibrante simple entre vocales | `/ɾ/` — pera, oro, cara |
| 4 | Vibrante simple al final de sílaba | `/ɾ/` — mar, color, jugar |

### Sinfones con R — los que más se simplifican
| # | tema | sonido |
|---|---|---|
| 5 | Sinfón BR y PR | brazo, pluma, premio |
| 6 | Sinfón TR y DR | tren, dragón, letra |
| 7 | Sinfón CR y GR | cruz, grande, cangrejo |
| 8 | Sinfón FR | fresa, frío, cofre |

### Sinfones con L
| # | tema | sonido |
|---|---|---|
| 9 | Sinfón BL y PL | blanco, playa, pluma |
| 10 | Sinfón CL y GL | clavo, globo, iglesia |
| 11 | Sinfón FL | flor, flaco, inflar |

### Sibilantes y fricativas
| # | tema | sonido |
|---|---|---|
| 12 | La S al principio y entre vocales | `/s/` — sol, casa, oso |
| 13 | La S al final de sílaba | `/s/` — pasta, dos, más |
| 14 | La F | `/f/` — foca, café, elefante |
| 15 | La J y el sonido fuerte | `/x/` — jugo, ojo, girafa |

### Otros procesos frecuentes
| # | tema | sonido |
|---|---|---|
| 16 | La L (por sustitución con R) | `/l/` — luna, pala, sol |
| 17 | Velares K y G | `/k/ /g/` — casa, gato, queso |
| 18 | La CH | `/tʃ/` — chancho, leche, ocho |
| 19 | La Ñ | `/ɲ/` — niño, araña, sueño |
| 20 | Sílabas trabadas e inversas | pan, tres, campo |
| 21 | Palabras largas — sílabas que se comen | mariposa, elefante, refrigerador |

### Notas para quien cure el listado
- **Los sinfones (5-11) son el segundo motivo de consulta después de la R** y
  suelen simplificarse: "bazo" por "brazo", "pato" por "plato".
- El **21** no es un fonema sino un proceso (omisión de sílabas átonas), pero es
  muy frecuente y da juegos muy buenos.
- Los temas 12-13 conviene separarlos: la S final se pierde por dialecto
  rioplatense (aspiración), y **eso no es un problema del habla sino la variedad
  local**. Cuidado con "corregir" lo que es acento.

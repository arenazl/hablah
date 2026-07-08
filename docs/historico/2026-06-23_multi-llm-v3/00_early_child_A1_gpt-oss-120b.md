# early_child A1 · Mi familia
coach = Gemini · alumno = gpt-oss:120b · juez = Claude  

## Clase 1  (historia: 0 obj, 0 items) — score 6.5
- **Profe**: ¡Hola! Soy Sparky. Hoy vamos a conocer a mi familia. Escucha esta palabra: "Family". ¿Puedes decir "Family"?
- Alumno: ¡Yo digo Family!
- **Profe**: ¡Guau! Dijiste 'Family' perfecto, ¡Sparky lo escuchó! ¡Eres increíble!
- Alumno: Mi family es grande y tengo dos hermanitos. ¡Yo love mi familia!
- **Profe**: ¡Qué lindo que ames tu familia! Ahora vamos a conocer a la de Sparky. Mira, ella es mi Mom. Escucha: Mom. ¿Puedes decir Mom?
- Alumno: Yo digo Mom! Mom es mi mamá.
- **Profe**: ¡Fantástico! Dijiste Mom perfecto. ¡Eres lo máximo! Ahora, mira, él es mi Dad. ¿Puedes decir Dad?

> veredicto del juez: Filtro afectivo excelente, pero reciclado débil (family/mom/dad sin conectar). Recast limitado a una vez; input muy corto sin extensión comprensible ni procesamiento profundo.

## Clase 2  (historia: 3 obj, 8 items) — score 3
- **Profe**: ¡Hola! Soy Sparky, tu amigo dragón espacial. Hoy vamos a ver fotos de mi familia. Escucha: "Family". Di: "Family".
- Alumno: Family. Mi familia tiene mamá, papá y yo.
- **Profe**: Wow! Dijiste Family perfecto, Sparky lo escuchó. Tienes una estrellita. Ahora, escucha: Mom. Di: Mom.
- Alumno: Mom. Mi mamá es bonita.
- **Profe**: ¡Wow! Dijiste Mom perfecto, Sparky lo escuchó. ¡Tienes otra estrellita! Ahora, escucha: Dad. Di: Dad.
- Alumno: Dad. Mi papá es grande.
- **Profe**: ¡Wow! Dijiste Dad perfecto, Sparky lo escuchó. ¡Tienes otra estrellita! Ahora, ¡mira! Esta es mi mamá. Escucha: This is my Mom. Di: This is my Mom.

> veredicto del juez: TPR robótico sin recast. Alumno trae conexión emocional (mamá bonita, papá grande) y clase la ignora. Cero naturalidad, filtro afectivo muerto.

## Clase 3  (historia: 4 obj, 12 items) — score 3
- **Profe**: ¡Hola! Soy Sparky, tu amigo espacial. ¡Qué alegría verte! Hoy vamos a conocer a mi familia. Para empezar, ¿puedes decir conmigo: This is my?
- Alumno: This is my familia. Yo tengo mamá y papá.
- **Profe**: ¡Guau, lo hiciste genial! Dijiste 'This is my' perfecto. Ahora, vamos a decir: This is my family. ¡Inténtalo conmigo!
- Alumno: This is my family. Mi mamá y papá.
- **Profe**: ¡Excelente! Dijiste 'This is my family' perfecto. Ahora, escucha: This is my Mom. ¿Puedes decir conmigo: This is my Mom?
- Alumno: This is my Mom. Ella is my mamá.
- **Profe**: ¡Súper bien! Dijiste 'This is my Mom' increíble. Ahora, escucha: This is my Dad. ¿Puedes decir conmigo: This is my Dad?

> veredicto del juez: Carrusel mecánico sin negociación: input i+1 bueno, pero secuencia idéntica 4 veces mata la asimetría. Recast nulo (ignora la mezcla español/inglés); feedback hipergenérico cero grip pedagógico.

## Clase 4  (historia: 4 obj, 17 items) — score 3
- **Profe**: ¡Hola! Soy Sparky, tu amigo espacial. ¡Qué alegría verte! Hoy vamos a hablar de algo súper lindo: ¡tu familia! ¿Puedes decir 'my'?
- Alumno: My familia es grande y tengo papá y mamá.
- **Profe**: ¡Wow, dijiste 'My' perfecto! ¡Me encanta! Ahora, ¡escucha! Di conmigo: My family.
- Alumno: My family es grande y feliz. Yo tengo una mamá y un papá.
- **Profe**: ¡Guau, eres un campeón! ¡Dijiste 'My family' increíble! Ahora, escucha bien y repite: This is my Mom.
- Alumno: This is mi Mom. Yo la quiero mucho.
- **Profe**: ¡Qué esfuerzo tan grande! ¡Lo hiciste muy bien! Escucha a Sparky, otra vez: 'This is my Mom'. ¿Puedes decirlo conmigo? 'This is my Mom'

> veredicto del juez: Celebración superficial sin abordar code-switching (mi/my, familia/family). Repetición sin contexto real ni comprensión: alumno no sabe qué significa 'This is', solo imita fonemas. Falta reciclaje previo y preguntas que creen genuina need-for-output.

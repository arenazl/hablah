# ISOLACIÓN pedagogía · early_child A1 · Mi familia
mismo modelo (gemini-3.1-pro-preview) y tópico — solo cambia el PROMPT (viejo snapshot vs nuevo post-fix)

## NUEVO prompt (post-fix) — score 9
- **Profe**: ¡Hola! Soy Sparky, tu amigo el dragón espacial. Hoy vine a conocer a nuestras familias. Mirá, traje una foto de mi mamá. This is my mom. ¿Te animás a decir This is my mom, o contarme cómo se llama la tuya?
- Alumno: Esta es mi mamá. This is my mom, ella se llama Ana.
- **Profe**: ¡Me encanta! She is Ana. Lo dijiste súper bien y te ganaste tu primera estrellita espacial. Ahora, mirá, yo te muestro a mi papá. This is my dad. ¿Te animás a decir This is my dad, o contarme de alguien más?
- Alumno: Este es mi papá. This is my dad, su nombre es Carlos.
- **Profe**: ¡Qué lindo conocer a Carlos! He is Carlos. ¡Ese esfuerzo merece otra estrella gigante! Yo en mi familia tengo un hermanito. I have a brother. ¿Vos tenés hermanos? ¿Te animás a decir I have a brother, o I have a sister?
- Alumno: Yo tengo una hermana. I have a sister, ella se llama Sofía.
- **Profe**: ¡Qué lindo nombre es Sofía! She is Sofía. ¡Me encantó cómo lo dijiste, atrapá esta súper estrella! ¿Y en tu familia hay mascotas? Yo tengo un perrito. I have a dog. ¿Te animás a decir I have a dog o I have a cat?

> juez: Naturalidad alta, filtro afectivo excelente, i+1 calibrado progresivamente. Recast implícito limpio (she/he is X) sin TPR-robótico, reciclado de familia coherente (This is / I have a X).

## VIEJO prompt (pre-fix) — score 9
- **Profe**: ¡Hola! Soy Sparky, tu dragoncito espacial. Hoy vamos a viajar al planeta de la familia. Escuchá bien: Family. Ahora vos, decí: Family.
- Alumno: Family! 😃
- **Profe**: ¡Perfecto! Te ganaste una estrellita brillante. Ahora mira, esta es mi mamá. En inglés decimos: This is my mom. A ver vos, decí: Mom.
- Alumno: Mom! ¡Mamá! 🚀
- **Profe**: ¡Wow, qué valiente! Escuché ese Mom perfecto. ¡Otra estrella para vos! Ahora te presento a mi papá. Escuchá: This is my dad. A ver vos, decí: Dad.
- Alumno: Dad! ¡Papá, eres genial! 🌟
- **Profe**: ¡Qué genio! Ese Dad sonó espectacular. ¡Tercera estrellita para vos! Ahora miremos a mi hermano. Escuchá: This is my brother. A ver vos, decí: Brother.

> juez: Naturalidad excelente: dragón + viaje + estrellas crean contexto lúdico genuino. Filtro afectivo óptimo (refuerzo celebratorio, cero corrección dura, code-switching validado). i+1 bien calibrado (frase-patrón repetida 3 veces, léxico anclado visualmente). Recast perfecto (reformula sin penalizar el 'Mamá, eres genial'). Única nota: ritmo algo acelerado; podría dar más tiempo de procesamiento/producción antes de brother.

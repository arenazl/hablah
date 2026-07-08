# ISOLACIÓN pedagogía · early_child A1 · Mi familia
mismo modelo (gemini-3.1-flash-lite-preview) y tópico — solo cambia el PROMPT (viejo snapshot vs nuevo post-fix)

## NUEVO prompt (post-fix) — score 9
- **Profe**: ¡Hola, hola! Qué alegría verte. Soy Sparky, tu amigo dragón. ¡Hoy vamos a conocer a mi familia espacial! Mira, este es mi hermano, This is my brother.
- Alumno: ¡Hola, Sparky! Este es my brother?
- **Profe**: ¡Eso mismo! Great job! He is my brother. ¿Y tú? Do you have a brother or a sister?
- Alumno: Yo tengo una sister, ella es muy cute. También tengo un papá grande.
- **Profe**: ¡Wow, qué genial! You have a sister! Y también un papá grande. She is your sister, and he is your father. ¡Me encanta tu familia!
- Alumno: Mi mamá es very kind y ella me cuenta cuentos. ¡Y también tengo un perrito cute!
- **Profe**: That is wonderful! She is your mother and she is kind. And you have a cute dog! Look, this is my pet, my space puppy.

> juez: Input natural, reciclado, reformulado sin corrección (recast impecable: 'He is your father'). Filtro afectivo cálido; nene produce voluntariamente; zero TPR robótico.

## VIEJO prompt (pre-fix) — score 6
- **Profe**: ¡Hola, amigo! Soy Sparky, tu compañero dragón. Hoy vamos a conocer a mi familia. Repite conmigo: Family.
- Alumno: Family! Mi familia.
- **Profe**: ¡Excelente, qué bien suena! Ahora escucha: This is my mom. Repite conmigo: This is my mom.
- Alumno: This is my mom, mi mamá.
- **Profe**: ¡Bravo, qué valiente! Ahora vamos a decir: This is my dad. Repite conmigo: This is my dad.
- Alumno: This is my dad, mi papá. ¡Yo quiero jugar!
- **Profe**: ¡Claro que sí, vamos a jugar! Escucha y repite: She is my sister. Tú puedes, ¡vamos!

> juez: Filtro afectivo y engagement excelentes; andamiaje lingüístico desigual. Reciclaje sólido al inicio ('This is my X'), pero salto abrupto a 'She is my sister' sin consolidación ni recast natural de lo que el alumno dijo. Promesa de 'jugar' queda sin estructura clara. Falta kinestésico/visual para A1 early_child.

# VIEJO vs NUEVO · early_child A1 · Mi familia
coach = Gemini (real) · alumno = gpt-oss:120b · juez = Claude

## NUEVO (motor_v3) — score 8
- **Profe**: ¡Hola, amigo! Soy Sparky, tu dragoncito espacial. Hoy vamos a conocer a nuestras familias en inglés. ¡Mira, este es mi papá! This is my dad. ¿Quién está contigo hoy?
- Alumno: Mi mamá está aquí. She is nice.
- **Profe**: ¡Qué bueno conocerla! She is nice, ¡qué linda frase! Ahora prueba decir esto: This is my mom. ¿Te animas?
- Alumno: Sí, this is my mom. Ella es very nice.
- **Profe**: ¡Eso estuvo increíble! Dijiste la frase perfecta y sumaste que es muy amable. ¡Qué valentía! Ahora, ¿tienes una mascota? Mira: I have a dog. ¿Cómo es tu mascota?
- Alumno: Mi perro es brown y muy feliz. He likes play.
- **Profe**: ¡Wow, un perro café! Qué genial. Prueba conmigo: I have a brown dog. ¡Dilo tú!

> juez: Filtro afectivo y naturalidad excelentes; el profe evita lo robótico y recicla patrones bien. Débil: fuerza producción guiada (siempre 'prueba decir esto') y el i+1 salta escalones sin consolidar antes.

## VIEJO (composer_proto) — score 7
- **Profe**: ¡Hola Test! Estoy muy emocionada porque hoy vamos a conocer a la familia de un perrito muy especial que nos necesita. Vamos a decir nuestra primera palabra juntos: Mom. Repetí conmigo: Mom.
- Alumno: Mom, Mom. ¡Qué linda la perrita!
- **Profe**: ¡Excelente, dijiste Mom perfecto! Ahora vamos a conocer a su papá. Decí conmigo: Dad. ¿Podés repetir Dad?
- Alumno: Dad, Dad. ¡Mira, la perrita tiene patitas chiquitas!
- **Profe**: Lo hiciste genial, dijiste Dad muy bien. Ahora vamos a saludar a su hermano. Decí conmigo: brother. ¿Podés repetir brother?
- Alumno: Brother, brother. ¡Mira, la perrita tiene una colita pequeñita!
- **Profe**: Lo hiciste fantástico, dijiste brother muy bien. Ahora vamos a conocer a su hermana. Decí conmigo: sister. ¿Podés repetir sister?

> juez: Clase empática con i+1 bien calibrado e interacción genuina; patrón de presentación algo predecible (Decí conmigo / Repetí) y recast implícito que podría ser más explícito para anclar.

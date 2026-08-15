# Hoy

## Purpose
Entrada del producto: qué toca hoy, cómo viene la racha, qué misiones hay abiertas.

## Layout
Hero con saludo (Sora 30px) + estado de racha. Grid de 2 columnas (2fr/1fr) en desktop:
- izquierda: card de sesión recomendada (verde oscura, con tópico, razón, duración, tutor y CTA "Empezar"), lista de misiones de rescate con su barra de 5 segmentos, y accesos a Practicar / Sorpresa.
- derecha: racha (calendario de 7 días con estado por día), progreso de nivel (barra + % hasta el siguiente), tutor activo con su rigurosidad, y últimas sesiones.

## Interactions
CTA principal lleva a Charla con el tópico precargado. Cada misión abre el tópico correspondiente. Hover en día de racha muestra la sesión de ese día.

## Notas
La racha nunca culpabiliza: el copy de un día perdido es neutro ("sin sesión"), no punitivo.

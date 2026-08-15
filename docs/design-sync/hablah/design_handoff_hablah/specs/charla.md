# Charla — clase en vivo

## Purpose
La clase por voz. Pantalla de foco: nada compite con hablar.

## Layout
Fondo `--green-900` a pantalla completa. Centro: avatar del tutor (72px), nombre, estado ("escuchando", "el profe habla"), barras de micrófono animadas. Debajo, el transcript en burbujas (profe a la izquierda en superficie translúcida, alumno a la derecha en `--green`), scroll automático al último turno.

Barra inferior: mute, tiempo transcurrido / duración objetivo, y "Terminar clase" en rojo suave.

## Interactions
- El feedback **nunca** interrumpe: no hay correcciones en pantalla durante la charla.
- Indicador de beat de la sesión (4 beats) discreto arriba.
- Al terminar → Reporte.

## Estados
conectando · escuchando · el profe habla · en pausa · reconectando (banner ámbar) · terminada.

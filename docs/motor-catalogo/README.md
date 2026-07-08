# motor-catalogo

Snapshot del motor + catálogo (2026-07-08) para analizar por fuera y madurar el modelo. Perfiles
**vacíos** (la app todavía no acumula historia/learn_state). Motor retratado: **v2 = compose_proto**
(el de producción).

## Archivos

- **[02-filosofia-del-motor.md](02-filosofia-del-motor.md)** — cómo funciona el motor HOY y su
  filosofía (los 3 pilares, los 9 pasos, tópico liviano, fail-fast). **Empezar acá.**
- **[01-topicos-contenido-por-cruce.md](01-topicos-contenido-por-cruce.md)** — el eje TÓPICO: qué
  tópico va a cada edad/nivel + su contenido (semilla).
- **[orquestaciones/agnosticas/](orquestaciones/agnosticas/)** — el prompt de 9 pasos por cruce
  **edad × nivel** (16), con el tópico como PLACEHOLDER. Es el **marco pedagógico puro** — para
  analizar las reglas del cruce sin ruido de vocabulario.
- **[orquestaciones/topic-builtin/](orquestaciones/topic-builtin/)** — el mismo prompt pero con el
  tópico ENCHUFADO: `kids/` = 1 por cada cruce edad×nivel×tópico (87); `adultos/` = 1 por nivel (el
  marco es igual entre tópicos, cambia solo el vocab). Para ver cómo queda una clase real.

## Clave para leer

La orquestación la define **edad × nivel**; el **tópico solo enchufa** el bloque de vocabulario + 2
placeholders del arranque. Por eso la versión agnóstica alcanza para analizar las reglas pedagógicas,
y la topic-builtin sirve para ver el resultado concreto. (Detalle en la filosofía.)

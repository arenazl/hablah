# Idea — Editor visual ReactFlow del motor de 9 capas

> Estado: idea capturada 2026-06-15, a explotar después (no implementar todavía).
> Componente ReactFlow ya agregado al frontend.

## Objetivo

Una pantalla con un **mapa de grafos** (ReactFlow) que cumpla dos funciones:

1. **Entender** cómo se unen los flujos: visualizar cómo las 9 capas del motor
   (runtime → tutor → pedagogía → gamificación → alumno → rieles → vocab →
   narrativa → arranque) convergen en el prompt JIT de una clase.

2. **Editar la BD en vivo**: con selectores de **edad + género + tópico**, el
   motor trae de la base las capas guardadas para esa combinación
   (`StudentType`, `MethodologyModule`, `TopicModuleContent`), las muestra en los
   nodos del grafo, y el dueño las **edita ahí mismo** con persistencia en tiempo
   real a la base.

## Por qué importa

Es el **backoffice visual para "llenar/editar las tablas"** del modelo de 9 pasos
(ver `Motor-Learning/`). Hoy esas tablas se llenarían a mano / por seed; esta
pantalla las vuelve editables y entendibles sin tocar SQL, viendo el efecto de
cada capa sobre el prompt final.

## Notas de implementación (futuras)

- Reusa el motor real (`compose_proto_prompt`) para mostrar, al lado del grafo,
  el **prompt final** que produce la combinación seleccionada (preview en vivo).
- Cada nodo = una capa; al editarlo, PATCH a la tabla correspondiente.
- El selector (edad/género/tópico) reproduce el mapeo `age_group → student_type`
  que dispara las capas (ver `composer_proto.py`).
- Conecta con el banco `/llm`: una vez editada una capa, poder dispararla en una
  sesión de voz de prueba.

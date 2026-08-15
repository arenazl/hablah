# Probador de clases

## Purpose
Que el equipo vea **exactamente** qué prompt se le manda al modelo para un combo edad × nivel × tópico × alumno, entienda de qué tabla sale cada campo, lo edite en el momento y pruebe la clase en vivo.

## Layout
Columna izquierda: selectores + las 6 capas. Columna derecha (colapsable, 340px): ajuste JIT y memoria. El **disparador de la clase va dockeado abajo**, ancho completo. Bajo 1100px la columna derecha pasa abajo.

## Las 6 capas
Acordeón, una card por capa, numeradas. Cada campo muestra: nombre, **dot-path real** debajo en mono 10px `--fg-4`, valor, y lápiz de edición. Al pie de cada capa, una nota "cómo se llena" con el texto real del resolver.

1. **Contexto** (runtime) — session_id, current_date, device_type.
2. **Alumno** (runtime) — nombre, edad, nivel, historia.
3. **El profe** (EDAD → `student_types`) — tutor_mascot, tutor_identity, session_focus, estilo_de_sesion, anclas_narrativas.
4. **El tópico** (`topics`) — titulo, semillas, anclas_narrativas.
5. **El nivel** (`levels`) — curriculum_grammar, language_rule.
6. **El cruce** (`age_level_matrix[edad,nivel]`) — produccion_esperada, formato_de_cierre_de_turno, reglas_de_tono_y_entrega, reglas_universales_filtradas, pasos_de_la_sesion, comando_de_arranque, accion_de_continuacion, accion_de_cierre.

El color del badge de cada capa = **dueño del dato** (ver tokens en el README). Es la clave de lectura de toda la pantalla.

## Las 3 vistas del prompt
Tabs en el panel del prompt, con botón Copiar y Pantalla completa.
- **Formateado** — una card por bloque, campos en filas clave/valor.
- **Crudo** — el XML tal cual se manda, coloreado por dueño.
- **Mapa de nodos** — **ReactFlow v11** (el mismo componente que ya existe en la app, `PromptFlow`): cadena de nodos con edges animados; al clickear un nodo se abren a su derecha las fichas de detalle con el valor, **"Cómo se llena"** (texto de `OWNER_EXPLAIN`) y **"Relaciones"** (texto de `FIELD_RELATIONS`). Background + Controls.

## Ajuste JIT
El lápiz de cualquier campo abre el editor en la columna derecha (auto-expande si estaba colapsada): label + path, textarea, Cancelar / Guardar. Guardar recompone el prompt al instante y muestra un toast.

## Clase en vivo (dock)
Barra inferior fija, fondo `--green-900`. Estado con punto pulsante, barras de micrófono animadas, transcript que va apareciendo turno a turno, y **cadencia**: 5 presets (Sobremesa, Ping-pong, Debate, En profundidad, Primera vez) y una onda de 8 barras cuya intensidad (icebreaker / normal / profunda / filosa) se ilumina en el beat actual mientras corre la clase. Al terminar, empuja una observación nueva a la memoria del alumno.

## Memoria (SRS)
Chips por tipo (vocab, error, interés, evita, obs) con contador de repeticiones. Botón Borrar y textarea "simular clase" que agrega observaciones.

## Notas de implementación
- `Probador_Redesign.tsx` trae los componentes con las convenciones del backoffice y notas de qué reemplaza a qué en `MotorPlaygroundPanel`.
- Elegir un alumno **realinea edad y nivel** a su perfil (comportamiento correcto; hoy en la app quedan desincronizados).
- El padding inferior del main se recalcula sincrónicamente con la altura del dock: el dock nunca debe tapar contenido.

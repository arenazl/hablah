# BRIEF COMPLETO para Claude Design — rediseño del "Probador de clases" (/motor de Habláh)

> Pegar en claude.ai/design (o leerlo desde este proyecto). Generar **4-5 layouts
> alternativos** de la pantalla completa. Los `.dc.html` resultantes se guardan en
> `docs/design-sync/probador/` y el agente de Habláh los implementa como especificación.

## Contexto del producto

Habláh: aprendizaje de idiomas POR VOZ con un coach de IA (Gemini Live). El "Probador
de clases" es la mesa de trabajo del dueño: acá arma una clase, inspecciona el prompt
que el motor compone desde tablas (orquestación JIT), la prueba HABLANDO por micrófono,
ajusta los datos y vuelve a probar. Es la pantalla más usada del proyecto. Desktop-first
(1280-1440); una variante debe resolver mobile.

## TODO lo que la pantalla hace hoy (nada puede faltar)

### 1. Armado del perfil de la clase
- Selectores: disciplina (Inglés) × edad (Mini 4-7 / Junior 8-12 / Teen / Adulto) ×
  nivel (A0..C2 con nombres: Despegue, Explorador, Aventurero, Viajero, Navegante,
  Experto, Maestro) × tópico (94, ej. "Adicción al celular") × alumno.
- Alumnos = perfiles con nombre, nivel FIJO e historia propia (Nico teen-B2, Benja
  mini-A0, Pedro adult-C1, Lucas adult-B2...). Elegir alumno alinea edad+nivel a su
  perfil. El tópico se filtra por edad+nivel.

### 2. La orquestación (las capas del composer JIT)
6 capas apiladas, cada una con campos que vienen de una tabla:
Contexto (runtime) → Alumno → El profe (EDAD → student_types) → El tópico (topics) →
El nivel (levels) → El cruce (age_level_matrix[edad,nivel]: 8 campos de forma) +
reglas universales (conversation_rules, gateadas por edad/nivel: p.ej. 9 de 12 activas).
- Cada campo es EDITABLE en el lugar (ajuste JIT): tocás el campo o su placeholder
  `{EDAD:campo}` → editor con el origen (tabla.columna), alcance del cambio
  ("afecta a todo el segmento adult" / "solo al cruce teen×B2") → Guardar y recomponer.

### 3. El Prompt Final Compilado — TRES vistas (todas deben estar)
- **Formateado** (para leer): secciones como cards, cada campo con badge del dueño
  del dato y valor en tipografía legible; leyes como lista numerada.
- **Crudo (Gemini)**: el texto XML LITERAL byte a byte que recibe el modelo,
  monoespaciado, coloreado por dueño (el resaltado no altera el contenido).
- **Mapa de nodos (ReactFlow v11 — ya instalado en la app)**: LA vista interactiva.
  Hoy: cadena vertical de nodos (una capa = un nodo) con preview del contenido real de
  cada campo; al tocar un nodo se ABREN AL COSTADO los nodos de detalle (uno por campo)
  con: texto completo scrolleable + badge del dueño + ficha **"Cómo se llena"** (mecánica
  del resolver: de qué tabla/fila sale, qué interpola en runtime: {name}, {topic},
  {first_vocab}) + **"Relaciones"** (con qué otros campos trabaja: el cierre de turno
  con la cadencia; las reglas gateadas por edad/nivel; el NO-ROLEPLAY que suprime la
  escena del tópico). Edges coloreados por dueño. Zoom/pan con controles.
  **Rediseñar esta vista como experiencia de primera clase** — hoy es funcional pero
  visualmente pobre; el dueño la quiere "profesional, con mucha información".
- **Pantalla completa** para las tres vistas (el canvas de nodos cubre el viewport).
- Botón Copiar prompt.

### 4. Clase en VIVO por voz (la prueba real)
- Iniciar/Terminar clase; estados: listo / conectando / escuchando tu voz / el profe
  habla; nivel de micrófono; transcript en tiempo real (Profe/Vos).
- **Cadencia de la charla**: la onda de intensidad de las preguntas del coach
  (0=icebreaker · 1=normal · 2=profunda · 3=filosa; secuencia cíclica, ej. 1,0,2,1,0,2,3,1).
  Presets con nombre: **Sobremesa** (default) · Ping-pong · Debate · En profundidad ·
  Primera vez + campo de edición manual. Idea deseada: VISUALIZAR la onda (en qué compás
  va el director en vivo).
- Al Terminar: el transcript genera observaciones (IA) que evolucionan la memoria del
  alumno; se muestran (toast o panel).
- Regla de oro de layout: la clase en vivo NUNCA tapada por otros paneles (hoy vive en
  un dock inferior colapsable y queda escondida).

### 5. Memoria del alumno (SRS / pilar HISTORIA)
- Chips con lo que el motor sabe del alumno (presets: "error: past simple",
  "interés: gaming", con nº de observaciones); botón Borrar memoria; deseo del dueño:
  ver la EVOLUCIÓN del perfil clase a clase.
- Simulador manual: textarea de observaciones → "Simular clase" (corre el protocolo).

### 6. Extras que conviven
- Simulador en texto (bienvenida/cierre con Gemini) — secundario.
- Toggle tema claro/oscuro (sol/luna) en el header. Botón Actualizar (recompone).
- Chips de estado: Motor (orchestration_resolver template) · Semilla · Tópico.
- Popup de update de la PWA (abajo a la derecha, no bloqueante) puede aparecer.

## Dolores a resolver (por qué se rediseña)

1. Todo apilado verticalmente; scroll infinito; la navegación no cuenta el FLUJO real:
   armar → revisar → probar → ajustar → re-probar.
2. La clase en vivo escondida en un dock.
3. Los datos como bloques de texto: falta jerarquía visual y "visualización" real.
4. El mapa de nodos actual es pobre visualmente (nodos genéricos grises).

## Reglas DURAS de la casa (no negociables)

- **Paleta por DUEÑO del dato — ley en toda la app, usarla en TODAS las vistas:**
  runtime azul #3b82f6 · EDAD/student_types ámbar #fbbf24 · NIVEL/levels celeste #7dd3fc ·
  cruce/age_level_matrix verde #00b37e · tópico/topics índigo #818cf8 ·
  reglas/conversation_rules violeta #a855f7 · template gris #8e938f · código rojo #f87171.
  Marca: #00B37E. Leyenda visible.
- CERO emojis; iconos SVG (Lucide). Nada de <select> nativo crudo.
- Tema claro y oscuro completos.
- Datos de ejemplo REALES (usar los de este brief y el sample), jamás lorem.

## Material real para las maquetas

Prompt real compilado (adult B2 × "Mi rutina actual") — usar sus textos:
`Style: Deep conversation de ida y vuelta: turnos cortos; la profundidad va en las
preguntas y crece a lo largo de la charla.` · `Start_Command: Open like you'd text a
friend: ONE casual line about Mi rutina actual using 'gym' — UNDER 20 WORDS...` ·
`Call_to_Action_Format: End each turn with ONE question, whole turn UNDER 25 WORDS.
Alternate question intensity like real talk... NEVER two heavy questions in a row.` ·
Leyes: "Keep the lesson structure invisible", "Make ONE conversational move per turn",
"Correct by recasting only", etc. Transcript real de muestra:
Profe: "Honestly? I doom-scroll before bed. Total fraud. You worse than me?" /
Alumno: "Yes! I check TikTok like one hour every night."

## Entregable

4-5 layouts de página completa, distintos de verdad entre sí (no variaciones del mismo),
cada uno con su tesis de navegación declarada. Estados: reposo (sin clase) y clase en
curso. El mapa de nodos rediseñado incluido en al menos 2 variantes.

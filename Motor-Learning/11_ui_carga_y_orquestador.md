# UI para controlar el motor — módulo de carga + orquestador (diseño)

Diseño de la consola del profe. El objetivo: que como profe de inglés tengas **control sobre cada etapa** del circuito, sin perder el determinismo que hace que funcione.

---

## 0. Filosofía

Dos modos de uso, bien separados:

- **Carga (authoring):** definís *el sistema*. Lo tocás poco y con cuidado: catálogo, presets pedagógicos, plantillas, alumnos. Es write-time.
- **Orquestación (operación):** *operás* con alumnos, todos los días: elegís/ajustás la clase, la lanzás, la mirás y revisás el post-clase.

Y un **hilo conductor que atraviesa todo: el preview del prompt.** En cada pantalla donde editás algo, ves el `<system_instruction_stack>` ensamblado actualizarse en vivo. Nunca hay caja negra: tocás un riel y ves exactamente cómo cambia lo que recibe la IA.

Todo lo editable está etiquetado **E / P / D** para que sepas el radio de impacto: un preset afecta a toda una banda de edad; un tópico afecta a todos los que lo tienen; un override afecta a una sola clase.

---

## 1. MÓDULO DE CARGA

### 1.1 Catálogo de tópicos (capa 7)
Árbol **Categoría → Subcategoría → Tópico**. Por tópico editás: título, objetivo, vocabulario (chips) y frases objetivo (chips).
La pantalla **impide por diseño** meter instrucciones de conducta: el formulario solo acepta vocabulario/frases/objetivo. Si pegás una instrucción ("hablá despacio…"), te avisa que eso va en los presets, no en el tópico. Así se respeta la regla "el bloque 7 es solo data".
Extras: import masivo (CSV/JSON), búsqueda, y un rango de edad *sugerido* (suave, porque el framing igual se adapta solo).

### 1.2 Kits (onboarding)
Definís los **kits**: el pool de tópicos que un alumno puede recibir. Armás kits por subcategoría arrastrando tópicos, y configurás qué ve el alumno en el onboarding (categoría → subcat → kit). Esto es lo que después consulta el sequencer. El kit no entra al prompt; es la fuente de la que se elige.

### 1.3 Presets por banda de edad (capas 2, 3, 6) — el corazón del control pedagógico
Acá es donde más control tenés. Elegís una banda (primera infancia / niñez / adolescencia / adulto) y editás:
- **Tutor** (capa 2): nombre, persona, tono.
- **Pedagogía** (capa 3): metodología, manejo del error, gramática.
- **Rieles** (capa 6): la lista de reglas rígidas, editable línea por línea.
Y aparte, el **modificador por nivel** (A1…C1): el overlay sobre los rieles (¿se traduce al español o no?, registro, palabras/turno).
Al costado, el preview muestra el prompt de un alumno de muestra de esa banda: editás un riel y lo ves cambiar al instante.

### 1.4 Plantillas de arranque/cierre y fases (capas 8 y 9)
- **Plantillas del trigger** (capa 9): editás los textos de `Opening_Action`, `Continuation_Action` y `Closing_Action` por banda, con placeholders (`{name}`, `{topic}`, `{first_vocab}`). Acá controlás cómo abre y **cómo cierra** la clase (tu filosofía del repaso + gancho).
- **Fases** (capa 8): editás la estructura de la sesión (las fases del `narrative_spine`) y el **pacing** (duración objetivo por banda + nivel) que decide cuándo dispara el cierre.

### 1.5 Reglas de salida y seguridad
Toggles y umbrales: regla de voz (emojis solo a pantalla), tolerancia de ASR, guardas de seguridad infantil, y las reglas del validador determinista (máx. palabras por banda, etc.). Es la capa de runtime, configurable sin tocar código.

### 1.6 Alumnos (capa 5)
ABM de alumnos: nombre, edad, nivel, dialecto del L1, barrera. Edad y nivel son dos de los tres inputs; vos los seteás. Los intereses se cargan en el onboarding y los afina el post-clase.

### 1.7 Consecuencia arquitectónica (importante)
Hoy los presets y plantillas viven como constantes en `engine.py`. Para que vos los controles desde la UI, **tienen que pasar a ser datos**: se agregan tablas de config (`presets`, `templates`, `pacing`, `safety_config`) y el engine las lee en vez de las constantes. El composer determinista no cambia; solo cambia de dónde saca los presets. Es el puente entre "el profe controla todo" y la implementación.

---

## 2. ORQUESTADOR

### 2.1 Panel del alumno (memoria / `learner_state`)
La ventana a dónde está cada alumno: qué domina, qué está aprendiendo, qué vence hoy (calendario SRS), errores recientes, intereses (declarados + detectados), rasgos, e historial de sesiones. Read-mostly; es tu contexto antes de operar.

### 2.2 Preparar clase (sequencer + override + preview + launch)
1. El **sequencer propone** el tópico de hoy (del kit, por SRS debido + interés).
2. **Override:** aceptás la sugerencia o elegís otro tópico del kit (o de afuera). Tenés el control.
3. Ajustes de la sesión: pacing, enfoque, forzar un ítem a repasar.
4. **Preview del prompt:** ves el `<system_instruction_stack>` exacto que va a Gemini, para este alumno y este tópico. Podés leerlo antes de lanzar, e incluso hacer un override puntual para esta clase (marcado como override).
5. **Lanzar.**

### 2.3 Clase en vivo (monitoreo)
Transcripción en vivo, indicador de fase (Apertura/Desarrollo/Cierre, según va la IA), `interaction_state` (turno, tiempo, señal), y qué ítems objetivo se acertaron/trabaron. Control liviano: un "cerrar ahora" (manda la señal de pasar a la fase de cierre) y un pausar/cortar. La IA conduce; vos supervisás.

### 2.4 Post-clase (revisar + aprobar)
Dos bloques:
- **Determinista:** qué actualizó el SRS (qué pasó a *mastered*, qué se encoló para refuerzo). Automático.
- **Cualitativo (IA):** el resumen, intereses nuevos detectados, rasgos, próximo tópico sugerido. **Pasa por tu aprobación**: revisás, editás o descartás antes de que se escriba en la memoria del alumno. Human-in-the-loop sobre lo único que escribe una IA.
Más métricas: producción del alumno, retención, engagement.

### 2.5 Vista de cohorte
Todos los alumnos: quién tiene clase pendiente, alertas (frustración, drop-off), acciones en lote.

---

## 3. Principios transversales
- **Preview del prompt en todos lados:** sin caja negra.
- **E / P / D visible:** siempre sabés el radio de impacto de lo que tocás.
- **Human-in-the-loop sobre la IA:** lo único que una IA escribe (post-clase) pasa por tu aprobación.
- **Versionado y experimentos:** los presets/plantillas se versionan; podés A/B y volver atrás sin romper el composer.
- **Roles:** admin (edita presets globales) vs profe (opera + crea tópicos/kits), opcional.

---

## 4. Mapa pantalla → capa / etapa

| Pantalla | Controla | Tipo |
|----------|----------|------|
| Catálogo de tópicos | Capa 7 (tópico, agnóstico) | D (data) |
| Kits | Onboarding → pool del sequencer | upstream |
| Presets por banda | Capas 2, 3, 6 | P |
| Modificador por nivel | Capa 6 (overlay) | P |
| Plantillas arranque/cierre | Capa 9 | P/plantilla |
| Fases + pacing | Capa 8 | P/D |
| Reglas salida/seguridad | Runtime + guards | E/config |
| Alumnos | Capa 5 (edad, nivel) | D |
| Panel del alumno | `learner_state` (memoria) | D (read) |
| Preparar clase | Sequencer + preview + override | operación |
| Clase en vivo | `interaction_state` + fases | monitoreo |
| Post-clase | SRS + insights (aprobás) | escritura supervisada |

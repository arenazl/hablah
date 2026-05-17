Especificación Funcional: Experiencia del Usuario (UX/UI)
Proyecto: Plataforma Adaptativa de Aprendizaje de Idiomas AI
Configuración de Línea Base: Espaciado 1.25, Tipografía de Sistema Uniforme.
1. Filosofía de la Experiencia (UX Vision)
El aprendizaje de la conversación en un nuevo idioma debe tratarse como un proceso social, empático y dinámico. Se descartan las estructuras tradicionales de lecciones lineales basadas en gramática abstracta. En su lugar, el flujo se centra en la inmersión conversacional personalizada, donde el contenido se adapta orgánicamente a los gustos individuales y el nivel técnico del alumno se evalúa en tiempo real sin exámenes explícitos que generen fricción o ansiedad.
2. Fase A: Onboarding Inteligente y Diagnóstico Inicial
El proceso de registro inicial está diseñado para recopilar parámetros fundamentales de personalización de manera transparente e interactiva.
2.1. Prueba de Nivel Oculta (Background Assessment)
Al iniciar, la aplicación presenta una interfaz limpia donde un tutor virtual inicia una conversación informal mediante estímulos de audio abiertos (ej. "Tell me a bit about your professional background" o "What do you usually like to do on weekends?").
Procesamiento: Mientras el usuario responde libremente por voz, el motor analiza la estructura en segundo plano mediante un pipeline que procesa:
Riqueza de vocabulario (diversidad léxica).
Precisión sintáctica y gramatical.
Fluidez temporal (palabras por minuto y longitud de pausas).
Resultado: Se determina el nivel real del usuario bajo el marco común de referencia (A1 a C2) de forma nativa, omitiendo tests tradicionales de opción múltiple.
2.2. Configuración de Punteros de Interés (Interest Anchors)
Una vez determinado el nivel, el sistema requiere la selección obligatoria de un rango de 4 a 5 punteros de interés específicos. Estos tópicos actuarán como el combustible temático de todas las interacciones futuras. La interfaz gráfica los muestra como tags interactivos organizados por categorías:
Categoría
Ejemplos de Punteros de Interés Seleccionables
 
Tecnología y Desarrollo
Arquitectura de Software, Inteligencia Artificial, Metodologías Ágiles, Gadgets.
Arte y Entretenimiento
Música Electrónica (UK Garage, House), Producción Musical, Cine y Series.
Estilo de Vida y Hábitos
Fitness y Entrenamiento de Fuerza, Nutrición y Suplementos, Viajes Internacionales.
Diseño y Construcción
Arquitectura Residencial, Diseño Industrial Warm, Distribuciones Espaciales.

Nota: El usuario puede modificar o rotar sus punteros de interés en cualquier momento desde su configuración de perfil.
3. Fase B: El Núcleo Conversacional (Misiones Diarias)
La pantalla central de la interfaz de usuario elimina menús complejos y presenta de forma directa la Misión del Día.
3.1. Interfaz de Práctica Activa
Presenta un diseño minimalista optimizado para interacciones manos libres. Consiste en un botón central de captura de audio y un avatar visual limpio que representa al tutor.
La comunicación es 100% oral. La IA responde utilizando voces sintetizadas que emulan empatía, entonaciones naturales y acentos configurables por el usuario.
3.2. Desafíos Dinámicos en Pantalla (In-Context Prompts)
Para guiar el aprendizaje sin interrumpir el habla, la pantalla muestra pequeñas tarjetas o notificaciones visuales con desafíos en tiempo real. Estos estímulos obligan al usuario a salir de su zona de confort de manera interactiva:
Desafío de Vocabulario: "Intentá incorporar el término 'nevertheless' en tu próxima idea."
Desafío Gramatical: "Respondé a la siguiente pregunta utilizando el pasado simple."
Desafío de Restricción: "Tu tutor cambió de opinión. Expresá desacuerdo formalmente."
4. Fase C: Ciclo de Feedback y Evaluaciones Sinceristas
Para evitar cortar la fluidez y dañar la confianza del alumno, la IA tiene prohibido interrumpir o corregir al usuario a mitad de una frase. Toda la evaluación se consolida al finalizar la sesión de conversación (cuya duración sugerida es de 5 a 10 minutos).
4.1. Estructura del Reporte Post-Sesión
El Elogio (Positive Reinforcement): Se destacan de forma prioritaria los aciertos notables. Ejemplo: "¡Excelente! Lograste incorporar vocabulario avanzado sobre tecnología de forma natural y tu fluidez aumentó un 10% respecto a ayer."
El Pulido Sincerista (Constructive Feedback): Se exponen de manera directa, clara y honesta un número controlado de puntos a mejorar (máximo 3 por sesión para evitar saturación cognitiva).
Gramática/Sintaxis: Muestra la frase exacta dicha por el usuario junto a la versión correcta o más natural recomendada.
Pronunciación: Identifica palabras específicas que presentaron fonética incorrecta, permitiendo al usuario reproducir el audio interactivo de la pronunciación nativa óptima.
5. Fase D: Gamificación, Estructura de Etapas y "Castigos"
El sistema utiliza mecánicas de juego orientadas al desarrollo de hábitos a largo plazo.
5.1. El Mapa de Progreso
Las conversaciones exitosas acumulan experiencia que desbloquea nuevas etapas o entornos temáticos vinculados a los intereses seleccionados. El progreso es tangible a través de un roadmap visual en la pantalla principal.
5.2. Mecánica de Penalización Pedagógica ("Castigo Insistente")
El sistema implementa una lógica de persistencia para garantizar el aprendizaje real de los errores pasados:
Si un usuario comete repetidamente el mismo error gramatical o fonético a lo largo de varias sesiones, el sistema activa de forma automatizada una regla de bloqueo temporario en su mapa.
La siguiente conversación obligatoria se transforma en una "Misión de Rescate", donde la IA moldeará el diálogo para forzar al usuario a enfrentarse e interactuar con ese concepto específico de forma insistente hasta consolidarlo.




Especificación Técnica: Arquitectura de Backoffice y Control Pedagógico
Proyecto: Plataforma Adaptativa de Aprendizaje de Idiomas AI
Configuración de Línea Base: Espaciado 1.25, Tipografía de Sistema Uniforme.
1. Concepto Arquitectónico Central
Para que la experiencia del usuario final sea adaptable, coherente y escalable, el backend de la aplicación no debe basarse en flujos de conversación preestablecidos o árboles de decisión rígidos. En su lugar, el Backoffice funciona como un entorno de Inyección de Contexto Dinámico y Control de Reglas Metodológicas. La IA se comporta como un actor que cambia de libreto, tono y nivel de exigencia técnica basándose exclusivamente en las directrices configuradas en este panel de administración.
2. Módulos Principales del Backoffice
2.1. Sector 1: Gestor de Templates Metodológicos (Methodology Templates)
Este módulo permite a los administradores y diseñadores curriculares crear los moldes de comportamiento que se aplicarán a los usuarios. Cada template combina reglas pedagógicas y parámetros técnicos mediante variables precisas:
Nivel de Rigurosidad Base (Slider 1 a 5): Define el umbral de tolerancia del analizador de errores del backend antes de registrar un fallo formal en el perfil del alumno.
Tono y Personalidad (Voice & Tone Settings): Define los atributos que se inyectarán en el prompt del sistema de lenguaje (ej. Friendly, Academic, Disruptive, Corporate Coach).
Frecuencia de Desafíos en Tiempo Real: Determina cuántas instrucciones dinámicas o tarjetas de reto se enviarán al frontend por minuto durante la sesión.
Lógicas de Interrupción: Parámetro booleano para habilitar o deshabilitar interrupciones sutiles por pantalla en contextos avanzados de simulación de presión (ej. entrevistas laborales).
Templates Preestablecidos de Ejemplo (Configuraciones Base)
Nombre del Template
Tono de la IA
Rigurosidad
Estrategia Principal de Reglas
 
The Coach
Ultra-empático, paciente y motivador.
Baja (Nivel 1-2)
Foco en consistencia diaria. Prioriza fluidez sobre precisión. Ideal para principiantes o usuarios con alta ansiedad al habla. No penaliza.
The Sincerist / Bootcamp
Profesional, directo y demandante.
Alta (Nivel 4-5)
Evaluación estricta de sintaxis, pronunciación y muletillas. Activa alertas de presión temporal y bloqueos por repetición de errores.
The Arcade
Enérgico, lúdico y dinámico.
Media (Nivel 3)
Orientado a sesiones cortas de alta velocidad con foco en hitos de gamificación y entrega inmediata de recompensas visuales.

2.2. Sector 2: Biblioteca de Tópicos y Punteros Temáticos
Lugar centralizado donde se gestiona el contenido conceptual (los universos de interés de los alumnos). En lugar de escribir respuestas escritas, el administrador configura metadatos estructurales por cada tema:
Indicadores de Contexto (Seed Prompts): Directrices narrativas de alto nivel que le indican a la IA cómo iniciar o guiar el debate (ej. para el tópico Arquitectura Residencial en nivel B2: "Iniciar conversación preguntando por los pros y contras del hormigón visto y las plantas de distribución diagonal").
Keywords y Estructuras Requeridas por Nivel: Diccionario técnico indexado que el motor utiliza para verificar si el usuario cumple las misiones de vocabulario avanzado.
2.3. Sector 3: Motor de Gamificación y Lógica de Negocio
Panel de configuración para definir el comportamiento autónomo del sistema de retención:
Gestor de Reglas de Alertas y Rachas: Configuración de los disparadores para usuarios inactivos. Permite redactar las plantillas de notificación persistentes con un enfoque directo (ej. "Ayer perdiste el progreso del bloque de condicionales. ¿Vas a abandonar la racha hoy?").
Reglas del "Modo Insistente" (Castigo): Define el número exacto de fallos repetidos permitidos (ej. 3 repeticiones del mismo error de conjugación pasado) antes de sobreescribir el flujo estándar del usuario y forzar una conversación de rescate enfocada exclusivamente en su punto débil.
3. Flujo y Orquestación de Datos en el Backend
Cuando un usuario inicia una sesión interactiva presionando el botón de práctica en la aplicación móvil, el orquestador del backend ejecuta el siguiente proceso secuencial en milisegundos para estructurar la sesión sin código estático:
Extracción del Perfil de Usuario: El backend recupera de la base de datos el nivel del usuario, sus intereses activos y, fundamentalmente, su Registro de Errores Recientes (puntos débiles detectados en las últimas charlas).
Extracción del Template Asignado: Recupera las configuraciones del molde metodológico activo (ej. The Sincerist).
Consolidación y Construcción del Súper-Prompt: El sistema unifica de manera dinámica las tres capas informativas en una instrucción de sistema altamente estructurada para el modelo de lenguaje (LLM).
[INSTRUCCIÓN DE SISTEMA - ENTORNO DE EJECUCIÓN]
- Actuarás bajo el perfil metodológico: **The Sincerist / Bootcamp**.
- Tono: Profesional, directo, exigente. No interrumpas por audio, procesa feedback al final.
- Tópico Principal a Desarrollar: **Música Electrónica y Producción (Específico: UK Garage)**.
- Nivel de Entrada del Usuario: **Intermedio (B2)**.
- Restricción Pedagógica Crítica: El usuario presenta fallos recurrentes en el uso de **verbos irregulares en pasado simple**. Moldea tus respuestas para forzar contextos narrativos históricos dentro del tópico musical y evalúa rigurosamente su uso.
- Al cierre de la sesión, genera un objeto estructurado JSON separando: aciertos notables, errores fonéticos y errores gramaticales detectados.


Streaming de Audio e Interacción: Una vez inyectado este contexto dinámico, se abre el canal de comunicación donde el pipeline de audio (procesamiento de voz, Whisper para transcripción y síntesis de voz de respuesta) opera en tiempo real bajo los parámetros de comportamiento metodológico establecidos por el Backoffice.

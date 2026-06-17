-- ============================================================================
-- Motor de 9 capas · MODELO v3 (contenido dinámico + orquestaciones) · MySQL 8 / utf8mb4
-- v3: orchestration + orchestration_override = orquestaciones nombrables/editables
--     (pin/add/disable por slot) que el resolver aplica sobre la resolución automática.
-- Novedad base: el "qué aprender" deja de colgar del tópico.
--   * language_objective : currículum CEFR (qué aprender por nivel) — agnóstico de tópico
--   * topic_lexis        : léxico del tópico GRADUADO por CEFR (reemplaza vocab+phrase)
--   * learner_objective  : progreso del alumno por objetivo (motor de la progresión)
-- Clase = currículum(nivel) − dominado(alumno), contextualizado por el tópico.
-- ============================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS orchestration_override, orchestration, session_event, session, learner_objective, learner_item,
  student_interest, student, topic_suggested_band, topic_lexis, topic,
  subcategory, category, trigger_template, phase, level_policy, band_policy,
  behavioral_guard, reward, activity_type, pedagogy, tutor_identity,
  language_objective, universal_policy, app_config, `level`, age_band;
SET FOREIGN_KEY_CHECKS = 1;

-- ===== DIMENSIONES =====
CREATE TABLE age_band (
  band_id TINYINT UNSIGNED PRIMARY KEY, code VARCHAR(20) NOT NULL UNIQUE,
  label VARCHAR(40) NOT NULL, min_age TINYINT UNSIGNED NOT NULL,
  max_age TINYINT UNSIGNED NOT NULL, phase_group ENUM('kid','adult') NOT NULL,
  pacing_base_min TINYINT UNSIGNED NOT NULL, CHECK (min_age<=max_age)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `level` (
  level_code CHAR(2) PRIMARY KEY, label VARCHAR(40) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL, modifier VARCHAR(255) NOT NULL,
  spanish_mirror ENUM('always','frequent','on_stall','never') NOT NULL,
  vocab_depth ENUM('minimal','full') NOT NULL, pacing_bonus_min TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== CURRÍCULUM (NIVEL) — qué aprender por nivel, agnóstico de tópico =====
CREATE TABLE language_objective (
  objective_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cefr_level CHAR(2) NOT NULL, code VARCHAR(20) NOT NULL UNIQUE,
  kind ENUM('vocabulary','grammar','function','discourse') NOT NULL,
  description VARCHAR(200) NOT NULL, sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_lo_level FOREIGN KEY (cefr_level) REFERENCES `level`(level_code),
  INDEX ix_lo (cefr_level, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== PRESETS · FIJO =====
CREATE TABLE app_config (config_key VARCHAR(60) PRIMARY KEY, config_value VARCHAR(255) NOT NULL)
  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE universal_policy (
  policy_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kind ENUM('universal_guard','safety','privacy','accessibility','idle_timeout') NOT NULL,
  ord SMALLINT UNSIGNED NOT NULL DEFAULT 0, body VARCHAR(400) NOT NULL,
  source ENUM('seed','proposed') NOT NULL DEFAULT 'seed', is_editable BOOLEAN NOT NULL DEFAULT 1,
  INDEX ix_univ_kind (kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== PRESETS · EDAD =====
CREATE TABLE tutor_identity (
  tutor_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, band_id TINYINT UNSIGNED NOT NULL,
  name VARCHAR(40) NOT NULL, persona VARCHAR(120) NOT NULL, tone VARCHAR(160) NOT NULL,
  CONSTRAINT fk_tutor_band FOREIGN KEY (band_id) REFERENCES age_band(band_id) ON DELETE CASCADE,
  UNIQUE KEY uq_tutor_band (band_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE pedagogy (
  pedagogy_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, band_id TINYINT UNSIGNED NOT NULL,
  methodology VARCHAR(300) NOT NULL,
  CONSTRAINT fk_ped_band FOREIGN KEY (band_id) REFERENCES age_band(band_id) ON DELETE CASCADE,
  UNIQUE KEY uq_ped_band (band_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE activity_type (
  activity_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, band_id TINYINT UNSIGNED NOT NULL,
  description VARCHAR(300) NOT NULL,
  CONSTRAINT fk_act_band FOREIGN KEY (band_id) REFERENCES age_band(band_id) ON DELETE CASCADE,
  UNIQUE KEY uq_act_band (band_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE reward (
  reward_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, band_id TINYINT UNSIGNED NOT NULL,
  description VARCHAR(300) NOT NULL, source ENUM('seed','proposed') NOT NULL DEFAULT 'proposed',
  CONSTRAINT fk_rwd_band FOREIGN KEY (band_id) REFERENCES age_band(band_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE behavioral_guard (
  guard_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, band_id TINYINT UNSIGNED NOT NULL,
  ord SMALLINT UNSIGNED NOT NULL DEFAULT 0, body VARCHAR(400) NOT NULL,
  CONSTRAINT fk_grd_band FOREIGN KEY (band_id) REFERENCES age_band(band_id) ON DELETE CASCADE,
  INDEX ix_grd_band (band_id, ord)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE band_policy (
  policy_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, band_id TINYINT UNSIGNED NOT NULL,
  kind ENUM('feedback','motivation','turn_length','question_policy') NOT NULL,
  body VARCHAR(300) NOT NULL, source ENUM('seed','proposed') NOT NULL DEFAULT 'proposed',
  CONSTRAINT fk_bpol_band FOREIGN KEY (band_id) REFERENCES age_band(band_id) ON DELETE CASCADE,
  INDEX ix_bpol (band_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE phase (
  phase_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, band_group ENUM('kid','adult') NOT NULL,
  ord TINYINT UNSIGNED NOT NULL, name VARCHAR(120) NOT NULL, INDEX ix_phase (band_group, ord)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE trigger_template (
  template_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  band_group ENUM('kid','teen','adult') NOT NULL,
  kind ENUM('opening','continuation','closing') NOT NULL, body VARCHAR(500) NOT NULL,
  UNIQUE KEY uq_trg (band_group, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== PRESETS · NIVEL =====
CREATE TABLE level_policy (
  policy_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, level_code CHAR(2) NOT NULL,
  kind ENUM('hint_policy','error_policy') NOT NULL, body VARCHAR(300) NOT NULL,
  source ENUM('seed','proposed') NOT NULL DEFAULT 'proposed',
  CONSTRAINT fk_lpol_level FOREIGN KEY (level_code) REFERENCES `level`(level_code) ON DELETE CASCADE,
  INDEX ix_lpol (level_code, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== TÓPICO (agnóstico) + LÉXICO GRADUADO POR NIVEL =====
CREATE TABLE category (category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(60) NOT NULL UNIQUE)
  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE subcategory (
  subcategory_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, category_id INT UNSIGNED NOT NULL,
  name VARCHAR(60) NOT NULL,
  CONSTRAINT fk_sub_cat FOREIGN KEY (category_id) REFERENCES category(category_id) ON DELETE CASCADE,
  UNIQUE KEY uq_sub (category_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE topic (
  topic_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, subcategory_id INT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL, objective VARCHAR(200) NOT NULL,
  CONSTRAINT fk_topic_sub FOREIGN KEY (subcategory_id) REFERENCES subcategory(subcategory_id),
  INDEX ix_topic_sub (subcategory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- el léxico del tópico viene etiquetado por nivel: misma "Fútbol" carga A1..C1
CREATE TABLE topic_lexis (
  lexis_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, topic_id INT UNSIGNED NOT NULL,
  lexis_type ENUM('word','phrase') NOT NULL, text VARCHAR(160) NOT NULL,
  cefr_level CHAR(2) NOT NULL, ord TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_lex_topic FOREIGN KEY (topic_id) REFERENCES topic(topic_id) ON DELETE CASCADE,
  CONSTRAINT fk_lex_level FOREIGN KEY (cefr_level) REFERENCES `level`(level_code),
  INDEX ix_lex (topic_id, cefr_level, ord)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE topic_suggested_band (
  topic_id INT UNSIGNED NOT NULL, band_id TINYINT UNSIGNED NOT NULL,
  overridable BOOLEAN NOT NULL DEFAULT 1, PRIMARY KEY (topic_id, band_id),
  CONSTRAINT fk_tsb_topic FOREIGN KEY (topic_id) REFERENCES topic(topic_id) ON DELETE CASCADE,
  CONSTRAINT fk_tsb_band FOREIGN KEY (band_id) REFERENCES age_band(band_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== RUNTIME =====
CREATE TABLE student (
  student_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(80) NOT NULL,
  age TINYINT UNSIGNED NOT NULL, level_code CHAR(2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stu_level FOREIGN KEY (level_code) REFERENCES `level`(level_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE student_interest (
  interest_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, student_id INT UNSIGNED NOT NULL,
  interest VARCHAR(60) NOT NULL,
  CONSTRAINT fk_int_stu FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  INDEX ix_int_stu (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- memoria léxica (SRS de palabras/frases/errores)
CREATE TABLE learner_item (
  item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, student_id INT UNSIGNED NOT NULL,
  item_type ENUM('word','phrase','error') NOT NULL, item_value VARCHAR(120) NOT NULL,
  status ENUM('mastered','learning','due') NOT NULL DEFAULT 'learning',
  last_seen DATETIME NULL, due_at DATETIME NULL,
  CONSTRAINT fk_li_stu FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  INDEX ix_li (student_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- progreso por objetivo de currículum (la progresión real entre clases)
CREATE TABLE learner_objective (
  student_id INT UNSIGNED NOT NULL, objective_id INT UNSIGNED NOT NULL,
  status ENUM('learning','due','mastered') NOT NULL DEFAULT 'learning',
  last_seen DATETIME NULL, due_at DATETIME NULL,
  PRIMARY KEY (student_id, objective_id),
  CONSTRAINT fk_luo_stu FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  CONSTRAINT fk_luo_obj FOREIGN KEY (objective_id) REFERENCES language_objective(objective_id) ON DELETE CASCADE,
  INDEX ix_luo (student_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE session (
  session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, student_id INT UNSIGNED NOT NULL,
  topic_id INT UNSIGNED NOT NULL, started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL, turn SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  elapsed_min SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `signal` ENUM('idle','flowing') NOT NULL DEFAULT 'idle',
  current_phase VARCHAR(40) NOT NULL DEFAULT 'Phase 1',
  CONSTRAINT fk_ses_stu FOREIGN KEY (student_id) REFERENCES student(student_id) ON DELETE CASCADE,
  CONSTRAINT fk_ses_topic FOREIGN KEY (topic_id) REFERENCES topic(topic_id),
  INDEX ix_ses_stu (student_id, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE session_event (
  event_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, session_id BIGINT UNSIGNED NOT NULL,
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, role ENUM('tutor','student','system') NOT NULL,
  body TEXT NOT NULL,
  CONSTRAINT fk_ev_ses FOREIGN KEY (session_id) REFERENCES session(session_id) ON DELETE CASCADE,
  INDEX ix_ev_ses (session_id, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== ORQUESTACIONES (config nombrable + overrides por slot) =====
CREATE TABLE orchestration (
  orchestration_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL,
  status ENUM('active','draft') NOT NULL DEFAULT 'draft',
  band_id TINYINT UNSIGNED NULL, level_code CHAR(2) NULL, topic_id INT UNSIGNED NULL,
  notes VARCHAR(300) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orc_band FOREIGN KEY (band_id) REFERENCES age_band(band_id),
  CONSTRAINT fk_orc_level FOREIGN KEY (level_code) REFERENCES `level`(level_code),
  CONSTRAINT fk_orc_topic FOREIGN KEY (topic_id) REFERENCES topic(topic_id),
  INDEX ix_orc_scope (band_id, level_code, topic_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- override por slot: pin (fijar una regla), add (sumar una propia), disable (excluir una del seed)
CREATE TABLE orchestration_override (
  override_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, orchestration_id INT UNSIGNED NOT NULL,
  slot ENUM('tutor','pedagogy','activity','reward','behavioral_guard','band_policy',
            'level_policy','universal_policy','phase','trigger','topic_lexis','objective') NOT NULL,
  action ENUM('pin','add','disable') NOT NULL,
  target_table VARCHAR(40) NULL, target_id INT UNSIGNED NULL, body VARCHAR(400) NULL,
  ord SMALLINT UNSIGNED NOT NULL DEFAULT 0, note VARCHAR(200) NULL,
  CONSTRAINT fk_oo_orc FOREIGN KEY (orchestration_id) REFERENCES orchestration(orchestration_id) ON DELETE CASCADE,
  INDEX ix_oo (orchestration_id, slot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- SEED INICIAL (solo tablas de configuración; las de runtime arrancan vacías)
-- ============================================================================
INSERT INTO age_band (band_id,code,label,min_age,max_age,phase_group,pacing_base_min) VALUES
(1,'early_child','Primera infancia',0,6,'kid',3),
(2,'child','Niñez',7,10,'kid',4),
(3,'teen','Adolescencia',11,17,'adult',6),
(4,'adult','Adulto',18,120,'adult',8);

INSERT INTO `level` (level_code,label,sort_order,modifier,spanish_mirror,vocab_depth,pacing_bonus_min) VALUES
('A1','Nivel A1',1,'Espejo en español SIEMPRE activo, vocabulario mínimo','always','minimal',0),
('A2','Nivel A2',2,'Espejo en español frecuente, frases cortas','frequent','minimal',0),
('B1','Nivel B1',3,'Español solo si se traba, conversación guiada','on_stall','full',0),
('B2','Nivel B2',4,'Sin español (inmersión), corrección por recast','never','full',2),
('C1','Nivel C1',5,'Sin español (inmersión), matices e idiomático','never','full',2);

INSERT INTO language_objective (cefr_level,code,kind,description,sort_order) VALUES
('A1','A1-FUN-01','function','Saludar y presentarse',0),
('A1','A1-VOC-01','vocabulary','Nombrar objetos y animales del entorno',1),
('A1','A1-GRA-01','grammar','Presente simple de to be / have got',2),
('A1','A1-FUN-02','function','Decir cantidades, colores y tamaños',3),
('A2','A2-FUN-01','function','Describir rutinas diarias',4),
('A2','A2-GRA-01','grammar','Presente simple vs presente continuo',5),
('A2','A2-FUN-02','function','Hablar de gustos y preferencias',6),
('A2','A2-DIS-01','discourse','Conectores básicos: and, but, because',7),
('B1','B1-FUN-01','function','Narrar una experiencia pasada',8),
('B1','B1-GRA-01','grammar','Pasado simple y past continuous',9),
('B1','B1-FUN-02','function','Dar y pedir opiniones simples',10),
('B1','B1-DIS-01','discourse','Conectores de secuencia y causa: so, then, although',11),
('B2','B2-FUN-01','function','Expresar y justificar una opinión',12),
('B2','B2-GRA-01','grammar','Segundo condicional',13),
('B2','B2-VOC-01','vocabulary','Colocaciones y léxico temático',14),
('B2','B2-DIS-01','discourse','Marcadores de contraste: however, whereas',15),
('B2','B2-FUN-02','function','Especular sobre causas y consecuencias',16),
('C1','C1-FUN-01','function','Argumentar y matizar una postura',17),
('C1','C1-GRA-01','grammar','Estructuras enfáticas e inversión',18),
('C1','C1-VOC-01','vocabulary','Expresiones idiomáticas y registro',19),
('C1','C1-DIS-01','discourse','Cohesión avanzada y reformulación',20);

INSERT INTO app_config (config_key,config_value) VALUES
('target_language','English'),
('native_language','Spanish (es-AR, Rioplatense)'),
('interface_mode','Realtime Multimodal Voice Session'),
('voice_output_rule','El texto al TTS va limpio; emojis y onomatopeyas solo a pantalla'),
('current_date_source','inyectado por la app en cada sesión');

INSERT INTO universal_policy (kind,ord,body,source) VALUES
('universal_guard',1,'ASR tolerance: si la voz llega con baja confianza, pedir repetir; no contar como error','seed'),
('universal_guard',2,'Stay on frame: si deriva del tema, redirigir con tacto','seed'),
('universal_guard',3,'Closing trigger: si Current_Phase = Phase 4 -> ejecutar Closing_Action, sin contenido nuevo','seed'),
('safety',1,'No solicitar datos personales identificables del alumno','proposed'),
('safety',2,'Contenido siempre apropiado para la edad; rechazar temas sensibles','proposed'),
('safety',3,'No incluir links externos ni pedir abrir apps de terceros','proposed'),
('safety',4,'Si el alumno muestra angustia, frenar la lección y responder con calma','proposed'),
('privacy',1,'Para menores: no retener PII; la memoria guarda solo progreso lingüístico','proposed'),
('accessibility',1,'Subtítulos en pantalla de cada frase en inglés','proposed'),
('idle_timeout',1,'Si no hay respuesta en ~10s, dar un empujón suave (no avanzar de fase)','proposed');

INSERT INTO tutor_identity (band_id,name,persona,tone) VALUES
(1,'Sparky','Dragoncito espacial','Súper alegre, onomatopeyas y emojis en pantalla'),
(2,'Nova','Exploradora compañera de aventuras','Entusiasta, festeja cada logro'),
(3,'Leo','Profe-coach cercano, sin disfraz infantil','Relajado, actual, motivador'),
(4,'Alex','Profesor/host carismático','Claro, cordial, con modismos naturales');

INSERT INTO pedagogy (band_id,methodology) VALUES
(1,'Gamificación inmersiva. 0% gramática explícita. El error nunca se corrige de forma punitiva'),
(2,'Lúdico con mini-retos y recompensas. Gramática implícita, sin metalenguaje'),
(3,'Comunicativo basado en sus intereses. Gramática contextual ligera'),
(4,'Fluency first. No interrumpir por errores menores; anotar vicios en silencio para el cierre');

INSERT INTO activity_type (band_id,description) VALUES
(1,'Misión lúdica inmersiva sobre el tópico; cada acierto da recompensa'),
(2,'Misión lúdica sobre el tópico; cada acierto da recompensa'),
(3,'Charla guiada sobre el tópico (objetivo conversacional)'),
(4,'Roleplay / escenario comunicativo sobre el tópico');

INSERT INTO reward (band_id,description) VALUES
(1,'Estrellitas + SFX celebratorio en pantalla por cada acierto'),
(2,'Badges y mini-logros por reto completado'),
(3,'Racha/streak y barra de progreso visible'),
(4,'Hitos de fluidez y resumen de logros al cierre');

INSERT INTO behavioral_guard (band_id,ord,body) VALUES
(1,1,'Prohibido preguntas abiertas en inglés'),
(1,2,'Flujo de 3 pasos: frase corta -> espejo en español -> repetir 1 palabra'),
(1,3,'Máx. 30 palabras por turno'),
(2,1,'Solo preguntas cerradas simples (yes/no)'),
(2,2,'Frases de 2 a 4 palabras'),
(2,3,'Espejo en español tras cada frase nueva'),
(3,1,'Preguntas abiertas simples permitidas'),
(3,2,'Español reducido al mínimo'),
(3,3,'Conectar siempre con sus intereses'),
(4,1,'Una sola pregunta o situación por turno'),
(4,2,'Si se traba >3s, dar pista o sinónimo, no la respuesta'),
(4,3,'Priorizar continuidad del diálogo sobre la precisión');

INSERT INTO band_policy (band_id,kind,body) VALUES
(1,'feedback','Visual (emoji/SFX en pantalla), nunca correctivo verbal duro'),
(2,'feedback','Visual (emoji/SFX en pantalla), nunca correctivo verbal duro'),
(3,'feedback','Breve y verbal, en inglés simple, sin metalenguaje'),
(4,'feedback','Resumen estructurado al cierre con 1-2 correcciones'),
(1,'motivation','Elogio frecuente y exagerado en cada paso'),
(2,'motivation','Elogio frecuente y exagerado en cada paso'),
(3,'motivation','Elogio puntual y genuino, sin sobreactuar'),
(4,'motivation','Refuerzo sobrio, foco en progreso real'),
(2,'turn_length','Máx. ~40 palabras por turno'),
(3,'turn_length','Máx. ~60 palabras por turno'),
(4,'turn_length','Sin tope estricto; priorizar naturalidad');

INSERT INTO level_policy (level_code,kind,body) VALUES
('A1','hint_policy','Ante traba: traducir/espejar de inmediato'),
('A2','hint_policy','Ante traba: traducir/espejar de inmediato'),
('B1','hint_policy','Ante traba: dar pista en inglés antes de traducir'),
('B2','hint_policy','Ante traba: sinónimo o reformulación en inglés, nunca traducir'),
('C1','hint_policy','Ante traba: sinónimo o reformulación en inglés, nunca traducir'),
('A1','error_policy','Modelado implícito (recast suave), sin señalar el error'),
('A2','error_policy','Modelado implícito (recast suave), sin señalar el error'),
('B1','error_policy','Recast; señalar solo errores que rompen comunicación'),
('B2','error_policy','Recast + foco en matiz/idiomático cuando es relevante'),
('C1','error_policy','Recast + foco en matiz/idiomático cuando es relevante');

INSERT INTO phase (band_group,ord,name) VALUES
('kid',1,'Phase 1: Arrival (saludo + enganche con el mundo de hoy)'),
('kid',2,'Phase 2: Mission (juego con el vocabulario objetivo)'),
('kid',3,'Phase 3: Reward (logro y refuerzo)'),
('kid',4,'Phase 4: Session Close (mini-repaso + gancho)'),
('adult',1,'Phase 1: Context Setup (apertura del escenario)'),
('adult',2,'Phase 2: Development (desarrollo de la conversación)'),
('adult',3,'Phase 3: Resolution (resolución del objetivo)'),
('adult',4,'Phase 4: Session Close (repaso + feedback + gancho)');

INSERT INTO trigger_template (band_group,kind,body) VALUES
('kid','opening','Saludá con energía como {tutor}, presentá el mundo de hoy ''{topic}'' y enganchá. Pedí repetir ''{vocab0}''. Flujo de 3 pasos.'),
('kid','continuation','1 frase EN -> espejo ES -> repetición; nunca preguntas abiertas; máx. 30 palabras.'),
('kid','closing','Repaso breve (''Hoy aprendimos {vocab}''), festejá el logro y enganchá; ES con alguna palabra EN.'),
('teen','opening','Saludá relajado como {tutor}, presentá ''{topic}'' y abrí con UNA pregunta simple en inglés.'),
('teen','continuation','Una pregunta/consigna por turno, español al mínimo, conectando con sus intereses.'),
('teen','closing','Repaso en EN simple (''Today we practiced {phrase0}''), elogio corto y gancho.'),
('adult','opening','Presentate como {tutor}, bienvenida a {name}, presentá el escenario ''{topic}'' y la primera consigna.'),
('adult','continuation','Una situación por turno, sin castellano, pistas si se traba >3s; avanzá hacia {objective}.'),
('adult','closing','Repaso al nivel {level} ({objective}), 1-2 correcciones de Recent_Errors sin abrumar, gancho.');

INSERT INTO category (category_id,name) VALUES
(1,'Espacio y ciencia'),
(2,'Naturaleza'),
(3,'Deportes'),
(4,'Cultura y TV'),
(5,'Tecnología'),
(6,'Comida');

INSERT INTO subcategory (subcategory_id,category_id,name) VALUES
(1,1,'Astronomía'),
(2,1,'Prehistoria'),
(3,2,'Océanos'),
(4,2,'Geología'),
(5,2,'Botánica'),
(6,3,'Pelota'),
(7,3,'Aire libre'),
(8,4,'Música'),
(9,4,'Pantalla'),
(10,5,'Robótica'),
(11,5,'Juegos'),
(12,6,'Recetas');

INSERT INTO topic (topic_id,subcategory_id,title,objective) VALUES
(1,2,'El mundo de los dinosaurios','nombrar animales y describir tamaños'),
(2,1,'Explorar el espacio','describir el cielo y los planetas'),
(3,1,'¿Llegaremos a Marte?','opinar sobre el futuro y la exploración'),
(4,3,'Animales del océano','nombrar animales marinos'),
(5,4,'Volcanes','explicar un fenómeno natural'),
(6,5,'Jardines y plantas','hablar de rutinas de cuidado'),
(7,6,'Fútbol','hablar de un partido'),
(8,7,'Escalada','describir una actividad al aire libre'),
(9,7,'Deportes al aire libre','hablar de hábitos y deportes'),
(10,8,'Bandas de música','expresar gustos musicales'),
(11,9,'Cine de aventuras','recomendar y opinar sobre películas'),
(12,9,'Programas de TV clásicos','recordar y describir programas'),
(13,10,'Cómo funcionan los robots','explicar un proceso técnico'),
(14,11,'Videojuegos','contar cómo se juega'),
(15,12,'Cocina del mundo','describir una receta');

INSERT INTO topic_suggested_band (topic_id,band_id,overridable) VALUES
(1,1,1),
(1,2,1),
(2,2,1),
(2,3,1),
(2,4,1),
(3,3,1),
(3,4,1),
(4,1,1),
(4,2,1),
(4,3,1),
(4,4,1),
(5,2,1),
(5,3,1),
(5,4,1),
(6,1,1),
(6,2,1),
(6,3,1),
(6,4,1),
(7,1,1),
(7,2,1),
(7,3,1),
(7,4,1),
(8,2,1),
(8,3,1),
(8,4,1),
(9,3,1),
(9,4,1),
(10,2,1),
(10,3,1),
(10,4,1),
(11,3,1),
(11,4,1),
(12,3,1),
(12,4,1),
(13,2,1),
(13,3,1),
(13,4,1),
(14,2,1),
(14,3,1),
(14,4,1),
(15,3,1),
(15,4,1);

INSERT INTO topic_lexis (topic_id,lexis_type,text,cefr_level,ord) VALUES
(1,'word','Dino','A1',0),
(1,'word','Egg','A1',1),
(1,'phrase','Big dino','A2',0),
(1,'phrase','A small egg','A2',1),
(2,'word','Star','A1',0),
(2,'word','Planet','A1',1),
(2,'phrase','A bright star','A2',0),
(2,'phrase','The red planet','A2',1),
(3,'word','Mars','A1',0),
(3,'word','Rocket','A1',1),
(3,'phrase','Travel to Mars','A2',0),
(3,'phrase','A big rocket','A2',1),
(4,'word','Fish','A1',0),
(4,'word','Whale','A1',1),
(4,'phrase','A big whale','A2',0),
(5,'word','Lava','A1',0),
(5,'word','Erupt','A1',1),
(5,'phrase','The volcano erupts','A2',0),
(6,'word','Plant','A1',0),
(6,'word','Flower','A1',1),
(6,'phrase','Water the plant','A2',0),
(7,'word','Ball','A1',0),
(7,'word','Goal','A1',1),
(7,'phrase','Score a goal','A2',0),
(7,'phrase','Kick the ball','A2',1),
(8,'word','Rope','A1',0),
(8,'word','Summit','A1',1),
(8,'phrase','Reach the summit','A2',0),
(8,'phrase','Hold the rope','A2',1),
(9,'word','Run','A1',0),
(9,'word','Trail','A1',1),
(9,'phrase','Run on the trail','A2',0),
(10,'word','Song','A1',0),
(10,'word','Band','A1',1),
(10,'phrase','A great song','A2',0),
(11,'word','Movie','A1',0),
(11,'word','Hero','A1',1),
(11,'phrase','An action movie','A2',0),
(12,'word','Show','A1',0),
(12,'word','Channel','A1',1),
(12,'phrase','A classic show','A2',0),
(13,'word','Robot','A1',0),
(13,'word','Sensor','A1',1),
(13,'phrase','The robot moves','A2',0),
(14,'word','Game','A1',0),
(14,'word','Level','A1',1),
(14,'phrase','Win the level','A2',0),
(15,'word','Recipe','A1',0),
(15,'word','Dish','A1',1),
(15,'phrase','A tasty dish','A2',0),
(7,'word','Possession','B1',2),
(7,'word','Counter-attack','B1',3),
(7,'word','Offside','B2',4),
(7,'word','High press','B2',5),
(7,'phrase','They should have pressed higher','B2',2),
(7,'phrase','A game of two halves','C1',3),
(7,'phrase','Park the bus','C1',4),
(3,'word','Colonisation','B2',2),
(3,'word','Feasibility','B2',3),
(3,'phrase','It is only a matter of time','B2',2),
(3,'word','Terraforming','C1',4),
(10,'word','Lyrics','B1',2),
(10,'word','Gig','B1',3),
(10,'word','Underrated','B2',4),
(10,'phrase','They sold out the venue','B2',2);

-- ---- Orquestaciones de ejemplo (config) ----
INSERT INTO orchestration (orchestration_id,name,status,band_id,level_code,topic_id,notes) VALUES
 (1,'Kids · A1 · Dinos','active',1,'A1',1,NULL),
 (2,'Adultos · B2 · Fútbol','active',4,'B2',7,NULL),
 (3,'Teens · B1 · genérica','draft',3,'B1',NULL,'cualquier tópico');
INSERT INTO orchestration_override (orchestration_id,slot,action,target_table,target_id,body,ord,note) VALUES
 (2,'behavioral_guard','add',NULL,NULL,'Foco en colocaciones del tópico',1,'pin del editor');

-- ---- Datos de ejemplo runtime (en producción arrancan vacías) ----
INSERT INTO student (student_id,name,age,level_code) VALUES (1,'Timo',5,'A1'),(2,'Caro',28,'B2');
INSERT INTO student_interest (student_id,interest) VALUES (1,'dinosaurios'),(1,'cohetes'),(2,'divulgación'),(2,'fútbol');
INSERT INTO learner_item (student_id,item_type,item_value,status) VALUES
 (1,'word','Dino','learning'),(1,'error','Banana','due'),(2,'phrase','Travel to Mars','learning');
-- progreso de currículum: Caro ya domina 'expresar opinión', tiene 'segundo condicional' due
INSERT INTO learner_objective (student_id,objective_id,status,last_seen,due_at)
 SELECT 2, objective_id, 'mastered', NOW(), NULL FROM language_objective WHERE code='B2-FUN-01';
INSERT INTO learner_objective (student_id,objective_id,status,last_seen,due_at)
 SELECT 2, objective_id, 'due', NOW(), NOW() FROM language_objective WHERE code='B2-GRA-01';
INSERT INTO session (student_id,topic_id,turn,elapsed_min,`signal`,current_phase) VALUES
 (1,1,1,0,'idle','Phase 1'),(2,7,4,3,'flowing','Phase 2');

-- ============================================================================
-- sp_build_stack v2: arma las 9 capas + resuelve el CONTENIDO DINÁMICO:
--   * léxico del tópico hasta el nivel del alumno (topic_lexis)
--   * objetivos del currículum del nivel, MENOS lo dominado, priorizando 'due'
-- ============================================================================
DELIMITER $$
CREATE PROCEDURE sp_build_stack(IN p_student_id INT UNSIGNED)
BEGIN
  DECLARE v_band TINYINT; DECLARE v_group ENUM('kid','adult');
  DECLARE v_trg ENUM('kid','teen','adult'); DECLARE v_level CHAR(2);
  DECLARE v_sort TINYINT; DECLARE v_topic INT UNSIGNED; DECLARE v_orch INT UNSIGNED;

  SELECT b.band_id, b.phase_group, s.level_code, l.sort_order
    INTO v_band, v_group, v_level, v_sort
  FROM student s JOIN age_band b ON s.age BETWEEN b.min_age AND b.max_age
  JOIN `level` l ON l.level_code = s.level_code WHERE s.student_id = p_student_id;
  SELECT CASE WHEN code IN ('early_child','child') THEN 'kid' ELSE code END
    INTO v_trg FROM age_band WHERE band_id = v_band;
  SELECT topic_id INTO v_topic FROM session
    WHERE student_id = p_student_id ORDER BY started_at DESC LIMIT 1;

  -- orquestación que matchea (NULL = comodín), priorizando la más específica
  SET v_orch = (SELECT orchestration_id FROM orchestration
     WHERE status='active' AND (band_id IS NULL OR band_id=v_band)
       AND (level_code IS NULL OR level_code=v_level)
       AND (topic_id IS NULL OR topic_id=v_topic)
     ORDER BY (band_id IS NOT NULL)+(level_code IS NOT NULL)+(topic_id IS NOT NULL) DESC
     LIMIT 1);
  SELECT '0_orchestration' AS bloque, o.name, oo.slot, oo.action, COALESCE(oo.body,'') AS body
    FROM orchestration o LEFT JOIN orchestration_override oo ON oo.orchestration_id=o.orchestration_id
   WHERE o.orchestration_id = v_orch;

  SELECT '2_tutor' AS bloque, name, persona, tone FROM tutor_identity WHERE band_id=v_band;
  SELECT '3_pedagogy' AS bloque, methodology FROM pedagogy WHERE band_id=v_band;
  SELECT '4_focus' AS bloque, a.description AS activity, t.objective
    FROM activity_type a JOIN topic t ON t.topic_id=v_topic WHERE a.band_id=v_band;
  SELECT '6_guards' AS bloque,'band' AS scope,ord,body FROM behavioral_guard
    WHERE band_id=v_band AND guard_id NOT IN (
      SELECT target_id FROM orchestration_override
      WHERE orchestration_id=v_orch AND slot='behavioral_guard' AND action='disable' AND target_id IS NOT NULL)
   UNION ALL SELECT '6_guards','level',0,modifier FROM `level` WHERE level_code=v_level
   UNION ALL SELECT '6_guards','universal',ord,body FROM universal_policy
   UNION ALL SELECT '6_guards','override',ord,COALESCE(body,'') FROM orchestration_override
      WHERE orchestration_id=v_orch AND slot='behavioral_guard' AND action='add'
   ORDER BY scope,ord;
  -- 7 TÓPICO: léxico graduado hasta el nivel del alumno (dinámico por nivel)
  SELECT '7_lexis' AS bloque, lx.lexis_type, lx.text, lx.cefr_level
    FROM topic_lexis lx JOIN `level` l ON l.level_code=lx.cefr_level
   WHERE lx.topic_id=v_topic AND l.sort_order <= v_sort
   ORDER BY l.sort_order, lx.ord;
  -- 7b QUÉ APRENDER HOY: currículum del nivel − dominado, priorizando 'due'
  SELECT '7b_objetivos' AS bloque, lo.kind, lo.description,
         COALESCE(luo.status,'nuevo') AS estado
    FROM language_objective lo
    LEFT JOIN learner_objective luo
      ON luo.objective_id=lo.objective_id AND luo.student_id=p_student_id
   WHERE lo.cefr_level=v_level AND COALESCE(luo.status,'')<>'mastered'
   ORDER BY (luo.status='due') DESC, lo.sort_order LIMIT 4;
  SELECT '8_phases' AS bloque, ord, name FROM phase WHERE band_group=v_group ORDER BY ord;
  SELECT '8_pacing' AS bloque,(b.pacing_base_min+l.pacing_bonus_min) AS target_min
    FROM age_band b JOIN `level` l ON l.level_code=v_level WHERE b.band_id=v_band;
  SELECT '9_trigger' AS bloque, kind, body FROM trigger_template WHERE band_group=v_trg
   ORDER BY FIELD(kind,'opening','continuation','closing');
  SELECT '9b_state' AS bloque, turn, elapsed_min, `signal`, current_phase
    FROM session WHERE student_id=p_student_id ORDER BY started_at DESC LIMIT 1;
END $$
DELIMITER ;
-- CALL sp_build_stack(2);  -- Caro B2 + Fútbol: ver léxico B2 y objetivos B2 (sin el ya dominado)

-- ============================================================================
--  Motor de Lenguaje Dinámico — esquema MySQL (InnoDB / utf8mb4)
--  Ejecutar:  mysql -u USER -p NOMBRE_DB < schema.sql
-- ============================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------- Alumno (alimenta la capa 5: student_profile) ---------------------
CREATE TABLE IF NOT EXISTS students (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  age             INT NOT NULL,
  level           ENUM('A1','A2','B1','B2','C1') NOT NULL,
  native_dialect  VARCHAR(20) NOT NULL DEFAULT 'es-AR',
  barrier         VARCHAR(255) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- Catálogo de tópicos (agnósticos) ---------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subcategories (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  category_id  INT NOT NULL,
  name         VARCHAR(120) NOT NULL,
  UNIQUE KEY uq_subcat (category_id, name),
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- El tópico SOLO lleva datos de diccionario; nunca instrucciones de conducta.
CREATE TABLE IF NOT EXISTS topics (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  subcategory_id  INT NOT NULL,
  title           VARCHAR(200) NOT NULL,
  objective       VARCHAR(255) NOT NULL,
  vocab           JSON NOT NULL,   -- ["Star","Planet"]
  phrases         JSON NOT NULL,   -- ["A bright star","The red planet"]
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- El "kit": pool de tópicos del alumno (onboarding). No entra al prompt.
CREATE TABLE IF NOT EXISTS student_topic_kit (
  student_id  INT NOT NULL,
  topic_id    INT NOT NULL,
  source      ENUM('declared','detected') NOT NULL DEFAULT 'declared',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, topic_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (topic_id)   REFERENCES topics(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- Memoria / SRS (alimenta learner_state; lo escribe el post-clase) --
CREATE TABLE IF NOT EXISTS vocab_progress (
  student_id     INT NOT NULL,
  item           VARCHAR(160) NOT NULL,             -- "Apple" | "Eat apple"
  skill_stage    ENUM('repeat','recognize','recall','use') NOT NULL DEFAULT 'repeat',
  status         ENUM('new','learning','mastered')        NOT NULL DEFAULT 'new',
  seen_count     INT NOT NULL DEFAULT 0,
  success_count  INT NOT NULL DEFAULT 0,
  fail_count     INT NOT NULL DEFAULT 0,
  ease           FLOAT NOT NULL DEFAULT 2.5,
  last_seen      DATE NULL,
  next_review    DATE NULL,                          -- el sequencer lo consulta
  PRIMARY KEY (student_id, item),
  KEY idx_due (student_id, next_review),
  FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reinforcement_queue (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id  INT NOT NULL,
  item        VARCHAR(160) NOT NULL,
  reason      VARCHAR(120) NOT NULL,                 -- failed_3x | pronunciation | confused_with:Banana
  priority    INT NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- Intereses y rasgos (declared en onboarding + detected post-clase) -
CREATE TABLE IF NOT EXISTS student_interests (
  student_id  INT NOT NULL,
  interest    VARCHAR(120) NOT NULL,
  source      ENUM('declared','detected') NOT NULL DEFAULT 'declared',
  weight      FLOAT NOT NULL DEFAULT 1.0,
  last_seen   DATE NULL,
  PRIMARY KEY (student_id, interest),
  FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS student_traits (
  student_id  INT NOT NULL,
  trait       VARCHAR(200) NOT NULL,
  confidence  FLOAT NOT NULL DEFAULT 0.5,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, trait),
  FOREIGN KEY (student_id) REFERENCES students(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------- Sesión (cuantitativo determinista + insights cualitativos) -------
CREATE TABLE IF NOT EXISTS session_log (
  session_id  CHAR(36) PRIMARY KEY,                  -- UUID
  student_id  INT NOT NULL,
  date        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  topic_id    INT NULL,
  turns       INT NOT NULL DEFAULT 0,
  duration_s  INT NOT NULL DEFAULT 0,
  completed   TINYINT(1) NOT NULL DEFAULT 0,
  affective   ENUM('engaged','neutral','frustrated') NULL,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (topic_id)   REFERENCES topics(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS session_insights (
  session_id          CHAR(36) PRIMARY KEY,
  summary             TEXT,
  new_interests       JSON,
  items_to_reinforce  JSON,
  suggested_topic     VARCHAR(200),
  notes               TEXT,
  FOREIGN KEY (session_id) REFERENCES session_log(session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

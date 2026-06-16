-- ============================================================================
--  Datos de ejemplo para probar el motor end-to-end.
--  Ejecutar DESPUÉS de schema.sql:   mysql -u USER -p language_engine < seed.sql
-- ============================================================================
SET NAMES utf8mb4;

INSERT INTO categories (id, name) VALUES
  (1, 'Espacio y ciencia'),
  (2, 'Viajes');

INSERT INTO subcategories (id, category_id, name) VALUES
  (1, 1, 'Astronomía'),
  (2, 2, 'Alojamiento');

INSERT INTO topics (id, subcategory_id, title, objective, vocab, phrases) VALUES
  (1, 1, 'Explorar el espacio', 'describir el cielo y los planetas',
      '["Star","Planet"]', '["A bright star","The red planet"]'),
  (2, 2, 'The Hostel Overbooking Crisis', 'quejarse de forma cortés pero firme',
      '["Issue","Booking"]', '["I was wondering if...","There seems to be an issue with...","Could you please check..."]');

INSERT INTO students (id, name, age, level, native_dialect, barrier) VALUES
  (1, 'Carlos', 34, 'B1', 'es-AR', 'alta inhibición y miedo a equivocarse al hablar');

-- Kit del alumno (onboarding): pool de tópicos elegidos
INSERT INTO student_topic_kit (student_id, topic_id, source) VALUES
  (1, 1, 'declared'),
  (1, 2, 'declared');

-- Intereses declarados en el onboarding
INSERT INTO student_interests (student_id, interest, source, weight) VALUES
  (1, 'viajes', 'declared', 2.0),
  (1, 'espacio', 'declared', 1.0);

-- Memoria SRS: 'Booking' está vencida (due) -> el sequencer va a priorizar su tópico
INSERT INTO vocab_progress (student_id, item, status, seen_count, success_count, fail_count, ease, last_seen, next_review) VALUES
  (1, 'Booking', 'learning', 2, 1, 1, 2.5, '2026-06-10', '2026-06-12'),
  (1, 'Star',    'learning', 1, 0, 0, 2.5, '2026-06-14', '2026-06-25');

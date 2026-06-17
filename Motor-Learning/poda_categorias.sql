-- ============================================================================
-- Poda de categorías/subcategorías duplicadas y huérfanas
-- Reasigna los temas viejos a las subcats nuevas y borra lo viejo.
-- Va por NOMBRE (no por IDs) para que funcione sin depender de los IDs reales.
-- Corre dentro de una transacción: revisá el SELECT final y recién ahí COMMIT.
-- ============================================================================
SET NAMES utf8mb4;
START TRANSACTION;

-- ---- 1) Reasignar temas de subcats viejas -> subcats nuevas --------------- --
-- (el patrón JOIN solo actualiza si EXISTE el destino; nunca deja NULL)

-- Cultura y TV / Música  ->  Cultura y entretenimiento / Música
UPDATE topic t
  JOIN subcategory ssrc ON ssrc.subcategory_id = t.subcategory_id
  JOIN category   csrc ON csrc.category_id = ssrc.category_id
  JOIN subcategory sdst ON sdst.name = 'Música'
  JOIN category   cdst ON cdst.category_id = sdst.category_id
SET t.subcategory_id = sdst.subcategory_id
WHERE csrc.name='Cultura y TV' AND ssrc.name='Música'
  AND cdst.name='Cultura y entretenimiento';

-- Cultura y TV / Pantalla  ->  Cultura y entretenimiento / Series y TV   (ajustá si preferís Cine)
UPDATE topic t
  JOIN subcategory ssrc ON ssrc.subcategory_id = t.subcategory_id
  JOIN category   csrc ON csrc.category_id = ssrc.category_id
  JOIN subcategory sdst ON sdst.name = 'Series y TV'
  JOIN category   cdst ON cdst.category_id = sdst.category_id
SET t.subcategory_id = sdst.subcategory_id
WHERE csrc.name='Cultura y TV' AND ssrc.name='Pantalla'
  AND cdst.name='Cultura y entretenimiento';

-- Comida / Recetas  ->  Comida y bebida / Recetas del mundo
UPDATE topic t
  JOIN subcategory ssrc ON ssrc.subcategory_id = t.subcategory_id
  JOIN category   csrc ON csrc.category_id = ssrc.category_id
  JOIN subcategory sdst ON sdst.name = 'Recetas del mundo'
  JOIN category   cdst ON cdst.category_id = sdst.category_id
SET t.subcategory_id = sdst.subcategory_id
WHERE csrc.name='Comida' AND ssrc.name='Recetas'
  AND cdst.name='Comida y bebida';

-- Naturaleza / Geología  ->  Naturaleza / Volcanes y geología
UPDATE topic t
  JOIN subcategory ssrc ON ssrc.subcategory_id = t.subcategory_id
  JOIN category   csrc ON csrc.category_id = ssrc.category_id
  JOIN subcategory sdst ON sdst.name = 'Volcanes y geología'
  JOIN category   cdst ON cdst.category_id = sdst.category_id
SET t.subcategory_id = sdst.subcategory_id
WHERE csrc.name='Naturaleza' AND ssrc.name='Geología'
  AND cdst.name='Naturaleza';

-- Deportes / Pelota  ->  Deportes / Fútbol
UPDATE topic t
  JOIN subcategory ssrc ON ssrc.subcategory_id = t.subcategory_id
  JOIN category   csrc ON csrc.category_id = ssrc.category_id
  JOIN subcategory sdst ON sdst.name = 'Fútbol'
  JOIN category   cdst ON cdst.category_id = sdst.category_id
SET t.subcategory_id = sdst.subcategory_id
WHERE csrc.name='Deportes' AND ssrc.name='Pelota'
  AND cdst.name='Deportes';

-- Tecnología / Juegos  ->  Cultura y entretenimiento / Videojuegos   (ajustá si lo querés en Tecnología)
UPDATE topic t
  JOIN subcategory ssrc ON ssrc.subcategory_id = t.subcategory_id
  JOIN category   csrc ON csrc.category_id = ssrc.category_id
  JOIN subcategory sdst ON sdst.name = 'Videojuegos'
  JOIN category   cdst ON cdst.category_id = sdst.category_id
SET t.subcategory_id = sdst.subcategory_id
WHERE csrc.name='Tecnología' AND ssrc.name='Juegos'
  AND cdst.name='Cultura y entretenimiento';

-- ---- 2) Borrar las subcats viejas (ya vacías; si quedara algún tema, el FK lo frena) --
DELETE s FROM subcategory s JOIN category c ON c.category_id = s.category_id
WHERE (c.name='Cultura y TV'  AND s.name IN ('Música','Pantalla'))
   OR (c.name='Comida'        AND s.name='Recetas')
   OR (c.name='Naturaleza'    AND s.name='Geología')
   OR (c.name='Deportes'      AND s.name='Pelota')
   OR (c.name='Tecnología'    AND s.name='Juegos');

-- ---- 3) Borrar las categorías viejas duplicadas (ya sin subcats) ---------- --
DELETE FROM category WHERE name IN ('Cultura y TV','Comida');

-- ---- 4) Verificación: revisá esto ANTES de confirmar --------------------- --
SELECT c.category_id, c.name AS categoria, COUNT(DISTINCT s.subcategory_id) AS subcats,
       COUNT(t.topic_id) AS temas
FROM category c
LEFT JOIN subcategory s ON s.category_id = c.category_id
LEFT JOIN topic t ON t.subcategory_id = s.subcategory_id
GROUP BY c.category_id, c.name
ORDER BY c.category_id;

-- Si el resumen quedó bien (10 categorías, sin duplicados):  COMMIT;
-- Si algo no cuadra:                                          ROLLBACK;
COMMIT;

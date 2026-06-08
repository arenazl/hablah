"""v13: segmento en tópicos + borrar los huérfanos que migré mal.

- ADD columna `segmento` (mini|junior|tween|adultos), idempotente.
- Backfill: segmento = kid_age_group (kids) | 'adultos' (resto).
- BORRA los 10 tópicos-currículo huérfanos (Saludos/Colores…, is_curriculum=1)
  + sus celdas de topic_module_content. NO eran tópicos: eran vocabulario.

Uso: heroku run python scripts/migrate_v13_topics_segmento.py
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        # 1) columna segmento
        exists = (await conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'topics' AND COLUMN_NAME = 'segmento'"
        ))).scalar()
        if exists:
            print("[skip] topics.segmento ya existe")
        else:
            await conn.execute(text("ALTER TABLE topics ADD COLUMN segmento VARCHAR(12) NULL"))
            await conn.execute(text("CREATE INDEX ix_topics_segmento ON topics (segmento)"))
            print("[ok] topics.segmento agregada")

        # 2) backfill
        await conn.execute(text(
            "UPDATE topics SET segmento = kid_age_group WHERE kid_age_group IS NOT NULL AND (segmento IS NULL OR segmento='')"
        ))
        await conn.execute(text(
            "UPDATE topics SET segmento = 'adultos' WHERE (segmento IS NULL OR segmento='') "
            "AND (kid_age_group IS NULL) AND (audience IS NULL OR audience <> 'kid')"
        ))
        print("[ok] backfill segmento (kids -> kid_age_group, resto -> adultos)")

        # 3) borrar los huérfanos (is_curriculum=1) + sus junctions
        orphan_ids = [r[0] for r in (await conn.execute(text(
            "SELECT id FROM topics WHERE is_curriculum = 1"
        ))).all()]
        if not orphan_ids:
            print("[skip] no hay tópicos huérfanos (is_curriculum=1)")
        else:
            ids_csv = ",".join(str(i) for i in orphan_ids)
            jdel = (await conn.execute(text(
                f"DELETE FROM topic_module_content WHERE topic_id IN ({ids_csv})"
            ))).rowcount
            tdel = (await conn.execute(text(
                f"DELETE FROM topics WHERE id IN ({ids_csv})"
            ))).rowcount
            print(f"[ok] borrados {tdel} tópicos huérfanos + {jdel} celdas de junction")

    print("\nOK - migrate_v13 (segmento + limpieza de huérfanos) completo")


if __name__ == "__main__":
    asyncio.run(main())

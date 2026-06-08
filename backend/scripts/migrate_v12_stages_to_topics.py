"""v12 (data): migra MethodologyStage (Saludos/Colores/Conteo) -> topics.

Esas filas NUNCA fueron metodología: son TÓPICOS de kids con vocab pinneado.
Las mueve a `topics` (audience='kid', is_curriculum=True) y crea la celda del
junction `topic_module_content` cruzándolas con el riel del nivel (mini/A0).

Idempotente por slug determinístico. NO borra `methodology_stages` (legacy hasta
verificar en prod). Requiere correr antes `seed_methodology_modules.py` (para que
exista el módulo mini/A0). Uso: heroku run python scripts/migrate_v12_stages_to_topics.py
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import re
from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.template import Topic
from models.methodology import MethodologyStage, MethodologyModule, TopicModuleContent


def _slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "tema"


async def main() -> None:
    async with AsyncSessionLocal() as db:
        stages = (await db.execute(
            select(MethodologyStage).where(MethodologyStage.active.is_(True))
            .order_by(MethodologyStage.age_group, MethodologyStage.order_index)
        )).scalars().all()
        if not stages:
            print("[warn] no hay methodology_stages para migrar")
            return

        migrated = 0
        for st in stages:
            slug = f"kids-{st.age_group}-{st.order_index}-{_slugify(st.title)}"
            existing = (await db.execute(select(Topic).where(Topic.slug == slug))).scalar_one_or_none()
            if existing:
                topic = existing
                print(f"[skip] tópico {slug} ya existe")
            else:
                topic = Topic(
                    slug=slug, title=st.title, category="kids",
                    audience="kid", is_curriculum=True, kid_age_group=st.age_group,
                    pinned_vocabulary=st.vocabulary or [],
                    target_structure=st.target_structure,
                    target_structure_es=st.target_structure_es,
                    mastery_criteria=st.mastery_criteria,
                    seed_prompts={st.age_group: st.title},
                    keywords=[v.get("en") for v in (st.vocabulary or []) if v.get("en")],
                    levels=[st.cefr_level or "A0"],
                    is_active=True,
                )
                db.add(topic)
                await db.flush()  # para tener topic.id
                migrated += 1
                print(f"[ok] tópico {slug} (vocab={len(topic.pinned_vocabulary or [])})")

            # Celda del junction: cruza este tópico con el riel del nivel del nene.
            module = (await db.execute(
                select(MethodologyModule).where(
                    MethodologyModule.student_type == st.age_group,
                    MethodologyModule.level == (st.cefr_level or "A0"),
                    MethodologyModule.module_order == 1,
                )
            )).scalar_one_or_none()
            if not module:
                print(f"[warn] sin riel {st.age_group}/{st.cefr_level or 'A0'} — corré seed_methodology_modules.py primero")
                continue
            cell = (await db.execute(
                select(TopicModuleContent).where(
                    TopicModuleContent.topic_id == topic.id,
                    TopicModuleContent.module_id == module.id,
                )
            )).scalar_one_or_none()
            if cell:
                continue
            vocab_en = [v.get("en") for v in (st.vocabulary or []) if v.get("en")]
            db.add(TopicModuleContent(
                topic_id=topic.id, module_id=module.id,
                seed_prompt=st.target_structure or st.title,
                required_keywords=vocab_en,
                allowed_vocabulary=vocab_en,  # filtro duro en A0/A1
                is_generated=False, active=True,
            ))
            print(f"    [ok] junction {slug} × módulo {st.age_group}/{st.cefr_level or 'A0'}")

        await db.commit()
    print(f"\nOK - migrate_v12_stages_to_topics: {migrated} tópicos nuevos")


if __name__ == "__main__":
    asyncio.run(main())

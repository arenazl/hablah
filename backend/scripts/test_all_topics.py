"""Test EXHAUSTIVO: cada tópico activo × (segmento/nivel por audience) → ¿el motor explota?

Recorre los 156 tópicos y arma el prompt fail-fast para cada uno. Si alguno lanza
MotorDataMissing, lo lista. Objetivo: CERO excepciones hasta el prompt.
Uso: python scripts/test_all_topics.py
"""
import asyncio
import os
import sys
from types import SimpleNamespace

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.methodology import StudentType, Level
from models.config import AppConfig
from models.template import Topic
from services.composer_proto import compose_proto_prompt, MotorDataMissing


def _st(s):
    return {"slug": s.slug, "tutor_mascot": s.tutor_mascot, "tutor_identity": s.tutor_identity,
            "tutor_tonal_rules": s.tutor_tonal_rules, "session_focus": s.session_focus,
            "pedagogy": s.pedagogy, "form_rules": s.form_rules, "opening_seed": s.opening_seed,
            "continuation_seed": s.continuation_seed, "closing_seed": s.closing_seed}


def _lv(l):
    return {"language_rule": l.language_rule, "curriculum_grammar": l.curriculum_grammar,
            "expected_production": l.expected_production, "duration_base_minutes": l.duration_base_minutes,
            "vocab_depth": l.vocab_depth}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        sts = {s.slug: s for s in (await db.execute(select(StudentType))).scalars().all()}
        lvs = {l.code: l for l in (await db.execute(select(Level))).scalars().all()}
        from sqlalchemy import text as _sqltext
        app_config = {r[0]: r[1] for r in (await db.execute(_sqltext("SELECT config_key, config_value FROM app_config"))).all()}
        topics = (await db.execute(select(Topic).where(Topic.is_active.is_(True)))).scalars().all()

        fails = []
        for t in topics:
            seg = "mini" if (t.audience or "adult") == "kid" else "adult"
            lvl = "A1" if seg == "mini" else "B1"
            st, lv = sts.get(seg), lvs.get(lvl)
            user = SimpleNamespace(nombre="X", target_language="en", base_language="es",
                                   cefr_level=lvl, age_group=seg)
            try:
                compose_proto_prompt(user=user, topic=t, student_type_data=_st(st),
                                     level_data=_lv(lv), app_config=app_config)
            except MotorDataMissing as e:
                fails.append((t.id, t.title, str(e)))
            except Exception as e:  # cualquier otra cosa también la queremos ver
                fails.append((t.id, t.title, f"[OTRO] {type(e).__name__}: {e}"))

        print(f"TÓPICOS probados: {len(topics)}  |  EXCEPCIONES: {len(fails)}")
        for i, title, e in fails[:40]:
            print(f"  FALTA id={i} '{title}': {e[:160]}")
        if not fails:
            print("  -> CERO excepciones. Todos los tópicos arman prompt.")


if __name__ == "__main__":
    asyncio.run(main())

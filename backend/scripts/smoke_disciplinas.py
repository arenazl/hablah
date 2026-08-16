"""Smoke del motor sobre las disciplinas nuevas.

Compone un prompt real por disciplina (mismo camino que /api/orchestrator) y
verifica que las capas se llenen con dato, no con fallback. Sirve para saber si
el motor aguanta un catálogo multi-disciplina sin tocarlo.

Uso:  python scripts/smoke_disciplinas.py [--dump ID]
"""
import asyncio
import os
import sys
from types import SimpleNamespace

from dotenv import load_dotenv

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sqlalchemy import select, text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402
from models.template import Topic
from models.methodology import Level, StudentType  # noqa: E402
from models.config import AppConfig  # noqa: E402
from services.composer_proto import compose_proto_prompt, MotorDataMissing  # noqa: E402

# Marcadores de que una capa llegó al prompt
SENALES = {
    "narrativa": ("narrative", "story", "escena"),
    "vocabulario": ("current_lesson_vocabulary", "Words_Available"),
    "nivel": ("language_rule", "expected_production", "<student_level"),
    "persona": ("tutor", "persona", "identity"),
}


async def componer(db, topic, level_code: str, age: str) -> tuple[str | None, str | None]:
    lv = (await db.execute(select(Level).where(Level.code == level_code))).scalar_one_or_none()
    st = (await db.execute(select(StudentType).where(StudentType.slug == age))).scalar_one_or_none()
    if not lv:
        return None, f"no existe el nivel {level_code}"

    st_data = {}
    if st:
        # Todos los campos de la fila, sin enumerar: el composer exige varios
        # (_req) y enumerarlos a mano hace que el smoke falle por el script y no
        # por el motor.
        st_data = {c.name: getattr(st, c.name) for c in st.__table__.columns}

    tags = getattr(topic, "generated_vocab", None) or getattr(topic, "keywords", None) or []
    tc = {"allowed_vocabulary": tags, "required_keywords": [],
          "story_spine": None, "start_trigger": None}
    level_data = {k: getattr(lv, k, None) for k in
                  ("language_rule", "curriculum_grammar", "expected_production",
                   "duration_base_minutes", "vocab_depth")}
    app_config = {c.key: c.value for c in (await db.execute(select(AppConfig))).scalars().all()}
    user = SimpleNamespace(nombre="Alumno", target_language="es", base_language="es",
                           cefr_level=level_code, age_group=age)
    try:
        return compose_proto_prompt(user=user, topic=topic, topic_content=tc,
                                    student_type_data=st_data, level_data=level_data,
                                    app_config=app_config), None
    except MotorDataMissing as e:
        return None, f"FALTA DATO: {e}"
    except Exception as e:  # noqa: BLE001
        return None, f"{type(e).__name__}: {e}"


async def main(dump_id: int | None):
    async with AsyncSessionLocal() as db:
        r = await db.execute(text(
            "SELECT DISTINCT COALESCE(c.discipline,'idiomas') AS d, "
            "  (SELECT t2.id FROM topics t2 LEFT JOIN categories c2 ON c2.id=t2.category_id "
            "   WHERE COALESCE(c2.discipline,'idiomas') = COALESCE(c.discipline,'idiomas') "
            "     AND t2.is_active=1 ORDER BY t2.id LIMIT 1) AS topic_id "
            "FROM categories c ORDER BY d"))
        casos = [(x[0], x[1]) for x in r.fetchall() if x[1]]

        if dump_id:
            topic = (await db.execute(select(Topic).where(Topic.id == dump_id))).scalar_one_or_none()
            prompt, err = await componer(db, topic, "B1", "adult")
            print(err or prompt)
            return

        print(f"{'disciplina':<13} {'tópico':<38} {'chars':>6}  capas")
        print("─" * 88)
        fallos = 0
        for disc, tid in casos:
            topic = (await db.execute(select(Topic).where(Topic.id == tid))).scalar_one_or_none()
            nivel = "A1" if disc == "fonetica" else "B1"
            edad = "junior" if disc == "fonetica" else "adult"
            prompt, err = await componer(db, topic, nivel, edad)
            if err:
                fallos += 1
                print(f"{disc:<13} {topic.title[:36]:<38} {'—':>6}  ❌ {err[:60]}")
                continue
            capas = [n for n, marcas in SENALES.items()
                     if any(m.lower() in prompt.lower() for m in marcas)]
            falta = [n for n in SENALES if n not in capas]
            estado = "OK" if not falta else f"sin {', '.join(falta)}"
            print(f"{disc:<13} {topic.title[:36]:<38} {len(prompt):>6}  {estado}")
        print(f"\n{len(casos) - fallos}/{len(casos)} disciplinas componen sin error")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--dump", type=int, default=None)
    args = p.parse_args()
    asyncio.run(main(args.dump))

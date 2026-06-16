"""Diagnóstico read-only: dato real de A0 (levels + student_types) + conteo de
contenido legacy. Evidencia antes de tocar prompts (regla del proyecto)."""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, func
from core.database import AsyncSessionLocal
from models.methodology import StudentType, Level, MethodologyModule, TopicModuleContent, MethodologyStage


def _show(label, val):
    txt = (val or "").strip() if isinstance(val, str) else val
    print(f"  {label}: {txt!r}")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        print("=== LEVEL A0 ===")
        lv = (await db.execute(select(Level).where(Level.code == "A0"))).scalar_one_or_none()
        if not lv:
            print("  (no existe fila A0)")
        else:
            _show("language_rule", lv.language_rule)
            _show("curriculum_grammar", lv.curriculum_grammar)
            _show("expected_production", lv.expected_production)
            _show("duration_base_minutes", lv.duration_base_minutes)
            _show("vocab_depth", lv.vocab_depth)

        print("\n=== STUDENT_TYPES (form_rules / pedagogy) ===")
        sts = (await db.execute(select(StudentType).order_by(StudentType.sort_order))).scalars().all()
        for st in sts:
            print(f"-- {st.slug} ({st.name}) active={st.active}")
            _show("form_rules", st.form_rules)
            _show("pedagogy", (st.pedagogy or "")[:160])
            _show("opening_seed", (st.opening_seed or "")[:120])

        print("\n=== CONTENIDO LEGACY (a borrar) ===")
        for model, name in [(MethodologyModule, "methodology_modules"),
                            (TopicModuleContent, "topic_module_content"),
                            (MethodologyStage, "methodology_stages")]:
            n = (await db.execute(select(func.count()).select_from(model))).scalar()
            print(f"  {name}: {n} filas")


if __name__ == "__main__":
    asyncio.run(main())

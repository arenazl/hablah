"""Verificador del wire v25 — arma el prompt con los 2 ejes apilados (sin servidor).

Replica lo que hace api/orchestrator.resolve pero standalone, para varios
(segmento, nivel). Muestra el bloque 6 (behavioral_guards) que es donde se apilan
nivel + edad, para ver que el currículum (universal) y la forma (por edad) entran
bien y NO se cruzan. Uso: python scripts/verify_v25_apilado.py
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
from services.composer_proto import compose_proto_prompt

CASES = [("mini", "A0"), ("junior", "A2"), ("adult", "B2")]


def _st_data(st):
    return {
        "slug": st.slug, "tutor_mascot": st.tutor_mascot, "tutor_identity": st.tutor_identity,
        "tutor_tonal_rules": st.tutor_tonal_rules, "session_focus": st.session_focus,
        "pedagogy": st.pedagogy, "form_rules": st.form_rules,
        "opening_seed": st.opening_seed, "continuation_seed": st.continuation_seed,
        "closing_seed": st.closing_seed,
    }


def _level_data(lv):
    return {
        "language_rule": lv.language_rule, "curriculum_grammar": lv.curriculum_grammar,
        "expected_production": lv.expected_production, "duration_base_minutes": lv.duration_base_minutes,
    }


def _extract_block(prompt, tag):
    a = prompt.find(f"<{tag}>")
    b = prompt.find(f"</{tag}>")
    return prompt[a:b + len(tag) + 3] if a >= 0 and b >= 0 else "(no encontrado)"


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for seg, lvl in CASES:
            st = (await db.execute(select(StudentType).where(StudentType.slug == seg))).scalar_one_or_none()
            lv = (await db.execute(select(Level).where(Level.code == lvl))).scalar_one_or_none()
            user = SimpleNamespace(nombre="Alumno", target_language="en", base_language="es",
                                   cefr_level=lvl, age_group=seg)
            prompt = compose_proto_prompt(
                user=user, topic=None,
                student_type_data=_st_data(st) if st else None,
                level_data=_level_data(lv) if lv else None,
            )
            print("=" * 70)
            print(f"  {seg.upper()} · {lvl}  (currículum=nivel universal, forma=edad)")
            print("=" * 70)
            print(_extract_block(prompt, "behavioral_guards"))
            print(_extract_block(prompt, "pedagogical_rules"))
            print()


if __name__ == "__main__":
    asyncio.run(main())

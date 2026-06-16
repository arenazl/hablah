"""Dump de prompts + RECORRIDO del circuito, a Motor-Learning/test-prompts/.

Para cada (segmento, nivel): arma el prompt determinístico y persiste un .md con:
  - las 3 entradas del circuito (id_alumno, edad→segmento, nivel),
  - los 9 pasos enumerados con su FUENTE (tabla.columna) y de qué DEPENDEN
    (ESTÁTICO / EDAD / NIVEL / ID_ALUMNO / TÓPICO) + si están cargados o en fallback,
  - el prompt final completo que recibiría la IA.

No llama a la IA (no gasta créditos). Uso: python scripts/dump_prompts_v25.py
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
from models.template import Topic
from models.config import AppConfig
from services.composer_proto import compose_proto_prompt, MotorDataMissing

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Motor-Learning", "test-prompts"))
AGE = {"mini": 5, "junior": 9, "tween": 14, "adult": 30}

# TODAS las combinatorias: 4 segmentos × 7 niveles = 28. Si alguna da FALTA,
# es un dato sin cargar (el motor no usa fallback).
_SEGS = ["mini", "junior", "tween", "adult"]
_LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]
CASES = [(s, l) for s in _SEGS for l in _LEVELS]


def _st_data(st):
    return {
        "slug": st.slug, "tutor_mascot": st.tutor_mascot, "tutor_identity": st.tutor_identity,
        "tutor_tonal_rules": st.tutor_tonal_rules, "session_focus": st.session_focus,
        "pedagogy": st.pedagogy, "form_rules": st.form_rules,
        "opening_seed": st.opening_seed, "continuation_seed": st.continuation_seed, "closing_seed": st.closing_seed,
    }


def _level_data(lv):
    return {"language_rule": lv.language_rule, "curriculum_grammar": lv.curriculum_grammar,
            "expected_production": lv.expected_production, "duration_base_minutes": lv.duration_base_minutes,
            "vocab_depth": lv.vocab_depth}


def _yn(v):
    return "CARGADO" if v else "fallback"


def _recorrido(st, lv, topic):
    """Los 9 pasos (+ memoria/estado) con fuente, dependencia y estado de carga."""
    has_vocab = bool(topic and (getattr(topic, "pinned_vocabulary", None) or getattr(topic, "keywords", None)))
    return [
        (1, "runtime_context", "sistema (fecha) + users.target/base_language", "ESTÁTICO (+ fecha)", "ok"),
        (2, "tutor_profile", "student_types.tutor_mascot/identity/tonal_rules", "EDAD", _yn(st and st.tutor_mascot)),
        (3, "pedagogical_rules", "student_types.pedagogy", "EDAD", _yn(st and st.pedagogy)),
        (4, "gamification_focus", "student_types.slug (+ descripción por banda)", "EDAD", _yn(st)),
        (5, "student_profile", "users (nombre/edad/nivel)", "ID_ALUMNO + EDAD + NIVEL", "ok"),
        ("5b", "learner_state (memoria)", "vocab_progress / learner_* (post-clase)", "ID_ALUMNO", "vacío (post-clase)"),
        (6, "behavioral_guards", "levels.language_rule/curriculum_grammar/expected_production + student_types.form_rules", "NIVEL + EDAD", _yn(lv and (lv.curriculum_grammar or lv.language_rule))),
        (7, "current_lesson_vocabulary", "topics.pinned_vocabulary/keywords (o topic_module_content)", "TÓPICO (kit por EDAD)", _yn(has_vocab)),
        (8, "story_timeline", "topic_module_content.story_spine / fallback generado", "TÓPICO + EDAD", "fallback (sin junction)"),
        (9, "start_execution_command", "student_types.opening_seed / topic_content.start_trigger / fallback", "EDAD", _yn(st and st.opening_seed)),
        ("12", "session_actions", "student_types.continuation_seed / closing_seed", "EDAD", _yn(st and (st.continuation_seed or st.closing_seed))),
        ("11", "interaction_state (vivo)", "app en tiempo real (turno/tiempo/señal)", "RUNTIME", "vacío (snapshot inicial)"),
    ]


async def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    index = ["# Test-prompts v25 — prompt + recorrido del circuito por caso\n",
             "Cada archivo: las 3 entradas (id_alumno, edad→segmento, nivel) → los 9 pasos con su "
             "fuente y dependencia → el prompt final. Estático vs dependiente del circuito.\n",
             "| Caso | Segmento | Nivel | Estado | Archivo |", "|---|---|---|---|---|"]
    async with AsyncSessionLocal() as db:
        app_config = {c.key: c.value for c in (await db.execute(select(AppConfig))).scalars().all()}
        for seg, lvl in CASES:
            st = (await db.execute(select(StudentType).where(StudentType.slug == seg))).scalar_one_or_none()
            lv = (await db.execute(select(Level).where(Level.code == lvl))).scalar_one_or_none()
            aud = "kid" if seg in ("mini", "junior", "tween") else "adult"
            topic = (await db.execute(
                select(Topic).where(Topic.is_active.is_(True), Topic.audience == aud).limit(1)
            )).scalars().first()
            age = AGE.get(seg, 10)
            user = SimpleNamespace(nombre="Alex(ficticio)", target_language="en", base_language="es",
                                   cefr_level=lvl, age_group=seg)
            try:
                prompt = compose_proto_prompt(user=user, topic=topic,
                                              student_type_data=_st_data(st) if st else None,
                                              level_data=_level_data(lv) if lv else None,
                                              app_config=app_config)
                status = "OK"
            except MotorDataMissing as e:
                prompt = f"[FALTA DATO — el motor no usa fallback]\n{e}"
                status = "FALTA"

            lines = [f"# Test-prompt · {seg.upper()} · {lvl}\n",
                     "## Entradas del circuito (los 3 datos)\n",
                     f"- **id_alumno:** `ficticio` (alimenta el bloque 5 y, a futuro, la memoria 5b)",
                     f"- **edad:** `{age}` → **segmento `{seg}`** (define tutor, pedagogía, forma, arranque)",
                     f"- **nivel:** `{lvl}` (define currículum, idioma ES/EN, complejidad)",
                     f"- **tópico (sequencer, kit por edad):** `{getattr(topic, 'title', '(tema libre)')}`\n",
                     "## Recorrido — los 9 pasos: fuente y dependencia\n",
                     "| # | Paso (tag) | Fuente (tabla.columna) | Depende de | Estado |",
                     "|---|---|---|---|---|"]
            for n, tag, src, dep, st_state in _recorrido(st, lv, topic):
                lines.append(f"| {n} | `{tag}` | {src} | **{dep}** | {st_state} |")
            lines += ["\n## Prompt final (lo que recibe la IA)\n", "```xml", prompt, "```\n"]

            fname = f"{seg}_{lvl}.md"
            with open(os.path.join(OUT_DIR, fname), "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
            index.append(f"| {seg}/{lvl} | {seg} | {lvl} | {status} | [{fname}]({fname}) |")
            print(f"  [{status}] {fname}")

    with open(os.path.join(OUT_DIR, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(index))
    print(f"\nOK -> Motor-Learning/test-prompts/ ({len(CASES)} casos + README)")


if __name__ == "__main__":
    asyncio.run(main())

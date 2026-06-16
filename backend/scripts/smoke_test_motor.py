"""SMOKE TEST del motor — 100% de combinaciones EDAD × NIVEL, SIN ejecutar el prompt.

Genera, para cada (nivel, segmento), un .md con:
  1) RECORRIDO del circuito: cada uno de los 9 pasos, su FUENTE (tabla.columna), de qué
     DEPENDE (ESTÁTICO / EDAD / NIVEL / ID_ALUMNO / TÓPICO) y si está cargado.
  2) El PROMPT generado (XML) — el armado determinístico, sin llamar a la IA.

Estructura: Motor-Learning/test-prompts/smoke/<nivel>/<segmento>.md  (7 carpetas × 4 archivos).
Fail-fast: si falta un dato, el archivo lo registra como FALTA con el campo exacto.
Uso: python scripts/smoke_test_motor.py
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

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Motor-Learning", "test-prompts"))
SEGS = ["mini", "junior", "tween", "adult"]
LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]
AGE = {"mini": 5, "junior": 9, "tween": 14, "adult": 30}


def _st(s):
    return {"slug": s.slug, "tutor_mascot": s.tutor_mascot, "tutor_identity": s.tutor_identity,
            "tutor_tonal_rules": s.tutor_tonal_rules, "session_focus": s.session_focus,
            "pedagogy": s.pedagogy, "form_rules": s.form_rules, "opening_seed": s.opening_seed,
            "continuation_seed": s.continuation_seed, "closing_seed": s.closing_seed}


def _lv(l):
    return {"language_rule": l.language_rule, "curriculum_grammar": l.curriculum_grammar,
            "expected_production": l.expected_production, "duration_base_minutes": l.duration_base_minutes,
            "vocab_depth": l.vocab_depth}


def _yn(v):
    return "CARGADO" if v else "—"


def _recorrido(st, lv, topic):
    has_vocab = bool(topic and (getattr(topic, "pinned_vocabulary", None) or getattr(topic, "keywords", None)
                                or getattr(topic, "generated_vocab", None)))
    return [
        (1, "runtime_context", "sistema (fecha) + users.target/base_language", "ESTÁTICO (+ fecha)", "ok"),
        (2, "tutor_profile", "student_types.tutor_mascot/identity/tonal_rules", "EDAD", _yn(st and st.tutor_mascot)),
        (3, "pedagogical_rules", "student_types.pedagogy", "EDAD", _yn(st and st.pedagogy)),
        (4, "gamification_focus", "student_types.session_focus", "EDAD", _yn(st and st.session_focus)),
        (5, "student_profile", "users (nombre/segmento/nivel)", "ID_ALUMNO + EDAD + NIVEL", "ok"),
        ("5b", "learner_state (memoria)", "vocab_progress / learner_* (post-clase)", "ID_ALUMNO", "vacío (post-clase)"),
        (6, "behavioral_guards", "levels.language_rule/curriculum_grammar/expected_production + student_types.form_rules", "NIVEL + EDAD", _yn(lv and lv.curriculum_grammar and st and st.form_rules)),
        ("6.1", "output_rules", "app_config (voz/ASR/seguridad/closing_trigger)", "ESTÁTICO/config", "según toggles"),
        (7, "current_lesson_vocabulary", "topics.pinned_vocabulary/keywords/generated_vocab (recorte por levels.vocab_depth)", "TÓPICO + NIVEL", _yn(has_vocab)),
        (8, "story_timeline", "topic_module_content.story_spine (curado)", "TÓPICO + EDAD", "opcional (omitido sin junction)"),
        (9, "start_execution_command", "student_types.opening_seed", "EDAD", _yn(st and st.opening_seed)),
        ("12", "session_actions", "student_types.continuation_seed / closing_seed", "EDAD", _yn(st and (st.continuation_seed or st.closing_seed))),
        ("11", "interaction_state (vivo)", "app en tiempo real (turno/tiempo/señal)", "RUNTIME", "vacío (snapshot inicial)"),
    ]


async def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    async with AsyncSessionLocal() as db:
        sts = {s.slug: s for s in (await db.execute(select(StudentType))).scalars().all()}
        lvs = {l.code: l for l in (await db.execute(select(Level))).scalars().all()}
        app_config = {c.key: c.value for c in (await db.execute(select(AppConfig))).scalars().all()}
        topic_kid = (await db.execute(select(Topic).where(Topic.is_active.is_(True), Topic.audience == "kid").limit(1))).scalars().first()
        topic_adult = (await db.execute(select(Topic).where(Topic.is_active.is_(True), Topic.audience == "adult").limit(1))).scalars().first()

        index = ["# Smoke test del motor — 100% combinaciones edad × nivel\n",
                 "Una carpeta por nivel; dentro, un archivo por segmento (chicos y grandes). "
                 "Cada archivo: recorrido del circuito (fuente + estático/dependencia) + prompt generado. "
                 "Sin ejecución de IA.\n",
                 "| Nivel | mini | junior | tween | adult |", "|---|---|---|---|---|"]
        ok_count = 0
        total = 0
        for lvl in LEVELS:
            os.makedirs(os.path.join(OUT_DIR, lvl), exist_ok=True)
            row_status = {}
            for seg in SEGS:
                total += 1
                st, lv = sts.get(seg), lvs.get(lvl)
                aud = "kid" if seg in ("mini", "junior", "tween") else "adult"
                topic = topic_kid if aud == "kid" else topic_adult
                user = SimpleNamespace(nombre="Alex(ficticio)", target_language="en", base_language="es",
                                       cefr_level=lvl, age_group=seg)
                try:
                    prompt = compose_proto_prompt(user=user, topic=topic, student_type_data=_st(st) if st else None,
                                                  level_data=_lv(lv) if lv else None, app_config=app_config)
                    status = "OK"
                    ok_count += 1
                except MotorDataMissing as e:
                    prompt = f"[FALTA DATO — el motor no usa fallback]\n{e}"
                    status = "FALTA"
                row_status[seg] = status

                lines = [f"# Smoke · {seg.upper()} · {lvl}\n",
                         "## Entradas (los 3 datos del circuito)\n",
                         f"- **id_alumno:** ficticio · **edad:** {AGE.get(seg)} → **segmento `{seg}`** · **nivel:** `{lvl}`",
                         f"- **tópico (sequencer):** `{getattr(topic, 'title', '—')}`\n",
                         "## Recorrido — qué trajo de cada lado\n",
                         "| # | Paso (tag) | Fuente (tabla.columna) | Depende de | Estado |",
                         "|---|---|---|---|---|"]
                for n, tag, src, dep, stt in _recorrido(st, lv, topic):
                    lines.append(f"| {n} | `{tag}` | {src} | **{dep}** | {stt} |")
                lines += [f"\n## Prompt generado · estado: **{status}**\n", "```xml", prompt, "```\n"]
                with open(os.path.join(OUT_DIR, lvl, f"{seg}.md"), "w", encoding="utf-8") as f:
                    f.write("\n".join(lines))
            index.append(f"| **{lvl}** | {row_status['mini']} | {row_status['junior']} | {row_status['tween']} | {row_status['adult']} |")
            print(f"  [{lvl}] " + " ".join(f"{s}:{row_status[s]}" for s in SEGS))

        index.insert(2, f"\n**RESULTADO: {ok_count}/{total} OK** (combinaciones que arman prompt sin excepción).\n")
        with open(os.path.join(OUT_DIR, "README.md"), "w", encoding="utf-8") as f:
            f.write("\n".join(index))
    print(f"\nOK -> Motor-Learning/test-prompts/  ({ok_count}/{total} OK, 7 niveles × 4 segmentos)")


if __name__ == "__main__":
    asyncio.run(main())

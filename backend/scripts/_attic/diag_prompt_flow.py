"""Flow COMPLETO del prompt de una sesion: las 4 patas enteras + el prompt final
ENTERO + el transcript. Reconstruye llamando a la MISMA funcion que usa el motor
(`_load_session_context`), no adivina — re-ejecuta el armado deterministico.

Uso: heroku run "python scripts/diag_prompt_flow.py 574" -a hablah-api
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.user import User
from models.template import Session as S, Template, Topic
from models.methodology import MethodologyModule, TopicModuleContent
from services.gemini_live import _load_session_context


async def main() -> None:
    sid = int(sys.argv[1]) if len(sys.argv) > 1 else 0

    # 1) Reconstruir el prompt EXACTO (mismo codigo que el motor en vivo)
    ctx = await _load_session_context(sid)
    if not ctx:
        print(f"No se pudo cargar el contexto de la sesion {sid}")
        return
    prompt = ctx.get("super_prompt", "")

    # 2) Releer las patas para mostrarlas ENTERAS
    async with AsyncSessionLocal() as db:
        s = (await db.execute(select(S).where(S.id == sid))).scalar_one_or_none()
        u = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
        tp = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none() if s.topic_id else None
        tmpl = (await db.execute(select(Template).where(Template.id == s.template_id))).scalar_one_or_none() if s.template_id else None
        age = getattr(u, "age_group", None)
        is_kid = bool(age) or bool(getattr(u, "parent_user_id", None))
        grp = (age or "mini") if is_kid else "adult"
        level = u.cefr_level or "A0"
        mod = (await db.execute(select(MethodologyModule).where(
            MethodologyModule.student_type == grp, MethodologyModule.level == level,
        ).order_by(MethodologyModule.module_order))).scalars().first()
        cell = None
        if mod and tp:
            cell = (await db.execute(select(TopicModuleContent).where(
                TopicModuleContent.topic_id == tp.id, TopicModuleContent.module_id == mod.id,
            ))).scalar_one_or_none()

        print("=" * 72)
        print(f"FLOW COMPLETO — SESION #{sid}  ({s.status})  user={u.nombre} (id={u.id})")
        print("=" * 72)

        print("\n########## PATA 1 - TOPICO (que se habla) ##########")
        if tp:
            print(f"title: {tp.title!r}  slug: {tp.slug}")
            print(f"segmento: {getattr(tp,'segmento',None)} | audience: {getattr(tp,'audience',None)} | is_curriculum: {getattr(tp,'is_curriculum',None)}")
            print(f"pinned_vocabulary: {getattr(tp,'pinned_vocabulary',None)}")
            print(f"keywords: {getattr(tp,'keywords',None)}")
        else:
            print("(sin topico)")

        print("\n########## PATA 2 - RIEL / METODOLOGIA (nivel) ##########")
        if mod:
            print(f"modulo: {grp}/{level}  focus: {mod.focus_name}")
            print(f"ai_restraints:\n{mod.ai_restraints}")
            print(f"target_grammar: {mod.target_grammar}")
            print(f"evaluation_criteria: {mod.evaluation_criteria}")
        else:
            print(f"(sin methodology_module para {grp}/{level})")
        print(f"\njunction topico x modulo: {'EXISTE' if cell else 'NO EXISTE (cae a fallback)'}")
        if cell:
            print(f"  allowed_vocabulary: {cell.allowed_vocabulary}")
            print(f"  required_keywords: {cell.required_keywords}")
            print(f"  seed_prompt: {cell.seed_prompt}")

        print("\n########## PATA 3 - COACH / ENFOQUE (segmento) ##########")
        if tmpl:
            print(f"template: {tmpl.name} ({tmpl.slug})  segmento: {getattr(tmpl,'segmento',None)}  curriculum_mode: {getattr(tmpl,'curriculum_mode',None)}")
            print(f"pedagogy_preset: {getattr(tmpl,'pedagogy_preset',None)}")
            print(f"enfoque:\n{getattr(tmpl,'enfoque',None)}")
        else:
            print("(sin template)")

        print("\n########## PATA 4 - ALUMNO (personalizacion) ##########")
        print(f"nombre: {u.nombre}  cefr: {u.cefr_level}  age_group: {age}  is_kid: {is_kid}")
        print(f"curriculum_position: {getattr(u,'curriculum_position',None)}  kid_methodology_order: {getattr(u,'kid_methodology_order',None)}")
        print("(errores/correcciones: APAGADA a proposito para kids)")

        print("\n" + "=" * 72)
        print("PROMPT FINAL (entero - exactamente lo que recibio Gemini Live):")
        print("=" * 72)
        print(prompt)

        print("\n" + "=" * 72)
        print(f"TRANSCRIPT ({len(s.transcript or [])} turnos):")
        print("=" * 72)
        for i, t in enumerate(s.transcript or []):
            who = "HABI" if t.get("who") == "ai" else "NENE"
            print(f"  [{i:02d}] {who}: {(t.get('text') or '').strip()}")
        if isinstance(s.report, dict):
            print(f"\nREPORT score: {s.report.get('score')}  metrics: {s.metrics}")


if __name__ == "__main__":
    asyncio.run(main())

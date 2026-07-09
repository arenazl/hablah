"""Diagnóstico COMPLETO de una sesión por id: qué recibió el compositor.

Dumpea user (cefr/age/posición), template, tópico (+is_curriculum/pinned_vocab),
la etapa legacy, el riel (methodology_module) y la celda del junction que
aplicarían, y el transcript entero. Para SABER (no suponer) por qué una clase
salió incoherente. Read-only.

Uso: heroku run "python scripts/diag_session_full.py 537" -a hablah-api
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.user import User
from models.template import Session as S, Template, Topic
from models.methodology import MethodologyStage, MethodologyModule, TopicModuleContent


async def main() -> None:
    sid = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    async with AsyncSessionLocal() as db:
        s = (await db.execute(select(S).where(S.id == sid))).scalar_one_or_none()
        if not s:
            print(f"No existe la sesión {sid}")
            return
        u = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
        tp = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none() if s.topic_id else None
        tmpl = (await db.execute(select(Template).where(Template.id == s.template_id))).scalar_one_or_none() if s.template_id else None

        age = getattr(u, "age_group", None)
        is_kid = bool(age) or bool(getattr(u, "parent_user_id", None))
        print(f"== SESION {sid}  user={u.nombre} cefr={u.cefr_level} age_group={age} is_kid={is_kid}")
        print(f"   kid_methodology_order={getattr(u,'kid_methodology_order',None)} curriculum_position={getattr(u,'curriculum_position',None)}")
        print(f"   template={tmpl.name if tmpl else None} curriculum_mode={getattr(tmpl,'curriculum_mode',None) if tmpl else None}")
        print(f"\n-- TÓPICO ELEGIDO --")
        if tp:
            print(f"   title={tp.title!r} slug={tp.slug} audience={getattr(tp,'audience',None)} is_curriculum={getattr(tp,'is_curriculum',None)}")
            print(f"   pinned_vocabulary={getattr(tp,'pinned_vocabulary',None)}")
        else:
            print("   (sin tópico)")

        # Etapa legacy (lo que carga gemini_live por age+order)
        stage = None
        if is_kid:
            stage = (await db.execute(select(MethodologyStage).where(
                MethodologyStage.age_group == (age or "mini"),
                MethodologyStage.order_index == (getattr(u, "kid_methodology_order", 1) or 1),
            ))).scalars().first()
        print(f"\n-- ETAPA LEGACY (methodology_stage) --")
        print(f"   {stage.title if stage else None} vocab={stage.vocabulary if stage else None}")

        # Riel nuevo (methodology_module) por student_type+level
        grp2 = (age or "mini") if is_kid else "adult"
        mod = (await db.execute(select(MethodologyModule).where(
            MethodologyModule.student_type == grp2,
            MethodologyModule.level == (u.cefr_level or "A0"),
        ).order_by(MethodologyModule.module_order))).scalars().first()
        print(f"\n-- RIEL NUEVO (methodology_module {grp2}/{u.cefr_level}) --")
        print(f"   focus={mod.focus_name if mod else None}")
        print(f"   ai_restraints={(mod.ai_restraints[:200] if mod else None)}")

        # Junction tópico×módulo
        cell = None
        if mod and tp:
            cell = (await db.execute(select(TopicModuleContent).where(
                TopicModuleContent.topic_id == tp.id, TopicModuleContent.module_id == mod.id,
            ))).scalar_one_or_none()
        print(f"\n-- JUNCTION (topic_module_content) --")
        print(f"   {'EXISTE' if cell else 'NO EXISTE'}  allowed_vocabulary={cell.allowed_vocabulary if cell else '—'}")
        if not cell:
            print("   >>> SIN junction: el compositor cayó al fallback methodology_stage (vocab DESCONECTADO del tópico)")

        print(f"\n{'='*60}\nTRANSCRIPT ({len(s.transcript or [])} turnos):")
        for i, t in enumerate(s.transcript or []):
            who = "HABI" if t.get("who") == "ai" else "VOS"
            print(f"  [{i:02d}] {who}: {(t.get('text') or '').strip()}")


if __name__ == "__main__":
    asyncio.run(main())

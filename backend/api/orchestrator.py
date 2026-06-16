"""Orquestador del motor — resuelve una combinación y devuelve el prompt + estado.

GET /api/orchestrator/resolve?student_type=&coach_id=&level=&topic_id=
  → resuelve las filas de la BD, arma el prompt con compose_proto_prompt, y devuelve
    los 9 pasos con su fuente (tabla/campo) y si están CARGADOS o caen a fallback.
Es lo que alimenta el panel "cargado vs falta" + el preview del prompt en vivo.
"""
from types import SimpleNamespace
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from services.composer_proto import compose_proto_prompt
from models.methodology import StudentType, Coach, Level, MethodologyModule
from models.template import Topic
from models.user import User

router = APIRouter()


@router.get("/resolve")
async def resolve(
    student_type: str = Query("mini"),
    level: str = Query("A0"),
    coach_id: Optional[int] = Query(None),
    topic_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    st = (await db.execute(select(StudentType).where(StudentType.slug == student_type))).scalar_one_or_none()
    coach = (await db.execute(select(Coach).where(Coach.id == coach_id))).scalar_one_or_none() if coach_id else None
    lv = (await db.execute(select(Level).where(Level.code == level))).scalar_one_or_none()
    riel = (await db.execute(select(MethodologyModule).where(
        MethodologyModule.student_type == student_type, MethodologyModule.level == level
    ).order_by(MethodologyModule.module_order))).scalars().first()
    topic = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalar_one_or_none() if topic_id else None

    # ── Armar los dicts para el composer ──
    st_data = None
    if st:
        st_data = {
            "slug": st.slug,
            "tutor_mascot": st.tutor_mascot, "tutor_identity": st.tutor_identity,
            "tutor_tonal_rules": st.tutor_tonal_rules, "session_focus": st.session_focus,
        }
        if coach:  # el coach elegido manda en el bloque 2 (persona)
            st_data["tutor_mascot"] = coach.name
            st_data["tutor_identity"] = coach.identity
            st_data["tutor_tonal_rules"] = coach.personality

    mm = {"ai_restraints": riel.ai_restraints} if (riel and riel.ai_restraints) else None
    tags = (getattr(topic, "generated_vocab", None) or getattr(topic, "keywords", None) or []) if topic else []
    tc = {"allowed_vocabulary": tags, "required_keywords": [], "story_spine": None, "start_trigger": None} if topic else None

    user = SimpleNamespace(
        nombre="Alumno", target_language="en", base_language="es",
        cefr_level=level or "A0", age_group=student_type or "mini",
    )
    prompt = compose_proto_prompt(
        user=user, topic=topic, methodology_module=mm, topic_content=tc, student_type_data=st_data,
    )

    # ── Estado por bloque: cargado (dato real) vs fallback ──
    def blk(n, name, source, loaded, preview=""):
        return {"n": n, "name": name, "source": source, "loaded": bool(loaded), "preview": (preview or "")[:140]}

    blocks = [
        blk(1, "runtime_context", "—", True, "fecha + idiomas"),
        blk(2, "tutor_profile", "Coach" if coach else "student_types.tutor_*",
            bool(coach) or bool(st and st.tutor_mascot), (coach.name if coach else (st.tutor_mascot if st else "")) or ""),
        blk(3, "pedagogical_rules", "student_types.session_focus", bool(st and st.session_focus), (st.session_focus if st else "") or ""),
        blk(4, "gamification_focus", "student_types (slug)", bool(st), st.slug if st else ""),
        blk(5, "student_profile", "users", True, f"{student_type} / {level}"),
        blk(6, "behavioral_guards (riel)", "methodology_modules.ai_restraints", bool(riel and riel.ai_restraints), (riel.ai_restraints if riel else "") or ""),
        blk(6.1, "language_rule", "levels.language_rule", bool(lv and getattr(lv, "language_rule", None)), (getattr(lv, "language_rule", "") if lv else "") or ""),
        blk(7, "current_lesson_vocabulary", "topics.generated_vocab", bool(tags), ", ".join(tags[:6]) if tags else ""),
        blk(8, "story_timeline", "topic_module_content.story_spine", False, "(generado/fallback)"),
        blk(9, "start_execution_command", "topic_module_content.start_trigger", False, "(generado/fallback)"),
    ]
    loaded = sum(1 for b in blocks if b["loaded"])
    return {
        "prompt": prompt,
        "blocks": blocks,
        "loaded_count": loaded,
        "total": len(blocks),
        "resolved": {
            "student_type": st.slug if st else None,
            "coach": coach.name if coach else None,
            "level": lv.code if lv else level,
            "level_name": lv.friendly_name if lv else None,
            "topic": topic.title if topic else None,
        },
    }

"""Proxy WebSocket Habláh ↔ motor de voz activo.

DEPRECATED como nombre — ya no es solo Gemini. El archivo se mantiene por
compatibilidad con imports existentes. Toda la lógica delega a
services.voice_engine.get_engine() que decide qué motor usar según ENV.

Para cambiar de proveedor: editar VOICE_ENGINE en .env (gemini_live por default).
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import WebSocket

from core.config import settings
from core.database import AsyncSessionLocal
from core.security import decode_token
from sqlalchemy import select
from models.template import Session as SessionModel, Template, Topic, template_voice_for_lang
from models.user import User
from services.super_prompt import build_super_prompt
from services.voice_engine import VoiceEngineContext, get_engine

log = logging.getLogger(__name__)


# Re-export para compatibilidad con smoke_test.py
from services.voice_engines.gemini_live_engine import LIVE_API_URL, LIVE_MODEL  # noqa: F401


async def _load_session_context(session_id: int) -> Optional[dict]:
    async with AsyncSessionLocal() as db:
        s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
        if not s:
            return None
        user = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one_or_none()
        template = None
        topic = None
        if s.template_id:
            template = (await db.execute(select(Template).where(Template.id == s.template_id))).scalar_one_or_none()
        if s.topic_id:
            topic = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none()
        if not user:
            return None
        admin_directives: list[str] = []
        if template:
            from services.admin_feedback import load_active_directives
            admin_directives = await load_active_directives(template.id, db)
        _ag = getattr(user, "age_group", None)
        is_kid = _ag in ("mini", "junior", "tween") or bool(getattr(user, "parent_user_id", None))

        # Calcular qué keywords del topic ya se usaron en las ultimas 5 sesiones
        # del MISMO user+topic. Esto evita que el coach siempre arranque con el
        # mismo dato (ej. "Last of Us" en topic videojuegos).
        recently_used_keywords: set[str] = set()
        if topic and topic.keywords and s.user_id and s.topic_id:
            recent_sessions = (await db.execute(
                select(SessionModel.transcript)
                .where(SessionModel.user_id == s.user_id)
                .where(SessionModel.topic_id == s.topic_id)
                .where(SessionModel.id != s.id)
                .order_by(SessionModel.id.desc())
                .limit(5)
            )).all()
            kw_lower = {k.lower(): k for k in topic.keywords}
            for (tr,) in recent_sessions:
                if not tr:
                    continue
                ai_text = " ".join(
                    (line.get("text") or "") for line in tr
                    if isinstance(line, dict) and line.get("who") == "ai"
                ).lower()
                for kl, kw in kw_lower.items():
                    if kl in ai_text:
                        recently_used_keywords.add(kw)

        # Objetivo pedagogico de ESTA sesion (invisible al alumno).
        # Pickeamos UN objetivo del catalogo del nivel del alumno, excluyendo
        # los que se trabajaron en las ultimas 5 sesiones (cualquier topic).
        from services.learning_objectives import pick_objective
        from sqlalchemy import update
        recent_objective_codes: set[str] = set()
        if s.user_id:
            recent_codes_rows = (await db.execute(
                select(SessionModel.learning_objective_code)
                .where(SessionModel.user_id == s.user_id)
                .where(SessionModel.id != s.id)
                .where(SessionModel.learning_objective_code.isnot(None))
                .order_by(SessionModel.id.desc())
                .limit(5)
            )).all()
            recent_objective_codes = {r[0] for r in recent_codes_rows if r[0]}
        learning_objective = pick_objective(
            user.cefr_level or "B1",
            recently_used_codes=recent_objective_codes,
        )
        if learning_objective:
            await db.execute(
                update(SessionModel)
                .where(SessionModel.id == s.id)
                .values(learning_objective_code=learning_objective["code"])
            )
            await db.commit()

        # Etapa del currículo (metodología) donde está el nene: el coach enseña
        # SOLO ese vocabulario + estructura (el QUÉ). El prompt define el CÓMO.
        methodology_stage = None
        if is_kid:
            from models.methodology import MethodologyStage
            grp = getattr(user, "age_group", None) or "mini"
            order = getattr(user, "kid_methodology_order", 1) or 1
            st = (await db.execute(
                select(MethodologyStage).where(
                    MethodologyStage.age_group == grp,
                    MethodologyStage.order_index == order,
                    MethodologyStage.active.is_(True),
                )
            )).scalar_one_or_none()
            if st:
                methodology_stage = {
                    "title": st.title,
                    "vocabulary": st.vocabulary or [],
                    "target_structure": st.target_structure,
                    "target_structure_es": st.target_structure_es,
                    "mastery_criteria": st.mastery_criteria,
                }

        # Motor Pedagógico Adaptativo: cargar el RIEL del nivel (methodology_module)
        # + la celda del junction (topic_content) para el tópico. TODO en el setup
        # (nunca por turno). Defensivo: si las tablas aún no migraron, cae a None y
        # el compositor usa el stage/legacy.
        methodology_module = None
        topic_content = None
        student_type_data = None
        try:
            from models.methodology import MethodologyModule, TopicModuleContent, StudentType
            grp2 = (getattr(user, "age_group", None) or "mini") if is_kid else "adult"
            level = user.cefr_level or "A0"
            mod = (await db.execute(
                select(MethodologyModule).where(
                    MethodologyModule.student_type == grp2,
                    MethodologyModule.level == level,
                    MethodologyModule.active.is_(True),
                ).order_by(MethodologyModule.module_order)
            )).scalars().first()
            if mod:
                methodology_module = {
                    "focus_name": mod.focus_name,
                    "ai_restraints": mod.ai_restraints,
                    "target_grammar": mod.target_grammar,
                    "evaluation_criteria": mod.evaluation_criteria,
                }
                if topic is not None:
                    cell = (await db.execute(
                        select(TopicModuleContent).where(
                            TopicModuleContent.topic_id == topic.id,
                            TopicModuleContent.module_id == mod.id,
                            TopicModuleContent.active.is_(True),
                        )
                    )).scalar_one_or_none()
                    if cell:
                        topic_content = {
                            "seed_prompt": cell.seed_prompt,
                            "required_keywords": cell.required_keywords or [],
                            "allowed_vocabulary": cell.allowed_vocabulary or [],
                            "story_spine": cell.story_spine,
                            "start_trigger": cell.start_trigger,
                        }
            # Persona del tutor según el segmento del alumno (age_group → student_type)
            st = (await db.execute(
                select(StudentType).where(StudentType.slug == grp2, StudentType.active.is_(True))
            )).scalar_one_or_none()
            if st:
                student_type_data = {
                    "slug": st.slug,
                    "name": st.name,
                    "tutor_mascot": st.tutor_mascot,
                    "tutor_identity": st.tutor_identity,
                    "tutor_tonal_rules": st.tutor_tonal_rules,
                    "session_focus": st.session_focus,
                }
        except Exception as e:
            log.warning(f"motor pedagógico: módulo/junction no disponible ({e}); fallback a stage/legacy")

        super_prompt = build_super_prompt(
            user=user, template=template, topic=topic,
            admin_directives=admin_directives,
            recently_used_keywords=recently_used_keywords,
            learning_objective=learning_objective,
            methodology_stage=methodology_stage,
            methodology_module=methodology_module,
            topic_content=topic_content,
            student_type_data=student_type_data,
        )

        # ─── OBSERVABILIDAD TOTAL: el circuito entero del prompt ───
        # Cada clase loguea la cadena de relaciones resuelta + el prompt final.
        # No es un ABM: es un prompt dinámico desde contextos dinámicos. Para
        # SABER (no suponer) cómo se armó la cadena y qué recibió el coach.
        try:
            import json as _json
            from services.super_prompt import _resolve_curriculum_mode, _composer_enabled
            _cefr = user.cefr_level or "B1"
            _mode = _resolve_curriculum_mode(template, is_kid, _cefr)
            _circuit = {
                "session_id": s.id,
                "user": {
                    "nombre": user.nombre, "cefr": _cefr, "age_group": getattr(user, "age_group", None),
                    "is_kid": is_kid, "kid_methodology_order": getattr(user, "kid_methodology_order", None),
                    "curriculum_position": getattr(user, "curriculum_position", None),
                },
                "template": {"name": getattr(template, "name", None), "curriculum_mode": getattr(template, "curriculum_mode", None)},
                "resolved_mode": _mode, "composer_on": _composer_enabled(_mode),
                "topic": ({
                    "id": topic.id, "title": topic.title, "slug": topic.slug,
                    "audience": getattr(topic, "audience", None), "is_curriculum": getattr(topic, "is_curriculum", None),
                    "pinned_vocab_n": len(getattr(topic, "pinned_vocabulary", None) or []),
                } if topic else None),
                "methodology_module": (methodology_module and {"focus": methodology_module.get("focus_name")}),
                "junction": ("FOUND " + str(topic_content.get("allowed_vocabulary"))
                             if topic_content else "MISSING -> fallback a methodology_stage (vocab DESCONECTADO del tópico)"),
                "stage_fallback": (methodology_stage and {
                    "title": methodology_stage.get("title"),
                    "vocab": [v.get("en") for v in (methodology_stage.get("vocabulary") or [])],
                }),
                "prompt_len": len(super_prompt),
            }
            log.info("PROMPT_CIRCUIT " + _json.dumps(_circuit, ensure_ascii=False))
            log.info("PROMPT_FINAL session=%s >>>\n%s\n<<< PROMPT_FINAL_END", s.id, super_prompt)

            # Persistir el circuito + prompt en la DB (durable, no solo stdout
            # efimero de Heroku): 1 UPDATE en el setup, fuera del loop en vivo
            # -> cero latencia agregada a la charla.
            _circuit["ai_restraints"] = (methodology_module or {}).get("ai_restraints")
            _circuit["enfoque"] = getattr(template, "enfoque", None)
            _circuit["learning_objective"] = (learning_objective or {}).get("code") if learning_objective else None
            await db.execute(
                update(SessionModel)
                .where(SessionModel.id == s.id)
                .values(prompt_circuit=_circuit, prompt_final=super_prompt)
            )
            await db.commit()
        except Exception as e:
            log.warning(f"PROMPT_CIRCUIT persist falló: {e}")

        return {
            "session_id": s.id,
            "user_id": user.id,
            "user_name": user.nombre,
            "is_kid": is_kid,
            "template_id": template.id if template else None,
            "super_prompt": super_prompt,
            "voice_id": template_voice_for_lang(template, user.target_language, user=user) if template else None,
            "language": user.target_language or "en",
            "target_language": user.target_language or "en",
            "silence_tolerance_ms": getattr(template, "silence_tolerance_ms", 800) if template else 800,
            "interruption_allowed": getattr(template, "interruption_allowed", False) if template else False,
        }


async def voice_proxy(ws: WebSocket, session_id: int, token: str, voice_name: str | None = None) -> None:
    # Validar JWT
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except Exception:
        await ws.close(code=4001)
        return

    ctx_dict = await _load_session_context(session_id)
    if not ctx_dict or ctx_dict["user_id"] != user_id:
        await ws.close(code=4004)
        return

    # Voz prebuilt elegida por el chico (Nivel 1 personajes). Whitelist defensiva:
    # voz desconocida -> None -> el engine cae a Kore (default).
    _VALID_VOICES = {"Puck", "Charon", "Kore", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"}
    safe_voice = voice_name if voice_name in _VALID_VOICES else None

    ctx = VoiceEngineContext(
        session_id=ctx_dict["session_id"],
        user_id=ctx_dict["user_id"],
        user_name=ctx_dict.get("user_name"),
        is_kid=ctx_dict.get("is_kid", False),
        template_id=ctx_dict.get("template_id"),
        super_prompt=ctx_dict["super_prompt"],
        voice_id=ctx_dict["voice_id"],
        voice_name=safe_voice,
        language=ctx_dict["language"],
        target_language=ctx_dict["target_language"],
        silence_tolerance_ms=ctx_dict.get("silence_tolerance_ms", 800),
        interruption_allowed=ctx_dict.get("interruption_allowed", False),
    )

    engine_name = os.environ.get("VOICE_ENGINE", "gemini_live")
    log.info(f"voice_proxy: session={session_id} engine={engine_name}")
    engine = get_engine(engine_name)

    # Acumular líneas para persistir
    transcript: list[dict] = []
    async for line in engine.run(ws, ctx):
        transcript.append(line)

    if transcript:
        async with AsyncSessionLocal() as db:
            s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
            if s:
                # Mergear con existente sin duplicar (caso reconnect del WS):
                # si el primer turn del nuevo transcript es identico a algun turn
                # ya persistido del coach (saludo de re-arranque), el nuevo es
                # una corrida nueva del engine sobre la misma session_id ->
                # PISAR el existente. Sino, append normal.
                existing = s.transcript or []
                if existing and transcript:
                    first_new = (transcript[0].get("text") or "").strip()
                    is_reconnect = any(
                        (line.get("who") == "ai" and (line.get("text") or "").strip() == first_new)
                        for line in existing
                    )
                    if is_reconnect:
                        s.transcript = transcript
                    else:
                        s.transcript = existing + transcript
                else:
                    s.transcript = existing + transcript
                await db.commit()

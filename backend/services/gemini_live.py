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

        # Motor de 9 pasos = camino ÚNICO (kids y adultos). Cargamos el EJE EDAD como
        # dato: student_types (tutor + pedagogía + foco + forma + arranque). Ya NO hay
        # tablas-cruce legacy (methodology_module/stage/topic_module_content: se borraron);
        # el CÓMO sale de este catálogo, el QUÉ de levels, y el léxico del tópico.
        student_type_data = None
        try:
            from models.methodology import StudentType
            grp2 = (getattr(user, "age_group", None) or "mini") if is_kid else "adult"
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
                    "pedagogy": getattr(st, "pedagogy", None),      # eje edad — el CÓMO (bloque 3)
                    "form_rules": getattr(st, "form_rules", None),  # eje edad — la forma (bloque 6)
                    "opening_seed": getattr(st, "opening_seed", None),
                    "continuation_seed": getattr(st, "continuation_seed", None),
                    "closing_seed": getattr(st, "closing_seed", None),
                }
        except Exception as e:
            log.warning(f"motor: student_type_data no disponible ({e})")

        # Idioma por nivel (el "ahora vos") + reglas de salida/seguridad, como dato.
        level_data = None
        app_config = None
        try:
            from models.methodology import Level
            from models.config import AppConfig
            lv = (await db.execute(
                select(Level).where(Level.code == (user.cefr_level or "A0"))
            )).scalar_one_or_none()
            if lv:
                level_data = {
                    "language_rule": getattr(lv, "language_rule", None),
                    "curriculum_grammar": getattr(lv, "curriculum_grammar", None),     # eje nivel — el QUÉ (bloque 6)
                    "expected_production": getattr(lv, "expected_production", None),
                    "duration_base_minutes": getattr(lv, "duration_base_minutes", None),
                    "vocab_depth": getattr(lv, "vocab_depth", None),                     # Sector 2 — recorte por nivel
                }
            app_config = {c.key: c.value for c in (await db.execute(select(AppConfig))).scalars().all()}
        except Exception as e:
            log.warning(f"motor pedagógico: level_data/app_config no disponible ({e})")

        # Memoria del alumno (post-clase) — el composer la inyecta en el bloque 5b si hay datos.
        learner_state = None
        try:
            from services.memory_analyzer import load_learner_state
            learner_state = await load_learner_state(db, user.id)
        except Exception as e:
            log.warning(f"learner_state no disponible ({e})")

        # MOTOR v2 — el catálogo de reglas maneja la clase: dado (banda, nivel, tópico)
        # SELECCIONA las reglas del catálogo (no texto libre). Detrás de flag RULES_MOTOR
        # (default OFF) hasta validar; con OFF sigue el composer viejo, intacto.
        # MOTOR_V3 KIDS — switch a motor nuevo (flag MOTOR_V3_KIDS, default OFF). SOLO kids.
        # LABORATORIO: SIN fallback. Si el motor nuevo no puede armar la clase, FALLA FUERTE
        # y queda logueada (banda/nivel/tópico/error) = bug de orquestación a corregir en el
        # DATO, no a tapar con el motor viejo. Adultos y flag OFF -> motor de siempre, intacto.
        if is_kid and os.getenv("MOTOR_V3_KIDS", "0") == "1":
            from services import motor_engine as _mv3
            _band = {"mini": "early_child", "junior": "child", "tween": "teen", "teen": "teen"}.get(getattr(user, "age_group", None))
            _lvl = user.cefr_level or "A1"
            _ptid = topic.id if topic else None
            try:
                _res = await _mv3.resolve_kid(_band, _lvl, _ptid, None)
            except Exception as e:
                log.error("MOTOR_V3 KIDS FALLÓ band=%s lvl=%s prod_topic=%s err=%s -> corregir orquestación",
                          _band, _lvl, _ptid, e)
                raise
            if not _res or not _res.get("prompt"):
                log.error("MOTOR_V3 KIDS sin prompt band=%s lvl=%s prod_topic=%s (tópico no migrado/vacío) -> corregir orquestación",
                          _band, _lvl, _ptid)
                raise RuntimeError(f"motor_v3 kids no resolvió: band={_band} lvl={_lvl} prod_topic={_ptid}")
            super_prompt = _res["prompt"]
            log.info("PROMPT via MOTOR_V3 (kids) band=%s lvl=%s v3_topic=%s", _band, _lvl, _res.get("v3_topic_id"))
        elif os.getenv("RULES_MOTOR", "0") == "1":
            from services.composer_rules import compose_from_catalog
            _res = await compose_from_catalog(
                db, segment=(getattr(user, "age_group", None) or "adult"),
                nivel=(user.cefr_level or "A1"), topic=topic,
                user_name=user.nombre, learner_state=learner_state,
            )
            super_prompt = _res["prompt"]
            log.info("PROMPT via MOTOR v2 (catálogo) — slots: %s", {k: len(v) for k, v in _res["slots"].items() if v})
        else:
            super_prompt = build_super_prompt(
                user=user, template=template, topic=topic,
                recently_used_keywords=recently_used_keywords,
                learning_objective=learning_objective,
                student_type_data=student_type_data,
                level_data=level_data,
                app_config=app_config,
                learner_state=learner_state,
            )

        # ─── OBSERVABILIDAD TOTAL: el circuito entero del prompt ───
        # Cada clase loguea la cadena de relaciones resuelta + el prompt final.
        # No es un ABM: es un prompt dinámico desde contextos dinámicos. Para
        # SABER (no suponer) cómo se armó la cadena y qué recibió el coach.
        try:
            import json as _json
            _cefr = user.cefr_level or "B1"
            _circuit = {
                "session_id": s.id,
                "user": {
                    "nombre": user.nombre, "cefr": _cefr, "age_group": getattr(user, "age_group", None),
                    "is_kid": is_kid, "kid_methodology_order": getattr(user, "kid_methodology_order", None),
                    "curriculum_position": getattr(user, "curriculum_position", None),
                },
                "template": {"name": getattr(template, "name", None)},
                "engine": "motor_9pasos",
                "topic": ({
                    "id": topic.id, "title": topic.title, "slug": topic.slug,
                    "audience": getattr(topic, "audience", None), "is_curriculum": getattr(topic, "is_curriculum", None),
                    "pinned_vocab_n": len(getattr(topic, "pinned_vocabulary", None) or []),
                } if topic else None),
                "student_type": (student_type_data and student_type_data.get("slug")),
                "level_data_loaded": bool(level_data),
                "prompt_len": len(super_prompt),
            }
            log.info("PROMPT_CIRCUIT " + _json.dumps(_circuit, ensure_ascii=False))
            log.info("PROMPT_FINAL session=%s >>>\n%s\n<<< PROMPT_FINAL_END", s.id, super_prompt)

            # Persistir el circuito + prompt en la DB (durable, no solo stdout
            # efimero de Heroku): 1 UPDATE en el setup, fuera del loop en vivo
            # -> cero latencia agregada a la charla.
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
                # Instrumentación SRS: snapshot per-turno (raw_session_data) con contadores
                # por ítem objetivo. Va acá (lado de CONSUMO del WS, no en el loop de audio)
                # → cero latencia agregada a la charla. Lo lee el post-clase (Mitad A).
                try:
                    from services.memory_analyzer import _target_items, build_raw_session_data
                    _topic = None
                    if s.topic_id:
                        _topic = (await db.execute(select(Topic).where(Topic.id == s.topic_id))).scalar_one_or_none()
                    s.raw_session_data = build_raw_session_data(s.transcript, _target_items(_topic))
                except Exception as e:
                    log.warning(f"raw_session_data no persistido (session {session_id}): {e}")
                await db.commit()

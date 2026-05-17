"""Análisis post-sesión: toma la transcripción completa + config del template
y genera un reporte estructurado con Gemini Pro.

v3: el reporte respeta los flags del template:
  - report_include_summary
  - report_include_connectors
  - report_include_vocab_suggestions
  - report_include_pronunciation
  - report_include_next_session_tip
  - max_feedback_items
  - praise_count
  - correction_focus (lista de qué evaluar: grammar, vocab, pronunciation, fluency)
"""
from __future__ import annotations

import json
import logging
from typing import Optional

import httpx

from core.config import settings
from core.database import AsyncSessionLocal
from sqlalchemy import select
from models.template import Session as SessionModel, Topic, ErrorLog, Template
from models.user import User

log = logging.getLogger(__name__)


def _build_analyzer_prompt(
    *,
    user: User,
    template: Optional[Template],
    topic: Optional[Topic],
) -> str:
    cefr = user.cefr_level or "B1"
    target = user.target_language or "en"
    target_name = {"en": "English", "pt": "Portuguese", "it": "Italian"}.get(target, target)

    # Defaults para legacy templates
    max_fb = getattr(template, "max_feedback_items", 3) if template else 3
    praise_count = getattr(template, "praise_count", 1) if template else 1
    include_summary = getattr(template, "report_include_summary", True) if template else True
    include_connectors = getattr(template, "report_include_connectors", True) if template else True
    include_vocab = getattr(template, "report_include_vocab_suggestions", True) if template else True
    include_pron = getattr(template, "report_include_pronunciation", False) if template else False
    include_next_tip = getattr(template, "report_include_next_session_tip", True) if template else True
    correction_focus = getattr(template, "correction_focus", ["grammar", "vocab", "fluency"]) if template else ["grammar", "vocab", "fluency"]
    error_threshold = getattr(template, "error_threshold", "repeated") if template else "repeated"

    focus_str = ", ".join(correction_focus)
    threshold_desc = {
        "only_major":  "solo errores graves que cambian el sentido",
        "repeated":    "errores que se repitieron 2+ veces o son patrones del nivel",
        "all":         "TODOS los errores detectables",
    }.get(error_threshold, "errores repetidos")

    # Construir el JSON schema esperado dinámicamente
    json_keys = [
        '"score": 0..100  // puntaje global de la charla',
        f'"praise": [string]  // {praise_count} elogios concretos sobre cosas que el alumno hizo bien',
        f'"feedback": [object]  // max {max_fb} errores, cada uno con: type, label, snippet_wrong, snippet_correct, why',
        '"metrics": {"words_spoken": int, "wpm": int, "keywords_hit": int, "keywords_total": int}',
    ]
    if include_summary:
        json_keys.append('"summary": string  // resumen narrativo en español rioplatense de 2-3 oraciones de la charla')
        json_keys.append(f'"summary_en": string  // mismo resumen pero en {target_name}, tono conversacional (para reproduccion TTS)')
    if include_connectors:
        json_keys.append('"connector_suggestions": [string]  // 3-5 conectores en inglés que enriquecerían el habla del alumno (ej: "however", "in fact", "as a result")')
    if include_vocab:
        json_keys.append('"vocab_suggestions": [{"word": string, "context": string, "why": string}]  // 3-5 palabras/frases del nivel +1 que el alumno podría incorporar')
    if include_pron:
        json_keys.append('"pronunciation_notes": [{"word": string, "issue": string, "tip": string}]  // 0-3 palabras que sonaron raras (basate en cómo Gemini Live las transcribió)')
    if include_next_tip:
        json_keys.append('"next_session_tip": string  // UN consejo específico para la próxima sesión en 1 oración, en español rioplatense')

    json_schema = "{\n  " + ",\n  ".join(json_keys) + "\n}"

    prompt = f"""Sos un evaluador pedagógico experto para Habláh (plataforma de aprendizaje de idiomas por conversación).

DATOS DEL ALUMNO:
- Nombre: {user.nombre}
- Nivel CEFR: {cefr}
- Idioma objetivo: {target_name}
- Tópico de la sesión: {topic.title if topic else 'libre'}

PARÁMETROS DEL TEMPLATE (no negociables):
- Foco de evaluación: {focus_str}
- Umbral de errores: {threshold_desc}
- Máximo de items en feedback: {max_fb}
- Elogios a generar: {praise_count}

VAS A RECIBIR una transcripción ALTERNADA entre AI (tutor) y USER (alumno).
Tu trabajo: analizar SOLO los turnos del USER, NO los del tutor.

CRITERIOS:
- praise: cosas CONCRETAS que el alumno hizo bien (con la frase exacta que dijo, no genéricos).
- feedback: errores DENTRO del foco {focus_str}. Si está {error_threshold}, aplicá ese umbral.
  Cada item: {{ "type": "grammar"|"vocab"|"pronunciation"|"fluency", "label": "Nombre del error en español (max 50 chars)", "snippet_wrong": "frase exacta del alumno", "snippet_correct": "versión correcta", "why": "explicación en español rioplatense en 1 oración casual" }}
- score: 0..100. Pondera fluidez, precisión, riqueza léxica, uso del foco del template.
- Si el alumno habló muy poco (<30 palabras), score <60 y praise mínimo.

DEVOLVÉ UN JSON ESTRICTO con esta estructura:

{json_schema}

CRÍTICO:
- Todos los textos en español rioplatense ("vos", "che", casual), EXCEPTO snippet_wrong/snippet_correct/word/context que van en {target_name}.
- Si no podés llenar un campo (ej: no hay errores de pronunciación que reportar), devolvé array vacío [], NO inventes.
- Sé específico, no genérico. "Usaste 'rewatchable' perfecto" > "Hablaste bien".
"""
    return prompt


async def _gemini_complete(prompt: str, payload_text: str) -> dict:
    key = settings.GEMINI_API_KEY
    model = settings.GEMINI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    body = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt + "\n\n--- TRANSCRIPCIÓN ---\n" + payload_text}]}
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2500,
            "responseMimeType": "application/json",
        },
    }
    async with httpx.AsyncClient(timeout=60) as cli:
        r = await cli.post(url, json=body)
        r.raise_for_status()
        data = r.json()
    text = ""
    for c in data.get("candidates", []):
        for p in (c.get("content") or {}).get("parts", []):
            text += p.get("text", "")
    return json.loads(text)


async def analyze_session(session_id: int) -> Optional[dict]:
    async with AsyncSessionLocal() as db:
        s = (await db.execute(select(SessionModel).where(SessionModel.id == session_id))).scalar_one_or_none()
        if not s:
            return None
        if not s.transcript:
            log.info("session %s sin transcripción, skip", session_id)
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

        # Render plano de la transcripción
        lines = []
        for line in s.transcript:
            who = (line.get("who") or "?").upper()
            text = line.get("text", "")
            lines.append(f"[{who}] {text}")
        transcript_text = "\n".join(lines)

        prompt = _build_analyzer_prompt(user=user, template=template, topic=topic)

        try:
            result = await _gemini_complete(prompt, transcript_text)
        except Exception as e:
            log.error("Gemini analyzer falló session %s: %s", session_id, e)
            return None

        # Persistir reporte + métricas + score
        s.report = result
        s.metrics = result.get("metrics", {})
        s.score = result.get("score")
        s.status = "analyzed"

        # Guardar errores recurrentes para modo insistente
        for fb in result.get("feedback") or []:
            err = ErrorLog(
                user_id=s.user_id,
                session_id=s.id,
                kind=fb.get("type", "grammar"),
                error_key=fb.get("label", "unknown").lower().replace(" ", "_")[:80],
                label=fb.get("label", ""),
                snippet_wrong=fb.get("snippet_wrong"),
                snippet_correct=fb.get("snippet_correct"),
            )
            db.add(err)

        # Actualizar streak del user
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        if user.last_session_at:
            last = user.last_session_at
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            hours = (now - last).total_seconds() / 3600
            if hours < 36:
                user.streak_days = (user.streak_days or 0) + 1
            else:
                user.streak_days = 1
        else:
            user.streak_days = 1
        user.streak_best = max(user.streak_best or 0, user.streak_days)
        user.last_session_at = now

        await db.commit()
        return result


async def analyze_session_safe(session_id: int) -> None:
    try:
        await analyze_session(session_id)
    except Exception as e:
        log.exception("analyze_session_safe falló: %s", e)

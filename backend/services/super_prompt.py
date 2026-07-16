"""Super-prompt builder — fachada pública que delega en el motor de 9 pasos.

El monolito legacy (override rules de kids/adultos, PEDAGOGY_PRESETS, _template_block,
_build_super_prompt_body, compose_session_prompt, runtime addon, CEFR_GUIDANCE) se
ELIMINÓ el 2026-06-17: el motor (services/composer_proto.py → compose_proto_prompt) es el
camino ÚNICO para TODOS los segmentos y niveles. `build_super_prompt` queda como fachada
estable que usan gemini_live / sessions / voice / admin_feedback; acepta kwargs sueltos y
usa SÓLO los del motor (student_type_data + level_data + topic + app_config + memoria).

NOTA (deuda conocida): los callers que NO pasan student_type_data/level_data —
admin_feedback (diffing de directivas) y voice.py (salas de voz) — dependían del legacy y
ahora reciben MotorDataMissing. No los usa el flujo de clase normal (kids/adultos via
gemini_live, que sí pasa todos los datos del motor); quedan para migrar aparte.
"""
from __future__ import annotations

from services.orchestration_resolver import compose_from_template


def build_super_prompt(**kwargs) -> str:
    """Arma el systemInstruction de la clase resolviendo el TEMPLATE de orquestación (dato) contra
    los catálogos (EDAD + NIVEL + cruce age_level_matrix + tópico + memoria). Reingeniería
    placeholders (F3): la FORMA del prompt vive en orchestration_templates, no hardcodeada en Python."""
    return compose_from_template(
        user=kwargs.get("user"),
        topic=kwargs.get("topic"),
        topic_content=kwargs.get("topic_content"),
        student_type_data=kwargs.get("student_type_data"),
        level_data=kwargs.get("level_data"),
        app_config=kwargs.get("app_config"),
        learner_state=kwargs.get("learner_state"),
        interaction_state=kwargs.get("interaction_state"),
    )

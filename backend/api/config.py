"""Reglas de salida / seguridad — config de runtime editable (doc 11 §1.5).

CRUD mínimo (listar + editar valor) de app_config. Solo role='admin'.
La capa de runtime configurable sin tocar código.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.user import User

router = APIRouter()


CONFIG_METADATA = {
    "voice_output_rule": {"kind": "text", "section": "Reglas de salida", "label": "Instrucción de voz para TTS"},
    "asr_low_confidence_retry": {"kind": "bool", "section": "Reglas de salida", "label": "Reintentar reconocimiento ante baja confianza"},
    "kid_safety_guard": {"kind": "bool", "section": "Reglas de salida", "label": "Habilitar filtro de seguridad infantil"},
    "adult_stay_on_frame": {"kind": "bool", "section": "Reglas de salida", "label": "Mantener al alumno en el marco de la clase"},
    "closing_no_new_content": {"kind": "bool", "section": "Reglas de salida", "label": "No abrir nuevos temas en el cierre"},
    "universal_conversation_rules": {"kind": "text", "section": "Reglas de conversación", "label": "Reglas universales de conversación (16 pautas)"},
    "lesson_approaches": {"kind": "text", "section": "Reglas de conversación", "label": "Enfoques de lecciones autorizados (JSON)"},
    "vad_silence_duration_ms_kid": {"kind": "int", "section": "Voz y Silencio", "label": "Kids: Duración del silencio (VAD) en ms"},
    "vad_prefix_padding_ms_kid": {"kind": "int", "section": "Voz y Silencio", "label": "Kids: Padding de audio previo en ms"},
    "vad_start_sensitivity_kid": {"kind": "text", "section": "Voz y Silencio", "label": "Kids: Sensibilidad al inicio de la voz (Gemini Live)"},
    "vad_end_sensitivity_kid": {"kind": "text", "section": "Voz y Silencio", "label": "Kids: Sensibilidad al final de la voz (Gemini Live)"},
    "vad_activity_handling": {"kind": "text", "section": "Voz y Silencio", "label": "Kids: Comportamiento ante interrupción de ruido"},
}


class ConfigUpdate(BaseModel):
    value: str


@router.get("")
async def list_config(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    rows = (await db.execute(text("SELECT config_key, config_value FROM app_config"))).all()
    res = []
    for k, v in rows:
        meta = CONFIG_METADATA.get(k, {"kind": "text", "section": "Otros", "label": k})
        res.append({
            "key": k,
            "value": v or "",
            "kind": meta["kind"],
            "section": meta["section"],
            "label": meta["label"]
        })
    # Ordenar por seccion y key
    res.sort(key=lambda r: (r["section"], r["key"]))
    return res


@router.patch("/{key}")
async def update_config(
    key: str,
    payload: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    c = (await db.execute(text("SELECT config_value FROM app_config WHERE config_key = :k"), {"k": key})).scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="config no encontrada")
    
    await db.execute(
        text("UPDATE app_config SET config_value = :v WHERE config_key = :k"),
        {"k": key, "v": payload.value}
    )
    await db.commit()
    
    meta = CONFIG_METADATA.get(key, {"kind": "text", "section": "Otros", "label": key})
    return {
        "key": key,
        "value": payload.value,
        "kind": meta["kind"],
        "section": meta["section"],
        "label": meta["label"]
    }

"""Detector de preferencias del alumno expresadas en voz durante una sesion.

Flujo:
1. Tras cada turn_complete del USER, el engine llama detect_and_apply(...)
   con el ultimo texto del alumno.
2. Si el texto contiene keywords sospechosas (corrige, corto, largo, etc.),
   lanzamos una llamada chiquita a Gemini 2.5 Flash que clasifica.
3. Si detecta una preferencia → persiste en user.user_preferences y manda
   un system_update por el WS de Gemini Live para que el tutor la aplique YA.

Disenado para ser NO-BLOQUEANTE: corre como asyncio.Task, no traba el flow.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import AsyncSessionLocal
from models.user import User

log = logging.getLogger(__name__)


# Keywords que disparan el clasificador (case insensitive, multilang)
TRIGGER_KEYWORDS = [
    # ES
    "corrig", "corregi", "corregí",
    "corto", "corta", "breve", "rapidito", "menos texto",
    "largo", "larga", "extens", "detall",
    "lento", "lenta", "más despacio", "mas despacio", "más rápid", "mas rapid",
    "amable", "duro", "estricto", "exigent", "calmo", "cálid", "energic",
    "no me corrij", "no corrij", "deja de corregi", "pará de corregi", "para de corregir",
    "más corto", "mas corto", "más largo", "mas largo",
    "me gustaría", "me gustaria", "preferí", "preferi",
    # EN
    "correct", "correction", "shorter", "longer", "briefer", "concise",
    "more concise", "less correction", "stop correcting", "slow down", "faster",
    "kinder", "softer", "stricter", "more strict", "warmer", "more energetic",
    "i prefer", "i'd like", "i would like",
    # PT
    "corrigi", "mais curto", "mais longo", "mais devagar", "mais rápido",
    "prefiro", "prefer",
]


PREFERENCE_PROMPT = """Sos un clasificador. Analizá el siguiente mensaje del alumno y detectá si está
expresando una PREFERENCIA sobre cómo quiere que el tutor le hable.

Devolvé SOLO JSON con esta estructura:
{
  "preference_detected": true/false,
  "changes": {
    "correction_mode": "none"|"recast"|"explicit_soft"|"explicit_strict"|null,
    "response_length": "terse"|"short"|"medium"|"long"|null,
    "warmth_level": 1|2|3|4|5|null
  },
  "confirmation_text": "string corto en %LANG% confirmando el cambio (ej 'OK, voy a corregir menos.')"
}

REGLAS:
- preference_detected=true SOLO si claramente está pidiendo un cambio (no si menciona el tema en contexto).
- correction_mode:
    "none"=no quiere correcciones, "recast"=correcciones suaves naturales,
    "explicit_soft"=correcciones breves, "explicit_strict"=correcciones detalladas
- response_length:
    "terse"=1 oración, "short"=1-2, "medium"=2-3, "long"=3-4
- warmth_level: 1=frío 5=muy cálido
- Si NO está pidiendo cambio explícito, devolvé preference_detected=false y changes con todos null.
- confirmation_text en el idioma %LANG% del alumno, corto, natural.

Mensaje del alumno:
"""


def _has_trigger_keyword(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in TRIGGER_KEYWORDS)


async def _classify_with_gemini(text: str, lang: str = "es") -> Optional[dict]:
    """Llamada a Gemini 2.5 Flash. Devuelve dict o None si fall�."""
    key = settings.GEMINI_API_KEY
    if not key:
        return None

    lang_name = {"es": "español", "en": "English", "pt": "português", "it": "italiano"}.get(lang, "español")
    prompt = PREFERENCE_PROMPT.replace("%LANG%", lang_name) + text

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 400,
            "responseMimeType": "application/json",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15) as cli:
            r = await cli.post(url, json=body)
            r.raise_for_status()
            data = r.json()
        raw = ""
        for c in data.get("candidates", []):
            for p in (c.get("content") or {}).get("parts", []):
                raw += p.get("text", "")
        if not raw.strip():
            return None
        return json.loads(raw)
    except Exception as e:
        log.warning("preference classifier falló: %s", e)
        return None


async def detect_and_apply(
    *,
    user_id: int,
    user_text: str,
    target_lang: str,
    send_system_update,
) -> Optional[dict]:
    """Punto de entrada llamado desde gemini_live_engine.

    - user_id: id del alumno
    - user_text: lo último que dijo el alumno
    - target_lang: idioma para el confirmation_text del tutor
    - send_system_update: async callable que envía un system_update al WS Gemini Live
                          (recibe el texto a inyectar)

    Returns dict con changes si se aplicó algo, None en otro caso.
    """
    if not user_text or len(user_text.strip()) < 6:
        return None
    if not _has_trigger_keyword(user_text):
        return None

    result = await _classify_with_gemini(user_text, lang=target_lang)
    if not result or not result.get("preference_detected"):
        return None

    changes = result.get("changes") or {}
    # Filtramos null/None
    clean_changes = {k: v for k, v in changes.items() if v is not None}
    if not clean_changes:
        return None

    # Persistir en user.user_preferences (merge con lo que ya tenía)
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user:
            return None
        existing = user.user_preferences or {}
        merged = {**existing, **clean_changes}
        user.user_preferences = merged
        await db.commit()
        log.info("preference applied user=%s changes=%s", user_id, clean_changes)

    # Aplicar de inmediato vía system_update al Gemini Live activo
    confirmation = result.get("confirmation_text") or ""
    instruction_lines = ["[ACTUALIZACIÓN DE PREFERENCIA DEL ALUMNO]"]
    if "correction_mode" in clean_changes:
        instruction_lines.append(f"- Modo de corrección ahora: {clean_changes['correction_mode']}")
    if "response_length" in clean_changes:
        instruction_lines.append(f"- Largo de respuestas: {clean_changes['response_length']}")
    if "warmth_level" in clean_changes:
        instruction_lines.append(f"- Calidez: {clean_changes['warmth_level']}/5")
    instruction_lines.append(f"Aplicalo desde ya. Confirmá brevemente con: \"{confirmation}\"")

    try:
        await send_system_update("\n".join(instruction_lines))
    except Exception as e:
        log.warning("send_system_update falló: %s", e)

    return {"changes": clean_changes, "confirmation": confirmation}

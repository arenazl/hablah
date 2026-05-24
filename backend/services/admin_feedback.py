"""Modo evolutivo del coach — interceptor de feedback del super-admin.

Durante una sesion Live, si el usuario dice algo que matchea el patron
"hola soy el super admin Luquitas, <feedback>", el detector intercepta el
transcript ANTES de mandarlo al modelo Gemini Live y:

1. Toma snapshot del super_prompt actual del coach (prompt_before).
2. Refina el feedback con Gemini Flash en una regla concreta (directive_text).
3. Guarda la directiva en la tabla admin_directives.
4. Toma snapshot del nuevo super_prompt (prompt_after).
5. Devuelve un mensaje sintetico que se manda al modelo para que confirme en voz.

La directiva queda activa para TODAS las sesiones futuras de ese template.
"""
from __future__ import annotations

import re
import json
import httpx
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import AsyncSessionLocal
from models.template import AdminDirective, Template, Session as SessionModel
from models.user import User
from services.super_prompt import build_super_prompt

log = logging.getLogger(__name__)

# Patron flexible: matchea variantes razonables del speech recognition.
# Tolera "Lukitas", "Luquita", "luquitas", etc. La frase entera debe aparecer
# como prefijo del feedback (case insensitive).
_TRIGGER_PATTERN = re.compile(
    r"^\s*hola[,.\s]+soy\s+el\s+s[uú]per\s+admin\s+luqui?tas?\s*[,.\s]*(.+)$",
    re.IGNORECASE | re.DOTALL,
)

_FLASH_MODEL = "gemini-2.5-flash"
_TIMEOUT_SECONDS = 10.0


def detect_admin_trigger(user_text: str) -> Optional[str]:
    """Si el texto matchea el patron admin, devuelve el feedback (sin el prefijo).
    Si no matchea, devuelve None.
    """
    if not user_text or len(user_text) < 25:
        return None
    m = _TRIGGER_PATTERN.match(user_text)
    if not m:
        return None
    feedback = m.group(1).strip()
    return feedback if feedback else None


async def _refine_with_flash(feedback: str) -> str:
    """Pide a Gemini Flash que convierta el feedback verbal del admin en una
    regla concreta, accionable, en formato directivo. Si Flash falla, devuelve
    el feedback original como fallback.
    """
    if not settings.GEMINI_API_KEY:
        return feedback

    prompt = f"""Sos un asistente que refina feedback verbal de un super-admin
hacia un coach de idiomas (LLM tutor). El admin acaba de decir esto en voz:

"{feedback}"

Tu tarea: convertirlo en UNA regla concreta, directiva, en segunda persona ("hacé X",
"no hagas Y"), en castellano rioplatense, lista para inyectar como instrucción
de sistema al tutor. Maximo 2 oraciones.

Reglas:
- NO incluyas "El admin dijo que..." ni meta-comentarios. Solo la regla en imperativo.
- NO uses tecnicismos. Tono natural.
- Si el feedback ya viene como regla, dejalo casi tal cual.
- Si el feedback es ambiguo, interpretalo conservadoramente.

Devolveme SOLO JSON: {{"directive": "<la regla refinada>"}}
"""

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_FLASH_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 400,
            "responseMimeType": "application/json",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            obj = json.loads(text)
            return (obj.get("directive") or "").strip() or feedback
    except Exception as e:
        log.warning("admin_feedback: Flash refine fallo, uso feedback raw: %s", e)
        return feedback


async def load_active_directives(template_id: int, db: AsyncSession) -> list[str]:
    """Devuelve la lista de directive_text activas para un template, en orden
    cronologico. Usada por super_prompt para inyectarlas al final.
    """
    if not template_id:
        return []
    rows = (await db.execute(
        select(AdminDirective)
        .where(AdminDirective.template_id == template_id)
        .where(AdminDirective.active == True)  # noqa: E712
        .order_by(AdminDirective.created_at.asc())
    )).scalars().all()
    return [d.directive_text for d in rows]


async def apply_admin_directive(
    *,
    raw_feedback: str,
    feedback_body: str,
    template_id: int,
    session_id: Optional[int],
    user_id: int,
) -> Optional[dict]:
    """Procesa el feedback del admin de punta a punta.

    1. Carga template + user.
    2. Snapshot prompt_before (con directivas vigentes).
    3. Refina feedback con Flash.
    4. Inserta AdminDirective.
    5. Snapshot prompt_after (con la nueva directiva ya incluida).
    6. Devuelve dict con confirmation_text (para que el coach lo diga en voz).

    Devuelve None si algo falla (template no existe, etc).
    """
    async with AsyncSessionLocal() as db:
        template = (await db.execute(
            select(Template).where(Template.id == template_id)
        )).scalar_one_or_none()
        user = (await db.execute(
            select(User).where(User.id == user_id)
        )).scalar_one_or_none()
        if not template or not user:
            log.warning("admin_feedback: template=%s user=%s no encontrados",
                        template_id, user_id)
            return None

        existing_directives = await load_active_directives(template.id, db)
        prompt_before = build_super_prompt(
            user=user,
            template=template,
            topic=None,
            admin_directives=existing_directives,
        )

        directive_text = await _refine_with_flash(feedback_body)

        d = AdminDirective(
            template_id=template.id,
            session_id=session_id,
            user_id=user.id,
            raw_feedback=raw_feedback.strip(),
            directive_text=directive_text,
            prompt_before=prompt_before,
            prompt_after="",  # se llena despues
            active=True,
        )
        db.add(d)
        await db.flush()

        prompt_after = build_super_prompt(
            user=user,
            template=template,
            topic=None,
            admin_directives=existing_directives + [directive_text],
        )
        d.prompt_after = prompt_after
        await db.commit()
        await db.refresh(d)

        return {
            "id": d.id,
            "directive_text": directive_text,
            "confirmation_text": _build_confirmation(directive_text),
        }


def _build_confirmation(directive_text: str) -> str:
    """Texto sintetico que se le manda al modelo Gemini Live como turno user.
    El modelo va a hablarlo en voz como confirmacion al admin.
    """
    return (
        f"[SISTEMA · MODO ADMIN] Recibi una directiva del super-admin Luquitas. "
        f"Quedo registrada y aplicada para todas las charlas futuras de este coach. "
        f"Directiva: '{directive_text}'. "
        f"Decile a Luquitas en UNA frase corta y natural en castellano que la registraste "
        f"y que vas a aplicarla. No conversaciones de mas, solo confirma y volve a la charla."
    )

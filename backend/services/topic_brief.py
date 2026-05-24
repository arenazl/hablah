"""Topic brief — capa de "creatividad conversacional" de Habláh.

Cuando el alumno entra a una sesión con free_topic (texto libre tipo
"cocina mediterránea", "estar soltero a los 40", "asado argentino"),
este servicio se toma 2-3s para pedirle a Gemini Flash que arme la
NARRATIVA de la charla ANTES de iniciar la sesión Live.

Sin esto, el tutor entra a la conversación sin contexto y hace preguntas
robóticas tipo "what does it feel like to be 40" o "tell me about
Mediterranean food". Con el brief, el tutor arranca con un ángulo
concreto, datos jugosos y una opening line natural.

El brief se inyecta en el system prompt del LLM Live como contexto
extra. NO lo ve el alumno — es munición pedagógica para el tutor.
"""
from __future__ import annotations

import httpx
import json
from typing import Optional

from core.config import settings


# Modelo Flash explícito (no depender del GEMINI_MODEL default por si lo cambian
# a uno más caro). Flash es rápido y barato — ideal para este pre-call.
_FLASH_MODEL = "gemini-2.5-flash"

# Timeout: máximo aceptable de espera antes de arrancar la sesión Live.
_TIMEOUT_SECONDS = 8.0


def _lang_name(code: str) -> str:
    return {
        "en": "English", "es": "Spanish", "pt": "Portuguese",
        "it": "Italian", "fr": "French", "de": "German",
    }.get((code or "en").lower(), code or "en")


def _build_prompt(free_topic: str, cefr: str, target_lang: str, base_lang: str, is_kid: bool) -> str:
    target_name = _lang_name(target_lang)
    base_name = _lang_name(base_lang)
    audience = "a CHILD aged 7-12" if is_kid else "an adult learner"

    return f"""You are the conversational creativity layer of Habláh, a language-learning app.

The learner just typed a FREE TOPIC they want to talk about: "{free_topic}"

Your job: build a CONVERSATION BRIEF that the speaking tutor will use as ammunition
so the chat feels INTERESTING from the first second — not robotic, not generic.

Learner profile:
- CEFR level: {cefr}
- Native language: {base_name}
- Learning: {target_name}
- Audience: {audience}

CRITICAL RULES for the brief:

1. The opening line must HOOK. Forbidden openers: "tell me about X", "what do you
   think about X", "what does it feel like to X", "what would you change about X",
   "what's good/bad about X", any abstract feeling-check. Allowed: a specific
   observation, a tiny anecdote, a pointed claim the learner can agree or push
   back on, a sensory detail, an unexpected angle.

2. Angles must be NON-OBVIOUS. If the topic is "being single at 40", do NOT list
   "loneliness", "freedom", "dating apps". List something like: "the moment a
   friend's wedding stops feeling like FOMO and starts feeling like relief", "the
   weird power of nobody auditing your weekend schedule", "how your taste in
   restaurants becomes more honest". Always specific, always tangible.

3. Hooks must be CONCRETE facts/observations the tutor can casually drop: data,
   cultural references, micro-stories, contrarian takes. NOT vague themes.

4. Match the language level: opening is in {target_name} (at {cefr} difficulty).
   The whole brief content stays in {target_name} so the tutor can quote it
   directly.

5. Match audience: if it's a kid, opening uses simple {target_name} and concrete
   imagery (no abstract feelings). If adult, can be more sophisticated.

Return ONLY valid JSON with this exact shape (no markdown, no commentary):

{{
  "angles": [
    "<angle 1 — non-obvious framing of the topic>",
    "<angle 2>",
    "<angle 3>",
    "<angle 4>"
  ],
  "hooks": [
    "<a concrete fact, data point, or micro-observation the tutor can drop>",
    "<another hook>",
    "<another hook>",
    "<another hook>",
    "<another hook>"
  ],
  "opening": "<a single sentence in {target_name}, {cefr} level, that the tutor uses to open the conversation. Must hook. Ends with a SPECIFIC question, not a generic one.>",
  "forbidden_phrases": [
    "tell me about {free_topic}",
    "what do you think about",
    "what does it feel like",
    "what would you change"
  ]
}}
"""


async def build_topic_brief(
    *,
    free_topic: str,
    cefr: str = "B1",
    target_lang: str = "en",
    base_lang: str = "es",
    is_kid: bool = False,
) -> Optional[dict]:
    """Llama a Gemini Flash y devuelve un brief estructurado.

    Devuelve None si falla (timeout, API key faltante, JSON inválido). El caller
    debe seguir adelante sin brief en ese caso — la app no debe romperse si
    Gemini está caído.
    """
    if not settings.GEMINI_API_KEY:
        return None
    if not free_topic or not free_topic.strip():
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_FLASH_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    prompt = _build_prompt(
        free_topic=free_topic.strip(),
        cefr=cefr or "B1",
        target_lang=target_lang or "en",
        base_lang=base_lang or "es",
        is_kid=is_kid,
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.9,
            "maxOutputTokens": 1500,
            "responseMimeType": "application/json",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            brief = json.loads(text)
    except Exception as e:
        print(f"[topic_brief] error: {e}")
        return None

    if not isinstance(brief, dict):
        return None
    return brief


def format_brief_for_prompt(brief: dict, free_topic: str) -> str:
    """Convierte el brief JSON en un bloque de texto inyectable al system prompt."""
    angles = brief.get("angles") or []
    hooks = brief.get("hooks") or []
    opening = brief.get("opening") or ""
    forbidden = brief.get("forbidden_phrases") or []

    angles_txt = "\n".join(f"  · {a}" for a in angles[:4]) or "  · (sin ángulos)"
    hooks_txt = "\n".join(f"  · {h}" for h in hooks[:5]) or "  · (sin hooks)"
    forbidden_txt = ", ".join(f'"{p}"' for p in forbidden[:6])

    return (
        f"BRIEF NARRATIVO PRE-GENERADO PARA \"{free_topic}\"\n"
        f"(Este brief es munición PARA VOS, el tutor — el alumno NO lo ve.\n"
        f"Usalo para que la charla arranque INTERESANTE desde el primer segundo.)\n\n"
        f"ÁNGULOS NO OBVIOS sobre el tema (elegí 1 para abrir, guardá los otros para profundizar):\n"
        f"{angles_txt}\n\n"
        f"HOOKS / DATOS / MICRO-OBSERVACIONES para tirar durante la charla:\n"
        f"{hooks_txt}\n\n"
        f"OPENING LINE SUGERIDA (podés usarla literal o adaptarla — pero respetá el ÁNGULO):\n"
        f"  → {opening}\n\n"
        f"PROHIBIDO arrancar con preguntas vacías tipo: {forbidden_txt}.\n"
        f"PROHIBIDO decir \"so, tell me about {free_topic}\" o equivalente. Eso es de robot.\n"
        f"El primer turno DEBE incluir un dato/observación/ángulo concreto ANTES de la pregunta.\n"
    )

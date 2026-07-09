"""Analizador en vivo turno-por-turno.

Mientras la sesión está activa, cada vez que el usuario completa un turno
mandamos su texto al LLM para detectar el error más grave (si lo hay).
Resultado pintado en pantalla como chip rojo + recomendación.

Costo: 1 llamada Gemini Flash por turno (~150ms-400ms, ~$0.001).
Solo se invoca si el turno tiene >= 6 palabras (típos sueltos no valen la pena).
"""
from __future__ import annotations

import json
import logging
from typing import Optional

import httpx

from core.config import settings

log = logging.getLogger(__name__)


TURN_ANALYZER_PROMPT = """Sos un evaluador conversacional para alumnos de idiomas.
Vas a recibir UNA frase dicha por un alumno de nivel {cefr} aprendiendo {target}.

Tu trabajo: detectar el error gramatical o de vocabulario MÁS importante de esa frase.
Solo errores que:
- Cambian el sentido, o
- Son sistemáticos (típico del nivel del alumno), o
- Sonarían raros a un hablante nativo.

Ignorá:
- Típos menores que no afectan comprensión.
- Disfluencias ("uh", "ah", "you know") — son normales al hablar.
- Errores que el speech-to-text pudo introducir.

Devolveme UN JSON estricto:

{{
  "has_error": true|false,
  "snippet_wrong": "la parte exacta de la frase con error (3-8 palabras, en {target})",
  "snippet_correct": "la versión correcta de esa parte (3-8 palabras)",
  "hint": "explicación de UNA línea en español rioplatense, casual, no académica (max 80 chars)",
  "kind": "grammar" | "vocabulary" | "tense"
}}

Si no hay error de los importantes: {{"has_error": false}}.

EJEMPLO:
Input: "Yesterday I go to the cinema and I see Pulp Fiction."
Output: {{"has_error": true, "snippet_wrong": "Yesterday I go to the cinema", "snippet_correct": "Yesterday I went to the cinema", "hint": "Pasado simple: el ayer pide 'went', no 'go'.", "kind": "tense"}}

EJEMPLO:
Input: "I really liked the soundtrack of that movie."
Output: {{"has_error": false}}

Frase del alumno:
{text}
"""


async def analyze_turn(text: str, cefr: str = "B1", target_lang: str = "en") -> Optional[dict]:
    """Devuelve dict con error detectado o None si no hay error/falla.

    Devuelve None (en vez de {"has_error": False}) cuando el turno es muy corto
    o el LLM no devuelve nada útil — el frontend interpreta None como "nada que mostrar".
    """
    if not text or len(text.split()) < 6:
        return None
    if not settings.GEMINI_API_KEY:
        return None

    model = settings.GEMINI_MODEL or "gemini-2.5-flash"
    target_name = {"en": "English", "pt": "Portuguese", "it": "Italian"}.get(target_lang, target_lang)
    prompt = TURN_ANALYZER_PROMPT.format(cefr=cefr, target=target_name, text=text)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 300,
            "responseMimeType": "application/json",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=10) as cli:
            r = await cli.post(url, json=body)
            r.raise_for_status()
            data = r.json()
        cands = data.get("candidates") or []
        if not cands:
            return None
        text_out = ""
        for p in (cands[0].get("content") or {}).get("parts", []):
            text_out += p.get("text", "")
        parsed = json.loads(text_out)
        if not parsed.get("has_error"):
            return None
        return parsed
    except Exception as e:
        log.debug("analyze_turn failed: %s", e)
        return None

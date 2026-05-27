"""Endpoint que toma el texto que dijo el coach y lo splittea en frases
con una nota gramatical breve para cada frase.

Pensado para que el alumno LEA lo que dijo el coach en panelitos, cada
uno con una mini-aclaracion del idioma objetivo (gramatica, traduccion,
palabras nuevas).

Tarda 1-2s en cargar (Gemini Flash). El frontend muestra placeholder y
despues actualiza.
"""
import json
import logging
from typing import Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import settings

log = logging.getLogger(__name__)

router = APIRouter()

_FLASH_MODEL = "gemini-2.5-flash"
_TIMEOUT_SECONDS = 8.0


class GrammarRequest(BaseModel):
    text: str
    target_lang: str = "en"
    base_lang: str = "es"
    cefr: str = "B1"


class GrammarPhrase(BaseModel):
    phrase: str
    note: str


class GrammarResponse(BaseModel):
    phrases: list[GrammarPhrase]


def _lang_name(code: str) -> str:
    return {
        "en": "English", "es": "Spanish", "pt": "Portuguese",
        "it": "Italian", "fr": "French", "de": "German",
    }.get((code or "en").lower(), code or "en")


def _build_prompt(req: GrammarRequest) -> str:
    target = _lang_name(req.target_lang)
    base = _lang_name(req.base_lang)
    return f"""You are a language coach assistant. The student is a {req.cefr}
level learner whose native language is {base}, learning {target}.

The student's coach just said this text in the conversation:

---
{req.text}
---

Your job: split the text into NATURAL sentences/phrases (NOT every comma -
group related clauses together so each panel is meaningful). For each one,
write a SHORT grammar/vocabulary note in {base} aimed at the student.

Rules for the notes:
- 1 short sentence max. Plain {base}, no technical jargon.
- Focus on: model phrases between quotes (translate + when to use), tricky
  verb tenses, idioms, useful vocabulary the student might not know.
- If a phrase is just connective talk ("a ver", "fijate", "claro"), give a
  note about its conversational function or just translate it briefly.
- DO NOT explain obvious things the student already knows at their level.

Output ONLY valid JSON with this exact shape:

{{
  "phrases": [
    {{"phrase": "<the original phrase exactly as it appeared>", "note": "<short note in {base}>"}},
    ...
  ]
}}

Cap at 8 phrases max. If the text is short, fewer is fine.
"""


@router.post("/explain", response_model=GrammarResponse)
async def explain_grammar(req: GrammarRequest) -> GrammarResponse:
    """Split + grammar notes for a coach turn. Sin auth - publico."""
    if not settings.GEMINI_API_KEY or not req.text or not req.text.strip():
        return GrammarResponse(phrases=[GrammarPhrase(phrase=req.text or "", note="")])

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_FLASH_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": _build_prompt(req)}]}],
        "generationConfig": {
            "temperature": 0.4,
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
            parsed = json.loads(text)
            phrases_raw = parsed.get("phrases", []) if isinstance(parsed, dict) else []
            phrases = [
                GrammarPhrase(phrase=p.get("phrase", "").strip(), note=p.get("note", "").strip())
                for p in phrases_raw
                if isinstance(p, dict) and p.get("phrase")
            ]
            return GrammarResponse(phrases=phrases[:8])
    except Exception as e:
        log.warning("grammar.explain failed: %s", e)
        # Fallback: devolver el texto entero como una sola frase sin nota
        return GrammarResponse(phrases=[GrammarPhrase(phrase=req.text, note="")])

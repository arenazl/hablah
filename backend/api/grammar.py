"""Endpoint que toma el texto que dijo el coach y lo splittea en frases
con una nota gramatical breve para cada frase.

Pensado para que el alumno LEA lo que dijo el coach en panelitos, cada
uno con una mini-aclaracion del idioma objetivo (gramatica, traduccion,
palabras nuevas).

Tarda 1-2s en cargar (Gemini Flash). El frontend muestra placeholder y
despues actualiza.
"""
import asyncio
import hashlib
import json
import logging
import time
from typing import Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import settings
from core.trace import trace, trace_duration_ms

log = logging.getLogger(__name__)

router = APIRouter()

_FLASH_MODEL = "gemini-2.5-flash"
_FLASH_LITE = "gemini-2.5-flash-lite"
_TIMEOUT_SECONDS = 8.0

# Cache en memoria: el texto del coach se repite mucho (mismo turno disparado
# varias veces). Con free tier (15 RPM) cada call se vuelve carisima — cache
# evita 90% de llamadas a Gemini.
_CACHE: dict[str, tuple[float, "GrammarResponse"]] = {}
_CACHE_TTL_SECONDS = 3600  # 1 hora
_CACHE_MAX_ENTRIES = 500
_CACHE_LOCK = asyncio.Lock()


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


def _cache_key(req: GrammarRequest) -> str:
    raw = f"{req.text}|{req.target_lang}|{req.base_lang}|{req.cefr}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


@router.post("/explain", response_model=GrammarResponse)
async def explain_grammar(req: GrammarRequest) -> GrammarResponse:
    """Split + grammar notes for a coach turn. Sin auth - publico."""
    if not settings.GEMINI_API_KEY or not req.text or not req.text.strip():
        return GrammarResponse(phrases=[GrammarPhrase(phrase=req.text or "", note="")])

    t0 = time.time()
    # 1) Cache lookup — el coach repite frases, no quema cuota
    key = _cache_key(req)
    now = time.time()
    async with _CACHE_LOCK:
        hit = _CACHE.get(key)
        if hit and (now - hit[0]) < _CACHE_TTL_SECONDS:
            trace.debug("grammar.cache_hit", text_len=len(req.text),
                        target_lang=req.target_lang, latency_ms=trace_duration_ms(t0))
            return hit[1]

    payload = {
        "contents": [{"parts": [{"text": _build_prompt(req)}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 1500,
            "responseMimeType": "application/json",
        },
    }

    async def _try_model(model: str) -> Optional[GrammarResponse]:
        t_call = time.time()
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={settings.GEMINI_API_KEY}"
        )
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
                r = await client.post(url, json=payload)
                if r.status_code == 429:
                    trace.warn("grammar.rate_limited", model=model,
                               latency_ms=trace_duration_ms(t_call))
                    return None
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
                trace.event("grammar.ok", model=model, n_phrases=len(phrases),
                            latency_ms=trace_duration_ms(t_call))
                return GrammarResponse(phrases=phrases[:8])
        except Exception as e:
            trace.error("grammar.error", model=model, error=str(e),
                        latency_ms=trace_duration_ms(t_call))
            return None

    # 2) Flash → fallback Flash-lite si Flash 429
    result = await _try_model(_FLASH_MODEL)
    if result is None:
        result = await _try_model(_FLASH_LITE)

    if result is None:
        # Fallback final: devolver el texto entero como una sola frase sin nota
        return GrammarResponse(phrases=[GrammarPhrase(phrase=req.text, note="")])

    # 3) Cache write
    async with _CACHE_LOCK:
        if len(_CACHE) >= _CACHE_MAX_ENTRIES:
            oldest = min(_CACHE.items(), key=lambda kv: kv[1][0])[0]
            _CACHE.pop(oldest, None)
        _CACHE[key] = (now, result)

    return result

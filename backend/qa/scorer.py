"""Scorer: dado un RunResult con la conversacion completa, le pide a Gemini
Flash que evalue la calidad del coach contra las reglas del super_prompt.

Devuelve un Score estructurado con pass/fail por categoria + comentarios.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Optional

import httpx

from core.config import settings
from qa.runner import RunResult

log = logging.getLogger(__name__)

_MODEL = "gemini-2.5-flash"
_MODEL_FALLBACK = "gemini-2.5-flash-lite"
_TIMEOUT = 30.0


def _robust_json_parse(text: str) -> Optional[dict]:
    """Parsea JSON con tolerancia a:
    - Wrapping con markdown (```json ... ``` o ``` ... ```)
    - Control chars sin escapar dentro de strings (newlines literales, tabs)
    - Comas trailing
    - Texto basura antes/despues del JSON

    Devuelve None si nada funciona.
    """
    s = (text or "").strip()
    if not s:
        return None
    # 1) Quitar fence markdown si esta
    if s.startswith("```"):
        # ```json\n...\n``` o ```\n...\n```
        lines = s.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        s = "\n".join(lines).strip()
    # 2) Intento directo
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        pass
    # 3) Recortar a lo que parece JSON: del primer { al ultimo }
    i = s.find("{")
    j = s.rfind("}")
    if i >= 0 and j > i:
        cand = s[i:j + 1]
        try:
            return json.loads(cand)
        except json.JSONDecodeError:
            pass
        # 4) Escapar control chars sin escapar dentro de strings
        # Reemplazo \n/\r/\t literales por sus formas escapadas SOLO dentro de strings
        # Aproximacion: usar strict=False de json (permite control chars en strings)
        try:
            return json.loads(cand, strict=False)
        except json.JSONDecodeError:
            pass
    # 5) Ultimo intento: strict=False directo
    try:
        return json.loads(s, strict=False)
    except json.JSONDecodeError:
        return None


@dataclass
class Score:
    overall: float  # 0 a 10
    rubric: dict[str, dict]  # category → {pass: bool, score: 0-10, note: str}
    issues: list[str] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    raw_response: Optional[str] = None

    def passed(self, min_score: float = 6.5) -> bool:
        return self.overall >= min_score


_SCORING_PROMPT_TEMPLATE = """You are a balanced QA evaluator for Hablah, a
language-learning app. You evaluate the AI coach against a realistic standard:
a decent human conversational tutor for that CEFR level. NOT a stand-up
comedian. NOT a robot either.

CALIBRATION (use this for every dimension):
- 10/10 = exceptional. Memorable, professional human tutor at their best.
- 8/10 = clearly good. The kind of turn a competent human tutor would give.
- 6/10 = adequate. Functional, no clear flaws but nothing remarkable.
- 4/10 = noticeable problem (some repetition, some genericness).
- 2/10 = consistent bad pattern across most of the conversation.
- 0/10 = total failure of that dimension.

Do not anchor low. If the coach does the dimension WELL most of the time,
score 7-9. Reserve 1-3 for sustained, obvious failures.

CATEGORIES TO EVALUATE:

1. **opening_creativity**: Does the first turn feel grounded and inviting?
   GOOD signs (score 7-9): a specific reference, an opinion, a story, a vivid
   scene, OR a direct question that's specific to the topic (not generic).
   FAIR (score 5-6): functional but predictable opening.
   POOR (score 2-4): the formula "Hey {{name}}! Topic is interesting because
   X. I remember when Y. What do you think?".
   An opening can be SPECIFIC to a topic and still get 7-9 — uniqueness across
   ALL possible topics is NOT required.

2. **anti_formula**: Does the coach AVOID falling into the robotic recipe
   across the whole conversation?
   GOOD (7-9): turns have varied shapes (some end with opinion, some with
   question, some with anecdote).
   FAIR (5-6): mostly varied with some predictable runs.
   POOR (2-4): clear repetitive "ack + question" formula across most turns.

3. **filler_words**: Does the coach avoid empty openers like "Great!",
   "Awesome!", "That's a fantastic point!"? Occasional "Right" or "Yeah" used
   naturally is FINE — only mark low for SUSTAINED hollow praise.

4. **language_consistency**: speaks in {target_language}, not {base_language}.
   This is binary-ish: 10 if consistent, lower only for actual lapses.

5. **no_thinking_leak**: NO verbalization of internal reasoning, asterisks,
   step labels. 10 if clean. Score 0 only for actual leaks visible in the
   conversation.

6. **turn_length**: short conversational turns (1-3 sentences typical).
   Score 7-9 if mostly OK with maybe one slightly longer turn.

7. **topic_focus_flexible**: stays on topic but adapts to student. A coach
   that follows the student's natural drift within the topic gets 7-9. Only
   score low if rigidly forcing or completely losing the topic.

8. **engagement_substance**: does each turn ADD something beyond the
   student's last words? A specific detail, opinion, anecdote, or pointed
   follow-up counts. Score 7-9 if most turns add something. Reserve 2-4 for
   conversations where many turns are pure rephrasing.

Student level: {cefr_level}
Topic: {topic_label}

CONVERSATION TO EVALUATE:
---
{conversation}
---

OUTPUT FORMAT (strict JSON):
{{
  "overall": <number 0-10, computed as a thoughtful average across dimensions>,
  "rubric": {{
    "opening_creativity": {{"pass": <bool>, "score": <0-10>, "note": "..."}},
    "anti_formula": {{"pass": <bool>, "score": <0-10>, "note": "..."}},
    "filler_words": {{"pass": <bool>, "score": <0-10>, "note": "..."}},
    "language_consistency": {{"pass": <bool>, "score": <0-10>, "note": "..."}},
    "no_thinking_leak": {{"pass": <bool>, "score": <0-10>, "note": "..."}},
    "turn_length": {{"pass": <bool>, "score": <0-10>, "note": "..."}},
    "topic_focus_flexible": {{"pass": <bool>, "score": <0-10>, "note": "..."}},
    "engagement_substance": {{"pass": <bool>, "score": <0-10>, "note": "..."}}
  }},
  "issues": ["specific issue with quote from coach"],
  "strengths": ["what the coach did well"]
}}

Be FAIR, not harsh. A competent human tutor scores around 7-8 in most
dimensions. Penalize only for sustained patterns, not isolated turns.
Return ONLY the JSON. No markdown wrapping.
"""


async def score_run(
    result: RunResult,
    *,
    target_language: str = "en",
    base_language: str = "es",
    cefr_level: str = "B1",
) -> Score:
    """Llama a Gemini Flash con la rubric y devuelve el Score."""
    conversation = result.conversation_str()
    if not conversation.strip():
        return Score(overall=0.0, rubric={}, issues=["empty_conversation"], raw_response=None)

    lang_name = {"en": "English", "es": "Spanish", "pt": "Portuguese", "it": "Italian"}
    prompt = _SCORING_PROMPT_TEMPLATE.format(
        target_language=lang_name.get(target_language, target_language),
        base_language=lang_name.get(base_language, base_language),
        topic_label=result.topic_label,
        cefr_level=cefr_level,
        conversation=conversation,
    )

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 4000,
            "responseMimeType": "application/json",
            # Disable thinking to avoid Gemini consuming output tokens with reasoning
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }

    async def _try_model(model: str) -> tuple[Optional[dict], Optional[str]]:
        u = (f"https://generativelanguage.googleapis.com/v1beta/models/"
             f"{model}:generateContent?key={settings.GEMINI_API_KEY}")
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as cli:
                r = await cli.post(u, json=payload)
                if r.status_code == 429:
                    return None, f"429 on {model}"
                r.raise_for_status()
                data = r.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = _robust_json_parse(text)
                return parsed, text[:2000] if parsed is None else None
        except Exception as e:
            log.exception("scorer %s failed: %s", model, e)
            return None, f"{type(e).__name__}: {e}"

    parsed, err = await _try_model(_MODEL)
    if parsed is None:
        log.info("scorer: trying %s fallback", _MODEL_FALLBACK)
        parsed, err = await _try_model(_MODEL_FALLBACK)

    if parsed is None:
        return Score(overall=0.0, rubric={}, issues=[f"scorer_error: {err}"],
                     raw_response=err)

    return Score(
        overall=float(parsed.get("overall", 0)),
        rubric=parsed.get("rubric", {}),
        issues=parsed.get("issues", []),
        strengths=parsed.get("strengths", []),
        raw_response=json.dumps(parsed, ensure_ascii=False),
    )

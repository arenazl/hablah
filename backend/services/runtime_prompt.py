"""Runtime addon que se prepende al system prompt antes de mandarlo al modelo.

Iteracion 9: addon minimo. Solo lo que NO se puede expresar en super_prompt.
La logica de estilo/anti-filler/repeticion se mueve al super_prompt directo
para no confundir al modelo Live con capas redundantes.
"""
from __future__ import annotations

from datetime import datetime, timezone


def runtime_addon_block(target_language: str = "English") -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    year = today[:4]
    return f"""[RUNTIME CONTEXT]

DATE: {today}. We are in {year}. The next World Cup is in 2026.

OUTPUT: plain text only for TTS. NO markdown (no asterisks, no bold,
no underscores, no backticks). NO bullets, NO numbered lists.

LANGUAGE: respond in {target_language} only.

KNOWLEDGE: no internet. Never invent names, shows, dates or facts you're
not sure of. If unsure: "I don't know that one". If corrected: "You're
right, my mistake". Never bluff.
"""

"""ElevenLabs TTS wrapper para Habláh.

Uso:
    from services.elevenlabs import synth, TUTOR_VOICES

    audio_mp3 = await synth("Hola, ¿cómo estás?", voice_id=TUTOR_VOICES["coach"])

Decisión de mapeo (ver docstring de TUTOR_VOICES).
"""
from __future__ import annotations

from typing import Literal, Optional

import httpx

from core.config import settings


# ─── Mapeo tutor → voz ──────────────────────────────────────────────────────
# Cada tutor de Habláh tiene una voz asignada. Mapeo elegido por encaje
# semántico entre la personalidad del tutor y el "mood" de la voz.
# - Coach (empático/paciente)     → Lucia    (warm, expressive)
# - Sincerist (directo/exigente)  → Melanie  (clear, professional)
# - Arcade (lúdico/veloz)         → alt #1   (a validar en producción)
# - Diagnostic (onboarding oculto) → alt #2  (voz neutra distinta de las 3)
TUTOR_VOICES: dict[str, str] = {
    "coach": "yA5jrK1S9cpCAojBYyMu",       # Lucia
    "sincerist": "bN1bDXgDIGX5lw0rtY2B",   # Melanie
    "arcade": "93IsRN8Mhs3FMPjO05OH",      # alt #1
    "diagnostic": "9rvdnhrYoXoUt4igKpBw",  # alt #2
}

TutorKey = Literal["coach", "sincerist", "arcade", "diagnostic"]

VOICE_META: dict[str, dict[str, str]] = {
    "yA5jrK1S9cpCAojBYyMu": {"name": "Lucia", "mood": "Warm, Expressive"},
    "bN1bDXgDIGX5lw0rtY2B": {"name": "Melanie", "mood": "Warm, Clear, Professional"},
    "93IsRN8Mhs3FMPjO05OH": {"name": "Alt voice #1", "mood": "Voz alternativa (pendiente definir)"},
    "9rvdnhrYoXoUt4igKpBw": {"name": "Alt voice #2", "mood": "Voz alternativa (pendiente definir)"},
}

_BASE_URL = "https://api.elevenlabs.io/v1"


def voice_for_tutor(tutor: TutorKey) -> str:
    """Devuelve el voice_id mapeado al tutor; fallback al default si no existe."""
    return TUTOR_VOICES.get(tutor, settings.ELEVENLABS_DEFAULT_VOICE_ID)


async def synth(
    text: str,
    voice_id: Optional[str] = None,
    *,
    model_id: Optional[str] = None,
    output_format: str = "mp3_44100_128",
    stability: float = 0.45,
    similarity_boost: float = 0.75,
    style: float = 0.0,
    speaker_boost: bool = True,
    timeout: float = 30.0,
) -> bytes:
    """Sintetiza texto a MP3 con ElevenLabs.

    Lanza httpx.HTTPStatusError si la API devuelve error.
    """
    if not settings.ELEVENLABS_API_KEY:
        raise RuntimeError("ELEVENLABS_API_KEY no configurada")

    vid = voice_id or settings.ELEVENLABS_DEFAULT_VOICE_ID
    model = model_id or settings.ELEVENLABS_MODEL or "eleven_flash_v2_5"

    url = f"{_BASE_URL}/text-to-speech/{vid}?output_format={output_format}"
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/pcm" if output_format.startswith("pcm") else "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": model,
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": style,
            "use_speaker_boost": speaker_boost,
        },
    }

    async with httpx.AsyncClient(timeout=timeout) as cli:
        r = await cli.post(url, headers=headers, json=payload)
        r.raise_for_status()
        return r.content


async def list_voices(timeout: float = 15.0) -> list[dict]:
    """Lista las voces disponibles en la cuenta (para diagnóstico/UI admin)."""
    if not settings.ELEVENLABS_API_KEY:
        raise RuntimeError("ELEVENLABS_API_KEY no configurada")
    async with httpx.AsyncClient(timeout=timeout) as cli:
        r = await cli.get(
            f"{_BASE_URL}/voices",
            headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
        )
        r.raise_for_status()
        return r.json().get("voices", [])

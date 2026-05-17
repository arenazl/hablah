"""Endpoint /api/tts/sample — sintetiza un texto en una voz ElevenLabs.

Usado por el backoffice para previewar voces antes de asignarlas a un template.
También por la web app para frases cortas (challenge cards, feedback al cierre).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import Optional

from core.security import get_current_user
from models.user import User
from services.elevenlabs import synth, TUTOR_VOICES, VOICE_META, voice_for_tutor, TutorKey

router = APIRouter()


@router.get("/voices")
async def list_tutor_voices(
    _: User = Depends(get_current_user),
):
    """Devuelve el catálogo de voces disponibles con metadata."""
    return [
        {
            "tutor_key": tutor,
            "voice_id": vid,
            "name": VOICE_META.get(vid, {}).get("name", vid),
            "mood": VOICE_META.get(vid, {}).get("mood", ""),
        }
        for tutor, vid in TUTOR_VOICES.items()
    ]


@router.post("/sample")
async def synth_sample(
    text: str = Query(..., min_length=1, max_length=500),
    tutor: Optional[str] = Query(None, description="coach | sincerist | arcade | diagnostic"),
    voice_id: Optional[str] = Query(None),
    _: User = Depends(get_current_user),
):
    """Sintetiza `text` con la voz indicada y devuelve MP3 binario."""
    if tutor and tutor in TUTOR_VOICES:
        vid = voice_for_tutor(tutor)  # type: ignore[arg-type]
    elif voice_id:
        vid = voice_id
    else:
        vid = voice_for_tutor("coach")  # default

    try:
        audio = await synth(text, voice_id=vid)
    except Exception as e:
        raise HTTPException(500, f"Error TTS: {e}")
    return Response(content=audio, media_type="audio/mpeg")

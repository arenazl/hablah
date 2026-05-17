"""Transcripcion de audios via Groq Whisper.

Usado por el webhook de WhatsApp cuando llega una nota de voz / audio:
1. Baileys nos pasa la media_url (Cloudinary)
2. Bajamos los bytes
3. Los mandamos a Groq Whisper con prompt sesgado para argentino coloquial
4. Devolvemos el texto transcripto

Si falla cualquier paso, devolvemos None y el bot recibira el contenido original.
"""
from typing import Optional, Tuple
import httpx

from core.config import settings


GROQ_BASE = "https://api.groq.com/openai/v1"


# Prompt-sesgo para Whisper. Mejora reconocimiento de:
# - argentinismos comunes ("che", "boludo", "dale", "qué onda")
# - nombres propios habituales en charlas
# - dinero en pesos/dolares (sin signo $, con palabra)
# El prompt no se transcribe, solo orienta al modelo.
_BIAS_PROMPT = (
    "Conversacion casual en espanol argentino, voseo. Palabras frecuentes: "
    "che, dale, boludo, mira, escucha, onda, posta, bardo, copado, joda. "
    "Pesos pesos pesos, dolares dolares dolares. "
    "Ejemplo: che dale escuchame una cosa, posta, no jodas."
)


async def _download_audio(url: str) -> Optional[Tuple[bytes, str]]:
    """Descarga el audio desde la URL (Cloudinary) y devuelve (bytes, filename)."""
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
            # Inferir filename de la URL (Cloudinary suele guardar como .ogg / .oga / .mp3)
            ext = url.rsplit(".", 1)[-1].split("?")[0].lower() if "." in url else "ogg"
            if ext not in {"ogg", "oga", "mp3", "m4a", "wav", "webm", "opus"}:
                ext = "ogg"
            return r.content, f"audio.{ext}"
    except Exception as e:
        print(f"[transcribe] download error: {e}")
        return None


async def transcribe_audio_bytes(audio_bytes: bytes, filename: str = "audio.ogg") -> Optional[str]:
    """Transcribe bytes de audio directamente via Groq Whisper.

    Usado cuando el vendedor graba un audio desde el inbox para que el bot/Laura
    lo diga con su voz (voice clone flow).
    """
    if not settings.GROQ_API_KEY:
        print("[transcribe] GROQ_API_KEY no configurada, skip")
        return None

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "ogg"
    mime_map = {
        "ogg": "audio/ogg", "oga": "audio/ogg", "opus": "audio/ogg",
        "mp3": "audio/mpeg", "m4a": "audio/mp4",
        "wav": "audio/wav", "webm": "audio/webm",
    }
    mime = mime_map.get(ext, "audio/ogg")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {"file": (filename, audio_bytes, mime)}
            data = {
                "model": settings.GROQ_WHISPER_MODEL,
                "language": "es",
                "prompt": _BIAS_PROMPT,
                "response_format": "json",
                "temperature": "0",
            }
            r = await client.post(
                f"{GROQ_BASE}/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files=files,
                data=data,
            )
            r.raise_for_status()
            text = (r.json().get("text") or "").strip()
            return text or None
    except Exception as e:
        print(f"[transcribe] groq bytes error: {e}")
        return None


async def transcribe_audio_from_url(url: str) -> Optional[str]:
    """Transcribe una nota de voz de WhatsApp via Groq Whisper.

    Devuelve None si:
    - No esta configurado GROQ_API_KEY
    - Falla la descarga del audio
    - Falla la llamada a Groq

    En cualquier caso, no rompe el flujo del webhook: el bot recibira el
    texto que tenga el mensaje (placeholder o vacio).
    """
    if not settings.GROQ_API_KEY:
        print("[transcribe] GROQ_API_KEY no configurada, skip")
        return None

    media = await _download_audio(url)
    if media is None:
        return None
    audio_bytes, filename = media

    # Inferir mime apropiado
    ext = filename.rsplit(".", 1)[-1].lower()
    mime_map = {
        "ogg": "audio/ogg", "oga": "audio/ogg", "opus": "audio/ogg",
        "mp3": "audio/mpeg", "m4a": "audio/mp4",
        "wav": "audio/wav", "webm": "audio/webm",
    }
    mime = mime_map.get(ext, "audio/ogg")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {"file": (filename, audio_bytes, mime)}
            data = {
                "model": settings.GROQ_WHISPER_MODEL,
                "language": "es",
                "prompt": _BIAS_PROMPT,
                "response_format": "json",
                "temperature": "0",
            }
            r = await client.post(
                f"{GROQ_BASE}/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files=files,
                data=data,
            )
            r.raise_for_status()
            text = (r.json().get("text") or "").strip()
            return text or None
    except Exception as e:
        print(f"[transcribe] groq error: {e}")
        return None

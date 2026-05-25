"""Abstracción de motor de voz en tiempo real para Habláh.

Cualquier motor real (Gemini Live, OpenAI Realtime, pipeline Whisper+LLM+TTS)
implementa esta interfaz. El endpoint /api/voice/ws no sabe cuál motor está
activo — lo elige el ENV `VOICE_ENGINE` (default: gemini_live).

Protocolo del WS cliente↔backend (estable, no cambia entre engines):
  recv del cliente:
    { "type": "audio", "data": "<base64 PCM 16kHz mono>" }
    { "type": "end" }
  send al cliente:
    { "type": "audio", "data": "<base64 PCM 24kHz mono>" }
    { "type": "transcript", "who": "ai"|"user", "text": "..." }
    { "type": "turn_complete" }
    { "type": "error", "error": "..." }

Para sumar un engine nuevo:
  1. Crear archivo services/voice_engines/<nombre>.py con clase que herede VoiceEngine.
  2. Registrarlo en VOICE_ENGINES dict abajo.
  3. Setear VOICE_ENGINE=<nombre> en .env.
"""
from __future__ import annotations

import abc
import os
from typing import Optional, AsyncIterator

from fastapi import WebSocket


class VoiceEngineContext:
    """Contexto inyectado en cada sesión (mismo para todo engine).

    Incluye config del template para que el engine pueda ajustar VAD,
    permisos de interrupción, etc.
    """

    def __init__(
        self,
        *,
        session_id: int,
        user_id: int,
        super_prompt: str,
        voice_id: Optional[str],
        language: str,
        target_language: str,
        silence_tolerance_ms: int = 800,
        interruption_allowed: bool = False,
        template_id: Optional[int] = None,
        is_kid: bool = False,
        user_name: Optional[str] = None,
    ) -> None:
        self.session_id = session_id
        self.user_id = user_id
        self.template_id = template_id  # para detector admin (modo evolutivo)
        self.is_kid = is_kid  # kids siempre tienen barge-in + watchdog mas agresivo
        self.user_name = user_name or ""
        self.super_prompt = super_prompt
        self.voice_id = voice_id  # ElevenLabs voice_id (para engines que lo soporten)
        self.language = language
        self.target_language = target_language
        self.silence_tolerance_ms = silence_tolerance_ms
        # Kids: ALWAYS interruptible. Adults: respetar config del template.
        self.interruption_allowed = True if is_kid else interruption_allowed


class VoiceEngine(abc.ABC):
    """Interfaz que TODO motor de voz en vivo debe implementar."""

    name: str = "abstract"

    @abc.abstractmethod
    async def run(self, ws: WebSocket, ctx: VoiceEngineContext) -> AsyncIterator[dict]:
        """Procesa el WS bidireccional. Devuelve los mensajes que se persisten
        en sessions.transcript al cierre.
        """
        ...


# ─── Registry ──────────────────────────────────────────────────────────────
# Lazy import para evitar cargar deps si no se usa el engine.
def get_engine(name: Optional[str] = None) -> VoiceEngine:
    engine_name = name or os.environ.get("VOICE_ENGINE", "gemini_live")

    if engine_name == "gemini_live":
        from services.voice_engines.gemini_live_engine import GeminiLiveEngine
        return GeminiLiveEngine()

    if engine_name == "elevenlabs_pipeline":
        from services.voice_engines.elevenlabs_pipeline_engine import ElevenLabsPipelineEngine
        return ElevenLabsPipelineEngine()

    raise ValueError(f"VoiceEngine desconocido: {engine_name}")


def available_engines() -> list[str]:
    return ["gemini_live", "elevenlabs_pipeline"]

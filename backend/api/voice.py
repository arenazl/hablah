from fastapi import APIRouter, WebSocket, Query

from services.gemini_live import voice_proxy

router = APIRouter()


@router.websocket("/ws")
async def voice_ws(
    websocket: WebSocket,
    session_id: int = Query(...),
    token: str = Query(...),
):
    """WebSocket bidireccional para conversación en vivo con Gemini Live.

    Cliente debe pasar session_id (creado por POST /api/sessions/start) + token JWT.
    """
    await websocket.accept()
    await voice_proxy(websocket, session_id, token)

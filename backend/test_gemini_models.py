"""Testea qué modelos de Gemini Live aceptan responseModalities=TEXT en AI Studio.
Correr: heroku run python test_gemini_models.py --app hablah-api
"""
import asyncio
import json
import os
import websockets

API_KEY = os.environ["GEMINI_API_KEY"]
BASE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"

CANDIDATES = [
    "models/gemini-2.0-flash-live-001",
    "models/gemini-live-2.0-flash-001",
    "models/gemini-2.5-flash-live-preview",
    "models/gemini-2.5-flash-preview-native-audio-dialog",
    "models/gemini-2.5-flash-exp-native-audio-thinking-dialog",
    "models/gemini-2.5-flash-native-audio-preview-09-2025",
]

async def test_model(model: str) -> str:
    url = f"{BASE_URL}?key={API_KEY}"
    setup = {
        "setup": {
            "model": model,
            "generationConfig": {"responseModalities": ["TEXT"]},
        }
    }
    try:
        async with websockets.connect(url, max_size=2**24, open_timeout=8) as ws:
            await ws.send(json.dumps(setup))
            msg = await asyncio.wait_for(ws.recv(), timeout=6)
            data = json.loads(msg)
            if "setupComplete" in data:
                return "OK - soporta TEXT"
            return f"RESP inesperada: {str(data)[:120]}"
    except websockets.ConnectionClosedError as e:
        return f"CLOSED {e.code}: {str(e.reason)[:120]}"
    except Exception as e:
        return f"ERROR: {str(e)[:120]}"

async def main():
    for model in CANDIDATES:
        result = await test_model(model)
        print(f"{model}\n  → {result}\n")

asyncio.run(main())

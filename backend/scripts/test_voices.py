"""Test rapido: que voces prebuilt acepta gemini-3.1-flash-live-preview (AI Studio).

Conecta al WS de Live API con cada voz candidata, manda el setup y ve si Gemini
responde setupComplete (OK) o cierra con 1007 (voz invalida). Sin microfono.

Uso: GEMINI_API_KEY=... python scripts/test_voices.py
"""
import asyncio
import json
import os

import websockets

API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = "models/gemini-3.1-flash-live-preview"
URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
    f"?key={API_KEY}"
)
VOICES = ["Puck", "Charon", "Kore", "Fenrir", "Aoede", "Leda", "Orus", "Zephyr"]


async def test_voice(v: str) -> tuple[str, str, str]:
    setup = {
        "setup": {
            "model": MODEL,
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": v}}},
            },
        }
    }
    try:
        async with websockets.connect(URL, max_size=2**24) as ws:
            await ws.send(json.dumps(setup))
            msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
            txt = msg.decode() if isinstance(msg, bytes) else str(msg)
            ok = "setupComplete" in txt
            return v, "OK" if ok else "?", txt[:70]
    except Exception as e:
        return v, "FAIL", str(e)[:110]


async def main() -> None:
    if not API_KEY:
        print("Falta GEMINI_API_KEY")
        return
    for v in VOICES:
        name, status, detail = await test_voice(v)
        print(f"{name:10} {status:5} {detail}")


if __name__ == "__main__":
    asyncio.run(main())

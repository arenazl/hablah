"""Verifica que Gemini Live (3.1) acepta los cambios de config propuestos:
  - activityHandling: NO_INTERRUPTION  (vs START_OF_ACTIVITY_INTERRUPTS)
  - thinkingConfig.thinkingBudget: 1024 (vs 0)

Manda cada variante de setup y reporta si responde setupComplete (OK) o cierra
con 1007 (valor invalido). Sin microfono.

Uso: GEMINI_API_KEY=... python scripts/test_setup.py
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


def base_setup(activity_handling: str, thinking_budget):
    gen = {"responseModalities": ["AUDIO"]}
    if thinking_budget is not None:
        gen["thinkingConfig"] = {"thinkingBudget": thinking_budget}
    return {
        "setup": {
            "model": MODEL,
            "generationConfig": gen,
            "realtimeInputConfig": {
                "automaticActivityDetection": {"disabled": False},
                "activityHandling": activity_handling,
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
        }
    }


async def probe(label: str, setup: dict) -> None:
    try:
        async with websockets.connect(URL, max_size=2**24) as ws:
            await ws.send(json.dumps(setup))
            msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
            txt = msg.decode() if isinstance(msg, bytes) else str(msg)
            ok = "setupComplete" in txt
            print(f"{label:55} {'OK' if ok else 'REJECT'}  {txt[:90]}")
    except Exception as e:
        print(f"{label:55} FAIL  {str(e)[:110]}")


async def main() -> None:
    if not API_KEY:
        print("Falta GEMINI_API_KEY")
        return
    await probe("activityHandling=NO_INTERRUPTION", base_setup("NO_INTERRUPTION", None))
    await probe("activityHandling=START_OF_ACTIVITY_INTERRUPTS", base_setup("START_OF_ACTIVITY_INTERRUPTS", None))
    await probe("thinkingBudget=1024", base_setup("NO_INTERRUPTION", 1024))
    await probe("thinkingBudget=512", base_setup("NO_INTERRUPTION", 512))
    await probe("thinkingBudget=-1 (dynamic)", base_setup("NO_INTERRUPTION", -1))


if __name__ == "__main__":
    asyncio.run(main())

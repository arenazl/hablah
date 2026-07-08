"""Probe: pinga cada modelo candidato de alumno (Ollama Cloud) con un hello y reporta
si responde, latencia y un recorte de la respuesta. Sirve para descartar modelos fantasma
ANTES de armar el cruce de alumnos. No toca BD ni motor.

Uso: python scripts/_probe_students.py
"""
from __future__ import annotations
import asyncio
import os
import time

try:
    import sys
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
import httpx

_KEY = open(os.path.join(os.path.dirname(__file__), "..", ".ollama_key")).read().strip()

CANDIDATES = [
    # sobrevivientes/candidatos tras la primera pasada (saco 403-sub, 410-retired, 404-inexistentes)
    "gpt-oss:120b", "gpt-oss:20b", "minimax-m3", "ministral-3:8b", "devstral-small-2:24b",
    "deepseek-v3.1:671b", "mistral-large-3:675b", "nemotron-3-nano:30b",
    "qwen3-coder:480b", "llama3.3:70b", "glm-4.6", "qwen2.5:72b",
    "gemma3:27b", "gemma3:4b",
]


async def _ping(model):
    body = {"model": model, "messages": [{"role": "user", "content": "Say hi in 3 words."}], "stream": False}
    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post("https://ollama.com/api/chat",
                             headers={"Authorization": f"Bearer {_KEY}"}, json=body)
            dt = time.monotonic() - t0
            if r.status_code != 200:
                return (model, "ERR", round(dt, 1), f"HTTP {r.status_code}: {r.text[:80]}")
            d = r.json()
            txt = (d.get("message", {}) or {}).get("content", "")
            if txt:
                return (model, "OK", round(dt, 1), txt.strip().replace("\n", " ")[:60])
            return (model, "EMPTY", round(dt, 1), str(d)[:80])
    except Exception as e:
        return (model, "EXC", round(time.monotonic() - t0, 1), f"{type(e).__name__}: {str(e)[:60]}")


async def main():
    seen = list(dict.fromkeys(CANDIDATES))  # dedup preservando orden
    seq = "--seq" in sys.argv
    if seq:
        # SECUENCIAL: Ollama Cloud free tier rebota concurrencia con 429. De a uno + delay
        # mide existencia/latencia real sin saturar.
        print(f"Probando {len(seen)} modelos SECUENCIAL (delay 2s) contra Ollama Cloud...\n")
        results = []
        for m in seen:
            results.append(await _ping(m))
            await asyncio.sleep(2)
    else:
        print(f"Probando {len(seen)} modelos EN PARALELO contra Ollama Cloud...\n")
        results = await asyncio.gather(*[_ping(m) for m in seen])
    ok = [r for r in results if r[1] == "OK"]
    bad = [r for r in results if r[1] != "OK"]
    print("=== RESPONDEN (usables como alumno) ===")
    for m, st, dt, sample in sorted(ok, key=lambda x: x[2]):
        print(f"  OK   {dt:>5}s  {m:<26} | {sample}")
    print("\n=== NO RESPONDEN ===")
    for m, st, dt, sample in bad:
        print(f"  {st:<5}{dt:>5}s  {m:<26} | {sample}")
    print(f"\nUsables: {len(ok)}/{len(seen)}")


if __name__ == "__main__":
    asyncio.run(main())

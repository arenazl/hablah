"""Sweep de latencia en Heroku variando los knobs de Gemini (silence_ms del VAD +
thinking budget), con habla real. El host no mueve la aguja (ya medido); acá buscamos
cuánto baja la latencia real cada palanca. Mismo clip en todos los combos. Persiste en
infra_test_result (server = nombre del combo) para verlo en /infra.
"""
import asyncio
import base64
import json
import os
import ssl
import struct
import time
import urllib.request
import wave

import websockets

BASE = "wss://hablah-api-abcaf6c43a5d.herokuapp.com/api/voice/ws_llm_test?age_group=mini&level=A0&voice=Aoede"
RESULT_URL = "https://hablah-api-abcaf6c43a5d.herokuapp.com/api/motor/infra-result"
TARGET = 10          # 10 turnos MEDIDOS por combo (robusto vs microcortes)
PER_SESSION = 7      # turnos por sesión WS (1 descartado + ~6); evita el límite ~90s de Gemini
MAX_SESSIONS = 4     # reconexiones máximas por combo
RESP_TIMEOUT = 18
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

# (nombre, silence_ms, thinking)
CONFIGS = [
    ("baseline_s500_t256", 500, 256),
    ("sil300_t256", 300, 256),
    ("sil150_t256", 150, 256),
    ("sil500_t0", 500, 0),
    ("fast_s150_t0", 150, 0),
]

_WAV = os.path.join(os.path.dirname(__file__), "test_speech.wav")
_w = wave.open(_WAV)
SR = _w.getframerate()
_frames = _w.readframes(_w.getnframes())
_all = list(struct.unpack("<%dh" % (len(_frames) // 2), _frames))
_w.close()
VOICE = _all[:int(SR * 2.5)]
SILENCE = [0] * int(SR * 1.3)


def _b64(s):
    return base64.b64encode(struct.pack("<%dh" % len(s), *s)).decode()


def _chunks(arr, n=2048):
    for i in range(0, len(arr), n):
        yield arr[i:i + n]


def _post(server, turn_index, rtt_ms, ok):
    body = json.dumps({"server": server, "turn_index": turn_index, "rtt_ms": rtt_ms, "ok": ok}).encode()
    try:
        urllib.request.urlopen(urllib.request.Request(RESULT_URL, data=body, headers={"Content-Type": "application/json"}, method="POST"), context=CTX, timeout=15).read()
    except Exception:
        pass


async def _send(ws, samples):
    for c in _chunks(samples):
        await ws.send(json.dumps({"type": "audio", "data": _b64(c), "sample_rate": SR}))
        await asyncio.sleep(2048 / SR)


async def _wait_complete(ws, timeout):
    end = time.time() + timeout
    got = False
    while time.time() < end:
        try:
            m = await asyncio.wait_for(ws.recv(), timeout=2)
        except asyncio.TimeoutError:
            if got:
                return
            continue
        if isinstance(m, str) and m.startswith("{"):
            ty = json.loads(m).get("type")
            if ty == "audio":
                got = True
            elif ty == "turn_complete":
                return


async def _turn(ws):
    await _send(ws, VOICE)
    t0 = time.time(); rtt = None
    await _send(ws, SILENCE)
    end = time.time() + RESP_TIMEOUT
    while time.time() < end:
        try:
            m = await asyncio.wait_for(ws.recv(), timeout=2)
        except asyncio.TimeoutError:
            if rtt is not None:
                break
            continue
        if isinstance(m, str) and m.startswith("{"):
            ty = json.loads(m).get("type")
            if ty == "audio" and rtt is None:
                rtt = int((time.time() - t0) * 1000)
            elif ty == "turn_complete" and rtt is not None:
                break
    return rtt


def _stats(vals):
    v = sorted(vals)
    if not v:
        return None
    pct = lambda p: v[min(len(v) - 1, int(p * len(v)))]
    return {"n": len(v), "min": v[0], "max": v[-1], "p50": pct(0.5), "avg": round(sum(v) / len(v))}


async def run_config(name, silence_ms, thinking):
    url = f"{BASE}&silence_ms={silence_ms}&thinking={thinking}"
    rtts, fails, sessions = [], 0, 0
    print(f"\n=== {name} (silence_ms={silence_ms}, thinking={thinking}) ===")
    while len(rtts) < TARGET and sessions < MAX_SESSIONS:
        sessions += 1
        try:
            async with websockets.connect(url, max_size=None) as ws:
                await _wait_complete(ws, 10)      # saludo de apertura (se ignora)
                first = True
                for _ in range(PER_SESSION):
                    if len(rtts) >= TARGET:
                        break
                    rtt = await _turn(ws)
                    if first:                     # descartar el 1ro de cada (re)conexión = cold
                        first = False
                        await _wait_complete(ws, 4); await asyncio.sleep(0.4); continue
                    if rtt is None:
                        fails += 1
                    else:
                        rtts.append(rtt)
                    _post(name, len(rtts), rtt, rtt is not None)
                    print(f"  [{len(rtts)}/{TARGET}] {rtt if rtt is not None else 'SIN RESP'} ms")
                    await _wait_complete(ws, 4); await asyncio.sleep(0.4)
        except Exception as e:
            print(f"  (reconexión tras {type(e).__name__})")
    return name, silence_ms, thinking, _stats(rtts), fails


async def main():
    print(f"clip {len(VOICE)/SR:.1f}s habla @ {SR}Hz · {TARGET} turnos medidos/combo · Heroku")
    rows = []
    for name, s, t in CONFIGS:
        try:
            rows.append(await run_config(name, s, t))
        except Exception as e:
            print(f"  {name}: ERROR {type(e).__name__}: {str(e)[:80]}")
            rows.append((name, s, t, None, TURNS - 1))
    print("\n================ RESUMEN (ms) ================")
    print(f"{'combo':22} {'sil':>4} {'think':>5} {'n':>3} {'p50':>6} {'avg':>6} {'min':>6} {'max':>6} {'fail':>5}")
    for name, s, t, st, fails in rows:
        if st:
            print(f"{name:22} {s:>4} {t:>5} {st['n']:>3} {st['p50']:>6} {st['avg']:>6} {st['min']:>6} {st['max']:>6} {fails:>5}")
        else:
            print(f"{name:22} {s:>4} {t:>5}  sin datos {fails:>5}")


if __name__ == "__main__":
    asyncio.run(main())

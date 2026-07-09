"""Prueba de latencia del motor real: Heroku vs Cloud Run, desde esta máquina (mismo
punto de red que el navegador del usuario). Usa HABLA REAL (test_speech.wav, generado con
el TTS de Windows) idéntica en los dos hosts. Pasa por el WS real (/voice/ws_llm_test):
audio -> STT de Gemini -> prompt del motor -> respuesta. Mide fin-de-voz -> primer audio.
Consume el saludo de apertura, descarta el turno #1, espera turn_complete entre turnos.
Persiste en infra_test_result (se ve en /infra) + imprime el resumen.
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

HOSTS = {
    "heroku": "wss://hablah-api-abcaf6c43a5d.herokuapp.com/api",
    "gcloud": "wss://hablah-api-test-233354572460.us-central1.run.app/api",
}
WS_PATH = "/voice/ws_llm_test?age_group=mini&level=A0&voice=Aoede"
RESULT_URL = "https://hablah-api-abcaf6c43a5d.herokuapp.com/api/motor/infra-result"
TURNS = 6            # se descarta el #1 -> 5 medidos
RESP_TIMEOUT = 18
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

_WAV = os.path.join(os.path.dirname(__file__), "test_speech.wav")
_w = wave.open(_WAV)
SR = _w.getframerate()
_frames = _w.readframes(_w.getnframes())
_all = list(struct.unpack("<%dh" % (len(_frames) // 2), _frames))
_w.close()
VOICE = _all[:int(SR * 3.5)]          # recorte a 3.5s
SILENCE = [0] * int(SR * 1.3)         # cola que dispara el VAD


def _b64(samples):
    return base64.b64encode(struct.pack("<%dh" % len(samples), *samples)).decode()


def _chunks(arr, n=2048):
    for i in range(0, len(arr), n):
        yield arr[i:i + n]


def _post(server, turn_index, rtt_ms, ok):
    body = json.dumps({"server": server, "turn_index": turn_index, "rtt_ms": rtt_ms, "ok": ok}).encode()
    req = urllib.request.Request(RESULT_URL, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        urllib.request.urlopen(req, context=CTX, timeout=15).read()
    except Exception:
        pass


async def _send(ws, samples):
    for c in _chunks(samples):
        await ws.send(json.dumps({"type": "audio", "data": _b64(c), "sample_rate": SR}))
        await asyncio.sleep(2048 / SR)


async def _wait_complete(ws, timeout):
    """Drena hasta turn_complete (coach terminó) o timeout. Devuelve True si llegó audio."""
    end = time.time() + timeout
    got = False
    while time.time() < end:
        try:
            m = await asyncio.wait_for(ws.recv(), timeout=2)
        except asyncio.TimeoutError:
            if got:
                return got
            continue
        if isinstance(m, str) and m.startswith("{"):
            ty = json.loads(m).get("type")
            if ty == "audio":
                got = True
            elif ty == "turn_complete":
                return got
    return got


async def _turn(ws):
    """Manda habla + cola de silencio, devuelve rtt_ms (fin de voz -> primer audio) o None."""
    await _send(ws, VOICE)
    t0 = time.time()
    rtt = None
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
    return {"n": len(v), "min": v[0], "max": v[-1], "p50": pct(0.5), "p95": pct(0.95),
            "avg": round(sum(v) / len(v))}


async def run_host(key):
    url = HOSTS[key] + WS_PATH
    rtts, fails = [], 0
    print(f"\n=== {key} ===")
    async with websockets.connect(url, max_size=None) as ws:
        await _wait_complete(ws, 10)            # consumir saludo de apertura
        for turn in range(TURNS):
            rtt = await _turn(ws)
            if turn == 0:
                print(f"  turno 0 (descartado): {rtt} ms")
            else:
                if rtt is None:
                    fails += 1
                else:
                    rtts.append(rtt)
                _post(key, turn, rtt, rtt is not None)
                print(f"  turno {turn}: {rtt if rtt is not None else 'SIN RESPUESTA'} ms")
            await _wait_complete(ws, 4)          # asegurar que el coach terminó
            await asyncio.sleep(0.4)
    return key, _stats(rtts), fails


async def main():
    print(f"clip: {len(VOICE)/SR:.1f}s habla @ {SR}Hz + {len(SILENCE)/SR:.1f}s silencio · {TURNS-1} turnos medidos/host")
    results = {}
    for key in HOSTS:
        try:
            k, st, fails = await run_host(key)
            results[k] = (st, fails)
        except Exception as e:
            print(f"  {key}: ERROR {type(e).__name__}: {str(e)[:90]}")
            results[key] = (None, TURNS - 1)
    print("\n================ RESUMEN (ms) ================")
    print(f"{'host':10} {'n':>3} {'p50':>6} {'p95':>6} {'min':>6} {'max':>6} {'avg':>6} {'fallos':>7}")
    for k, (st, fails) in results.items():
        if st:
            print(f"{k:10} {st['n']:>3} {st['p50']:>6} {st['p95']:>6} {st['min']:>6} {st['max']:>6} {st['avg']:>6} {fails:>7}")
        else:
            print(f"{k:10} {'-':>3}  sin datos {fails:>7}")


if __name__ == "__main__":
    asyncio.run(main())

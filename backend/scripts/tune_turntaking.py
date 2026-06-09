"""Sweep AUTONOMO de settings de turn-taking contra Gemini Live.

Objetivo: encontrar la combinacion (silenceDurationMs x endOfSpeechSensitivity)
que da la conversacion mas fluida, MIDIENDO tiempos reales. Sin micrófono:
genera audio TTS, corre una mini-charla por cada combo, mide la latencia
percibida (dejar de hablar -> coach arranca) y si transcribio bien.

Metrica clave por turno:
  response_latency = t_first_coach_audio - t_voice_end
  (lo que el usuario percibe: deja de hablar -> escucha al coach)

Tambien registra:
  - transcribed: si Gemini emitio input_transcription (entendio al user)
  - empty_turn: turnComplete sin audio del coach (coach mudo)

Uso:
  cd backend && python scripts/tune_turntaking.py
  cd backend && python scripts/tune_turntaking.py --quick   # grid reducido

Requiere: gcloud auth, gtts, pydub, websockets, ffmpeg en PATH.
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

import websockets
from gtts import gTTS
from pydub import AudioSegment

VERTEX_REGION = "us-central1"
VERTEX_PROJECT = "hablah-prod"
LIVE_API_URL = (
    f"wss://{VERTEX_REGION}-aiplatform.googleapis.com/ws/"
    "google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent"
)
LIVE_MODEL = (
    f"projects/{VERTEX_PROJECT}/locations/{VERTEX_REGION}"
    "/publishers/google/models/gemini-live-2.5-flash-native-audio"
)
CHUNK = 1024          # bytes PCM por send
SR = 16000            # sample rate del audio de prueba (lo correcto para Gemini)

# Guion de conversacion LARGA: 12 frases naturales de un alumno de ingles.
# Conversacion de >=10 idas y vueltas para reproducir cortes/degradacion.
USER_TURNS = [
    "Hi! How are you today?",
    "I'm good. Yesterday I went to the park with my family.",
    "I played football with my friends there.",
    "After that, we ate some pizza together.",
    "My favorite food is pizza with lots of cheese.",
    "I also really like ice cream, especially chocolate.",
    "On weekends I usually watch movies at home.",
    "My favorite movie is about a little robot.",
    "I have a dog too. His name is Rocky.",
    "He likes to run and play with the ball.",
    "Sometimes we go to the beach together on Sundays.",
    "Thank you! This was a really fun chat today.",
]

# Para el test de "pausa de chico": dos pedazos que, juntos, son una frase.
# Entre medio simulamos la pausa que hace un nene mientras piensa. Si el VAD
# cierra el turno DURANTE la pausa, esta cortando al chico (false cutoff).
PAUSE_PARTS = ("I went to the park", "and I played with my dog")


def get_token() -> str:
    return subprocess.check_output(
        ["gcloud.cmd", "auth", "print-access-token"], text=True
    ).strip()


def _tts_pcm(text: str, idx: int) -> bytes:
    """Genera PCM 16k mono de una frase (cacheado en disco)."""
    raw = Path(f"_tt_turn{idx}.pcm")
    if raw.exists():
        return raw.read_bytes()
    tts = gTTS(text=text, lang="en", slow=False)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    buf.seek(0)
    seg = AudioSegment.from_file(buf, format="mp3")
    seg = seg.set_frame_rate(SR).set_channels(1).set_sample_width(2)
    raw.write_bytes(seg.raw_data)
    return seg.raw_data


def silence(seconds: float) -> bytes:
    return b"\x00\x00" * int(SR * seconds)


async def send_pcm(ws, pcm: bytes) -> None:
    for i in range(0, len(pcm), CHUNK):
        b64 = base64.b64encode(pcm[i : i + CHUNK]).decode("ascii")
        await ws.send(json.dumps({
            "realtimeInput": {"audio": {"mimeType": f"audio/pcm;rate={SR}", "data": b64}}
        }))
        await asyncio.sleep(0.02)  # ~realtime


@dataclass
class Combo:
    silence_ms: int
    end_sens: str  # "HIGH" | "LOW"


@dataclass
class TurnResult:
    response_latency_ms: float | None = None  # voz_end -> primer audio coach
    turn_complete_ms: float | None = None     # voz_end -> turnComplete
    transcribed: bool = False
    coach_audio_chunks: int = 0
    user_text: str = ""
    ws_closed: bool = False                    # Gemini cerro el WS en este turno
    closed_code: int | None = None


@dataclass
class ComboResult:
    combo: Combo
    turns: list[TurnResult] = field(default_factory=list)
    error: str = ""


async def open_session(token: str, combo: Combo):
    ws = await websockets.connect(
        LIVE_API_URL, max_size=2**24,
        extra_headers={"Authorization": f"Bearer {token}"},
    )
    setup = {
        "setup": {
            "model": LIVE_MODEL,
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}},
            },
            "realtimeInputConfig": {
                "automaticActivityDetection": {
                    "disabled": False,
                    "startOfSpeechSensitivity": "START_SENSITIVITY_HIGH",
                    "endOfSpeechSensitivity": f"END_SENSITIVITY_{combo.end_sens}",
                    "prefixPaddingMs": 200,
                    "silenceDurationMs": combo.silence_ms,
                },
                "activityHandling": "START_OF_ACTIVITY_INTERRUPTS",
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
            "systemInstruction": {"parts": [{"text": (
                "You are a friendly, concise English tutor. Keep replies short "
                "(one or two sentences). Greet briefly, then converse."
            )}]},
        }
    }
    await ws.send(json.dumps(setup))
    await asyncio.wait_for(ws.recv(), timeout=10.0)  # setupComplete
    # Greeting trigger (no lo medimos, solo lo consumimos)
    await ws.send(json.dumps({
        "clientContent": {"turns": [{"role": "user", "parts": [{"text": "."}]}], "turnComplete": True}
    }))
    await _drain_until_turn_complete(ws, timeout=15.0)
    return ws


async def _drain_until_turn_complete(ws, timeout: float) -> None:
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout
    while True:
        rem = deadline - loop.time()
        if rem <= 0:
            return
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=rem)
        except (asyncio.TimeoutError, websockets.ConnectionClosed):
            return
        try:
            sc = json.loads(raw).get("serverContent") or {}
        except Exception:
            continue
        if sc.get("turnComplete"):
            return


async def run_turn(ws, pcm: bytes, combo: Combo) -> TurnResult:
    """Manda una frase + silencio continuo y mide cuanto tarda el coach."""
    loop = asyncio.get_event_loop()
    res = TurnResult()
    await send_pcm(ws, pcm)
    t_voice_end = loop.time()

    done = asyncio.Event()

    async def silence_sender():
        # Mandamos hasta (silence_ms + 4s) de silencio para que el VAD dispare.
        total = combo.silence_ms / 1000.0 + 4.0
        sent = 0.0
        step = 0.1
        try:
            while sent < total and not done.is_set():
                await ws.send(json.dumps({
                    "realtimeInput": {"audio": {"mimeType": f"audio/pcm;rate={SR}",
                                                "data": base64.b64encode(silence(step)).decode("ascii")}}
                }))
                await asyncio.sleep(0.02)
                sent += step
        except websockets.ConnectionClosed:
            pass  # el reader registra el cierre

    async def reader():
        deadline = loop.time() + combo.silence_ms / 1000.0 + 18.0
        while True:
            rem = deadline - loop.time()
            if rem <= 0:
                return
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=rem)
            except asyncio.TimeoutError:
                return
            except websockets.ConnectionClosed as e:
                res.ws_closed = True
                res.closed_code = getattr(e, "code", None)
                res.user_text = res.user_text or f"[ws_closed {e.code}]"
                done.set()
                return
            try:
                sc = json.loads(raw).get("serverContent") or {}
            except Exception:
                continue
            for cand in ("inputTranscription", "inputAudioTranscription"):
                v = sc.get(cand)
                if isinstance(v, dict) and v.get("text"):
                    res.transcribed = True
                    res.user_text += v["text"]
            mt = sc.get("modelTurn") or {}
            for part in mt.get("parts", []):
                if (part.get("inlineData") or {}).get("mimeType", "").startswith("audio"):
                    res.coach_audio_chunks += 1
                    if res.response_latency_ms is None:
                        res.response_latency_ms = (loop.time() - t_voice_end) * 1000
            if sc.get("turnComplete"):
                res.turn_complete_ms = (loop.time() - t_voice_end) * 1000
                done.set()
                return

    await asyncio.gather(silence_sender(), reader())
    return res


async def run_combo(token: str, combo: Combo, pcms: list[bytes]) -> ComboResult:
    cr = ComboResult(combo=combo)
    try:
        ws = await open_session(token, combo)
    except Exception as e:
        cr.error = f"open_session: {type(e).__name__}: {e}"
        return cr
    try:
        for pcm in pcms:
            tr = await run_turn(ws, pcm, combo)
            cr.turns.append(tr)
            if tr.ws_closed:
                break  # Gemini cerro la sesion -> conversacion cortada
            await asyncio.sleep(0.3)
    except Exception as e:
        cr.error = f"run_turn: {type(e).__name__}: {e}"
    finally:
        try:
            await ws.close()
        except Exception:
            pass
    return cr


async def run_pause_probe(token: str, silence_ms: int, pause_ms: int,
                          pcm_a: bytes, pcm_b: bytes) -> bool:
    """Simula un chico que dice media frase, PAUSA pause_ms (piensa), y sigue.
    Devuelve True si el VAD cerro el turno DURANTE la pausa (cortó al chico)."""
    combo = Combo(silence_ms, "HIGH")
    loop = asyncio.get_event_loop()
    ws = await open_session(token, combo)
    cut = False
    try:
        await send_pcm(ws, pcm_a)
        done = asyncio.Event()

        async def sender():
            sent, step = 0.0, 0.1
            try:
                while sent < pause_ms / 1000.0 and not done.is_set():
                    await ws.send(json.dumps({"realtimeInput": {"audio": {
                        "mimeType": f"audio/pcm;rate={SR}",
                        "data": base64.b64encode(silence(step)).decode("ascii")}}}))
                    await asyncio.sleep(0.02)
                    sent += step
            except websockets.ConnectionClosed:
                pass

        async def reader():
            nonlocal cut
            end = loop.time() + pause_ms / 1000.0 + 0.6
            while loop.time() < end and not done.is_set():
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=max(0.01, end - loop.time()))
                except (asyncio.TimeoutError, websockets.ConnectionClosed):
                    return
                try:
                    sc = json.loads(raw).get("serverContent") or {}
                except Exception:
                    continue
                if sc.get("turnComplete"):
                    cut = True
                    done.set()
                    return

        await asyncio.gather(sender(), reader())
        return cut
    finally:
        try:
            await ws.close()
        except Exception:
            pass


async def pause_matrix(token: str) -> None:
    """Matriz silence x pausa-de-chico: marca cuando el VAD corta al chico."""
    a = _tts_pcm(PAUSE_PARTS[0], 90)
    b = _tts_pcm(PAUSE_PARTS[1], 91)
    silences = [700, 1000, 1300, 1600, 2000]
    pauses = [500, 800, 1100, 1400]  # pausa de un chico pensando
    print(f"[pause-test] frase partida: '{PAUSE_PARTS[0]}' <PAUSA> '{PAUSE_PARTS[1]}'")
    print("            'CORTA' = el coach interrumpio al chico en su pausa\n")
    print("  silence \\ pausa | " + " ".join(f"{p}ms".center(7) for p in pauses))
    print("  " + "-" * 60)
    for s in silences:
        cells = []
        for p in pauses:
            try:
                cut = await run_pause_probe(token, s, p, a, b)
                cells.append("CORTA" if cut else "ok")
            except Exception as e:
                cells.append(f"err")
            await asyncio.sleep(1.0)
        print(f"  {s:>5}ms        | " + " ".join(c.center(7) for c in cells))
    print("\n  Lectura: el silence debe ser MAYOR que la pausa tipica del chico")
    print("  para no cortarlo. Mini (4-7) pausa ~800-1400ms; Tween menos.")


def _avg_lat(cr: ComboResult) -> float | None:
    lats = [t.response_latency_ms for t in cr.turns if t.response_latency_ms]
    return (sum(lats) / len(lats)) if lats else None


def fmt_combo_row(cr: ComboResult, total_turns: int) -> str:
    c = cr.combo
    if cr.error:
        return f"  sil={c.silence_ms:<5} end={c.end_sens:<4} | ERROR: {cr.error[:60]}"
    trans = sum(1 for t in cr.turns if t.transcribed)
    empty = sum(1 for t in cr.turns if t.turn_complete_ms and t.coach_audio_chunks == 0)
    cut = next((i + 1 for i, t in enumerate(cr.turns) if t.ws_closed), None)
    avg = _avg_lat(cr)
    avg_str = f"{avg/1000:.2f}s" if avg else "  -  "
    lat_str = " ".join(f"{(t.response_latency_ms or 0)/1000:.1f}" for t in cr.turns)
    completed = len([t for t in cr.turns if not t.ws_closed])
    cut_str = f"CORTO en turno {cut} (code {cr.turns[cut-1].closed_code})" if cut else f"llego a {completed}/{total_turns} OK"
    return (f"  sil={c.silence_ms:<5} end={c.end_sens:<4} | avg={avg_str} | "
            f"transcrito={trans}/{len(cr.turns)} | mudos={empty} | {cut_str}\n"
            f"          latencias(s): {lat_str}")


async def main() -> None:
    quick = "--quick" in sys.argv
    token = get_token()
    print(f"[auth] token len={len(token)}")
    if "--pause" in sys.argv:
        await pause_matrix(token)
        return
    all_pcms = [_tts_pcm(t, i) for i, t in enumerate(USER_TURNS)]
    print(f"[audio] {len(all_pcms)} frases generadas a {SR}Hz")

    if quick:
        pcms = all_pcms[:4]
        silences = [600, 1500]
    else:
        pcms = all_pcms  # conversacion LARGA (12 turnos)
        # Grid enfocado en KIDS: del fluido (700) al actual de kids (2000).
        silences = [700, 1100, 1500, 2000]
    sens = ["HIGH"]
    combos = [Combo(s, e) for e in sens for s in silences]
    print(f"[sweep KIDS] {len(combos)} combos x conversacion de {len(pcms)} turnos\n")

    results: list[ComboResult] = []
    for i, combo in enumerate(combos):
        print(f"[{i+1}/{len(combos)}] sil={combo.silence_ms} end={combo.end_sens} (conversacion de {len(pcms)} turnos)...", flush=True)
        cr = await run_combo(token, combo, pcms)
        print(fmt_combo_row(cr, len(pcms)), flush=True)
        results.append(cr)
        await asyncio.sleep(1.5)  # gap anti rate-limit

    print("\n" + "=" * 78)
    print(f"RESUMEN KIDS — conversacion de {len(pcms)} idas y vueltas por setting")
    print("=" * 78)
    for cr in results:
        print(fmt_combo_row(cr, len(pcms)))
    # Mejor = menor latencia promedio entre los que NO cortaron y transcribieron todo
    full = [r for r in results if not r.error
            and not any(t.ws_closed for t in r.turns)
            and sum(1 for t in r.turns if t.transcribed) == len(r.turns)
            and all(t.coach_audio_chunks > 0 for t in r.turns)]
    if full:
        best = min(full, key=lambda r: _avg_lat(r) or 9e9)
        print(f"\n>>> MEJOR PARA KIDS: silenceDurationMs={best.combo.silence_ms} "
              f"(avg {(_avg_lat(best) or 0)/1000:.2f}s, aguanto los {len(pcms)} turnos sin cortar, "
              f"transcribio todo, sin mudos)")
    else:
        print("\nNingun setting completo la conversacion entera limpia. Ver tabla: "
              "si TODOS cortan al mismo turno, el corte NO es por el setting (es pipeline/red).")


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())

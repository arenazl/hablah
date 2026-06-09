"""Test E2E directo contra Vertex Live API (sin pasar por Hablah).

Soporta 3 escenarios via CLI arg:

  A) python scripts/test_vertex_live_direct.py A
     voz + 2s silencio. Coach deberia contestar.
     Espera: input_transcription llega, 1 turn.complete del coach.

  B) python scripts/test_vertex_live_direct.py B
     voz + 20s silencio continuo SIN parar. Simula el bug pre-fix.
     Espera: turn-end fantasma (turn.complete sin input previo).

  C) python scripts/test_vertex_live_direct.py C
     voz + 1.5s silencio + STOP (cierre limpio). Simula el fix.
     Espera: input_transcription llega, UN turn.complete del coach,
             NO hay segundo turn.complete fantasma.

Sin arg corre los 3 secuencialmente.

Requiere:
  - gcloud auth (token via `gcloud auth print-access-token`)
  - gtts + pydub + websockets
  - ffmpeg en PATH
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
from typing import Optional

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
TEST_TEXT = "Hello, can you tell me what you think about Formula 1?"
WAV_PATH = Path("test_input.wav")
RAW_PCM_PATH = Path("test_input.pcm")
CHUNK = 1024  # bytes por chunk PCM


# ---------------------------------------------------------------------------
# Helpers de audio / auth
# ---------------------------------------------------------------------------
def get_token() -> str:
    out = subprocess.check_output(
        ["gcloud.cmd", "auth", "print-access-token"], text=True
    ).strip()
    return out


def generate_test_audio() -> bytes:
    """Genera test_input.wav 16kHz mono PCM. Devuelve bytes PCM."""
    if not RAW_PCM_PATH.exists():
        print(f"[gen] gTTS: '{TEST_TEXT}'")
        tts = gTTS(text=TEST_TEXT, lang="en", slow=False)
        mp3_buf = io.BytesIO()
        tts.write_to_fp(mp3_buf)
        mp3_buf.seek(0)
        audio = AudioSegment.from_file(mp3_buf, format="mp3")
        audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
        audio.export(WAV_PATH, format="wav")
        with open(RAW_PCM_PATH, "wb") as f:
            f.write(audio.raw_data)
        print(f"[gen] wav={WAV_PATH} ({len(audio)} ms, {len(audio.raw_data)} bytes PCM)")
    return RAW_PCM_PATH.read_bytes()


async def send_pcm(ws, pcm: bytes, label: str) -> None:
    for i in range(0, len(pcm), CHUNK):
        chunk = pcm[i : i + CHUNK]
        b64 = base64.b64encode(chunk).decode("ascii")
        msg = {
            "realtimeInput": {
                "audio": {"mimeType": "audio/pcm;rate=16000", "data": b64}
            }
        }
        await ws.send(json.dumps(msg))
        await asyncio.sleep(0.02)  # ~50 chunks/sec ~ realtime
    print(f"[{label}] sent {len(pcm)} bytes in {len(pcm)//CHUNK} chunks")


def silence_bytes(seconds: float) -> bytes:
    return b"\x00\x00" * int(16000 * seconds)


# ---------------------------------------------------------------------------
# Stats por escenario
# ---------------------------------------------------------------------------
@dataclass
class PhaseStats:
    name: str
    turn_completes: int = 0
    input_transcriptions: int = 0
    output_transcriptions: int = 0
    coach_audio_chunks: int = 0
    coach_text: list[str] = field(default_factory=list)
    user_text: list[str] = field(default_factory=list)
    ghost_turn_ends: int = 0  # turn.complete sin input previo
    interrupted_events: int = 0

    def summary(self) -> str:
        return (
            f"  turn_completes        = {self.turn_completes}\n"
            f"  input_transcriptions  = {self.input_transcriptions}\n"
            f"  output_transcriptions = {self.output_transcriptions}\n"
            f"  coach_audio_chunks    = {self.coach_audio_chunks}\n"
            f"  ghost_turn_ends       = {self.ghost_turn_ends}\n"
            f"  interrupted_events    = {self.interrupted_events}\n"
            f"  user_text             = {self.user_text}\n"
            f"  coach_text            = {(' '.join(self.coach_text))[:200]!r}"
        )


# ---------------------------------------------------------------------------
# Reader: consume eventos hasta cerrar la fase (timeout o turn.complete count)
# ---------------------------------------------------------------------------
async def consume_until(
    ws,
    stats: PhaseStats,
    *,
    timeout_s: float,
    stop_after_turn_completes: Optional[int] = None,
    stop_on_close: bool = False,
) -> None:
    """Lee del ws hasta:
       - timeout, o
       - alcanzar stop_after_turn_completes turn.complete, o
       - ws cerrado (si stop_on_close=True).
    """
    deadline = asyncio.get_event_loop().time() + timeout_s

    async def _read_one():
        remaining = deadline - asyncio.get_event_loop().time()
        if remaining <= 0:
            raise asyncio.TimeoutError()
        return await asyncio.wait_for(ws.recv(), timeout=remaining)

    while True:
        try:
            raw = await _read_one()
        except asyncio.TimeoutError:
            print(f"[{stats.name}] reader: timeout {timeout_s}s alcanzado")
            return
        except websockets.ConnectionClosed as e:
            print(f"[{stats.name}] ws closed: code={e.code} reason={e.reason!r}")
            if stop_on_close:
                return
            return

        try:
            data = json.loads(raw)
        except Exception:
            print(f"[{stats.name}][raw-non-json] {raw[:200]}")
            continue

        sc = data.get("serverContent")
        if not sc:
            continue

        # input transcription (lo que dijo el user)
        for cand in (
            "inputTranscription",
            "inputAudioTranscription",
            "input_audio_transcription",
            "input_transcription",
        ):
            val = sc.get(cand)
            if isinstance(val, dict) and val.get("text"):
                stats.input_transcriptions += 1
                stats.user_text.append(val["text"])
                print(f"[{stats.name}][input] {val['text']!r}")
                break

        # output transcription (lo que dice el coach en texto)
        ot = sc.get("outputTranscription")
        if isinstance(ot, dict) and ot.get("text"):
            stats.output_transcriptions += 1
            stats.coach_text.append(ot["text"])

        # modelTurn parts (audio + text)
        mt = sc.get("modelTurn") or {}
        for part in mt.get("parts", []):
            inline = part.get("inlineData") or {}
            if inline.get("mimeType", "").startswith("audio"):
                stats.coach_audio_chunks += 1
            if part.get("text"):
                stats.coach_text.append(part["text"])

        if sc.get("interrupted"):
            stats.interrupted_events += 1
            print(f"[{stats.name}][interrupted] event")

        if sc.get("turnComplete"):
            stats.turn_completes += 1
            # ghost = turn.complete pero no hubo input transcription antes
            # (excepto el primero que corresponde al greeting)
            print(
                f"[{stats.name}][turn-complete] #{stats.turn_completes} "
                f"input_so_far={stats.input_transcriptions} "
                f"coach_chunks={stats.coach_audio_chunks}"
            )
            if (
                stop_after_turn_completes is not None
                and stats.turn_completes >= stop_after_turn_completes
            ):
                return


# ---------------------------------------------------------------------------
# Setup + greeting (comun a los 3 escenarios)
# ---------------------------------------------------------------------------
async def open_session(token: str, scenario: str):
    print(f"[{scenario}][ws] connecting {LIVE_API_URL}")
    ws = await websockets.connect(
        LIVE_API_URL,
        max_size=2**24,
        extra_headers={"Authorization": f"Bearer {token}"},
    )
    setup = {
        "setup": {
            "model": LIVE_MODEL,
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}
                },
            },
            "realtimeInputConfig": {
                "automaticActivityDetection": {
                    "disabled": False,
                    "startOfSpeechSensitivity": "START_SENSITIVITY_HIGH",
                    "endOfSpeechSensitivity": "END_SENSITIVITY_HIGH",
                    "prefixPaddingMs": 200,
                    "silenceDurationMs": 1500,
                },
                "activityHandling": "START_OF_ACTIVITY_INTERRUPTS",
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
            "systemInstruction": {
                "parts": [
                    {
                        "text": (
                            "You are a friendly English tutor. The student is "
                            "practicing English. Greet them briefly, then engage "
                            "in conversation. Be warm and concise."
                        )
                    }
                ]
            },
        }
    }
    await ws.send(json.dumps(setup))
    first = await asyncio.wait_for(ws.recv(), timeout=10.0)
    print(f"[{scenario}][setup] reply: {first[:160]}")

    # Trigger greeting
    trigger = {
        "clientContent": {
            "turns": [{"role": "user", "parts": [{"text": "."}]}],
            "turnComplete": True,
        }
    }
    await ws.send(json.dumps(trigger))
    print(f"[{scenario}][trigger] sent greeting trigger")

    # Consumir greeting hasta su turn.complete
    greeting_stats = PhaseStats(name=f"{scenario}/greeting")
    await consume_until(
        ws, greeting_stats, timeout_s=15.0, stop_after_turn_completes=1
    )
    print(f"[{scenario}][greeting] done:\n{greeting_stats.summary()}")
    return ws


# ---------------------------------------------------------------------------
# Escenarios
# ---------------------------------------------------------------------------
async def scenario_A(token: str, pcm: bytes) -> PhaseStats:
    """voz + 2s silencio. ESPERADO: input + 1 turn.complete del coach."""
    print("\n" + "=" * 70)
    print("ESCENARIO A: voz + 2s silencio")
    print("=" * 70)
    ws = await open_session(token, "A")
    try:
        stats = PhaseStats(name="A")
        await send_pcm(ws, pcm, "A/voice")
        await send_pcm(ws, silence_bytes(2.0), "A/silence-2s")
        print("[A] esperando respuesta del coach (max 20s)...")
        await consume_until(ws, stats, timeout_s=20.0, stop_after_turn_completes=1)
        return stats
    finally:
        await ws.close()


async def scenario_B(token: str, pcm: bytes) -> PhaseStats:
    """voz + 20s silencio CONTINUO sin parar. Simula bug pre-fix."""
    print("\n" + "=" * 70)
    print("ESCENARIO B: voz + 20s silencio continuo (pre-fix bug)")
    print("=" * 70)
    ws = await open_session(token, "B")
    try:
        stats = PhaseStats(name="B")
        await send_pcm(ws, pcm, "B/voice")

        # Mandamos silencio en streaming continuo Y AL MISMO TIEMPO leemos
        # del ws para capturar el primer turn.complete (respuesta al input)
        # y luego cualquier turn-end fantasma que aparezca durante el silencio.
        async def silence_streamer():
            await send_pcm(ws, silence_bytes(20.0), "B/silence-20s")
            print("[B] termine de mandar 20s de silencio")

        async def reader_task():
            # leemos durante todo el silencio
            await consume_until(ws, stats, timeout_s=25.0, stop_after_turn_completes=None)

        await asyncio.gather(silence_streamer(), reader_task())
        return stats
    finally:
        try:
            await ws.close()
        except Exception:
            pass


async def scenario_C(token: str, pcm: bytes) -> PhaseStats:
    """voz + 1.5s silencio + STOP (cierre limpio). Simula el fix."""
    print("\n" + "=" * 70)
    print("ESCENARIO C: voz + 1.5s silencio + STOP (fix nuevo)")
    print("=" * 70)
    ws = await open_session(token, "C")
    try:
        stats = PhaseStats(name="C")
        await send_pcm(ws, pcm, "C/voice")
        await send_pcm(ws, silence_bytes(1.5), "C/silence-1.5s")
        # STOP = dejamos de mandar audio. Esperamos respuesta del coach.
        # Importante: NO mandamos mas silencio aunque el coach tarde.
        print("[C] STOP: no mando mas audio. Espero respuesta y observo si hay turn-end fantasma despues.")
        # Esperamos hasta 2 turn.complete o 20s para detectar fantasma
        await consume_until(ws, stats, timeout_s=20.0, stop_after_turn_completes=2)
        return stats
    finally:
        try:
            await ws.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Analisis ghost turn-ends
# ---------------------------------------------------------------------------
def analyze_ghosts(stats: PhaseStats) -> None:
    """Ghost = turn.complete del coach sin input transcription previo en la fase.
    Para A: deberia haber 1 turn.complete con 1 input -> 0 ghosts.
    Para B: si hay turn.complete sin input -> ghost.
    Para C: el primero es real (con input). El segundo si llega = ghost.
    """
    if stats.turn_completes == 0:
        stats.ghost_turn_ends = 0
        return
    # heuristica: si turn_completes > input_transcriptions -> hay ghost
    excess = max(0, stats.turn_completes - max(stats.input_transcriptions, 0))
    # caso B especial: si no hubo NINGUN input pero si turn.complete = todo es ghost
    if stats.input_transcriptions == 0 and stats.turn_completes > 0:
        excess = stats.turn_completes
    stats.ghost_turn_ends = excess


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
async def main() -> None:
    arg = sys.argv[1].upper() if len(sys.argv) > 1 else "ALL"
    if arg not in {"A", "B", "C", "ALL"}:
        print(f"uso: {sys.argv[0]} [A|B|C|ALL]")
        sys.exit(2)

    token = get_token()
    print(f"[auth] token len={len(token)}")
    pcm = generate_test_audio()
    print(f"[audio] {len(pcm)} bytes raw PCM 16k mono")

    order = [arg] if arg in {"A", "B", "C"} else ["A", "B", "C"]
    results: dict[str, PhaseStats] = {}
    for sc in order:
        if sc == "A":
            results["A"] = await scenario_A(token, pcm)
        elif sc == "B":
            results["B"] = await scenario_B(token, pcm)
        elif sc == "C":
            results["C"] = await scenario_C(token, pcm)
        # gap entre escenarios para que Vertex no nos rate-limitee
        await asyncio.sleep(1.0)

    print("\n" + "#" * 70)
    print("# RESULTADOS FINALES")
    print("#" * 70)
    for name, stats in results.items():
        analyze_ghosts(stats)
        print(f"\n--- Escenario {name} ---")
        print(stats.summary())

    # Veredictos
    print("\n--- VEREDICTOS ---")
    if "A" in results:
        s = results["A"]
        ok = s.input_transcriptions >= 1 and s.turn_completes >= 1 and s.ghost_turn_ends == 0
        print(f"A: {'OK' if ok else 'FAIL'} (input>=1 y turn_completes>=1 y ghost==0)")
    if "B" in results:
        s = results["B"]
        # Bug confirmado si hay turn.complete sin input, o turn_completes > input_transcriptions
        bug = s.ghost_turn_ends > 0
        print(f"B: {'BUG CONFIRMADO (ghost turn-end)' if bug else 'NO ghost detectado'}")
    if "C" in results:
        s = results["C"]
        # Fix OK = exactamente 1 turn.complete con input previo, sin fantasma
        ok = s.input_transcriptions >= 1 and s.turn_completes == 1 and s.ghost_turn_ends == 0
        print(f"C: {'FIX OK' if ok else 'FIX DUDOSO'} (input>=1 y turn_completes==1 y ghost==0)")


if __name__ == "__main__":
    asyncio.run(main())

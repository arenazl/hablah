"""Smoke test de todas las integraciones externas — corre cada chequeo y reporta."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))


GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def ok(name: str, detail: str = "") -> None:
    print(f"{GREEN}[OK]{RESET}   {name}{(' — ' + detail) if detail else ''}")


def fail(name: str, detail: str) -> None:
    print(f"{RED}[FAIL]{RESET} {name} — {detail}")


def skip(name: str, detail: str) -> None:
    print(f"{YELLOW}[SKIP]{RESET} {name} — {detail}")


# ─── 1. DB Aiven ──────────────────────────────────────────────────────────
async def test_db() -> bool:
    try:
        import aiomysql
        import ssl as ssl_mod

        host = os.environ["DB_HOST"]
        port = int(os.environ["DB_PORT"])
        user = os.environ["DB_USER"]
        password = os.environ["DB_PASSWORD"]
        db = os.environ["DB_NAME"]
        ctx = ssl_mod.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl_mod.CERT_NONE
        conn = await aiomysql.connect(
            host=host, port=port, user=user, password=password, db=db, ssl=ctx, connect_timeout=10
        )
        async with conn.cursor() as cur:
            await cur.execute("SELECT VERSION(), DATABASE()")
            row = await cur.fetchone()
        conn.close()
        ok("DB Aiven", f"version={row[0]}, db={row[1]}")
        return True
    except KeyError as e:
        fail("DB Aiven", f"missing env var {e}")
        return False
    except Exception as e:
        fail("DB Aiven", f"{type(e).__name__}: {e}")
        return False


# ─── 2. Gemini text ───────────────────────────────────────────────────────
async def test_gemini() -> bool:
    try:
        import httpx

        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            fail("Gemini", "GEMINI_API_KEY missing")
            return False
        model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": "Reply with exactly one word in English: hello"
                        }
                    ],
                }
            ],
            "generationConfig": {"maxOutputTokens": 200, "temperature": 0},
        }
        async with httpx.AsyncClient(timeout=30) as cli:
            r = await cli.post(url, json=body)
        if r.status_code != 200:
            fail("Gemini text", f"HTTP {r.status_code}: {r.text[:200]}")
            return False
        data = r.json()
        candidates = data.get("candidates") or []
        text = ""
        if candidates:
            cand = candidates[0]
            parts = (cand.get("content") or {}).get("parts") or []
            text = " ".join(p.get("text", "") for p in parts).strip()
            if not text:
                text = f"finishReason={cand.get('finishReason')}"
        ok("Gemini text", f"model={model}, reply={text!r}")
        return True
    except Exception as e:
        fail("Gemini text", f"{type(e).__name__}: {e}")
        return False


# ─── 3. Groq Whisper (STT) ────────────────────────────────────────────────
async def test_groq_whisper() -> bool:
    """Genera un WAV silencioso de 1s y lo manda a Whisper para validar credenciales y endpoint."""
    try:
        import httpx
        import struct
        import wave
        import io

        key = os.environ.get("GROQ_API_KEY")
        if not key:
            fail("Groq Whisper", "GROQ_API_KEY missing")
            return False
        model = os.environ.get("GROQ_WHISPER_MODEL", "whisper-large-v3")

        # WAV silencioso 1s 16kHz mono
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(16000)
            w.writeframes(struct.pack("<" + "h" * 16000, *([0] * 16000)))
        wav = buf.getvalue()

        async with httpx.AsyncClient(timeout=60) as cli:
            r = await cli.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {key}"},
                files={"file": ("silence.wav", wav, "audio/wav")},
                data={"model": model, "response_format": "json"},
            )
        if r.status_code != 200:
            fail("Groq Whisper", f"HTTP {r.status_code}: {r.text[:200]}")
            return False
        data = r.json()
        ok("Groq Whisper", f"model={model}, text={data.get('text', '')!r} (silence is fine)")
        return True
    except Exception as e:
        fail("Groq Whisper", f"{type(e).__name__}: {e}")
        return False


# ─── 4. Cloudinary ────────────────────────────────────────────────────────
def test_cloudinary() -> bool:
    try:
        cn = os.environ.get("CLOUDINARY_CLOUD_NAME")
        ak = os.environ.get("CLOUDINARY_API_KEY")
        sk = os.environ.get("CLOUDINARY_API_SECRET")
        if not all([cn, ak, sk]):
            fail("Cloudinary", "credentials missing")
            return False
        import cloudinary
        import cloudinary.api

        cloudinary.config(cloud_name=cn, api_key=ak, api_secret=sk, secure=True)
        res = cloudinary.api.ping()
        ok("Cloudinary", f"status={res.get('status')}, cloud={cn}")
        return True
    except Exception as e:
        fail("Cloudinary", f"{type(e).__name__}: {e}")
        return False


# ─── 5. SMTP Brevo ────────────────────────────────────────────────────────
def test_smtp() -> bool:
    try:
        import smtplib
        import socket

        host = os.environ.get("SMTP_HOST", "smtp-relay.brevo.com")
        port = int(os.environ.get("SMTP_PORT", 587))
        user = os.environ.get("SMTP_USER")
        pw = os.environ.get("SMTP_PASSWORD")
        if not all([user, pw]):
            fail("SMTP Brevo", "SMTP_USER/SMTP_PASSWORD missing")
            return False
        socket.setdefaulttimeout(15)
        with smtplib.SMTP(host, port, timeout=15) as s:
            s.ehlo()
            s.starttls()
            s.ehlo()
            s.login(user, pw)
        ok("SMTP Brevo", f"login OK @ {host}:{port}")
        return True
    except Exception as e:
        fail("SMTP Brevo", f"{type(e).__name__}: {e}")
        return False


# ─── 6. ElevenLabs TTS ────────────────────────────────────────────────────
async def test_gemini_live() -> bool:
    """Conecta al WebSocket de Gemini Live, manda un setup mínimo, valida respuesta.

    Detecta errores como 1008 policy violation (modelo no disponible para tu key).
    """
    try:
        import json as _json
        import websockets

        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            fail("Gemini Live", "GEMINI_API_KEY missing")
            return False

        # Importar el modelo configurado (mismo que usa el proxy real)
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        try:
            from services.gemini_live import LIVE_MODEL, LIVE_API_URL  # type: ignore
        except Exception:
            LIVE_MODEL = "models/gemini-live-2.5-flash-preview"
            LIVE_API_URL = (
                "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
            )

        url = f"{LIVE_API_URL}?key={key}"
        try:
            ws = await asyncio.wait_for(websockets.connect(url, max_size=2**20), timeout=15)
        except Exception as e:
            fail("Gemini Live", f"no se pudo abrir WS: {type(e).__name__}: {e}")
            return False

        # Setup completo: replicar el que usa producción para detectar
        # incompatibilidades de language code, voice name, system_instruction, etc.
        setup = {
            "setup": {
                "model": LIVE_MODEL,
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Aoede"}},
                    },
                },
                "systemInstruction": {"parts": [{"text": "You are a helpful tutor."}]},
            }
        }
        await ws.send(_json.dumps(setup))
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=10)
            data = _json.loads(raw)
            # setupComplete o algo válido = OK
            if "setupComplete" in data or "serverContent" in data:
                # Mandar un chunk de audio real (silencio 100ms PCM 16kHz) para
                # detectar cambios de protocolo en realtimeInput como el de
                # mediaChunks → audio (deprecation 2026).
                import struct
                pcm = struct.pack("<" + "h" * 1600, *([0] * 1600))
                import base64
                b64 = base64.b64encode(pcm).decode("ascii")
                await ws.send(_json.dumps({
                    "realtimeInput": {"audio": {"mimeType": "audio/pcm;rate=16000", "data": b64}}
                }))
                # Espero 2s para ver si Google cierra con error de formato
                try:
                    await asyncio.wait_for(ws.recv(), timeout=2)
                except asyncio.TimeoutError:
                    pass  # silencio = OK
                except websockets.ConnectionClosed as e:
                    if getattr(e, "code", 0) == 1007:
                        fail("Gemini Live", f"audio rechazado (formato): {getattr(e, 'reason', '')[:150]}")
                        return False
                ok("Gemini Live", f"setupComplete + audio OK, model={LIVE_MODEL}")
                await ws.close()
                return True
            fail("Gemini Live", f"respuesta inesperada: {str(data)[:200]}")
            await ws.close()
            return False
        except websockets.ConnectionClosed as e:
            # Google cierra con 1008 si el modelo no es válido para Live
            reason = getattr(e, "reason", str(e))
            fail("Gemini Live", f"closed: code={getattr(e, 'code', '?')} reason={reason[:200]}")
            return False
        except asyncio.TimeoutError:
            fail("Gemini Live", "timeout esperando setupComplete")
            await ws.close()
            return False
    except Exception as e:
        fail("Gemini Live", f"{type(e).__name__}: {e}")
        return False


async def test_elevenlabs() -> bool:
    """Sintetiza un texto corto en cada una de las 4 voces y valida MP3."""
    try:
        import httpx

        key = os.environ.get("ELEVENLABS_API_KEY")
        if not key:
            fail("ElevenLabs", "ELEVENLABS_API_KEY missing")
            return False
        model = os.environ.get("ELEVENLABS_MODEL", "eleven_flash_v2_5")
        voices = {
            "coach (Lucia)": "yA5jrK1S9cpCAojBYyMu",
            "sincerist (Melanie)": "bN1bDXgDIGX5lw0rtY2B",
            "arcade (alt#1)": "93IsRN8Mhs3FMPjO05OH",
            "diagnostic (alt#2)": "9rvdnhrYoXoUt4igKpBw",
        }
        all_ok = True
        async with httpx.AsyncClient(timeout=30) as cli:
            for label, vid in voices.items():
                r = await cli.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
                    headers={
                        "xi-api-key": key,
                        "Content-Type": "application/json",
                        "Accept": "audio/mpeg",
                    },
                    json={
                        "text": "Hola.",
                        "model_id": model,
                        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                    },
                )
                if r.status_code != 200:
                    fail(f"ElevenLabs · {label}", f"HTTP {r.status_code}: {r.text[:160]}")
                    all_ok = False
                    continue
                size = len(r.content)
                head = r.content[:3]
                # MP3: ID3 header o 0xFF FB / 0xFF F3 / 0xFF F2
                is_mp3 = head[:3] == b"ID3" or (head[0] == 0xFF and head[1] in (0xFB, 0xF3, 0xF2, 0xFA))
                if not is_mp3 or size < 500:
                    fail(f"ElevenLabs · {label}", f"audio inválido (size={size})")
                    all_ok = False
                    continue
                ok(f"ElevenLabs · {label}", f"MP3 OK, {size} bytes")
        return all_ok
    except Exception as e:
        fail("ElevenLabs", f"{type(e).__name__}: {e}")
        return False


# ─── 7. Backend FastAPI import ────────────────────────────────────────────
def test_backend_import() -> bool:
    try:
        from main import app

        routes = [r.path for r in app.routes if hasattr(r, "path")]
        ok("Backend import", f"app loaded, {len(routes)} routes")
        return True
    except Exception as e:
        fail("Backend import", f"{type(e).__name__}: {e}")
        return False


async def main() -> None:
    print("\n=== HABLAH SMOKE TEST — integraciones externas ===\n")
    results: dict[str, bool] = {}
    results["DB Aiven"] = await test_db()
    results["Gemini"] = await test_gemini()
    results["Gemini Live (WS)"] = await test_gemini_live()
    results["Groq Whisper"] = await test_groq_whisper()
    results["Cloudinary"] = test_cloudinary()
    results["SMTP Brevo"] = test_smtp()
    results["ElevenLabs"] = await test_elevenlabs()
    results["Backend import"] = test_backend_import()

    print("\n=== RESUMEN ===")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    print(f"{passed}/{total} servicios OK")
    if passed != total:
        failed = [k for k, v in results.items() if not v]
        print(f"Fallaron: {', '.join(failed)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

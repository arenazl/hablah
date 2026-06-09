"""Test por la INFRA ENTERA (no simulación local): habla con el backend real.

Corre EN Heroku. Para cada tópico:
  1. POST /api/sessions/start (mide el setup real + trae el prompt de prod).
  2. Abre el WS de voz REAL (wss .../api/voice/ws) — toda la infra: router Heroku
     + proxy + Gemini Live.
  3. Maneja la charla por TEXTO ({"type":"say"}) — obviando el audio pero pasando
     por todo el pipeline. Mide la LATENCIA real por turno (round-trip).
  4. Guarda transcripciones/<slug>.md con el prompt + la transcripción + timings.

El alumno (turnos del nene) se simula con un Gemini aparte (solo para empujar la
charla; lo que se MIDE es el coach por la infra real).

Uso: heroku run "python scripts/test_infra_real.py 1"   # nro de tópicos (default 1)
"""
import sys, os, asyncio, json, time
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx
import websockets
from sqlalchemy import select
from core.config import settings
from core.database import AsyncSessionLocal
from core.security import create_access_token
from models.user import User
from models.template import Topic

APP = os.getenv("APP_HOST", "hablah-api-abcaf6c43a5d.herokuapp.com")
BASE = f"https://{APP}"
WS = f"wss://{APP}/api/voice/ws"
TURNS = 6
OUTDIR = os.path.join(os.path.dirname(__file__), "..", "..", "transcripciones")
GMODEL = settings.GEMINI_MODEL or "gemini-2.5-flash"
GURL = f"https://generativelanguage.googleapis.com/v1beta/models/{GMODEL}:generateContent?key={settings.GEMINI_API_KEY}"

STUDENT_SYS = ("Sos un nene de 5 años en una clase de inglés con Habi. Respondé NATURAL y MUY CORTO "
               "en español (a veces intentás una palabra en inglés, a veces algo off-topic). Máximo 1 frase.")


async def _student(client, hist):
    cfg = {"temperature": 0.9, "maxOutputTokens": 80, "thinkingConfig": {"thinkingBudget": 0}}
    payload = {"contents": hist, "generationConfig": cfg, "systemInstruction": {"parts": [{"text": STUDENT_SYS}]}}
    try:
        r = await client.post(GURL, json=payload)
        return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return "¿y después?"


async def _coach_turn(ws, timeout_first=12.0, settle=2.5):
    """Junta los transcript_chunk del coach hasta que se asienta el turno.
    Devuelve (texto, latencia_primer_chunk, latencia_total)."""
    t0 = time.monotonic()
    chunks, first_at, last_at = [], None, None
    while True:
        budget = (timeout_first if first_at is None else settle)
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=budget)
        except asyncio.TimeoutError:
            break
        try:
            m = json.loads(raw)
        except Exception:
            continue
        if m.get("type") == "transcript_chunk" and m.get("who") == "ai":
            now = time.monotonic()
            if first_at is None:
                first_at = now
            last_at = now
            chunks.append(m.get("text", ""))
        elif m.get("type") in ("error",):
            chunks.append(f"[ERROR: {m.get('error')}]")
            break
        # ignoramos audio/pong/otros
    txt = "".join(chunks).strip()
    ttf = (first_at - t0) if first_at else None
    tot = (last_at - t0) if last_at else None
    return txt, ttf, tot


async def run_topic(http, kid_id, topic):
    token = create_access_token({"sub": str(kid_id)})
    # 1) setup real
    t0 = time.monotonic()
    r = await http.post(f"{BASE}/api/sessions/start", json={"topic_id": topic.id},
                        headers={"Authorization": f"Bearer {token}"})
    setup_ms = (time.monotonic() - t0) * 1000
    r.raise_for_status()
    data = r.json()
    sid = data["session_id"]
    prompt = data.get("super_prompt", "")
    # 2) WS real
    lines, timings = [], []
    url = f"{WS}?session_id={sid}&token={token}"
    async with websockets.connect(url, max_size=None, open_timeout=20) as ws:
        # apertura del coach (¿abre primero?)
        op_txt, op_ttf, op_tot = await _coach_turn(ws, timeout_first=14.0)
        if op_txt:
            lines.append(f"HABI [apertura · 1er chunk {op_ttf:.1f}s]: {op_txt}")
            timings.append(op_ttf)
        # turnos
        shist = []
        if op_txt:
            shist.append({"role": "user", "parts": [{"text": op_txt}]})
        for _ in range(TURNS):
            stu = await _student(http, shist) if shist else "¡hola!"
            lines.append(f"NENE: {stu}")
            shist.append({"role": "model", "parts": [{"text": stu}]})
            await ws.send(json.dumps({"type": "say", "text": stu}))
            ctxt, ttf, tot = await _coach_turn(ws)
            tline = f"1er chunk {ttf:.1f}s" if ttf else "sin respuesta"
            lines.append(f"HABI [{tline}]: {ctxt or '(vacío)'}")
            if ttf:
                timings.append(ttf)
            shist.append({"role": "user", "parts": [{"text": ctxt or ''}]})
        try:
            await ws.send(json.dumps({"type": "end"}))
        except Exception:
            pass
    avg = sum(timings) / len(timings) if timings else 0
    mx = max(timings) if timings else 0
    return sid, prompt, "\n".join(lines), setup_ms, avg, mx


def _slug(title):
    import re
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


async def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    os.makedirs(OUTDIR, exist_ok=True)
    async with AsyncSessionLocal() as db:
        kid = (await db.execute(select(User).where(User.age_group.isnot(None)).order_by(User.id))).scalars().first()
        topics = (await db.execute(select(Topic).where(
            Topic.segmento == "mini", Topic.is_active.is_(True)).order_by(Topic.id).limit(n))).scalars().all()
    if not kid or not topics:
        print(f"FALTA kid={bool(kid)} topics={len(topics) if topics else 0}")
        return
    print(f"[infra real] kid={kid.nombre} (id={kid.id}, age={kid.age_group}) · {len(topics)} tópico(s) · WS={WS}")
    async with httpx.AsyncClient(timeout=90.0) as http:
        for topic in topics:
            try:
                sid, prompt, convo, setup_ms, avg, mx = await run_topic(http, kid.id, topic)
                print(f"\n=== {topic.title} (session {sid}) ===")
                print(f"  setup POST /sessions/start: {setup_ms:.0f}ms")
                print(f"  latencia coach (1er chunk): prom {avg:.1f}s · máx {mx:.1f}s")
                print("  --- transcripción (infra real):")
                for ln in convo.split("\n"):
                    print(f"    {ln}")
                path = os.path.join(OUTDIR, f"infra-{_slug(topic.title)}.md")
                with open(path, "w", encoding="utf-8") as fh:
                    fh.write(f"# {topic.title} — clase por la INFRA REAL (mini · A0)\n\n"
                             f"Medido contra el backend real (Heroku + WS + Gemini Live), charla por texto.\n\n"
                             f"- **Setup** (`POST /sessions/start`): {setup_ms:.0f} ms\n"
                             f"- **Latencia coach** (1er chunk): prom {avg:.1f}s · máx {mx:.1f}s\n\n"
                             f"## Prompt final (de prod)\n```\n{prompt}\n```\n\n"
                             f"## Transcripción (infra real)\n```\n{convo}\n```\n")
                print(f"  [ok] escrito infra-{_slug(topic.title)}.md")
            except Exception as e:
                print(f"  [ERROR en {topic.title}] {type(e).__name__}: {e}")
    print("\nFIN test infra real.")


if __name__ == "__main__":
    asyncio.run(main())

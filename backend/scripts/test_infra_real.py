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
TURNS = 8
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


JUDGE_SYS = ("Sos un evaluador pedagógico. Te paso la transcripción de una clase de inglés para un nene de 5 "
             "años. Para CADA clave, true=bien. Devolvé SOLO JSON:\n"
             '{"intro": true si el coach ARRANCA con una introducción clara (saluda y presenta la aventura y qué van a hacer) antes de pedir nada,'
             ' "narrativa": true si es un cuento/aventura que avanza (NO una lista suelta tipo "pizza ok, dog ok"),'
             ' "elicita": true si GUÍA al chico a DECIR las palabras con pedidos claros (modela y pide "repetí X" / "ahora vos"), en vez de preguntas abiertas que el chico no puede responder,'
             ' "mezcla_es_en": true si el coach mezcla español+inglés (ningún turno entero en inglés),'
             ' "sin_circo": true si NO pide acciones físicas que no puede ver (mover brazos, saltar) NI usa onomatopeyas de relleno (oink, yum),'
             ' "no_cierra": true si el coach sigue la clase SIN despedirse (es CORRECTO que NO cierre; la corta el adulto). Poné false SOLO si el coach se despide o cierra él la clase,'
             ' "vocab_del_tema": true si las palabras en inglés son del tema,'
             ' "coherente": true si todo tiene sentido (NADA tipo "la pizza tiene un name"),'
             ' "score": entero 1-10, "problema": "breve, o vacío si está ok"}')
CRIT = ["intro", "narrativa", "elicita", "mezcla_es_en", "sin_circo", "no_cierra", "vocab_del_tema", "coherente"]


def _parse_json(raw):
    raw = (raw or "").strip()
    if "```" in raw:
        seg = raw.split("```")
        raw = seg[1] if len(seg) > 1 else raw
        if raw.lstrip().lower().startswith("json"):
            raw = raw.lstrip()[4:]
    i, j = raw.find("{"), raw.rfind("}")
    if i >= 0 and j > i:
        raw = raw[i:j + 1]
    try:
        return json.loads(raw)
    except Exception:
        return {"score": 0, "problema": "juez no parseable"}


async def _judge(http, convo):
    cfg = {"temperature": 0.0, "maxOutputTokens": 500, "thinkingConfig": {"thinkingBudget": 0},
           "responseMimeType": "application/json"}
    payload = {"contents": [{"role": "user", "parts": [{"text": convo}]}], "generationConfig": cfg,
               "systemInstruction": {"parts": [{"text": JUDGE_SYS}]}}
    for _ in range(2):
        try:
            r = await http.post(GURL, json=payload)
            return _parse_json(r.json()["candidates"][0]["content"]["parts"][0]["text"])
        except Exception:
            await asyncio.sleep(1.0)
    return {"score": 0, "problema": "juez falló"}


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
    convo = "\n".join(lines)
    verdict = await _judge(http, convo)
    avg = sum(timings) / len(timings) if timings else 0
    mx = max(timings) if timings else 0
    return sid, prompt, convo, setup_ms, avg, mx, verdict


def _slug(title):
    import re
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


async def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    async with AsyncSessionLocal() as db:
        kid = (await db.execute(select(User).where(User.age_group.isnot(None)).order_by(User.id))).scalars().first()
        topics = (await db.execute(select(Topic).where(
            Topic.segmento == "mini", Topic.is_active.is_(True)).order_by(Topic.id).limit(n))).scalars().all()
    if not kid or not topics:
        print(f"FALTA kid={bool(kid)} topics={len(topics) if topics else 0}")
        return
    print(f"[infra real] kid={kid.nombre} (id={kid.id}, age={kid.age_group}) · {len(topics)} tópico(s) · WS={WS}")
    scores = []
    async with httpx.AsyncClient(timeout=90.0) as http:
        for topic in topics:
            try:
                sid, prompt, convo, setup_ms, avg, mx, v = await run_topic(http, kid.id, topic)
                ok = sum(1 for c in CRIT if v.get(c))
                fails = [c for c in CRIT if not v.get(c)]
                scores.append(v.get("score", 0))
                print(f"{topic.title:34s} score {v.get('score')}/10 · crit {ok}/8 · "
                      f"setup {setup_ms:.0f}ms · coach prom {avg:.1f}s/máx {mx:.1f}s"
                      + (f" · flojos: {','.join(fails)}" if fails else "")
                      + (f"  [{v.get('problema')}]" if v.get('problema') else ""))
            except Exception as e:
                print(f"{topic.title:34s} [ERROR] {type(e).__name__}: {e}")
    if scores:
        print(f"\nPROMEDIO score: {sum(scores)/len(scores):.1f}/10  ({len(scores)} tópicos)")
    print("FIN test infra real (con juez).")


if __name__ == "__main__":
    asyncio.run(main())

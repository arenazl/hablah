"""3 chicos OLLAMA (remador/timido/pregunton) x topico kids real, motor v2, por texto."""
import asyncio, os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception: pass
if not os.environ.get("GEMINI_API_KEY"):
    envf = os.path.join(os.path.dirname(__file__), "..", ".env")
    m = re.search(r'GEMINI_API_KEY\s*=\s*["\x27]?(AIza[\w-]+)', open(envf, encoding="utf-8", errors="ignore").read())
    if m: os.environ["GEMINI_API_KEY"] = m.group(1)
import importlib.util
spec = importlib.util.spec_from_file_location("vc", os.path.join(os.path.dirname(__file__), "validar_cambio.py"))
vc = importlib.util.module_from_spec(spec); spec.loader.exec_module(vc)
from services import motor_engine
import pymysql
from pymysql.cursors import DictCursor
from core.config import settings

PERSONAS = [
 ("REMADOR", "gpt-oss:120b", "un nene de 5 años charlatán: contesta LARGO, se va por las ramas con historias de su casa y su perro, casi todo en español, a veces mete la palabra en inglés"),
 ("TIMIDO", "gemma3:27b", "un nene de 5 años muy tímido: contesta con silencios ('...'), monosílabos o una sola palabrita, le cuesta animarse"),
 ("PREGUNTON", "qwen3-coder:480b", "un nene de 5 años preguntón: contesta casi siempre con preguntas ('¿por qué?', '¿y cómo se dice X?'), curioso incansable"),
]

async def one(persona, model, who, tid, title):
    c = pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER, password=settings.DB_PASSWORD, database=settings.DB_NAME, cursorclass=DictCursor, ssl={'ssl': True})
    c.close()
    r = await motor_engine.resolve_v2("mini", "A0", tid)
    prompt = r["prompt"]
    ap = re.search(r"<lesson_approach>.*?Style: (\w+)", prompt, re.S)
    vb = re.search(r"Words_Available: ([^\n]+)", prompt)
    print("\n" + "█" * 64 + f"\n  {persona} ({model}) · {title} · enfoque: {ap.group(1) if ap else '?'} · palabras: {vb.group(1) if vb else '?'}\n" + "█" * 64)
    h = [("Profe", await vc._coach(prompt, []))]
    print(f"\nPROFE: {h[0][1]}")
    for _ in range(4):
        stu = await vc._student(h, title, who, model)
        h.append(("Alumno", stu)); print(f"\nALUMNO: {stu}")
        resp = await vc._coach(prompt, h); h.append(("Profe", resp)); print(f"\nPROFE: {resp}")

async def main():
    c = pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER, password=settings.DB_PASSWORD, database=settings.DB_NAME, cursorclass=DictCursor, ssl={'ssl': True})
    cur = c.cursor(); cur.execute("SELECT id, title FROM topics WHERE title LIKE '%granja%' OR title LIKE '%selva%' LIMIT 1")
    t = cur.fetchone(); c.close()
    tid, title = t['id'], t['title']
    for persona, model, who in PERSONAS:
        try: await one(persona, model, who, tid, title)
        except Exception as e: print(f"\n[{persona}] ERROR: {e}")

asyncio.run(main())

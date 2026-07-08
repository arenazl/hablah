"""Test GRANDE con infra nueva: 10 alumnos (modelos distintos) x distintos niveles x
evolución de historia (0, 1, 2, 3 historias). Motor NUEVO (motor_v3).

- coach  = Gemini (modelo real de prod) corriendo el prompt del motor v3
- alumno = 10 modelos de Ollama (otra familia, independientes) — uno por perfil
- juez   = Claude (especialista SLA)
Cada perfil corre 4 clases seguidas; entre clases el post-clase escribe la historia
(train_apply) y la clase siguiente la lee. Vemos cómo evoluciona el score con 0/1/2/3
historias, por nivel y por modelo de alumno. Persistencia incremental por perfil.

Uso: python scripts/test_multi_evolution.py
"""
from __future__ import annotations
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
import httpx  # noqa: E402
from services import motor_engine, motor_protocol as mp  # noqa: E402

_KEY = open(os.path.join(os.path.dirname(__file__), "..", ".ollama_key")).read().strip()
OUT_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "multi-llm-v3"))
os.makedirs(OUT_DIR, exist_ok=True)
CLASSES = 4          # historia 0, 1, 2, 3
EXCHANGES = 3
CONCURRENCY = 4
BAND_AGE = {"early_child": 5, "child": 8, "teen": 12, "adult": 30}

# 10 perfiles: distintos niveles y bandas. (band, level, match, kids?, who)
PROFILES = [
    ("early_child", "A1", "familia", True,  "un nene de 5 años (A1), casi todo en español, 1-2 palabras en inglés"),
    ("child",       "A1", "escuela", True,  "un nene de 7 años (A1): muy básico, frases de 2-3 palabras, mezcla español"),
    ("child",       "A2", "casa",    True,  "un nene de 9 años (A2): frases cortas, entusiasta, algunos errores"),
    ("teen",        "A2", "música",  True,  "un chico de 12 (A2): quiere sonar canchero, frases cortas con errores"),
    ("teen",        "B1", "viajes",  True,  "un chico de 13 (B1): frases más largas, se frustra si no le sale"),
    ("teen",        "B2", "trabajo", True,  "un chico de 14 (B2): suelto, opina, arriesga estructuras"),
    ("adult",       "A2", "cine",    False, "un adulto (A2): básico, ganas pero con errores, mezcla español"),
    ("adult",       "B1", "fútbol",  False, "un adulto (B1): fluidez media, errores de su nivel, no se autocorrige"),
    ("adult",       "B2", "vida",    False, "un adulto (B2): suelto, opina largo, algún error de matiz"),
    ("adult",       "C1", "genética", False, "un adulto (C1): muy fluido, busca precisión e idiomático"),
]
STUDENT_MODELS = [
    "gpt-oss:120b", "qwen3.5:397b", "glm-5.2", "minimax-m3", "ministral-3:8b",
    "devstral-small-2:24b", "gemma3:4b", "deepseek-v3.1:671b", "mistral-large-3:675b", "nemotron-3-nano:30b",
]

_RUBRIC = ("SOS ESPECIALISTA SLA. Evalua NATURALIDAD, filtro afectivo, i+1, reciclado, recast. "
           "NO penalices cobertura de vocab.")


async def _ollama(prompt, model, tries=3):
    body = {"model": model, "messages": [{"role": "user", "content": prompt}], "stream": False}
    for _ in range(tries):
        try:
            async with httpx.AsyncClient(timeout=120) as c:
                r = await c.post("https://ollama.com/api/chat", headers={"Authorization": f"Bearer {_KEY}"}, json=body)
                d = r.json()
                if "message" in d:
                    return d["message"]["content"]
        except Exception:
            pass
        await asyncio.sleep(5)
    return "(sin respuesta)"


_GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
# Enforcement del contrato (model-specialist): forzamos responseSchema {tts} y extraemos
# ese campo -> el coach SIEMPRE devuelve la frase hablada limpia, no JSON improvisado.
_COACH_SCHEMA = {"type": "object", "properties": {"tts": {"type": "string"}}, "required": ["tts"]}


async def _gemini_coach(prompt, tries=3):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_GEMINI_KEY}"
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "responseSchema": _COACH_SCHEMA}}
    for _ in range(tries):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                r = await c.post(url, json=body)
                d = r.json()
                txt = d["candidates"][0]["content"]["parts"][0]["text"]
                obj = json.loads(txt)
                if obj.get("tts"):
                    return obj["tts"]
        except Exception:
            pass
        await asyncio.sleep(4)
    return "(sin respuesta)"


async def _coach_turn(engine_prompt, history):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (engine_prompt + "\n\n--- CONVERSACIÓN ---\n" + (convo or "(vacía, empezás vos)")
         + "\n\nDevolvé el campo `tts`: SOLO lo que EL PROFE DICE en voz alta, limpio (sin emojis ni onomatopeyas), "
           "1-3 oraciones, tu próximo turno:")
    return (await _gemini_coach(p)).strip().replace("\n", " ")[:400]


async def _student_turn(who, theme, history, model):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (f"Sos {who}. Clase de inglés sobre '{theme}'. Respondé como ese alumno REAL con los errores "
         f"de tu nivel, NUNCA te corrijas.\n\n--- CONVERSACIÓN ---\n{convo}\n\nSOLO tu próximo turno como ALUMNO (1-2 oraciones):")
    return (await _ollama(p, model)).strip().replace("\n", " ")[:300]


async def _one_class(engine_prompt, who, theme, model):
    h = [("Profe", await _coach_turn(engine_prompt, []))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _student_turn(who, theme, h, model)))
        h.append(("Profe", await _coach_turn(engine_prompt, h)))
    return [{"who": w, "text": t} for w, t in h]


async def _judge(level, title, conv):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    raw = await mp._claude_headless(f"{_RUBRIC}\nClase ({level}) sobre '{title}'.\n{convo}\n\n"
                                    'Devolve SOLO JSON: {"score":1-10,"verdict":"1-2 frases"}')
    return mp._parse_json(raw or "") or {"score": None}


async def _derive(db, level, conv):
    objs = db.q("SELECT objective_id, code, description FROM language_objective WHERE cefr_level=%s ORDER BY sort_order", (level,))
    if not objs:
        return {"objectives": [], "items": []}
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    listado = "\n".join(f'{o["objective_id"]}\t{o["code"]}\t{o["description"]}' for o in objs)
    raw = await mp._claude_headless(
        "Evaluador SLA. De la TRANSCRIPCION marca qué objetivos se practicaron y con qué desempeño "
        "(good/partial/fail). Ignora los que no aparecieron.\n"
        f"OBJETIVOS:\n{listado}\n\nTRANSCRIPCION:\n{convo}\n\n"
        'SOLO JSON: {"objectives":[{"id":1,"score":"good"}],"items":[{"type":"word","value":"x","score":"partial"}],"errors":["..."]}')
    p = mp._parse_json(raw or "") or {}
    valid = {o["objective_id"] for o in objs}
    objectives = [(int(o["id"]), o["score"]) for o in p.get("objectives", [])
                  if o.get("id") in valid and o.get("score") in ("good", "partial", "fail")]
    ALLOWED = {"word", "phrase", "error"}
    items = []
    for it in p.get("items", []):
        if it.get("value"):
            typ = it.get("type") if it.get("type") in ALLOWED else "word"
            sc = it.get("score") if it.get("score") in ("good", "partial", "fail") else "partial"
            items.append((typ, str(it["value"])[:110], sc))
    items += [("error", str(e)[:110], "fail") for e in p.get("errors", []) if e]
    return {"objectives": objectives, "items": items}


def _pick_topic(db, band, match, kids):
    if kids:
        sql = """SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                 JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s AND t.origin='kids_personal' AND t.title LIKE %s LIMIT 1"""
    else:
        sql = """SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                 JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s AND (t.origin IS NULL OR t.origin<>'kids_personal') AND t.title LIKE %s LIMIT 1"""
    r = db.q1(sql, (band, f"%{match}%"))
    if not r:
        r = db.q1("""SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                     JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s LIMIT 1""", (band,))
    return (r["topic_id"], r["title"]) if r else (None, match)


def _ensure_student(db, band, level, idx):
    key = f"mx_{band[:2]}_{level}_{idx}"[:20]
    row = db.q1("SELECT student_id FROM student WHERE profile_key=%s", (key,))
    if row:
        sid = row["student_id"]
    else:
        with db.conn.cursor() as cur:
            cur.execute("INSERT INTO student (name, profile_key, age, level_code) VALUES (%s,%s,%s,%s)",
                        (f"mx {band} {level}", key, BAND_AGE.get(band, 10), level))
            sid = cur.lastrowid
        db.conn.commit()
    with db.conn.cursor() as cur:  # historia=0 al arrancar
        cur.execute("DELETE FROM learner_objective WHERE student_id=%s", (sid,))
        cur.execute("DELETE FROM learner_item WHERE student_id=%s", (sid,))
    db.conn.commit()
    return sid


def _hist(db, sid):
    db.conn.commit()
    o = db.q1("SELECT COUNT(*) c FROM learner_objective WHERE student_id=%s", (sid,))["c"]
    it = db.q1("SELECT COUNT(*) c FROM learner_item WHERE student_id=%s", (sid,))["c"]
    return o, it


async def run_profile(idx, prof, model, sem):
    band, level, match, kids, who = prof
    async with sem:
        db = motor_engine._connect()
        try:
            tid, title = _pick_topic(db, band, match, kids)
            if not tid:
                return {"idx": idx, "band": band, "level": level, "model": model, "error": "sin tópico"}
            sid = _ensure_student(db, band, level, idx)
            classes = []
            for ci in range(1, CLASSES + 1):
                ho, hi = _hist(db, sid)
                prompt = (await motor_engine.resolve(band, level, tid, sid, None))["prompt"]
                conv = await _one_class(prompt, who, title, model)
                ev = await _judge(level, title, conv)
                classes.append({"class": ci, "hist_obj": ho, "hist_items": hi, "score": ev.get("score"),
                                "verdict": ev.get("verdict"), "conv": conv})
                if ci < CLASSES:
                    await motor_engine.train_apply(sid, await _derive(db, level, conv))
            r = {"idx": idx, "band": band, "level": level, "model": model, "title": title,
                 "scores": [c["score"] for c in classes], "classes": classes}
            _write_transcript(r)
            return r
        finally:
            db.conn.close()


def _write_transcript(r):
    """Vuelca la conversación de las 4 clases a un .md legible en docs/multi-llm-v3."""
    safe_model = r["model"].replace(":", "-").replace("/", "-")
    path = os.path.join(OUT_DIR, f"{r['idx']:02d}_{r['band']}_{r['level']}_{safe_model}.md")
    L = [f"# {r['band']} {r['level']} · {r['title']}",
         f"coach = Gemini · alumno = {r['model']} · juez = Claude  ", ""]
    for c in r["classes"]:
        L.append(f"## Clase {c['class']}  (historia: {c['hist_obj']} obj, {c['hist_items']} items) — score {c['score']}")
        for t in c["conv"]:
            who = "**Profe**" if t["who"] == "Profe" else "Alumno"
            L.append(f"- {who}: {t['text']}")
        if c.get("verdict"):
            L.append(f"\n> veredicto del juez: {c['verdict']}")
        L.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


def _write_results_summary(results):
    """Consolidado del especialista en docs/multi-llm-v3/_RESULTADOS.md (scores + veredictos)."""
    path = os.path.join(OUT_DIR, "_RESULTADOS.md")
    L = ["# Resultados del especialista — banco multi-LLM v3", "",
         "coach = Gemini (prod) · alumno = modelo Ollama (uno por perfil) · juez = Claude (SLA)  ",
         "Score por clase con historia creciente: **0 → 1 → 2 → 3** historias.", "",
         "| Banda | Nivel | Alumno (modelo) | Tópico | h0 | h1 | h2 | h3 |",
         "|---|---|---|---|----|----|----|----|"]
    ok = sorted([r for r in results], key=lambda x: x.get("idx", 99))
    for r in ok:
        if r.get("error"):
            L.append(f"| {r['band']} | {r['level']} | {r['model']} | — | ERROR: {r['error']} | | | |")
            continue
        s = (r["scores"] + ["", "", "", ""])[:4]
        L.append(f"| {r['band']} | {r['level']} | {r['model']} | {r['title']} | {s[0]} | {s[1]} | {s[2]} | {s[3]} |")
    L += ["", "## Veredictos por clase", ""]
    for r in ok:
        if r.get("error"):
            continue
        L.append(f"### {r['band']} {r['level']} · {r['title']} · alumno `{r['model']}`")
        for c in r["classes"]:
            L.append(f"- **Clase {c['class']}** (historia {c['hist_obj']}obj/{c['hist_items']}it) — score **{c['score']}**: {c.get('verdict','')}")
        L.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))


def _persist(results, row_id=None):
    db = motor_engine._connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("""CREATE TABLE IF NOT EXISTS multi_evolution_result (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                data LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
            payload = json.dumps({"results": results}, ensure_ascii=False)
            if row_id:
                cur.execute("UPDATE multi_evolution_result SET data=%s WHERE id=%s", (payload, row_id))
            else:
                cur.execute("INSERT INTO multi_evolution_result (data) VALUES (%s)", (payload,))
                row_id = cur.lastrowid
        db.conn.commit()
        return row_id
    finally:
        db.conn.close()


async def main():
    one = len(sys.argv) > 1 and sys.argv[1] == "one"
    sem = asyncio.Semaphore(1 if one else CONCURRENCY)
    n = 1 if one else min(len(PROFILES), len(STUDENT_MODELS))
    print(f"{'1 alumno (prueba de comunicación)' if one else '10 alumnos'} x niveles x historia 0/1/2/3 · "
          f"coach=Gemini · juez=Claude · transcripciones en docs/multi-llm-v3")
    row_id = _persist([])
    results = []
    tasks = [run_profile(i, PROFILES[i], STUDENT_MODELS[i], sem) for i in range(n)]
    for fut in asyncio.as_completed(tasks):
        r = await fut
        results.append(r)
        if r.get("error"):
            print(f"  [{r['model']}] {r['band']} {r['level']}: ERROR {r['error']}")
        else:
            print(f"  [{r['model']:<22}] {r['band']:>11} {r['level']} · {r['title'][:16]:<16} historia 0→1→2→3: {r['scores']}")
        _persist(results, row_id)
        _write_results_summary(results)
    print("\n-------- RESUMEN (score con 0 / 1 / 2 / 3 historias) --------")
    for r in sorted([x for x in results if not x.get("error")], key=lambda x: x["idx"]):
        print(f"  {r['band']:>11} {r['level']} [{r['model']:<22}] {r['scores']}")
    print("\npersistido en multi_evolution_result")


if __name__ == "__main__":
    asyncio.run(main())

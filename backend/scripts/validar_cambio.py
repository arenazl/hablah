"""CIRCUITO DE VALIDACIÓN (vara oficial para CADA cambio de dato pedagógico).

Los LLM son estocásticos: una corrida da falsos positivos/negativos. Por eso, POR NIVEL:
  5 muestreos × historia 0→1→2→3 = 20 transcripciones por cambio.
- 5 muestreos = 5 modelos de alumno (familias distintas) -> cancela varianza estocástica + sesgo de modelo.
- historia 0→1→2→3 = 4 clases encadenadas; el post-clase (train_apply) escribe la historia y la
  siguiente la lee. Mide el progreso de la clase cuando el alumno VUELVE (el corazón del producto).
- coach = Gemini flash-lite (prod). Ollama serializado (free tier rebota concurrencia).
- juez = Claude SLA (misma vara del handoff = comparable entre corridas).

Guarda un JSON con `tag` (ej. 'baseline', 'iter1') para comparar antes/después de un cambio.

Uso: GEMINI_API_KEY=... python scripts/validar_cambio.py <band> <level> <theme> <tag>
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
from services import motor_engine  # noqa: E402
from services import motor_protocol as mp  # noqa: E402

_OKEY = open(os.path.join(os.path.dirname(__file__), "..", ".ollama_key")).read().strip()
_GKEY = os.environ.get("GEMINI_API_KEY", "")
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "multi-llm-v3"))
MODEL_COACH = "gemini-3.1-flash-lite-preview"
COACH = ("gemini", MODEL_COACH)   # ("gemini"|"ollama", model) — configurable por --coach=prov:model
STUDENT_MODELS = ["gpt-oss:120b", "qwen3-coder:480b", "gemma3:27b", "nemotron-3-nano:30b", "minimax-m3"]
SUPLENTES = ["ministral-3:8b", "gpt-oss:20b", "devstral-small-2:24b", "gemma3:4b"]  # para completar 5 alumnos si el coach sale del pool
EXCHANGES = 3
CLASSES = 4   # historia 0,1,2,3
BAND_AGE = {"early_child": 5, "child": 8, "teen": 12, "adult": 30}
_SCHEMA = {"type": "object", "properties": {"tts": {"type": "string"}}, "required": ["tts"]}
_OLLAMA_SEM = asyncio.Semaphore(1)
_JUDGE_SEM = asyncio.Semaphore(4)

WHO_BASE = {
    ("early_child", "A1"): "un nene de 5 años, nivel A1: casi todo en español, 1-2 palabras en inglés sueltas",
    ("early_child", "A2"): "un nene de 6 años, nivel A2: frases cortas, mezcla español, entusiasta",
    ("child", "A1"): "un nene de 7-8 años, nivel A1: muy básico, frases de 2-3 palabras, mezcla español",
    ("child", "A2"): "un nene de 9 años, nivel A2: frases cortas, entusiasta, algunos errores",
    ("child", "B1"): "un nene de 10-11 años, nivel B1: frases más largas en inglés con errores típicos de su nivel",
    ("teen", "A2"): "un chico de 12, nivel A2: quiere sonar canchero, frases cortas con errores",
    ("teen", "B1"): "un chico de 13, nivel B1: frases más largas, se frustra si no le sale",
    ("teen", "B2"): "un chico de 14, nivel B2: suelto, opina, arriesga estructuras",
    ("adult", "A1"): "un adulto principiante, nivel A1: muy básico, mezcla mucho español, errores de principiante",
    ("adult", "B1"): "un adulto, nivel B1: fluidez media, errores de su nivel, no se autocorrige",
    ("adult", "C1"): "un adulto, nivel C1: muy fluido, busca precisión e idiomático",
}

_RUBRIC = (
    "SOS ESPECIALISTA EN ADQUISICIÓN DE SEGUNDAS LENGUAS (SLA), evaluando una clase de inglés para un "
    "alumno hispanohablante. Evaluá SOLO la actuación del PROFE (coach), no la del alumno.\n"
    "Dimensiones (cada una 1-10): naturalidad (conversación genuina, no carrusel mecánico), afecto (filtro "
    "afectivo), i1 (input i+1 calibrado), reciclado (recircula vocab/lo que dice el alumno), recast (reformula "
    "el error sin señalar), continuity (retoma lo de clases anteriores si hay historia).\n"
    "ESCALA — anclá el score a esto, NO seas avaro (la mayoría de las clases buenas merecen 8):\n"
    " 9-10 = clase modelo: recast invisible, reciclado natural, charla genuina, afecto cálido, sin carrusel.\n"
    " 7-8  = sólida: bien en casi todo, con 1-2 debilidades menores (algún recast perdido, reciclado parcial).\n"
    " 5-6  = funcional pero mecánica: carrusel/entrevista, recast inconsistente, poco reciclado.\n"
    " 3-4  = robótica: ignora aportes del alumno, drilling, afecto muerto.\n"
    "Una clase cálida, con recast presente y sin carrusel, MERECE 8-9: no la bajes por imperfecciones menores. "
    "Reservá <7 para clases realmente mecánicas o frías.\n"
    "NO penalices cobertura de vocab. Si el alumno produjo poco, evaluá si el profe supo INVITAR a producir.\n"
    'Devolvé SOLO JSON: {"score":1-10,"naturalidad":1-10,"afecto":1-10,"i1":1-10,"reciclado":1-10,"recast":1-10,"continuity":1-10,"verdict":"1-2 frases"}'
)


async def _ollama_coach(p, model):
    """Coach por Ollama (test de techo). Contrato {tts} forzado con format=json-schema
    (model-specialist: sin enforcement nativo el modelo improvisa la estructura)."""
    body = {"model": model, "messages": [{"role": "user", "content": p}], "stream": False, "format": _SCHEMA}
    for attempt in range(6):
        async with _OLLAMA_SEM:
            try:
                async with httpx.AsyncClient(timeout=120) as c:
                    r = await c.post("https://ollama.com/api/chat",
                                     headers={"Authorization": f"Bearer {_OKEY}"}, json=body)
                if r.status_code == 200:
                    txt = (r.json().get("message", {}) or {}).get("content", "")
                    if txt:
                        try:
                            return (json.loads(txt).get("tts") or txt).strip()[:400]
                        except Exception:
                            return txt.strip()[:400]
            except Exception:
                pass
        await asyncio.sleep(2 + attempt * 3)
    return "(sin respuesta)"


async def _coach(prompt, history):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (prompt + "\n\n--- CONVERSACIÓN ---\n" + (convo or "(vacía, empezás vos)")
         + "\n\nDevolvé `tts`: SOLO lo que el PROFE dice en voz (limpio, sin emojis), 1-3 oraciones, tu próximo turno:")
    if COACH[0] == "ollama":
        return await _ollama_coach(p, COACH[1])
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{COACH[1]}:generateContent?key={_GKEY}"
    body = {"contents": [{"parts": [{"text": p}]}],
            "generationConfig": {"responseMimeType": "application/json", "responseSchema": _SCHEMA}}
    for _ in range(4):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                d = (await c.post(url, json=body)).json()
            return json.loads(d["candidates"][0]["content"]["parts"][0]["text"])["tts"].strip()[:400]
        except Exception:
            await asyncio.sleep(4)
    return "(sin respuesta)"


async def _student(history, theme, who, model):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    p = (f"Sos {who}. Clase de inglés sobre '{theme}'. Respondé como ese alumno REAL con los errores de tu "
         f"nivel, NUNCA te corrijas.\n\n--- CONVERSACIÓN ---\n{convo}\n\nSOLO tu próximo turno como ALUMNO (1-2 oraciones):")
    body = {"model": model, "messages": [{"role": "user", "content": p}], "stream": False}
    for attempt in range(6):
        async with _OLLAMA_SEM:
            try:
                async with httpx.AsyncClient(timeout=120) as c:
                    r = await c.post("https://ollama.com/api/chat",
                                     headers={"Authorization": f"Bearer {_OKEY}"}, json=body)
                if r.status_code == 200:
                    txt = (r.json().get("message", {}) or {}).get("content", "")
                    if txt:
                        return txt.strip().replace("\n", " ")[:300]
            except Exception:
                pass
        await asyncio.sleep(2 + attempt * 3)
    return "(sin respuesta)"


async def _one_class(prompt, theme, who, model):
    h = [("Profe", await _coach(prompt, []))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _student(h, theme, who, model)))
        h.append(("Profe", await _coach(prompt, h)))
    return [{"who": w, "text": t} for w, t in h]


async def _judge(level, title, conv):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    async with _JUDGE_SEM:
        raw = await mp._claude_headless(f"{_RUBRIC}\n\nClase ({level}) sobre '{title}':\n{convo}")
    return mp._parse_json(raw or "") or {"score": None}


async def _derive(db, level, conv):
    objs = db.q("SELECT objective_id, code, description FROM language_objective WHERE cefr_level=%s ORDER BY sort_order", (level,))
    if not objs:
        return {"objectives": [], "items": []}
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    listado = "\n".join(f'{o["objective_id"]}\t{o["code"]}\t{o["description"]}' for o in objs)
    async with _JUDGE_SEM:
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


def _ensure_student(db, band, level, idx, tag):
    key = f"v_{band[:2]}_{level}_{idx}_{tag}"[:20]
    row = db.q1("SELECT student_id FROM student WHERE profile_key=%s", (key,))
    if row:
        sid = row["student_id"]
    else:
        with db.conn.cursor() as cur:
            cur.execute("INSERT INTO student (name, profile_key, age, level_code) VALUES (%s,%s,%s,%s)",
                        (f"v {band} {level} {idx}", key, BAND_AGE.get(band, 10), level))
            sid = cur.lastrowid
        db.conn.commit()
    with db.conn.cursor() as cur:   # historia=0 al arrancar
        cur.execute("DELETE FROM learner_objective WHERE student_id=%s", (sid,))
        cur.execute("DELETE FROM learner_item WHERE student_id=%s", (sid,))
    db.conn.commit()
    return sid


def _hist(db, sid):
    db.conn.commit()
    o = db.q1("SELECT COUNT(*) c FROM learner_objective WHERE student_id=%s", (sid,))["c"]
    it = db.q1("SELECT COUNT(*) c FROM learner_item WHERE student_id=%s", (sid,))["c"]
    return o, it


def _pick(db, band, match):
    for q, p in [
        ("""SELECT t.topic_id, t.title FROM topic t WHERE t.title LIKE %s AND t.topic_id IN
            (SELECT topic_id FROM topic_suggested_band tsb JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s) LIMIT 1""", (f"%{match}%", band)),
        ("""SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
            JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s LIMIT 1""", (band,)),
    ]:
        r = db.q1(q, p)
        if r:
            return (r["topic_id"], r["title"])
    return (None, match)


async def _sample(idx, band, level, theme, who, model, tag, n_classes):
    """Un muestreo = secuencia historia 0→...→n con train_apply entre clases."""
    db = motor_engine._connect()
    try:
        tid, title = _pick(db, band, theme)
        sid = _ensure_student(db, band, level, idx, tag)
        classes = []
        for ci in range(n_classes):
            ho, hi = _hist(db, sid)
            prompt = (await motor_engine.resolve(band, level, tid, sid, None))["prompt"]
            conv = await _one_class(prompt, title, who, model)
            ev = await _judge(level, title, conv)
            classes.append({"hist_idx": ci, "hist_obj": ho, "hist_items": hi, "eval": ev, "conv": conv})
            print(f"  [{model:<18} m{idx}] hist{ci} (o{ho}/i{hi}) score={ev.get('score')}")
            if ci < n_classes - 1:
                await motor_engine.train_apply(sid, await _derive(db, level, conv))
        return {"idx": idx, "model": model, "title": title, "classes": classes}
    finally:
        db.conn.close()


def _avg(vals):
    nums = [v for v in vals if isinstance(v, (int, float))]
    return round(sum(nums) / len(nums), 2) if nums else None


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    band, level, theme = args[0], args[1], args[2]
    tag = args[3] if len(args) > 3 else "run"
    n_classes = int(args[4]) if len(args) > 4 else CLASSES
    global COACH
    prov, cmodel = opts.get("coach", "gemini:" + MODEL_COACH).split(":", 1)
    COACH = (prov, cmodel)
    # alumnos: 5 de familias distintas; si el coach está en el pool, lo saco y completo con suplente
    students = [m for m in STUDENT_MODELS if m != cmodel]
    for s in SUPLENTES:
        if len(students) >= 5:
            break
        if s not in students and s != cmodel:
            students.append(s)
    students = students[:5]
    who = WHO_BASE.get((band, level), f"un alumno de nivel {level}")
    print(f"CIRCUITO {band} {level} · tag={tag} · coach={prov}:{cmodel} · {len(students)} muestreos × "
          f"historia 0..{n_classes-1} = {len(students)*n_classes} clases\n  alumnos={students}")
    samples = await asyncio.gather(*[
        _sample(i, band, level, theme, who, m, tag, n_classes) for i, m in enumerate(students)])

    # matriz muestreo × historia + promedios por historia
    print(f"\n===== {band} {level} [{tag}] — score por muestreo × historia =====")
    print("muestreo (modelo)".ljust(22) + "".join(f"h{c}".ljust(7) for c in range(n_classes)) + "PROM")
    for s in samples:
        row = [c["eval"].get("score") for c in s["classes"]]
        print(s["model"].ljust(22) + "".join((str(v) if v is not None else "—").ljust(7) for v in row) + str(_avg(row)))
    by_hist = [_avg([s["classes"][c]["eval"].get("score") for s in samples]) for c in range(n_classes)]
    print("PROM x historia".ljust(22) + "".join(str(v).ljust(7) for v in by_hist))
    overall = _avg([c["eval"].get("score") for s in samples for c in s["classes"]])
    print(f"\nGLOBAL [{tag}] = {overall}   (historia 0→{n_classes-1}: {by_hist})")

    path = os.path.join(OUT, f"_validar_{band}_{level}_{tag}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"band": band, "level": level, "tag": tag, "who": who, "coach": f"{prov}:{cmodel}",
                   "models": students, "overall": overall, "by_hist": by_hist, "samples": samples}, f, ensure_ascii=False, indent=1)
    print(f"-> {path}")


if __name__ == "__main__":
    asyncio.run(main())

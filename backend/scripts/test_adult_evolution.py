"""SMOKE DE EVOLUCION - adultos, motor_v3, historia creciente.

Por (nivel x topico): UNA secuencia de 3 clases. Clase 1 con historia=0; entre
clases se corre el post-clase (train_apply) que sube la escalera SRS del alumno, y
la clase siguiente LA LEE (resolve prioriza 'due', saca 'mastered'). Asi vemos si la
clase evoluciona. Cada clase la puntua el especialista pedagogico (SLA).

- Alumno = fila REAL en la tabla `student` de motor_v3 (profile_key 'itest_*'),
  con historia reseteada al arrancar (reversible: borrable por student_id).
- derive_outcomes: el especialista marca que objetivos/lexico se practicaron y con
  que desempeno -> train_apply los persiste.

Uso: python scripts/test_adult_evolution.py          # smoke: 1 secuencia (B1)
     python scripts/test_adult_evolution.py full      # matriz: A1..C2 x 2 topicos
"""
from __future__ import annotations
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:  # consola Windows cp1252 rompe con caracteres del LLM (flechas, etc.)
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from services import motor_engine, motor_protocol as mp  # noqa: E402

LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
TOPICS_PER_LEVEL = 2
CLASSES = 3
EXCHANGES = 3
CONCURRENCY = 3
WHO_ADULT = "un adulto hispanohablante: quiere fluidez, comete errores de su nivel, NUNCA se autocorrige"

_RUBRIC = """SOS UN ESPECIALISTA EN PEDAGOGIA DE IDIOMAS (SLA, 20 anios). Evalua con evidencia.
Marco (aplicalo, no lo nombres): input i+1; filtro afectivo; reciclado; forma+significado; recast suave."""


async def _llm(prompt: str, tries: int = 4, wait: int = 8) -> str:
    last = None
    for i in range(tries):
        try:
            out = await mp._claude_headless(prompt, timeout=90)
            if out:
                return out
            last = RuntimeError("vacio")
        except Exception as e:
            last = e
        await asyncio.sleep(wait)
    raise last


async def _turn(system, history, role_label):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    prompt = (system + "\n\n--- CONVERSACION ---\n" + (convo or "(vacia, empezas vos)")
              + f"\n\nResponde SOLO tu proximo turno como {role_label} (breve, 1-3 oraciones):")
    return ((await _llm(prompt)) or "(sin respuesta)").strip().replace("\n", " ")[:400]


async def _one_class(coach_system, theme):
    student = (f"Sos {WHO_ADULT}. Clase de ingles sobre '{theme}'. Responde como ese alumno REAL, "
               "con los errores de tu nivel, sin hacer de profe. NUNCA te corrijas.")
    h = [("Profe", await _turn(coach_system, [], "el PROFE arrancando"))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _turn(student, h, "el ALUMNO")))
        h.append(("Profe", await _turn(coach_system, h, "el PROFE")))
    return [{"who": w, "text": t} for w, t in h]


async def _evaluate(level, title, conv):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    prompt = (_RUBRIC + f"\nEvalua esta clase de un adulto ({level}) sobre '{title}'.\n\nTRANSCRIPCION:\n{convo}\n\n"
              "Evalua naturalidad, filtro afectivo, i+1, reciclado y calidad pedagogica.\n"
              'Devolve SOLO JSON: {"score":1-10,"naturalness":"alta|media|baja","verdict":"1-2 frases"}')
    return mp._parse_json((await _llm(prompt)) or "") or {"score": None, "verdict": "(no eval)"}


async def _derive_outcomes(db, level, conv):
    """El especialista marca objetivos/lexico practicados -> shape de train_apply."""
    objs = db.q("SELECT objective_id, code, description FROM language_objective WHERE cefr_level=%s ORDER BY sort_order", (level,))
    if not objs:
        return {"objectives": [], "items": []}
    listado = "\n".join(f'{o["objective_id"]}\t{o["code"]}\t{o["description"]}' for o in objs)
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    prompt = (
        "Sos evaluador SLA. De la TRANSCRIPCION, deci QUE objetivos de la lista se practicaron y con que "
        "desempenio (good=solido, partial=intento con ayuda, fail=no salio). Ignora los que no aparecieron.\n"
        f"OBJETIVOS (id, code, desc):\n{listado}\n\nTRANSCRIPCION:\n{convo}\n\n"
        'Devolve SOLO JSON: {"objectives":[{"id":12,"score":"good"}],"items":[{"type":"word","value":"although","score":"partial"}],"errors":["..."]}'
    )
    parsed = mp._parse_json((await _llm(prompt)) or "") or {}
    valid = {o["objective_id"] for o in objs}
    objectives = [(int(o["id"]), o["score"]) for o in parsed.get("objectives", [])
                  if o.get("id") in valid and o.get("score") in ("good", "partial", "fail")]
    # item_type es ENUM('word','phrase','error'); cualquier otro tipo de la IA -> 'word'
    ALLOWED = {"word", "phrase", "error"}
    items = []
    for it in parsed.get("items", []):
        if not it.get("value"):
            continue
        typ = it.get("type") if it.get("type") in ALLOWED else "word"
        sc = it.get("score") if it.get("score") in ("good", "partial", "fail") else "partial"
        items.append((typ, str(it["value"])[:110], sc))
    items += [("error", str(e)[:110], "fail") for e in parsed.get("errors", []) if e]
    return {"objectives": objectives, "items": items}


def _ensure_student(db, level, topic_id, seq_idx):
    key = f"itest_adult_{level}_t{topic_id}_{seq_idx}"
    row = db.q1("SELECT student_id FROM student WHERE profile_key=%s", (key,))
    if row:
        sid = row["student_id"]
    else:
        with db.conn.cursor() as cur:
            cur.execute("INSERT INTO student (name, profile_key, age, level_code) VALUES (%s,%s,%s,%s)",
                        (f"Test adulto {level}", key, 30, level))
            sid = cur.lastrowid
        db.conn.commit()
    # historia=0 al arrancar (reset, idempotente)
    with db.conn.cursor() as cur:
        cur.execute("DELETE FROM learner_objective WHERE student_id=%s", (sid,))
        cur.execute("DELETE FROM learner_item WHERE student_id=%s", (sid,))
    db.conn.commit()
    return sid


def _history_size(db, sid):
    db.conn.commit()  # cerrar txn -> snapshot fresco (train_apply commitea en otra conexion)
    o = db.q1("SELECT COUNT(*) c FROM learner_objective WHERE student_id=%s", (sid,))
    it = db.q1("SELECT COUNT(*) c FROM learner_item WHERE student_id=%s", (sid,))
    return o["c"], it["c"]


async def run_sequence(db, level, topic_id, title, seq_idx, sem):
    async with sem:
        sid = _ensure_student(db, level, topic_id, seq_idx)
        classes = []
        for ci in range(1, CLASSES + 1):
            hist_o, hist_i = _history_size(db, sid)
            res = await motor_engine.resolve("adult", level, topic_id, sid, None)
            conv = await _one_class(res["prompt"], title)
            ev = await _evaluate(level, title, conv)
            classes.append({"class": ci, "history_before": {"obj": hist_o, "items": hist_i},
                            "score": ev.get("score"), "verdict": ev.get("verdict"), "transcript": conv})
            if ci < CLASSES:
                outcomes = await _derive_outcomes(db, level, conv)
                await motor_engine.train_apply(sid, outcomes)
        return {"level": level, "topic_id": topic_id, "title": title, "student_id": sid,
                "scores": [c["score"] for c in classes], "classes": classes}


def _persist(label, results, row_id=None):
    db = motor_engine._connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("""CREATE TABLE IF NOT EXISTS adult_evolution_result (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                label VARCHAR(120), data LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
            payload = json.dumps({"results": results}, ensure_ascii=False)
            if row_id:
                cur.execute("UPDATE adult_evolution_result SET data=%s WHERE id=%s", (payload, row_id))
            else:
                cur.execute("INSERT INTO adult_evolution_result (label, data) VALUES (%s,%s)", (label, payload))
                row_id = cur.lastrowid
        db.conn.commit()
        return row_id
    finally:
        db.conn.close()


async def _pick_topics(db, levels, n):
    """El especialista elige n topicos adultos por nivel de una lista candidata."""
    cands = db.q("""SELECT DISTINCT t.topic_id, t.title FROM topic t
        JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id JOIN age_band ab ON ab.band_id=tsb.band_id
        WHERE ab.code='adult' AND (t.origin IS NULL OR t.origin<>'kids_personal') ORDER BY t.topic_id LIMIT 60""")
    listado = "\n".join(f'{c["topic_id"]}\t{c["title"]}' for c in cands)
    valid = {c["topic_id"]: c["title"] for c in cands}
    prompt = (
        "Sos especialista en pedagogia de idiomas. De la lista de topicos, eligi para CADA nivel CEFR "
        f"({', '.join(levels)}) {n} topicos APROPIADOS para conversacion de adultos de ese nivel "
        "(A1 simples/concretos; C2 abstractos/matizados).\n"
        f"TOPICOS (id, titulo):\n{listado}\n\n"
        'Devolve SOLO JSON: {"A1":[id,id],"A2":[id,id],...}'
    )
    parsed = mp._parse_json((await _llm(prompt)) or "") or {}
    out = {}
    for lv in levels:
        ids = [int(x) for x in parsed.get(lv, []) if int(x) in valid][:n] if parsed.get(lv) else []
        if not ids:  # fallback: primeros candidatos
            ids = list(valid.keys())[:n]
        out[lv] = [(i, valid[i]) for i in ids]
    return out


async def main():
    full = len(sys.argv) > 1 and sys.argv[1] == "full"
    db = motor_engine._connect()
    sem = asyncio.Semaphore(CONCURRENCY)

    if not full:
        # SMOKE: 1 secuencia B1, primer topico adulto
        t = db.q1("""SELECT t.topic_id, t.title FROM topic t
            JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id JOIN age_band ab ON ab.band_id=tsb.band_id
            WHERE ab.code='adult' AND (t.origin IS NULL OR t.origin<>'kids_personal') ORDER BY t.topic_id LIMIT 1""")
        print(f"SMOKE evolucion · adult B1 · '{t['title']}' · {CLASSES} clases (historia creciente)")
        r = await run_sequence(db, "B1", t["topic_id"], t["title"], 1, sem)
        for c in r["classes"]:
            print(f"  clase {c['class']}: historia(obj={c['history_before']['obj']},items={c['history_before']['items']}) "
                  f"-> score={c['score']}")
            print(f"     {(c['verdict'] or '')[:160]}")
        _persist("smoke evolucion B1", [r])
        print(f"\nscores por clase: {r['scores']}  (persistido en adult_evolution_result)")
        db.conn.close()
        return

    # FULL: A1..C2 x N topicos, secuencias concurrentes, persistencia incremental
    picks = await _pick_topics(db, LEVELS, TOPICS_PER_LEVEL)
    seqs = []
    for lv in LEVELS:
        for si, (tid, title) in enumerate(picks[lv], 1):
            seqs.append((lv, tid, title, si))
    print(f"matriz adultos: {len(seqs)} secuencias x {CLASSES} clases · concurrencia {CONCURRENCY}")
    row_id = _persist(f"evolucion adultos FULL ({TOPICS_PER_LEVEL} top/nivel)", [])
    results = []
    tasks = [run_sequence(db, lv, tid, title, si, sem) for (lv, tid, title, si) in seqs]
    for fut in asyncio.as_completed(tasks):
        try:
            r = await fut
            results.append(r)
            print(f"  {r['level']} · {r['title'][:22]:<22} scores={r['scores']}")
        except Exception as e:
            print(f"  ERROR secuencia: {type(e).__name__}: {e}")
        _persist("", results, row_id)
    print("\n-------- RESUMEN EVOLUCION (score clase1 -> 2 -> 3) --------")
    for r in sorted(results, key=lambda x: (LEVELS.index(x["level"]), x["title"])):
        print(f"  {r['level']:>3} · {r['title'][:24]:<24} {r['scores']}")
    db.conn.close()
    print("\npersistido en adult_evolution_result")


if __name__ == "__main__":
    asyncio.run(main())

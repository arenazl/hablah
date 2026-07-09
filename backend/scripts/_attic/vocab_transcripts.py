"""Análisis del DIAL de vocabulario en kids. Para 2 bandas (primera infancia + infancia)
genera la misma clase en 3 condiciones: SIN vocab (libre), 1-2 palabras, 3-4 palabras.
= 6 transcripciones. Reciclado CONVERSACIONAL (no drill). Mismo motor nuevo
(motor_engine.resolve); el vocab se inyecta solo en el string (prod NO se toca). Coach =
claude headless con el prompt del motor; alumno = IA. Persiste en vocab_transcript_result.
"""
from __future__ import annotations
import asyncio
import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine, motor_protocol as mp  # noqa: E402

PROFILES = [
    {"band": "early_child", "level": "A1", "theme": "animal",
     "who": "un nene de 5 años, principiante total (A1), casi todo en español, dice 1-2 palabras en inglés con esfuerzo"},
    {"band": "child", "level": "A2", "theme": "dino",
     "who": "un nene de 8 años (A2): frases cortas, entusiasta, mezcla algo de español si se traba"},
]
# Dosis recomendada por el especialista, por banda: early_child 2-3, child 3-4.
DOSE_BY_BAND = {"early_child": "2 o 3", "child": "3 o 4"}
EXCHANGES = 4
RUNS_PER_SET = 3   # 3 charlas por condición → promediamos (el LLM varía; 1 sola = snapshot ruidoso)


def _retry(fn, tries=5, wait=5):
    last = None
    for i in range(tries):
        try:
            return fn()
        except Exception as e:
            last = e
            print(f"  (reintento DB {i+1}/{tries} tras {type(e).__name__})")
            time.sleep(wait)
    raise last


async def _aretry(coro_fn, tries=5, wait=5):
    last = None
    for i in range(tries):
        try:
            return await coro_fn()
        except Exception as e:
            last = e
            print(f"  (reintento resolve {i+1}/{tries} tras {type(e).__name__})")
            await asyncio.sleep(wait)
    raise last


def _topic_and_vocab(band, theme):
    db = motor_engine._connect()
    try:
        row = db.q1("""SELECT t.topic_id, t.title FROM topic t
                       JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                       JOIN age_band ab ON ab.band_id=tsb.band_id
                       WHERE ab.code=%s AND t.title LIKE %s LIMIT 1""", (band, f"%{theme}%"))
        if not row:
            row = db.q1("""SELECT t.topic_id, t.title FROM topic t
                           JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                           JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s LIMIT 1""", (band,))
        tid = row["topic_id"] if row else None
        title = row["title"] if row else theme
        vocab = []
        if tid:
            vocab = [r["word_en"] for r in db.q(
                """SELECT k.word_en FROM topic_kids_vocab tkv
                   JOIN kids_visual_vocab k ON k.word_en=tkv.word_en
                   WHERE tkv.topic_id=%s ORDER BY k.word_en""", (tid,))]
        return tid, title, vocab
    finally:
        db.conn.close()


def _directive(n, vocab):
    if not n:
        return ""   # libre: improvisación pura
    return ("\n\n--- VOCABULARIO DE ESTA CLASE (kids) ---\n"
            f"Palabras disponibles del tópico (pozo): {', '.join(vocab)}.\n"
            f"Elegí SOLO {n} de esas palabras como foco de hoy (el resto NO se usa hoy).\n"
            "Reciclá esas palabras CONVERSANDO, NO con drills: traelas de vuelta a través de lo que el "
            "nene pregunta o dice, en contexto vivo. PROHIBIDO 'decí conmigo'/'repetí' mecánico — "
            "seguí la curiosidad del nene y meté la palabra natural cuando venga al caso.\n"
            "Anclá cada palabra a su significado (mostrala/actuala). Cerrá con un mini-repaso NATURAL.\n"
            "No traigas vocab en inglés fuera del foco.")


async def turn(system, history, role_label):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    prompt = (system + "\n\n--- CONVERSACIÓN HASTA AHORA ---\n" + (convo or "(vacía, empezás vos)")
              + f"\n\nRespondé SOLO tu próximo turno como {role_label} (breve, 1-3 oraciones, sin acotaciones ni nombres):")
    out = await _aretry(lambda: mp._claude_headless(prompt, timeout=90), tries=4, wait=8)  # resiliente a hipos de Anthropic
    return (out or "(sin respuesta)").strip().replace("\n", " ")[:400]


async def one_class(coach_system, p):
    student = (f"Sos {p['who']}. Estás en una clase de inglés sobre '{p['theme']}'. "
               "Respondé como ese alumno REAL: natural, con los errores de tu nivel, sin hacer de profe. NUNCA te corrijas.")
    history = []
    history.append(("Profe", await turn(coach_system, history, "el PROFE arrancando la clase")))
    for _ in range(EXCHANGES):
        history.append(("Alumno", await turn(student, history, "el ALUMNO")))
        history.append(("Profe", await turn(coach_system, history, "el PROFE")))
    return [{"who": w, "text": t} for w, t in history]


async def run_profile(p):
    tid, title, vocab = _retry(lambda: _topic_and_vocab(p["band"], p["theme"]))
    res = await _aretry(lambda: motor_engine.resolve(p["band"], p["level"], tid, None, None))
    base = res["prompt"]
    n = DOSE_BY_BAND.get(p["band"], "3 o 4")
    print(f"  {p['band']} {p['level']} · '{title}' · pozo {len(vocab)} · dosis={n}")
    conditions = [
        ("libre", "Sin vocab (libre)", ""),
        ("dosed", f"{n} palabras (especialista)", _directive(n, vocab)),
    ]
    runs = []
    for key, label, directive in conditions:
        charlas = []
        for i in range(RUNS_PER_SET):
            print(f"    {label} — charla {i+1}/{RUNS_PER_SET} ...")
            conv = await one_class(base + directive, p)
            charlas.append({"transcript": conv})
        runs.append({"key": key, "label": label, "charlas": charlas})
    return {"band": p["band"], "level": p["level"], "title": title, "vocab": vocab, "dose": n, "runs": runs}


def _persist(profiles):
    db = motor_engine._connect()
    with db.conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS vocab_transcript_result (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, data LONGTEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
        cur.execute("DELETE FROM vocab_transcript_result")
        cur.execute("INSERT INTO vocab_transcript_result (data) VALUES (%s)",
                    (json.dumps({"profiles": profiles}, ensure_ascii=False),))
    db.conn.commit(); db.conn.close()


async def main():
    profiles = []
    for p in PROFILES:
        profiles.append(await run_profile(p))
    _retry(lambda: _persist(profiles))
    print("persistido en vocab_transcript_result")


if __name__ == "__main__":
    asyncio.run(main())

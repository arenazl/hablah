"""Análisis: ¿cómo cambia la clase de kids cuando el coach DEBE seguir el vocabulario
del tópico? Mismo motor nuevo (motor_engine.resolve). Por perfil kids genera la MISMA
clase en dos variantes: SIN vocab (como hoy) y CON vocab (lista del tópico inyectada en
el prompt, obligado a usarla). Prod NO se toca: la inyección va solo en el string. Coach
= claude headless con el prompt del motor; alumno = IA. Persiste en vocab_transcript_result.
"""
from __future__ import annotations
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine, motor_protocol as mp  # noqa: E402

PROFILES = [
    {"band": "early_child", "level": "A1", "theme": "animal",
     "who": "un nene de 5 años, principiante total (A1), casi todo en español, dice 1-2 palabras en inglés con esfuerzo"},
    {"band": "child", "level": "A2", "theme": "dino",
     "who": "un nene de 8 años (A2): frases cortas, entusiasta, mezcla algo de español si se traba"},
]
EXCHANGES = 4


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


async def turn(system, history, role_label):
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    prompt = (system + "\n\n--- CONVERSACIÓN HASTA AHORA ---\n" + (convo or "(vacía, empezás vos)")
              + f"\n\nRespondé SOLO tu próximo turno como {role_label} (breve, 1-3 oraciones, sin acotaciones ni nombres):")
    out = await mp._claude_headless(prompt, timeout=90)
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
    tid, title, vocab = _topic_and_vocab(p["band"], p["theme"])
    res = await motor_engine.resolve(p["band"], p["level"], tid, None, None)
    base = res["prompt"]
    directive = ("\n\n--- VOCABULARIO DE ESTA CLASE (obligatorio, kids) ---\n"
                 f"Enseñá y usá ESTAS palabras, son las que el chico tiene que aprender hoy: {', '.join(vocab)}.\n"
                 "Tejelas naturalmente en la charla. No traigas vocabulario en inglés fuera de esta lista.")
    print(f"  {p['band']} {p['level']} · '{title}' · {len(vocab)} palabras")
    print("    sin vocab...")
    sin = await one_class(base, p)
    print("    con vocab...")
    con = await one_class(base + directive, p)
    return {"band": p["band"], "level": p["level"], "title": title, "vocab": vocab, "sin": sin, "con": con}


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
    _persist(profiles)
    print("persistido en vocab_transcript_result")
    for pr in profiles:
        print(f"\n===== {pr['band']} {pr['level']} · {pr['title']} · vocab: {', '.join(pr['vocab'][:12])} =====")
        for label, conv in (("SIN VOCAB", pr["sin"]), ("CON VOCAB", pr["con"])):
            print(f"  --- {label} ---")
            for line in conv:
                print(f"    {line['who']}: {line['text']}")


if __name__ == "__main__":
    asyncio.run(main())

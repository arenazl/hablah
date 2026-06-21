"""Clase real de prueba: el COACH lo maneja el motor (su prompt de 9 etapas) y el
ALUMNO lo hace la IA (hispanohablante con errores típicos del nivel). Todo generado
de verdad (claude headless), cero invento. Imprime las transcripciones de 3 perfiles.
"""
from __future__ import annotations
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine, motor_protocol as mp  # noqa: E402

_HERE = os.path.dirname(__file__)
sys.path.insert(0, _HERE)
from snapshot_catalog import make_snapshot, restore  # noqa: E402

PROFILES = [
    {"band": "early_child", "level": "A1", "theme": "animales", "who": "un nene de 5 años, principiante total (A1), casi todo en español, dice 1-2 palabras en inglés con esfuerzo"},
    {"band": "teen", "level": "B1", "theme": "redes sociales", "who": "un adolescente de 15 (B1): se anima a frases, comete errores típicos (since/for, present perfect, people is), mezcla algo de español si se traba"},
    {"band": "adult", "level": "C1", "theme": "trabajo remoto", "who": "un adulto (C1) fluido: habla casi todo en inglés, errores sutiles (falsos amigos como 'actually', matices), busca naturalidad"},
]
EXCHANGES = 5


async def turn(system: str, history: list[tuple[str, str]], role_label: str) -> str:
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    prompt = (system + "\n\n--- CONVERSACIÓN HASTA AHORA ---\n" + (convo or "(vacía, empezás vos)")
              + f"\n\nRespondé SOLO tu próximo turno como {role_label} (breve, 1-3 oraciones, sin acotaciones ni nombres):")
    out = await mp._claude_headless(prompt, timeout=90)
    return (out or "(sin respuesta)").strip().replace("\n", " ")[:400]


async def run_profile(p: dict):
    topic_id = None
    db = motor_engine._connect()
    try:
        row = db.q1("""SELECT t.topic_id FROM topic t JOIN subcategory s ON s.subcategory_id=t.subcategory_id
                       JOIN category c ON c.category_id=s.category_id
                       JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                       JOIN age_band ab ON ab.band_id=tsb.band_id
                       WHERE ab.code=%s AND t.title LIKE %s LIMIT 1""", (p["band"], f"%{p['theme'][:5]}%"))
        if not row:
            row = db.q1("""SELECT t.topic_id FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                           JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s LIMIT 1""", (p["band"],))
        topic_id = row["topic_id"] if row else None
    finally:
        db.conn.close()
    res = await motor_engine.resolve(p["band"], p["level"], topic_id, None, None)
    coach_system = res["prompt"]
    student_system = (f"Sos {p['who']}. Estás en una clase de inglés sobre '{p['theme']}'. "
                      "Respondé como ese alumno REAL: natural, con los errores propios de tu nivel, sin hacer de profe. NUNCA te corrijas a vos mismo.")
    history: list[tuple[str, str]] = []
    # el profe arranca
    history.append(("Profe", await turn(coach_system, history, "el PROFE arrancando la clase")))
    for _ in range(EXCHANGES):
        history.append(("Alumno", await turn(student_system, history, "el ALUMNO")))
        history.append(("Profe", await turn(coach_system, history, "el PROFE")))
    return {**p, "topic_id": topic_id, "history": history}


async def capture_all() -> list:
    out = []
    for p in PROFILES:
        print(f"  clase: {p['band']} {p['level']} ({p['theme']}) ...")
        r = await run_profile(p)
        out.append({"band": p["band"], "level": p["level"], "theme": p["theme"],
                    "history": [{"who": w, "text": t} for w, t in r["history"]]})
    return out


def _persist(antes, despues):
    import json
    db = motor_engine._connect()
    with db.conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS transcript_result (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, data LONGTEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
        cur.execute("DELETE FROM transcript_result")
        cur.execute("INSERT INTO transcript_result (data) VALUES (%s)",
                    (json.dumps({"antes": antes, "despues": despues}, ensure_ascii=False),))
    db.conn.commit(); db.conn.close()


async def main():
    sid = make_snapshot("pre-transcripts (estado aplicado)")
    print("=== DESPUÉS (catálogo aplicado) ===")
    despues = await capture_all()
    print("restaurando snapshot 1 para el ANTES...")
    restore(1)
    print("=== ANTES (snapshot 1, pre-especialista) ===")
    antes = await capture_all()
    print(f"volviendo al estado aplicado (#{sid})...")
    restore(sid)
    _persist(antes, despues)
    print("transcripciones persistidas en transcript_result")


if __name__ == "__main__":
    asyncio.run(main())

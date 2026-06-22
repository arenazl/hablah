"""Smoke test post-cambio (regla de arenazl): despues de CADA cambio que toque el
motor o el catalogo, generar transcripciones reales por motor_v3 (modo LIBRE) y que
el especialista pedagogico (SLA) las puntue. Valida que el cambio no degrado la clase.

- NO toca produccion (composer_proto). Resuelve con motor_engine.resolve (motor_v3).
- Coach = claude headless con el prompt del motor; alumno = claude (rol nene).
- Eval = especialista pedagogico, rubrica de modo LIBRE (naturalidad / filtro afectivo /
  i+1), NO penaliza cobertura de vocab.
- Persiste en `smoke_result` (historial, reversible) + imprime PASS/FAIL vs umbral.

Uso: python scripts/smoke_motor_transcripts.py
"""
from __future__ import annotations
import asyncio
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine, motor_protocol as mp  # noqa: E402

PASS_THRESHOLD = 7.0
EXCHANGES = 3  # ida/vuelta; smoke = corto

# Perfiles smoke sobre los topicos kids RECIEN migrados (origin='kids_personal')
SMOKE = [
    {"band": "early_child", "level": "A1", "match": "familia",
     "who": "un nene de 5 anios, principiante total (A1), casi todo en espaniol, dice 1-2 palabras en ingles con esfuerzo"},
    {"band": "child", "level": "A2", "match": "escuela",
     "who": "un nene de 8 anios (A2): frases cortas, entusiasta, mezcla algo de espaniol si se traba"},
]

_RUBRIC = """SOS UN ESPECIALISTA EN PEDAGOGIA DE IDIOMAS (SLA, 20 anios de aula). Evalua con
evidencia, no impresion. Marco (aplicalo, no lo nombres):
- Input comprensible i+1: 90-98% familiar para el chico; si se le va, sube el filtro afectivo.
- Filtro afectivo: calido, celebra intentos, baja ansiedad, no corta fluidez por un error menor.
- Reciclado: re-usa lo que ya aparecio en la charla, no dice todo una sola vez.
- Forma+significado: ancla lo concreto a su significado.
- Correccion: para chicos, recast suave; explicito solo si un error DISCRETO persiste.
"""


async def _llm(prompt: str, tries: int = 4, wait: int = 8) -> str:
    last = None
    for i in range(tries):
        try:
            return await mp._claude_headless(prompt, timeout=90)
        except Exception as e:  # resiliente a hipos de Anthropic
            last = e
            print(f"  (reintento LLM {i + 1}/{tries} tras {type(e).__name__})")
            await asyncio.sleep(wait)
    raise last


async def _aretry(coro_fn, tries: int = 5, wait: int = 5):
    last = None
    for i in range(tries):
        try:
            return await coro_fn()
        except Exception as e:
            last = e
            print(f"  (reintento resolve {i + 1}/{tries} tras {type(e).__name__})")
            await asyncio.sleep(wait)
    raise last


def _pick_topic(db, band: str, match: str):
    row = db.q1(
        """SELECT t.topic_id, t.title FROM topic t
           JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
           JOIN age_band ab ON ab.band_id=tsb.band_id
           WHERE ab.code=%s AND t.origin='kids_personal' AND t.title LIKE %s LIMIT 1""",
        (band, f"%{match}%"),
    )
    if not row:
        row = db.q1(
            """SELECT t.topic_id, t.title FROM topic t
               JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
               JOIN age_band ab ON ab.band_id=tsb.band_id
               WHERE ab.code=%s AND t.origin='kids_personal' LIMIT 1""",
            (band,),
        )
    return (row["topic_id"], row["title"]) if row else (None, match)


async def _turn(system: str, history: list, role_label: str) -> str:
    convo = "\n".join(f"{r}: {t}" for r, t in history)
    prompt = (system + "\n\n--- CONVERSACION HASTA AHORA ---\n" + (convo or "(vacia, empezas vos)")
              + f"\n\nResponde SOLO tu proximo turno como {role_label} (breve, 1-3 oraciones, sin acotaciones ni nombres):")
    out = await _llm(prompt)
    return (out or "(sin respuesta)").strip().replace("\n", " ")[:400]


async def _one_class(coach_system: str, who: str, theme: str) -> list:
    student = (f"Sos {who}. Estas en una clase de ingles sobre '{theme}'. "
               "Responde como ese alumno REAL: natural, con los errores de tu nivel, sin hacer de profe. NUNCA te corrijas.")
    history: list = []
    history.append(("Profe", await _turn(coach_system, history, "el PROFE arrancando la clase")))
    for _ in range(EXCHANGES):
        history.append(("Alumno", await _turn(student, history, "el ALUMNO")))
        history.append(("Profe", await _turn(coach_system, history, "el PROFE")))
    return [{"who": w, "text": t} for w, t in history]


async def _evaluate(pr: dict, conv: list) -> dict:
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    prompt = (
        _RUBRIC +
        f"\nEvalua esta clase LIBRE (improvisacion pura, SIN vocab obligatorio) de un nene "
        f"({pr['band']} {pr['level']}) sobre '{pr['title']}'.\n\nTRANSCRIPCION:\n{convo}\n\n"
        "Evalua la NATURALIDAD/magia, el filtro afectivo, la comprensibilidad i+1 y la calidad "
        "pedagogica. Aca NO hay vocab obligatorio: NO penalices por no seguir una lista.\n"
        "Devolve SOLO JSON: {\"score\":1-10,\"naturalness\":\"alta|media|baja\","
        "\"strengths\":[\"...\"],\"issues\":[\"...\"],\"verdict\":\"1-2 frases\"}"
    )
    raw = await _llm(prompt)
    return mp._parse_json(raw or "") or {"score": None, "verdict": "(no se pudo evaluar)"}


def _persist(results: list) -> None:
    db = motor_engine._connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("""CREATE TABLE IF NOT EXISTS smoke_result (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                label VARCHAR(120), data LONGTEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
            cur.execute("INSERT INTO smoke_result (label, data) VALUES (%s,%s)",
                        (f"migracion kids->v3 {datetime.now():%Y-%m-%d %H:%M}",
                         json.dumps({"results": results}, ensure_ascii=False)))
        db.conn.commit()
    finally:
        db.conn.close()


async def main() -> None:
    db = motor_engine._connect()
    profiles = []
    for sm in SMOKE:
        tid, title = _pick_topic(db, sm["band"], sm["match"])
        profiles.append({**sm, "topic_id": tid, "title": title})
    db.conn.close()

    results = []
    for pr in profiles:
        print(f"\n=== {pr['band']} {pr['level']} · '{pr['title']}' (v3 topic #{pr['topic_id']}) ===")
        res = await _aretry(lambda: motor_engine.resolve(pr["band"], pr["level"], pr["topic_id"], None, None))
        conv = await _one_class(res["prompt"], pr["who"], pr["title"])
        ev = await _evaluate(pr, conv)
        score = ev.get("score")
        print(f"  score={score} · naturalidad={ev.get('naturalness')}")
        print(f"  veredicto: {(ev.get('verdict') or '')[:240]}")
        results.append({"band": pr["band"], "level": pr["level"], "title": pr["title"],
                        "topic_id": pr["topic_id"], "transcript": conv, "eval": ev})

    _persist(results)
    scores = [r["eval"].get("score") for r in results if isinstance(r["eval"].get("score"), (int, float))]
    avg = round(sum(scores) / len(scores), 1) if scores else None
    ok = avg is not None and avg >= PASS_THRESHOLD
    print(f"\n{'PASS' if ok else 'REVISAR'} · promedio={avg} (umbral {PASS_THRESHOLD}) · persistido en smoke_result")


if __name__ == "__main__":
    asyncio.run(main())

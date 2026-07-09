"""IDEA 3 - vocab como PERLITA: 0 detalle vs 1 detalle cultural.

Hipotesis (arenazl): forzar un POZO de vocab degrada (ya probado), pero UNA sola
perlita cultural (una banda, un cuadro, una peli, un lugar) tejida natural NO deberia
degradar. Se mide por NATURALIDAD (no por cobertura).

Por perfil: 2 condiciones x N corridas.
  - libre   : motor_v3 puro (0 detalle)
  - perlita : motor_v3 + directiva de UN solo dato cultural, natural (no lista, no 'repeti')
El especialista puntua naturalidad/filtro afectivo/i+1, y si la perlita sono natural/forzada.

Uso: python scripts/test_vocab_perlita.py
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
from services import motor_engine, motor_protocol as mp  # noqa: E402

EXCHANGES = 3
RUNS = 3
CONCURRENCY = 4

PERLITA = (
    "\n\n--- DETALLE DE COLOR (1 sola perlita) ---\n"
    "Si viene al caso NATURALMENTE, dejá caer UN (1) dato cultural concreto y lindo sobre el tema "
    "(una banda, un cuadro, una peli, un lugar, un ejemplo famoso), tejido en la charla. "
    "NO es lista de vocabulario, NO 'repetí conmigo', NO lo expliques como dato enciclopédico. "
    "UNO solo, natural. Si no encaja, no lo fuerces."
)

PROFILES = [
    {"band": "early_child", "level": "A1", "match": "familia", "kids": True,
     "who": "un nene de 5 anios (A1), casi todo en espaniol, 1-2 palabras en ingles"},
    {"band": "child", "level": "A2", "match": "escuela", "kids": True,
     "who": "un nene de 8 anios (A2): frases cortas, entusiasta, mezcla espaniol"},
    {"band": "adult", "level": "B1", "match": "música", "kids": False,
     "who": "un adulto (B1) que quiere fluidez, comete errores de su nivel, no se autocorrige"},
    {"band": "adult", "level": "B2", "match": "cine", "kids": False,
     "who": "un adulto (B2) suelto, opina, arriesga estructuras"},
]

_RUBRIC = ("SOS ESPECIALISTA SLA. Evalua NATURALIDAD/magia, filtro afectivo, i+1, reciclado. "
           "NO penalices por no seguir una lista de vocab.")


async def _llm(p):
    for _ in range(4):
        try:
            o = await mp._claude_headless(p, timeout=90)
            if o:
                return o
        except Exception:
            pass
        await asyncio.sleep(6)
    return ""


async def _turn(system, hist, role):
    convo = "\n".join(f"{r}: {t}" for r, t in hist)
    out = await _llm(system + "\n\n--- CONVERSACION ---\n" + (convo or "(vacia)")
                     + f"\n\nRespondé SOLO tu turno como {role} (1-3 oraciones):")
    return (out or "(sin respuesta)").strip().replace("\n", " ")[:400]


async def _class(coach, who, theme):
    st = f"Sos {who}. Clase de ingles sobre '{theme}'. Respondé como ese alumno real, con tus errores, sin autocorregirte."
    h = [("Profe", await _turn(coach, [], "el PROFE arrancando"))]
    for _ in range(EXCHANGES):
        h.append(("Alumno", await _turn(st, h, "el ALUMNO")))
        h.append(("Profe", await _turn(coach, h, "el PROFE")))
    return [{"who": w, "text": t} for w, t in h]


async def _eval(level, title, conv, is_perlita):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    extra = ('"detail_felt":"natural|forzado|ausente",' if is_perlita else "")
    prompt = (f"{_RUBRIC}\nClase ({level}) sobre '{title}'.\n{convo}\n\n"
              + ("La consigna pedia dejar caer 1 dato cultural natural. " if is_perlita else "")
              + 'Devolve SOLO JSON: {"score":1-10,"naturalness":"alta|media|baja",' + extra + '"verdict":"1-2 frases"}')
    return mp._parse_json(await _llm(prompt)) or {"score": None}


def _pick(db, pr):
    if pr["kids"]:
        sql = """SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                 JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s AND t.origin='kids_personal' AND t.title LIKE %s LIMIT 1"""
    else:
        sql = """SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                 JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s AND (t.origin IS NULL OR t.origin<>'kids_personal') AND t.title LIKE %s LIMIT 1"""
    r = db.q1(sql, (pr["band"], f"%{pr['match']}%"))
    if not r:  # fallback: cualquiera de la banda
        r = db.q1("""SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
                     JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s LIMIT 1""", (pr["band"],))
    return r["topic_id"], r["title"]


def _avg(items):
    ss = [x.get("score") for x in items if isinstance(x.get("score"), (int, float))]
    return round(sum(ss) / len(ss), 1) if ss else None


async def run_profile(db, pr, sem):
    tid, title = _pick(db, pr)
    base = (await motor_engine.resolve(pr["band"], pr["level"], tid, None, None))["prompt"]

    async def one(prompt, is_perlita):
        async with sem:
            return await _eval(pr["level"], title, await _class(prompt, pr["who"], title), is_perlita)

    libre = await asyncio.gather(*[one(base, False) for _ in range(RUNS)])
    perlita = await asyncio.gather(*[one(base + PERLITA, True) for _ in range(RUNS)])
    feels = [e.get("detail_felt") for e in perlita if e.get("detail_felt")]
    return {"band": pr["band"], "level": pr["level"], "title": title,
            "avg_libre": _avg(libre), "avg_perlita": _avg(perlita), "detail_felt": feels,
            "libre": libre, "perlita": perlita}


async def main():
    db = motor_engine._connect()
    sem = asyncio.Semaphore(CONCURRENCY)
    print(f"Idea 3 · 0 vs 1 perlita · {len(PROFILES)} perfiles x {RUNS} corridas/condicion")
    results = []
    for pr in PROFILES:
        r = await run_profile(db, pr, sem)
        results.append(r)
        print(f"  {r['band']:>11} {r['level']} · {r['title'][:20]:<20} libre={r['avg_libre']}  perlita={r['avg_perlita']}  detalle={r['detail_felt']}")
    with db.conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS vocab_perlita_result (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            data LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
        cur.execute("INSERT INTO vocab_perlita_result (data) VALUES (%s)", (json.dumps({"results": results}, ensure_ascii=False),))
    db.conn.commit()
    print("\n-------- RESUMEN (0 vs 1 perlita) --------")
    for r in results:
        d = "=" if r['avg_libre'] == r['avg_perlita'] else ("perlita mejor" if (r['avg_perlita'] or 0) > (r['avg_libre'] or 0) else "libre mejor")
        print(f"  {r['band']:>11} {r['level']} · libre={r['avg_libre']} perlita={r['avg_perlita']} -> {d}")
    db.conn.close()
    print("\npersistido en vocab_perlita_result")


if __name__ == "__main__":
    asyncio.run(main())

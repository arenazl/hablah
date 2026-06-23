"""Smoke de los niveles nuevos A0 y C2 (tras seed_levels_a0_c2). Resuelve y corre
una clase real por cada uno + eval del especialista. Confirma que no rompimos nada
y que los niveles nuevos dan clase coherente.
"""
from __future__ import annotations
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from services import motor_engine, motor_protocol as mp  # noqa: E402

EXCHANGES = 3
_RUBRIC = ("SOS ESPECIALISTA SLA. Evalua filtro afectivo, i+1, reciclado, recast, naturalidad. "
           "Devolve SOLO JSON: {\"score\":1-10,\"verdict\":\"1-2 frases\"}")


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


async def _eval(level, title, conv):
    convo = "\n".join(f"{l['who']}: {l['text']}" for l in conv)
    return mp._parse_json(await _llm(f"{_RUBRIC}\nClase ({level}) sobre '{title}'.\n{convo}")) or {"score": None}


async def main():
    db = motor_engine._connect()
    a0 = db.q1("""SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
        JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code='early_child' AND t.origin='kids_personal' LIMIT 1""")
    c2 = db.q1("""SELECT t.topic_id, t.title FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
        JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code='adult' AND (t.origin IS NULL OR t.origin<>'kids_personal') LIMIT 1""")
    db.conn.close()

    cases = [
        ("early_child", "A0", a0, "un nene de 4 anios que recien arranca, casi todo en espaniol, 1 palabra en ingles"),
        ("adult", "C2", c2, "un adulto avanzado (C2): fluido, matizado, busca precision idiomatica"),
    ]
    for band, level, t, who in cases:
        res = await motor_engine.resolve(band, level, t["topic_id"], None, None)
        ev = await _eval(level, t["title"], await _class(res["prompt"], who, t["title"]))
        print(f"{band} {level} · {t['title']}: score={ev.get('score')}")
        print(f"   {(ev.get('verdict') or '')[:180]}")


if __name__ == "__main__":
    asyncio.run(main())

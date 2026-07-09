"""Pobla el `objective` REAL (comunicativo, por banda) de los 29 topicos kids migrados
a motor_v3 (origin='kids_personal'), reemplazando el template "Conversar sobre...".
IA genera 1 objetivo por topico -> persiste. Reversible: dump del objective previo.

Uso: python scripts/gen_kids_objectives.py
"""
from __future__ import annotations
import asyncio
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine, motor_protocol  # noqa: E402

BAND_LABEL = {"early_child": "primera infancia (4-7)", "child": "ninez (7-10)", "teen": "pre-adolescencia (10-14)"}


async def main() -> None:
    db = motor_engine._connect()
    rows = db.q(
        """SELECT t.topic_id, t.title, t.objective, ab.code AS band
           FROM topic t
           JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
           JOIN age_band ab ON ab.band_id=tsb.band_id
           WHERE t.origin='kids_personal' ORDER BY t.topic_id"""
    )
    if not rows:
        print("no hay topicos kids_personal"); db.conn.close(); return

    # backup de objetivos previos (reversible)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    bpath = os.path.join(os.path.dirname(__file__), f"_backup_kids_objectives_{ts}.json")
    with open(bpath, "w", encoding="utf-8") as f:
        json.dump([{"topic_id": r["topic_id"], "objective": r["objective"]} for r in rows],
                  f, ensure_ascii=False, indent=2)
    print(f"[backup] {bpath}")

    listado = "\n".join(f'{r["topic_id"]}\t{r["title"]}\t[{BAND_LABEL.get(r["band"], r["band"])}]' for r in rows)
    prompt = (
        "Sos disenador pedagogico de ingles para chicos (enfoque comunicativo, SLA). "
        "Para cada topico de abajo (id, titulo, banda de edad) escribi UN objetivo comunicativo de la clase, "
        "en ESPANOL, 1 sola linea (max 130 chars), CONCRETO: que va a poder DECIR/HACER el chico en ingles, "
        "apropiado a la edad, sin jerga pedagogica, sin nombrar teorias.\n\n"
        f"TOPICOS:\n{listado}\n\n"
        'Devolve SOLO JSON: {"objectives":[{"id":135,"objective":"..."}]}'
    )
    raw = await motor_protocol._run_llm(prompt, "claude")
    parsed = motor_protocol._parse_json(raw or "") or {}
    objs = {int(o["id"]): str(o["objective"]).strip()
            for o in parsed.get("objectives", []) if o.get("id") and o.get("objective")}

    updated = 0
    for r in rows:
        obj = objs.get(r["topic_id"])
        if not obj:
            print(f"  [skip] #{r['topic_id']} {r['title']} (sin objetivo de la IA)")
            continue
        with db.conn.cursor() as cur:
            cur.execute("UPDATE topic SET objective=%s WHERE topic_id=%s", (obj[:200], r["topic_id"]))
        db.conn.commit()
        print(f"  #{r['topic_id']:>3} {r['title'][:28]:<28} -> {obj[:80]}")
        updated += 1

    print(f"\n[resultado] objetivos actualizados: {updated}/{len(rows)}")
    db.conn.close()


if __name__ == "__main__":
    asyncio.run(main())

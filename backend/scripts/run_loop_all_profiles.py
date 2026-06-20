"""Test del LOOP por perfil (el 50% de la app): cada perfil DESDE 0 ->
corre una clase -> verifica que el learned_state se SUMA a la orquestación
(la etapa 5 pasa de vacía a tener presets+directivas, y el prompt cambia).
Si un perfil no mejora clase a clase, lo marca FAIL.

Deja los perfiles con su historial (para verlos en /motor); 'Borrar historial' limpia.
"""
from __future__ import annotations
import asyncio
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine, motor_protocol as mp  # noqa: E402

OBS = {
    1: ["dijo 'I have 6 years'", "se prendio con los animales", "le costo repetir 'dog'"],
    2: ["dijo 'the dog are big'", "se enrosco con los colores", "dijo 'I no like'"],
    3: ["dijo 'I have seen that yesterday'", "uso bien 'because'", "se trabo con el pasado de 'go'"],
    4: ["dijo 'I have 30 years'", "le encanta hablar de viajes", "confundio since y for"],
    5: ["se frustro cuando le pedi passive voice", "uso 'in my opinion' muy bien", "confundio make y do"],
}


def _e5(prompt: str) -> str:
    inner = re.sub(r"</?system_instruction_stack>", "", prompt or "")
    m = re.search(r"<learner_state>([\s\S]*?)</learner_state>", inner)
    return (m.group(1).strip() if m else "")


async def run_profile(band: str, level: str, order: int) -> dict:
    prof = await mp.get_or_create_profile(band, level)
    sid = prof["student_id"]
    await mp.wipe_learned_state(sid)                       # DESDE 0
    r0 = await motor_engine.resolve(band, level, None, sid, None)
    e5_before = _e5(r0.get("prompt"))
    rep = await mp.process(sid, OBS.get(order, OBS[3]), level)
    if rep.get("error"):
        return {"band": band, "level": level, "ok": False, "why": rep["error"]}
    r1 = await motor_engine.resolve(band, level, None, sid, None)
    e5_after = _e5(r1.get("prompt"))
    presets = await mp.student_presets(sid)
    grew = (e5_before in ("(vacío)", "")) and len(presets) > 0
    changed = (r0.get("prompt") != r1.get("prompt"))
    has_directive = "->" in e5_after
    return {"band": band, "level": level, "ok": grew and changed,
            "presets": len(presets), "changed": changed, "directive": has_directive,
            "objs": rep.get("objectives_applied", {})}


async def main():
    db = motor_engine._connect()
    bands = db.q("SELECT code, max_level_order FROM age_band ORDER BY band_id")
    levels = db.q("SELECT level_code, sort_order FROM `level` ORDER BY sort_order")
    db.conn.close()
    combos = [(b["code"], lv["level_code"], lv["sort_order"]) for b in bands for lv in levels
              if lv["sort_order"] <= b["max_level_order"]]
    print(f"LOOP test — {len(combos)} perfiles, cada uno DESDE 0\n")
    ok = 0
    for band, level, order in combos:
        r = await run_profile(band, level, order)
        if r["ok"]:
            ok += 1
            print(f"  OK   {band:12} {level} | etapa5 vacia -> {r['presets']} presets | prompt cambio={r['changed']} | directiva={r['directive']} | objetivos={len(r['objs'])}")
        else:
            print(f"  FAIL {band:12} {level} | {r.get('why', f'presets={r.get('presets')} changed={r.get('changed')}')}")
    print(f"\nRESUMEN: {ok}/{len(combos)} perfiles mejoran la orquestacion desde 0")


if __name__ == "__main__":
    asyncio.run(main())

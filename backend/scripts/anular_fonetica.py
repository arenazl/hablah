"""Anula la DISCIPLINA fonetica (el track FONR) y saca la onomatopeya del catalogo.

Decision del dueno (16/08): las clases que piden hacer sonidos —como ruge un dragon, como
suena un motor— quedan mal con chicos y quedan mal con grandes, y el motor de voz todavia no
esta para eso. Las clases de chicos tienen que ser didacticas pero con PALABRAS, no con ruidos.

Ojo con el alcance: se anula la disciplina fonetica (el nivel FONR del combo), NO el trabajo
de pronunciacion dentro de una clase normal. Eso ultimo no se toca.

Que hace
--------
  1. levels[FONR].active = 0                  deja de aparecer como opcion en el combo
  2. age_level_matrix[mini x FONR].active = 0 el unico cruce cargado; ahi vivia TODA la
                                              onomatopeya del catalogo ("hacer el sonido
                                              magico del escenario", "intensificacion sonora",
                                              "imitacion del rugido del perro Roco")
  3. categories[19] "Fonetica".active = 0     el COMBO de disciplinas sale de
                                              `categories WHERE active=1` (api/motor.py
                                              /dimensions), asi que sin esto la fonetica
                                              seguia apareciendo como opcion aunque el
                                              nivel estuviera apagado.
  4. topics[187] "El reino del rey Ramon".is_active = 0
                                              es un topico DE fonetica, no un cuento que se
                                              pueda reciclar: su vocabulario generado era
                                              "r-r-r-r-o" y el porton solo abria rugiendo.
                                              Se va con la disciplina. Igual se le limpio la
                                              onomatopeya antes de apagarlo, para que si
                                              alguna vez vuelve, no vuelva pidiendo ruidos.

Verificado antes de escribir: la onomatopeya estaba SOLO en mini x FONR. Los otros dos
matches del barrido eran falsos positivos ("fijar el sonido" en adult A0 es repeticion
guiada; "limitacion" en teen CON3 matcheo por la subcadena).

Backup a scripts/_backup_fonetica_<fecha>.json. Reversible: son flags y tres columnas.
"""
from __future__ import annotations

import asyncio
import datetime
import json
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402

# El cuento se mantiene; lo que se saca es que la puerta se abra HACIENDO un ruido.
# Ahora se abre diciendo la palabra — misma escena, misma R, sin onomatopeya.
SETTING = ("El castillo del rey Ramon, donde el gran porton de piedra se abre cuando decimos "
           "en voz alta la palabra correcta.")
CONFLICT = ("decir bien las palabras del reino para que el porton de piedra del castillo se abra")
ROLE = "somos los guardianes del reino del rey Ramon"


async def main() -> None:
    async with AsyncSessionLocal() as s:
        async def rows(sql):
            return (await s.execute(text(sql))).mappings().all()

        backup = {
            "generado": datetime.datetime.now().isoformat(timespec="seconds"),
            "levels": [dict(r) for r in await rows("SELECT * FROM levels WHERE code='FONR'")],
            "age_level_matrix": [dict(r) for r in await rows(
                "SELECT * FROM age_level_matrix WHERE level_code='FONR'")],
            "topics": [dict(r) for r in await rows("SELECT * FROM topics WHERE id=187")],
        }
        ruta = os.path.join(os.path.dirname(__file__),
                            f"_backup_fonetica_{datetime.date.today().isoformat()}.json")
        with open(ruta, "w", encoding="utf-8") as fh:
            json.dump(backup, fh, ensure_ascii=False, indent=2, default=str)
        print(f"backup -> {os.path.abspath(ruta)}\n")

        hechos = []

        r = await s.execute(text("UPDATE levels SET active=0 WHERE code='FONR' AND active=1"))
        if r.rowcount:
            hechos.append("levels[FONR] -> inactivo (sale del combo)")

        r = await s.execute(text(
            "UPDATE age_level_matrix SET active=0 WHERE level_code='FONR' AND active=1"))
        if r.rowcount:
            hechos.append(f"age_level_matrix[* x FONR] -> inactivo ({r.rowcount} cruce/s) "
                          "— ahi vivia toda la onomatopeya")

        r = await s.execute(text(
            "UPDATE topics SET levels=:l, generated_vocab=NULL, narrative_setting=:s, "
            "narrative_conflict=:c, narrative_role=:ro WHERE id=187"),
            {"l": json.dumps(["A0", "A1"]), "s": SETTING, "c": CONFLICT, "ro": ROLE})
        if r.rowcount:
            hechos.append("topics[187] rey Ramon -> sin FONR, sin 'r-r-r-o', el porton se abre "
                          "diciendo la palabra")

        await s.commit()

    print(f"CAMBIOS: {len(hechos)}")
    for h in hechos:
        print(f"  · {h}")
    if not hechos:
        print("  (nada que hacer — ya estaba anulado)")


if __name__ == "__main__":
    asyncio.run(main())

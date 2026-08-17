"""Corrige las dos leyes que no eran universales, y conecta el ESCALON al filtro.

1. no_repeat_phrasing — "nunca repitas tu propio fraseo"
   Estaba sin condiciones: entraba en TODAS las clases. Pero en la misma clase de un nene de
   nivel Inicial entra tambien `echo_protocol`, que dice literalmente "repeti la palabra clave
   lentamente, estirada, y espera de nuevo". Una prohibe repetir, la otra manda repetir. El
   linter lo viene marcando desde julio como contradiccion directa.

   Un chico fija una palabra PORQUE la escucha muchas veces igual: ahi la repeticion no es un
   defecto, es el andamio. Pasa a valer del escalon 2 (Basico) para arriba — no por edad, sino
   por escalon, porque un adulto arrancando un idioma tambien necesita esa repeticion.

2. harvest_dont_chase — "cuando habla mucho, agarra UNA sola cosa"
   Estaba filtrada desde A2 porque se asumio que nivel bajo = habla poco. Es cierto en idiomas
   (un A0 dice palabras sueltas) y FALSO en conocimiento: un plomero en Inicial sabe muchisimo
   de plomeria y habla cinco minutos. Justo donde mas hace falta, y no entraba.
   Se le saca el filtro de nivel.

   Y su texto decia "turn THAT into the next production IN THE TARGET LANGUAGE" — "el idioma
   meta" no existe en una clase de plomeria. Se reescribe agnostico.

3. El filtro pasa a usar el ESCALON, no `sort_order`
   `sort_order` es un numero interno de cada escalera y se pisaba entre familias: CON2 y A1
   valian los dos 1, asi que filtrar por nivel era un accidente aritmetico — de ahi salia que
   la regla de pronunciacion del ingles entrara en una clase de informatica. Con el escalon
   compartido, decir "del 2 para arriba" significa lo mismo en las dos familias.
"""
from __future__ import annotations

import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402

HARVEST = ("When the student talks A LOT: pick ONE thing they said, celebrate it by name, "
           "turn THAT into what they produce next, and advance. Never chase every thread.")


async def main() -> None:
    async with AsyncSessionLocal() as s:
        # 1. no_repeat_phrasing: del escalon 2 para arriba (A2 en idiomas, CON2 en conocimiento).
        r = await s.execute(text(
            "UPDATE conversation_rules SET min_level='A2' "
            "WHERE slug='no_repeat_phrasing' AND min_level IS NULL"))
        if r.rowcount:
            print("no_repeat_phrasing -> desde el escalon 2 (en Inicial la repeticion es el metodo)")

        # 2. harvest_dont_chase: sin filtro de nivel + texto agnostico.
        r = await s.execute(text(
            "UPDATE conversation_rules SET min_level=NULL, rule_text=:t "
            "WHERE slug='harvest_dont_chase'"), {"t": HARVEST})
        if r.rowcount:
            print("harvest_dont_chase -> sin filtro de nivel, y sin 'in the target language'")

        await s.commit()

        print("\nlas 13 leyes:")
        for x in (await s.execute(text(
            "SELECT slug, families, age_groups, min_level, max_level FROM conversation_rules "
            "WHERE active=1 ORDER BY sort_order"))).mappings():
            cond = []
            if x["families"]:
                cond.append(f"familias={x['families']}")
            if x["age_groups"]:
                cond.append(f"edades={x['age_groups']}")
            if x["min_level"] or x["max_level"]:
                cond.append(f"escalon {x['min_level'] or '·'}->{x['max_level'] or '·'}")
            print(f"  {x['slug']:<24} {'  '.join(cond) or 'SIN CONDICIONES (entra siempre)'}")


if __name__ == "__main__":
    asyncio.run(main())

"""Le agrega a `conversation_rules` el acoplamiento que faltaba: la FAMILIA.

El diagnostico (16/08)
----------------------
El placeholder `reglas_universales_filtradas` no trae un texto: trae las FILAS de
conversation_rules que pasan el filtro. Y el filtro tenia solo tres columnas — edad, nivel
minimo, nivel maximo. Ninguna dice a que TIPO DE CLASE pertenece la regla.

Consecuencia medida: en una clase de jardineria en castellano entraban

    recast_only           "Correct language by recasting only..."
    native_pronunciation  "...pronounce it with NATIVE target-language pronunciation"

o sea, al coach de jardineria le pedian que corrigiera los errores de IDIOMA del alumno y que
cuidara la pronunciacion del idioma meta. El alumno no aprende ningun idioma: aprende a podar,
en su propia lengua.

No es que el texto este mal escrito — esta perfecto para una clase de idiomas. Lo que faltaba
era la columna que dijera eso. El acoplamiento no sobraba: faltaba.

Que hace
--------
  conversation_rules.families  JSON NULL   ['lenguaje'] | ['conocimiento'] | NULL = todas

NULL mantiene el comportamiento actual, asi que la columna es aditiva y no rompe nada.

Se cargan SOLO las tres reglas cuyo texto habla explicitamente de aprender un idioma. El resto
queda en NULL: decidir si una ley de conversacion es de idiomas, de conocimiento o de las dos
es criterio pedagogico del dueno, no una inferencia de este script.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402

# Reglas cuyo TEXTO habla de aprender un idioma. No hay interpretacion: las tres nombran
# correccion de idioma, pronunciacion del idioma meta o produccion de la palabra objetivo.
SOLO_LENGUAJE = {
    "recast_only": "corrige errores de IDIOMA recasteando",
    "native_pronunciation": "pronunciacion del idioma meta dentro del nativo",
    "echo_protocol": "hacer producir la palabra objetivo ('Deci conmigo: X')",
}


async def main() -> None:
    async with AsyncSessionLocal() as s:
        cols = [c["Field"] for c in (await s.execute(text("SHOW COLUMNS FROM conversation_rules"))).mappings()]
        if "families" not in cols:
            await s.execute(text(
                "ALTER TABLE conversation_rules ADD COLUMN families JSON NULL AFTER age_groups"))
            print("conversation_rules.families agregada (NULL = todas las familias)")
        else:
            print("conversation_rules.families ya existia")
        await s.commit()

        for slug, motivo in SOLO_LENGUAJE.items():
            r = await s.execute(text(
                "UPDATE conversation_rules SET families=:f WHERE slug=:s AND families IS NULL"),
                {"f": json.dumps(["lenguaje"]), "s": slug})
            if r.rowcount:
                print(f"  {slug:<22} -> ['lenguaje']   ({motivo})")
        await s.commit()

        print("\nestado de las 13 leyes:")
        for r in (await s.execute(text(
            "SELECT slug, families, age_groups, min_level, max_level FROM conversation_rules "
            "WHERE active=1 ORDER BY sort_order"))).mappings():
            fam = r["families"] or "todas"
            print(f"  {r['slug']:<24} familias={str(fam):<16} edades={str(r['age_groups'] or 'todas'):<22} "
                  f"{r['min_level'] or '·'}→{r['max_level'] or '·'}")


if __name__ == "__main__":
    asyncio.run(main())

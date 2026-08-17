"""Ley cross-app: toda clase arranca en tibio, 2 o 3 intercambios, sin importar nivel ni tema.

El caso que la motivo
---------------------
Giulia, adulto, Desarrollo web, nivel Avanzado. El coach abrio asi:

    "Hola, Giulia. Che, estaba pensando en un dilema... Imaginate que tenes que sacar un MVP
     para ayer y el 99% entra por mobile. El cliente te apura mal. Vos que decis: te jugas a
     sacar algo no-responsive de entrada... o crees que eso te pudre la arquitectura del
     backend y es mejor no arriesgarse?"

Y la alumna: "epa, arrancaste medio a fondo, bajamos, no entendi".

El coach NO improviso. Hizo exactamente lo que decia el catalogo:

    Start_Command:  "Planteá DIRECTAMENTE un problema poco común o complejo..."
    Session_Rails:  "Beat 1: Planteo de caso atípico."

Y no es ese cruce: 27 de los 38 arrancan en frio. El primer movimiento de la clase ES la cosa
dificil, en todas las familias, edades y niveles.

Por que va como LEY y no como arreglo de los 27 cruces
------------------------------------------------------
El test que separa mandamiento de tecnica: esto describe COMO CONVERSA UNA PERSONA — nadie le
tira un dilema a un conocido en la primera frase — no una tecnica de ensenanza. Va universal,
sin condiciones, igual para plomeria que para ingles de jardin de infantes.

Ademas los 27 `pasos_de_la_sesion` son contenido curado del dueno: la ley les cambia CUANDO
arrancan, no QUE dicen. El Beat 1 sigue siendo el que es, pero pasa despues del calentamiento.
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

SLUG = "warm_open"
TEXTO = (
    "Arrancá SIEMPRE en tibio, como con alguien que ya conocés: los primeros 2 o 3 intercambios "
    "son un calentamiento sobre el tema — una observación corta y una pregunta fácil que el "
    "alumno pueda contestar sin pensar y sin saber nada todavía. NUNCA abras con el caso "
    "complejo, el dilema, el desafío ni la pregunta de opinión difícil, por más que el nivel "
    "sea alto: eso llega cuando la charla ya está caliente. Los pasos de la sesión empiezan "
    "DESPUÉS de ese calentamiento, no en el primer turno."
)


async def main() -> None:
    async with AsyncSessionLocal() as s:
        ya = (await s.execute(text(
            "SELECT slug FROM conversation_rules WHERE slug=:s"), {"s": SLUG})).first()
        if ya:
            await s.execute(text(
                "UPDATE conversation_rules SET rule_text=:t, active=1, families=NULL, "
                "age_groups=NULL, min_level=NULL, max_level=NULL WHERE slug=:s"),
                {"t": TEXTO, "s": SLUG})
            print(f"{SLUG} actualizada")
        else:
            # sort_order 0 = junto a always_greet, al principio: es lo primero que pasa en la
            # clase y conviene que el coach lo lea arriba de todo.
            await s.execute(text(
                "INSERT INTO conversation_rules (slug, rule_text, age_groups, families, "
                "min_level, max_level, sort_order, active) "
                "VALUES (:s, :t, NULL, NULL, NULL, NULL, 0, 1)"), {"s": SLUG, "t": TEXTO})
            print(f"{SLUG} creada — universal, sin condiciones")
        await s.commit()

        print("\nlas leyes, en orden:")
        for r in (await s.execute(text(
            "SELECT slug, families, age_groups, min_level, max_level FROM conversation_rules "
            "WHERE active=1 ORDER BY sort_order, id"))).mappings():
            cond = []
            if r["families"]:
                cond.append(f"solo {r['families']}")
            if r["age_groups"]:
                cond.append(str(r["age_groups"]))
            if r["min_level"] or r["max_level"]:
                cond.append(f"{r['min_level'] or '·'}->{r['max_level'] or '·'}")
            print(f"  {r['slug']:<26} {' · '.join(cond) or 'universal'}")


if __name__ == "__main__":
    asyncio.run(main())

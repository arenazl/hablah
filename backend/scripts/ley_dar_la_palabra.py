"""Ley universal: cuando el alumno se traba buscando una palabra, la insistencia ESCALA la ayuda.

De una clase real (17/08), Oliver, adulto, espacio y fondo marino:

    Vos:   ...casi no tienen comida, tienen que cambiar su... help me with that.
    Profe: ...the simple word stomach just decides to play hide-and-seek!
    Vos:   It's NOT the stomach. I can't find the word. Don't worry.
    Profe: Don't worry at all! Forgetting words happens to everyone.  <- y cambio de tema

La palabra era METABOLISM. Dos cosas fallaron:

  1. Busco por asociacion de superficie (hablaban de comer -> estomago) en vez de por el
     SENTIDO que el alumno estaba armando (adaptarse a la escasez de comida -> metabolismo).
     Y cuando el alumno dijo "no es estomago", le ofrecio "sistema digestivo" — un sinonimo
     de lo que acababa de descartar.

  2. Al SEGUNDO intento, que era cuando mas falta hacia, consolo y cerro el tema. "No te
     preocupes, a todos les pasa" suena amable y es una salida: le saco la palabra que estaba
     a punto de aprender.

Y el detalle que lo vuelve importante: el alumno no tenia la palabra bloqueada — NO LA TENIA.
Tenia el concepto entero armado y le faltaba la etiqueta. Eso es i+1 puro: el mejor momento de
toda la clase para que entre una palabra nueva, porque ya habia donde apoyarla. Se desperdicio.

Sin esto, el alumno pasa un buen rato y no aprende ni una palabra: la charla se queda siempre
dentro de lo que ya sabe decir.

Universal: trabarse con una palabra pasa igual en plomeria que en ingles.
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

SLUG = "dar_la_palabra"
TEXTO = (
    "Cuando el alumno se traba buscando una palabra, escuchá el SENTIDO que está armando, no "
    "la última palabra que dijo. Ofrecé UN candidato. Si insiste o descarta el tuyo, ofrecé "
    "DOS O TRES por caminos distintos — nunca un sinónimo de lo que ya descartó. Si sigue sin "
    "salir, dásela directamente y volvé a usarla en los turnos que siguen para que quede. "
    "NUNCA cierres el tema consolándolo: 'no te preocupes, a todos les pasa' suena amable y le "
    "saca la palabra que estaba a punto de aprender. Trabarse es el mejor momento de la clase: "
    "ya tiene el concepto armado y sólo le falta la etiqueta."
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
            orden = (await s.execute(text(
                "SELECT COALESCE(MAX(sort_order),0)+1 FROM conversation_rules"))).scalar()
            await s.execute(text(
                "INSERT INTO conversation_rules (slug, rule_text, age_groups, families, "
                "min_level, max_level, sort_order, active) "
                "VALUES (:s, :t, NULL, NULL, NULL, NULL, :o, 1)"),
                {"s": SLUG, "t": TEXTO, "o": orden})
            print(f"{SLUG} creada — universal, sin condiciones")
        await s.commit()

        n = (await s.execute(text(
            "SELECT COUNT(*) FROM conversation_rules WHERE active=1"))).scalar()
        print(f"leyes activas: {n}")


if __name__ == "__main__":
    asyncio.run(main())

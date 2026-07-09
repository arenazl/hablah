"""Suma el POOL de personalidades (slot 2 · tutor_identity) al catálogo de reglas.

Cada banda tiene VARIAS personalidades (no una): el motor rota entre ellas por sesión.
Son reglas del catálogo (eje EDAD, bloque '2 tutor_identity', aplica_a banda:X).
Idempotente. Uso: python scripts/seed_personalidades.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.rule import Rule

# banda -> lista de (sufijo, texto de la personalidad)
POOL = {
    "early_child": [
        ("01", "Sos Sparky, dragoncito espacial que junta estrellas. Tono súper alegre, onomatopeyas y emojis (🚀⭐🦖)."),
        ("02", "Sos Doble, el elefante curioso y tierno. Hablás lento, repetís con cariño, festejás cada palabra."),
        ("03", "Sos Lila, hada de las palabras. Tono dulce y cantarín; convertís cada palabra en un juego."),
        ("04", "Sos Tobi, el robot bebé. Tono juguetón, hacés ruiditos divertidos y celebrás todo."),
    ],
    "child": [
        ("01", "Sos Nova, exploradora compañera de aventuras. Entusiasta y curiosa; armás misiones con el alumno."),
        ("02", "Sos el Capitán Roko, explorador valiente. Tono aventurero; cada palabra desbloquea un tesoro."),
        ("03", "Sos Mango, el mono inventor. Tono divertido y rápido; convertís el inglés en un experimento."),
    ],
    "teen": [
        ("01", "Sos Coach Leo, coach de idiomas cercano, sin disfraz infantil. Tono relajado, actual, motivador."),
        ("02", "Sos Zoe, gamer y creadora de contenido. Tono cercano y al palo, conectás todo con sus intereses."),
        ("03", "Sos Max, DJ y coach. Tono cool y directo; mantenés el ritmo de la charla."),
    ],
    "adult": [
        ("01", "Sos Alex, profesor/host carismático. Tono claro, cordial, con modismos naturales; sin infantilizar."),
        ("02", "Sos Carlos, el instructor. Tono profesional y directo; orientado al objetivo del alumno."),
        ("03", "Sos Sofía, host conversacional. Tono cálido y cercano; charla real, par a par."),
        ("04", "Sos el Profesor Diego, mentor paciente. Tono claro y estructurado; explica cuando hace falta."),
    ],
}


async def main() -> None:
    added = updated = 0
    short = {"early_child": "EC", "child": "CH", "teen": "TN", "adult": "AD"}
    async with AsyncSessionLocal() as db:
        for banda, items in POOL.items():
            for suf, texto in items:
                rid = f"TUT-{short[banda]}-{suf}"
                row = (await db.execute(select(Rule).where(Rule.id == rid))).scalar_one_or_none()
                data = dict(bloque="2 tutor_identity", categoria="tutor_identity", eje="EDAD",
                            aplica_a=f"banda:{banda}", regla=texto, origen="seed v2",
                            editable=True, active=True)
                if row:
                    for k, v in data.items():
                        setattr(row, k, v)
                    updated += 1
                else:
                    db.add(Rule(id=rid, sort_order=200, **data))
                    added += 1
        await db.commit()
    print(f"OK - personalidades: +{added} nuevas, {updated} actualizadas (pool por banda).")


if __name__ == "__main__":
    asyncio.run(main())

"""Una sola escalera de 5 escalones, compartida por todas las disciplinas.

El problema
-----------
Habia DOS escaleras con dos idiomas distintos:

    idiomas        A0 A1 A2 B1 B2 C1 C2   (7)
    conocimiento   CON1 CON2 CON3 CON4    (4)

Un alumno que hace ingles y plomeria veia "B2" en una y "CON1" en la otra, sin forma de
entender que son comparables. Y peor: como son dos escaleras separadas, el motor las ordenaba
con un `sort_order` COMPARTIDO, asi que CON2 y A1 terminaban valiendo lo mismo — de ahi salia
que la regla de pronunciacion del ingles se colara en una clase de informatica.

La correccion
-------------
Un escalon compartido, con nombre que un alumno entiende, y el contenido de cada familia
colgando abajo sin tocarse:

    1  Primeros pasos   idiomas: A0 + A1   conocimiento: CON1
    2  Basico           idiomas: A2        conocimiento: CON2
    3  Intermedio       idiomas: B1        conocimiento: CON3
    4  Avanzado         idiomas: B2        conocimiento: CON4
    5  Fluido           idiomas: C1 + C2   conocimiento: (vacio por ahora)

Cada escalon se define por lo que el alumno PUEDE HACER, no por gramatica: asi la definicion
se lee igual para ingles que para plomeria, que es el test de que el escalon esta bien puesto.

Es aditivo: `levels` conserva sus filas y su contenido; sólo se le cuelga arriba el escalón.
Y el nombre vive en su propia tabla, así renombrar "Intermedio" es un UPDATE, no un deploy.
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

DDL = """
CREATE TABLE IF NOT EXISTS escalones (
    orden       INT          NOT NULL PRIMARY KEY,
    nombre      VARCHAR(40)  NOT NULL,
    descripcion VARCHAR(300) NOT NULL,
    active      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
"""

# Los nombres tienen que funcionar en las TRES frases: "estoy en X en ingles", "en plomeria",
# "en historia romana". Por eso no van "Fluido" ni "Primeros pasos": el primero es de idiomas
# y el segundo no entra en un combo. La descripcion define el escalon por lo que el alumno
# PUEDE HACER, no por gramatica — asi se lee igual en las dos familias.
ESCALONES = [
    (1, "Inicial", "Necesita que le expliquen todo. Produce poco y corto."),
    (2, "Basico", "Se maneja en lo cotidiano. Arma frases propias y pregunta."),
    (3, "Intermedio", "Sostiene una charla. Da opinion y entiende el porque."),
    (4, "Avanzado", "Discute criterios, maneja casos raros y argumenta."),
    (5, "Experto", "Habla de igual a igual. Matices, ironia, dilemas."),
]

# code de levels -> escalon. A0+A1 caen juntos en 1 y C1+C2 en 5: para hablar, la diferencia
# en los extremos importa menos que en el medio, que se conserva entero.
MAPEO = {
    "A0": 1, "A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 5,
    "CON1": 1, "CON2": 2, "CON3": 3, "CON4": 4,
    "ES1": 2, "ES2": 3, "ES3": 4,
}


async def main() -> None:
    async with AsyncSessionLocal() as s:
        await s.execute(text(DDL))
        for orden, nombre, desc in ESCALONES:
            await s.execute(text(
                "INSERT INTO escalones (orden, nombre, descripcion) VALUES (:o, :n, :d) "
                "ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), descripcion=VALUES(descripcion)"),
                {"o": orden, "n": nombre, "d": desc})
        await s.commit()
        print("tabla escalones lista")

        cols = [c["Field"] for c in (await s.execute(text("SHOW COLUMNS FROM levels"))).mappings()]
        if "escalon" not in cols:
            await s.execute(text("ALTER TABLE levels ADD COLUMN escalon INT NULL AFTER sort_order"))
            print("levels.escalon agregada")
        await s.commit()

        for code, esc in MAPEO.items():
            await s.execute(text("UPDATE levels SET escalon=:e WHERE code=:c"), {"e": esc, "c": code})
        await s.commit()

        print("\nla escalera:")
        for r in (await s.execute(text(
            "SELECT e.orden, e.nombre, "
            "  GROUP_CONCAT(CASE WHEN l.family='lenguaje' THEN l.code END ORDER BY l.sort_order) AS idiomas, "
            "  GROUP_CONCAT(CASE WHEN l.family='conocimiento' THEN l.code END ORDER BY l.sort_order) AS conocimiento "
            "FROM escalones e LEFT JOIN levels l ON l.escalon = e.orden AND l.active=1 "
            "GROUP BY e.orden, e.nombre ORDER BY e.orden"))).mappings():
            print(f"  {r['orden']}  {r['nombre']:<16} idiomas: {str(r['idiomas'] or '—'):<12} "
                  f"conocimiento: {r['conocimiento'] or '(vacio)'}")


if __name__ == "__main__":
    asyncio.run(main())

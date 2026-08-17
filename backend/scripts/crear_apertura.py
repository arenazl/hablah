"""La APERTURA: la capa con la que arranca TODA clase, sin importar nivel ni tema.

Lo que se nos escapo
--------------------
Giulia, adulto, Desarrollo web, Avanzado. El coach abrio con un dilema de arquitectura de tres
lineas y la alumna contesto "epa, arrancaste medio a fondo, bajamos, no entendi".

El coach no improviso: hizo lo que decia el catalogo — Beat 1 era "planteo de caso atipico".
Y no era ese cruce: 27 de los 38 arrancan en frio, con la cosa dificil en el primer movimiento.

La estructura que faltaba, en formato del motor
-----------------------------------------------
    CAPA          apertura
    PLACEHOLDERS  {APERTURA:saludo}   turno 1 — saludo de la vida, agnostico al tema
                  {APERTURA:anclaje}  turno 2 — recien aca aparece el tema, y facil
    VARIABLES     {name} {topic} {clase_nro} {intereses} {pendiente}

    turno 3+  recien ahi arrancan los pasos del cruce

Por que DOS filas y no cuarenta
-------------------------------
El primer intento cargo 20 saludos y 20 anclajes: "400 combinaciones". Era falso por dos
motivos. Primero, de esos 20 saludos habia unos 5 movimientos reales y 15 sinonimos —
"como andas", "que tal", "como va", "que haces" son la misma frase con otras palabras.
Segundo, y peor: escribir 40 latiguillos a mano ES el guion, justo lo que se le viene sacando
al motor de todos lados. Cualquier lista se agota; la unica pregunta es cuando.

La variedad no se guarda: se deriva. La clase 1 y la clase 9 leen el MISMO texto y abren
distinto porque {clase_nro}, {intereses} y {pendiente} llegan distintos. Es la misma jugada
que {idioma}: una fila que sirve para seis idiomas porque el idioma es variable, no texto.

Limite honesto: hoy `learner_state` tiene pocas filas, asi que casi ningun alumno tiene
memoria y en la practica las aperturas van a salir parecidas igual. Eso no lo arregla ninguna
lista de latiguillos — lo arregla llenar el tercer pilar.
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
CREATE TABLE IF NOT EXISTS aperturas (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    tipo       VARCHAR(20)  NOT NULL,          -- 'saludo' | 'anclaje'
    texto      VARCHAR(600) NOT NULL,
    age_groups JSON         NULL,              -- NULL = todas las edades
    active     TINYINT(1)   NOT NULL DEFAULT 1,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
"""

SALUDO = (
    "Saludá a {name} con un saludo de la vida, sin tocar el tema todavía. Es la clase número "
    "{clase_nro} entre ustedes: si es la primera, presentate en una línea; si no, saludá como "
    "a alguien que ya conocés. UNA sola pregunta fácil, de esas que se contestan sin pensar. "
    "Si sabés que le interesa {intereses}, entrá por ahí."
)
ANCLAJE = (
    "Recién en el SEGUNDO turno nombrás {topic}: decile qué van a ver hoy y preguntale si le "
    "interesa, qué lo acercó o qué sabe ya del tema. Si quedó pendiente {pendiente}, retomalo "
    "acá. Todavía fácil: nada de casos complejos, dilemas ni preguntas de opinión difícil — "
    "eso llega cuando la charla ya está caliente."
)


async def main() -> None:
    async with AsyncSessionLocal() as s:
        await s.execute(text(DDL))
        await s.commit()
        await s.execute(text("DELETE FROM aperturas"))
        for tipo, txt in (("saludo", SALUDO), ("anclaje", ANCLAJE)):
            await s.execute(text(
                "INSERT INTO aperturas (tipo, texto, sort_order) VALUES (:t, :x, 0)"),
                {"t": tipo, "x": txt})
        await s.commit()
        for r in (await s.execute(text(
            "SELECT tipo, texto FROM aperturas WHERE active=1 ORDER BY tipo"))).mappings():
            print(f"{r['tipo']}:\n  {r['texto']}\n")


if __name__ == "__main__":
    asyncio.run(main())

"""Arma el brief para que Gemini escriba las PROGRESIONES de los topicos de conocimiento.

Por que
-------
`topics.keywords` guarda hoy una BOLSA plana que el motor rota y de la que saca 4. Para
`lenguaje` esta bien: las palabras de un topico son pares, no tienen orden. Para
`conocimiento` esta mal: nota -> escala -> tonalidad es una SECUENCIA, y rotarla es empezar
por el final. Ademas, sin registro de lo ya visto, un topico nunca se termina — el alumno da
vueltas en circulo.

Y lo que hay cargado esta en ingles y mezcla cosas:

    musica       note · scale · rhythm · beat · key
    plomeria     pipe · leak · shut-off valve · drain · seal
    carpinteria  wood grain · measure twice · sand · clamp · chisel

"measure twice" es medio refran ingles, no un concepto de carpinteria. Y un plomero argentino
no aprende "pipe": aprende cano.

Que se pide
-----------
Por cada topico de `conocimiento`, la progresion ordenada de conceptos, EN CASTELLANO y como
CONCEPTO (no como forma), con cada uno etiquetado con el escalon al que pertenece — asi un
mismo topico sirve para Inicial y Basico sin duplicarse.

No se toca `lenguaje`: ahi la bolsa es correcta.

Salida: docs/09-progresiones/brief_progresiones.json
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


def _lista(v):
    if not v:
        return []
    try:
        d = json.loads(v) if isinstance(v, str) else v
        return d if isinstance(d, list) else []
    except Exception:
        return []


INSTRUCCIONES = {
    "que_es_esto": (
        "Cada tópico de la familia `conocimiento` necesita una PROGRESIÓN: la secuencia "
        "ordenada de conceptos que se enseñan, del primero al último. Hoy tiene una bolsa "
        "plana en inglés y hay que reemplazarla."
    ),
    "reglas": [
        "EN CASTELLANO. El catálogo se guarda en castellano y el coach lo dice en el idioma "
        "de la clase. No escribas en inglés.",
        "CONCEPTO, no forma. 'el pulso' y no 'beat'. 'la cañería' y no 'pipe'. Si el término "
        "del rubro se usa igual en todos los idiomas (API, deploy, DAW, mol), dejalo tal cual: "
        "esos no se traducen.",
        "ORDENADA de verdad. El concepto 3 tiene que apoyarse en el 1 y el 2. Nadie entiende "
        "una escala sin saber qué es una nota.",
        "NADA de frases de práctica de idioma. 'grab a bucket quickly' o 'the pipe is leaking' "
        "no son conceptos de plomería: son frases para practicar inglés. Fuera.",
        "Cada concepto en 2 a 6 palabras. Es el nombre de la idea, no su explicación.",
        "Etiquetá cada concepto con el escalón donde corresponde enseñarlo, usando SOLO los "
        "escalones que el tópico declara.",
        "Entre 5 y 8 conceptos por escalón. Suficientes para varias clases sin que se agote "
        "a la tercera.",
    ],
    "escalones": {
        "1": "Inicial — necesita que le expliquen todo. Conceptos fundacionales, para qué "
             "sirve cada cosa, sin tecnicismos.",
        "2": "Básico — el porqué de lo que ya sabe hacer. Cuándo se usa una cosa y cuándo otra, "
             "errores típicos.",
        "3": "Intermedio — criterios de decisión, casos atípicos, optimización.",
        "4": "Avanzado — trade-offs, filosofía del rubro, dilemas estructurales.",
    },
    "formato_de_salida": {
        "topic_id": 200,
        "progresion": [
            {"orden": 1, "escalon": 1, "concepto": "la nota"},
            {"orden": 2, "escalon": 1, "concepto": "el pulso"},
            {"orden": 3, "escalon": 2, "concepto": "la escala"},
        ],
    },
    "ejemplo_bueno": {
        "topico": "Plomería desde cero",
        "antes": ["pipe", "leak", "shut-off valve", "drain", "seal"],
        "despues": [
            {"orden": 1, "escalon": 1, "concepto": "el circuito de agua de una casa"},
            {"orden": 2, "escalon": 1, "concepto": "la llave de paso"},
            {"orden": 3, "escalon": 1, "concepto": "tipos de cañería"},
            {"orden": 4, "escalon": 2, "concepto": "por qué gotea una unión"},
            {"orden": 5, "escalon": 2, "concepto": "el sifón y los olores"},
        ],
        "por_que": "En castellano, ordenado de verdad (no se entiende la unión sin saber qué "
                   "es una cañería), y sin ninguna frase de práctica de idioma.",
    },
    "ejemplo_malo": {
        "que_no_hacer": ["pipe", "measure twice", "grab a bucket quickly", "under the hood"],
        "por_que": "El primero está en inglés, el segundo es medio refrán inglés, y los dos "
                   "últimos son frases para practicar el idioma, no conceptos del oficio.",
    },
}


async def main() -> None:
    async with AsyncSessionLocal() as s:
        rows = (await s.execute(text(
            "SELECT t.id, t.title, t.levels, t.keywords, c.name AS categoria, c.discipline "
            "FROM topics t JOIN categories c ON c.id = t.category_id "
            "WHERE t.is_active = 1 AND c.family = 'conocimiento' "
            "ORDER BY c.discipline, c.name, t.id"))).mappings().all()
        escalones = {r["code"]: r["escalon"] for r in (await s.execute(text(
            "SELECT code, escalon FROM levels WHERE escalon IS NOT NULL"))).mappings()}

    topicos = []
    for r in rows:
        niveles = _lista(r["levels"])
        topicos.append({
            "topic_id": r["id"],
            "titulo": r["title"],
            "disciplina": r["discipline"],
            "categoria": r["categoria"],
            "escalones_que_declara": sorted({escalones[n] for n in niveles if n in escalones}),
            "bolsa_actual_a_reemplazar": _lista(r["keywords"]),
        })

    salida = {"instrucciones": INSTRUCCIONES, "topicos": topicos,
              "total": len(topicos)}

    destino = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "09-progresiones")
    os.makedirs(destino, exist_ok=True)
    ruta = os.path.abspath(os.path.join(destino, "brief_progresiones.json"))
    with open(ruta, "w", encoding="utf-8") as fh:
        json.dump(salida, fh, ensure_ascii=False, indent=2)

    print(f"{len(topicos)} tópicos de conocimiento")
    for d in sorted({t["disciplina"] for t in topicos}):
        n = sum(1 for t in topicos if t["disciplina"] == d)
        print(f"   {d:<14} {n}")
    print(f"\n-> {ruta}")


if __name__ == "__main__":
    asyncio.run(main())

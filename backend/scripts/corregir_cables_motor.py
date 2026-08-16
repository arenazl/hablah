"""Correcciones de ARQUITECTURA del motor: los cables sueltos que encontro auditar_cables_motor.

Que arregla y por que
---------------------
Ninguno de estos campos estaba VACIO. Todos tenian contenido correcto para lo que declaran.
El problema era otro: contenido anglocentrico en campos que no tienen dimension de idioma, y
un molde de clase-de-idiomas copiado a la familia `conocimiento`. Por eso no lo agarraba ni
el fail-fast ni el linter — no hay contradiccion formal, hay un idioma asumido.

  1. Language_Note del template     la nota PROHIBIA leer las semillas, pero nunca ORDENABA
                                    decirlas en el idioma de la clase. El coach quedaba con
                                    "no las leas" + "explica brevemente 'prune'" y ganaba la
                                    orden concreta: decia 'prune' en una clase de jardineria.
                                    Ahora la instruccion es POSITIVA: convertilas.

  2. levels.curriculum_grammar      `levels` no tiene dimension de idioma: hay UNA fila A1
     (A1, A2, B1, B2, C1)           para los 6 idiomas, y decia "verbo To Be". Una clase de
                                    portugues aprendia gramatica inglesa. No se agrega la
                                    dimension (serian 7 niveles x N idiomas, y romperia
                                    "agregar un idioma no crea orquestacion nueva"): se
                                    escribe el CONCEPTO en vez de la FORMA, y el modelo lo
                                    instancia en cada idioma.

  3. levels.language_rule (A1)      traia ('What color is it?') horneado en ingles.

  4. produccion_esperada            4 cruces con ejemplos en ingles ('I went to...', 'I like').
                                    Mismo caso: el campo declara bien y hornea la forma.

  5. comando_de_arranque (CON)      11 cruces injertaban la semilla CRUDA entre comillas
                                    ("explica brevemente '{first_vocab}'"). Eso es el molde de
                                    `lenguaje` — presenta la palabra objetivo — y en
                                    `conocimiento` no hay palabra objetivo, hay un concepto.
                                    Los 5 cruces que ya estaban bien (adult CON2-4, teen
                                    CON3-4) se usaron de modelo y NO se tocan.

Lo que NO se toca a proposito
-----------------------------
`{first_vocab}` en los cruces de `lenguaje`: ahi nombrar la palabra objetivo ES la pedagogia
(en mini A0 la clase SON las cuatro palabras). El placeholder no esta mal; estaba mal la
familia a la que se lo copiaron.

Backup a scripts/_backup_cables_<fecha>.json antes de escribir. Idempotente: si ya corrio,
los UPDATE no encuentran el texto viejo y no hacen nada.
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


NOTA_NUEVA = (
    "The topic title and the seeds are stored in a pivot language and are NOT what you say out "
    "loud. Convert them to the language set by Language_Rule and use the term a native speaker of "
    "that language would really use; only a genuine trade term that the language borrowed as-is "
    "stays as-is. Language_Rule is the ONLY thing that decides what language you speak in."
)

# code -> curriculum_grammar agnostico (concepto, no forma)
GRAMATICA = {
    "A1": "Oraciones simples (Sujeto + Verbo + Objeto), el verbo copulativo del idioma "
          "(ser/estar y sus equivalentes), y el presente para hablar de rutinas.",
    "A2": "Pasado simple en sus formas regulares e irregulares, comparativos, descripciones "
          "basicas, y las formas para decir que algo existe o hay.",
    "B1": "Locuciones y verbos compuestos frecuentes, condicionales simples, y las formulas "
          "habituales para dar una opinion.",
    "B2": "Tiempos compuestos o perfectos, verbos modales de deduccion y probabilidad, y "
          "conectores discursivos de contraste y concesion.",
    "C1": "Modismos y expresiones idiomaticas, locuciones verbales avanzadas, condicionales "
          "mixtos, estructuras pasivas y vocabulario de matiz.",
}

REGLA_A1 = ("Mayormente {idioma_base}. El {idioma} aparece en saludos, transiciones, las "
            "palabras clave y frases-meta cortas de practica, incluidas preguntas simples de "
            "elicitacion. Traduci solo si hay bloqueo.")

# (age_slug, level_code) -> produccion_esperada sin ejemplo horneado en ingles
PRODUCCION = {
    ("adult", "A1"): "El alumno debe poder contar hechos cortos o planes simples: algo que hizo, "
                     "algo que le gusta, algo que va a hacer.",
    ("adult", "A2"): "El alumno debe poder contar hechos cortos o planes simples: algo que hizo, "
                     "algo que le gusta, algo que va a hacer.",
    ("teen", "A1"): "El alumno debe producir vocabulario clave y expresar opiniones ultra-basicas: "
                    "si algo le gusta o no, si le parece bueno o aburrido.",
    ("teen", "A2"): "El alumno debe producir vocabulario clave y expresar opiniones ultra-basicas: "
                    "si algo le gusta o no, si le parece bueno o aburrido.",
}

# (age_slug, level_code) -> comando_de_arranque sin la semilla cruda entre comillas.
# Se conserva el TONO de cada cruce; solo se saca el injerto de {first_vocab}.
ARRANQUE_CON = {
    ("adult", "CON1"): "Saluda a {name} cordialmente. Introduci {topic} con una idea concreta de "
                       "por donde se empieza y preguntale que lo acerco a este tema.",
    ("junior", "CON1"): "Saluda a {name} con muy buena onda. Tirale un dato muy loco o interesante "
                        "sobre {topic} y preguntale si se imaginaba algo asi.",
    ("mini", "CON1"): "Saluda a {name} con muchisima energia. Invitalo a jugar a algo muy divertido "
                      "relacionado con {topic} y mostrale una de las cosas del tema, imaginaria.",
    ("teen", "CON1"): "Saluda a {name} con buena onda. Menciona {topic} y tira un concepto inicial "
                      "del tema. Preguntale si alguna vez le presto atencion a eso.",
    ("junior", "CON2"): "Saluda a {name} con energia. Propone un mini proyecto copado sobre {topic} "
                        "y preguntale que es lo primero que haria.",
    ("mini", "CON2"): "Saluda a {name} muy contento. Empeza el juego de {topic} asombrandote por "
                      "algo y preguntale para que puede servir eso.",
    ("teen", "CON2"): "Saluda a {name} natural. Menciona algo practico sobre {topic} y preguntale "
                      "como le suele ir con eso a el.",
    ("junior", "CON3"): "Saluda a {name}. Planteale de entrada una situacion un poco complicada "
                        "sobre {topic} y preguntale cual seria su estrategia principal.",
    ("mini", "CON3"): "Saluda a {name} e invitalo a una aventura rapida sobre {topic}. Plantea un "
                      "pequeno problema gracioso y preguntale como lo solucionamos.",
    ("junior", "CON4"): "Saluda a {name} como a un crack en el tema. Tirale una opinion un poco "
                        "polemica o jugada sobre {topic} y preguntale que piensa.",
    ("mini", "CON4"): "Saluda a {name} llamandolo 'super experto'. Decile que tenes un problema "
                      "dificilisimo con {topic} y preguntale como se le ocurre arreglarlo.",
}


async def main() -> None:
    async with AsyncSessionLocal() as s:
        async def rows(sql):
            return (await s.execute(text(sql))).mappings().all()

        backup = {
            "generado": datetime.datetime.now().isoformat(timespec="seconds"),
            "orchestration_templates": [dict(r) for r in await rows(
                "SELECT id, name, body FROM orchestration_templates WHERE active=1")],
            "levels": [dict(r) for r in await rows(
                "SELECT id, code, language_rule, curriculum_grammar FROM levels WHERE active=1")],
            "age_level_matrix": [dict(r) for r in await rows(
                "SELECT age_slug, level_code, produccion_esperada, comando_de_arranque "
                "FROM age_level_matrix WHERE active=1")],
        }
        ruta = os.path.join(os.path.dirname(__file__),
                            f"_backup_cables_{datetime.date.today().isoformat()}.json")
        with open(ruta, "w", encoding="utf-8") as fh:
            json.dump(backup, fh, ensure_ascii=False, indent=2, default=str)
        print(f"backup -> {os.path.abspath(ruta)}\n")

        hechos = []

        # 1. Language_Note del template activo — la instruccion de conversion, positiva.
        tpl = backup["orchestration_templates"][0]
        viejo = tpl["body"]
        import re
        nuevo = re.sub(r"(Language_Note: ).*?(\n)", lambda m: m.group(1) + NOTA_NUEVA + m.group(2),
                       viejo, count=1, flags=re.S)
        if nuevo != viejo:
            await s.execute(text("UPDATE orchestration_templates SET body=:b WHERE id=:i"),
                            {"b": nuevo, "i": tpl["id"]})
            hechos.append("template.Language_Note -> instruccion de conversion positiva")

        # 2. curriculum_grammar agnostico
        for code, txt in GRAMATICA.items():
            r = await s.execute(text("UPDATE levels SET curriculum_grammar=:g WHERE code=:c "
                                     "AND curriculum_grammar<>:g"), {"g": txt, "c": code})
            if r.rowcount:
                hechos.append(f"levels[{code}].curriculum_grammar -> agnostico")

        # 3. language_rule A1 sin el ejemplo horneado
        r = await s.execute(text("UPDATE levels SET language_rule=:l WHERE code='A1' "
                                 "AND language_rule<>:l"), {"l": REGLA_A1})
        if r.rowcount:
            hechos.append("levels[A1].language_rule -> sin 'What color is it?'")

        # 4. produccion_esperada sin ejemplos en ingles
        for (edad, lvl), txt in PRODUCCION.items():
            r = await s.execute(text(
                "UPDATE age_level_matrix SET produccion_esperada=:p WHERE age_slug=:a "
                "AND level_code=:l AND produccion_esperada<>:p"), {"p": txt, "a": edad, "l": lvl})
            if r.rowcount:
                hechos.append(f"age_level_matrix[{edad} x {lvl}].produccion_esperada -> sin ejemplo EN")

        # 5. comando_de_arranque de los cruces CON, sin la semilla cruda
        for (edad, lvl), txt in ARRANQUE_CON.items():
            r = await s.execute(text(
                "UPDATE age_level_matrix SET comando_de_arranque=:c WHERE age_slug=:a "
                "AND level_code=:l AND comando_de_arranque<>:c"), {"c": txt, "a": edad, "l": lvl})
            if r.rowcount:
                hechos.append(f"age_level_matrix[{edad} x {lvl}].comando_de_arranque -> sin {{first_vocab}}")

        await s.commit()

    print(f"CAMBIOS APLICADOS: {len(hechos)}")
    for h in hechos:
        print(f"  · {h}")
    if not hechos:
        print("  (nada que hacer — ya estaba corregido)")


if __name__ == "__main__":
    asyncio.run(main())

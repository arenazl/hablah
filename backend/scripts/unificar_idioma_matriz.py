"""Unifica a CASTELLANO las instrucciones de age_level_matrix.

Por qué: la matriz tenía el mismo campo en castellano en unos cruces y en inglés
en otros — no por criterio, sino por quién editó cada celda y cuándo. Un prompt
que se cura a mano necesita un solo idioma, si no el que edita no sabe en cuál
escribir.

Se eligió castellano porque (a) ya era mayoría, (b) es el idioma en que se cura,
y (c) el idioma del prompt arrastra el registro de salida: el coach habla
rioplatense, así que las instrucciones en rioplatense refuerzan ese registro.

NO se traduce:
  - los placeholders: {idioma}, {idioma_base}, {name}, {topic}, {first_vocab}, {word}
  - las frases que el coach DICE, que van en el idioma de la clase. Antes estaban
    horneadas en inglés ('Got to run, wrap up or chat a bit more?'); ahora la
    instrucción pide decirlas en {idioma}, y el ejemplo queda como referencia.

Backup previo: backend/_backup_matrix_idiomas.json

Uso:
    python scripts/unificar_idioma_matriz.py --dry-run
    python scripts/unificar_idioma_matriz.py
"""
import asyncio
import os
import sys

from dotenv import load_dotenv

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):
    pass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from sqlalchemy import text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402

# (age_slug, level_code, campo) -> texto en castellano
CAMBIOS: dict[tuple[str, str, str], str] = {}


def _set(ages: list[str], levels: list[str], campo: str, texto: str) -> None:
    for a in ages:
        for lv in levels:
            CAMBIOS[(a, lv, campo)] = texto


# ─────────────── ADULT B1 ───────────────
_set(["adult"], ["B1"], "comando_de_arranque",
     "ARRANCÁ EN {idioma}. Saludá a {name} con naturalidad. Abrí {topic} con una "
     "observación general usando '{first_vocab}'. Preguntale por su preferencia o "
     "experiencia concreta con eso.")

_set(["adult"], ["B1"], "accion_de_continuacion",
     "Aprovechá lo que respondió para ramificar la charla. Meté la siguiente frase "
     "objetivo con naturalidad. Preguntale por sus motivos.")

_set(["adult"], ["B1"], "accion_de_cierre",
     "Cerrá con soltura la idea principal de la charla. Preguntá, en {idioma}, algo "
     "del estilo: «Me tengo que ir, ¿querés seguir charlando un rato más?».")

# ─────────────── ADULT B2 / C1 / C2 ───────────────
_set(["adult"], ["B2", "C1", "C2"], "formato_de_cierre_de_turno",
     "Terminá cada turno con UNA pregunta, y el turno entero por DEBAJO DE 25 "
     "PALABRAS. Alterná la intensidad como en una charla real: después de una "
     "profunda, tirá una fácil o zonza; después una media; después fácil otra vez. "
     "NUNCA dos preguntas pesadas seguidas.")

_set(["adult"], ["B2", "C1", "C2"], "reglas_de_tono_y_entrega",
     "Tono: par intelectual, canchero pero afilado. Nunca elogies el nivel de "
     "idioma, elogiá las IDEAS. Velocidad nativa natural.")

_set(["adult"], ["B2", "C1", "C2"], "comando_de_arranque",
     "ARRANCÁ EN {idioma}. Abrí como si le escribieras a un amigo: UNA línea "
     "distendida sobre {topic} usando '{first_vocab}', y UNA pregunta corta y fácil. "
     "TODA la apertura: MENOS DE 20 PALABRAS. Sin preámbulo ni bajada de línea — la "
     "charla se gana la profundidad después, turno a turno.")

_set(["adult"], ["B2", "C1", "C2"], "accion_de_continuacion",
     "Reaccioná en pocas palabras a lo que dijo, y después UNA pregunta — elegí la "
     "intensidad según la ola: después de una pesada viene una liviana. Turno "
     "entero por DEBAJO DE 25 PALABRAS. El alumno siempre habla más que vos.")

_set(["adult"], ["B2", "C1", "C2"], "accion_de_cierre",
     "Sintetizá el acuerdo o el debate central. Agradecele la charla. Preguntá, en "
     "{idioma}, algo del estilo: «Me tengo que ir, ¿cerramos o seguimos un rato?».")

# ─────────────── JUNIOR A1 / A2 ───────────────
_set(["junior"], ["A1", "A2"], "comando_de_arranque",
     "Saludá a {name} con entusiasmo en {idioma}. Presentá el escenario de "
     "exploración. Planteá un obstáculo relacionado con '{first_vocab}' y "
     "preguntale qué hacemos.")

_set(["junior"], ["A1", "A2"], "accion_de_continuacion",
     "Validá lo que eligió usando recast. Contá qué pasó integrando la palabra "
     "siguiente. Dale una nueva opción simple.")

_set(["junior"], ["A1", "A2"], "accion_de_cierre",
     "Felicitalo por la misión. Destacá las palabras que encontró. Preguntale si "
     "quiere explorar otra zona.")

# ─────────────── JUNIOR B1 ───────────────
_set(["junior"], ["B1"], "comando_de_arranque",
     "Saludá a {name} en {idioma} con energía de aventura. Armá la misión usando "
     "los anclajes narrativos. Planteá el primer desafío relacionado con "
     "'{first_vocab}' y preguntale qué hacemos.")

_set(["junior"], ["B1"], "accion_de_continuacion",
     "Reaccioná a la decisión. Corregí el error principal por recast, sin "
     "señalarlo. Avanzá la misión tejiendo la palabra siguiente. Dale un nuevo "
     "desafío o una decisión abierta.")

_set(["junior"], ["B1"], "accion_de_cierre",
     "Felicitalo por completar la misión. Destacá las palabras que usó. "
     "Preguntale si quiere seguir con otra aventura.")

# ─────────────── TEEN B1 / B2 ───────────────
_set(["teen"], ["B1", "B2"], "comando_de_arranque",
     "ARRANCÁ EN {idioma}. Saludá a {name} de manera relajada. Tirá una opinión "
     "polémica sobre {topic} para romper el hielo usando '{first_vocab}'. Cerrá "
     "preguntándole qué opina.")

_set(["teen"], ["B1", "B2"], "accion_de_continuacion",
     "Reaccioná en serio a lo que dijo. Usá harvesting: agarrá UNA sola cosa de "
     "lo que contó. Tejé la palabra siguiente. Preguntá algo que siga el debate.")

_set(["teen"], ["B1", "B2"], "accion_de_cierre",
     "Reconocé sus puntos. Resumí el debate sin solemnidad. Preguntá, en {idioma}, "
     "algo del estilo: «¿Seguimos charlando o tenés que irte?».")

# El "EN INGLÉS" estaba HARDCODEADO acá: si la clase era en otro idioma, la
# instrucción le pedía al coach preguntar en inglés (language_clash).
_set(["teen"], ["B1", "B2"], "formato_de_cierre_de_turno",
     "Terminá tu turno desafiando su opinión con una pregunta abierta en {idioma}. "
     "NO uses formatos de programa de juegos.")

# ─────────────── ADULT A1 / A2 ───────────────
# La frase de cierre estaba horneada en inglés ('It was great chatting…').
_set(["adult"], ["A1", "A2"], "accion_de_cierre",
     "Cerrá la charla con calidez destacando lo que te contó. Preguntá, en "
     "{idioma}, algo del estilo: «Estuvo buenísimo charlar, ¿querés seguir?».")

# Los ejemplos estaban horneados en inglés aunque la instrucción ya estaba en
# castellano: ahora se piden en el idioma de la clase.
_set(["adult"], ["A1", "A2"], "formato_de_cierre_de_turno",
     "Hacé preguntas biográficas directas y amables en {idioma} — del tipo «¿y "
     "vos?», «¿te gustó?».")

_set(["adult"], ["B1"], "formato_de_cierre_de_turno",
     "Preguntas que pidan motivos o perspectivas moderadas, en {idioma} — del tipo "
     "«¿por qué te parece eso?», «¿alguna vez probaste {word}?».")


async def main(dry_run: bool = False):
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT age_slug, level_code FROM age_level_matrix"))
        existentes = {(x[0], x[1]) for x in r.fetchall()}

        aplicados, faltantes = 0, []
        for (age, lv, campo), texto in CAMBIOS.items():
            if (age, lv) not in existentes:
                faltantes.append(f"{age}x{lv}")
                continue
            print(f"[{age} x {lv}] {campo}")
            if not dry_run:
                await db.execute(
                    text(f"UPDATE age_level_matrix SET {campo} = :t "
                         "WHERE age_slug = :a AND level_code = :l"),
                    {"t": texto, "a": age, "l": lv},
                )
            aplicados += 1
        if not dry_run:
            await db.commit()

        print(f"\n{aplicados} celdas {'a aplicar' if dry_run else 'actualizadas'}")
        if faltantes:
            print(f"cruces inexistentes (se saltaron): {sorted(set(faltantes))}")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    asyncio.run(main(args.dry_run))

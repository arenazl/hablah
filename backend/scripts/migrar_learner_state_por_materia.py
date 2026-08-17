"""La historia del alumno pasa a ser POR MATERIA, no una sola bolsa por alumno.

El problema
-----------
`learner_state` tenia UNA fila por alumno (`student_id` UNIQUE). Eso alcanzaba cuando el
producto era una app de ingles. Con el motor polimorfico no: si el mismo alumno hace ingles
y ademas informatica, `mastered` mezcla lo que domina de un idioma con lo que domina de una
materia, y `top_error` —el error a corregir— seria el mismo para las dos, cuando en una es
un error de idioma y en la otra un concepto mal entendido.

Es la misma jugada que ya se hizo con el nivel: `user_level(user_id, materia, level_code)`.
La historia tenia que seguir el mismo camino y quedo atras.

Que hace
--------
  learner_state.materia  VARCHAR(30) NULL     que materia es esta historia
  UNIQUE (student_id, materia)                una historia por alumno POR materia

`materia` usa el MISMO espacio de nombres que user_level.materia, que sale del modelo de
familias del dueno:
  familia `lenguaje`      -> la materia ES el idioma  ('en', 'fr', 'pt')
  familia `conocimiento`  -> la materia es la disciplina ('informatica', 'jardineria')

NULL = historia vieja, sin materia. Se conserva y se sigue leyendo como fallback, asi que
nada se rompe mientras el post-clase empieza a escribir con materia.

Momento: la tabla tiene 2 filas. Hacerlo hoy no migra nada; con historial real ya seria
una conversion de datos.
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


async def main() -> None:
    async with AsyncSessionLocal() as s:
        cols = [c["Field"] for c in (await s.execute(text("SHOW COLUMNS FROM learner_state"))).mappings()]
        if "materia" not in cols:
            await s.execute(text(
                "ALTER TABLE learner_state ADD COLUMN materia VARCHAR(30) NULL AFTER student_id"))
            print("learner_state.materia agregada")
        else:
            print("learner_state.materia ya existia")

        idx = [r["Key_name"] for r in (await s.execute(text("SHOW INDEX FROM learner_state"))).mappings()]
        # El UNIQUE viejo era sobre student_id solo: hay que soltarlo para que entre mas de una
        # materia por alumno. Los nombres de indice varian segun como se creo la tabla.
        for nombre in set(idx):
            if nombre == "PRIMARY":
                continue
            info = (await s.execute(text("SHOW INDEX FROM learner_state"))).mappings().all()
            cols_idx = [r["Column_name"] for r in info if r["Key_name"] == nombre]
            unico = any(r["Non_unique"] == 0 for r in info if r["Key_name"] == nombre)
            if unico and cols_idx == ["student_id"]:
                await s.execute(text(f"ALTER TABLE learner_state DROP INDEX `{nombre}`"))
                print(f"indice unico viejo `{nombre}` (student_id) soltado")

        idx = {r["Key_name"] for r in (await s.execute(text("SHOW INDEX FROM learner_state"))).mappings()}
        if "uq_learner_state_alumno_materia" not in idx:
            await s.execute(text(
                "ALTER TABLE learner_state ADD UNIQUE KEY uq_learner_state_alumno_materia "
                "(student_id, materia)"))
            print("unique (student_id, materia) creado")

        # Valor inicial para las filas que ya existian: NO se inventa. Sale del idioma que el
        # alumno tiene en su ficha, que es la materia que estaba cursando cuando se escribio
        # esa historia. Si el alumno no existe o no tiene idioma, queda NULL y se lee igual.
        r = await s.execute(text(
            "UPDATE learner_state ls JOIN users u ON u.id = ls.student_id "
            "SET ls.materia = u.target_language "
            "WHERE ls.materia IS NULL AND u.target_language IS NOT NULL"))
        if r.rowcount:
            print(f"materia inicial cargada en {r.rowcount} fila/s desde users.target_language")

        await s.commit()

        print("\nestado:")
        for r in (await s.execute(text(
            "SELECT id, student_id, materia, top_error FROM learner_state"))).mappings():
            print(f"  alumno={r['student_id']} materia={r['materia']!r} top_error={str(r['top_error'])[:40]!r}")


if __name__ == "__main__":
    asyncio.run(main())

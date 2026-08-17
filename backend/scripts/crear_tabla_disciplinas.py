"""Crea la tabla `disciplines` — la disciplina pasa a ser una FILA, no un string suelto.

El problema
-----------
La disciplina vivia como varchar(30) denormalizado en `categories.discipline`. No tenia
`active` propio, ni nombre para mostrar, ni orden. El combo del probador la armaba asi:

    SELECT DISTINCT discipline FROM categories WHERE active = 1

O sea: una disciplina existia si alguna de sus categorias estaba prendida. Para sacar
"fonetica" del combo habia que apagar SU categoria, y para sacar "idiomas" habria que apagar
18. Apagar la disciplina no era una operacion — era un efecto secundario.

La correccion
-------------
`disciplines(slug, name, active, sort_order, family)`. Apagar una disciplina pasa a ser UN
update de UNA fila, y el combo se llena solo porque lee de ahi. `categories.discipline` se
mantiene como referencia por slug: cero migracion de datos, cero riesgo.

Idempotente: CREATE TABLE IF NOT EXISTS + INSERT IGNORE. Se puede correr las veces que sea.
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
CREATE TABLE IF NOT EXISTS disciplines (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    slug       VARCHAR(30)  NOT NULL UNIQUE,
    name       VARCHAR(60)  NOT NULL,
    family     VARCHAR(20)  NULL,
    active     TINYINT(1)   NOT NULL DEFAULT 1,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
"""

async def main() -> None:
    async with AsyncSessionLocal() as s:
        await s.execute(text(DDL))
        await s.commit()
        print("tabla disciplines lista")

        existentes = (await s.execute(text(
            "SELECT discipline, MIN(family) AS family, MIN(sort_order) AS so "
            "FROM categories WHERE discipline IS NOT NULL AND discipline <> '' "
            "GROUP BY discipline ORDER BY discipline"))).mappings().all()

        # El nombre para mostrar se SIEMBRA del slug y despues se edita en la tabla. No hay
        # diccionario de nombres en el codigo: si manana "oficios" se llama "Trabajos y oficios",
        # es un UPDATE, no un deploy.
        for i, r in enumerate(existentes):
            slug = r["discipline"]
            await s.execute(text(
                "INSERT IGNORE INTO disciplines (slug, name, family, active, sort_order) "
                "VALUES (:s, :n, :f, 1, :o)"),
                {"s": slug, "n": slug.capitalize(), "f": r["family"], "o": r["so"] or i})
        await s.commit()

        # Fonetica: decision del dueno (16/08). Las clases de onomatopeya quedan mal con
        # chicos y con grandes, y el motor de voz no esta para eso. Se apaga la disciplina
        # ENTERA desde su propia fila — que es justamente el punto de tener la tabla.
        r = await s.execute(text(
            "UPDATE disciplines SET active=0 WHERE slug='fonetica' AND active=1"))
        if r.rowcount:
            print("fonetica -> inactiva (desde su propia fila, no apagando categorias)")
        await s.commit()

        print("\ndisciplinas:")
        for d in (await s.execute(text(
            "SELECT slug, name, family, active, sort_order FROM disciplines "
            "ORDER BY sort_order, slug"))).mappings():
            marca = "" if d["active"] else "   <- INACTIVA"
            print(f"  {d['slug']:<14} {d['name']:<14} fam={str(d['family']):<14}{marca}")


if __name__ == "__main__":
    asyncio.run(main())

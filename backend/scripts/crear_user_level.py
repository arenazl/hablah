"""El nivel deja de ser del ALUMNO y pasa a ser del alumno POR MATERIA.

`users.cefr_level` era un solo valor por persona, y no alcanza: uno puede ser B2 en
inglés, A1 en francés y principiante en historia. El nivel no es un atributo de la
persona, es de la relación persona↔materia (como en el colegio: no sos "nivel 7", sos
nivel 7 en matemática).

    user_level(user_id, materia, level_code)

`materia` sale del mismo árbol que el resto del motor:
    familia lenguaje      -> el código del idioma que aprende ('en', 'fr')
    familia conocimiento  -> la disciplina ('informatica', 'oficios')

Es un OVERRIDE, no un reemplazo: si no hay fila para esa materia se usa
`users.cefr_level` como default. Así nada se rompe y la migración es opcional.

Uso:  python scripts/crear_user_level.py --dry-run | --apply
"""
import argparse
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

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(_HERE))
load_dotenv(os.path.join(_HERE, "..", ".env"))

from sqlalchemy import text  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402

DDL = """
CREATE TABLE IF NOT EXISTS user_level (
  user_id    INT NOT NULL,
  materia    VARCHAR(40) NOT NULL,
  level_code VARCHAR(10) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, materia),
  KEY idx_user (user_id)
)
"""


async def main(apply: bool):
    async with AsyncSessionLocal() as db:
        existe = (await db.execute(text("SHOW TABLES LIKE 'user_level'"))).fetchone()
        lvfam = {r[0]: r[1] for r in (await db.execute(text(
            "SELECT code, family FROM levels"))).all()}

        users = (await db.execute(text(
            "SELECT id, nombre, cefr_level, target_language FROM users "
            "WHERE is_active = 1 ORDER BY id"))).all()

        plan = []
        for uid, nombre, lvl, target in users:
            fam = lvfam.get(lvl)
            if fam == "lenguaje":
                # La materia de un nivel de lenguaje es el idioma que está aprendiendo.
                plan.append((uid, target or "en", lvl, f"{nombre}: {lvl} en '{target or 'en'}'"))
            elif fam == "conocimiento":
                # No se puede adivinar de qué materia es: queda como default del perfil
                # (users.cefr_level) hasta que elija una y el probador escriba la fila.
                plan.append((None, None, None, f"{nombre}: {lvl} sin materia — queda de default"))
            else:
                plan.append((None, None, None, f"{nombre}: nivel '{lvl}' desconocido — se ignora"))

        print(f"\n{'APLICANDO' if apply else 'DRY-RUN (no toca nada)'}\n" + "─" * 74)
        print(f"\n── tabla user_level: {'ya existe' if existe else 'CREATE'}")
        migrables = [p for p in plan if p[0] is not None]
        print(f"\n── migrar de users.cefr_level ({len(migrables)} de {len(users)})")
        for _, _, _, msg in plan[:40]:
            print(f"   {msg}")

        if not apply:
            print("\nCorré con --apply para escribir.")
            return

        await db.execute(text(DDL))
        for uid, materia, lvl, _ in migrables:
            await db.execute(text(
                "INSERT INTO user_level (user_id, materia, level_code) VALUES (:u,:m,:l) "
                "ON DUPLICATE KEY UPDATE level_code = VALUES(level_code)"),
                {"u": uid, "m": materia, "l": lvl})
        await db.commit()
        print(f"\nOK — tabla lista y {len(migrables)} niveles migrados.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    asyncio.run(main(a.apply))

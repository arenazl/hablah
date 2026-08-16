"""Perfiles de prueba con distintos idiomas NATIVOS.

El idioma nativo es atributo del perfil (capa ALUMNO), no un eslabón del catálogo:
el mismo tópico de informática se compone igual para un argentino y para un francés,
porque el catálogo son instrucciones AL COACH y el template trae la Language_Note.
Estos perfiles existen para poder verificarlo en el probador.

Uso:  python scripts/seed_perfiles_prueba.py --dry-run | --apply
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

# (nombre, base_language, target_language, cefr_level, age_group, qué prueba)
PERFILES = [
    ("Lucas",    "es", "en", "B2",   "adult",  "argentino aprendiendo inglés — el caso base"),
    ("Chloé",    "fr", "fr", "CON2", "adult",  "francesa que usa la app para aprender OTRA COSA en francés"),
    ("Mateus",   "pt", "en", "A2",   "teen",   "brasileño adolescente aprendiendo inglés"),
    ("Giulia",   "it", "it", "CON3", "adult",  "italiana aprendiendo un oficio en italiano"),
    ("Oliver",   "en", "es", "A1",   "adult",  "inglés aprendiendo castellano — el par invertido"),
    ("Amélie",   "fr", "en", "B1",   "junior", "francesita aprendiendo inglés (base ≠ es)"),
    ("Thiago",   "pt", "pt", "CON1", "junior", "brasileñito aprendiendo algo en su propio idioma"),
]

DOMINIO = "perfil.test@hablah.local"


async def main(apply: bool):
    async with AsyncSessionLocal() as db:
        # El combo de idioma sólo muestra los activos: sin esto no se puede elegir francés.
        inactivos = [r[0] for r in (await db.execute(text(
            "SELECT code FROM languages WHERE active = 0"))).all()]

        print(f"\n{'APLICANDO' if apply else 'DRY-RUN (no toca nada)'}\n" + "─" * 74)
        if inactivos:
            print(f"\n── idiomas a activar: {', '.join(inactivos)}")

        print(f"\n── perfiles ({len(PERFILES)})")
        for nombre, base, target, lvl, edad, para_que in PERFILES:
            email = f"{nombre.lower().replace('é', 'e').replace('í', 'i')}.{DOMINIO}"
            existe = (await db.execute(text("SELECT id FROM users WHERE email = :e"),
                                       {"e": email})).fetchone()
            accion = "UPDATE" if existe else "INSERT"
            print(f"   {accion} {nombre:8} base={base} target={target} "
                  f"nivel={lvl:5} {edad:7} · {para_que}")

        if not apply:
            print("\nCorré con --apply para escribir.")
            return

        if inactivos:
            await db.execute(text("UPDATE languages SET active = 1 WHERE active = 0"))

        for nombre, base, target, lvl, edad, _ in PERFILES:
            email = f"{nombre.lower().replace('é', 'e').replace('í', 'i')}.{DOMINIO}"
            await db.execute(text(
                # role es enum('admin','student'); la contraseña es un hash inválido a
                # propósito: son perfiles del probador, no se loguean.
                "INSERT INTO users (email, hashed_password, nombre, apellido, role, is_active, "
                "  cefr_level, target_language, base_language, age_group, onboarding_done) "
                "VALUES (:e, '!perfil-de-prueba-sin-login', :n, 'Prueba', 'student', 1, :lv, :tg, :bs, :ag, 1) "
                "ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), cefr_level=VALUES(cefr_level), "
                "  target_language=VALUES(target_language), base_language=VALUES(base_language), "
                "  age_group=VALUES(age_group)"),
                {"e": email, "n": nombre, "lv": lvl, "tg": target, "bs": base, "ag": edad})

        await db.commit()
        print(f"\nOK — {len(PERFILES)} perfiles y {len(inactivos)} idiomas activados.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--dry-run", action="store_true")
    g.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    asyncio.run(main(a.apply))

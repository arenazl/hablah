"""Agrega la regla universal de saludo y saca el "sin preámbulo" que la contradice.

Por qué: la app es CONVERSACIONAL — el aprendizaje va implícito y el alumno tiene
que sentir que habla con un amigo. Pero un amigo tampoco te habla de un tema sin
decirte hola. Saludar no depende del nivel: en B2 se saluda igual que en A0, lo
único que cambia es el registro (y eso ya lo resuelve student_types.tutor_tonal_rules).

Estado antes de este script:
  - Ninguna de las 12 reglas universales ordenaba saludar. La única mención era
    "Vary every greeting…", que ASUME que hay saludo pero no lo pide.
  - El saludo vivía en el comando_de_arranque de cada cruce: A0-B1 saludaban,
    B2/C1/C2 decían explícitamente "sin preámbulo".
"""
import asyncio
import json
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

REGLA = (
    "Abrí SIEMPRE saludando al alumno por su nombre, como cualquier persona que "
    "empieza una conversación: nadie arranca a hablar de un tema sin decir hola. "
    "Ajustá el registro del saludo a tu tono (a un chico con entusiasmo, a un "
    "adulto con naturalidad), pero nunca entres directo al tema. Si es la primera "
    "charla, presentate en una línea; si ya se conocen, saludá como a alguien "
    "conocido."
)

ARRANQUE_ALTO = (
    "ARRANCÁ EN {idioma}. Saludá a {name} como saludarías a un amigo con el que "
    "te vas a poner a charlar. Después, UNA línea distendida sobre {topic} usando "
    "'{first_vocab}' y UNA pregunta corta y fácil. TODA la apertura: MENOS DE 30 "
    "PALABRAS. Nada de bajada de línea ni de anunciar que esto es una clase — la "
    "charla se gana la profundidad después, turno a turno."
)


async def main():
    async with AsyncSessionLocal() as db:
        ex = (await db.execute(
            text("SELECT id FROM conversation_rules WHERE slug='always_greet'"))).first()
        if ex:
            await db.execute(
                text("UPDATE conversation_rules SET rule_text=:t, active=1 WHERE slug='always_greet'"),
                {"t": REGLA})
            print("regla always_greet: actualizada")
        else:
            await db.execute(text(
                "INSERT INTO conversation_rules "
                "(slug, rule_text, age_groups, min_level, max_level, sort_order, active) "
                "VALUES ('always_greet', :t, NULL, NULL, NULL, 0, 1)"), {"t": REGLA})
            print("regla always_greet: CREADA (universal, sin restriccion de edad ni nivel)")
        await db.commit()

        r = await db.execute(text(
            "UPDATE age_level_matrix SET comando_de_arranque = :c "
            "WHERE age_slug = 'adult' AND level_code IN ('B2','C1','C2')"), {"c": ARRANQUE_ALTO})
        print(f"cruces adult B2/C1/C2 con saludo: {r.rowcount}")
        await db.commit()

        # Republicar el JSON que consume el composer
        r = await db.execute(text(
            "SELECT slug, rule_text, age_groups, min_level, max_level "
            "FROM conversation_rules WHERE active = 1 ORDER BY sort_order, id"))
        reglas = []
        for x in r.mappings().all():
            ag = x["age_groups"]
            if isinstance(ag, str):
                try:
                    ag = json.loads(ag)
                except Exception:
                    ag = None
            reglas.append({"slug": x["slug"], "text": x["rule_text"], "age_groups": ag,
                           "min_level": x["min_level"], "max_level": x["max_level"]})
        await db.execute(
            text("UPDATE app_config SET config_value = :v WHERE config_key = 'conversation_rules_json'"),
            {"v": json.dumps(reglas, ensure_ascii=False)})
        await db.commit()
        print(f"reglas publicadas: {len(reglas)}")

        # ¿Queda algún arranque que contradiga el saludo?
        r = await db.execute(text(
            "SELECT age_slug, level_code FROM age_level_matrix "
            "WHERE comando_de_arranque LIKE '%preámbulo%' OR comando_de_arranque LIKE '%preambulo%'"))
        pend = [f"{x[0]}x{x[1]}" for x in r.fetchall()]
        print("arranques que todavia dicen 'sin preambulo':", pend or "ninguno")


if __name__ == "__main__":
    asyncio.run(main())

"""Crea la tabla methodology_stages y siembra el currículum A0 (kids mini).

Idempotente: crea la tabla si no existe (checkfirst) y sólo siembra si no hay
etapas 'mini' cargadas. Aditivo, no toca otras tablas.

Uso: heroku run python scripts/migrate_methodology.py  (la BD Aiven no acepta
conexiones desde fuera de la infra).
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402

from core.database import engine  # noqa: E402
from models.methodology import MethodologyStage  # noqa: E402  (registra la tabla)

# Currículum A0 (mini 3-7): progresión de vocabulario + estructuras simples.
# El admin lo edita/achica/reordena después desde el módulo Metodología.
A0_MINI = [
    {"order": 1, "title": "Saludos", "voc": [("hello", "hola"), ("bye", "chau"), ("name", "nombre")],
     "struct": "My name is ___", "struct_es": "Me llamo ___",
     "mastery": "Dice hello y bye, y su nombre en una mini-frase."},
    {"order": 2, "title": "Colores", "voc": [("red", "rojo"), ("blue", "azul"), ("yellow", "amarillo"), ("green", "verde")],
     "struct": "It's red", "struct_es": "Es rojo",
     "mastery": "Nombra 3 colores e intenta 'It's ___'."},
    {"order": 3, "title": "Animales", "voc": [("dog", "perro"), ("cat", "gato"), ("bird", "pájaro"), ("fish", "pez")],
     "struct": "I see a dog", "struct_es": "Veo un perro",
     "mastery": "Nombra 3 animales e intenta 'I see a ___'."},
    {"order": 4, "title": "Comida", "voc": [("apple", "manzana"), ("water", "agua"), ("milk", "leche"), ("bread", "pan")],
     "struct": "I like apples", "struct_es": "Me gustan las manzanas",
     "mastery": "Nombra 3 comidas y arma 'I like ___'."},
    {"order": 5, "title": "Familia", "voc": [("mom", "mamá"), ("dad", "papá"), ("baby", "bebé")],
     "struct": "This is my mom", "struct_es": "Esta es mi mamá",
     "mastery": "Nombra mom/dad e intenta 'This is my ___'."},
    {"order": 6, "title": "Números", "voc": [("one", "uno"), ("two", "dos"), ("three", "tres")],
     "struct": "I have two ___", "struct_es": "Tengo dos ___",
     "mastery": "Cuenta one-two-three e intenta 'I have ___'."},
    {"order": 7, "title": "Mi cuerpo", "voc": [("hand", "mano"), ("foot", "pie"), ("head", "cabeza"), ("eyes", "ojos")],
     "struct": "My hand", "struct_es": "Mi mano",
     "mastery": "Nombra 3 partes e intenta 'My ___'."},
    {"order": 8, "title": "Juguetes", "voc": [("ball", "pelota"), ("car", "auto"), ("doll", "muñeca")],
     "struct": "I have a ball", "struct_es": "Tengo una pelota",
     "mastery": "Nombra 2 juguetes y arma 'I have a ___'."},
    {"order": 9, "title": "Emociones", "voc": [("happy", "feliz"), ("sad", "triste")],
     "struct": "I am happy", "struct_es": "Estoy feliz",
     "mastery": "Dice happy/sad e intenta 'I am ___'."},
    {"order": 10, "title": "Repaso y juego", "voc": [("yes", "sí"), ("no", "no"), ("more", "más")],
     "struct": "More, please", "struct_es": "Más, por favor",
     "mastery": "Repasa lo aprendido pidiendo 'more' y respondiendo yes/no."},
]


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(MethodologyStage.__table__.create, checkfirst=True)
        res = await conn.execute(text("SELECT COUNT(*) FROM methodology_stages WHERE age_group='mini'"))
        if res.scalar():
            print("OK: ya hay etapas 'mini', no siembro de nuevo.")
            return
        for s in A0_MINI:
            voc = [{"en": en, "es": es} for (en, es) in s["voc"]]
            await conn.execute(
                text(
                    "INSERT INTO methodology_stages "
                    "(age_group, cefr_level, order_index, title, vocabulary, "
                    " target_structure, target_structure_es, mastery_criteria, active) "
                    "VALUES (:ag, 'A0', :oi, :t, :v, :ts, :tse, :mc, 1)"
                ),
                {"ag": "mini", "oi": s["order"], "t": s["title"], "v": json.dumps(voc),
                 "ts": s["struct"], "tse": s["struct_es"], "mc": s["mastery"]},
            )
        print(f"OK: tabla creada + {len(A0_MINI)} etapas A0 (mini) sembradas.")


if __name__ == "__main__":
    asyncio.run(main())

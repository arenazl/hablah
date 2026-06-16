"""Fix de contenido — limpia el tutor de adultos (student_types.adult).

El tutor_identity/tonal_rules de adult arrastraba texto VIEJO que mencionaba el
'pedagogy_preset del template activo' (concepto legacy). Lo reemplazo por una
identidad adulta limpia y agnóstica del legacy. Tentativo, editable.
Uso: python scripts/fix_tutor_adult.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.methodology import StudentType

IDENTITY = ("Tutor de inglés para adultos: conversador real, par intelectual cuando el nivel lo "
            "permite. Comparte opiniones y datos, no solo facilita; lleva el objetivo del nivel de "
            "forma invisible, tejido en la charla.")
TONAL = ("Claro, cordial, con modismos naturales. Sin infantilismos. Habla mayormente en inglés "
         "según el nivel del alumno.")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        st = (await db.execute(select(StudentType).where(StudentType.slug == "adult"))).scalar_one_or_none()
        if not st:
            print("[miss] student_type adult")
            return
        st.tutor_identity = IDENTITY
        st.tutor_tonal_rules = TONAL
        await db.commit()
        print("[upd] student_types.adult — tutor_identity + tutor_tonal_rules (sin texto legacy)")
    print("OK - fix_tutor_adult completo")


if __name__ == "__main__":
    asyncio.run(main())

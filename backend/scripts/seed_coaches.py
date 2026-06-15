"""Seed de coaches (persona del tutor) — 2 por segmento: femenino y masculino.

MISMA pedagogía (vive en StudentType), distinta personalidad + voz. Reusa la
persona ya curada en student_types (tutor_identity / tutor_tonal_rules),
sustituyendo el mascot por el nombre del coach. Nombres/voces tentativos
(editables desde el backoffice). Idempotente: upsert por (student_type, name).

NOTA: solo crea coaches para los student_types que existen hoy (mini/junior/
tween/adult). Los sub-segmentos adultos finos (teen/young_adult/senior) necesitan
su propio student_type + contenido pedagógico (input del dueño) — quedan pendientes.
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.methodology import StudentType, Coach

# (nombre, género, voz Gemini) — voces female-ish: Aoede/Kore/Leda; male-ish: Puck/Fenrir/Orus/Charon
COACHES = {
    "mini":   [("Lila", "female", "Aoede"), ("Tobi", "male", "Puck")],
    "junior": [("Nova", "female", "Kore"),  ("Leo",  "male", "Fenrir")],
    "tween":  [("Mia",  "female", "Leda"),  ("Zane", "male", "Orus")],
    "adult":  [("Clara", "female", "Kore"), ("Max",  "male", "Charon")],
}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        sts = (await db.execute(select(StudentType))).scalars().all()
        for st in sts:
            variants = COACHES.get(st.slug)
            if not variants:
                print(f"  [skip] sin coaches definidos para '{st.slug}'")
                continue
            mascot = st.tutor_mascot or "HABI"
            for i, (name, gender, voice) in enumerate(variants):
                identity = (st.tutor_identity or "").replace(mascot, name)
                personality = (st.tutor_tonal_rules or "").replace(mascot, name)
                row = (await db.execute(
                    select(Coach).where(Coach.student_type == st.slug, Coach.name == name)
                )).scalar_one_or_none()
                if row:
                    row.gender, row.voice_name = gender, voice
                    row.identity, row.personality, row.sort_order = identity, personality, i
                    print(f"  [upd] {st.slug}/{name} ({gender})")
                else:
                    db.add(Coach(
                        student_type=st.slug, gender=gender, name=name,
                        identity=identity, personality=personality, voice_name=voice,
                        sort_order=i, active=True,
                    ))
                    print(f"  [new] {st.slug}/{name} ({gender}, {voice})")
        await db.commit()
    print("OK — seed_coaches completo")


if __name__ == "__main__":
    asyncio.run(main())

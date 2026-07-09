"""Seed de la CAPA DE MÉTODO — idioma por nivel + duraciones + cierre.

Cada regla en su campo (no apelmazada), por su dimensión:
  - language_rule  -> por NIVEL   (methodology_modules.language_rule)  [fix del "Now you"]
  - duración       -> por SEG×NIVEL (methodology_modules.max_session_minutes/max_turns)
  - closing_seed   -> por SEGMENTO (student_types.closing_seed)

Valores TENTATIVOS (editables desde el editor). Idempotente: actualiza lo existente.
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.methodology import MethodologyModule, StudentType

# ── Idioma del COACH por nivel (su propio campo). Acá vive el fix del "Now you". ──
LANGUAGE_BY_LEVEL = {
    "A0": ("Idioma de instrucción del coach: 100% ESPAÑOL. Lo ÚNICO en inglés es la palabra "
           "objetivo del día. NUNCA traduzcas tus consignas, cues ni explicaciones al inglés "
           "(decí \"ahora vos\", NUNCA \"now you\")."),
    "A1": ("Instrucción mayormente en español. Introducí frases-meta cortas en inglés (2-3 "
           "palabras) que el alumno repite; tus consignas y explicaciones siguen en español."),
    "A2": ("Mitad español, mitad inglés. El alumno produce frases simples en inglés; vos "
           "explicás/rescatás en español sólo cuando se traba."),
    "B1": ("Mayormente en inglés. Español SOLO como rescate puntual si el alumno se traba. "
           "Velocidad normal."),
    "B2": ("100% inglés. Sin español. Recast natural de los errores, sin cortar la fluidez."),
    "C1": ("100% inglés. Registro, matices, ironía. Par intelectual."),
    "C2": ("100% inglés nativo. Pulido fino de matices y registro."),
}

# ── Duración por (segmento × nivel) en minutos / turnos. Bajo nivel/chico = corto. ──
DURATION = {
    ("mini", "A0"): (5, 6), ("mini", "A1"): (6, 8), ("mini", "A2"): (7, 10),
    ("junior", "A0"): (6, 8), ("junior", "A1"): (8, 10), ("junior", "A2"): (10, 12), ("junior", "B1"): (12, 14),
    ("tween", "A0"): (7, 9), ("tween", "A1"): (9, 11), ("tween", "A2"): (11, 13), ("tween", "B1"): (13, 15), ("tween", "B2"): (15, 17),
    ("adult", "A0"): (8, 10), ("adult", "A1"): (10, 12), ("adult", "A2"): (12, 14), ("adult", "B1"): (15, 16),
    ("adult", "B2"): (18, 18), ("adult", "C1"): (20, 20), ("adult", "C2"): (20, 20),
}

# ── Cierre suave (semilla por segmento). El LLM la usa de guía, no verbatim. ──
CLOSING_SEED = {
    "mini": ("Al completar la tarea del día: festejá cálido y jugado ('¡Buenísimo, campeón!') y "
             "ofrecé seguir: '¿Jugamos un ratito más o descansamos?'. NUNCA cortes vos la clase."),
    "junior": ("Al cerrar: reconocé la misión cumplida y ofrecé seguir o cortar: '¡Misión completa! "
               "¿Seguimos con otra o lo dejamos acá?'. El alumno decide."),
    "tween": ("Al cerrar: reconocé el logro sin infantilizar y ofrecé seguir: 'Listo, lo de hoy salió. "
              "¿Seguimos un rato o cortamos?'. El alumno decide."),
    "adult": ("Al cerrar: reconocé lo trabajado según su nivel y ofrecé seguir o terminar: 'Buen trabajo "
              "hoy. ¿Seguimos un poco más o lo dejamos por hoy?'. El alumno decide."),
}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        print("Rieles — idioma por nivel + duración por seg×nivel:")
        mods = (await db.execute(select(MethodologyModule))).scalars().all()
        for m in mods:
            lang = LANGUAGE_BY_LEVEL.get(m.level)
            if lang:
                m.language_rule = lang
            dur = DURATION.get((m.student_type, m.level))
            if dur:
                m.max_session_minutes, m.max_turns = dur
            print(f"  [upd] {m.student_type}/{m.level}  idioma={'sí' if lang else '-'}  dur={dur or '-'}")
        await db.commit()

        print("\nCierre suave por segmento (student_types.closing_seed):")
        sts = (await db.execute(select(StudentType))).scalars().all()
        for st in sts:
            seed = CLOSING_SEED.get(st.slug)
            if seed:
                st.closing_seed = seed
                print(f"  [upd] {st.slug}")
        await db.commit()
    print("\nOK — seed_method_layer completo")


if __name__ == "__main__":
    asyncio.run(main())

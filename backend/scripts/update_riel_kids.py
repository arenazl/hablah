"""Sincroniza los rieles KIDS ya sembrados con el texto fuente de
seed_methodology_modules.KIDS_RAILS.

El seed es idempotente con *skip* (si la fila ya existe no la toca), así que
cuando cambiamos el texto del riel hay que forzar el UPDATE sobre la fila
existente. Este script hace eso: una sola fuente de verdad (KIDS_RAILS).

Uso: heroku run python scripts/update_riel_kids.py
"""
import sys, os, asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from core.database import AsyncSessionLocal
from models.methodology import MethodologyModule
from seed_methodology_modules import KIDS_RAILS


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for r in KIDS_RAILS:
            m = (await db.execute(select(MethodologyModule).where(
                MethodologyModule.student_type == r["student_type"],
                MethodologyModule.level == r["level"],
                MethodologyModule.module_order == 1,
            ))).scalar_one_or_none()
            if not m:
                print(f"[warn] no existe riel {r['student_type']}/{r['level']} (corré el seed primero)")
                continue
            m.ai_restraints = r["restraints"]
            m.focus_name = r["focus"]
            m.target_grammar = r["grammar"]
            m.evaluation_criteria = r["eval"]
            print(f"[ok] riel {r['student_type']}/{r['level']} actualizado ({len(r['restraints'])} chars)")
        await db.commit()
    print("\nOK - rieles kids sincronizados con el seed.")


if __name__ == "__main__":
    asyncio.run(main())

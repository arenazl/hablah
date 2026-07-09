"""Smoke de api/motor (nuevo): ABM genérico + playground JIT, contra datos reales."""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.database import AsyncSessionLocal
from api import motor
from api.motor import ResolveIn


async def main() -> None:
    async with AsyncSessionLocal() as db:
        tables = await motor.list_tables(db=db, _=None)
        print(f"=== ABM tables: {len(tables)} ===")
        for t in tables:
            pk = ",".join(t["pk"])
            print(f"  [{t['group']:18}] {t['name']:22} ({t['count']} filas, pk={pk}, {len(t['columns'])} cols)")

        # esquema de behavioral_guard (para el form genérico)
        guard = next(t for t in tables if t["name"] == "behavioral_guard")
        print("\n=== schema behavioral_guard ===")
        for c in guard["columns"]:
            extra = []
            if c["is_pk"]: extra.append("PK")
            if c["auto"]: extra.append("auto")
            if c["fk_ref"]: extra.append(f"FK->{c['fk_ref']}")
            if c["enum_options"]: extra.append(f"enum{c['enum_options']}")
            print(f"   {c['name']:14} {c['data_type']:10} {' '.join(extra)}")

        rows = await motor.list_rows("topic_lexis", db=db, _=None)
        print(f"\n=== rows topic_lexis: {len(rows)} (primeras 3) ===")
        for r in rows[:3]:
            print("  ", r)

        dims = await motor.dimensions(db=db, _=None)
        print(f"\n=== dimensions: {len(dims['bands'])} bandas, {len(dims['levels'])} niveles, "
              f"{len(dims['catalog'])} cats, {len(dims['students'])} alumnos ===")

    # playground (usa los motores, conexión propia)
    print("\n=== POST /resolve  (adult · B2 · Fútbol) ===")
    out = await motor.resolve(ResolveIn(band_code="adult", level_code="B2", topic_id=7), _=None)
    print(f"  meta: {out['meta']['tutor_name']} · {out['meta']['pacing_min']}min · "
          f"orq={out['meta']['orchestration_name']}")
    print(f"  guards_pool: {len(out['guards_pool'])}  guards_final: {len(out['guards_final'])}")
    print(f"  prompt: {len(out['prompt'])} chars, arranca con: {out['prompt'][:60]!r}")

    print("\n=== POST /resolve con test_overrides (saco guard 10, agrego uno) ===")
    out2 = await motor.resolve(ResolveIn(
        band_code="adult", level_code="B2", topic_id=7,
        test_overrides=[{"slot": "behavioral_guard", "action": "disable", "target_id": 10},
                        {"slot": "behavioral_guard", "action": "add", "body": "JUGADA EN MEMORIA"}]), _=None)
    print(f"  guards_final base={len(out['guards_final'])} -> con override={len(out2['guards_final'])}")
    print(f"  último guard: {out2['guards_final'][-1]!r}")


if __name__ == "__main__":
    asyncio.run(main())

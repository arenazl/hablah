import sys
import os
import json
import asyncio
from datetime import datetime

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, update
from core.database import AsyncSessionLocal
from models.methodology import StudentType, Level

APPLY = "--apply" in sys.argv

async def main() -> None:
    cat_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data", "catalogo")
    
    with open(os.path.join(cat_dir, "student_types.json"), "r", encoding="utf-8") as f:
        local_std = json.load(f)
        
    with open(os.path.join(cat_dir, "levels.json"), "r", encoding="utf-8") as f:
        local_lv = json.load(f)

    async with AsyncSessionLocal() as db:
        # 1. Backups
        std_rows = (await db.execute(select(StudentType))).scalars().all()
        lv_rows = (await db.execute(select(Level))).scalars().all()
        
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        bkp_std = os.path.join(os.path.dirname(__file__), f"_backup_student_types_{stamp}.json")
        bkp_lv = os.path.join(os.path.dirname(__file__), f"_backup_levels_{stamp}.json")
        
        # Guardar backups
        def _json_default(val: object):
            if isinstance(val, (datetime, datetime.date, datetime.time)):
                return val.isoformat()
            return str(val)

        with open(bkp_std, "w", encoding="utf-8") as f:
            json.dump([{col.name: getattr(r, col.name) for col in StudentType.__table__.columns} for r in std_rows], f, ensure_ascii=False, indent=1, default=_json_default)
        with open(bkp_lv, "w", encoding="utf-8") as f:
            json.dump([{col.name: getattr(r, col.name) for col in Level.__table__.columns} for r in lv_rows], f, ensure_ascii=False, indent=1, default=_json_default)
            
        print(f"Backups guardados en:\n  {bkp_std}\n  {bkp_lv}\n")

        # 2. Procesar StudentTypes (Eje Edad)
        print("== COMPAGINANDO STUDENT_TYPES (Eje Edad) ==")
        for l_std in local_std:
            db_std = next((r for r in std_rows if r.slug == l_std["slug"]), None)
            if not db_std:
                print(f"  [ERROR] student_type con slug {l_std['slug']} no encontrado en la DB.")
                continue
            
            diffs = []
            fields_to_update = {}
            for col in StudentType.__table__.columns:
                name = col.name
                if name in ["id", "created_at", "updated_at"]:
                    continue
                db_val = getattr(db_std, name)
                local_val = l_std.get(name)
                if db_val != local_val:
                    diffs.append(f"    {name}:\n      DB:    {repr(db_val)}\n      Local: {repr(local_val)}")
                    fields_to_update[name] = local_val
            
            if diffs:
                print(f"  Modificaciones para {l_std['slug']}:")
                print("\n".join(diffs))
                if APPLY:
                    await db.execute(update(StudentType).where(StudentType.slug == l_std["slug"]).values(**fields_to_update))
                    print(f"    [APLICADO] {l_std['slug']} actualizado.")
            else:
                print(f"  {l_std['slug']} sin cambios.")

        # 3. Procesar Levels (Eje Nivel)
        print("\n== COMPAGINANDO LEVELS (Eje Nivel) ==")
        for l_lv in local_lv:
            db_lv = next((r for r in lv_rows if r.code == l_lv["code"]), None)
            if not db_lv:
                print(f"  [ERROR] level con code {l_lv['code']} no encontrado en la DB.")
                continue
            
            diffs = []
            fields_to_update = {}
            for col in Level.__table__.columns:
                name = col.name
                if name in ["id", "created_at", "updated_at"]:
                    continue
                db_val = getattr(db_lv, name)
                local_val = l_lv.get(name)
                if db_val != local_val:
                    diffs.append(f"    {name}:\n      DB:    {repr(db_val)}\n      Local: {repr(local_val)}")
                    fields_to_update[name] = local_val
            
            if diffs:
                print(f"  Modificaciones para {l_lv['code']}:")
                print("\n".join(diffs))
                if APPLY:
                    await db.execute(update(Level).where(Level.code == l_lv["code"]).values(**fields_to_update))
                    print(f"    [APLICADO] {l_lv['code']} actualizado.")
            else:
                print(f"  {l_lv['code']} sin cambios.")

        if APPLY:
            await db.commit()
            print("\n[OK] Base de datos de catálogo actualizada con éxito.")
        else:
            print("\n[DRY-RUN] Ejecuta con '--apply' para persistir los cambios en la base de datos.")

if __name__ == "__main__":
    asyncio.run(main())

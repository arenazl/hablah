"""Aplica el refactor arquitectónico de Vínculo (Edad) vs Andamiaje (Nivel) a la BD de prod.

Este script actualiza las tablas `student_types` y `levels` basándose en los archivos
refactorizados `data/catalogo/student_types.json` y `data/catalogo/levels.json`.

Patrón: dry-run por defecto → diff visible → backup JSON → --apply para escribir.
"""
import sys
import os
import json
import asyncio
from datetime import datetime

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from core.database import AsyncSessionLocal

APPLY = "--apply" in sys.argv

LEVELS_JSON = os.path.join(os.path.dirname(__file__), "../../data/catalogo/levels.json")
STUDENTS_JSON = os.path.join(os.path.dirname(__file__), "../../data/catalogo/student_types.json")
BACKUPS_DIR = os.path.join(os.path.dirname(__file__), "../../data/catalogo/backups")

async def main():
    print("Iniciando migración de arquitectura Edad vs Nivel...")
    if APPLY:
        print("[!] MODO APPLY ACTIVO. Se modificarán los datos en la base de datos.")
    else:
        print("[-] MODO DRY-RUN. Usa '--apply' para ejecutar los cambios reales.")

    os.makedirs(BACKUPS_DIR, exist_ok=True)
    
    with open(LEVELS_JSON, "r", encoding="utf-8") as f:
        levels_target = {lvl["code"]: lvl for lvl in json.load(f)}
    
    with open(STUDENTS_JSON, "r", encoding="utf-8") as f:
        students_target = {st["slug"]: st for st in json.load(f)}

    async with AsyncSessionLocal() as session:
        # Backup levels
        res = await session.execute(text("SELECT code, expected_production FROM levels"))
        levels_current = {row.code: dict(row._mapping) for row in res.fetchall()}
        
        # Backup students
        res = await session.execute(text("SELECT slug, tutor_identity, tutor_mascot, form_rules, tutor_tonal_rules, opening_seed, continuation_seed FROM student_types"))
        students_current = {row.slug: dict(row._mapping) for row in res.fetchall()}

        backup_file = os.path.join(BACKUPS_DIR, f"pre_refactor_arquitectura_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump({
                "levels": levels_current,
                "student_types": students_current
            }, f, indent=2, ensure_ascii=False)
        print(f"\n[BACKUP] Estado previo guardado en: {backup_file}")

        print("\n--- DIFF LEVELS ---")
        levels_updates = []
        for code, curr in levels_current.items():
            if code in levels_target:
                tgt = levels_target[code]
                if curr["expected_production"] != tgt["expected_production"]:
                    print(f"[{code}] expected_production modificado.")
                    print(f"  - OLD: {curr['expected_production']}")
                    print(f"  + NEW: {tgt['expected_production']}")
                    levels_updates.append(tgt)
        
        print("\n--- DIFF STUDENT_TYPES ---")
        students_updates = []
        for slug, curr in students_current.items():
            if slug in students_target:
                tgt = students_target[slug]
                fields = ["tutor_identity", "tutor_mascot", "form_rules", "tutor_tonal_rules", "opening_seed", "continuation_seed"]
                diffs = []
                for field in fields:
                    if curr[field] != tgt[field]:
                        diffs.append((field, curr[field], tgt[field]))
                
                if diffs:
                    print(f"[{slug}] modificado:")
                    for field, old_v, new_v in diffs:
                        print(f"  [{field}]")
                        print(f"    - OLD: {old_v}")
                        print(f"    + NEW: {new_v}")
                    students_updates.append(tgt)
        
        if APPLY:
            print("\n[APPLY] Ejecutando updates...")
            for tgt in levels_updates:
                await session.execute(
                    text("UPDATE levels SET expected_production = :ep WHERE code = :c"),
                    {"ep": tgt["expected_production"], "c": tgt["code"]}
                )
            
            for tgt in students_updates:
                await session.execute(
                    text("""
                        UPDATE student_types 
                        SET tutor_identity = :id, 
                            tutor_mascot = :tm,
                            form_rules = :fr, 
                            tutor_tonal_rules = :ttr, 
                            opening_seed = :os, 
                            continuation_seed = :cs
                        WHERE slug = :slug
                    """),
                    {
                        "id": tgt["tutor_identity"],
                        "tm": tgt["tutor_mascot"],
                        "fr": tgt["form_rules"],
                        "ttr": tgt["tutor_tonal_rules"],
                        "os": tgt["opening_seed"],
                        "cs": tgt["continuation_seed"],
                        "slug": tgt["slug"]
                    }
                )
            await session.commit()
            print("[APPLY] ¡Transacción completada y base de datos actualizada!")
        else:
            print("\n[!] Fin del dry-run. No se aplicaron cambios a la base de datos.")

if __name__ == "__main__":
    asyncio.run(main())

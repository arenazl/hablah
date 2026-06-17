"""Crea la tabla `rules` y la carga desde Motor-Learning/catalogo_reglas_motor.xlsx.

La BIBLIOTECA del motor: cada fila de la hoja "Reglas" = una regla del catálogo.
Idempotente (upsert por ID). Uso: python scripts/seed_rules_catalog.py
"""
import asyncio
import os
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import openpyxl
from sqlalchemy import select
from core.database import engine, AsyncSessionLocal
from models.rule import Rule

XLSX = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Motor-Learning", "catalogo_reglas_motor.xlsx"))


def _bool(v) -> bool:
    return str(v).strip().lower() in ("sí", "si", "yes", "true", "1", "x")


def _read_rules() -> list[dict]:
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["Reglas"]
    out = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:  # header
            continue
        if not row or not row[0]:  # sin ID, fila vacía
            continue
        out.append({
            "id": str(row[0]).strip(),
            "bloque": str(row[1] or "").strip(),
            "categoria": str(row[2] or "").strip(),
            "eje": str(row[3] or "").strip(),
            "aplica_a": str(row[4] or "todos").strip(),
            "regla": str(row[5] or "").strip(),
            "origen": str(row[6] or "").strip() or None,
            "editable": _bool(row[7]),
            "notas": (str(row[8]).strip() or None) if (len(row) > 8 and row[8]) else None,
            "sort_order": i,
        })
    return out


async def main() -> None:
    rules = _read_rules()
    print(f"Leídas {len(rules)} reglas del Excel.")
    # crear la tabla si no existe
    async with engine.begin() as conn:
        await conn.run_sync(Rule.__table__.create, checkfirst=True)
    # upsert
    added = updated = 0
    async with AsyncSessionLocal() as db:
        for r in rules:
            row = (await db.execute(select(Rule).where(Rule.id == r["id"]))).scalar_one_or_none()
            if row:
                for k, v in r.items():
                    setattr(row, k, v)
                updated += 1
            else:
                db.add(Rule(**r, active=True))
                added += 1
        await db.commit()
    await engine.dispose()
    print(f"OK - catálogo de reglas: +{added} nuevas, {updated} actualizadas.")
    # resumen por eje
    from collections import Counter
    c = Counter(r["eje"] for r in rules)
    print("  por eje:", dict(c))


if __name__ == "__main__":
    asyncio.run(main())

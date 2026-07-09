"""Snapshot READ-ONLY del catálogo (student_types, levels, topics, app_config) a JSON versionado.

WO F0-05 (docs/03-rework/02-hoja-de-ruta.md): el catálogo es el código fuente real del motor
pero vive SOLO en la DB Aiven — un batch malo lo corrompe sin diff ni rollback (ya pasó: truncado
de `student_types` 2026-06-24). Este script no escribe NADA en la DB: exporta las 4 tablas a
`data/catalogo/*.json` con orden estable + claves ordenadas + UTF-8, para que el diff de
`git diff` sea el diff real del dato.

Se corre a mano tras CADA cambio de catálogo (por el script de turno, siempre con el patrón
dry-run/backup/`--apply`) y el JSON resultante se commitea. Ver la regla en
`backend/scripts/README.md`.

Uso:
    cd backend && python scripts/snapshot_catalogo.py

Nota sobre `app_config`: se lee con SQL crudo a propósito. La tabla real en Aiven tiene columnas
`config_key` / `config_value` — NO las del modelo ORM `AppConfig` (`key`/`value`/`kind`/
`section`/`label`), que quedó desalineado del schema real (bug documentado: ver
`services/gemini_live.py` ~L148 y memoria del proyecto "BUG app_config: tabla != modelo"). Usar
el ORM acá reproduciría ese bug en el snapshot (columnas inexistentes / vacío silencioso).
"""
import sys
import os
import json
import asyncio
from datetime import datetime, date
from decimal import Decimal

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, text as _sqltext  # noqa: E402
from core.database import AsyncSessionLocal  # noqa: E402
from models.template import Topic  # noqa: E402
from models.methodology import StudentType, Level  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "catalogo")


def _json_default(value: object) -> str:
    """Serialización determinística de tipos que `json` no maneja nativamente.

    datetime/date -> isoformat (mismo string siempre, sin depender de timezone local).
    Decimal -> string sin notación científica (ninguna tabla del catálogo tiene Numeric hoy,
    pero se cubre por si se agrega uno mañana — evita floats no deterministas).
    """
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return format(value, "f")
    raise TypeError(f"snapshot_catalogo: no sé serializar {type(value)!r} ({value!r})")


def _row_to_dict(row: object, columns) -> dict:
    return {col.name: getattr(row, col.name) for col in columns}


def _write_json(filename: str, rows: list) -> None:
    path = os.path.join(OUT_DIR, filename)
    payload = json.dumps(rows, ensure_ascii=False, indent=1, sort_keys=True, default=_json_default)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(payload)
        f.write("\n")
    print(f"  {filename}: {len(rows)} filas -> {os.path.abspath(path)}")


async def _export_orm(db, model, filename: str, order_by) -> int:
    """Exporta una tabla completa vía ORM, ordenada por su PK (clave natural estable)."""
    rows = (await db.execute(select(model).order_by(order_by))).scalars().all()
    dicts = [_row_to_dict(r, model.__table__.columns) for r in rows]
    _write_json(filename, dicts)
    return len(dicts)


async def _export_app_config(db) -> int:
    """app_config: SQL crudo a propósito (columnas reales != ORM). Ver docstring del módulo."""
    rows = (await db.execute(_sqltext(
        "SELECT config_key, config_value FROM app_config ORDER BY config_key"
    ))).all()
    dicts = [{"config_key": r[0], "config_value": r[1]} for r in rows]
    _write_json("app_config.json", dicts)
    return len(dicts)


async def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Snapshot READ-ONLY del catálogo -> {os.path.abspath(OUT_DIR)}\n")

    async with AsyncSessionLocal() as db:
        n_student_types = await _export_orm(db, StudentType, "student_types.json", StudentType.id)
        n_levels = await _export_orm(db, Level, "levels.json", Level.id)
        n_topics = await _export_orm(db, Topic, "topics.json", Topic.id)
        n_app_config = await _export_app_config(db)

    print(
        f"\nOK — student_types={n_student_types}  levels={n_levels}  "
        f"topics={n_topics}  app_config={n_app_config}"
    )
    print("Nada se escribió en la DB (read-only). Si algo cambió, commitear data/catalogo/.")


if __name__ == "__main__":
    asyncio.run(main())

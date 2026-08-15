"""Backup del catálogo que toca la parametrización de idioma, ANTES de tocarlo.

Guarda levels + age_level_matrix + orchestration_templates + conversation_rules + los campos
de student_types a un JSON con timestamp, al lado de los otros _backup_*.json de scripts/.

    cd backend && python scripts/backup_catalogo_idioma.py
    cd backend && python scripts/backup_catalogo_idioma.py --restore _backup_catalogo_idioma_XXXX.json
"""
import datetime as _dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

TABLAS = {
    "levels": "SELECT * FROM levels",
    "age_level_matrix": "SELECT * FROM age_level_matrix",
    "orchestration_templates": "SELECT * FROM orchestration_templates",
    "conversation_rules": "SELECT * FROM conversation_rules",
    "student_types": "SELECT * FROM student_types",
}
# Las claves primarias reales de cada tabla, para poder restaurar fila por fila.
_PK = {
    "levels": ["code"],
    "age_level_matrix": ["age_slug", "level_code"],
    "orchestration_templates": ["id"],
    "conversation_rules": ["slug"],
    "student_types": ["slug"],
}


def _default(o):
    if isinstance(o, (_dt.datetime, _dt.date)):
        return o.isoformat()
    return str(o)


def backup():
    out = {}
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        with db.conn.cursor() as cur:
            for t, q in TABLAS.items():
                cur.execute(q)
                out[t] = cur.fetchall()
                print(f"  {t}: {len(out[t])} filas")
    finally:
        db.conn.close()
    ts = _dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        f"_backup_catalogo_idioma_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1, default=_default)
    print(f"\nOK -> {path}")


def restore(path):
    if not os.path.isabs(path):
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), path)
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        with db.conn.cursor() as cur:
            for t, rows in data.items():
                pk = _PK[t]
                n = 0
                for r in rows:
                    cols = [c for c in r if c not in pk and c not in ("created_at", "updated_at")]
                    sets = ", ".join(f"{c}=%s" for c in cols)
                    where = " AND ".join(f"{k}=%s" for k in pk)
                    cur.execute(f"UPDATE {t} SET {sets} WHERE {where}",
                                [r[c] for c in cols] + [r[k] for k in pk])
                    n += cur.rowcount
                print(f"  {t}: {n} filas restauradas")
        db.conn.commit()
        print("\nOK — catálogo restaurado.")
    finally:
        db.conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--restore":
        restore(sys.argv[2])
    else:
        backup()

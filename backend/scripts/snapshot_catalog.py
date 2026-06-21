"""Snapshot histórico del CATÁLOGO (el molde) para poder VOLVER si algo rompe.

Guarda el estado completo de las tablas-molde en catalog_snapshot (JSON). Restaurar
re-pone exactamente esas filas (con sus ids → no rompe FKs del learner). NO toca
tópicos ni datos del alumno.

  python snapshot_catalog.py            -> crea un snapshot y muestra su id
  python snapshot_catalog.py restore N  -> restaura el snapshot N
"""
from __future__ import annotations
import json
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

# tablas del MOLDE (no learner_*, no topic/category, no student)
TABLES = ["age_band", "`level`", "tutor_identity", "pedagogy", "band_policy", "activity_type",
          "reward", "behavioral_guard", "level_policy", "universal_policy", "language_objective",
          "objective_chunk", "phase", "trigger_template"]


def _connect():
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                           password=settings.DB_PASSWORD, database=settings.DB_NAME,
                           ssl=ctx, cursorclass=DictCursor, charset="utf8mb4", autocommit=False)


def _ensure(cur):
    cur.execute("""CREATE TABLE IF NOT EXISTS catalog_snapshot (
        snapshot_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        label VARCHAR(120) NULL, data LONGTEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")


def make_snapshot(label: str) -> int:
    conn = _connect(); cur = conn.cursor()
    _ensure(cur)
    dump = {}
    for t in TABLES:
        cur.execute(f"SELECT * FROM {t}")
        dump[t.strip("`")] = cur.fetchall()
    cur.execute("INSERT INTO catalog_snapshot (label, data) VALUES (%s,%s)",
                (label, json.dumps(dump, default=str, ensure_ascii=False)))
    sid = cur.lastrowid
    conn.commit()
    counts = {k: len(v) for k, v in dump.items()}
    cur.close(); conn.close()
    print(f"snapshot #{sid} creado ({label}). Filas:", counts)
    return sid


def restore(snapshot_id: int) -> None:
    conn = _connect(); cur = conn.cursor()
    cur.execute("SELECT data FROM catalog_snapshot WHERE snapshot_id=%s", (snapshot_id,))
    row = cur.fetchone()
    if not row:
        print(f"snapshot #{snapshot_id} no existe"); return
    dump = json.loads(row["data"])
    cur.execute("SET FOREIGN_KEY_CHECKS=0")
    for t in TABLES:
        name = t.strip("`")
        rows = dump.get(name, [])
        cur.execute(f"DELETE FROM {t}")
        if rows:
            cols = list(rows[0].keys())
            ph = ",".join(["%s"] * len(cols))
            colsql = ",".join(f"`{c}`" for c in cols)
            cur.executemany(f"INSERT INTO {t} ({colsql}) VALUES ({ph})",
                            [[r[c] for c in cols] for r in rows])
    cur.execute("SET FOREIGN_KEY_CHECKS=1")
    conn.commit()
    cur.close(); conn.close()
    print(f"RESTAURADO al snapshot #{snapshot_id}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "restore":
        restore(int(sys.argv[2]))
    else:
        make_snapshot(sys.argv[1] if len(sys.argv) > 1 else "pre-aplicacion especialista")

"""Restringe qué NIVELES aplican por EDAD (sentido común pedagógico).

Un nene de primera infancia no es C1: ofrecer ese combo da prompts incoherentes
(regla de edad 'español siempre' vs regla de nivel 'inmersión'). Se guarda como
DATO: age_band.max_level_order = el nivel más alto permitido para esa edad.
Todos arrancan en A1. Niveles contiguos A1..max.

  early_child -> A2 (order 2) · child -> B1 (3) · teen -> C1 (5) · adult -> C1 (5)
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

MAX_BY_BAND = {"early_child": 2, "child": 3, "teen": 5, "adult": 5}


def _connect():
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                           password=settings.DB_PASSWORD, database=settings.DB_NAME,
                           ssl=ctx, cursorclass=DictCursor, charset="utf8mb4", autocommit=False)


def main() -> None:
    conn = _connect(); cur = conn.cursor()
    cur.execute("""SELECT COLUMN_NAME AS name FROM information_schema.columns
                   WHERE table_schema=%s AND table_name='age_band'""", (settings.DB_NAME,))
    have = {r["name"] for r in cur.fetchall()}
    if "max_level_order" not in have:
        cur.execute("ALTER TABLE age_band ADD COLUMN max_level_order TINYINT UNSIGNED NOT NULL DEFAULT 5")
        print("age_band.max_level_order agregada")
    for code, mx in MAX_BY_BAND.items():
        cur.execute("UPDATE age_band SET max_level_order=%s WHERE code=%s", (mx, code))
    conn.commit()
    cur.execute("SELECT code, max_level_order FROM age_band ORDER BY band_id")
    print("topes por edad:", {r["code"]: r["max_level_order"] for r in cur.fetchall()})
    cur.close(); conn.close()


if __name__ == "__main__":
    main()

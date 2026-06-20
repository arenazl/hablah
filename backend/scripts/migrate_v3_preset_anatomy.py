"""Suma la ANATOMÍA del patrón a learned_preset: polaridad + directiva.

Acordado con el usuario: un patrón = descripción genérica + POLARIDAD (positivo/
negativo) + DIRECTIVA (qué hace el coach con él) + señales de reconocimiento.
La confianza del classify NO es columna: decide el status (alta -> active sola,
baja -> candidate). Aditivo, no destructivo.
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

COLUMNS = [
    ("polarity", "ALTER TABLE learned_preset ADD COLUMN polarity ENUM('positive','negative','neutral') NOT NULL DEFAULT 'neutral' AFTER category"),
    ("directive", "ALTER TABLE learned_preset ADD COLUMN directive VARCHAR(300) NULL AFTER polarity"),
]


def _connect():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(
        host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
        password=settings.DB_PASSWORD, database=settings.DB_NAME,
        ssl=ctx, cursorclass=DictCursor, charset="utf8mb4", autocommit=False)


def main() -> None:
    conn = _connect()
    cur = conn.cursor()
    cur.execute("""SELECT COLUMN_NAME AS name FROM information_schema.columns
                   WHERE table_schema=%s AND table_name='learned_preset'""", (settings.DB_NAME,))
    have = {r["name"] for r in cur.fetchall()}
    added = []
    for col, ddl in COLUMNS:
        if col not in have:
            cur.execute(ddl)
            added.append(col)
    # ampliar kind: error/chunk + comportamiento/motivacion (idempotente)
    cur.execute("ALTER TABLE learned_preset MODIFY COLUMN kind ENUM('error','chunk','comportamiento','motivacion') NOT NULL")
    conn.commit()
    print(f"learned_preset: columnas agregadas = {added or '(ya estaban)'}; kind ampliado a error/chunk/comportamiento/motivacion")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

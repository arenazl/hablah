"""Perfil por edad×nivel: un alumno-molde por cada combo, que acumula su learned_state.

Sirve para PROBAR el motor: corrés clases sobre el perfil de (edad, nivel), su
learned_state crece, y un botón lo borra para ver la clase "sin historial" vs
"con historial". Aditivo: agrega student.profile_key (NULL para alumnos reales).
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402


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
                   WHERE table_schema=%s AND table_name='student'""", (settings.DB_NAME,))
    have = {r["name"] for r in cur.fetchall()}
    if "profile_key" not in have:
        cur.execute("ALTER TABLE student ADD COLUMN profile_key VARCHAR(20) NULL UNIQUE AFTER name")
        print("student.profile_key agregada")
    else:
        print("student.profile_key ya estaba")
    conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

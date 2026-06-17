"""Crea un ALUMNO DE PRUEBA (demo) para /training, con historia ya empezada.

Inventado a propósito (no es un alumno real): "Lucas (demo)", 15 años, B1.
Arranca con algo de progreso para que se le pueda 'seguir la historia':
  - B1-FUN-01 (narrar en pasado) ya DOMINADO
  - B1-GRA-01 (pasado simple) A REPASAR (due)
  - el resto del currículum B1 queda 'nuevo'
Idempotente: si ya existe (por nombre), no duplica.
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

NAME = "Lucas (demo)"
AGE = 15
LEVEL = "B1"
INTERESTS = ["videojuegos", "música"]
MASTERED = ["B1-FUN-01"]
DUE = ["B1-GRA-01"]
ITEMS = [("word", "checkpoint", "learning"), ("error", "present perfect vs past simple", "due")]


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
    cur.execute("SELECT student_id FROM student WHERE name=%s", (NAME,))
    row = cur.fetchone()
    if row:
        print(f"Ya existe: {NAME} (id={row['student_id']}). Nada que hacer.")
        conn.close()
        return

    cur.execute("INSERT INTO student (name, age, level_code) VALUES (%s,%s,%s)", (NAME, AGE, LEVEL))
    sid = cur.lastrowid
    for it in INTERESTS:
        cur.execute("INSERT INTO student_interest (student_id, interest) VALUES (%s,%s)", (sid, it))

    def oid(code):
        cur.execute("SELECT objective_id FROM language_objective WHERE code=%s", (code,))
        r = cur.fetchone()
        return r["objective_id"] if r else None

    for code in MASTERED:
        o = oid(code)
        if o:
            cur.execute("INSERT INTO learner_objective (student_id,objective_id,status,last_seen,due_at) VALUES (%s,%s,'mastered',NOW(),NULL)", (sid, o))
    for code in DUE:
        o = oid(code)
        if o:
            cur.execute("INSERT INTO learner_objective (student_id,objective_id,status,last_seen,due_at) VALUES (%s,%s,'due',NOW(),NOW())", (sid, o))
    for typ, val, status in ITEMS:
        cur.execute("INSERT INTO learner_item (student_id,item_type,item_value,status,last_seen,due_at) VALUES (%s,%s,%s,%s,NOW(),NOW())", (sid, typ, val, status))

    conn.commit()
    conn.close()
    print(f"Creado: {NAME} (id={sid}) · {AGE} años · {LEVEL} · intereses {INTERESTS}")
    print(f"Historia inicial: {MASTERED} dominado · {DUE} a repasar · {len(ITEMS)} ítems")


if __name__ == "__main__":
    main()

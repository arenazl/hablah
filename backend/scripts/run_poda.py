"""Corre Motor-Learning/poda_categorias.sql contra Aiven CON RED DE SEGURIDAD.

Ejecuta los UPDATE/DELETE dentro de una transacción, verifica que queden 10
categorías sin nombres duplicados, y recién ahí COMMIT (si no, ROLLBACK).
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

SQL_PATH = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "Motor-Learning", "poda_categorias.sql"))


def _connect():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(
        host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
        password=settings.DB_PASSWORD, database=settings.DB_NAME,
        ssl=ctx, cursorclass=DictCursor, charset="utf8mb4", autocommit=False)


def _statements(sql: str):
    # quita comentarios de línea (--) y separa por ';'
    lines = [ln for ln in sql.splitlines() if not ln.strip().startswith("--")]
    raw = "\n".join(lines)
    for stmt in raw.split(";"):
        s = stmt.strip()
        if not s:
            continue
        up = s.upper()
        if up in ("START TRANSACTION", "COMMIT", "ROLLBACK") or up.startswith("SET NAMES"):
            continue  # la transacción y el commit los maneja este runner
        yield s


def main() -> None:
    with open(SQL_PATH, encoding="utf-8") as f:
        sql = f.read()

    conn = _connect()
    cur = conn.cursor()
    for stmt in _statements(sql):
        cur.execute(stmt)

    # verificación
    cur.execute("""SELECT c.name AS categoria, COUNT(DISTINCT s.subcategory_id) subs, COUNT(t.topic_id) temas
                   FROM category c LEFT JOIN subcategory s ON s.category_id=c.category_id
                   LEFT JOIN topic t ON t.subcategory_id=s.subcategory_id
                   GROUP BY c.category_id, c.name ORDER BY c.category_id""")
    rows = cur.fetchall()
    names = [r["categoria"] for r in rows]
    dup = len(names) != len(set(names))

    print("Resultado tras la poda:")
    for r in rows:
        print(f"  {r['categoria']:30} subs={r['subs']:2} temas={r['temas']}")

    if len(rows) == 10 and not dup:
        conn.commit()
        print(f"\nOK → 10 categorías, sin duplicados. COMMIT.")
    else:
        conn.rollback()
        print(f"\nABORTADO → quedaron {len(rows)} categorías (dup={dup}). ROLLBACK, no toqué nada.")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

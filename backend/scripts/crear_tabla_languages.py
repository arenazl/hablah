"""Tabla `languages` — el catálogo de idiomas es DATO, no una lista en el código.

Sumar portugués tiene que ser un INSERT, no un build de 10 minutos. Alimenta dos cosas:
  - name_native -> resuelve {idioma} / {idioma_base} DENTRO del prompt (endónimo: "English",
    "español", "português"). Así los textos que ya estaban en inglés no cambian de sentido.
  - label       -> lo que ve el usuario en los combos (probador /motor, ABM de usuarios).

Activar/desactivar un idioma = UPDATE active. Cero deploy.

    cd backend && python scripts/crear_tabla_languages.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

DDL = """
CREATE TABLE IF NOT EXISTS languages (
  code        VARCHAR(5)  NOT NULL,
  name_native VARCHAR(60) NOT NULL,
  label       VARCHAR(60) NOT NULL,
  sort_order  INT         NOT NULL DEFAULT 0,
  active      TINYINT(1)  NOT NULL DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (code)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
"""

SEED = [
    # code, name_native (va DENTRO del prompt), label (lo ve el usuario), orden, activo
    ("en", "English",    "Inglés",     1, 1),
    ("es", "español",    "Castellano", 2, 1),
    ("pt", "português",  "Portugués",  3, 1),
    ("it", "italiano",   "Italiano",   4, 1),
    ("fr", "français",   "Francés",    5, 0),
    ("de", "Deutsch",    "Alemán",     6, 0),
]


def main():
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        with db.conn.cursor() as cur:
            cur.execute(DDL)
            for code, native, label, orden, activo in SEED:
                cur.execute("SELECT code FROM languages WHERE code=%s", (code,))
                if cur.fetchone():
                    cur.execute("UPDATE languages SET name_native=%s, label=%s, sort_order=%s "
                                "WHERE code=%s", (native, label, orden, code))
                    print(f"  {code}: actualizado")
                else:
                    cur.execute("INSERT INTO languages (code, name_native, label, sort_order, active) "
                                "VALUES (%s,%s,%s,%s,%s)", (code, native, label, orden, activo))
                    print(f"  {code}: CREADO ({label}, activo={activo})")
        db.conn.commit()
        print("\nOK — sumar un idioma ahora es un INSERT acá, sin deploy.")
    finally:
        db.conn.close()


if __name__ == "__main__":
    main()

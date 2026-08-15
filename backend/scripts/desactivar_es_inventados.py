"""Saca del medio los niveles ES1/ES2/ES3 que se cargaron con orquestación INVENTADA.

Por qué: el objetivo era probar el motor SIN la variable idioma, y esos cruces traían redacción
nueva — se cambiaban dos variables a la vez (idioma + orquestación) y lo que se probaba era la
redacción, no el motor. El enfoque correcto es parametrizar el idioma sobre la orquestación que
YA existe (estructuras agnósticas), sin duplicar cruces.

No borra: desactiva (active=0). Reversible corriendo scripts/seed_castellano.py.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

CODES = ("ES1", "ES2", "ES3")


def main():
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        with db.conn.cursor() as cur:
            ph = ", ".join(["%s"] * len(CODES))
            cur.execute(f"UPDATE levels SET active=0 WHERE code IN ({ph})", CODES)
            print(f"  levels desactivados: {cur.rowcount}")
            cur.execute(f"UPDATE age_level_matrix SET active=0 WHERE level_code IN ({ph})", CODES)
            print(f"  cruces desactivados: {cur.rowcount}")

            cur.execute("SELECT id, levels FROM topics WHERE is_active=1")
            n = 0
            for r in cur.fetchall():
                raw = r["levels"]
                lv = json.loads(raw) if isinstance(raw, str) else (raw or [])
                limpio = [x for x in lv if x not in CODES]
                if limpio != lv:
                    cur.execute("UPDATE topics SET levels=%s WHERE id=%s",
                                (json.dumps(limpio, ensure_ascii=False), r["id"]))
                    n += 1
            print(f"  tópicos destaggeados: {n}")
        db.conn.commit()
        print("\nOK — el catálogo vuelve al estado previo (solo el track inglés + FONR).")
    finally:
        db.conn.close()


if __name__ == "__main__":
    main()

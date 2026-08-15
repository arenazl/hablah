"""Language_Note del template: sacarle el supuesto de que el idioma meta es inglés.

La nota vieja decía "...written in Spanish for YOU to interpret ... do not add Spanish beyond what
it allows". Con el track castellano (ES1-ES3) eso CONTRADICE al Language_Rule (que manda 100%
castellano): el modelo lee "no agregues español" mientras la regla le pide hablar español.

La nota nueva dice lo mismo sin nombrar ningún idioma: las instrucciones y las semillas pueden
venir en otro idioma, son para interpretar, y el ÚNICO que decide qué se habla es el Language_Rule.
Sirve igual para inglés, castellano o el track que venga. Idempotente.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.motor_engine import _connect

VIEJA = ("Language_Note: These system instructions, the topic title and the seeds are written in "
         "Spanish for YOU to interpret; the topic title may stay in Spanish. When you SPEAK to the "
         "student, follow the Language_Rule above — do not add Spanish beyond what it allows.")

NUEVA = ("Language_Note: These system instructions, the topic title and the seeds may be written in "
         "a language other than the one you must speak — they are for YOU to interpret, never to read "
         "out. The Language_Rule above is the ONLY thing that decides what language you speak in: "
         "follow it exactly and add nothing beyond what it allows.")


def main():
    db = _connect()
    try:
        db.conn.ping(reconnect=True)
        with db.conn.cursor() as cur:
            cur.execute("SELECT id, body FROM orchestration_templates WHERE active=1 ORDER BY id DESC LIMIT 1")
            row = cur.fetchone()
            if not row:
                print("no hay template activo"); return
            body = row["body"]
            if NUEVA in body:
                print("ya aplicada — nada que hacer"); return
            if VIEJA not in body:
                print("ATENCION: no encontre la nota vieja textual. Revisar a mano.")
                print("--- fragmento actual ---")
                for line in body.split("\n"):
                    if "Language_Note" in line:
                        print(line)
                return
            cur.execute("UPDATE orchestration_templates SET body=%s WHERE id=%s",
                        (body.replace(VIEJA, NUEVA), row["id"]))
        db.conn.commit()
        print("OK — Language_Note ahora es agnóstica al idioma.")
    finally:
        db.conn.close()


if __name__ == "__main__":
    main()

import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.motor_engine import _connect

def main():
    json_path = r"d:\Code\Hablah\docs\semillas_narrativas.json"
    
    if not os.path.exists(json_path):
        print(f"Error: No se encontró el archivo {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        seeds = json.load(f)

    db = _connect()
    try:
        updated_count = 0
        for s in seeds:
            tid = s.get("id")
            setting = s.get("narrative_setting")
            conflict = s.get("narrative_conflict")
            role = s.get("narrative_role")
            
            # Solo actualizamos si al menos uno de los campos tiene contenido
            if setting or conflict or role:
                db.conn.ping(reconnect=True)
                with db.conn.cursor() as cur:
                    cur.execute(
                        "UPDATE topics SET narrative_setting=%s, narrative_conflict=%s, narrative_role=%s WHERE id=%s",
                        (setting or None, conflict or None, role or None, tid)
                    )
                updated_count += 1

        db.conn.commit()
        print(f"Se actualizaron con éxito las semillas de {updated_count} tópicos en la base de datos.")
    finally:
        db.conn.close()

if __name__ == "__main__":
    main()

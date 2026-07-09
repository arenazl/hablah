"""
Lee combinaciones_editadas.json y sincroniza topic_band_level en la BD.
Hace un diff: inserta los nuevos, borra los eliminados. No toca nada que no cambió.

Uso:  python aplicar_combinaciones.py [ruta_al_json]
      Si no se pasa ruta, busca docs/combinaciones_editadas.json
"""
from __future__ import annotations
import json, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
import pymysql
from pymysql.cursors import DictCursor

SLUG_TO_ID = {"mini":1,"junior":2,"tween":3,"adult":4}
DEFAULT_JSON = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "combinaciones_editadas.json"))


def db():
    return pymysql.connect(
        host=os.environ["DB_HOST"], port=int(os.environ.get("DB_PORT",3306)),
        user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"],
        db=os.environ["DB_NAME"], ssl={"ca":None}, cursorclass=DictCursor, charset="utf8mb4")


def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_JSON
    if not os.path.exists(json_path):
        print(f"No encontré el archivo: {json_path}")
        sys.exit(1)

    data = json.load(open(json_path, encoding="utf-8"))
    assignments = data["assignments"]
    print(f"Leyendo: {json_path}  (generado: {data.get('generado','?')})")

    # Construir el set deseado: {(band_id, level_code, topic_id)}
    desired: set[tuple[int,str,int]] = set()
    for slug, levels in assignments.items():
        bid = SLUG_TO_ID.get(slug)
        if not bid:
            print(f"  [WARN] slug desconocido: {slug}")
            continue
        for lv, tids in levels.items():
            for tid in tids:
                desired.add((bid, lv, int(tid)))

    conn = db()
    with conn.cursor() as cur:
        cur.execute("SELECT band_id, level_code, topic_id FROM topic_band_level")
        current = {(r["band_id"], r["level_code"], r["topic_id"]) for r in cur.fetchall()}

    to_insert = desired - current
    to_delete = current - desired

    print(f"\nDiff:")
    print(f"  + insertar: {len(to_insert)}")
    print(f"  - eliminar: {len(to_delete)}")
    print(f"  = sin cambio: {len(current & desired)}")

    if not to_insert and not to_delete:
        print("\nNada que cambiar.")
        conn.close()
        return

    print(f"\nEjemplos a insertar: {list(to_insert)[:3]}")
    print(f"Ejemplos a eliminar: {list(to_delete)[:3]}")

    resp = input("\n¿Aplicar? (s/N): ").strip().lower()
    if resp != "s":
        print("Cancelado.")
        conn.close()
        return

    with conn.cursor() as cur:
        if to_insert:
            cur.executemany(
                "INSERT IGNORE INTO topic_band_level (band_id, level_code, topic_id) VALUES (%s,%s,%s)",
                list(to_insert)
            )
        if to_delete:
            for row in to_delete:
                cur.execute(
                    "DELETE FROM topic_band_level WHERE band_id=%s AND level_code=%s AND topic_id=%s",
                    row
                )
    conn.commit()
    conn.close()
    print(f"\nListo. {len(to_insert)} insertados, {len(to_delete)} eliminados.")


if __name__ == "__main__":
    main()

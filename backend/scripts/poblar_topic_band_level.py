"""
Pobla topic_band_level con reglas pedagogicas (sin LLM).

Logica:
- Topics kids: van en la/s banda/s de su segmento x todos los niveles de esa banda.
- Topics adultos: van en adulto (A0-C2) y tween (A1-B2).
  Topics abstractos/tech (cat: tech/ciencia/etica): excluyen A0 de adulto.

Reversion: python poblar_topic_band_level.py --revert
"""
from __future__ import annotations
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
import pymysql
from pymysql.cursors import DictCursor

# Topics adultos cuya abstraccion requiere al menos A1 (excluyen A0)
# Son los que necesitan debatir conceptos abstractos aunque sea brevemente
TEMAS_ABSTRACTOS = {
    4,   # IA generativa - etica
    9,   # Futbol - Mundiales (puede ser A0 igual, lo dejo)
    17,  # Espacio - astronomia y misiones
    18,  # Cambio climatico
    88,  # Apps que uso a diario
    89,  # Inteligencia artificial
    90,  # Privacidad online
    92,  # Aprender a programar
    93,  # IA y el futuro del trabajo
    94,  # Adiccion al celular
    96,  # Una curiosidad cientifica
}


def get_conn():
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", 3306)),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        db=os.environ["DB_NAME"],
        ssl={"ca": None},
        cursorclass=DictCursor,
        charset="utf8mb4",
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--revert", action="store_true")
    args = parser.parse_args()

    conn = get_conn()

    with conn.cursor() as cur:
        if args.revert:
            cur.execute("DELETE FROM topic_band_level")
            conn.commit()
            print("topic_band_level vaciada.")
            conn.close()
            return

        # Niveles permitidos por banda (de band_allowed_levels)
        cur.execute("SELECT band_id, level_code FROM band_allowed_levels ORDER BY band_id, level_code")
        band_levels: dict[int, list[str]] = {}
        for r in cur.fetchall():
            band_levels.setdefault(r["band_id"], []).append(r["level_code"])

        # Topicos activos
        cur.execute("SELECT id, title, audience, segmento FROM topics WHERE is_active=1 ORDER BY audience, id")
        topics = cur.fetchall()

    insertar = []

    for t in topics:
        tid = t["id"]
        seg = t["segmento"] or ""

        if t["audience"] == "kid":
            # Determinar bandas segun segmento
            if "mini" in seg:
                bands = [1]             # Mini 4-7
            elif "junior" in seg:
                bands = [1, 2]          # Mini + Junior (puede haber un Mini avanzado o Junior basico)
            elif "tween" in seg:
                bands = [2, 3]          # Junior + Tween
            else:
                bands = [1, 2, 3]

            for b in bands:
                for lv in band_levels.get(b, []):
                    insertar.append((tid, b, lv))

        else:  # adult
            # Banda 4 (Adulto): todos los niveles, salvo abstractos que excluyen A0
            for lv in band_levels.get(4, []):
                if lv == "A0" and tid in TEMAS_ABSTRACTOS:
                    continue
                insertar.append((tid, 4, lv))

            # Banda 3 (Tween 13+): A1-B2 (excluye A0 siempre para adultos)
            for lv in band_levels.get(3, []):
                insertar.append((tid, 3, lv))

    with conn.cursor() as cur:
        cur.execute("DELETE FROM topic_band_level")
        cur.executemany(
            "INSERT IGNORE INTO topic_band_level (topic_id, band_id, level_code) VALUES (%s,%s,%s)",
            insertar,
        )

        # Stats
        cur.execute("SELECT COUNT(*) as n FROM topic_band_level")
        total = cur.fetchone()["n"]

        cur.execute("""
            SELECT st.name, tbl.band_id, tbl.level_code, COUNT(*) as topics
            FROM topic_band_level tbl
            JOIN student_types st ON st.id = tbl.band_id
            GROUP BY tbl.band_id, st.name, tbl.level_code ORDER BY tbl.band_id, tbl.level_code
        """)
        breakdown = cur.fetchall()

    conn.commit()
    conn.close()

    print(f"Combos insertados: {total}")
    print()
    print(f"{'Banda':<20} {'Nivel':<8} {'Topicos':>8}")
    print("-" * 38)
    for r in breakdown:
        print(f"{r['name']:<20} {r['level_code']:<8} {r['topics']:>8}")
    print(f"{'TOTAL':<29} {total:>8}")
    print()
    print("Esas son las orquestaciones a generar en FASE 2.")


if __name__ == "__main__":
    main()

"""
Limpia topic_band_level y lo repuebla con la lógica correcta:
  segmento='mini'    → band 1 (Mini)   × niveles A0, A1
  segmento='junior'  → band 2 (Junior) × niveles A0, A1, A2, B1
  segmento='teen'   → band 3 (Tween)  × niveles A1, A2, B1, B2
  segmento='adultos' → band 4 (Adulto) × niveles A0-C2

Sin cruces entre bandas. Cada tópico va SOLO a su segmento natural.

Uso:  python rebuild_topic_band_level.py [--dry-run]
"""
import os, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
import pymysql
from pymysql.cursors import DictCursor

DRY_RUN = "--dry-run" in sys.argv

SEG_TO_BAND = {"mini": 1, "junior": 2, "teen": 3, "adultos": 4}

BAND_LEVELS = {
    1: ["A0", "A1"],
    2: ["A0", "A1", "A2", "B1"],
    3: ["A1", "A2", "B1", "B2"],
    4: ["A0", "A1", "A2", "B1", "B2", "C1", "C2"],
}


def db():
    return pymysql.connect(
        host=os.environ["DB_HOST"], port=int(os.environ.get("DB_PORT", 3306)),
        user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"],
        db=os.environ["DB_NAME"], ssl={"ca": None}, cursorclass=DictCursor, charset="utf8mb4"
    )


def main():
    conn = db()
    with conn.cursor() as cur:
        cur.execute("SELECT id, title, segmento FROM topics WHERE is_active=1")
        topics = cur.fetchall()

    rows = []
    skipped = []
    for t in topics:
        seg = (t["segmento"] or "").strip()
        bid = SEG_TO_BAND.get(seg)
        if not bid:
            skipped.append(f"  [SKIP] id={t['id']} segmento='{seg}' title={t['title'][:40]}")
            continue
        for lv in BAND_LEVELS[bid]:
            rows.append((bid, lv, t["id"]))

    print(f"Tópicos activos: {len(topics)}")
    print(f"Skipped (segmento desconocido): {len(skipped)}")
    for s in skipped:
        print(s)
    print(f"\nCombos a insertar: {len(rows)}")

    from collections import Counter
    per_band = Counter(r[0] for r in rows)
    SLUG = {1:"mini",2:"junior",3:"teen",4:"adult"}
    for bid, cnt in sorted(per_band.items()):
        print(f"  band {SLUG[bid]:8}: {cnt}")

    if DRY_RUN:
        print("\n[DRY RUN] No se tocó la BD.")
        return

    resp = input("\n¿Borrar topic_band_level actual y reinsertar? (s/N): ").strip().lower()
    if resp != "s":
        print("Cancelado.")
        conn.close()
        return

    with conn.cursor() as cur:
        cur.execute("DELETE FROM topic_band_level")
        deleted = cur.rowcount
        cur.executemany(
            "INSERT INTO topic_band_level (band_id, level_code, topic_id) VALUES (%s, %s, %s)",
            rows
        )
        inserted = cur.rowcount
    conn.commit()
    conn.close()
    print(f"\nListo: {deleted} eliminados, {inserted} insertados.")


if __name__ == "__main__":
    main()

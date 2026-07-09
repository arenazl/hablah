"""Paso 0 de la consolidacion al motor_v3: lleva los 29 topicos PERSONALES del
producto kids (tabla vieja `topics`, category='kids') al catalogo del motor nuevo
(`topic`), SIN tocar el motor viejo ni la orquestacion.

Estrategia (acordada con arenazl): NADA destructivo.
- `topics` (viejo) queda intacto = backup vivo.
- En `topic` (v3) se agregan los 29 con dos marcas:
    * legacy_topic_id -> puente viejo<->nuevo (topics.id de produccion)
    * origin='kids_personal' -> etiqueta de catalogo (para el A/B personal vs interes)
- Se linkea cada uno a su banda (mini->early_child, junior->child, tween->teen)
  via topic_suggested_band. La orquestacion por banda ya existe y NO se toca.

Idempotente: se puede correr varias veces. Hace backup JSON antes de escribir.

Uso: python scripts/migrate_kids_topics_to_v3.py
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine  # noqa: E402

# mini(4-7)->early_child, junior(7-10)->child, tween(10-14)->teen
BAND_BY_AGE = {"mini": "early_child", "junior": "child", "tween": "teen"}
KIDS_SUBCAT_NAME = "Vida del chico"
KIDS_CATEGORY_NAME = "Vida cotidiana"  # ya existe (category_id 10)


def _col_exists(db, table: str, col: str) -> bool:
    r = db.q1(
        "SELECT COUNT(*) c FROM information_schema.columns "
        "WHERE table_schema=DATABASE() AND table_name=%s AND column_name=%s",
        (table, col),
    )
    return bool(r and r["c"])


def _backup(db) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(os.path.dirname(__file__), f"_backup_kids_migration_{ts}.json")
    dump = {
        "topic": db.q("SELECT * FROM topic"),
        "topic_suggested_band": db.q("SELECT * FROM topic_suggested_band"),
        "subcategory": db.q("SELECT * FROM subcategory"),
        "category": db.q("SELECT * FROM category"),
        "prod_kids_topics": db.q(
            "SELECT id, title, kid_age_group, slug FROM topics WHERE category='kids' AND is_active=1"
        ),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(dump, f, ensure_ascii=False, default=str, indent=2)
    return path


def main() -> None:
    db = motor_engine._connect()
    try:
        path = _backup(db)
        print(f"[backup] {path}")

        # ── 1) columnas legacy_topic_id + origin (idempotente) ──
        with db.conn.cursor() as cur:
            if not _col_exists(db, "topic", "legacy_topic_id"):
                cur.execute("ALTER TABLE topic ADD COLUMN legacy_topic_id INT NULL, ADD INDEX ix_topic_legacy (legacy_topic_id)")
                print("[schema] topic.legacy_topic_id agregado")
            if not _col_exists(db, "topic", "origin"):
                cur.execute("ALTER TABLE topic ADD COLUMN origin VARCHAR(32) NULL")
                print("[schema] topic.origin agregado")
        db.conn.commit()

        # ── 2) subcategoria 'Vida del chico' bajo 'Vida cotidiana' ──
        cat = db.q1("SELECT category_id FROM category WHERE name=%s", (KIDS_CATEGORY_NAME,))
        if not cat:
            with db.conn.cursor() as cur:
                cur.execute("INSERT INTO category (name) VALUES (%s)", (KIDS_CATEGORY_NAME,))
            db.conn.commit()
            cat = db.q1("SELECT category_id FROM category WHERE name=%s", (KIDS_CATEGORY_NAME,))
        cat_id = cat["category_id"]

        sub = db.q1("SELECT subcategory_id FROM subcategory WHERE name=%s AND category_id=%s",
                    (KIDS_SUBCAT_NAME, cat_id))
        if not sub:
            with db.conn.cursor() as cur:
                cur.execute("INSERT INTO subcategory (category_id, name) VALUES (%s,%s)",
                            (cat_id, KIDS_SUBCAT_NAME))
            db.conn.commit()
            sub = db.q1("SELECT subcategory_id FROM subcategory WHERE name=%s AND category_id=%s",
                        (KIDS_SUBCAT_NAME, cat_id))
        sub_id = sub["subcategory_id"]
        print(f"[subcat] '{KIDS_SUBCAT_NAME}' -> subcategory_id={sub_id} (category '{KIDS_CATEGORY_NAME}'={cat_id})")

        # ── 3) bandas (code -> band_id) ──
        bands = {r["code"]: r["band_id"] for r in db.q("SELECT band_id, code FROM age_band")}

        # ── 4) insertar los 29 (idempotente por legacy_topic_id) + link de banda ──
        prod = db.q("SELECT id, title, kid_age_group FROM topics WHERE category='kids' AND is_active=1 ORDER BY id")
        ins, skip, linked = 0, 0, 0
        for p in prod:
            existing = db.q1("SELECT topic_id FROM topic WHERE legacy_topic_id=%s", (p["id"],))
            if existing:
                tid = existing["topic_id"]
                skip += 1
            else:
                objective = f"Conversar de forma natural sobre {p['title'].lower()} (revisar)."
                with db.conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO topic (subcategory_id, title, objective, legacy_topic_id, origin) "
                        "VALUES (%s,%s,%s,%s,'kids_personal')",
                        (sub_id, p["title"], objective, p["id"]),
                    )
                    tid = cur.lastrowid
                db.conn.commit()
                ins += 1

            band_code = BAND_BY_AGE.get(p["kid_age_group"])
            band_id = bands.get(band_code)
            if band_id:
                exists_link = db.q1(
                    "SELECT 1 ok FROM topic_suggested_band WHERE topic_id=%s AND band_id=%s",
                    (tid, band_id),
                )
                if not exists_link:
                    with db.conn.cursor() as cur:
                        cur.execute(
                            "INSERT INTO topic_suggested_band (topic_id, band_id, overridable) VALUES (%s,%s,1)",
                            (tid, band_id),
                        )
                    db.conn.commit()
                    linked += 1

        print(f"\n[resultado] insertados={ins} · ya estaban={skip} · links de banda nuevos={linked}")
        total = db.q1("SELECT COUNT(*) c FROM topic WHERE origin='kids_personal'")
        print(f"[verif] topicos kids_personal en motor_v3: {total['c']}")
        print("\nLISTO. El motor viejo y `topics` quedaron intactos. Objetivos quedaron templados (revisar).")
    finally:
        db.conn.close()


if __name__ == "__main__":
    main()

"""Migración v3 · capa 7b · objective_chunk — chunks comunicativos por OBJETIVO.

Los chunks son material de HABLA colgado de la FUNCIÓN (no del tópico): "In my
opinion…", "If I were you, I'd…". Reutilizables en cualquier tema del nivel.
Autorados por Claude (no IA externa). Crea la tabla si falta y seedea idempotente.

Corre:  cd backend && python scripts/migrate_v3_chunks.py
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

DDL = """
CREATE TABLE IF NOT EXISTS objective_chunk (
  chunk_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  objective_id INT UNSIGNED NOT NULL,
  chunk VARCHAR(160) NOT NULL,
  ord SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_oc_obj FOREIGN KEY (objective_id) REFERENCES language_objective(objective_id) ON DELETE CASCADE,
  INDEX ix_oc (objective_id, ord)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"""

# código de objetivo -> chunks comunicativos (frases gatillo / expresiones de la función)
CHUNKS: dict[str, list[str]] = {
    "A1-FUN-01": ["Hi, I'm…", "Nice to meet you", "What's your name?", "How are you?"],
    "A1-VOC-01": ["This is a…", "It's a…", "Look, a…!", "I have a…"],
    "A1-GRA-01": ["I am…", "She is…", "I have got…", "They are…"],
    "A1-FUN-02": ["It's red", "I have two…", "It's big", "How many are there?"],
    "A2-FUN-01": ["Every day I…", "In the morning I…", "I usually…", "After that, I…"],
    "A2-GRA-01": ["Right now I'm …ing", "I usually…, but today…", "Look, he's …ing", "These days I'm …ing"],
    "A2-FUN-02": ["I like…", "I'm really into…", "I'm not a fan of…", "My favourite is…"],
    "A2-DIS-01": ["…, and…", "…, but…", "…, because…", "So…"],
    "B1-FUN-01": ["Last week I…", "It was amazing", "Then I…", "I'll never forget when…"],
    "B1-GRA-01": ["I was …ing when…", "While I was…", "It happened when…", "I used to…"],
    "B1-FUN-02": ["What do you think?", "In my opinion…", "I think that…", "Do you agree?"],
    "B1-DIS-01": ["First… then…", "That's why…", "Although…", "In the end…"],
    "B2-FUN-01": ["The way I see it…", "What I mean is…", "I'd argue that…", "That's exactly why…"],
    "B2-GRA-01": ["If I were you, I'd…", "If I had…, I would…", "I wouldn't… unless…", "What would you do if…?"],
    "B2-VOC-01": ["They go hand in hand", "to make a decision", "a strong argument", "It's a common…"],
    "B2-DIS-01": ["However,…", "…, whereas…", "On the other hand,…", "Then again,…"],
    "B2-FUN-02": ["It might be because…", "That could lead to…", "It's likely that…", "Chances are…"],
    "C1-FUN-01": ["To a certain extent,…", "That said,…", "One could argue…", "It's not as simple as…"],
    "C1-GRA-01": ["Not only… but also…", "Never have I…", "Little did I know…", "It was then that…"],
    "C1-VOC-01": ["to be honest…", "at the end of the day…", "to get the hang of it", "it's a bit of a…"],
    "C1-DIS-01": ["In other words,…", "To put it another way,…", "That brings me to…", "All things considered,…"],
}


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
    cur.execute(DDL)
    print("Tabla objective_chunk lista.")

    inserted, skipped, missing = 0, 0, []
    for code, chunks in CHUNKS.items():
        cur.execute("SELECT objective_id FROM language_objective WHERE code=%s", (code,))
        row = cur.fetchone()
        if not row:
            missing.append(code)
            continue
        oid = row["objective_id"]
        cur.execute("SELECT COUNT(*) n FROM objective_chunk WHERE objective_id=%s", (oid,))
        if cur.fetchone()["n"] > 0:
            skipped += 1
            continue
        for i, ch in enumerate(chunks):
            cur.execute("INSERT INTO objective_chunk (objective_id, chunk, ord) VALUES (%s,%s,%s)",
                        (oid, ch[:160], i))
            inserted += 1
        print(f"  OK  {code:12} +{len(chunks)}")

    conn.commit()
    cur.close()
    conn.close()
    print(f"\nObjetivos con chunks: {len(CHUNKS) - len(missing) - skipped} nuevos · "
          f"ya tenían: {skipped} · filas insertadas: {inserted}")
    if missing:
        print(f"Códigos no encontrados: {missing}")


if __name__ == "__main__":
    main()

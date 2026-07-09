"""Catalogo de 10 palabras de vocabulario por topico — SOLO PARA UI.
Uso: animaciones de seleccion de topico (palabras flotando de fondo), presentaciones,
dinamismo visual. NO toca el motor ni las conversaciones (eso quedo cerrado: clase libre).

Genera 10 palabras CORTAS (1-2 terminos) en+es por topico, evocativas/visuales del tema.
Batched (8 topicos por llamada). Idempotente (saltea los ya hechos). Tabla topic_ui_vocab.

Uso: python scripts/gen_topic_ui_vocab.py [--sample]
"""
from __future__ import annotations
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from services import motor_engine, motor_protocol as mp  # noqa: E402

BATCH = 8


def _ensure_table(db):
    with db.conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS topic_ui_vocab (
            topic_id INT PRIMARY KEY, words LONGTEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
    db.conn.commit()


async def _gen(batch):
    listado = "\n".join(f'{t["id"]}\t{t["title"]} ({t["category"]})' for t in batch)
    prompt = (
        "Sos curador de contenido visual. Para CADA topico de la lista, dame 10 palabras de vocabulario "
        "CORTAS (1-2 palabras max) en INGLES, evocativas y concretas del tema, lindas para mostrar FLOTANDO "
        "en una pantalla de seleccion de topicos. Variá (objetos, lugares, acciones, conceptos del tema). "
        "Nada de frases largas ni oraciones. Cada palabra con su traduccion al espaniol.\n\n"
        f"TOPICOS (id, titulo, categoria):\n{listado}\n\n"
        'Devolve SOLO JSON: {"<id>":[{"en":"galaxy","es":"galaxia"}, ...10], ...}'
    )
    raw = await mp._claude_headless(prompt, timeout=120)
    return mp._parse_json(raw or "") or {}


async def main():
    sample = "--sample" in sys.argv
    db = motor_engine._connect()
    _ensure_table(db)
    done = {r["topic_id"] for r in db.q("SELECT topic_id FROM topic_ui_vocab")}
    rows = db.q("SELECT id, title, category FROM topics WHERE is_active=1 ORDER BY id")
    todo = [t for t in rows if t["id"] not in done]
    if sample:
        todo = todo[:BATCH]
    print(f"topics: {len(rows)} · ya hechos: {len(done)} · a generar: {len(todo)}{' (SAMPLE)' if sample else ''}")

    ins = 0
    for i in range(0, len(todo), BATCH):
        batch = todo[i:i + BATCH]
        try:
            res = await _gen(batch)
        except Exception as e:
            print(f"  batch {i//BATCH} ERROR: {type(e).__name__}: {e}"); continue
        for t in batch:
            words = res.get(str(t["id"])) or res.get(t["id"])
            if not words:
                print(f"  [skip] #{t['id']} {t['title']} (sin palabras)"); continue
            clean = [{"en": str(w.get("en", ""))[:40], "es": str(w.get("es", ""))[:40]}
                     for w in words if isinstance(w, dict) and w.get("en")][:10]
            with db.conn.cursor() as cur:
                cur.execute("INSERT INTO topic_ui_vocab (topic_id, words) VALUES (%s,%s) "
                            "ON DUPLICATE KEY UPDATE words=VALUES(words)",
                            (t["id"], json.dumps(clean, ensure_ascii=False)))
            db.conn.commit(); ins += 1
        print(f"  batch {i//BATCH+1}/{(len(todo)+BATCH-1)//BATCH}: +{len(batch)} (acum {ins})")

    print(f"\nLISTO. {ins} topicos con vocab UI en topic_ui_vocab")
    ej = db.q1("SELECT topic_id, words FROM topic_ui_vocab ORDER BY topic_id LIMIT 1")
    if ej:
        print("ejemplo:", ej["topic_id"], json.loads(ej["words"])[:4])
    db.conn.close()


if __name__ == "__main__":
    asyncio.run(main())

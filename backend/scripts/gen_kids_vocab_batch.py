"""Batch: genera vocab CONCRETO y mostrable para los 273 tópicos de kids (con IA, Claude),
en grupos (≈35 llamadas, no 273). Persiste en:
 - kids_visual_vocab : biblioteca compartida palabra→asset (se agranda con palabras nuevas)
 - topic_kids_vocab  : qué palabras usa cada tópico (link). NO toca el léxico general (adultos).

Después correr download_noto_lotties.py para bajar el asset de las palabras nuevas.
Uso: python scripts/gen_kids_vocab_batch.py
"""
from __future__ import annotations
import asyncio
import json
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, ".")
from core.config import settings  # noqa: E402
from services import motor_protocol  # noqa: E402

CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
CHUNK = 8


def _conn():
    return pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                           password=settings.DB_PASSWORD, database=settings.DB_NAME, ssl=CTX,
                           cursorclass=DictCursor, charset="utf8mb4", autocommit=True)


def _setup(cur):
    cur.execute("""CREATE TABLE IF NOT EXISTS topic_kids_vocab (
        topic_id INT NOT NULL, word_en VARCHAR(40) NOT NULL,
        PRIMARY KEY (topic_id, word_en)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")


def _kids_topics(cur):
    # resume: saltea los tópicos que ya tienen vocab generado
    cur.execute("""SELECT DISTINCT t.topic_id, t.title, IFNULL(t.objective,'') objective
        FROM topic t JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
        JOIN age_band ab ON ab.band_id=tsb.band_id
        WHERE ab.code IN ('early_child','child')
          AND t.topic_id NOT IN (SELECT topic_id FROM topic_kids_vocab)
        ORDER BY t.topic_id""")
    return cur.fetchall()


def _prompt(group: list[dict]) -> str:
    lines = "\n".join(f"{i+1}) [id={t['topic_id']}] {t['title']} — {t['objective'] or t['title']}"
                      for i, t in enumerate(group))
    return (
        "Sos profe de inglés para nenes de 3 a 7 años (nivel A1). Para CADA tópico generá "
        "6 a 10 palabras de vocabulario. Reglas DURAS:\n"
        "- SUSTANTIVOS concretos y MOSTRABLES (algo dibujable/animable en pantalla).\n"
        "- Divertidos y apropiados para un nene; nada abstracto.\n"
        "- Incluí el emoji más representativo de cada palabra; si no hay uno claro, emoji \"\".\n\n"
        f"TÓPICOS:\n{lines}\n\n"
        "Devolvé SOLO JSON: {\"results\":[{\"topic_id\":4,\"vocab\":[{\"en\":\"fish\",\"es\":\"pez\",\"emoji\":\"🐟\"}]}]}"
    )


async def main() -> None:
    conn = _conn(); cur = conn.cursor()
    _setup(cur); conn.commit()
    topics = _kids_topics(cur)
    groups = [topics[i:i + CHUNK] for i in range(0, len(topics), CHUNK)]
    print(f"{len(topics)} tópicos kids · {len(groups)} grupos de {CHUNK}")

    done, words_linked, new_words, skipped = 0, 0, 0, []
    for gi, group in enumerate(groups):
        try:
            raw = await motor_protocol._run_llm(_prompt(group), "claude")
            data = motor_protocol._parse_json(raw or "") or {}
        except Exception as e:
            print(f"  grupo {gi+1}/{len(groups)}: ERR {type(e).__name__}"); continue
        conn.ping(reconnect=True)  # Aiven corta conexiones idle durante las llamadas largas al LLM
        cur.execute("SET SESSION innodb_lock_wait_timeout=5")  # fallar rápido si una fila está trabada
        for res in data.get("results", []):
            tid = res.get("topic_id")
            if not isinstance(tid, int):
                continue
            try:
                for v in res.get("vocab", []):
                    en = (v.get("en") or "").lower().strip()
                    if not en or len(en) > 40:
                        continue
                    es = (v.get("es") or "")[:40]; emoji = (v.get("emoji") or "")[:16]
                    cur.execute("SELECT 1 FROM kids_visual_vocab WHERE word_en=%s", (en,))
                    if not cur.fetchone():
                        cur.execute("INSERT IGNORE INTO kids_visual_vocab (word_en, word_es, category, emoji, asset_file) "
                                    "VALUES (%s,%s,'varios',%s,NULL)", (en, es, emoji))
                        new_words += 1
                    cur.execute("INSERT IGNORE INTO topic_kids_vocab (topic_id, word_en) VALUES (%s,%s)", (tid, en))
                    words_linked += 1
                done += 1
            except pymysql.err.OperationalError:
                skipped.append(tid)  # fila trabada por el zombie; se recupera en otra corrida
        print(f"  grupo {gi+1}/{len(groups)} ok · tópicos {done} · links {words_linked} · nuevas {new_words} · trabados {len(skipped)}")

    print(f"\nLISTO: {done} tópicos con vocab · {words_linked} links · {new_words} palabras nuevas en la biblioteca")
    if skipped:
        print("tópicos salteados por lock (reintentar después):", skipped)
    print("Ahora correr: python scripts/download_noto_lotties.py  (baja asset de las nuevas)")
    cur.close(); conn.close()


if __name__ == "__main__":
    asyncio.run(main())

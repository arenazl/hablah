"""Genera vocab CONCRETO y mostrable por tópico (capa 7), con IA (Claude), y lo cruza
contra la biblioteca visual kids_visual_vocab para ver cobertura (qué ya tiene imagen,
qué falta). Sample para calibrar estilo/cantidad antes del batch de los 273.

Uso: python scripts/gen_topic_vocab.py [topic_id]
"""
from __future__ import annotations
import asyncio
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, ".")
from core.config import settings  # noqa: E402
from services import motor_protocol  # noqa: E402

CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE


def _conn():
    return pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                           password=settings.DB_PASSWORD, database=settings.DB_NAME, ssl=CTX,
                           cursorclass=DictCursor, charset="utf8mb4")


async def main(topic_id: int) -> None:
    conn = _conn(); cur = conn.cursor()
    cur.execute("SELECT title, objective FROM topic WHERE topic_id=%s", (topic_id,))
    t = cur.fetchone()
    if not t:
        print(f"tópico {topic_id} no existe"); return
    cur.execute("SELECT LOWER(word_en) w FROM kids_visual_vocab WHERE active=1")
    have = {r["w"] for r in cur.fetchall()}

    prompt = (
        "Sos profe de inglés para nenes de 3 a 7 años (nivel A1). "
        f"Tópico de la clase: '{t['title']}' (objetivo: {t['objective'] or t['title']}).\n"
        "Generá entre 6 y 10 palabras de vocabulario para esta clase. Reglas DURAS:\n"
        "- SUSTANTIVOS concretos y MOSTRABLES (algo que se pueda dibujar/animar en pantalla).\n"
        "- Apropiados y divertidos para un nene chico.\n"
        "- Nada abstracto (no 'ecosystem', 'habitat', 'depth').\n"
        "Devolvé SOLO JSON: {\"vocab\":[{\"en\":\"fish\",\"es\":\"pez\"}]}"
    )
    raw = await motor_protocol._run_llm(prompt, "claude")
    parsed = motor_protocol._parse_json(raw or "") or {}
    vocab = [v for v in parsed.get("vocab", []) if isinstance(v, dict) and v.get("en")]

    print(f"\nTÓPICO #{topic_id}: {t['title']}")
    print(f"objetivo: {t['objective']}\n")
    cov = 0
    for v in vocab:
        en = v["en"].lower().strip()
        ok = en in have
        cov += ok
        print(f"  {'[ya]' if ok else '[+] '} {v['en']:<14} {v.get('es',''):<14} {'tiene imagen' if ok else 'FALTA (se baja de Noto)'}")
    n = len(vocab)
    print(f"\ncobertura: {cov}/{n} ya en la biblioteca · {n - cov} para agregar")
    conn.close()


if __name__ == "__main__":
    tid = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    asyncio.run(main(tid))

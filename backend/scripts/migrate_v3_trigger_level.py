"""Migración v3 · trigger por NIVEL (capa 9).

El arranque/cierre no se le dice igual a un A1 (con español, simple) que a un C1
(inmersivo). Agrega level_code a trigger_template (NULL = genérico de la banda) y
seedea variantes de 'opening' por nivel. El render elige el específico y, si no hay,
cae al genérico. Idempotente.
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

# band_group, kind, level_code, body  — variantes por nivel (los genéricos NULL ya existen)
SEED = [
    ("kid", "opening", "A1", "Saludá MUY simple como {tutor}, casi todo en español; presentá el mundo '{topic}' y pedí repetir UNA palabra: '{vocab0}'. Festejá."),
    ("kid", "opening", "A2", "Saludá con energía como {tutor}, presentá '{topic}' con frases cortas (algo de español) y pedí repetir '{vocab0}'."),
    ("teen", "opening", "A1", "Saludá relajado como {tutor}, con bastante español de apoyo; presentá '{topic}' y abrí con una pregunta sí/no muy simple."),
    ("teen", "opening", "B2", "Saludá como {tutor} EN INGLÉS; presentá '{topic}' y abrí con una pregunta de opinión, ritmo natural."),
    ("adult", "opening", "A1", "Bienvenida cálida a {name} con bastante español de apoyo; presentá el escenario '{topic}' y una primera consigna fácil."),
    ("adult", "opening", "A2", "Bienvenida a {name}; presentá '{topic}' con frases simples y alguna ayuda en español; primera consigna corta."),
    ("adult", "opening", "B2", "Bienvenida a {name} en inglés (sin español); presentá el escenario '{topic}' y la primera consigna, ritmo natural."),
    ("adult", "opening", "C1", "Bienvenida a {name} en inglés con registro natural e idiomático; presentá '{topic}' y lanzá una consigna que invite a matizar."),
]


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

    # 1) columna level_code (si falta)
    cur.execute("""SELECT COUNT(*) n FROM information_schema.columns
                   WHERE table_schema=DATABASE() AND table_name='trigger_template' AND column_name='level_code'""")
    if cur.fetchone()["n"] == 0:
        cur.execute("ALTER TABLE trigger_template ADD COLUMN level_code CHAR(2) NULL AFTER body")
        print("columna level_code agregada")
    else:
        print("columna level_code ya existía")

    # 2) unique (band_group, kind, level_code) — reemplaza el viejo (band_group, kind)
    try:
        cur.execute("ALTER TABLE trigger_template DROP INDEX uq_trg")
    except Exception:
        pass
    try:
        cur.execute("ALTER TABLE trigger_template ADD UNIQUE KEY uq_trg (band_group, kind, level_code)")
        print("unique (band_group, kind, level_code) listo")
    except Exception as e:
        print(f"unique ya estaba o no se pudo: {type(e).__name__}")

    # 3) seed de variantes por nivel (idempotente por el unique)
    ins = 0
    for bg, kind, lvl, body in SEED:
        cur.execute("SELECT template_id FROM trigger_template WHERE band_group=%s AND kind=%s AND level_code=%s", (bg, kind, lvl))
        if cur.fetchone():
            continue
        cur.execute("INSERT INTO trigger_template (band_group, kind, body, level_code) VALUES (%s,%s,%s,%s)", (bg, kind, body, lvl))
        ins += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"triggers por nivel insertados: {ins} (de {len(SEED)})")


if __name__ == "__main__":
    main()

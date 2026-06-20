"""Tabla de PROPUESTAS del especialista sobre el catálogo (no pisa lo vivo).

El especialista audita el currículum por nivel y deja propuestas con estado
'proposed'. El profe las revisa y adopta (status 'adopted') o rechaza. Recién al
adoptar se toca el catálogo real. Persistencia sin destruir nada.
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

DDL = """CREATE TABLE IF NOT EXISTS catalog_proposal (
    proposal_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    level_code CHAR(2) NULL,
    scope ENUM('objective','level_var','level_policy','other') NOT NULL,
    area VARCHAR(40) NOT NULL,
    action ENUM('add','change','remove','keep') NOT NULL DEFAULT 'change',
    current_value VARCHAR(500) NULL,
    proposed_value VARCHAR(500) NOT NULL,
    rationale VARCHAR(600) NULL,
    status ENUM('proposed','adopted','rejected') NOT NULL DEFAULT 'proposed',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX ix_cp (level_code, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"""


def main() -> None:
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    conn = pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                           password=settings.DB_PASSWORD, database=settings.DB_NAME,
                           ssl=ctx, cursorclass=DictCursor, charset="utf8mb4")
    cur = conn.cursor()
    cur.execute(DDL)
    conn.commit()
    cur.execute("SELECT COUNT(*) n FROM catalog_proposal")
    print("catalog_proposal lista:", cur.fetchone()["n"], "propuestas")
    cur.close(); conn.close()


if __name__ == "__main__":
    main()

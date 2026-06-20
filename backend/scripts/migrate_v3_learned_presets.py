"""Lista de presets DINÁMICA (no catálogo fijo, no texto libre) + estado del alumno.

Doctrina (charlada con el usuario, profe 20 años):
- El learned_state NO es prosa ("learning_narratives") ni texto libre: es ESTADO.
- Tampoco un catálogo CONGELADO: es una **lista de presets DINÁMICA**.
- El texto libre (transcript, nota del profe) existe SOLO como ENTRADA a un
  PROTOCOLO nuestro (la IA = Claude) que lo canonicaliza → SALE un preset.
- El protocolo dedupe: mismo error/chunk → mismo preset (por eso converge).
- Lo que la IA propone nuevo entra como status='candidate' hasta que el profe
  lo bendice (status='active'). Nunca se guarda texto libre como estado.

Cubre dos ejes que hoy NO cierran (eran learner_item texto libre):
  - errores (qué falla)         -> preset kind='error'
  - léxico/chunks (qué maneja)  -> preset kind='chunk'
(El tercer eje, objetivos del currículum, ya cierra con language_objective.)

No destructivo: CREATE IF NOT EXISTS. SIN seed (la lista la llena el protocolo).
"""
from __future__ import annotations
import os
import ssl
import sys

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

DDL = [
    """CREATE TABLE IF NOT EXISTS learned_preset (
        preset_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        kind ENUM('error','chunk') NOT NULL,
        canonical_key VARCHAR(60) NOT NULL,       -- clave que produce el protocolo (dedupe)
        label VARCHAR(180) NOT NULL,              -- humano, lo que ve el profe
        category VARCHAR(40) NULL,                -- gramática/vocab/preposición/... (lo pone el protocolo)
        level_hint CHAR(2) NULL,
        example_wrong VARCHAR(160) NULL,
        example_right VARCHAR(160) NULL,
        source ENUM('protocol','profe') NOT NULL DEFAULT 'protocol',
        status ENUM('candidate','active','archived') NOT NULL DEFAULT 'candidate',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_preset (kind, canonical_key),
        INDEX ix_preset (kind, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
    """CREATE TABLE IF NOT EXISTS learner_preset (
        student_id INT UNSIGNED NOT NULL, preset_id INT UNSIGNED NOT NULL,
        state ENUM('active','improving','resolved') NOT NULL DEFAULT 'active',
        occurrences SMALLINT UNSIGNED NOT NULL DEFAULT 1,
        last_seen DATETIME NULL, due_at DATETIME NULL,
        PRIMARY KEY (student_id, preset_id),
        CONSTRAINT fk_lp_stu FOREIGN KEY (student_id)
            REFERENCES student(student_id) ON DELETE CASCADE,
        CONSTRAINT fk_lp_pre FOREIGN KEY (preset_id)
            REFERENCES learned_preset(preset_id) ON DELETE CASCADE,
        INDEX ix_lp (student_id, state)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
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
    for ddl in DDL:
        cur.execute(ddl)
    conn.commit()
    cur.execute("SELECT COUNT(*) n FROM learned_preset")
    print(f"learned_preset creada (presets dinamicos): {cur.fetchone()['n']} filas (la llena el protocolo).")
    cur.execute("SELECT COUNT(*) n FROM learner_preset")
    print(f"learner_preset creada (estado del alumno): {cur.fetchone()['n']} filas.")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()

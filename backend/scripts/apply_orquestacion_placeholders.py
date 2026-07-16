"""F4 — Crea las tablas de la orquestación-como-dato y siembra la semilla (placeholders).

QA = prod (sin clientes): aplica directo, sin dry-run. Idempotente (CREATE TABLE IF NOT EXISTS,
UPSERT). Fuente: data/catalogo/orquestacion_placeholders.json.

Crea: orchestration_templates, age_level_matrix, conversation_rules.
Altera: student_types (+ estilo_de_sesion, + anclas_narrativas).
Siembra: template activo · 18 filas de cruce (arquetipos expandidos) · 12 reglas gateadas ·
         re-cura de student_types (dimension_edad) · re-cura de levels (dimension_nivel_recura).
"""
import sys, os, json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from services.motor_engine import _connect

JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "catalogo", "orquestacion_placeholders.json")

DDL = [
    """CREATE TABLE IF NOT EXISTS orchestration_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL UNIQUE,
        body TEXT NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 0,
        notes VARCHAR(300) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
    """CREATE TABLE IF NOT EXISTS age_level_matrix (
        age_slug VARCHAR(20) NOT NULL,
        level_code VARCHAR(4) NOT NULL,
        produccion_esperada TEXT NULL,
        formato_de_cierre_de_turno TEXT NULL,
        reglas_de_tono_y_entrega TEXT NULL,
        pasos_de_la_sesion TEXT NULL,
        comando_de_arranque TEXT NULL,
        accion_de_continuacion TEXT NULL,
        accion_de_cierre TEXT NULL,
        arquetipo VARCHAR(40) NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (age_slug, level_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
    """CREATE TABLE IF NOT EXISTS conversation_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(60) NOT NULL UNIQUE,
        rule_text TEXT NOT NULL,
        age_groups JSON NULL,
        min_level VARCHAR(4) NULL,
        max_level VARCHAR(4) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        active TINYINT(1) NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""",
]

MATRIX_COLS = ["produccion_esperada", "formato_de_cierre_de_turno", "reglas_de_tono_y_entrega",
               "pasos_de_la_sesion", "comando_de_arranque", "accion_de_continuacion", "accion_de_cierre"]


def _col_exists(cur, table, col):
    cur.execute("""SELECT COUNT(*) c FROM information_schema.columns
                   WHERE table_schema=DATABASE() AND table_name=%s AND column_name=%s""", (table, col))
    return cur.fetchone()["c"] > 0


def main():
    data = json.load(open(JSON_PATH, encoding="utf-8"))
    db = _connect()
    db.conn.ping(reconnect=True)
    cur = db.conn.cursor()

    # 1. DDL
    for ddl in DDL:
        cur.execute(ddl)
    for col in ("estilo_de_sesion", "anclas_narrativas"):
        if not _col_exists(cur, "student_types", col):
            cur.execute(f"ALTER TABLE student_types ADD COLUMN {col} TEXT NULL")
    print("[DDL] tablas + columnas OK")

    # 2. Template activo (uno solo)
    tpl = data["orchestration_template"]
    cur.execute("UPDATE orchestration_templates SET active=0")
    cur.execute("""INSERT INTO orchestration_templates (name, body, active) VALUES (%s,%s,1)
                   ON DUPLICATE KEY UPDATE body=VALUES(body), active=1""", (tpl["name"], tpl["body"]))
    print(f"[template] '{tpl['name']}' activo")

    # 3. age_level_matrix — expandir arquetipos a filas por (age_slug, level_code)
    n = 0
    for arq in data["arquetipos_cruce"]:
        for lv in arq["niveles"]:
            vals = [arq.get(c) for c in MATRIX_COLS]
            cur.execute(f"""INSERT INTO age_level_matrix
                (age_slug, level_code, {', '.join(MATRIX_COLS)}, arquetipo)
                VALUES (%s,%s,{','.join(['%s']*len(MATRIX_COLS))},%s)
                ON DUPLICATE KEY UPDATE {', '.join(f'{c}=VALUES({c})' for c in MATRIX_COLS)},
                    arquetipo=VALUES(arquetipo)""",
                [arq["age_slug"], lv, *vals, arq["arquetipo"]])
            n += 1
    print(f"[age_level_matrix] {n} cruces materializados")

    # 4. conversation_rules
    cur.execute("DELETE FROM conversation_rules")
    for r in data["conversation_rules"]:
        cur.execute("""INSERT INTO conversation_rules
            (slug, rule_text, age_groups, min_level, max_level, sort_order, active)
            VALUES (%s,%s,%s,%s,%s,%s,1)""",
            (r["slug"], r["rule_text"],
             json.dumps(r["age_groups"]) if r.get("age_groups") else None,
             r.get("min_level"), r.get("max_level"), r.get("sort_order", 0)))
    print(f"[conversation_rules] {len(data['conversation_rules'])} reglas gateadas")

    # 5. student_types — re-cura dimension_edad
    for slug, d in data["dimension_edad"].items():
        cur.execute("""UPDATE student_types SET tutor_mascot=%s, tutor_identity=%s,
                       session_focus=%s, estilo_de_sesion=%s, anclas_narrativas=%s WHERE slug=%s""",
                    (d["tutor_name"], d["tutor_identity"], d["gamification_focus"],
                     d["estilo_de_sesion"], d["anclas_narrativas"], slug))
    print(f"[student_types] re-cura de {len(data['dimension_edad'])} edades")

    # 6. levels — re-cura dimension_nivel_recura
    nlv = 0
    for code, d in data["dimension_nivel_recura"].items():
        if code.startswith("_"):
            continue
        cur.execute("UPDATE levels SET language_rule=%s, curriculum_grammar=%s WHERE code=%s",
                    (d["idioma_instruccion"], d["gramatica_objetivo"], code))
        nlv += 1
    print(f"[levels] re-cura de {nlv} niveles")

    db.conn.commit()
    db.conn.close()
    print("\n[OK] semilla de orquestación aplicada.")


if __name__ == "__main__":
    main()

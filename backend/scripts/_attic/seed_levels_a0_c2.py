"""Idea 1: tapar los huecos de nivel del motor_v3 (solo tenia A1-C1).
Agrega A0 (principiante absoluto / arranque) y C2 (dominio) como DATO, additivo y
reversible: fila `level` + `level_policy` (hint/error) + unos `language_objective`.
NO toca A1-C1 ni la estructura. Idempotente (chequea por code). Backup previo.

Uso: python scripts/seed_levels_a0_c2.py
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine  # noqa: E402

LEVELS = [
    # level_code, label, sort_order, modifier, spanish_mirror, vocab_depth, pacing_bonus_min
    ("A0", "Nivel A0", 0,
     "Espejo en espaniol SIEMPRE; una sola palabra o frase-puente por turno; celebrar cada intento, cero presion",
     "always", "minimal", 5),
    ("C2", "Nivel C2", 6,
     "Dominio cuasi-nativo: idiomatico y matizado, registro fino, argumentacion precisa; cero andamiaje en "
     "espaniol; empujar sutileza, colocaciones y reformulacion",
     "never", "full", 2),
]

POLICIES = [
    ("A0", "hint_policy", "Escalera A0: espera 3-5s, modela la palabra/frase, traduci enseguida si no sale. Cero presion."),
    ("A0", "error_policy", "No corregir: modelar la forma correcta con calidez (recast implicito) y celebrar el intento."),
    ("C2", "hint_policy", "Ante traba: reformulacion idiomatica o sinonimo de registro alto, nunca traducir."),
    ("C2", "error_policy", "Recast solo en matices finos (colocaciones, registro, naturalidad); foco en precision."),
]

OBJECTIVES = [
    # cefr_level, code, kind, description, sort_order
    ("A0", "A0-FUN-01", "function", "Saludar y despedirse", 0),
    ("A0", "A0-FUN-02", "function", "Decir su nombre y su edad", 1),
    ("A0", "A0-FUN-03", "function", "Nombrar objetos cotidianos con una palabra", 2),
    ("A0", "A0-FUN-04", "function", "Responder si / no / gracias en contexto", 3),
    ("C2", "C2-FUN-01", "function", "Matizar opiniones y concesiones con precision", 0),
    ("C2", "C2-DIS-01", "discourse", "Argumentar y estructurar discurso extenso con cohesion", 1),
    ("C2", "C2-VOC-01", "vocabulary", "Usar colocaciones e idiomatico avanzado con naturalidad", 2),
    ("C2", "C2-GRA-01", "grammar", "Manejar estructuras enfaticas y de inversion para registro alto", 3),
]


def main() -> None:
    db = motor_engine._connect()
    # backup
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(os.path.dirname(__file__), f"_backup_levels_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"level": db.q("SELECT * FROM `level`"),
                   "level_policy": db.q("SELECT * FROM level_policy"),
                   "language_objective": db.q("SELECT * FROM language_objective WHERE cefr_level IN ('A0','C2')")},
                  f, ensure_ascii=False, default=str, indent=2)
    print(f"[backup] {path}")

    nl = np = no = 0
    for code, label, so, mod, sm, vd, pb in LEVELS:
        if db.q1("SELECT 1 FROM `level` WHERE level_code=%s", (code,)):
            print(f"  [level] {code} ya existe"); continue
        with db.conn.cursor() as cur:
            cur.execute("""INSERT INTO `level` (level_code,label,sort_order,modifier,spanish_mirror,vocab_depth,pacing_bonus_min)
                           VALUES (%s,%s,%s,%s,%s,%s,%s)""", (code, label, so, mod, sm, vd, pb))
        db.conn.commit(); nl += 1; print(f"  [level] + {code}")

    for code, kind, body in POLICIES:
        if db.q1("SELECT 1 FROM level_policy WHERE level_code=%s AND kind=%s", (code, kind)):
            continue
        with db.conn.cursor() as cur:
            cur.execute("INSERT INTO level_policy (level_code,kind,body) VALUES (%s,%s,%s)", (code, kind, body))
        db.conn.commit(); np += 1
    print(f"  [level_policy] +{np}")

    for cefr, code, kind, desc, so in OBJECTIVES:
        if db.q1("SELECT 1 FROM language_objective WHERE code=%s", (code,)):
            continue
        with db.conn.cursor() as cur:
            cur.execute("INSERT INTO language_objective (cefr_level,code,kind,description,sort_order) VALUES (%s,%s,%s,%s,%s)",
                        (cefr, code, kind, desc, so))
        db.conn.commit(); no += 1
    print(f"  [language_objective] +{no}")

    print(f"\nLISTO. niveles+{nl} politicas+{np} objetivos+{no}")
    print("niveles ahora:", [r["level_code"] for r in db.q("SELECT level_code FROM `level` ORDER BY sort_order")])
    db.conn.close()


if __name__ == "__main__":
    main()

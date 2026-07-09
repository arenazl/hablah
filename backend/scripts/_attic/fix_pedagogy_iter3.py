"""Iteración 3 (según diagnóstico iter2). El recast universal mejoró pero sigue inconsistente:
'nunca señales el error' compite con el recast. Cura:

UNIVERSAL (capa 6): separar definitivamente -> ord5 = solo escucha activa; ord6 NUEVO =
  mandato de recast imposible de malinterpretar ("'Natural' = sin reto, NO = sin corrección").
NIVEL (level_policy.error): peldaños de recast — A1 1 suave / A2-B1 obligatorio cada turno /
  B2-C1 obligatorio + matiz. A0 sin tocar (no corregir).
BANDA: early_child cero drilling + uptake + 1 pregunta/turno; teen+adult si el alumno habla
  todo en español, devolver la versión en inglés.

Solo datos motor_v3. Reversible (backup). Límites: universal/guard<=400, level_policy<=300.
Uso: python scripts/fix_pedagogy_iter3.py
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
from services import motor_engine  # noqa: E402

UPDATES = [
    ("universal_policy", "body", "kind='universal_guard' AND ord=5", (),
     "Escucha activa: reaccioná PRIMERO a lo que el alumno aporta (aunque sea en su idioma), con interés genuino, ANTES de seguir tu plan."),
    ("level_policy", "body", "level_code='A1' AND kind='error_policy'", (),
     "1 recast SUAVE por turno, solo del error más visible: modelá la forma correcta con calidez, sin nombrar el error. "
     "Filtro afectivo manda: nunca más de una corrección por turno."),
    ("level_policy", "body", "level_code='A2' AND kind='error_policy'", (),
     "Recast OBLIGATORIO del error principal de CADA turno: devolvé la forma correcta destacada (mini-eco corto) y "
     "DESPUÉS elogiá; no fundas corrección y elogio. Tono cálido, sin señalar el error."),
    ("level_policy", "body", "level_code='B1' AND kind='error_policy'", (),
     "Recast OBLIGATORIO del error principal de CADA turno: reformulá claramente la forma (pasado, 3a persona, "
     "adjetivos). NUNCA valides un error sin reformularlo. Mantené la calidez."),
    ("level_policy", "body", "level_code='B2' AND kind='error_policy' AND body LIKE %s", ("%scalada%",),
     "Recast del error principal de cada turno + un peldaño de matiz/precisión (colocación, registro, estructura fina: "
     "condicional/subjuntivo). NUNCA dejes pasar un error sin reformular."),
    ("level_policy", "body", "level_code='C1' AND kind='error_policy'", (),
     "Recast del error + foco en matiz/precisión fina (colocación, registro, naturalidad), incrustado en la respuesta "
     "sin frenar la fluidez. Demostrá que corregís lo sutil; no solo elogiar."),
]

# INSERTS: (tabla, dict-cols, where-existencia, params-existencia)
INSERTS = [
    ("universal_policy", {"kind": "universal_guard", "ord": 6,
                          "body": "Recast SIEMPRE que el alumno produzca un error de forma: repetí su idea con la forma correcta, en "
                                  "positivo, sin nombrar el error ni frenar el flujo. NUNCA dejes pasar un error sin reformular. "
                                  "'Natural' = sin reto, NO = sin corrección. Cuánto se nota lo gradúa el NIVEL."},
     "kind='universal_guard' AND ord=6", ()),
    ("behavioral_guard", {"band_id": 1, "ord": 5,
                          "body": "Cero drilling de sonidos/onomatopeyas y cero 'repeat after me / say it together'. Recogé lo que el "
                                  "nene DIJO y reformulalo (uptake), no vuelvas al chunk scripteado. Una pregunta por turno, no encadenes preguntas."},
     "band_id=1 AND ord=5", ()),
    ("behavioral_guard", {"band_id": 3, "ord": 5,
                          "body": "Si el alumno responde un turno entero en español, validá la idea y devolvé la versión en inglés para "
                                  "que la repita o reconozca; no sigas la charla en español."},
     "band_id=3 AND ord=5", ()),
    ("behavioral_guard", {"band_id": 4, "ord": 4,
                          "body": "Si el alumno responde un turno entero en español, validá la idea y devolvé la versión en inglés para "
                                  "que la repita o reconozca; no sigas la charla en español."},
     "band_id=4 AND ord=4", ()),
]


def main():
    db = motor_engine._connect()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = {"updates": [], "inserts": []}
    for table, col, where, params, _new in UPDATES:
        backup["updates"].append({"table": table, "where": where,
                                  "old": [r[col] for r in db.q(f"SELECT {col} FROM {table} WHERE {where}", params)]})
    path = os.path.join(os.path.dirname(__file__), f"_backup_pedagogy_iter3_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"[backup] {path}\n")

    for table, col, where, params, new in UPDATES:
        old = db.q1(f"SELECT {col} FROM {table} WHERE {where}", params)
        with db.conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET {col}=%s WHERE {where}", (new, *params))
        db.conn.commit()
        print(f"== {table} [{where}] ==\n  ANTES: {(old[col] if old else '(no existe)')[:90]}\n  AHORA: {new[:90]}\n")

    for table, cols, where, params in INSERTS:
        if db.q1(f"SELECT 1 ok FROM {table} WHERE {where}", params):
            with db.conn.cursor() as cur:
                cur.execute(f"UPDATE {table} SET body=%s WHERE {where}", (cols["body"], *params))
            print(f"== {table} [{where}] (update existente) ==\n  {cols['body'][:90]}\n")
        else:
            keys = ", ".join(cols.keys())
            ph = ", ".join(["%s"] * len(cols))
            with db.conn.cursor() as cur:
                cur.execute(f"INSERT INTO {table} ({keys}) VALUES ({ph})", tuple(cols.values()))
            backup["inserts"].append({"table": table, "where": where})
            print(f"== {table} [{where}] (INSERT) ==\n  {cols['body'][:90]}\n")
        db.conn.commit()

    with open(path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print("LISTO iter3 (recast inequívoco universal + peldaños por nivel + 3 guards de banda). Reversible.")
    db.conn.close()


if __name__ == "__main__":
    main()

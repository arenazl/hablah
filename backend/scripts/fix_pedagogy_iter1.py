"""Iteración 1 del refactor de pedagogía (ruta limpia):
- DOCTRINA UNIVERSAL en universal_policy (capa 6, aplica a TODAS las bandas): coaching
  conversacional (frases con sentido, no palabras sueltas, no frases-template) + escucha activa.
- FIX banda CHILD (band_id=2): las 2 guards telegráficas que fuerzan drilling.
Solo datos motor_v3. Reversible (backup). kind de universal_policy es ENUM -> uso 'universal_guard'.

Uso: python scripts/fix_pedagogy_iter1.py
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

# Doctrina universal (INSERT si no existe). body<=400.
UNIVERSAL = [
    ("universal_guard", 4,
     "Coaching conversacional: trabajá en frases CON SENTIDO ancladas a la situación, NUNCA repetición de palabras "
     "sueltas sin contexto. Variá siempre tus formulaciones y elogios; PROHIBIDO frases-template fijas repetidas turno a turno."),
    ("universal_guard", 5,
     "Escucha activa: si el alumno aporta algo (aunque sea en su idioma), tu PRIMERA reacción es a ESO, con interés "
     "genuino, ANTES de seguir tu plan. Hacé recast natural de su idea al inglés; nunca señales el error como falla."),
]
# Fix CHILD (band_id=2): UPDATE de las 2 guards rotas.
CHILD_GUARDS = [
    (1, "Preguntas simples SÍ — cerradas y abiertas cortas; el chico puede responder con una frase o aportar lo suyo (no solo yes/no)."),
    (2, "Frases CON SENTIDO (chunks comunicativos), no telegráficas de 2-4 palabras; el objetivo es comunicar una idea, no contar palabras."),
]


def main():
    db = motor_engine._connect()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = {"universal_added": [], "child_guards_old": db.q("SELECT ord, body FROM behavioral_guard WHERE band_id=2 AND ord IN (1,2)")}
    path = os.path.join(os.path.dirname(__file__), f"_backup_pedagogy_iter1_{ts}.json")

    # 1) Doctrina universal
    print("== universal_policy (doctrina) ==")
    for kind, ordn, body in UNIVERSAL:
        ex = db.q1("SELECT policy_id FROM universal_policy WHERE kind=%s AND ord=%s", (kind, ordn))
        if ex:
            with db.conn.cursor() as cur:
                cur.execute("UPDATE universal_policy SET body=%s WHERE policy_id=%s", (body, ex["policy_id"]))
            print(f"  upd [{kind}/{ordn}] {body[:90]}")
        else:
            with db.conn.cursor() as cur:
                cur.execute("INSERT INTO universal_policy (kind, ord, body) VALUES (%s,%s,%s)", (kind, ordn, body))
            backup["universal_added"].append({"kind": kind, "ord": ordn})
            print(f"  ins [{kind}/{ordn}] {body[:90]}")
        db.conn.commit()

    # 2) Fix CHILD guards
    print("\n== CHILD band_id=2 behavioral_guard ==")
    for ordn, body in CHILD_GUARDS:
        old = db.q1("SELECT body FROM behavioral_guard WHERE band_id=2 AND ord=%s", (ordn,))
        with db.conn.cursor() as cur:
            cur.execute("UPDATE behavioral_guard SET body=%s WHERE band_id=2 AND ord=%s", (body, ordn))
        db.conn.commit()
        print(f"  ord={ordn}\n    ANTES: {(old['body'] if old else '(no existe)')[:90]}\n    AHORA: {body[:90]}")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"\n[backup] {path}\nLISTO iter1 (doctrina universal + child guards). Reversible.")
    db.conn.close()


if __name__ == "__main__":
    main()

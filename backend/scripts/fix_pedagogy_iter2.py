"""Iteración 2 (según diagnóstico del workflow). Causa-raíz = universal ablandó el recast.
Cura por capas, misma policy / valor por nivel, A1 intacto (no romper los que pasan):

UNIVERSAL (capa 6): separar filtro afectivo (mantener) de recast OBLIGATORIO (agregar).
NIVEL (level_policy.error, valor por level_code): gradiente de visibilidad del recast
  A1 suave (sin tocar) -> A2 audible -> B1 explícito -> B2 estructuras finas -> C1 incrustado.
BANDA: early_child sin onomatopeya suelta; kids variar frame + recast sobre frase real;
  teen/adult escalar andamiaje ante silencio (mata el monólogo).

Solo datos motor_v3. Reversible (backup). Límites: universal/guard<=400, level_policy/band_policy/pedagogy<=300.
Uso: python scripts/fix_pedagogy_iter2.py
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
    # --- RAÍZ: universal separa filtro afectivo + recast obligatorio (nivel gradúa visibilidad) ---
    ("universal_policy", "body", "kind='universal_guard' AND ord=5", (),
     "Escucha activa + recast: reaccioná PRIMERO a lo que el alumno aporta, con interés genuino. Y SIEMPRE reformulá "
     "la forma correcta dentro de tu respuesta (recast natural), SIN etiquetar el error como falla. Corregir "
     "reformulando NO rompe el filtro afectivo. Cuánto se nota el recast lo gradúa el NIVEL."),
    # --- NIVEL: gradiente de visibilidad del recast (A1 NO se toca: ya pasa con recast suave) ---
    ("level_policy", "body", "level_code='A2' AND kind='error_policy'", (),
     "Recast AUDIBLE: devolvé la frase del alumno ya reformulada de forma destacada (mini-eco corto de la forma "
     "correcta) y DESPUÉS elogiá/expandí; no fundas corrección y elogio en una sola frase larga. Tono cálido, sin señalar el error."),
    ("level_policy", "body", "level_code='B1' AND kind='error_policy'", (),
     "Recast EXPLÍCITO de la forma: reformulá claramente cada error que rompe la comunicación o de forma (pasado, 3a "
     "persona, adjetivos), no 'de pasada'. NUNCA valides un error sin reformularlo. Mantené la calidez."),
    ("level_policy", "body", "level_code='B2' AND kind='error_policy' AND body LIKE %s", ("%scalada%",),
     "Escalada: error menor = silent recast; error de forma fina (condicional/subjuntivo, idiomático/fosilizable) = "
     "recast + breve foco. Recasteá las estructuras finas, no solo léxico. NUNCA dejes pasar un error sin reformular."),
    ("level_policy", "body", "level_code='C1' AND kind='error_policy'", (),
     "Recast incrustado de precisión fina (colocaciones, matiz, registro): reformulá elegante dentro de la respuesta, "
     "sin frenar la conversación ni sonar a corrección de escuela. A C1 no se valida una imprecisión sin recast."),
    # --- BANDA early_child: sin onomatopeya suelta como actividad ---
    ("pedagogy", "methodology", "band_id=1", (),
     "Input comprensible (Sparky modela claro y pausado, scaffolding visual). CHUNKS CON SENTIDO; nunca palabras ni "
     "onomatopeyas sueltas como actividad (no 'cow says moo'): abrí con una frase con sentido del tema. 0% gramática; "
     "seguí su curiosidad; error sin castigo."),
    ("band_policy", "body", "band_id=1 AND kind='guided_production'", (),
     "Sparky modela una mini-frase CON SENTIDO, VARIANDO el frame (no repetir grande/chico+color ni 'Can you say X?'). "
     "El nene la dice o aporta lo suyo. Recast sobre SU frase real (reformulá lo que dijo), no re-pidas un target nuevo. Rebotá y expandí."),
    # --- BANDA adult: ante silencio escalar (no repetir contención); continuidad + recast ---
    ("behavioral_guard", "body", "band_id=4 AND ord=2", (),
     "Si se traba o no responde: NO repitas la misma frase de contención; ESCALÁ andamiaje — modelá una respuesta de "
     "ejemplo o dá opciones concretas, no la respuesta entera."),
    ("behavioral_guard", "body", "band_id=4 AND ord=3", (),
     "Priorizá la continuidad del diálogo; corregí reformulando (recast natural) sin frenar la charla."),
]

# Nuevo guard teen (band_id=3): ante silencio escalar + cerrar con pregunta corta (mata monólogo)
TEEN_GUARD = (3, 4,
              "Ante silencio o no-respuesta: NO repitas la misma pregunta; ESCALÁ andamiaje (simplificá, modelá una "
              "respuesta de ejemplo, ofrecé input nuevo). Bajá la densidad de tu input y cerrá cada turno con UNA "
              "pregunta corta y concreta que invite a responder.")


def main():
    db = motor_engine._connect()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = {"updates": [], "inserts": []}
    for table, col, where, params, _new in UPDATES:
        backup["updates"].append({"table": table, "col": col, "where": where,
                                  "old": [r[col] for r in db.q(f"SELECT {col} FROM {table} WHERE {where}", params)]})
    path = os.path.join(os.path.dirname(__file__), f"_backup_pedagogy_iter2_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"[backup] {path}\n")

    for table, col, where, params, new in UPDATES:
        old = db.q1(f"SELECT {col} FROM {table} WHERE {where}", params)
        with db.conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET {col}=%s WHERE {where}", (new, *params))
        db.conn.commit()
        print(f"== {table} [{where}] ==\n  ANTES: {(old[col] if old else '(no existe)')[:95]}\n  AHORA: {new[:95]}\n")

    bid, ordn, body = TEEN_GUARD
    ex = db.q1("SELECT guard_id FROM behavioral_guard WHERE band_id=%s AND ord=%s", (bid, ordn)) \
        if db.q1("SHOW COLUMNS FROM behavioral_guard LIKE 'guard_id'") else \
        db.q1("SELECT 1 ok FROM behavioral_guard WHERE band_id=%s AND ord=%s", (bid, ordn))
    if ex:
        with db.conn.cursor() as cur:
            cur.execute("UPDATE behavioral_guard SET body=%s WHERE band_id=%s AND ord=%s", (body, bid, ordn))
        print(f"== teen guard ord={ordn} (update) ==\n  {body[:95]}\n")
    else:
        with db.conn.cursor() as cur:
            cur.execute("INSERT INTO behavioral_guard (band_id, ord, body) VALUES (%s,%s,%s)", (bid, ordn, body))
        print(f"== teen guard ord={ordn} (insert) ==\n  {body[:95]}\n")
    db.conn.commit()

    print("LISTO iter2 (recast obligatorio universal + gradiente por nivel + ajustes de banda). Reversible.")
    db.conn.close()


if __name__ == "__main__":
    main()

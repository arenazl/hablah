"""Iteración 6 (diagnóstico iter5): el dato del recast ya vive en 3 capas; lo que falla es la
EJECUCION del Flash (ceiling). Lever nuevo (no rewording): el modelo COPIA EJEMPLOS, no obedece
reglas abstractas, y el recast hay que volverlo un GATE, no una exhortación.

1) level_policy.error B1/B2/C1: GATE de recast con EJEMPLO embebido ('I likes pop'->'you like pop').
   "No avances de turno si hubo error de forma sin la versión correcta embebida."
2) trigger_template.continuation teen/adult: riel de 3 pasos OPERATIVO con ejemplo del recast.
3) BUG residual: openings kid/None y kid/A2 todavía piden 'repetir {vocab0}' (drilling) -> chunk.
4) early_child anti-silencio: ofrecer un chunk COMPLETO eco-imitable ('Say: I have a brother').

NO se toca universal ni level A1/kids feedback (ya pasan/cerca). Reversible.
Uso: python scripts/fix_pedagogy_iter6.py
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
    # 1) GATE de recast con ejemplo embebido (el lever nuevo)
    ("level_policy", "body", "level_code='B1' AND kind='error_policy'", (),
     "GATE de recast: NO avances de turno si el alumno produjo un error de forma sin que tu respuesta contenga la "
     "versión correcta embebida, como eco natural y sin meta (dijo 'I likes pop' -> vos 'Oh, you like pop!'). Una "
     "corrección audible por turno; mantené la calidez."),
    ("level_policy", "body", "level_code='B2' AND kind='error_policy' AND body LIKE %s", ("%SELECTIVO%",),
     "GATE de recast SELECTIVO: no avances si dejaste pasar un error sistemático sin la forma correcta embebida (eco "
     "natural, sin meta; 'sensors that tells me' -> 'sensors that tell you'). Elegí 1-2 por turno, incluí estructura "
     "fina (condicional/subjuntivo); no todos."),
    ("level_policy", "body", "level_code='C1' AND kind='error_policy'", (),
     "GATE de recast incrustado: no valides una imprecisión sistemática (colocación, registro, matiz) sin reformularla "
     "en pasada dentro de tu respuesta, sin meta ni romper el registro ('could gave' -> 'could have given'). Selectivo: "
     "los sistemáticos, no cada matiz."),
    # 2) Trigger continuation teen/adult: riel OPERATIVO con ejemplo
    ("trigger_template", "body", "band_group='teen' AND kind='continuation'", (),
     "Cada turno, 3 pasos: (1) validá el contenido en 1 frase; (2) repetí la oración del alumno YA CORREGIDA como si "
     "fuera tuya, natural, sin meta (dijo 'I likes pop' -> vos 'Oh, you like pop!'); (3) UNA pregunta hacia el objetivo. "
     "PROHIBIDO avanzar si hubo error de forma sin la versión corregida embebida. No te auto-respondas."),
    ("trigger_template", "body", "band_group='adult' AND kind='continuation'", (),
     "Cada turno, 3 pasos: (1) reaccioná al sentido en 1 frase; (2) repetí su idea YA CORREGIDA como propia, natural, "
     "sin meta (dijo 'in the work' -> vos 'yes, in the workplace...'); (3) una situación hacia {objective}. PROHIBIDO "
     "avanzar si hubo error de forma sin la versión corregida embebida. Sin castellano."),
    # 3) BUG: openings kid todavía piden repetir {vocab0} (drilling) -> chunk con sentido + variar
    ("trigger_template", "body", "band_group='kid' AND kind='opening' AND level_code IS NULL", (),
     "Saludá con energía como {tutor} (variá el saludo cada clase), presentá el mundo '{topic}' y enganchá. Modelá UNA "
     "frase EN corta y con SENTIDO (patrón 'This is my…/I have a…') y que el nene la diga entera o cuente algo suyo. "
     "NUNCA pidas repetir una palabra suelta."),
    ("trigger_template", "body", "band_group='kid' AND kind='opening' AND level_code='A2'", (),
     "Saludá con energía como {tutor} (variá el saludo), presentá '{topic}' con frases cortas (algo de español). Modelá "
     "UNA frase EN con sentido y que el nene la use o aporte algo suyo. NUNCA pidas repetir una palabra suelta."),
    # 4) early_child anti-silencio: chunk COMPLETO eco-imitable
    ("behavioral_guard", "body", "band_id=1 AND ord=6", (),
     "Si el nene calla 1 turno: ofrecé un chunk COMPLETO listo para eco-imitar ('Say: I have a brother') + 1 palabra de "
     "andamiaje en español; NUNCA repitas la misma pregunta 2x ni te auto-respondas; reformulá desde lo último que dijo."),
]


def main():
    db = motor_engine._connect()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = {"updates": []}
    for table, col, where, params, _new in UPDATES:
        backup["updates"].append({"table": table, "where": where,
                                  "old": [r[col] for r in db.q(f"SELECT {col} FROM {table} WHERE {where}", params)]})
    path = os.path.join(os.path.dirname(__file__), f"_backup_pedagogy_iter6_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"[backup] {path}\n")
    for table, col, where, params, new in UPDATES:
        old = db.q1(f"SELECT {col} FROM {table} WHERE {where}", params)
        with db.conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET {col}=%s WHERE {where}", (new, *params))
        db.conn.commit()
        print(f"== {table} [{where[:55]}] ==\n  ANTES: {(old[col] if old else '(no existe)')[:80]}\n  AHORA: {new[:80]}\n")
    print("LISTO iter6 (recast=GATE+ejemplo embebido | bug drilling openings kid limpiado | anti-silencio eco-imitable). Reversible.")
    db.conn.close()


if __name__ == "__main__":
    main()

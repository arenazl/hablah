"""Iteración 4 (diagnóstico iter3): el NIVEL y el UNIVERSAL ya están bien (recast obligatorio
por nivel). La falla persiste por CAPAS DE BANDA que compiten y ganan. 3 causas-raíz:

1) CAPA 9 trigger teen/adult: el continuation NO menciona recast (el de kid sí). -> sumar riel.
2) BANDA adult: pedagogy/feedback band4 manda 'corregir al CIERRE' -> choca con nivel B1/C1
   'recast cada turno' -> el LLM difiere = valida en seco. -> fluency-first NO es cero corrección.
3) BANDA kids ante silencio: child (band2) no tiene guard anti-silencio; early_child se refugia
   en español. -> guard de escalón + mantener input EN.
+ bisagras: child B1 (feedback band2 reforzar obligatoriedad B1), child A2 (recast en chunk
  limpio, no inventar), adult A1 (modeling_protocol band4: nunca repeat-after-me).

NO se toca universal ni level (excepto A2 hint_policy: mantener input EN). Solo datos. Reversible.
Uso: python scripts/fix_pedagogy_iter4.py
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
    # 1) Trigger teen + adult: sumar riel de recast (capa 9)
    ("trigger_template", "body", "band_group='teen' AND kind='continuation'", (),
     "Cada turno: (1) reaccioná al sentido de lo que dijo; (2) recast del error de forma más visible reformulando SU "
     "frase; (3) UNA consigna por turno hacia el objetivo, conectada con sus intereses. Español al mínimo; NO te "
     "auto-respondas (modelá media respuesta y dejá el hueco para que complete)."),
    ("trigger_template", "body", "band_group='adult' AND kind='continuation'", (),
     "Cada turno: (1) reaccioná al sentido; (2) recast NATURAL inline del error principal reformulando SU frase, sin "
     "frenar el flujo (no lo guardes para el cierre); (3) una situación por turno hacia {objective}. Sin castellano; "
     "pistas si se traba >3s."),
    # 2) Banda adult: fluency-first NO es cero corrección
    ("pedagogy", "methodology", "band_id=4", (),
     "Fluency first, pero NO es cero corrección: recast natural inline del error principal cada turno, sin frenar el "
     "flujo ni usar metalenguaje. El resumen de vicios al cierre es ADICIONAL, no en lugar del recast del turno."),
    ("band_policy", "body", "band_id=4 AND kind='feedback'", (),
     "Recast inline del error principal cada turno (sin frenar). Al cierre, ADEMÁS: resumen + 1-2 focos + 1 métrica "
     "observable + micro-tarea. El cierre NO reemplaza el recast de cada turno."),
    # 3) child A2/B1: recast en chunk limpio, no inventar, obligatoriedad B1
    ("band_policy", "body", "band_id=2 AND kind='feedback'", (),
     "Recast SIEMPRE el Spanglish/error en un chunk corto y limpio (eco breve de SU frase corregida), sin culpa; no "
     "parafrasees largo ni inventes contenido que el nene no dijo. Desde B1, el recast del error principal es OBLIGATORIO "
     "cada turno, no solo implícito."),
    ("behavioral_guard", "body", "band_id=2 AND ord=2", (),
     "Frases CON SENTIDO (chunks comunicativos), no telegráficas de 2-4 palabras; comunicar una idea. Trabajá SOLO "
     "sobre el aporte real del nene; no inventes lo que no dijo."),
    # early_child A2: mantener input EN ante traba (nivel A2 hint, compartido)
    ("level_policy", "body", "level_code='A2' AND kind='hint_policy'", (),
     "Ante traba: reformulación (parafrasear en inglés) + recast implícito. Traducir solo si 2+ intentos fallidos. "
     "Mantené SIEMPRE algo de input en EN aunque traduzcas; nunca un turno 100% español."),
]

INSERTS = [
    ("behavioral_guard", {"band_id": 2, "ord": 4,
                          "body": "Ante silencio o no-respuesta: NO repitas la misma pregunta ni entregues la respuesta entera; ESCALÁ "
                                  "andamiaje — modelá media respuesta y dejá que el nene complete, o dá 2 opciones; variá el frame. Cálido y lúdico."},
     "band_id=2 AND ord=4", ()),
    ("behavioral_guard", {"band_id": 1, "ord": 6,
                          "body": "Ante silencio del nene: NO repitas la misma pregunta ni te pases al español puro; bajá a UNA frase-modelo "
                                  "cortita en EN con su traducción al lado (i+1), ofrecé 2 opciones, dale 3-5s. El español acompaña, no reemplaza el input EN."},
     "band_id=1 AND ord=6", ()),
    ("band_policy", {"band_id": 4, "kind": "modeling_protocol",
                     "body": "Modelá la forma en una frase con sentido y dejá que el adulto la use en contexto; NUNCA repeat-after-me ni "
                             "palabra suelta — es infantilizante para un adulto."},
     "band_id=4 AND kind='modeling_protocol'", ()),
]


def main():
    db = motor_engine._connect()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = {"updates": [], "inserts": []}
    for table, col, where, params, _new in UPDATES:
        backup["updates"].append({"table": table, "where": where,
                                  "old": [r[col] for r in db.q(f"SELECT {col} FROM {table} WHERE {where}", params)]})
    path = os.path.join(os.path.dirname(__file__), f"_backup_pedagogy_iter4_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"[backup] {path}\n")

    for table, col, where, params, new in UPDATES:
        old = db.q1(f"SELECT {col} FROM {table} WHERE {where}", params)
        with db.conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET {col}=%s WHERE {where}", (new, *params))
        db.conn.commit()
        print(f"== {table} [{where}] ==\n  ANTES: {(old[col] if old else '(no existe)')[:85]}\n  AHORA: {new[:85]}\n")

    for table, cols, where, params in INSERTS:
        if db.q1(f"SELECT 1 ok FROM {table} WHERE {where}", params):
            with db.conn.cursor() as cur:
                cur.execute(f"UPDATE {table} SET body=%s WHERE {where}", (cols["body"], *params))
            print(f"== {table} [{where}] (update) ==\n  {cols['body'][:85]}\n")
        else:
            keys = ", ".join(cols.keys())
            ph = ", ".join(["%s"] * len(cols))
            with db.conn.cursor() as cur:
                cur.execute(f"INSERT INTO {table} ({keys}) VALUES ({ph})", tuple(cols.values()))
            print(f"== {table} [{where}] (INSERT) ==\n  {cols['body'][:85]}\n")
        db.conn.commit()

    print("LISTO iter4 (3 causas de banda: trigger teen/adult con recast, adult sin diferir-al-cierre, kids anti-silencio). Reversible.")
    db.conn.close()


if __name__ == "__main__":
    main()

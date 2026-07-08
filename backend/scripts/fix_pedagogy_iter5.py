"""Iteración 5 (diagnóstico iter4/N=5). Palanca principal: el recast B1+ ya es obligatorio
pero le falta la FORMA (sale metalinguistico 'you could say...'). 4 familias de fix por yield:

1) NIVEL B1+ (level_policy.error, toca 5 perfiles): recast IMPLICITO conversacional (eco de la
   forma dentro de la propia respuesta, sin 'you could say' ni gramatica) + SELECTIVO en niveles
   altos (1-2 errores sistematicos/turno, no dejar pasar todo por el flujo).
2) BANDA kids anti-silencio (early_child, child): variar el fallback, NUNCA repetir la misma
   frase 2x ni encadenar binarias; reformular desde lo ultimo que dijo el chico.
3) BANDA adult descontaminar (adult A1): sacar 'try saying that' (TPR de kids), subir input EN.
4) Consistencia teen: contener el afecto NO reemplaza el recast.

NO se toca universal (rompe kids) ni level A1 (early_child A1 ya depende de recast suave). Reversible.
Uso: python scripts/fix_pedagogy_iter5.py
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
    # 1) NIVEL B1+ : recast IMPLICITO conversacional + selectivo (mayor yield)
    ("level_policy", "body", "level_code='B1' AND kind='error_policy'", (),
     "Recast IMPLÍCITO y conversacional del error principal de cada turno: reformulá la forma correcta DENTRO de tu "
     "propia respuesta (eco natural del verbo/forma corregida), SIN 'you could say' ni explicación gramatical. Validar "
     "el contenido sin reformular la forma = incumplir. Mantené la calidez."),
    ("level_policy", "body", "level_code='B2' AND kind='error_policy' AND body LIKE %s", ("%ecast%",),
     "Recast SELECTIVO pero presente: elegí 1-2 errores sistemáticos por turno y reformulalos DENTRO de tu respuesta "
     "(eco del verbo/forma corregida), sin metalenguaje; no los dejes pasar todos por mantener el flujo. Incluí "
     "estructura fina (condicional/subjuntivo)."),
    ("level_policy", "body", "level_code='C1' AND kind='error_policy'", (),
     "Recast SELECTIVO incrustado: aun en C1 elegí los errores sistemáticos (colocación, registro, matiz) y "
     "reformulalos en pasada dentro de tu respuesta, sin metalenguaje ni romper el registro. Validar la idea sin "
     "reformular la forma = incumplir."),
    # 2) BANDA kids anti-silencio (variar, no repetir, no encadenar binarias)
    ("behavioral_guard", "body", "band_id=1 AND ord=6", (),
     "Ante silencio del nene: NUNCA repitas la misma frase 2x. Reformulá DESDE lo último que dijo (su nombre, 'she is "
     "happy') en un modelo nuevo y corto en EN; si sigue callado, ofrecé UNA elección concreta. El español acompaña, no "
     "reemplaza el input EN."),
    ("behavioral_guard", "body", "band_id=2 AND ord=4", (),
     "Ante silencio: NO repitas la misma pregunta ni encadenes binarias (>1 seguida prohibido). Escalá: (1) modelá "
     "media respuesta y dejá que complete, (2) UNA elección concreta, (3) si sigue mudo, sí/no señalable o cambiá de "
     "objeto. Variá el frame, cálido."),
    # early_child feedback: recast suave/implicito explicito (sin meta, sin pedir repetir)
    ("band_policy", "body", "band_id=1 AND kind='feedback'", (),
     "Feedback en 2 pasos, sin plantillas: (1) reaccioná al aporte del nene con emoción variada; (2) recast SUAVE/"
     "implícito del error en pasada (eco correcto, sin meta-lenguaje, sin pedir que repita) y elogio al esfuerzo, "
     "variando la expresión."),
]

INSERTS = [
    ("band_policy", {"band_id": 4, "kind": "guided_production",
                     "body": "Ofrecé el modelo y seguí la conversación; NO pidas repetir ni 'try saying that' (infantiliza al adulto). "
                             "Subí el input en inglés; el español solo como puente mínimo, nunca como pregunta binaria grande/chico."},
     "band_id=4 AND kind='guided_production'", ()),
    ("band_policy", {"band_id": 3, "kind": "modeling_protocol",
                     "body": "Contener/validar el afecto NO reemplaza el recast: primero contené, después reformulá el error en la "
                             "MISMA respuesta, con eco natural y cool (no escolar)."},
     "band_id=3 AND kind='modeling_protocol'", ()),
]


def main():
    db = motor_engine._connect()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = {"updates": []}
    for table, col, where, params, _new in UPDATES:
        backup["updates"].append({"table": table, "where": where,
                                  "old": [r[col] for r in db.q(f"SELECT {col} FROM {table} WHERE {where}", params)]})
    path = os.path.join(os.path.dirname(__file__), f"_backup_pedagogy_iter5_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"[backup] {path}\n")

    for table, col, where, params, new in UPDATES:
        old = db.q1(f"SELECT {col} FROM {table} WHERE {where}", params)
        with db.conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET {col}=%s WHERE {where}", (new, *params))
        db.conn.commit()
        print(f"== {table} [{where}] ==\n  ANTES: {(old[col] if old else '(no existe)')[:80]}\n  AHORA: {new[:80]}\n")

    for table, cols, where, params in INSERTS:
        if db.q1(f"SELECT 1 ok FROM {table} WHERE {where}", params):
            with db.conn.cursor() as cur:
                cur.execute(f"UPDATE {table} SET body=%s WHERE {where}", (cols["body"], *params))
            print(f"== {table} [{where}] (update) ==\n  {cols['body'][:80]}\n")
        else:
            keys = ", ".join(cols.keys())
            ph = ", ".join(["%s"] * len(cols))
            with db.conn.cursor() as cur:
                cur.execute(f"INSERT INTO {table} ({keys}) VALUES ({ph})", tuple(cols.values()))
            print(f"== {table} [{where}] (INSERT) ==\n  {cols['body'][:80]}\n")
        db.conn.commit()

    print("LISTO iter5 (recast implicito B1+ [yield x5] + anti-silencio kids + descontaminar adult + consistencia teen). Reversible.")
    db.conn.close()


if __name__ == "__main__":
    main()

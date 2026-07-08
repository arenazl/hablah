"""Fix de la capa de pedagogía early_child: de "modelá -> repetí PALABRA suelta -> premiá
la repetición" (TPR robótico) a "frase con SENTIDO -> que el nene COMUNIQUE -> rebotá lo
que trae". Cambia SOLO datos del motor_v3 (reversible, backup previo). NO toca código.

Mata el "¿puedes decir 'my'?": palabra suelta no significa nada y la voz ni la capta.

Uso: python scripts/fix_kids_pedagogy_chunks.py
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

# (tabla, set_col, WHERE-extra-sql, params, nuevo_texto)  — band_id=1 = early_child; band_group='kid'
CHANGES = [
    ("pedagogy", "methodology", "band_id=1", (),
     "Input comprensible (Sparky modela claro y pausado, scaffolding visual de labios). Producción de "
     "CHUNKS CON SENTIDO, NUNCA palabras sueltas. 0% gramática explícita. Seguí la curiosidad del nene; error sin castigo."),
    ("activity_type", "description", "band_id=1", (),
     "Misión con mini-frases con sentido ancladas a imagen (ej. 'This is my mom'). Sparky modela; el nene "
     "PRODUCE la frase entera o aporta algo suyo al micrófono — nunca una palabra aislada."),
    ("reward", "description", "band_id=1", (),
     "Estrellitas durante la misión: 1 cada vez que el nene COMUNICA (dice una frase o aporta algo del tema), "
     "no por repetir una palabra. Visible en pantalla con Sparky."),
    ("band_policy", "body", "band_id=1 AND kind='guided_production'", (),
     "Sparky modela una mini-frase CON SENTIDO -> el nene la dice entera o responde con contenido propio -> "
     "feedback. CHUNKS, nunca palabras sueltas. Si el nene aporta algo (ej. 'me gusta su sonrisa'), rebotalo y expandilo."),
    ("band_policy", "body", "band_id=1 AND kind='modeling_protocol'", (),
     "Antes de cada tarea, Sparky modela un CHUNK con sentido con claridad articulatoria y pausa "
     "(ej. 'Listen: This is my mom. Now you'). PROHIBIDO pedir una palabra aislada: no significa nada sola y la voz ni la capta."),
    ("behavioral_guard", "body", "band_id=1 AND ord=1", (),
     "Preguntas simples y concretas SÍ (el nene puede contestar en español o con una frasecita); evitá preguntas "
     "abiertas largas en inglés. El objetivo es que COMUNIQUE, no que repita palabras sueltas."),
    ("trigger_template", "body", "band_group='kid' AND kind='opening' AND level_code='A1'", (),
     "Saludá MUY simple como {tutor}, casi todo en español; presentá el mundo '{topic}'. Arrancá una mini-charla: "
     "modelá UNA frase EN corta y con SENTIDO sobre el tema (patrones tipo 'This is my…', 'This is a…', 'I have a…'), "
     "clara y pausada, y que el nene la diga ENTERA o cuente algo suyo. NUNCA pidas una palabra suelta. Rebotá lo que "
     "el nene trae. Festejá el intento."),
    ("trigger_template", "body", "band_group='kid' AND kind='continuation' AND level_code IS NULL", (),
     "1 mini-frase EN con sentido (patrón 'This is a…/I have a…') -> espejo en ES -> que el nene la USE o responda con "
     "algo propio (no mera repetición). Rebotá y expandí lo que el nene dice."),
    ("trigger_template", "body", "band_group='kid' AND kind='closing' AND level_code IS NULL", (),
     "Repaso MUY breve de lo que charlaron hoy (sin lista hardcodeada), festejá el logro y enganchá para la próxima; "
     "en ES con alguna frase EN del día."),
    ("app_config", "config_value", "config_key='voice_output_rule'", (),
     "El texto hablado va LIMPIO y PLANO: solo lo que el profe DICE, sin JSON, sin campos, sin estructura. Emojis y "
     "onomatopeyas NO se dicen — solo van a pantalla."),
]


def main():
    db = motor_engine._connect()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = []
    for table, col, where, params, _new in CHANGES:
        rows = db.q(f"SELECT {col} FROM {table} WHERE {where}", params)
        backup.append({"table": table, "col": col, "where": where, "old": [r[col] for r in rows]})
    path = os.path.join(os.path.dirname(__file__), f"_backup_kids_pedagogy_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"[backup] {path}\n")

    for table, col, where, params, new in CHANGES:
        old = db.q1(f"SELECT {col} FROM {table} WHERE {where}", params)
        old_txt = (old[col] if old else "(no existe)")
        with db.conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET {col}=%s WHERE {where}", (new, *params))
        db.conn.commit()
        print(f"== {table}.{col} [{where}] ==")
        print(f"  ANTES: {old_txt[:150]}")
        print(f"  AHORA: {new[:150]}\n")

    print("LISTO. Capa de pedagogía early_child reescrita (chunks con sentido, comunicar > repetir). Reversible con el backup.")
    db.conn.close()


if __name__ == "__main__":
    main()

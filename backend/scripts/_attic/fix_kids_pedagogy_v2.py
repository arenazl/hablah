"""Fix pedagogía early_child v2: integra las recomendaciones de Gemini sobre el v1.
- feedback en 2 pasos (semántico -> lingüístico, sin plantillas)
- need-for-output (Sparky PIDE AYUDA dentro de la narrativa)
- continuation con contexto/misterio -> validar significado -> recast -> repetir/expandir
- NUEVA guard 16: manejo de Spanglish / aporte propio (aceptar ES -> recast EN -> intentar)
Solo datos motor_v3. Reversible (backup). band_id=1 = early_child; band_group='kid'.

Uso: python scripts/fix_kids_pedagogy_v2.py
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
    ("band_policy", "body", "band_id=1 AND kind='feedback'", (),
     "PROHIBIDO plantillas/frases fijas. Feedback en 2 pasos: (1) reaccioná PRIMERO al aporte del nene, con emoción y "
     "palabras variadas. (2) celebrá el esfuerzo VARIANDO siempre la expresión (nunca dos veces igual). Elogio solo al esfuerzo."),
    ("activity_type", "description", "band_id=1", (),
     "Misión guiada por NARRATIVA con need-for-output: Sparky NO pide repetir por repetir; crea una RAZÓN para hablar "
     "(pide ayuda, busca a alguien, resuelve un mini-misterio) y VARÍA la situación cada vez. Al lograrlo, recompensa "
     "visual. Producción de chunks con sentido, nunca palabras sueltas."),
    ("band_policy", "body", "band_id=1 AND kind='modeling_protocol'", (),
     "Antes de cada tarea, Sparky modela el CHUNK objetivo con claridad y pausa, VARIANDO la formulación. PROHIBIDO una "
     "frase fija o pedir una palabra aislada (no significa nada sola y la voz ni la capta)."),
    ("trigger_template", "body", "band_group='kid' AND kind='continuation' AND level_code IS NULL", (),
     "Reacción CONDICIONADA, no secuencia fija: (1) si el nene aporta algo (aunque sea en español), validá su "
     "SIGNIFICADO primero. (2) recast natural en EN, remodelando SU idea o el chunk objetivo. (3) invitalo a intentarlo "
     "o a expandir. Nunca carrusel mecánico ni frase fija."),
    # --- alivio de OVER-CONSTRAINT (recos Gemini). OJO: level A1 es compartido con adultos (motor_v3, no prod). ---
    ("level", "modifier", "level_code='A1'", (),
     "Espejo en español DINÁMICO: cuando el alumno se traba o lo necesita, NO en cada turno. Vocabulario simple, no telegráfico."),
    ("level_policy", "body", "level_code='A1' AND kind='error_policy'", (),
     "Recast natural: aceptá la idea con calidez y reformulá en inglés simple, SIN señalar el error. Priorizá lo humano "
     "(reaccionar al aporte) por sobre cumplir todas las reglas; turnos ágiles (~30 palabras)."),
    ("behavioral_guard", "body", "band_id=1 AND ord=3", (),
     "Turnos ÁGILES e interactivos (aprox. 30 palabras), sin sacrificar la reacción empática al aporte del nene."),
]
NEW_GUARD = ("band_id=1", 20,
             "Escucha activa (prioridad de HIERRO): NUNCA ignores un aporte del nene. Tu PRIMERA oración DEBE reaccionar "
             "con empatía a lo que dijo, ANTES de seguir la misión. Si mezcla ES/EN, aceptá la idea en ES -> recast "
             "natural en EN (remodelá SU frase, no una fija) -> invitalo a intentarlo. Variá siempre.")


def main():
    db = motor_engine._connect()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = []
    for table, col, where, params, _new in UPDATES:
        rows = db.q(f"SELECT {col} FROM {table} WHERE {where}", params)
        backup.append({"table": table, "col": col, "where": where, "old": [r[col] for r in rows]})
    path = os.path.join(os.path.dirname(__file__), f"_backup_kids_pedagogy_v2_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"[backup] {path}\n")

    for table, col, where, params, new in UPDATES:
        old = db.q1(f"SELECT {col} FROM {table} WHERE {where}", params)
        with db.conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET {col}=%s WHERE {where}", (new, *params))
        db.conn.commit()
        print(f"== {table}.{col} [{where}] ==")
        print(f"  ANTES: {(old[col] if old else '(no existe)')[:130]}")
        print(f"  AHORA: {new[:130]}\n")

    # NUEVA guard (insert si no existe)
    bw, ordn, body = NEW_GUARD
    exists = db.q1(f"SELECT 1 ok FROM behavioral_guard WHERE {bw} AND body LIKE %s", ("%Spanglish%",))
    if exists:
        print("== behavioral_guard Spanglish: ya existe, skip ==")
    else:
        with db.conn.cursor() as cur:
            cur.execute(f"INSERT INTO behavioral_guard (band_id, ord, body) VALUES (1, %s, %s)", (ordn, body))
        db.conn.commit()
        print(f"== behavioral_guard NUEVA (ord {ordn}) ==\n  + {body[:130]}\n")

    print("LISTO. Pedagogía v2 (recos Gemini integradas). Reversible con el backup.")
    db.conn.close()


if __name__ == "__main__":
    main()

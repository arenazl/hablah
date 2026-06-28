"""De-robotiza la clase Mini A0 SIN romper el VAD (mantiene la frase-puente como vehículo).

Cambia DOS presets (dato, reversible; el composer queda genérico):
  - Capa 9 (eje EDAD): student_types.mini.continuation_seed  -> el grueso (no marchar la lista)
  - Capa 6 (eje NIVEL): levels.A0.expected_production         -> retoque (saca "estructura fija idéntica")

Avalado por la profe especialista (SLA): estructura con piso + variación/calidez/reciclado,
cierre SIEMPRE en la frase-puente, cero preguntas (para no traer monosílabos que el VAD pierde).

Correr:   cd backend && PYTHONPATH=. python scripts/fix_a0_derobot.py
Revertir: cd backend && PYTHONPATH=. python scripts/restore_a0_derobot.py
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services import motor_engine

NEW_CONTINUATION_MINI = (
    "Por turno, en este orden: (1) Reaccioná de VERDAD a lo que el nene dijo o intentó — nombralo, "
    "festejá DISTINTO cada vez (variá, nunca la misma frase), y si trajo algo suyo (su perro, su "
    "hermano, su juego) seguí ESE hilo un toque antes de avanzar. (2) Traé UNA palabra del tema de "
    "forma viva: NO marches una lista — a veces reciclá una ya vista, a veces metela en una "
    "mini-escena ('¿sabés quién me vino a ver?… mi mamá. Mom, mamá.'). (3) Cerrá SIEMPRE con la "
    "frase-puente del Expected_Production ('ahora vos: <palabra-ES> se dice <word-EN>') y PARÁ. La "
    "frase-puente es el VEHÍCULO para que produzca, no una lista a tachar. CERO preguntas (sí/no, "
    "abiertas o encadenadas). Festejá cualquier intento; si no salió, repetí la MISMA palabra con "
    "otras palabras cálidas, JAMÁS con una pregunta."
)

NEW_EXPECTED_PRODUCTION_A0 = (
    "El alumno produce SIEMPRE la frase-puente bilingüe COMPLETA '<palabra-ES> se dice <word-EN>' "
    "(ej: 'perro se dice dog') — es lo que el canal de voz necesita captar (una palabra suelta no se "
    "transmite). El PISO de cada turno: reaccioná en español a lo que dijo (corto, VARIÁ la reacción), "
    "modelá UNA palabra en contexto (español + palabra EN + eco español pegado) y cerrá con la "
    "invitación 'ahora vos: <palabra-ES> se dice <word-EN>'. La INVITACIÓN es fija; todo lo demás "
    "VARIÁ (la reacción, el contexto, una mini-escena, reciclar algo ya visto) para que NO suene a "
    "lista ni a robot. PROHIBIDO: preguntas (abiertas, de opinión, de gustos) e iniciar el turno con pregunta."
)


def main():
    db = motor_engine._connect()
    cur = db.conn.cursor()
    db.conn.begin()
    try:
        old_cont = db.q1("SELECT continuation_seed FROM student_types WHERE slug='mini'")
        old_exp = db.q1("SELECT expected_production FROM levels WHERE code='A0'")
        if not old_cont or not old_exp:
            raise RuntimeError("no encontré student_types.mini o levels.A0")

        backup = {
            "continuation_seed_mini": old_cont["continuation_seed"],
            "expected_production_a0": old_exp["expected_production"],
        }
        _write_restore(backup)
        print("Backup -> scripts/restore_a0_derobot.py")

        cur.execute("UPDATE student_types SET continuation_seed=%s WHERE slug='mini'", (NEW_CONTINUATION_MINI,))
        print("  Capa 9 continuation_seed (mini) actualizado")
        cur.execute("UPDATE levels SET expected_production=%s WHERE code='A0'", (NEW_EXPECTED_PRODUCTION_A0,))
        print("  Capa 6 expected_production (A0) actualizado")

        db.conn.commit()
        print("\nOK — commit aplicado. El motor lo lee en vivo (no requiere deploy).")
        print("Revertir: PYTHONPATH=. python scripts/restore_a0_derobot.py")
    except Exception as e:
        db.conn.rollback()
        print("ROLLBACK por error:", e)
        raise
    finally:
        db.conn.close()


def _write_restore(backup: dict):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "restore_a0_derobot.py")
    content = '''"""Revierte fix_a0_derobot.py (restaura continuation_seed mini + expected_production A0)."""
import os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services import motor_engine

BACKUP = ''' + json.dumps(backup, ensure_ascii=False, indent=2) + '''

db = motor_engine._connect()
cur = db.conn.cursor()
db.conn.begin()
try:
    cur.execute("UPDATE student_types SET continuation_seed=%s WHERE slug='mini'", (BACKUP["continuation_seed_mini"],))
    cur.execute("UPDATE levels SET expected_production=%s WHERE code='A0'", (BACKUP["expected_production_a0"],))
    db.conn.commit()
    print("Revertido OK.")
except Exception as e:
    db.conn.rollback(); print("ROLLBACK:", e); raise
finally:
    db.conn.close()
'''
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


if __name__ == "__main__":
    main()

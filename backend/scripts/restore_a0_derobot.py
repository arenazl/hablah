"""Revierte fix_a0_derobot.py (restaura continuation_seed mini + expected_production A0)."""
import os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services import motor_engine

BACKUP = {
  "continuation_seed_mini": "Por turno: (1) Reaccioná con empatía a lo que el nene dijo o intentó. (2) Modelá el próximo ítem de vocabulario usando el patrón exacto de Expected_Production. (3) Invitá a producirlo. (4) PARÁ y esperá. Cero preguntas abiertas. Cero preguntas encadenadas. No avancés sin respuesta. Festejá cualquier intento.",
  "expected_production_a0": "El alumno produce SIEMPRE la frase-puente bilingüe COMPLETA '<palabra-ES> se dice <word-EN>' (ej: 'perro se dice dog'). ESTRUCTURA FIJA de cada turno: (1) Reaccioná en español a lo que dijo el alumno (máx 10 palabras). (2) Modelá: contextualiza brevemente en español + nombrá la palabra EN + eco EN español pegado. (3) Cerrá SIEMPRE con: 'ahora vos: <palabra-ES> se dice <word-EN>' y PARÁ. PROHIBIDO: preguntas abiertas, preguntas de opinión, preguntas de gustos. PROHIBIDO: iniciar el turno con pregunta. PERMITIDO SOLO: la invitación fija del paso 3."
}

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

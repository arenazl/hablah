"""Repara los rieles A0 de motor_v3 (lo que ve el dueño roto en /mini-test).

QUÉ HACE (todo reversible, sin deploy, sin tocar producción v2):
  1) Backup de las filas que toca -> escribe restore_v3_a0_rails.py al lado.
  2) Reescribe trigger_template kid/A0 (opening + continuation): saca "pregunta
     cerrada/2-opciones" y referencias visuales; pone la frase-puente A0 (model->repeat->PARÁ),
     VAD-safe, cálida, con recast por re-modelado.
  3) Crea la PRIMERA orquestación custom real (early_child x A0, comodín de tópico) con overrides
     que DESACTIVAN las guardas que chocan con A0 y AGREGAN el contrato A0.

Contrato A0 avalado por el especialista pedagógico (skill pedagogy-specialist, 2026-06-27):
portar el contrato A0 ya validado de v2 (frase-puente bilingüe completa) a los rieles de v3.

Correr:  cd backend && PYTHONPATH=. python scripts/fix_v3_a0_rails.py
Revertir: cd backend && PYTHONPATH=. python scripts/restore_v3_a0_rails.py
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services import motor_engine

ORCH_NAME = "Mini · A0 · base (rieles correctos)"
EARLY_CHILD_BAND = 1  # age_band.code='early_child'

NEW_OPENING_A0 = (
    "Saludá a {name} con calidez y MUY simple, como {tutor}, TODO en español. Nombrá el tema "
    "{topic} en español con una frase corta y entusiasta. Elegí UNA sola palabra del tema y "
    "presentala así: contá algo cortito en español + decí la palabra en inglés + pegá el eco en "
    "español (ej: 'Mirá qué linda… esto es una mano. Hand, mano.'). Después invitá UNA vez con la "
    "fórmula exacta: 'ahora vos: <palabra-ES> se dice <word-EN>' y PARÁ a esperar su respuesta. Una "
    "sola palabra, una sola invitación. PROHIBIDO hacer preguntas (ni sí/no, ni de dos opciones) y "
    "PROHIBIDO oraciones enteras en inglés. No menciones fotos, pantallas ni 'te muestro': es SOLO voz."
)
NEW_CONTINUATION_A0 = (
    "Por turno, SIEMPRE en este orden y nada más: (1) Reaccioná en español a lo que {name} dijo o "
    "intentó (máx 10 palabras), festejando el esfuerzo y VARIANDO el festejo, nunca la misma frase. "
    "(2) Modelá la próxima palabra del tema así: contexto cortito en español + palabra en inglés + "
    "eco en español pegado (ej: 'Ahora el pie… foot, pie.'). (3) Cerrá SIEMPRE con la invitación "
    "exacta 'ahora vos: <palabra-ES> se dice <word-EN>' y PARÁ a esperar. PROHIBIDO: toda pregunta "
    "(sí/no, de dos opciones, abierta, de gustos), iniciar el turno con pregunta, y encadenar dos "
    "palabras nuevas. Una sola palabra nueva en inglés por turno; español como base. Ante silencio, "
    "re-modelá la MISMA palabra con otras palabras cálidas, NUNCA con una pregunta. No menciones "
    "fotos ni pantallas: es SOLO voz."
)

# Guardas a AGREGAR para A0 (slot behavioral_guard, action add)
A0_GUARDS_ADD = [
    "A0 — Estructura fija por turno (no la rompas): (1) reaccioná en español festejando y variando; "
    "(2) modelá UNA palabra del tema con contexto ES + palabra EN + eco ES pegado; (3) cerrá con "
    "'ahora vos: <palabra-ES> se dice <word-EN>' y PARÁ. PROHIBIDO toda pregunta e iniciar el turno con pregunta.",
    "A0 — App SOLO VOZ: NUNCA menciones fotos, imágenes, videos, pantalla ni 'mirá esto / te muestro'. "
    "El significado se ancla con el eco en español, no con lo visual.",
    "A0 — Una sola palabra nueva en inglés por turno, español como base. Ante silencio, re-modelá la "
    "MISMA palabra con calidez, jamás con una pregunta.",
]
# guardas de banda early_child que CHOCAN con A0 (preguntas/uptake/elección) -> desactivar
BAND_GUARDS_DISABLE = [1, 13, 15, 19]
# universales que chocan con A0 (subtítulos en pantalla / prohibir frases-template fijas) -> desactivar
UNIVERSAL_DISABLE = [9, 11]


def main():
    db = motor_engine._connect()
    cur = db.conn.cursor()
    db.conn.begin()
    try:
        # ---------- 1) BACKUP ----------
        backup = {"trigger_template": [], "orchestration_name": ORCH_NAME}
        rows = db.q("SELECT template_id, kind, body FROM trigger_template "
                    "WHERE band_group='kid' AND level_code='A0' AND kind IN ('opening','continuation')")
        for r in rows:
            backup["trigger_template"].append({"template_id": r["template_id"], "body": r["body"]})
        if len(rows) != 2:
            print(f"!! ADVERTENCIA: esperaba 2 filas trigger kid/A0, encontré {len(rows)}: "
                  f"{[r['kind'] for r in rows]}")

        _write_restore(backup)
        print("Backup escrito -> scripts/restore_v3_a0_rails.py")

        # ---------- 2) trigger_template kid/A0 ----------
        for r in rows:
            new = NEW_OPENING_A0 if r["kind"] == "opening" else NEW_CONTINUATION_A0
            cur.execute("UPDATE trigger_template SET body=%s WHERE template_id=%s", (new, r["template_id"]))
            print(f"  trigger_template[{r['kind']}/A0] actualizado (id={r['template_id']})")

        # ---------- 3) orquestación custom early_child x A0 ----------
        existing = db.q1("SELECT orchestration_id FROM orchestration WHERE name=%s", (ORCH_NAME,))
        if existing:
            oid = existing["orchestration_id"]
            cur.execute("DELETE FROM orchestration_override WHERE orchestration_id=%s", (oid,))
            cur.execute("UPDATE orchestration SET status='active', band_id=%s, level_code='A0', "
                        "topic_id=NULL WHERE orchestration_id=%s", (EARLY_CHILD_BAND, oid))
            print(f"  orquestación '{ORCH_NAME}' ya existía (id={oid}) -> overrides reseteados")
        else:
            cur.execute("INSERT INTO orchestration (name, status, band_id, level_code, topic_id, notes) "
                        "VALUES (%s,'active',%s,'A0',NULL,%s)",
                        (ORCH_NAME, EARLY_CHILD_BAND,
                         "Primera orquestación custom real. Contrato A0 (frase-puente, sin preguntas, solo voz)."))
            oid = cur.lastrowid
            print(f"  orquestación '{ORCH_NAME}' creada (id={oid})")

        ordn = 1
        for gid in BAND_GUARDS_DISABLE:
            cur.execute("INSERT INTO orchestration_override (orchestration_id, slot, action, target_table, "
                        "target_id, ord, note) VALUES (%s,'behavioral_guard','disable','behavioral_guard',%s,%s,%s)",
                        (oid, gid, ordn, "choca con A0 (pregunta/uptake)")); ordn += 1
        for pid in UNIVERSAL_DISABLE:
            cur.execute("INSERT INTO orchestration_override (orchestration_id, slot, action, target_table, "
                        "target_id, ord, note) VALUES (%s,'universal_policy','disable','universal_policy',%s,%s,%s)",
                        (oid, pid, ordn, "choca con A0 (pantalla/frase-fija)")); ordn += 1
        for body in A0_GUARDS_ADD:
            cur.execute("INSERT INTO orchestration_override (orchestration_id, slot, action, body, ord, note) "
                        "VALUES (%s,'behavioral_guard','add',%s,%s,%s)", (oid, body, ordn, "contrato A0")); ordn += 1
        print(f"  {len(BAND_GUARDS_DISABLE)+len(UNIVERSAL_DISABLE)} disables + {len(A0_GUARDS_ADD)} adds insertados")

        db.conn.commit()
        print("\nOK — commit aplicado. Revertir con: PYTHONPATH=. python scripts/restore_v3_a0_rails.py")
    except Exception as e:
        db.conn.rollback()
        print("ROLLBACK por error:", e)
        raise
    finally:
        db.conn.close()


def _write_restore(backup: dict):
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "restore_v3_a0_rails.py")
    content = '''"""Revierte fix_v3_a0_rails.py: restaura los trigger_template kid/A0 y borra la
orquestación custom early_child x A0. Generado automáticamente."""
import os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services import motor_engine

BACKUP = ''' + json.dumps(backup, ensure_ascii=False, indent=2) + '''

db = motor_engine._connect()
cur = db.conn.cursor()
db.conn.begin()
try:
    for t in BACKUP["trigger_template"]:
        cur.execute("UPDATE trigger_template SET body=%s WHERE template_id=%s", (t["body"], t["template_id"]))
    o = db.q1("SELECT orchestration_id FROM orchestration WHERE name=%s", (BACKUP["orchestration_name"],))
    if o:
        cur.execute("DELETE FROM orchestration_override WHERE orchestration_id=%s", (o["orchestration_id"],))
        cur.execute("DELETE FROM orchestration WHERE orchestration_id=%s", (o["orchestration_id"],))
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

"""LEVER #1 — Andamiaje L1 en nivel A1 (consensuado con la especialista pedagógica).
Revierte una sobre-corrección previa (iterX dejó A1 empujando al inglés: modifier 'DINÁMICO/no
en cada turno' + hint 'inglés-simple-primero'). El juez SLA castigaba al coach por irse a inglés
puro (i+3) con un A1. Tres cambios COHERENTES, todos reescritura conductual (no reglas nuevas):
  A) level.modifier A1           -> español es el ancla permanente; el inglés crece de a poco.
  B) level_policy A1 hint_policy  -> ante traba, espejo en español inmediato (no plan C).
  C) behavioral_guard g19 (early_child, anti-silencio) -> español = piso seguro, sin sacar input EN.
error_policy A1 NO se toca (ya está bien). spanish_mirror no se lee en el prompt (campo muerto).

REVERSIBLE: backup JSON de las filas ANTES de tocar. Verifica que cada `old` matchee la BD viva;
si no matchea (ya cambió), aborta ese cambio. Idempotente (si ya está el `new`, lo saltea).

Uso: python scripts/apply_lever_andamiaje_a1.py          (aplica)
     python scripts/apply_lever_andamiaje_a1.py --revert <backup.json>   (revierte)
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

# (descripción, SELECT de la fila actual, UPDATE, params_where, old_esperado, new)
CHANGES = [
    {
        "tag": "A·level.modifier A1",
        "sel": ("SELECT modifier AS v FROM `level` WHERE level_code='A1'", ()),
        "upd": ("UPDATE `level` SET modifier=%s WHERE level_code='A1'", None),
        "old": "Espejo en español DINÁMICO: cuando el alumno se traba o lo necesita, NO en cada turno. Vocabulario simple, no telegráfico.",
        "new": "Hablás casi siempre en español; el inglés entra de a poco, cada dosis con su eco en español pegado. Si el alumno se suelta o tira inglés solo, festejalo pero seguí anclando, sin subir la dosis de golpe. Inglés simple, con sentido, no telegráfico.",
        "maxlen": 255,
    },
    {
        "tag": "B·level_policy A1 hint_policy",
        "sel": ("SELECT body AS v FROM level_policy WHERE level_code='A1' AND kind='hint_policy'", ()),
        "upd": ("UPDATE level_policy SET body=%s, source='proposed' WHERE level_code='A1' AND kind='hint_policy'", None),
        "old": "Escalera: (1) espera 3-5s + gesto, (2) recast en inglés simple, (3) traducción parcial si persiste bloqueo",
        "new": "Ante traba: dale 2-3s, después espejá en español enseguida y volvé a ofrecer el modelo corto en inglés para que lo imite. El español baja la ansiedad primero; el inglés se reintenta después, sin presión.",
        "maxlen": 300,
    },
    {
        "tag": "C·behavioral_guard g19 (early_child anti-silencio)",
        "sel": ("SELECT body AS v FROM behavioral_guard WHERE guard_id=19", ()),
        "upd": ("UPDATE behavioral_guard SET body=%s WHERE guard_id=19", None),
        "old": "Ante silencio del nene: NUNCA repitas la misma frase 2x. Reformulá DESDE lo último que dijo (su nombre, 'she is happy') en un modelo nuevo y corto en EN; si sigue callado, ofrecé UNA elección concreta. El español acompaña, no reemplaza el input EN.",
        "new": "Ante silencio del nene: NUNCA repitas la misma frase 2x. Apoyate en español para bajar la tensión y desde ahí ofrecé un modelo nuevo y corto en inglés (partiendo de lo último que dijo: su nombre, 'she is happy'); si sigue callado, dale UNA elección concreta. Siempre dejá un modelo en inglés para imitar.",
        "maxlen": 400,
    },
]


def _backup(db):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(os.path.dirname(__file__), f"_backup_lever_andamiaje_a1_{ts}.json")
    snap = []
    for ch in CHANGES:
        r = db.q1(*ch["sel"])
        snap.append({"tag": ch["tag"], "upd": ch["upd"][0], "value": r["v"] if r else None})
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"ts": ts, "rows": snap}, f, ensure_ascii=False, indent=2)
    return path


def apply():
    db = motor_engine._connect()
    try:
        path = _backup(db)
        print(f"[backup] {path}\n")
        for ch in CHANGES:
            cur_val = (db.q1(*ch["sel"]) or {}).get("v")
            if cur_val == ch["new"]:
                print(f"[skip]  {ch['tag']} — ya aplicado"); continue
            if cur_val != ch["old"]:
                print(f"[ABORT] {ch['tag']} — la BD NO matchea el `old` esperado.\n"
                      f"        BD={cur_val!r}\n        old={ch['old']!r}"); continue
            if len(ch["new"]) > ch["maxlen"]:
                print(f"[ABORT] {ch['tag']} — new excede {ch['maxlen']} chars ({len(ch['new'])})"); continue
            with db.conn.cursor() as c:
                c.execute(ch["upd"][0], (ch["new"],))
            db.conn.commit()
            print(f"[OK]    {ch['tag']} ({len(ch['new'])} chars)\n        -> {ch['new'][:90]}...")
        print("\n[done] lever andamiaje A1 aplicado. Revertí con: --revert " + os.path.basename(path))
    finally:
        db.conn.close()


def revert(path):
    db = motor_engine._connect()
    try:
        data = json.load(open(path, encoding="utf-8"))
        for row in data["rows"]:
            with db.conn.cursor() as c:
                c.execute(row["upd"], (row["value"],))
            db.conn.commit()
            print(f"[revert] {row['tag']} -> {str(row['value'])[:70]}...")
        print("[done] revertido al estado del backup.")
    finally:
        db.conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--revert":
        revert(sys.argv[2])
    else:
        apply()

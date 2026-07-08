"""LEVER #2 — Romper el carrusel + capitalizar la historia (consensuado con la especialista).
El cuello REAL del score (no el code-switch ni el modelo: el test de techo con gpt-oss dio igual
que el Flash -> el techo es la orquestación). Dos problemas que ataca, todo en `trigger_template`
(capa 9, reescritura conductual, cero regla nueva):
  (1) CARRUSEL: el coach hace "valido+recast+pregunto algo nuevo" mecánico ("entrevista vs charla",
      naturalidad ~6.9). Fix: tirá del HILO que el alumno abrió 1-2 turnos antes de cambiar de tema.
  (2) CONTINUITY PLANA: historia 0->3 no levanta el score (el opening re-presenta en frío cada vez).
      Fix: si hay learner_state, abrir retomando algo CONCRETO de la clase pasada, no re-presentarse.
4 cambios: continuation kid (id=2) + adult (id=8); opening kid (id=1) + adult (id=7).

REVERSIBLE: backup + verificación de `old` contra BD viva. Idempotente.
Uso: python scripts/apply_lever_carrusel.py        |  ... --revert scripts/<backup.json>
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

_UPD = "UPDATE trigger_template SET body=%s WHERE template_id=%s"
_SEL = "SELECT body AS v FROM trigger_template WHERE template_id=%s"
CHANGES = [
    {
        "tag": "kid/continuation id=2", "id": 2, "maxlen": 500,
        "old": "Reacción CONDICIONADA, no secuencia fija: (1) si el nene aporta algo (aunque sea en español), validá su SIGNIFICADO primero. (2) recast natural en EN, remodelando SU idea o el chunk objetivo. (3) invitalo a intentarlo o a expandir. Nunca carrusel mecánico ni frase fija.",
        "new": "Reacción CONDICIONADA, no secuencia fija: (1) validá el SIGNIFICADO de lo que el nene trae; si abrió algo suyo (su perro, su hermano, su juego), SEGUÍ ESE HILO: preguntale más de eso 1-2 turnos antes de cambiar de tema. (2) recast natural en EN remodelando SU idea. (3) invitalo a contar más. Charlá, no entrevistes; cambiá de tema solo cuando el hilo se agota. Nunca carrusel mecánico.",
    },
    {
        "tag": "adult/continuation id=8", "id": 8, "maxlen": 500,
        "old": "Cada turno: (1) reaccioná al sentido; (2) recast NATURAL inline del error principal reformulando SU frase, sin frenar el flujo (no lo guardes para el cierre); (3) una situación por turno hacia {objective}. Sin castellano; pistas si se traba >3s.",
        "new": "Cada turno: (1) reaccioná al sentido y, si el alumno abrió un hilo suyo (su trabajo, un viaje, una opinión), QUEDATE en ese hilo: preguntá algo concreto de eso y dejá que lo desarrolle; (2) recast NATURAL inline del error principal reformulando SU frase, sin frenar el flujo; (3) recién cuando el hilo se agota, llevalo a {objective}. Charla, no entrevista: una pregunta por turno, sin castellano; pistas si se traba >3s.",
    },
    {
        "tag": "kid/opening id=1", "id": 1, "maxlen": 500,
        "old": "Saludá con energía como {tutor} (variá el saludo cada clase), presentá el mundo '{topic}' y enganchá. Modelá UNA frase EN corta y con SENTIDO (patrón 'This is my…/I have a…') y que el nene la diga entera o cuente algo suyo. NUNCA pidas repetir una palabra suelta.",
        "new": "Si ya hubo clases con {name} (mirá learner_state), NO te re-presentes: abrí retomando algo CONCRETO de la vez pasada ('¿Te acordás de…?') y llevalo a '{topic}'. Si es la primera, saludá con energía como {tutor}. Modelá UNA frase EN corta y con SENTIDO ('This is my…/I have a…') y que el nene la diga entera o cuente algo suyo. NUNCA pidas una palabra suelta.",
    },
    {
        "tag": "adult/opening id=7", "id": 7, "maxlen": 500,
        "old": "Presentate como {tutor}, bienvenida a {name}, presentá el escenario '{topic}' y la primera consigna.",
        "new": "Si ya tuviste clases con {name} (mirá learner_state), NO te re-presentes: abrí retomando algo CONCRETO de la charla pasada ('La otra vez me contaste de…') y enganchá con '{topic}'. Si es la primera clase, presentate como {tutor} y dale la bienvenida. Luego, la primera consigna.",
    },
]


def _backup(db):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(os.path.dirname(__file__), f"_backup_lever_carrusel_{ts}.json")
    snap = [{"tag": c["tag"], "id": c["id"], "value": (db.q1(_SEL, (c["id"],)) or {}).get("v")} for c in CHANGES]
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"ts": ts, "rows": snap}, f, ensure_ascii=False, indent=2)
    return path


def apply():
    db = motor_engine._connect()
    try:
        print(f"[backup] {_backup(db)}\n")
        for ch in CHANGES:
            cur = (db.q1(_SEL, (ch["id"],)) or {}).get("v")
            if cur == ch["new"]:
                print(f"[skip]  {ch['tag']} — ya aplicado"); continue
            if cur != ch["old"]:
                print(f"[ABORT] {ch['tag']} — BD no matchea `old`.\n  BD={cur!r}"); continue
            if len(ch["new"]) > ch["maxlen"]:
                print(f"[ABORT] {ch['tag']} — new excede {ch['maxlen']} ({len(ch['new'])})"); continue
            with db.conn.cursor() as c:
                c.execute(_UPD, (ch["new"], ch["id"]))
            db.conn.commit()
            print(f"[OK]    {ch['tag']} ({len(ch['new'])} chars)")
        print("\n[done] lever carrusel aplicado.")
    finally:
        db.conn.close()


def revert(path):
    db = motor_engine._connect()
    try:
        for row in json.load(open(path, encoding="utf-8"))["rows"]:
            with db.conn.cursor() as c:
                c.execute(_UPD, (row["value"], row["id"]))
            db.conn.commit()
            print(f"[revert] {row['tag']}")
        print("[done] revertido.")
    finally:
        db.conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--revert":
        revert(sys.argv[2])
    else:
        apply()

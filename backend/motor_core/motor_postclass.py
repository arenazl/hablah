"""
Post-clase · cierra el ciclo del motor.

Toma el resultado de una sesión (qué objetivos/léxico se practicaron y con qué
desempeño, qué errores aparecieron) y actualiza la memoria del alumno con una
escalera SRS simple, registra los errores y cierra la sesión. Así la próxima
clase ve menos 'due'/'nuevo' y no repite lo dominado.

Escalera (sobre el schema v3, sin columnas extra):
  good    : nuevo/learning -> due (+3d) ; due -> mastered ; mastered -> mastered
  partial : -> learning (+1d)
  fail    : -> learning (+1d)
"""
from __future__ import annotations
from motor_prompt import MotorDB


def _next_state(prev: str | None, score: str):
    """Devuelve (nuevo_status, intervalo_dias|None). None = mastered (sin due)."""
    if score == "good":
        if prev in ("due", "mastered"):
            return "mastered", None
        return "due", 3                      # nuevo / learning -> due en 3 días
    return "learning", 1                     # partial | fail


def _exec(db: MotorDB, sql: str, params=()):
    with db.conn.cursor() as cur:
        cur.execute(sql, params)


def _due_clause(days):
    return "NULL" if days is None else f"DATE_ADD(NOW(), INTERVAL {int(days)} DAY)"


def record_objective(db: MotorDB, student_id: int, objective_id: int, score: str) -> str:
    prev = db.q1("SELECT status FROM learner_objective WHERE student_id=%s AND objective_id=%s",
                 (student_id, objective_id))
    status, days = _next_state(prev["status"] if prev else None, score)
    _exec(db,
          f"""INSERT INTO learner_objective (student_id,objective_id,status,last_seen,due_at)
              VALUES (%s,%s,%s,NOW(),{_due_clause(days)})
              ON DUPLICATE KEY UPDATE status=VALUES(status), last_seen=NOW(), due_at=VALUES(due_at)""",
          (student_id, objective_id, status))
    return status


def record_item(db: MotorDB, student_id: int, item_type: str, value: str, score: str) -> str:
    row = db.q1("""SELECT item_id, status FROM learner_item
                   WHERE student_id=%s AND item_type=%s AND item_value=%s LIMIT 1""",
                (student_id, item_type, value))
    status, days = _next_state(row["status"] if row else None, score)
    if row:
        _exec(db, f"""UPDATE learner_item SET status=%s, last_seen=NOW(),
                      due_at={_due_clause(days)} WHERE item_id=%s""",
              (status, row["item_id"]))
    else:
        _exec(db, f"""INSERT INTO learner_item (student_id,item_type,item_value,status,last_seen,due_at)
                      VALUES (%s,%s,%s,%s,NOW(),{_due_clause(days)})""",
              (student_id, item_type, value, status))
    return status


def record_error(db: MotorDB, student_id: int, text: str):
    """Un error observado entra como item 'error' agendado para repaso."""
    record_item(db, student_id, "error", text, "fail")


def close_session(db: MotorDB, session_id: int, outcomes: dict) -> dict:
    """
    outcomes = {
      "objectives": [(objective_id, "good"|"partial"|"fail"), ...],
      "lexis":      [("word"|"phrase", valor, score), ...],
      "errors":     ["...", ...],
    }
    """
    ses = db.q1("SELECT * FROM session WHERE session_id=%s", (session_id,))
    if not ses:
        raise ValueError(f"session {session_id} inexistente")
    sid = ses["student_id"]
    report = {"objectives": {}, "lexis": {}, "errors": list(outcomes.get("errors", []))}

    for oid, score in outcomes.get("objectives", []):
        report["objectives"][oid] = record_objective(db, sid, oid, score)
    for typ, val, score in outcomes.get("lexis", []):
        report["lexis"][val] = record_item(db, sid, typ, val, score)
    for e in outcomes.get("errors", []):
        record_error(db, sid, e)

    _exec(db, """UPDATE session SET ended_at=NOW(), current_phase='Phase 4', `signal`='flowing'
                 WHERE session_id=%s""", (session_id,))
    db.conn.commit()
    return report


# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    db = MotorDB(unix_socket="/tmp/mysql.sock", user="root", database="m3")

    def obj_id(code):
        return db.q1("SELECT objective_id FROM language_objective WHERE code=%s", (code,))["objective_id"]

    def snapshot(sid):
        rows = db.q("""SELECT lo.code, lo.description, luo.status
                       FROM learner_objective luo JOIN language_objective lo
                         ON lo.objective_id=luo.objective_id
                       WHERE luo.student_id=%s ORDER BY lo.code""", (sid,))
        return [(r["code"], r["status"]) for r in rows]

    sid = 2  # Caro
    ses = db.q1("SELECT session_id FROM session WHERE student_id=%s ORDER BY started_at DESC LIMIT 1", (sid,))
    print("ANTES (learner_objective de Caro):", snapshot(sid))

    outcomes = {
        "objectives": [(obj_id("B2-GRA-01"), "good"),    # segundo condicional, venía 'due' -> mastered
                       (obj_id("B2-VOC-01"), "partial")],  # colocaciones, nuevo -> learning
        "lexis": [("phrase", "They should have pressed higher", "good"),
                  ("word", "Offside", "good")],
        "errors": ["present perfect vs past simple"],
    }
    rep = close_session(db, ses["session_id"], outcomes)
    print("APLICADO:", rep["objectives"])
    print("DESPUÉS  (learner_objective de Caro):", snapshot(sid))
    print("\n-> la próxima clase: 'segundo condicional' ya no entra (mastered);")
    print("   'colocaciones' queda como learning; el error queda agendado para repaso.")

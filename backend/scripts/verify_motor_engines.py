"""Verifica los 2 motores canónicos (Motor-Learning/motor_prompt.py + motor_postclass.py)
corriendo contra la base real (Aiven). Solo cambia la conexión a MotorDB, como pediste.

NO reimplementa nada: importa tus archivos tal cual desde Motor-Learning/.
"""
import os
import ssl
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
# los 2 motores viven en Motor-Learning/ (los 3 archivos del motor)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "Motor-Learning"))

from core.config import settings
import motor_prompt
import motor_postclass


def _motordb() -> "motor_prompt.MotorDB":
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return motor_prompt.MotorDB(
        host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
        password=settings.DB_PASSWORD, database=settings.DB_NAME, ssl=ctx)


def main() -> None:
    db = _motordb()
    print(">>> conexión Aiven OK\n")

    # 1) prompt por alumno (Caro = student 2)
    print("=" * 70, "\n# build_stack(db, 2) -> render_prompt   [Caro · B2 · Fútbol]\n", "=" * 70)
    print(motor_prompt.preview(db, 2))

    # 2) playground por parámetros: misma banda/nivel/tópico SIN alumno
    print("\n", "=" * 70, "\n# build_stack_params(adult, B2, topic 7) — playground sin alumno\n", "=" * 70)
    stack = motor_prompt.build_stack_params(db, "adult", "B2", topic_id=7)
    print(motor_prompt.render_prompt(stack)[:900], "...\n")

    # 3) test_overrides EN MEMORIA: saco un guard y agrego uno, sin tocar la DB
    print("=" * 70, "\n# test_overrides en memoria (jugar con guards, sin persistir)\n", "=" * 70)
    base = motor_prompt.build_stack(db, 2)["behavioral_guards"]
    test = motor_prompt.build_stack(db, 2, test_overrides=[
        {"slot": "behavioral_guard", "action": "add", "body": "PRUEBA: foco en colocaciones"}])["behavioral_guards"]
    print(f"guards base:  {len(base)}  | con override en memoria: {len(test)}")
    print(f"último guard (memoria): {test[-1]}")

    # 4) postclass (SRS): snapshot antes/después de Caro
    print("\n", "=" * 70, "\n# motor_postclass.close_session — SRS de Caro\n", "=" * 70)

    def snap():
        rows = db.q("""SELECT lo.code, luo.status FROM learner_objective luo
                       JOIN language_objective lo ON lo.objective_id=luo.objective_id
                       WHERE luo.student_id=2 ORDER BY lo.code""")
        return [(r["code"], r["status"]) for r in rows]

    oid = lambda c: db.q1("SELECT objective_id FROM language_objective WHERE code=%s", (c,))["objective_id"]
    ses = db.q1("SELECT session_id FROM session WHERE student_id=2 ORDER BY started_at DESC LIMIT 1")
    print("ANTES :", snap())
    rep = motor_postclass.close_session(db, ses["session_id"], {
        "objectives": [(oid("B2-GRA-01"), "good"), (oid("B2-VOC-01"), "partial")],
        "lexis": [("word", "Offside", "good")],
        "errors": ["present perfect vs past simple"],
    })
    print("APLICADO:", rep["objectives"])
    print("DESPUÉS:", snap())


if __name__ == "__main__":
    main()

"""
demo_db.py — corrida end-to-end contra MySQL.

Requisitos previos:
  1) pip install mysql-connector-python
  2) crear la base y cargar:  mysql -u USER -p language_engine < schema.sql
                              mysql -u USER -p language_engine < seed.sql
  3) ajustar las credenciales abajo (o por variables de entorno).

Corre:  python demo_db.py
"""
import os
import uuid
import repository as R
import pipeline as P
from pipeline import Session, TurnResult


def main():
    conn = R.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_NAME", "language_engine"),
        port=int(os.getenv("DB_PORT", "3306")),
    )
    repo = R.Repo(conn)

    # ---- PRE-CLASE: arma el único prompt ----
    prompt, topic = P.pre_class(repo, student_id=1)
    print("Tópico elegido por el sequencer:", topic.title)
    print("-" * 78)
    print(prompt)
    print("-" * 78)

    # ---- POST-CLASE: la app registró estos resultados en vivo ----
    session = Session(
        session_id=str(uuid.uuid4()),
        student_id=1,
        topic_title=topic.title,
        turns=24,
        duration_s=480,
        completed=True,
        affective="engaged",
        results=[TurnResult("Booking", "ok"), TurnResult("Issue", "struggled")],
        transcript="(acá iría la transcripción real de la charla)",
    )

    # con stub (sin IA). Para Gemini:
    #   analyzer = P.gemini_analyzer_factory(mi_wrapper_de_gemini)
    #   P.post_class(repo, session, analyzer)
    P.post_class(repo, session)
    print("Post-clase ejecutado: SRS actualizado + log/insights escritos.")

    conn.close()


if __name__ == "__main__":
    main()

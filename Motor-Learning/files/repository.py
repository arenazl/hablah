"""
repository.py — capa de acceso a MySQL.

Encapsula TODAS las consultas. El resto del sistema (engine, pipeline) no sabe
SQL. Usa parámetros (%s) siempre, nunca f-strings en las queries.

Requiere:  pip install mysql-connector-python
"""
from __future__ import annotations
import json
import datetime
from typing import Optional
import mysql.connector

from engine import Topic, Student, LearnerState


def connect(host="localhost", user="root", password="", database="language_engine", port=3306):
    return mysql.connector.connect(host=host, user=user, password=password,
                                   database=database, port=port, autocommit=False)


class Repo:
    def __init__(self, conn):
        self.conn = conn

    def _cur(self):
        return self.conn.cursor(dictionary=True)

    # ---------------- Alumno (capa 5) ----------------
    def get_student(self, student_id: int) -> Optional[Student]:
        cur = self._cur()
        cur.execute("SELECT name, age, level, native_dialect, barrier FROM students WHERE id=%s", (student_id,))
        row = cur.fetchone()
        cur.close()
        if not row:
            return None
        interests = [r["interest"] for r in self.get_interests(student_id)]
        return Student(name=row["name"], age=row["age"], level=row["level"],
                       interests=interests, native_dialect=row["native_dialect"], barrier=row["barrier"])

    # ---------------- Kit / catálogo (onboarding -> sequencer) ----------------
    def get_kit(self, student_id: int) -> list[Topic]:
        cur = self._cur()
        cur.execute("""
            SELECT c.name AS category, sc.name AS subcategory, t.title, t.objective, t.vocab, t.phrases
            FROM student_topic_kit k
            JOIN topics t        ON t.id = k.topic_id
            JOIN subcategories sc ON sc.id = t.subcategory_id
            JOIN categories c     ON c.id = sc.category_id
            WHERE k.student_id = %s
        """, (student_id,))
        rows = cur.fetchall()
        cur.close()
        return [Topic(category=r["category"], subcategory=r["subcategory"], title=r["title"],
                      objective=r["objective"], vocab=_j(r["vocab"]), phrases=_j(r["phrases"])) for r in rows]

    def topic_id_by_title(self, title: str) -> Optional[int]:
        cur = self._cur()
        cur.execute("SELECT id FROM topics WHERE title=%s LIMIT 1", (title,))
        row = cur.fetchone()
        cur.close()
        return row["id"] if row else None

    # ---------------- SRS / memoria (capa 5b: learner_state) ----------------
    def get_vocab_progress(self, student_id: int) -> dict[str, dict]:
        cur = self._cur()
        cur.execute("""SELECT item, skill_stage, status, seen_count, success_count, fail_count,
                              ease, last_seen, next_review
                       FROM vocab_progress WHERE student_id=%s""", (student_id,))
        rows = cur.fetchall()
        cur.close()
        return {r["item"]: r for r in rows}

    def due_items(self, student_id: int, today: Optional[datetime.date] = None) -> set[str]:
        today = today or datetime.date.today()
        cur = self._cur()
        cur.execute("""SELECT item FROM vocab_progress
                       WHERE student_id=%s AND next_review IS NOT NULL AND next_review <= %s""",
                    (student_id, today))
        items = {r["item"] for r in cur.fetchall()}
        cur.close()
        return items

    def build_learner_state(self, student_id: int, today: Optional[datetime.date] = None) -> LearnerState:
        prog = self.get_vocab_progress(student_id)
        due = self.due_items(student_id, today)
        mastered = [i for i, r in prog.items() if r["status"] == "mastered"]
        learning = [i for i, r in prog.items() if r["status"] == "learning"]
        errors = [r["item"] for r in self.reinforcement_items(student_id)]
        return LearnerState(mastered=mastered, learning=learning,
                            due_for_review=sorted(due), recent_errors=errors)

    def upsert_vocab_progress(self, student_id: int, item: dict):
        cur = self._cur()
        cur.execute("""
            INSERT INTO vocab_progress
              (student_id, item, skill_stage, status, seen_count, success_count, fail_count, ease, last_seen, next_review)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE
              skill_stage=VALUES(skill_stage), status=VALUES(status), seen_count=VALUES(seen_count),
              success_count=VALUES(success_count), fail_count=VALUES(fail_count), ease=VALUES(ease),
              last_seen=VALUES(last_seen), next_review=VALUES(next_review)
        """, (student_id, item["item"], item.get("skill_stage", "repeat"), item.get("status", "new"),
              item.get("seen_count", 0), item.get("success_count", 0), item.get("fail_count", 0),
              item.get("ease", 2.5), item.get("last_seen"), item.get("next_review")))
        cur.close()

    def enqueue_reinforcement(self, student_id: int, item: str, reason: str, priority: int = 1):
        cur = self._cur()
        cur.execute("INSERT INTO reinforcement_queue (student_id, item, reason, priority) VALUES (%s,%s,%s,%s)",
                    (student_id, item, reason, priority))
        cur.close()

    def reinforcement_items(self, student_id: int, limit: int = 10) -> list[dict]:
        cur = self._cur()
        cur.execute("""SELECT item, reason FROM reinforcement_queue
                       WHERE student_id=%s ORDER BY priority DESC, created_at DESC LIMIT %s""",
                    (student_id, limit))
        rows = cur.fetchall()
        cur.close()
        return rows

    # ---------------- Intereses (capa 5 + sequencer) ----------------
    def get_interests(self, student_id: int) -> list[dict]:
        cur = self._cur()
        cur.execute("SELECT interest, source, weight FROM student_interests WHERE student_id=%s", (student_id,))
        rows = cur.fetchall()
        cur.close()
        return rows

    def upsert_interest(self, student_id: int, interest: str, source: str = "detected", weight_delta: float = 0.5):
        cur = self._cur()
        cur.execute("""
            INSERT INTO student_interests (student_id, interest, source, weight, last_seen)
            VALUES (%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE weight = weight + %s, last_seen = VALUES(last_seen)
        """, (student_id, interest, source, 1.0, datetime.date.today(), weight_delta))
        cur.close()

    def upsert_trait(self, student_id: int, trait: str, confidence: float):
        cur = self._cur()
        cur.execute("""
            INSERT INTO student_traits (student_id, trait, confidence) VALUES (%s,%s,%s)
            ON DUPLICATE KEY UPDATE confidence = GREATEST(confidence, VALUES(confidence)), updated_at = NOW()
        """, (student_id, trait, confidence))
        cur.close()

    # ---------------- Sesión ----------------
    def insert_session_log(self, session_id: str, student_id: int, topic_id: Optional[int],
                           turns: int, duration_s: int, completed: bool, affective: Optional[str]):
        cur = self._cur()
        cur.execute("""INSERT INTO session_log
                       (session_id, student_id, topic_id, turns, duration_s, completed, affective)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                    (session_id, student_id, topic_id, turns, duration_s, int(completed), affective))
        cur.close()

    def insert_session_insights(self, session_id: str, data: dict):
        cur = self._cur()
        cur.execute("""INSERT INTO session_insights
                       (session_id, summary, new_interests, items_to_reinforce, suggested_topic, notes)
                       VALUES (%s,%s,%s,%s,%s,%s)""",
                    (session_id, data.get("summary"), json.dumps(data.get("new_interests", [])),
                     json.dumps(data.get("items_to_reinforce", [])), data.get("suggested_topic"),
                     data.get("notes")))
        cur.close()

    def commit(self):
        self.conn.commit()


def _j(v):
    """Las columnas JSON pueden volver como str o ya parseadas según el driver."""
    if isinstance(v, (list, dict)):
        return v
    return json.loads(v) if v else []

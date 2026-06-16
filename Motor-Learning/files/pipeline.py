"""
pipeline.py — orquesta el circuito completo usando engine + repository.

  pre_class(repo, student_id)            -> (prompt, topic)   [camino en tiempo real]
  post_class(repo, session, analyzer)    -> None              [paso posterior, async]

El camino en tiempo real es 100% determinista (sin IA). La IA aparece SOLO en el
post-clase, a través de `analyzer`, que está fuera del path de latencia.
"""
from __future__ import annotations
import datetime
from dataclasses import dataclass, field
from typing import Optional, Callable

import engine
from engine import Student, Topic, LearnerState


# ============================================================================
#  PRE-CLASE  (sequencer -> composer -> un solo prompt)
# ============================================================================
def pre_class(repo, student_id: int, today: Optional[datetime.date] = None) -> tuple[str, Optional[Topic]]:
    student = repo.get_student(student_id)
    if student is None:
        raise ValueError(f"student {student_id} no existe")

    kit = repo.get_kit(student_id)
    due = repo.due_items(student_id, today)
    interest_weight = _interest_weight_by_category(repo, kit, student_id)

    topic = engine.pick_topic(kit, due, interest_weight, today)
    if topic is None:
        raise ValueError("el alumno no tiene tópicos en el kit (onboarding incompleto)")

    learner = repo.build_learner_state(student_id, today)
    prompt = engine.compose_stack(student, topic, learner, target_date=today)
    return prompt, topic


def _interest_weight_by_category(repo, kit, student_id) -> dict[str, float]:
    """Suma de pesos de interés del alumno mapeados a las categorías de su kit."""
    interests = {r["interest"].lower(): r["weight"] for r in repo.get_interests(student_id)}
    weights: dict[str, float] = {}
    for t in kit:
        cat = t.category
        # match laxo: si algún interés aparece en el nombre de la categoría
        w = sum(wt for name, wt in interests.items() if name in cat.lower() or cat.lower() in name)
        weights[cat] = max(weights.get(cat, 0.0), w)
    return weights


# ============================================================================
#  POST-CLASE  (dos mitades: determinista + cualitativa por IA)
# ============================================================================
@dataclass
class TurnResult:
    """Lo que la app registró en vivo por cada ítem objetivo de la sesión."""
    item: str
    result: str  # "ok" | "struggled" | "fail"


@dataclass
class Session:
    session_id: str
    student_id: int
    topic_title: str
    turns: int
    duration_s: int
    completed: bool
    affective: Optional[str]                 # engaged | neutral | frustrated
    results: list[TurnResult] = field(default_factory=list)
    transcript: str = ""                      # para la mitad cualitativa


# Contrato del analizador (la IA del post-clase). Devuelve un dict con:
#   summary, affective, new_interests[], traits[{trait,confidence}],
#   items_to_reinforce[], suggested_topic
Analyzer = Callable[[Session, Student], dict]


def stub_analyzer(session: "Session", student: "Student") -> dict:
    """Stub sin IA, para correr el pipeline sin API. Reemplazar por Gemini (ver abajo)."""
    return {"summary": "", "affective": session.affective, "new_interests": [],
            "traits": [], "items_to_reinforce": [], "suggested_topic": ""}


def post_class(repo, session: Session, analyzer: Analyzer = stub_analyzer,
               today: Optional[datetime.date] = None) -> None:
    today = today or datetime.date.today()
    student = repo.get_student(session.student_id)

    # ----- MITAD A: determinista (sin IA), de los contadores en vivo -----
    progress = repo.get_vocab_progress(session.student_id)
    for tr in session.results:
        row = progress.get(tr.item, {"item": tr.item, "seen_count": 0, "success_count": 0,
                                     "fail_count": 0, "ease": 2.5, "status": "new"})
        engine.srs_update(row, tr.result, today)
        repo.upsert_vocab_progress(session.student_id, row)
        if tr.result == "fail":
            repo.enqueue_reinforcement(session.student_id, tr.item, reason="failed")

    topic_id = repo.topic_id_by_title(session.topic_title)
    repo.insert_session_log(session.session_id, session.student_id, topic_id,
                            session.turns, session.duration_s, session.completed, session.affective)

    # ----- MITAD B: cualitativa (1 llamada a IA, async) -----
    insights = analyzer(session, student)
    for it in insights.get("new_interests", []):
        repo.upsert_interest(session.student_id, it, source="detected")
    for tr in insights.get("traits", []):
        repo.upsert_trait(session.student_id, tr["trait"], float(tr.get("confidence", 0.5)))
    repo.insert_session_insights(session.session_id, insights)

    repo.commit()


# ============================================================================
#  HOOK PARA GEMINI  (mitad cualitativa) — reemplaza a stub_analyzer
# ============================================================================
def gemini_analyzer_factory(call_model: Callable[[str], str]) -> Analyzer:
    """
    Devuelve un Analyzer que arma el prompt de análisis y parsea el JSON.
    `call_model(prompt) -> str` es tu wrapper de Gemini (lo inyectás vos).
    """
    import json

    def analyze(session: Session, student: Student) -> dict:
        prompt = (
            "<analysis_task>\n"
            "  Sos un analista pedagógico. Leé la transcripción y devolvé SOLO el JSON del contrato.\n"
            "  No inventes datos: si algo no aparece, devolvé lista vacía.\n"
            "</analysis_task>\n"
            f"<student_context>\n  Name: {student.name} | Age: {student.age} | Level: {student.level} | "
            f"Interests: {', '.join(student.interests)}\n</student_context>\n"
            f"<session_target>\n  Topic: {session.topic_title}\n</session_target>\n"
            f"<transcript>\n{session.transcript}\n</transcript>\n"
            "<output_contract>\n"
            "  { summary, affective, new_interests[], traits[{trait,confidence}], items_to_reinforce[], suggested_topic }\n"
            "</output_contract>"
        )
        raw = call_model(prompt)
        try:
            return json.loads(raw)
        except Exception:
            # fallback: si el JSON no parsea, guardamos solo la mitad determinista
            return {"summary": "", "affective": session.affective, "new_interests": [],
                    "traits": [], "items_to_reinforce": [], "suggested_topic": ""}

    return analyze


if __name__ == "__main__":
    print("pipeline.py — importar y usar pre_class()/post_class() con un Repo de repository.py.")
    print("Para una demo end-to-end con MySQL, ver el README/seed.")

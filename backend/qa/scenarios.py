"""Suites de escenarios de test — combinaciones predefinidas que se pueden
ejecutar con scripts/qa_run.py --suite <name>.

Cada Scenario es topic + persona + n_turns + descripcion.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class Scenario:
    name: str
    persona: str  # key de PERSONAS
    topic_id: Optional[int] = None
    free_topic: Optional[str] = None  # si es free topic, no topic_id
    description: str = ""


# ─── Suites ─────────────────────────────────────────────────────────────

# Smoke: 3 escenarios rapidos para chequear que la app esta viva
SUITE_SMOKE: list[Scenario] = [
    Scenario(
        name="smoke_intermediate",
        persona="intermediate_b1",
        topic_id=1,  # asume primer topic existe
        description="Sesion normal B1 — happy path",
    ),
    Scenario(
        name="smoke_free_topic",
        persona="intermediate_b1",
        free_topic="my last trip to Berlin",
        description="Tema libre + B1 — flujo nuevo de auto-topic",
    ),
    Scenario(
        name="smoke_beginner",
        persona="beginner_a1",
        topic_id=1,
        description="A1 con errores — el coach debe acomodar el nivel",
    ),
]

# Stress: prueba todas las personas contra el mismo topic
def suite_stress(topic_id: int) -> list[Scenario]:
    return [
        Scenario(name=f"stress_{p}_{topic_id}", persona=p, topic_id=topic_id,
                 description=f"Topic {topic_id} con persona {p}")
        for p in ["beginner_a1", "intermediate_b1", "advanced_c1",
                  "silent", "off_topic"]
    ]

# Quality: cobertura de los flujos clave
SUITE_QUALITY: list[Scenario] = [
    Scenario(name="qual_open_chat", persona="free_topic_voice",
             topic_id=166,  # open-chat curated topic
             description="Open chat (Tema libre) — coach pregunta, user dice topic por voz, coach pivotea"),
    Scenario(name="qual_off_topic", persona="off_topic",
             topic_id=1,
             description="Alumno que desvia constantemente — testea redirect"),
    Scenario(name="qual_silent", persona="silent",
             topic_id=1,
             description="Alumno monosilabico — testea que el coach sostiene la charla"),
    Scenario(name="qual_advanced_topic", persona="advanced_c1",
             topic_id=1,
             description="C1 polemico sobre topic curado — testea engagement"),
    Scenario(name="qual_kid_distracted", persona="distracted_kid",
             topic_id=1,
             description="Distraido — testea redirect natural"),
]


SUITES: dict[str, list[Scenario]] = {
    "smoke": SUITE_SMOKE,
    "quality": SUITE_QUALITY,
}


def get_suite(name: str) -> list[Scenario]:
    if name in SUITES:
        return SUITES[name]
    if name.startswith("stress:"):
        try:
            topic_id = int(name.split(":", 1)[1])
        except ValueError:
            raise ValueError(f"Stress suite necesita topic_id, ej 'stress:5'")
        return suite_stress(topic_id)
    raise ValueError(f"Suite '{name}' no existe. Opciones: {list(SUITES.keys())} o 'stress:<topic_id>'")

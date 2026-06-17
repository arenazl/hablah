"""Composer v2 — arma el prompt SELECCIONANDO reglas del catálogo (no texto libre).

El motor de verdad: dado (banda, nivel, tópico), filtra la tabla `rules` por el
'aplica_a' de cada regla y concatena por bloque. El eje + aplica_a de cada regla ES la
lógica de armado (banda:X → entra si la banda es X; nivel:Y → si el nivel es Y; todos →
siempre). Fuente del modelo: Motor-Learning/catalogo_reglas_motor.xlsx.

Los slots RUNTIME (student_profile, learner_state, interaction_state) y el TÓPICO no son
reglas de texto: se inyecta el dato vivo (alumno / memoria / tópico elegido).
"""
from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import select
from models.rule import Rule

# La base usa segmentos mini/junior/tween/adult; el catálogo usa bandas del Excel.
SEG_TO_BANDA = {"mini": "early_child", "junior": "child", "tween": "teen", "adult": "adult"}

# Orden de los slots (incluye los runtime intercalados, como el stack del Excel).
SLOT_ORDER = ["1", "2", "3", "4", "5", "5b", "6", "7", "8", "9", "9b"]


def _slot_key(bloque: str) -> str:
    """'6 behavioral_guards' -> '6' ; '5b learner_state' -> '5b'."""
    return (bloque or "").split(" ", 1)[0].strip()


def _tag(bloque: str) -> str:
    parts = (bloque or "").split(" ", 1)
    return parts[1].strip() if len(parts) > 1 else (bloque or "block")


def _matches(aplica_a: str, banda: str, nivel: str) -> bool:
    a = (aplica_a or "todos").strip().lower()
    if a == "todos":
        return True
    if a.startswith("banda:"):
        bands = [b.strip() for b in a[len("banda:"):].split(",")]
        return banda in bands
    if a.startswith("nivel:"):
        nivs = [n.strip().lower() for n in a[len("nivel:"):].split(",")]
        return (nivel or "").lower() in nivs
    return False


def _topic_block(topic) -> list[str]:
    if not topic:
        return []
    vocab = [str(v) for v in (getattr(topic, "keywords", None) or [])][:6]
    gv = [str(v) for v in (getattr(topic, "generated_vocab", None) or [])][:6]
    lines = [f"Topic_Title: {getattr(topic, 'title', '')}"]
    if getattr(topic, "category", None):
        lines.append(f"Category: {topic.category}")
    if vocab:
        lines.append("Key_Vocabulary: " + ", ".join(vocab))
    if gv:
        lines.append("Key_Phrases: " + ", ".join(gv))
    return lines


def _runtime_block(slot: str, user_name: str, nivel: str, banda: str, learner_state: Optional[dict]) -> list[str]:
    if slot == "1":
        return [
            "Current_Date: " + datetime.date.today().isoformat(),
            "Target_Language: English", "Native_Language: Spanish (es-AR, Rioplatense)",
            "Interface_Mode: Realtime Multimodal Voice Session",
        ]
    if slot == "5":
        return [f"Name: {user_name}", f"Band: {banda}", f"Level: {nivel}"]
    if slot == "5b":
        if not learner_state:
            return ["(vacío — se llena con el historial del alumno)"]
        out = []
        for k in ("mastered", "learning", "due_for_review", "recent_errors", "interests"):
            v = learner_state.get(k)
            if v:
                out.append(f"{k}: {', '.join(str(x) for x in v)}")
        return out or ["(sin memoria aún)"]
    if slot == "9b":
        return ["Turn: 0", "Current_Phase: Phase 1", "Signal: idle"]
    return []


async def compose_from_catalog(
    db, *, segment: str, nivel: str, topic=None, user_name: str = "Alumno",
    learner_state: Optional[dict] = None,
) -> dict:
    """Devuelve {prompt, slots} — el prompt armado + qué reglas (IDs) entraron en cada slot."""
    banda = SEG_TO_BANDA.get(segment, segment)
    rules = (await db.execute(select(Rule).where(Rule.active.is_(True)).order_by(Rule.sort_order))).scalars().all()

    # agrupar reglas que matchean, por slot
    by_slot: dict[str, list[Rule]] = {}
    for r in rules:
        if _matches(r.aplica_a, banda, nivel):
            by_slot.setdefault(_slot_key(r.bloque), []).append(r)

    blocks: list[str] = []
    selected: dict[str, list[str]] = {}
    for slot in SLOT_ORDER:
        matched = by_slot.get(slot, [])
        tag = _tag(matched[0].bloque) if matched else {
            "1": "runtime_context", "5": "student_profile", "5b": "learner_state",
            "7": "topic_vocabulary", "9b": "interaction_state",
        }.get(slot, slot)

        # Slot 7: los TOP-* del catálogo son el POOL (la banda los habilita); el tópico de
        # la clase es UNO solo, el que eligió el sequencer. Acá entra ese + la profundidad (DPT).
        if slot == "7":
            matched = [r for r in matched if not r.id.startswith("TOP-")]

        lines: list[str] = []
        lines += _runtime_block(slot, user_name, nivel, banda, learner_state)
        if slot == "7":
            lines += _topic_block(topic)
        lines += [r.regla for r in matched]

        selected[slot] = [r.id for r in matched]
        if not lines:
            continue
        body = "\n".join(f"  {ln}" for ln in lines)
        blocks.append(f"<{tag}>\n{body}\n</{tag}>")

    return {"prompt": "\n\n".join(blocks), "slots": selected, "banda": banda, "nivel": nivel}

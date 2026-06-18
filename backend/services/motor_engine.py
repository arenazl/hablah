"""Puente entre la app (FastAPI async) y los 2 motores canónicos del modelo v3.

Los motores viven en Motor-Learning/ (motor_prompt.py + motor_postclass.py) — son TUS
archivos, intactos. Acá solo: (1) abrimos la conexión a Aiven con SSL, (2) corremos las
funciones síncronas (pymysql) en un thread para no bloquear el event loop.

Orquestación = JIT: se arma en el momento desde banda+nivel+tópico, no se persiste.
"""
from __future__ import annotations

import asyncio
import os
import ssl
import sys
from typing import Any, Optional

from core.config import settings

# Los 2 motores son los archivos canónicos. En LOCAL viven en Motor-Learning/ (lo que editás);
# en HEROKU solo viaja backend/ (monorepo buildpack APP_BASE=backend), así que ahí usamos el
# snapshot bundleado en backend/motor_core/. sync_motor_core.py re-copia antes de cada deploy.
_HERE = os.path.dirname(__file__)
_MOTOR_PATHS = [
    os.path.normpath(os.path.join(_HERE, "..", "..", "Motor-Learning")),  # dev: canónico
    os.path.normpath(os.path.join(_HERE, "..", "motor_core")),            # deploy: snapshot
]
for _p in _MOTOR_PATHS:
    if os.path.exists(os.path.join(_p, "motor_prompt.py")):
        if _p not in sys.path:
            sys.path.insert(0, _p)
        break

import motor_prompt      # noqa: E402  (build_stack / build_stack_params / render_prompt)
import motor_postclass   # noqa: E402  (close_session — SRS)


def _connect() -> "motor_prompt.MotorDB":
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return motor_prompt.MotorDB(
        host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
        password=settings.DB_PASSWORD, database=settings.DB_NAME, ssl=ctx)


def _meta(stack: dict) -> dict:
    ctx = stack["context"]
    orch = ctx.get("orchestration")
    tutor = stack.get("tutor_identity")
    return {
        "band_code": ctx["band"]["code"],
        "band_label": ctx["band"]["label"],
        "level": ctx["level"]["level_code"],
        "topic_title": ctx["topic"]["title"] if ctx["topic"] else None,
        "tutor_name": tutor["name"] if tutor else None,
        "orchestration_name": (orch.get("name") if orch else None),
        "pacing_min": stack["narrative_spine"]["target_min"],
        "objectives": stack["lesson_objectives"],
        "words": stack["topic_vocabulary"]["words"],
        "phrases": stack["topic_vocabulary"]["phrases"],
    }


def _resolve_sync(band_code, level_code, topic_id, student_id, test_overrides) -> dict:
    db = _connect()
    try:
        stack = motor_prompt.build_stack_params(
            db, band_code, level_code, topic_id, student_id, test_overrides)
        bid = stack["context"]["band"]["band_id"]
        # pool de guards de la banda (id + body) para el editor en memoria
        guards_pool = db.q(
            "SELECT guard_id, ord, body FROM behavioral_guard WHERE band_id=%s ORDER BY ord", (bid,))
        return {
            "prompt": motor_prompt.render_prompt(stack),
            "meta": _meta(stack),
            "guards_pool": guards_pool,
            "guards_final": stack["behavioral_guards"],
        }
    finally:
        db.conn.close()


async def resolve(band_code: str, level_code: str, topic_id: Optional[int] = None,
                  student_id: Optional[int] = None,
                  test_overrides: Optional[list[dict[str, Any]]] = None) -> dict:
    """Playground: arma el prompt JIT para (banda, nivel, tópico) con overrides en memoria."""
    return await asyncio.to_thread(
        _resolve_sync, band_code, level_code, topic_id, student_id, test_overrides)


def _postclass_sync(session_id, outcomes) -> dict:
    db = _connect()
    try:
        return motor_postclass.close_session(db, session_id, outcomes)
    finally:
        db.conn.close()


async def postclass(session_id: int, outcomes: dict) -> dict:
    """Cierra el ciclo: aplica la escalera SRS al progreso del alumno."""
    return await asyncio.to_thread(_postclass_sync, session_id, outcomes)


# ── /training · ciclo de aprendizaje por alumno (sin session) ──
def _train_state_sync(student_id: int) -> dict:
    db = _connect()
    try:
        st = db.q1("SELECT student_id, name, age, level_code FROM student WHERE student_id=%s", (student_id,))
        if not st:
            raise ValueError(f"student {student_id} inexistente")
        objectives = db.q(
            """SELECT lo.objective_id, lo.code, lo.kind, lo.description,
                      COALESCE(luo.status,'nuevo') AS status, luo.due_at, luo.last_seen
               FROM language_objective lo
               LEFT JOIN learner_objective luo
                 ON luo.objective_id=lo.objective_id AND luo.student_id=%s
               WHERE lo.cefr_level=%s ORDER BY lo.sort_order""",
            (student_id, st["level_code"]))
        items = db.q(
            "SELECT item_type, item_value, status, due_at FROM learner_item WHERE student_id=%s ORDER BY item_type, item_value",
            (student_id,))
        return {"student": st, "objectives": objectives, "items": items}
    finally:
        db.conn.close()


async def train_state(student_id: int) -> dict:
    """Memoria del alumno: objetivos del currículum de su nivel con su estado SRS + ítems."""
    return await asyncio.to_thread(_train_state_sync, student_id)


def _train_apply_sync(student_id: int, outcomes: dict) -> dict:
    db = _connect()
    try:
        rep = {"objectives": {}, "items": {}}
        for oid, score in (outcomes.get("objectives") or []):
            rep["objectives"][str(oid)] = motor_postclass.record_objective(db, student_id, int(oid), score)
        for it in (outcomes.get("items") or []):
            rep["items"][it[1]] = motor_postclass.record_item(db, student_id, it[0], it[1], it[2])
        db.conn.commit()
        return rep
    finally:
        db.conn.close()


async def train_apply(student_id: int, outcomes: dict) -> dict:
    """Post-clase del training: sube la escalera SRS del alumno (sin session real)."""
    return await asyncio.to_thread(_train_apply_sync, student_id, outcomes)


# ── Grabar/leer el CIRCUITO de un edad×nivel (orchestration + overrides, tópico NULL) ──
def _save_circuit_sync(band_code, level_code, overrides) -> dict:
    db = _connect()
    try:
        band = db.q1("SELECT band_id FROM age_band WHERE code=%s", (band_code,))
        if not band:
            raise ValueError(f"banda {band_code} inexistente")
        bid = band["band_id"]
        with db.conn.cursor() as cur:
            cur.execute("SELECT orchestration_id FROM orchestration WHERE band_id=%s AND level_code=%s AND topic_id IS NULL", (bid, level_code))
            row = cur.fetchone()
            if row:
                oid = row["orchestration_id"]
                cur.execute("UPDATE orchestration SET status='active' WHERE orchestration_id=%s", (oid,))
                cur.execute("DELETE FROM orchestration_override WHERE orchestration_id=%s", (oid,))
            else:
                cur.execute("INSERT INTO orchestration (name, status, band_id, level_code, topic_id) VALUES (%s,'active',%s,%s,NULL)",
                            (f"Circuito {band_code} × {level_code}", bid, level_code))
                oid = cur.lastrowid
            for o in (overrides or []):
                cur.execute(
                    "INSERT INTO orchestration_override (orchestration_id, slot, action, target_id, body) VALUES (%s,%s,%s,%s,%s)",
                    (oid, o["slot"], o["action"], o.get("target_id"), o.get("body")))
        db.conn.commit()
        return {"orchestration_id": oid, "overrides_saved": len(overrides or [])}
    finally:
        db.conn.close()


def _load_circuit_sync(band_code, level_code) -> dict:
    db = _connect()
    try:
        band = db.q1("SELECT band_id FROM age_band WHERE code=%s", (band_code,))
        if not band:
            return {"overrides": []}
        orc = db.q1("SELECT orchestration_id FROM orchestration WHERE band_id=%s AND level_code=%s AND topic_id IS NULL",
                    (band["band_id"], level_code))
        if not orc:
            return {"overrides": []}
        rows = db.q("SELECT slot, action, target_id, body FROM orchestration_override WHERE orchestration_id=%s", (orc["orchestration_id"],))
        return {"orchestration_id": orc["orchestration_id"], "overrides": rows}
    finally:
        db.conn.close()


async def save_circuit(band_code: str, level_code: str, overrides: list) -> dict:
    """Persiste el circuito (overrides del fine-tuning) del edad×nivel. NO es la clase: es el molde."""
    return await asyncio.to_thread(_save_circuit_sync, band_code, level_code, overrides)


async def load_circuit(band_code: str, level_code: str) -> dict:
    """Lee el circuito grabado de un edad×nivel (para pre-cargar el probador)."""
    return await asyncio.to_thread(_load_circuit_sync, band_code, level_code)

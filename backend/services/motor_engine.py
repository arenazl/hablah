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
    """JUBILADO (motor v3) — NO cablear superficies nuevas acá; usar resolve_v2 (motor v2 =
    producción). Producción corre v2 (composer_proto vía gemini_live). v3 quedó vivo SOLO en el
    back-office de guards (/admin/reglas-motor). Se conserva el código, no se extiende.

    Playground: arma el prompt JIT para (banda, nivel, tópico) con overrides en memoria."""
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


def _resolve_kid_sync(band_code, level_code, prod_topic_id, student_id):
    """Mapea el tópico de PRODUCCIÓN (topics.id) al de motor_v3 vía legacy_topic_id y
    resuelve el prompt nuevo. Devuelve None si el tópico no está migrado -> el caller
    cae al motor viejo (fail-safe)."""
    db = _connect()
    try:
        v3_tid = None
        if prod_topic_id:
            r = db.q1("SELECT topic_id FROM topic WHERE legacy_topic_id=%s", (prod_topic_id,))
            v3_tid = r["topic_id"] if r else None
        if v3_tid is None:
            return None
        stack = motor_prompt.build_stack_params(db, band_code, level_code, v3_tid, student_id, None)
        return {"prompt": motor_prompt.render_prompt(stack), "v3_topic_id": v3_tid, "meta": _meta(stack)}
    finally:
        db.conn.close()


async def resolve_kid(band_code: str, level_code: str, prod_topic_id: Optional[int] = None,
                      student_id: Optional[int] = None) -> Optional[dict]:
    """Switch kids -> motor_v3 en producción (detrás del flag MOTOR_V3_KIDS). El tópico se
    mapea por legacy_topic_id; devuelve None si no está migrado para que el caller use el
    motor viejo. Sin historia por ahora (student_id None = clase libre)."""
    return await asyncio.to_thread(_resolve_kid_sync, band_code, level_code, prod_topic_id, student_id)


# ── MOTOR ÚNICO (v2 / compose_proto) para el TEST ──
# Los 3 pilares del dueño: EDAD (student_types) + NIVEL (levels) + HISTORIA (learner_state).
# Determinístico: apila presets y genera el prompt al vuelo. NO persiste orquestación
# (no hace falta: O(edad+nivel+tópico) de catálogo vs O(edad×nivel×tópico) de combos curados).
# Es el MISMO motor que la clase real (gemini_live -> build_super_prompt -> compose_proto).
def _json_list(v) -> list[str]:
    """Columna que puede venir lista, JSON-string o None -> lista de strings."""
    import json as _json
    if not v:
        return []
    if isinstance(v, list):
        return [str(x) for x in v if x]
    if isinstance(v, str):
        try:
            d = _json.loads(v)
            return [str(x) for x in d if x] if isinstance(d, list) else ([v] if v.strip() else [])
        except Exception:
            return [v] if v.strip() else []
    return []


def _resolve_v2_sync(age_group, level_code, topic_id, learner_state=None) -> dict:
    from types import SimpleNamespace
    from services.composer_proto import compose_proto_prompt
    db = _connect()
    try:
        std = db.q1("SELECT * FROM student_types WHERE slug=%s", (age_group,))
        lv = db.q1("SELECT * FROM levels WHERE code=%s", (level_code,))
        if not std or not lv:
            raise ValueError(f"falta preset: age_group={age_group} / level={level_code}")
        tp = db.q1("SELECT * FROM topics WHERE id=%s", (topic_id,)) if topic_id else None
        level_data = {
            "language_rule": lv.get("language_rule"),
            "curriculum_grammar": lv.get("curriculum_grammar"),
            "expected_production": lv.get("expected_production"),
            "vocab_depth": lv.get("vocab_depth"),
        }
        try:   # app_config real (tabla config_key/config_value) -> reglas de voz/seguridad
            cfg = {r["config_key"]: r["config_value"]
                   for r in db.q("SELECT config_key, config_value FROM app_config")} or None
        except Exception:
            cfg = None
        user = SimpleNamespace(nombre="Alumno", cefr_level=level_code, age_group=age_group,
                               target_language="en", base_language="es")
        topic = None
        if tp:
            topic = SimpleNamespace(
                title=tp.get("title"),
                pinned_vocabulary=_json_list(tp.get("pinned_vocabulary")),
                keywords=_json_list(tp.get("keywords")),
                generated_vocab=_json_list(tp.get("generated_vocab")),
            )
        prompt = compose_proto_prompt(
            user=user, topic=topic, topic_content=None,
            student_type_data=std, level_data=level_data,
            app_config=cfg, learner_state=learner_state)
        return {"prompt": prompt, "meta": {
            "engine": "compose_proto (v2)", "age_group": age_group, "level": level_code,
            "topic_title": tp.get("title") if tp else None}}
    finally:
        db.conn.close()


async def resolve_v2(age_group: str, level_code: str, topic_id: Optional[int] = None,
                     learner_state: Optional[dict] = None) -> dict:
    """Motor ÚNICO para el test: 3 pilares edad+nivel+(tópico)+historia, generado al vuelo."""
    return await asyncio.to_thread(_resolve_v2_sync, age_group, level_code, topic_id, learner_state)


def _resolve_v2_breakdown_sync(age_group, level_code, topic_id) -> dict:
    """Desglose de la orquestación POR CAMPO de la base (no por bloque renderizado): cada entrada
    trae su FUENTE (tabla.columna) y su DUEÑO (de qué pilar depende). Deja ver que NO es un registro
    único: el composer apila campos separados de student_types(edad) + levels(nivel) + topics(tópico)."""
    db = _connect()
    try:
        std = db.q1("SELECT * FROM student_types WHERE slug=%s", (age_group,))
        lv = db.q1("SELECT * FROM levels WHERE code=%s", (level_code,))
        if not std or not lv:
            raise ValueError(f"falta preset: age_group={age_group} / level={level_code}")
        tp = db.q1("SELECT * FROM topics WHERE id=%s", (topic_id,)) if topic_id else None
        words = _json_list(tp.get("pinned_vocabulary")) if tp else []
        if not words and tp:
            words = _json_list(tp.get("keywords"))[:6]
        phrases = _json_list(tp.get("generated_vocab")) if tp else []
        if (lv.get("vocab_depth") in ("basic", "minimal")) and phrases:
            phrases = phrases[:1]

        def e(label, source, dueno, body):
            body = (body or "").strip() if isinstance(body, str) else body
            return {"label": label, "source": source, "dueno": dueno, "body": body} if body else None

        def step(name, entries):
            es = [x for x in entries if x]
            return {"step": name, "entries": es} if es else None

        steps = [s for s in [
            step("Contexto", [e("Idioma / dispositivo", "runtime", "estático",
                                "Target: English · Native: Spanish · Voz (mobile)")]),
            step("El profe", [
                e("Mascota", "student_types.tutor_mascot", "EDAD", std.get("tutor_mascot")),
                e("Identidad", "student_types.tutor_identity", "EDAD", std.get("tutor_identity")),
                e("Tono", "student_types.tutor_tonal_rules", "EDAD", std.get("tutor_tonal_rules")),
            ]),
            step("Método", [e("Pedagogía", "student_types.pedagogy", "EDAD", std.get("pedagogy"))]),
            step("Juego", [e("Foco de sesión", "student_types.session_focus", "EDAD", std.get("session_focus"))]),
            step("Rieles", [
                e("Language_Rule", "levels.language_rule", "NIVEL", lv.get("language_rule")),
                e("Level_Target", "levels.curriculum_grammar", "NIVEL", lv.get("curriculum_grammar")),
                e("Expected_Production", "levels.expected_production", "NIVEL", lv.get("expected_production")),
                e("Form_Rules", "student_types.form_rules", "EDAD", std.get("form_rules")),
            ]),
            step("Tema (vocab)", [
                e("Words", "topics.keywords", "TÓPICO", ", ".join(words) if words else None),
                e("Target_Phrases", "topics.generated_vocab", "TÓPICO", ", ".join(phrases) if phrases else None),
            ]),
            step("Arranque", [e("Opening_Seed", "student_types.opening_seed", "EDAD + NIVEL", std.get("opening_seed"))]),
            step("Turno", [
                e("Continuation_Seed", "student_types.continuation_seed", "EDAD (+universal)", std.get("continuation_seed")),
                e("Closing_Seed", "student_types.closing_seed", "EDAD", std.get("closing_seed")),
            ]),
        ] if s]
        return {"steps": steps, "meta": {"engine": "compose_proto (v2)", "age_group": age_group,
                                         "level": level_code, "topic_title": tp.get("title") if tp else None}}
    finally:
        db.conn.close()


async def resolve_v2_breakdown(age_group: str, level_code: str, topic_id: Optional[int] = None) -> dict:
    """Desglose por campo (tabla.columna + dueño) de la orquestación v2 — para el visor de los pasos."""
    return await asyncio.to_thread(_resolve_v2_breakdown_sync, age_group, level_code, topic_id)


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

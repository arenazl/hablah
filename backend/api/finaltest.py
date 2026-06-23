"""Consola /finaltest — circuito ENTERO de prueba de clases REALES por voz.

El usuario elige banda(perfil) × nivel × tópico, arranca una clase por voz (mic + Gemini Live,
vía el WS /voice/ws_orchestration que resuelve el motor v3 con ESE student_id para tener historia),
y al terminar se guarda la transcripción: se puntúa con el juez SLA (Gemini, rúbrica calibrada),
se escribe un .md en la carpeta raíz `finaltest_clases/`, se sube la escalera SRS (train_apply) para
que la próxima clase del mismo perfil tenga historia, y queda en BD para el tab de Análisis.

Todo real, en el server. Sin login (banco de prueba aislado, como /llm y /probar-orq).
"""
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from services import motor_engine
from services import motor_protocol as mp

router = APIRouter()

_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
_MD_DIR = os.path.join(_ROOT, "finaltest_clases")
_BAND_AGE = {"early_child": 5, "child": 8, "teen": 13, "adult": 30}

# Juez SLA con escala ANCLADA (misma vara calibrada del circuito de validación).
_RUBRIC = (
    "SOS ESPECIALISTA EN ADQUISICIÓN DE SEGUNDAS LENGUAS (SLA), evaluando una clase de inglés para un "
    "alumno hispanohablante. Evaluá SOLO la actuación del PROFE (coach), no la del alumno.\n"
    "Dimensiones (cada una 1-10): naturalidad (conversación genuina, no carrusel mecánico), afecto (filtro "
    "afectivo), i1 (input i+1 calibrado), reciclado (recircula vocab/lo que dice el alumno), recast (reformula "
    "el error sin señalar), continuity (retoma lo de clases anteriores si hay historia).\n"
    "ESCALA — anclá el score a esto, NO seas avaro (la mayoría de las clases buenas merecen 8):\n"
    " 9-10 = clase modelo: recast invisible, reciclado natural, charla genuina, afecto cálido, sin carrusel.\n"
    " 7-8  = sólida: bien en casi todo, con 1-2 debilidades menores.\n"
    " 5-6  = funcional pero mecánica: carrusel/entrevista, recast inconsistente, poco reciclado.\n"
    " 3-4  = robótica: ignora aportes del alumno, drilling, afecto muerto.\n"
    "Una clase cálida, con recast presente y sin carrusel, MERECE 8-9. Reservá <7 para clases mecánicas o frías.\n"
    "NO penalices cobertura de vocab. Si el alumno produjo poco, evaluá si el profe supo INVITAR a producir.\n"
    'Devolvé SOLO JSON: {"score":1-10,"naturalidad":1-10,"afecto":1-10,"i1":1-10,"reciclado":1-10,"recast":1-10,"continuity":1-10,"verdict":"1-2 frases"}'
)


# ───────────────────────── helpers de BD (sync, corren en thread) ─────────────────────────
def _ensure_schema_sync(db) -> None:
    with db.conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS finaltest_class (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            band_code VARCHAR(20), level_code VARCHAR(4), topic_id INT, topic_title VARCHAR(200),
            student_id INT, hist_obj INT, hist_items INT, score FLOAT, verdict VARCHAR(600),
            dims TEXT, transcript LONGTEXT, md_path VARCHAR(400)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
    db.conn.commit()


def _student_sync(band: str, level: str) -> dict:
    db = motor_engine._connect()
    try:
        key = f"ft_{band[:2]}_{level}"[:20]
        row = db.q1("SELECT student_id FROM student WHERE profile_key=%s", (key,))
        if row:
            sid = row["student_id"]
        else:
            with db.conn.cursor() as cur:
                cur.execute("INSERT INTO student (name, profile_key, age, level_code) VALUES (%s,%s,%s,%s)",
                            (f"finaltest {band} {level}", key, _BAND_AGE.get(band, 12), level))
                sid = cur.lastrowid
            db.conn.commit()
        o = db.q1("SELECT COUNT(*) c FROM learner_objective WHERE student_id=%s", (sid,))["c"]
        it = db.q1("SELECT COUNT(*) c FROM learner_item WHERE student_id=%s", (sid,))["c"]
        return {"student_id": sid, "hist_obj": o, "hist_items": it}
    finally:
        db.conn.close()


def _reset_sync(student_id: int) -> None:
    db = motor_engine._connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("DELETE FROM learner_objective WHERE student_id=%s", (student_id,))
            cur.execute("DELETE FROM learner_item WHERE student_id=%s", (student_id,))
        db.conn.commit()
    finally:
        db.conn.close()


def _topics_sync(band: str) -> list[dict]:
    db = motor_engine._connect()
    try:
        rows = db.q("""SELECT t.topic_id, t.title FROM topic t
            JOIN topic_suggested_band tsb ON tsb.topic_id=t.topic_id
            JOIN age_band ab ON ab.band_id=tsb.band_id WHERE ab.code=%s ORDER BY t.title LIMIT 200""", (band,))
        return [{"id": r["topic_id"], "title": r["title"]} for r in rows]
    finally:
        db.conn.close()


def _options_sync() -> dict:
    db = motor_engine._connect()
    try:
        bands = db.q("SELECT code, label FROM age_band ORDER BY band_id")
        levels = db.q("SELECT level_code FROM `level` ORDER BY sort_order")
        return {"bands": bands, "levels": [r["level_code"] for r in levels]}
    finally:
        db.conn.close()


def _objectives_sync(level: str) -> list[dict]:
    db = motor_engine._connect()
    try:
        return db.q("SELECT objective_id, code, description FROM language_objective WHERE cefr_level=%s ORDER BY sort_order", (level,))
    finally:
        db.conn.close()


def _save_row_sync(payload: dict) -> int:
    db = motor_engine._connect()
    try:
        _ensure_schema_sync(db)
        with db.conn.cursor() as cur:
            cur.execute("""INSERT INTO finaltest_class
                (band_code, level_code, topic_id, topic_title, student_id, hist_obj, hist_items,
                 score, verdict, dims, transcript, md_path)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (payload["band_code"], payload["level_code"], payload["topic_id"], payload["topic_title"],
                 payload["student_id"], payload["hist_obj"], payload["hist_items"], payload["score"],
                 payload["verdict"], json.dumps(payload["dims"], ensure_ascii=False),
                 json.dumps(payload["transcript"], ensure_ascii=False), payload["md_path"]))
            rid = cur.lastrowid
        db.conn.commit()
        return rid
    finally:
        db.conn.close()


def _list_sync() -> list[dict]:
    db = motor_engine._connect()
    try:
        _ensure_schema_sync(db)
        return db.q("""SELECT id, created_at, band_code, level_code, topic_title, student_id,
            hist_obj, hist_items, score, verdict FROM finaltest_class ORDER BY id DESC LIMIT 200""")
    finally:
        db.conn.close()


def _get_sync(class_id: int) -> Optional[dict]:
    db = motor_engine._connect()
    try:
        r = db.q1("SELECT * FROM finaltest_class WHERE id=%s", (class_id,))
        if not r:
            return None
        r["dims"] = json.loads(r.get("dims") or "{}")
        r["transcript"] = json.loads(r.get("transcript") or "[]")
        return r
    finally:
        db.conn.close()


# ───────────────────────── juez + derive (Gemini, en el server) ─────────────────────────
def _convo_text(transcript: list[dict]) -> str:
    return "\n".join(f"{'Profe' if t.get('who') == 'ai' else 'Alumno'}: {t.get('text', '')}" for t in transcript)


async def _judge(level: str, title: str, transcript: list[dict]) -> dict:
    raw = await mp._gemini(f"{_RUBRIC}\n\nClase ({level}) sobre '{title}':\n{_convo_text(transcript)}")
    p = mp._parse_json(raw or "") or {}
    keys = ("score", "naturalidad", "afecto", "i1", "reciclado", "recast", "continuity", "verdict")
    return {k: p.get(k) for k in keys}


async def _derive(level: str, transcript: list[dict]) -> dict:
    objs = await asyncio.to_thread(_objectives_sync, level)
    if not objs:
        return {"objectives": [], "items": []}
    listado = "\n".join(f'{o["objective_id"]}\t{o["code"]}\t{o["description"]}' for o in objs)
    raw = await mp._gemini(
        "Evaluador SLA. De la TRANSCRIPCION marca qué objetivos se practicaron y con qué desempeño "
        "(good/partial/fail). Ignora los que no aparecieron.\n"
        f"OBJETIVOS:\n{listado}\n\nTRANSCRIPCION:\n{_convo_text(transcript)}\n\n"
        'SOLO JSON: {"objectives":[{"id":1,"score":"good"}],"items":[{"type":"word","value":"x","score":"partial"}],"errors":["..."]}')
    p = mp._parse_json(raw or "") or {}
    valid = {o["objective_id"] for o in objs}
    objectives = [(int(o["id"]), o["score"]) for o in p.get("objectives", [])
                  if o.get("id") in valid and o.get("score") in ("good", "partial", "fail")]
    allowed = {"word", "phrase", "error"}
    items: list[tuple] = []
    for it in p.get("items", []):
        if it.get("value"):
            typ = it.get("type") if it.get("type") in allowed else "word"
            sc = it.get("score") if it.get("score") in ("good", "partial", "fail") else "partial"
            items.append((typ, str(it["value"])[:110], sc))
    items += [("error", str(e)[:110], "fail") for e in p.get("errors", []) if e]
    return {"objectives": objectives, "items": items}


def _write_md(payload: dict, ev: dict) -> str:
    os.makedirs(_MD_DIR, exist_ok=True)
    ts = payload["ts"]
    safe = f"{payload['band_code']}_{payload['level_code']}_{payload['topic_id']}_{ts}".replace(" ", "")
    path = os.path.join(_MD_DIR, f"{safe}.md")
    L = [f"# {payload['band_code']} · {payload['level_code']} · {payload['topic_title']}",
         f"fecha {ts} · historia previa {payload['hist_obj']}obj/{payload['hist_items']}it · "
         f"**score {ev.get('score')}**", "",
         f"> {ev.get('verdict', '')}", "",
         "dims: " + " · ".join(f"{k} {ev.get(k)}" for k in ("naturalidad", "afecto", "i1", "reciclado", "recast", "continuity")),
         "", "## Transcripción", ""]
    for t in payload["transcript"]:
        who = "**Profe**" if t.get("who") == "ai" else "Alumno"
        L.append(f"- {who}: {t.get('text', '')}")
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write("\n".join(L))
    except Exception:
        return ""
    return path


# ───────────────────────── modelos ─────────────────────────
class ResolveBody(BaseModel):
    band_code: str
    level_code: str
    topic_id: int = 0


class ResetBody(BaseModel):
    band_code: str
    level_code: str


class SaveBody(BaseModel):
    band_code: str
    level_code: str
    topic_id: int = 0
    topic_title: str = ""
    student_id: int = 0
    transcript: list[dict[str, Any]] = []


# ───────────────────────── endpoints ─────────────────────────
@router.get("/options")
async def options():
    return await asyncio.to_thread(_options_sync)


@router.get("/topics")
async def topics(band: str):
    return await asyncio.to_thread(_topics_sync, band)


@router.post("/resolve")
async def resolve(body: ResolveBody):
    """Crea/recupera el student de prueba del perfil (para historia), resuelve el prompt del
    motor y devuelve la orquestación (para el panel colapsable) + la historia actual."""
    st = await asyncio.to_thread(_student_sync, body.band_code, body.level_code)
    try:
        res = await motor_engine.resolve(body.band_code, body.level_code, body.topic_id or None, st["student_id"], None)
        prompt, meta = res["prompt"], res.get("meta", {})
    except Exception as e:
        return {"error": str(e), **st}
    return {"prompt": prompt, "meta": meta, **st}


@router.post("/reset")
async def reset(body: ResetBody):
    st = await asyncio.to_thread(_student_sync, body.band_code, body.level_code)
    await asyncio.to_thread(_reset_sync, st["student_id"])
    return {"ok": True, "student_id": st["student_id"], "hist_obj": 0, "hist_items": 0}


@router.post("/save")
async def save(body: SaveBody):
    """Cierre de clase: juzga (Gemini SLA), escribe .md, sube la escalera SRS (historia) y persiste."""
    transcript = [t for t in body.transcript if t.get("text")]
    st = await asyncio.to_thread(_student_sync, body.band_code, body.level_code)
    ev = await _judge(body.level_code, body.topic_title or body.level_code, transcript)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    payload = {"band_code": body.band_code, "level_code": body.level_code, "topic_id": body.topic_id,
               "topic_title": body.topic_title, "student_id": st["student_id"],
               "hist_obj": st["hist_obj"], "hist_items": st["hist_items"], "transcript": transcript, "ts": ts}
    md_path = _write_md(payload, ev)
    dims = {k: ev.get(k) for k in ("naturalidad", "afecto", "i1", "reciclado", "recast", "continuity")}
    rid = await asyncio.to_thread(_save_row_sync, {
        **payload, "score": ev.get("score"), "verdict": ev.get("verdict") or "", "dims": dims, "md_path": md_path})
    # historia: best-effort, no rompe el guardado si falla
    try:
        derived = await _derive(body.level_code, transcript)
        if derived["objectives"] or derived["items"]:
            await motor_engine.train_apply(st["student_id"], derived)
    except Exception:
        pass
    return {"id": rid, "score": ev.get("score"), "verdict": ev.get("verdict"), "dims": dims, "md_path": md_path}


@router.get("/list")
async def list_classes():
    return await asyncio.to_thread(_list_sync)


@router.get("/class/{class_id}")
async def get_class(class_id: int):
    r = await asyncio.to_thread(_get_sync, class_id)
    return r or {"error": "no existe"}

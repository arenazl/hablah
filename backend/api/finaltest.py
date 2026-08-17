"""Consola /finaltest — circuito ENTERO de prueba de clases REALES por voz.

MOTOR ÚNICO v2 (compose_proto) — el MISMO que produce (F0-01). El usuario elige perfil(edad =
age_group) × nivel × tópico, arranca una clase por voz (mic + Gemini Live, vía el WS
/voice/ws_motor que resuelve por motor_engine.resolve_v2), y al terminar se guarda la
transcripción: se puntúa con el panel de jueces SLA, se escribe un .md en la carpeta raíz
`finaltest_clases/` y queda en BD para el tab de Análisis.

La HISTORIA v2 (learner_state) todavía no se persiste (pendiente F2-01): por ahora la clase corre
sin historia, igual que /mini-test. La escalera SRS de v3 (train_apply) se retiró al re-cablear.

Todo real, en el server. Sin login (banco de prueba aislado, como /llm y /mini-test).
"""
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from typing import Any, Optional

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from services import motor_engine
from services import motor_protocol as mp

router = APIRouter()

_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
_MD_DIR = os.path.join(_ROOT, "finaltest_clases")
# age_group (slug de student_types) -> segmento de topics. Solo 'adult' difiere ('adultos').
_SEG_BY_AGE = {"mini": "mini", "junior": "junior", "teen": "teen", "adult": "adultos"}

# HISTORIA (F2-02): alumno SINTÉTICO del laboratorio (/lab/mini-test). NO es un usuario real —
# es un id alto para poder SETEAR/LIMPIAR una fila learner_state de prueba y validar por voz que
# el coach usa la memoria (la clase 2 no repite la clase 1). El botón "Limpiar" borra la fila.
TEST_STUDENT_ID = 990001
_SAMPLE_HISTORY = {
    "top_error": "drops the verb 'to be': 'she happy' → 'she IS happy'",
    "interests": ["dinosaurs", "soccer", "space"],
    "mastered": ["greetings", "colors", "numbers 1-10"],
    "review": "plural -s: 'two dog' → 'two dogs'",
}

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

# Juez = OTRA FAMILIA que el coach (coach=Gemini -> juez=gpt-oss/OpenAI vía Ollama). Evita el
# sesgo "Gemini se juzga a sí mismo". Contrato JSON forzado (format=schema). Fallback a Gemini.
def _read_ollama_key() -> str:
    k = os.environ.get("OLLAMA_KEY")
    if k:
        return k.strip()
    try:
        return open(os.path.join(os.path.dirname(__file__), "..", ".ollama_key")).read().strip()
    except Exception:
        return ""


_OLLAMA_KEY = _read_ollama_key()
# Panel de jueces: familias DISTINTAS entre sí y del coach (Gemini). Promediar cancela el sesgo
# de cualquier juez puntual. Serializado (Ollama Cloud rebota concurrencia). Configurable por env.
_JUDGE_PANEL = [m.strip() for m in os.environ.get(
    "FINALTEST_JUDGE_PANEL", "gpt-oss:120b,qwen3-coder:480b,minimax-m3").split(",") if m.strip()]
_JUDGE_SCHEMA = {
    "type": "object",
    "properties": {k: ({"type": "string"} if k == "verdict" else {"type": "number"})
                   for k in ("score", "naturalidad", "afecto", "i1", "reciclado", "recast", "continuity", "verdict")},
    "required": ["score", "verdict"],
}
_DIM_KEYS = ("score", "naturalidad", "afecto", "i1", "reciclado", "recast", "continuity")


async def _ollama_judge(prompt: str, model: str) -> Optional[dict]:
    if not _OLLAMA_KEY:
        return None
    body = {"model": model, "stream": False, "format": _JUDGE_SCHEMA,
            "messages": [{"role": "user", "content": prompt}]}
    for _ in range(3):
        try:
            async with httpx.AsyncClient(timeout=90) as c:
                r = await c.post("https://ollama.com/api/chat",
                                 headers={"Authorization": f"Bearer {_OLLAMA_KEY}"}, json=body)
            if r.status_code == 200:
                txt = (r.json().get("message", {}) or {}).get("content", "")
                if txt:
                    return mp._parse_json(txt)
        except Exception:
            pass
        await asyncio.sleep(3)
    return None


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


def _topics_sync(age_group: str) -> list[dict]:
    """Tópicos v2 del segmento (edad). is_active=1. El nivel NO filtra acá (el motor v2 arma la
    clase para cualquier nivel; el combo de nivel es libre)."""
    db = motor_engine._connect()
    try:
        seg = _SEG_BY_AGE.get(age_group, age_group)
        rows = db.q("SELECT id, title FROM topics WHERE segmento=%s AND is_active=1 ORDER BY title LIMIT 300", (seg,))
        return [{"id": r["id"], "title": r["title"]} for r in rows]
    finally:
        db.conn.close()


def _options_sync() -> dict:
    """Combos del motor v2: edades = student_types (slug), niveles = levels (CEFR),
    idiomas = languages. TODO sale de la BD: sumar un idioma es un INSERT, no un deploy."""
    db = motor_engine._connect()
    try:
        bands = db.q("SELECT slug AS code, name AS label FROM student_types WHERE active=1 ORDER BY sort_order")
        levels = db.q("SELECT code FROM levels ORDER BY sort_order")
        try:
            languages = db.q("SELECT code, label, name_native FROM languages WHERE active=1 ORDER BY sort_order")
        except Exception:
            languages = []
        return {"bands": bands, "levels": [r["code"] for r in levels], "languages": languages or []}
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
    """Panel de jueces de familias distintas (≠ coach). Promedia score y dims; cada voto cancela
    el sesgo de los otros. Serializado por el rate limit de Ollama. Fallback a Gemini si el panel
    entero cae."""
    prompt = f"{_RUBRIC}\n\nClase ({level}) sobre '{title}':\n{_convo_text(transcript)}"
    votes: list[dict] = []
    for model in _JUDGE_PANEL:
        p = await _ollama_judge(prompt, model)
        if p and isinstance(p.get("score"), (int, float)):
            votes.append({"model": model, **p})
    if not votes:                                  # todo el panel cayó -> Gemini
        g = mp._parse_json(await mp._gemini(prompt) or "") or {}
        if isinstance(g.get("score"), (int, float)):
            votes.append({"model": "gemini-2.5-flash", **g})
    if not votes:
        return {**{k: None for k in _DIM_KEYS}, "verdict": "(sin respuesta del panel)",
                "judge_model": "-", "panel": []}

    def _avg(key: str) -> Optional[float]:
        nums = [v.get(key) for v in votes if isinstance(v.get(key), (int, float))]
        return round(sum(nums) / len(nums), 1) if nums else None

    out: dict[str, Any] = {k: _avg(k) for k in _DIM_KEYS}
    out["verdict"] = votes[0].get("verdict", "")
    out["panel"] = [{"model": v["model"], "score": v.get("score")} for v in votes]
    out["judge_model"] = "panel(" + ", ".join(v["model"] for v in votes) + ")"
    return out


def _write_md(payload: dict, ev: dict) -> str:
    os.makedirs(_MD_DIR, exist_ok=True)
    ts = payload["ts"]
    safe = f"{payload['band_code']}_{payload['level_code']}_{payload['topic_id']}_{ts}".replace(" ", "")
    path = os.path.join(_MD_DIR, f"{safe}.md")
    panel = ev.get("panel") or []
    panel_str = " · ".join(f"{p['model']} {p.get('score')}" for p in panel) if panel else "—"
    L = [f"# {payload['band_code']} · {payload['level_code']} · {payload['topic_title']}",
         f"fecha {ts} · historia previa {payload['hist_obj']}obj/{payload['hist_items']}it · "
         f"**score {ev.get('score')}**", "",
         f"panel de jueces: {panel_str}", "",
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
    """Motor ÚNICO v2 (compose_proto) — el MISMO que produce. `band_code` == age_group (slug de
    student_types: mini/junior/teen/adult). La historia v2 (learner_state) es F2-01: por ahora
    la clase corre sin historia (=/mini-test)."""
    try:
        res = await motor_engine.resolve_v2(body.band_code, body.level_code, body.topic_id or None)
        return {"prompt": res["prompt"], "meta": res.get("meta", {}),
                "student_id": 0, "hist_obj": 0, "hist_items": 0}
    except Exception as e:
        return {"error": str(e), "student_id": 0, "hist_obj": 0, "hist_items": 0}


@router.post("/reset")
async def reset(body: ResetBody):
    """La historia v2 (learner_state) todavía no se persiste (F2-01), así que no hay SRS que
    resetear. Se conserva el endpoint/botón; hoy es no-op (0/0)."""
    return {"ok": True, "student_id": 0, "hist_obj": 0, "hist_items": 0}


@router.post("/save")
async def save(body: SaveBody):
    """Cierre de clase: juzga (panel SLA), escribe .md y persiste. La escalera SRS de v3 se
    retiró al re-cablear a v2; la historia v2 (learner_state) llega en F2-01."""
    transcript = [t for t in body.transcript if t.get("text")]
    ev = await _judge(body.level_code, body.topic_title or body.level_code, transcript)
    ev["verdict"] = (ev.get("verdict") or "") + f"  ·  juez: {ev.get('judge_model', '?')}"
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    payload = {"band_code": body.band_code, "level_code": body.level_code, "topic_id": body.topic_id,
               "topic_title": body.topic_title, "student_id": body.student_id or 0,
               "hist_obj": 0, "hist_items": 0, "transcript": transcript, "ts": ts}
    md_path = _write_md(payload, ev)
    dims = {k: ev.get(k) for k in ("naturalidad", "afecto", "i1", "reciclado", "recast", "continuity")}
    dims["panel"] = ev.get("panel", [])
    rid = await asyncio.to_thread(_save_row_sync, {
        **payload, "score": ev.get("score"), "verdict": ev.get("verdict") or "", "dims": dims, "md_path": md_path})
    return {"id": rid, "score": ev.get("score"), "verdict": ev.get("verdict"), "dims": dims, "md_path": md_path}


@router.get("/list")
async def list_classes():
    return await asyncio.to_thread(_list_sync)


@router.get("/class/{class_id}")
async def get_class(class_id: int):
    r = await asyncio.to_thread(_get_sync, class_id)
    return r or {"error": "no existe"}


# ───────────── MOTOR ÚNICO (v2) — paginita de los pasos de la orquestación ─────────────
# La orquestación NO se persiste: se genera al vuelo apilando presets (edad+nivel+tópico+historia).
# Esta vista muestra, para el combo elegido, cada PASO del prompt y de qué parámetro depende.
_STEP_MAP = {
    "runtime_context":           ("Contexto",            "estático"),
    "tutor_profile":             ("El profe",            "EDAD"),
    "pedagogical_rules":         ("Método",              "EDAD (+universal)"),
    "gamification_focus":        ("Juego",               "EDAD"),
    "student_profile":           ("Alumno",              "HISTORIA"),
    "learner_state":             ("Memoria del alumno",  "HISTORIA"),
    "behavioral_guards":         ("Rieles",              "NIVEL + EDAD"),
    "output_rules":              ("Seguridad / voz",     "estático"),
    "current_lesson_vocabulary": ("Tema (vocab)",        "TÓPICO"),
    "story_timeline":            ("Historia del tema",   "TÓPICO"),
    "start_execution_command":   ("Arranque",            "EDAD + NIVEL"),
    "session_actions":           ("Turno",               "EDAD (+universal)"),
    "interaction_state":         ("Estado vivo",         "runtime"),
}


def _split_steps(prompt: str) -> list[dict]:
    import re as _re
    steps = []
    for m in _re.finditer(r"<([a-z_]+)>(.*?)</\1>", prompt, _re.S):
        tag = m.group(1)
        label, dueno = _STEP_MAP.get(tag, (tag, "?"))
        steps.append({"tag": tag, "label": label, "dueno": dueno, "body": m.group(2).strip()})
    return steps


def _mini_topics_sync() -> list[dict]:
    db = motor_engine._connect()
    try:
        rows = db.q("SELECT id, title, segmento, kid_age_group, levels FROM topics "
                    "WHERE audience='kid' ORDER BY segmento, title")
        out = []
        for r in rows:
            lv = r.get("levels")
            try:
                lv = json.loads(lv) if isinstance(lv, str) else (lv or [])
            except Exception:
                lv = []
            out.append({"id": r["id"], "title": r["title"],
                        "segmento": (r.get("segmento") or r.get("kid_age_group") or "kid"),
                        "levels": lv})
        return out
    finally:
        db.conn.close()


@router.get("/mini/topics")
async def mini_topics():
    """Todos los tópicos kids del catálogo v2 (dinámico desde la BD)."""
    return await asyncio.to_thread(_mini_topics_sync)


@router.get("/mini/preview")
async def mini_preview(age_group: str = "mini", level: str = "A0", topic_id: int = 0, student_id: int = 0,
                       target_language: str = "en", template_id: int = 0):
    """Desglose de la orquestación POR CAMPO de la base: cada entrada con su fuente (tabla.columna)
    y su dueño (de qué pilar depende). Deja ver que NO es un registro único — se apilan campos sueltos.
    student_id (F2-02): incluye el paso HISTORIA (learner_state) del alumno de prueba si tiene estado.
    target_language: el MISMO cruce en otro idioma — el catálogo dice {idioma}, no "inglés".
    template_id: desglosa un peldaño del banco de densidad en vez del template activo."""
    try:
        return await motor_engine.resolve_v2_breakdown(age_group, level, topic_id or None,
                                                       student_id or None, target_language,
                                                       template_id or None)
    except Exception as e:
        return {"error": str(e)}


@router.get("/motor/verificar")
async def motor_verificar(age_group: str = "adult", level: str = "A1", topic_id: int = 0,
                          student_id: int = 0, target_language: str = "en", template_id: int = 0):
    """Repasito determinístico del flujo elegido — el botón Verificar del /motor.

    Compone el prompt que saldría y le pasa las reglas de services.motor_lint. No corre
    ninguna clase, no consulta ningún modelo: cada alarma es una regla sobre el texto y su
    traza, así que el resultado es el mismo siempre y se discute mirando el dato."""
    from services.motor_lint import verificar_esquema
    from services.learner_state_writer import materia_de

    def _catalogo():
        """Las filas que el motor USÓ de verdad — para comparar claves, no para leer texto."""
        db = motor_engine._connect()
        try:
            topico = db.q1(
                "SELECT t.id, t.title, t.levels, t.segmento, t.category_id, "
                "       c.family, c.discipline "
                "FROM topics t LEFT JOIN categories c ON c.id = t.category_id WHERE t.id=%s",
                (topic_id,)) if topic_id else {}
            fila_nivel = db.q1("SELECT code, family, sort_order FROM levels WHERE code=%s", (level,)) or {}
            cruce = db.q1("SELECT age_slug, level_code FROM age_level_matrix "
                          "WHERE age_slug=%s AND level_code=%s AND active=1", (age_group, level))
            reglas = db.q("SELECT slug, age_groups, min_level, max_level FROM conversation_rules "
                          "WHERE active=1 ORDER BY sort_order") or []
            orden = {r["code"]: (r["sort_order"] or 0)
                     for r in (db.q("SELECT code, sort_order FROM levels") or [])}
            materia = materia_de((topico or {}).get("family"), (topico or {}).get("discipline"),
                                 target_language)
            ul = hist = {}
            if student_id:
                ul = db.q1("SELECT user_id, materia, level_code FROM user_level "
                           "WHERE user_id=%s AND materia=%s", (student_id, materia)) or {}
                hist = db.q1("SELECT materia FROM learner_state WHERE student_id=%s "
                             "ORDER BY (materia=%s) DESC LIMIT 1", (student_id, materia)) or {}
            return {"topico": topico or {}, "nivel": fila_nivel, "cruce": cruce,
                    "reglas": reglas, "orden_niveles": orden, "user_level": ul,
                    "historia": hist, "materia": materia}
        finally:
            db.conn.close()

    try:
        bd = await motor_engine.resolve_v2_breakdown(age_group, level, topic_id or None,
                                                     student_id or None, target_language,
                                                     template_id or None)
        if bd.get("error"):
            return {"error": bd["error"], "alarmas": [{
                "severidad": "alta", "tipo": "no_compone", "campo": "(motor)",
                "detalle": bd["error"], "esperado": "", "encontrado": "",
                "arreglo": "Falta un dato del catálogo: el motor de 9 pasos no usa fallback."}],
                "resumen": {"total": 1, "alta": 1, "media": 0, "baja": 0}}
        cat = await asyncio.to_thread(_catalogo)
        flujo = {"age_group": age_group, "level": level, "topic_id": topic_id,
                 "target_language": target_language, "student_id": student_id}
        out = verificar_esquema(steps=bd.get("steps", []), prompt=bd.get("prompt", ""),
                                flujo=flujo, catalogo=cat)
        out["contexto"] = {"familia_topico": (cat["topico"] or {}).get("family"),
                           "familia_nivel": (cat["nivel"] or {}).get("family"),
                           "materia": cat["materia"],
                           "topic_title": (bd.get("meta") or {}).get("topic_title")}
        return out
    except Exception as e:
        return {"error": str(e), "alarmas": [], "resumen": {"total": 0}}


@router.get("/motor/templates")
async def motor_templates():
    """Peldaños de densidad disponibles (orchestration_templates) para el combo del /motor.

    Cada peldaño es un TEMPLATE de verdad — mismos placeholders, mismo resolver — no un
    prompt escrito a mano: así lo que se mide es el motor, y el ganador se publica poniéndole
    active=1 en vez de portarlo."""
    def _sync():
        db = motor_engine._connect()
        try:
            rows = db.q("SELECT id, name, notes, active, LENGTH(body) AS chars "
                        "FROM orchestration_templates ORDER BY id") or []
            return [{"id": r["id"], "name": r["name"], "notes": r.get("notes") or "",
                     "active": int(r["active"] or 0), "chars": int(r["chars"] or 0)} for r in rows]
        finally:
            db.conn.close()
    try:
        return {"templates": await asyncio.to_thread(_sync)}
    except Exception as e:
        return {"error": str(e), "templates": []}


# ───────────── HISTORIA del alumno de prueba (F2-02) — setear/leer/limpiar learner_state ─────────────
def _hist_get_sync() -> Optional[dict]:
    db = motor_engine._connect()
    try:
        r = db.q1("SELECT top_error, interests, mastered, review, updated_at "
                  "FROM learner_state WHERE student_id=%s", (TEST_STUDENT_ID,))
        if not r:
            return None
        return {"top_error": r.get("top_error") or "",
                "interests": motor_engine._json_list(r.get("interests")),
                "mastered": motor_engine._json_list(r.get("mastered")),
                "review": r.get("review") or ""}
    finally:
        db.conn.close()


def _hist_set_sync(state: dict) -> dict:
    st = {"top_error": (str(state.get("top_error") or ""))[:255],
          "interests": [str(x) for x in (state.get("interests") or []) if str(x).strip()][:3],
          "mastered": [str(x) for x in (state.get("mastered") or []) if str(x).strip()][:3],
          "review": (str(state.get("review") or ""))[:255]}
    db = motor_engine._connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO learner_state (student_id, top_error, interests, mastered, review) "
                "VALUES (%s,%s,%s,%s,%s) "
                "ON DUPLICATE KEY UPDATE top_error=VALUES(top_error), interests=VALUES(interests), "
                "mastered=VALUES(mastered), review=VALUES(review)",
                (TEST_STUDENT_ID, st["top_error"], json.dumps(st["interests"], ensure_ascii=False),
                 json.dumps(st["mastered"], ensure_ascii=False), st["review"]))
        db.conn.commit()
        return st
    finally:
        db.conn.close()


def _hist_clear_sync() -> None:
    db = motor_engine._connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("DELETE FROM learner_state WHERE student_id=%s", (TEST_STUDENT_ID,))
        db.conn.commit()
    finally:
        db.conn.close()


class HistoryBody(BaseModel):
    state: Optional[dict[str, Any]] = None  # None -> usa la historia de muestra


@router.get("/mini/history")
async def mini_history():
    """Estado LIVIANO (learner_state) del alumno de prueba, o null. El front lo muestra en el visor
    y pasa student_id al WS/preview para que la clase use la memoria."""
    state = await asyncio.to_thread(_hist_get_sync)
    return {"student_id": TEST_STUDENT_ID, "state": state}


@router.post("/mini/history/set")
async def mini_history_set(body: HistoryBody):
    """Setea la historia del alumno de prueba (o la de muestra si no viene una). Reusa el patrón de
    reset de la consola: escribe una fila learner_state para poder validar por voz que el coach la usa."""
    st = await asyncio.to_thread(_hist_set_sync, body.state or _SAMPLE_HISTORY)
    return {"student_id": TEST_STUDENT_ID, "state": st}


@router.post("/mini/history/clear")
async def mini_history_clear():
    """Limpia la historia del alumno de prueba (borra la fila). Vuelve al caso 'sin historia'."""
    await asyncio.to_thread(_hist_clear_sync)
    return {"student_id": TEST_STUDENT_ID, "state": None}


class SimulateStartBody(BaseModel):
    system_instruction: str
    mode: str = "start"  # "start" o "closing"


@router.post("/mini/preview/simulate")
async def simulate_preview_start(body: SimulateStartBody):
    """Llama a Gemini de verdad pasando el systemInstruction compilado y devuelve la respuesta inicial o de cierre."""
    from core.config import settings
    key = settings.GEMINI_API_KEY
    if not key:
        return {"response": "[Error: GEMINI_API_KEY no configurado en settings]"}
        
    model = settings.GEMINI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    
    if body.mode == "closing":
        user_message = "El alumno completó todas las tareas de la sesión. CERRÁ LA SESIÓN AHORA."
    else:
        user_message = "INICIA LA SESIÓN AHORA."
        
    payload = {
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "systemInstruction": {"parts": [{"text": body.system_instruction}]},
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1000
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as cli:
            r = await cli.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            
        raw = "".join(p.get("text", "") for c in data.get("candidates", [])
                      for p in (c.get("content") or {}).get("parts", []))
        return {"response": raw.strip() or "(vacío)"}
    except Exception as e:
        return {"response": f"[Error de comunicación con Gemini: {str(e)}]"}


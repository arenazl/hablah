"""API del Motor v3 — back office sobre el modelo real (motor_v3.sql + los 2 motores).

Dos cosas:
 1) PLAYGROUND: arma el prompt JIT para (banda, nivel, tópico [, alumno]) y deja jugar
    con los guards en memoria (sin persistir). Usa los motores canónicos de Motor-Learning.
 2) ABM genérico de las tablas-tag del modelo (tutor_identity, behavioral_guard, topic_lexis,
    language_objective, …): list/insert/update/delete con esquema introspectado de la DB.

No persiste orquestaciones (son JIT). Solo role='admin'.
"""
from typing import Any, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import require_role
from models.user import User
from services import motor_engine, motor_protocol

router = APIRouter()
_admin = Depends(require_role("admin"))


def _rows(result) -> list[dict[str, Any]]:
    return [dict(r._mapping) for r in result]


# ════════════════════════════ ABM de las tablas-tag ════════════════════════════
# (tabla -> grupo + label). Las columnas/tipos/FK salen de information_schema.
ABM_REGISTRY: dict[str, dict[str, str]] = {
    # dimensiones
    "age_band": {"group": "Dimensiones", "label": "Bandas de edad"},
    "level": {"group": "Dimensiones", "label": "Niveles CEFR"},
    # currículum (qué aprender por nivel)
    "language_objective": {"group": "Currículum", "label": "Objetivos por nivel"},
    # presets por edad (banda)
    "tutor_identity": {"group": "Presets · Edad", "label": "Tutores"},
    "pedagogy": {"group": "Presets · Edad", "label": "Pedagogías"},
    "activity_type": {"group": "Presets · Edad", "label": "Actividades"},
    "reward": {"group": "Presets · Edad", "label": "Recompensas"},
    "behavioral_guard": {"group": "Presets · Edad", "label": "Guards de conducta"},
    "band_policy": {"group": "Presets · Edad", "label": "Políticas de banda"},
    "phase": {"group": "Presets · Edad", "label": "Fases de la clase"},
    "trigger_template": {"group": "Presets · Edad", "label": "Triggers (plantillas)"},
    # presets por nivel
    "level_policy": {"group": "Presets · Nivel", "label": "Políticas de nivel"},
    # universal / config
    "universal_policy": {"group": "Universal / Config", "label": "Políticas universales"},
    "app_config": {"group": "Universal / Config", "label": "Config de la app"},
    # tópico + léxico graduado
    "category": {"group": "Tópicos", "label": "Categorías"},
    "subcategory": {"group": "Tópicos", "label": "Subcategorías"},
    "topic": {"group": "Tópicos", "label": "Tópicos"},
    "topic_lexis": {"group": "Tópicos", "label": "Léxico por nivel"},
    "topic_suggested_band": {"group": "Tópicos", "label": "Tópico → bandas sugeridas"},
}


async def _schema(db: AsyncSession, table: str) -> dict:
    """Introspección: columnas, tipos, pk, autoincrement, enum, FK — desde information_schema."""
    cols = _rows(await db.execute(text(
        "SELECT COLUMN_NAME AS name, DATA_TYPE AS data_type, COLUMN_TYPE AS column_type, "
        "IS_NULLABLE AS nullable, COLUMN_KEY AS col_key, EXTRA AS extra "
        "FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=:t "
        "ORDER BY ORDINAL_POSITION"), {"t": table}))
    fks = {r["name"]: r["ref"] for r in _rows(await db.execute(text(
        "SELECT COLUMN_NAME AS name, REFERENCED_TABLE_NAME AS ref FROM information_schema.key_column_usage "
        "WHERE table_schema=DATABASE() AND table_name=:t AND REFERENCED_TABLE_NAME IS NOT NULL"),
        {"t": table}))}
    pk: list[str] = []
    out_cols = []
    for c in cols:
        is_pk = c["col_key"] == "PRI"
        if is_pk:
            pk.append(c["name"])
        enum_options = None
        ct = c["column_type"] or ""
        if ct.startswith("enum("):
            enum_options = [s.strip().strip("'") for s in ct[5:-1].split(",")]
        out_cols.append({
            "name": c["name"], "data_type": c["data_type"], "is_pk": is_pk,
            "auto": "auto_increment" in (c["extra"] or ""),
            "nullable": c["nullable"] == "YES",
            "enum_options": enum_options, "fk_ref": fks.get(c["name"]),
        })
    return {"name": table, "pk": pk, "columns": out_cols,
            **ABM_REGISTRY.get(table, {"group": "Otros", "label": table})}


@router.get("/tables")
async def list_tables(db: AsyncSession = Depends(get_db), _: User = _admin):
    """Registro de las tablas-tag editables + su esquema (para formularios genéricos)."""
    out = []
    for t in ABM_REGISTRY:
        sch = await _schema(db, t)
        n = (await db.execute(text(f"SELECT COUNT(*) FROM `{t}`"))).scalar()
        out.append({**sch, "count": n})
    return out


def _check_table(table: str) -> None:
    if table not in ABM_REGISTRY:
        raise HTTPException(404, f"tabla '{table}' no editable")


@router.get("/rows/{table}")
async def list_rows(table: str, db: AsyncSession = Depends(get_db)):
    """Sin auth: lo lee el probador público (presets por capa), como /llm y /training."""
    _check_table(table)
    return _rows(await db.execute(text(f"SELECT * FROM `{table}`")))


@router.post("/rows/{table}", status_code=201)
async def insert_row(table: str, payload: dict = Body(...), db: AsyncSession = Depends(get_db), _: User = _admin):
    _check_table(table)
    sch = await _schema(db, table)
    valid = {c["name"] for c in sch["columns"] if not c["auto"]}
    data = {k: v for k, v in payload.items() if k in valid}
    if not data:
        raise HTTPException(400, "sin columnas válidas")
    cols = ", ".join(f"`{k}`" for k in data)
    ph = ", ".join(f":{k}" for k in data)
    res = await db.execute(text(f"INSERT INTO `{table}` ({cols}) VALUES ({ph})"), data)
    await db.commit()
    return {"ok": True, "lastrowid": res.lastrowid}


@router.patch("/rows/{table}")
async def update_row(table: str, payload: dict = Body(...), db: AsyncSession = Depends(get_db), _: User = _admin):
    """payload = {pk: {col: val, ...}, set: {col: val, ...}}"""
    _check_table(table)
    sch = await _schema(db, table)
    valid = {c["name"] for c in sch["columns"]}
    pk = {k: v for k, v in (payload.get("pk") or {}).items() if k in valid}
    sets = {k: v for k, v in (payload.get("set") or {}).items() if k in valid and k not in pk}
    if not pk or not sets:
        raise HTTPException(400, "faltan pk o set")
    set_sql = ", ".join(f"`{k}`=:s_{k}" for k in sets)
    where_sql = " AND ".join(f"`{k}`=:w_{k}" for k in pk)
    params = {**{f"s_{k}": v for k, v in sets.items()}, **{f"w_{k}": v for k, v in pk.items()}}
    await db.execute(text(f"UPDATE `{table}` SET {set_sql} WHERE {where_sql}"), params)
    await db.commit()
    return {"ok": True}


@router.delete("/rows/{table}")
async def delete_row(table: str, payload: dict = Body(...), db: AsyncSession = Depends(get_db), _: User = _admin):
    """payload = {pk: {col: val, ...}}"""
    _check_table(table)
    sch = await _schema(db, table)
    valid = {c["name"] for c in sch["columns"]}
    pk = {k: v for k, v in (payload.get("pk") or {}).items() if k in valid}
    if not pk:
        raise HTTPException(400, "falta pk")
    where_sql = " AND ".join(f"`{k}`=:{k}" for k in pk)
    await db.execute(text(f"DELETE FROM `{table}` WHERE {where_sql}"), pk)
    await db.commit()
    return {"ok": True}


# ════════════════════════════ Playground (orquestación JIT) ════════════════════════════
@router.get("/dimensions")
async def dimensions(db: AsyncSession = Depends(get_db)):
    """Selectores del playground: bandas, niveles, catálogo cat→subcat→tópicos, alumnos.
    Sin auth: lo consume el probador/training de prueba (como /llm)."""
    bands = _rows(await db.execute(text(
        "SELECT band_id, code, label, min_age, max_age, phase_group, max_level_order FROM age_band ORDER BY band_id")))
    levels = _rows(await db.execute(text(
        "SELECT level_code, label, sort_order FROM `level` ORDER BY sort_order")))
    cats = _rows(await db.execute(text("SELECT category_id, name FROM category ORDER BY name")))
    subs = _rows(await db.execute(text("SELECT subcategory_id, category_id, name FROM subcategory ORDER BY name")))
    topics = _rows(await db.execute(text("SELECT topic_id, subcategory_id, title FROM topic ORDER BY title")))
    students = _rows(await db.execute(text(
        "SELECT student_id, name, age, level_code FROM student ORDER BY name")))
    tbs = _rows(await db.execute(text("SELECT topic_id, band_id FROM topic_suggested_band")))
    topics_by_sub: dict[int, list] = {}
    for t in topics:
        topics_by_sub.setdefault(t["subcategory_id"], []).append(t)
    subs_by_cat: dict[int, list] = {}
    for s in subs:
        subs_by_cat.setdefault(s["category_id"], []).append({**s, "topics": topics_by_sub.get(s["subcategory_id"], [])})
    catalog = [{**c, "subcategories": subs_by_cat.get(c["category_id"], [])} for c in cats]
    return {"bands": bands, "levels": levels, "catalog": catalog, "students": students,
            "topic_suggested_band": tbs}


class ResolveIn(BaseModel):
    band_code: str
    level_code: str
    topic_id: Optional[int] = None
    student_id: Optional[int] = None
    test_overrides: Optional[list[dict[str, Any]]] = None   # [{slot,action,target_id?,body?}]


@router.post("/resolve")
async def resolve(payload: ResolveIn):
    """Arma el prompt JIT. test_overrides = jugar con guards en memoria (no persiste).
    Sin auth: lo usa el probador público (/motor)."""
    try:
        return await motor_engine.resolve(
            payload.band_code, payload.level_code, payload.topic_id,
            payload.student_id, payload.test_overrides)
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


class PostclassIn(BaseModel):
    session_id: int
    outcomes: dict[str, Any]   # {objectives:[[oid,score]], lexis:[[type,val,score]], errors:[...]}


@router.post("/postclass")
async def postclass(payload: PostclassIn, _: User = _admin):
    try:
        return await motor_engine.postclass(payload.session_id, payload.outcomes)
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


# ════════════════════════════ /training · ciclo de aprendizaje ════════════════════════════
@router.get("/train/state/{student_id}")
async def train_state(student_id: int):
    """Memoria del alumno (objetivos del nivel con estado SRS + ítems). Sin auth (/training)."""
    try:
        return await motor_engine.train_state(student_id)
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


class TrainApplyIn(BaseModel):
    student_id: int
    outcomes: dict[str, Any]   # {objectives:[[objective_id, score]], items:[[type,val,score]]}


@router.post("/train/apply")
async def train_apply(payload: TrainApplyIn):
    """Cierra la clase de training: sube la escalera SRS del alumno. Sin auth (/training)."""
    try:
        return await motor_engine.train_apply(payload.student_id, payload.outcomes)
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


# ════════════════════════════ PROTOCOLO · texto libre -> presets (loop de aprendizaje) ════════════════════════════
class ProtocolRunIn(BaseModel):
    student_id: int
    level_code: str
    observations: list[str]
    provider: str = "auto"   # 'claude' (construcción local) · 'gemini' (app/prod) · 'auto'


@router.post("/protocol/run")
async def protocol_run(payload: ProtocolRunIn):
    """Corre el protocolo: texto libre de la clase -> presets canónicos -> estado del alumno.
    La IA encasilla (Claude headless al construir / Gemini en la app). Sin auth (probador)."""
    try:
        return await motor_protocol.process(
            payload.student_id, payload.observations, payload.level_code, provider=payload.provider)
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


@router.get("/student-presets/{student_id}")
async def student_presets(student_id: int):
    """Presets que arrastra el alumno (etapa 5 / memoria). Sin auth (probador)."""
    try:
        return {"presets": await motor_protocol.student_presets(student_id)}
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


@router.get("/profile/{band_code}/{level_code}")
async def profile(band_code: str, level_code: str):
    """Perfil-molde de (edad, nivel): lo crea si no existe + sus presets acumulados. Sin auth."""
    try:
        prof = await motor_protocol.get_or_create_profile(band_code, level_code)
        prof["presets"] = await motor_protocol.student_presets(prof["student_id"])
        return prof
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


@router.post("/profile/{student_id}/wipe")
async def profile_wipe(student_id: int):
    """Borra el learned_state del perfil/alumno (para comparar clase con/sin historial). Sin auth."""
    try:
        return await motor_protocol.wipe_learned_state(student_id)
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


# ════════════════════════════ Auditoría pedagógica por nivel (propuestas) ════════════════════════════
@router.get("/catalog-proposals")
async def catalog_proposals(db: AsyncSession = Depends(get_db)):
    """Propuestas del especialista por nivel + el estado actual (objetivos/variables). Sin auth (vista /auditoria)."""
    levels = _rows(await db.execute(text(
        "SELECT level_code, label, spanish_mirror, vocab_depth, pacing_bonus_min, modifier FROM `level` ORDER BY sort_order")))
    bands_rows = _rows(await db.execute(text(
        "SELECT code, label FROM age_band ORDER BY band_id")))
    objs = _rows(await db.execute(text(
        "SELECT cefr_level, kind, description FROM language_objective ORDER BY cefr_level, sort_order")))
    props = _rows(await db.execute(text(
        "SELECT proposal_id, level_code, band_code, scope, area, action, current_value, proposed_value, rationale, status "
        "FROM catalog_proposal ORDER BY FIELD(action,'add','change','remove','keep')")))
    by_obj: dict = {}
    for o in objs:
        by_obj.setdefault(o["cefr_level"], []).append({"kind": o["kind"], "description": o["description"]})
    by_lvl: dict = {}
    by_band: dict = {}
    for p in props:
        if p.get("band_code"):
            by_band.setdefault(p["band_code"], []).append(p)
        elif p.get("level_code"):
            by_lvl.setdefault(p["level_code"], []).append(p)
    out_levels = [{**lv, "objectives": by_obj.get(lv["level_code"], []), "proposals": by_lvl.get(lv["level_code"], [])}
                  for lv in levels]
    out_bands = [{**b, "proposals": by_band.get(b["code"], [])} for b in bands_rows]
    return {"levels": out_levels, "bands": out_bands}


@router.get("/comparison")
async def comparison(db: AsyncSession = Depends(get_db)):
    """Comparación orquestación antes/después del especialista (la última computada). Sin auth."""
    rows = _rows(await db.execute(text("SELECT data FROM comparison_result ORDER BY id DESC LIMIT 1")))
    import json
    return {"combos": json.loads(rows[0]["data"]) if rows else []}


@router.get("/transcripts")
async def transcripts(db: AsyncSession = Depends(get_db)):
    """Transcripciones de clases reales antes/después del especialista (3 perfiles). Sin auth."""
    rows = _rows(await db.execute(text("SELECT data FROM transcript_result ORDER BY id DESC LIMIT 1")))
    import json
    return json.loads(rows[0]["data"]) if rows else {"antes": [], "despues": []}


class KidsDemoIn(BaseModel):
    band: str = "early_child"
    level: str = "A1"
    topic_id: Optional[int] = None
    vocab: list[str] = ["dog", "cat", "lion", "bear", "rabbit"]   # vocab que SÍ tiene imagen


@router.post("/kids-class-demo")
async def kids_class_demo(payload: KidsDemoIn):
    """Genera una mini-clase visual de kids: el coach (motor) improvisa pero SOLO con el
    vocab que tiene imagen, y marca qué mostrar en cada turno. Dinámico (cada vez distinto)."""
    try:
        res = await motor_engine.resolve(payload.band, payload.level, payload.topic_id, None, None)
        coach = res.get("prompt", "")
        prompt = (coach + "\n\n--- MODO CLASE VISUAL (kids) ---\n"
                  f"Tenemos imágenes SOLO para este vocabulario: {', '.join(payload.vocab)}.\n"
                  "Dá una mini-clase dinámica de ~7 turnos sobre animales, usando SOLO ese vocabulario "
                  "(elegí vos el orden y cómo). En cada turno que enseñes un animal, indicá cuál en 'show' "
                  "(una de esas palabras EXACTAS, en minúscula). Turnos de apertura/cierre con show=null. "
                  "Estilo nene A1: español de apoyo + la palabra en inglés, cálido y simple.\n"
                  "Devolvé SOLO JSON: {\"turns\":[{\"text\":\"...\",\"show\":\"dog\"},{\"text\":\"...\",\"show\":null}]}")
        raw = await motor_protocol._run_llm(prompt, "claude")
        parsed = motor_protocol._parse_json(raw or "") or {}
        turns = [t for t in parsed.get("turns", []) if isinstance(t, dict) and t.get("text")]
        return {"turns": turns}
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


class ProposalDecideIn(BaseModel):
    action: str   # 'adopt' | 'reject'


@router.post("/catalog-proposals/{proposal_id}/decide")
async def catalog_proposal_decide(proposal_id: int, payload: ProposalDecideIn, db: AsyncSession = Depends(get_db)):
    """Marca una propuesta como adoptada/rechazada (registra la decisión del profe). Sin auth."""
    status = "adopted" if payload.action == "adopt" else "rejected"
    await db.execute(text("UPDATE catalog_proposal SET status=:s WHERE proposal_id=:id"),
                     {"s": status, "id": proposal_id})
    await db.commit()
    return {"proposal_id": proposal_id, "status": status}


# ════════════════════════════ Grabar/leer el CIRCUITO (edad×nivel) ════════════════════════════
class CircuitSaveIn(BaseModel):
    band_code: str
    level_code: str
    overrides: list[dict[str, Any]] = []   # [{slot,action,target_id?,body?}]


@router.post("/circuit/save")
async def circuit_save(payload: CircuitSaveIn):
    """Graba el circuito (overrides) de un edad×nivel. Sin auth (probador público)."""
    try:
        return await motor_engine.save_circuit(payload.band_code, payload.level_code, payload.overrides)
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")


@router.get("/circuit/{band_code}/{level_code}")
async def circuit_load(band_code: str, level_code: str):
    """Lee el circuito grabado de un edad×nivel (para pre-cargar el probador). Sin auth."""
    try:
        return await motor_engine.load_circuit(band_code, level_code)
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")

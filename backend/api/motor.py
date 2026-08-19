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
    # Catálogo Dinámico (V2)
    "student_types": {"group": "Catálogo Dinámico (V2)", "label": "Edades (CÓMO)"},
    "levels": {"group": "Catálogo Dinámico (V2)", "label": "Niveles (QUÉ)"},
    "topics": {"group": "Catálogo Dinámico (V2)", "label": "Tópicos (LÉXICO)"},
    "templates": {"group": "Catálogo Dinámico (V2)", "label": "Personalidad del Coach"},
    # Orquestación como DATO (reingeniería placeholders) — 100% editable, sin deploy
    "orchestration_templates": {"group": "Orquestación (placeholders)", "label": "Template (la FORMA del prompt)"},
    "age_level_matrix": {"group": "Orquestación (placeholders)", "label": "Cruces edad × nivel"},
    "conversation_rules": {"group": "Orquestación (placeholders)", "label": "Reglas universales (gateadas)"},
    # El catálogo de idiomas también es dato: alta de idioma = INSERT acá, sin build.
    # name_native es lo que entra al prompt como {idioma}; label es lo que se ve en los combos.
    "languages": {"group": "Orquestación (placeholders)", "label": "Idiomas ({idioma})"},
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
async def update_row(table: str, payload: dict = Body(...), db: AsyncSession = Depends(get_db)):
    """payload = {pk: {col: val, ...}, set: {col: val, ...}}

    SIN auth (2026-07-23, prod=QA pre-lanzamiento): el probador público /motor edita
    placeholders del catálogo con este PATCH. Re-poner `_: User = _admin` al lanzar."""
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
    """Selectores del playground: bandas (student_types), niveles (levels), catálogo de tópicos, alumnos (users)."""
    # 1. Bandas de edad (student_types).
    #    El tope de nivel y el grupo de fase eran dos if hardcodeados acá
    #    ("mini→3, junior→5, resto 99"). Ahora son columnas: cambiar hasta dónde
    #    llega una banda es un UPDATE, no un deploy. max_level_order NULL = sin
    #    tope (99 es el valor que espera el front).
    bands = _rows(await db.execute(text(
        "SELECT id AS band_id, slug AS code, name AS label, age_min AS min_age, "
        "age_max AS max_age, COALESCE(max_level_order, 99) AS max_level_order, "
        "phase_group FROM student_types ORDER BY sort_order, id")))

    # 1.b Disciplinas — salen de las CATEGORÍAS, que es donde vive el catálogo.
    #     No alcanza con derivarlas de los niveles: las disciplinas nuevas
    #     (musica, oficios, oratoria…) reusan los 7 niveles de idiomas en vez de
    #     tener escala propia, así que en `levels` sólo aparecen idiomas y
    #     fonetica. Se unen las dos fuentes para no perder ninguna.
    #     Salen SÓLO de las categorías: ahí vive el catálogo. Antes se unían con las de
    #     `levels` "para no perder ninguna", porque las disciplinas sin escala propia no
    #     aparecían del otro lado. Ese UNION mezclaba dos cosas distintas —una FAMILIA
    #     como 'conocimiento' aparecía en el combo al lado de una materia como 'oficios'—
    #     y ya no hace falta: la familia viaja aparte en discipline_families.
    #     Ahora salen de la TABLA `disciplines`, que es donde vive el interruptor. Antes se
    #     derivaban con DISTINCT sobre las categorías activas, y eso hacía que "apagar una
    #     disciplina" no fuera una operación sino un efecto secundario: para sacar fonética
    #     había que apagar SU categoría, y para sacar idiomas habría que apagar 18. Con la
    #     tabla, apagar una disciplina es un UPDATE de una fila y el combo se llena solo.
    disciplines = _rows(await db.execute(text(
        "SELECT slug, name FROM disciplines WHERE active = 1 ORDER BY sort_order, slug")))
    disciplines = [d["slug"] for d in disciplines if d.get("slug")]

    # 1.c Familia de cada disciplina. `discipline` hacía DOS trabajos: decir de qué
    #     ESCALERA cuelga el nivel y filtrar el catálogo. Ahora la familia decide la
    #     escalera (lenguaje = el idioma es el objeto de estudio; conocimiento = es el
    #     vehículo) y `discipline` queda sólo para el catálogo. Sin este mapa el front
    #     no puede saber que informática usa CON1-CON4 y no A0-C2.
    discipline_families = {r["discipline"]: r["family"] for r in _rows(await db.execute(text(
        "SELECT DISTINCT discipline, family FROM categories WHERE active = 1 "
        "UNION SELECT DISTINCT discipline, family FROM levels WHERE active = 1")))
        if r.get("discipline")}

    # 2. Niveles (levels) — SOLO los activos, con su disciplina.
    #    El probador filtraba por el prefijo del código ("FON..."); ahora la
    #    disciplina es un campo y viaja como dato. Sin el filtro por active los
    #    niveles ES1-3 (experimento ya revertido) seguían apareciendo.
    #    El ESCALÓN es la escalera única que comparten todas las disciplinas (tabla `escalones`).
    #    Antes cada familia mostraba su código interno —"B2" en idiomas, "CON1" en plomería— y
    #    no había forma de que el alumno entendiera que son comparables. Ahora el combo muestra
    #    "3 · Intermedio" en las dos, y el código queda como detalle para el que lo necesite.
    levels = _rows(await db.execute(text(
        "SELECT l.code AS level_code, l.friendly_name AS label, l.id AS sort_order, "
        "       l.discipline, l.family, l.escalon, e.nombre AS escalon_nombre, "
        "       e.descripcion AS escalon_desc "
        "FROM levels l LEFT JOIN escalones e ON e.orden = l.escalon "
        "WHERE l.active = 1 ORDER BY l.escalon, l.sort_order, l.id")))

    # 3. Tópicos (topics) — levels viaja para que el probador filtre por nivel
    #    elegido; la disciplina la hereda de su categoría (categories.discipline).
    #    category_label = el NOMBRE de la categoría, no el slug: el probador
    #    mostraba "inf-general" en el combo en vez de "Informática".
    db_topics = _rows(await db.execute(text(
        "SELECT t.id AS topic_id, t.title, t.segmento, t.levels, t.category, "
        "COALESCE(c.name, t.category) AS category_label, "
        "COALESCE(c.discipline, 'idiomas') AS discipline "
        "FROM topics t LEFT JOIN categories c ON c.id = t.category_id "
        "WHERE t.is_active = 1 ORDER BY t.title")))

    # 4. Alumnos — UNO POR EDAD, no los 21 de la tabla.
    #
    # El combo traia todos los usuarios de la base y era imposible de leer. Y peor: cada perfil
    # arrastraba su nivel, asi que elegir un alumno para probar te cambiaba la clase. Para el
    # probador alcanza con un representante de cada edad; el nivel lo manda el COMBO, no el
    # perfil (ver el efecto en MotorPlaygroundPanel: "EL NIVEL LO MANDA EL COMBO").
    #
    # Se elige el de menor id de cada edad — determinista, sin lista hardcodeada de nombres.
    students = _rows(await db.execute(text(
        "SELECT id AS student_id, nombre AS name, cefr_level AS level_code, age_group, "
        "base_language, target_language FROM users "
        "WHERE id IN (SELECT MIN(id) FROM users WHERE age_group IS NOT NULL GROUP BY age_group) "
        "ORDER BY FIELD(age_group,'mini','junior','teen','adult')")))

    # 4.b El nivel es del alumno POR MATERIA, no del alumno. Uno puede ser B2 en inglés,
    #     A1 en francés y principiante en historia — `users.cefr_level` no puede
    #     representar eso. `user_level` es un OVERRIDE: si no hay fila para la materia,
    #     el front cae al level_code del perfil. La materia es el idioma en `lenguaje` y
    #     la disciplina en `conocimiento` (mismo árbol que el resto del motor).
    niveles_por_materia: dict[int, dict[str, str]] = {}
    for r in _rows(await db.execute(text(
            "SELECT user_id, materia, level_code FROM user_level"))):
        niveles_por_materia.setdefault(r["user_id"], {})[r["materia"]] = r["level_code"]
    for s in students:
        s["levels_by_materia"] = niveles_por_materia.get(s["student_id"], {})

    # 5. Idiomas (languages) — el catálogo de idiomas es DATO: sumar portugués es un INSERT,
    # no una lista en el <option> del combo (que obligaría a un build para verlo).
    try:
        languages = _rows(await db.execute(text(
            "SELECT code, label, name_native FROM languages WHERE active=1 ORDER BY sort_order")))
    except Exception:
        languages = []

    # Relación tópicos-bandas sugeridas
    tbs = []
    for t in db_topics:
        # Mapear sugerencia según el segmento del tópico
        seg = t.get("segmento") or "adult"
        band_row = next((b for b in bands if b["code"] == seg), None)
        if band_row:
            tbs.append({"topic_id": t["topic_id"], "band_id": band_row["band_id"]})

    # Catálogo estructurado mockeado (para compatibilidad de interfaz con un solo grupo plano)
    catalog = [{
        "category_id": 1,
        "name": "Todos los Tópicos",
        "subcategories": [{
            "subcategory_id": 1,
            "category_id": 1,
            "name": "General",
            "topics": db_topics
        }]
    }]

    # Cruces edad × nivel que EXISTEN en la matriz. Sin la fila, el motor no
    # tiene instrucciones para ese cruce y no puede componer — el probador los
    # usa para deshabilitar la opción en vez de dejar elegir un combo muerto.
    cruces = _rows(await db.execute(text(
        "SELECT age_slug, level_code FROM age_level_matrix WHERE active = 1")))
    matrix_cruces = [f"{c['age_slug']}:{c['level_code']}" for c in cruces]

    return {"bands": bands, "levels": levels, "catalog": catalog, "students": students,
            "topic_suggested_band": tbs, "languages": languages,
            "disciplines": disciplines, "discipline_families": discipline_families,
            "matrix_cruces": matrix_cruces}


class ResolveIn(BaseModel):
    band_code: str
    level_code: str
    topic_id: Optional[int] = None
    student_id: Optional[int] = None
    test_overrides: Optional[list[dict[str, Any]]] = None   # [{slot,action,target_id?,body?}]


@router.post("/resolve")
async def resolve(payload: ResolveIn):
    """MOTOR v3 (JUBILADO) — se conserva SOLO para el back-office de guards /admin/reglas-motor,
    que muestra el prompt v3 mientras se editan los behavioral_guard. Las superficies de TEST
    (/finaltest, /mini-test) corren el motor v2 (resolve_v2). NO cablear superficies nuevas acá.
    test_overrides = jugar con guards en memoria (no persiste)."""
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


class LiveClassEndIn(BaseModel):
    student_id: int
    level_code: str
    transcript: list[dict]  # [{who: 'ai'|'user', text}]


@router.post("/live-class-end")
async def live_class_end(payload: LiveClassEndIn):
    """Post-clase del PROBADOR (/motor): la clase por voz alimenta la memoria del alumno
    elegido. Extrae observaciones pedagógicas del transcript (Gemini) y corre el MISMO
    protocolo SRS de siempre (motor_protocol) — la evolución del perfil queda persistida
    y la PRÓXIMA clase de ese alumno la lee (pilar HISTORIA). Sin auth (probador)."""
    import json as _json
    lines = [f"[{'Profe' if t.get('who') == 'ai' else 'Alumno'}] {t.get('text', '')}"
             for t in payload.transcript if (t.get('text') or '').strip()]
    if not lines:
        return {"applied": 0, "observations": []}
    convo = "\n".join(lines)[:12000]
    prompt = (
        "Sos un profesor de inglés analizando la transcripción de una clase por voz.\n"
        f"Nivel del alumno: {payload.level_code}.\n"
        'Devolvé JSON con este shape exacto: {"observations": ["...", "..."]}\n'
        "2 a 4 observaciones CORTAS en español sobre el ALUMNO (no sobre el profe): qué le "
        "costó (vocabulario, gramática, fluidez), qué usó bien, qué evitó, qué temas le "
        "interesaron. Concretas y accionables para la próxima clase. Si el alumno casi no "
        "habló, decilo en una observación.\n\nTRANSCRIPCIÓN:\n" + convo
    )
    raw = await motor_protocol._gemini(prompt)
    obs: list[str] = []
    if raw:
        try:
            obs = [str(o).strip() for o in (_json.loads(raw).get("observations") or []) if str(o).strip()][:4]
        except Exception:
            obs = []
    if not obs:
        return {"applied": 0, "observations": [], "error": "no se pudieron extraer observaciones"}
    try:
        result = await motor_protocol.process(payload.student_id, obs, payload.level_code, provider="gemini")
    except Exception as e:
        raise HTTPException(400, f"{type(e).__name__}: {e}")
    return {"observations": obs, **(result or {})}


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


# NOTA (F0-01): el endpoint /kids-class-demo (motor v3, sin consumidor frontend) se RETIRÓ. Era
# el único otro llamador de motor_engine.resolve (v3) fuera del back-office de guards.


@router.get("/kids-vocab")
async def kids_vocab(db: AsyncSession = Depends(get_db)):
    """Biblioteca core de vocab visual de kids (con su asset: Lottie .json / SVG .svg / emoji). Sin auth."""
    return _rows(await db.execute(text(
        "SELECT word_en, word_es, category, emoji, asset_file FROM kids_visual_vocab "
        "WHERE active=1 ORDER BY category, word_en")))


@router.get("/vocab-transcripts")
async def vocab_transcripts(db: AsyncSession = Depends(get_db)):
    """Transcripciones kids SIN vocab vs CON vocab (mismo motor nuevo). Análisis. Sin auth."""
    import json
    try:
        rows = _rows(await db.execute(text("SELECT data FROM vocab_transcript_result ORDER BY id DESC LIMIT 1")))
        return json.loads(rows[0]["data"]) if rows else {"profiles": []}
    except Exception:
        return {"profiles": []}


@router.get("/kids-visual-vocab")
async def kids_visual_vocab_all(db: AsyncSession = Depends(get_db)):
    """TODA la biblioteca visual kids (~1000 palabras, no solo lo linkeado a tópicos): el
    front la precarga entera al entrar a la sesión — no sabemos qué palabra va a nombrar
    el coach. Sin auth (es catálogo público de assets)."""
    rows = _rows(await db.execute(text(
        "SELECT word_en, word_es, emoji, asset_file FROM kids_visual_vocab")))
    return [{"word_en": r["word_en"], "word_es": r["word_es"],
             "emoji": r["emoji"], "asset_file": r["asset_file"]} for r in rows]


@router.get("/kids-topic-vocab")
async def kids_topic_vocab(db: AsyncSession = Depends(get_db)):
    """Cada tópico de kids con su vocab generado (palabra + visual + cobertura). Para curar. Sin auth."""
    rows = _rows(await db.execute(text(
        "SELECT t.topic_id, t.title, k.word_en, k.word_es, k.emoji, k.asset_file "
        "FROM topic_kids_vocab tkv "
        "JOIN topic t ON t.topic_id = tkv.topic_id "
        "JOIN kids_visual_vocab k ON k.word_en = tkv.word_en "
        "ORDER BY t.title, k.word_en")))
    by_topic: dict[int, dict[str, Any]] = {}
    for r in rows:
        t = by_topic.setdefault(r["topic_id"], {"topic_id": r["topic_id"], "title": r["title"], "vocab": []})
        t["vocab"].append({"word_en": r["word_en"], "word_es": r["word_es"],
                           "emoji": r["emoji"], "asset_file": r["asset_file"]})
    return list(by_topic.values())


class InfraResultIn(BaseModel):
    server: str
    turn_index: int = 0
    rtt_ms: Optional[int] = None
    ok: bool = True
    note: Optional[str] = None


@router.post("/infra-result")
async def infra_result(payload: InfraResultIn, db: AsyncSession = Depends(get_db)):
    """Loguea un round-trip de la prueba de infra (Heroku vs GCloud). Sin auth."""
    await db.execute(text("INSERT INTO infra_test_result (server,turn_index,rtt_ms,ok,note) "
                          "VALUES (:s,:t,:r,:o,:n)"),
                     {"s": payload.server[:20], "t": payload.turn_index, "r": payload.rtt_ms,
                      "o": payload.ok, "n": (payload.note or "")[:255]})
    await db.commit()
    return {"saved": True}


@router.get("/infra-results")
async def infra_results(db: AsyncSession = Depends(get_db)):
    """Resultados de la prueba de infra + resumen por servidor (p50/p95/min/max/fallos). Sin auth."""
    rows = _rows(await db.execute(text(
        "SELECT id,server,turn_index,rtt_ms,ok,note,created_at FROM infra_test_result ORDER BY id")))
    summary: dict[str, Any] = {}
    for srv in {r["server"] for r in rows}:
        vals = sorted(r["rtt_ms"] for r in rows if r["server"] == srv and r["ok"] and r["rtt_ms"] is not None)
        fails = sum(1 for r in rows if r["server"] == srv and not r["ok"])
        if vals:
            def pct(p: float) -> int:
                return vals[min(len(vals) - 1, int(p * len(vals)))]
            summary[srv] = {"n": len(vals), "fails": fails, "min": vals[0], "max": vals[-1],
                            "p50": pct(0.5), "p95": pct(0.95),
                            "avg": round(sum(vals) / len(vals))}
        else:
            summary[srv] = {"n": 0, "fails": fails}
    return {"rows": rows, "summary": summary}


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


# ──────────────────────────────────────────────────────────────────────────────────────
# EN VIVO: la frase del alumno, bien dicha
# ──────────────────────────────────────────────────────────────────────────────────────
class FraseBody(BaseModel):
    texto: str
    idioma: str = "en"
    nivel: str = ""
    idioma_base: str = "es"


@router.post("/frase-corregida")
async def frase_corregida(body: FraseBody):
    """La MISMA frase del alumno, bien dicha. Para la ventana lateral, DURANTE la clase.

    Por qué acá y no en el camino de voz: esto NO puede tocar la charla. Es una llamada
    aparte, a un modelo de texto barato, que corre mientras el coach sigue hablando. Si
    tarda o falla, la clase no se entera — devuelve el texto original y listo.

    No es el post-clase: el post-clase mira la charla entera y saca el patrón. Esto es el
    espejo inmediato de UNA frase, que es lo que sirve mientras hablás.
    """
    texto = (body.texto or "").strip()
    if not texto or len(texto) < 2:
        return {"corregida": texto, "cambio": False}
    import logging
    from services.session_analyzer import _gemini_complete
    log = logging.getLogger(__name__)
    prompt = (
        "Sos un profesor de idiomas. Te paso UNA frase que dijo un alumno, transcripta de su voz.\n"
        f"El alumno está aprendiendo: {body.idioma}. Su lengua materna: {body.idioma_base}."
        + (f" Nivel: {body.nivel}.\n" if body.nivel else "\n") +
        "Devolvé la MISMA frase bien dicha en el idioma en que el alumno la dijo — no la traduzcas.\n"
        "Corregí gramática, concordancia y naturalidad. Mantené su intención y su registro: es la\n"
        "frase de él, mejor dicha. NO la hagas más larga, NO agregues ideas, NO expliques.\n"
        "Si ya está bien dicha, devolvela igual y marcá cambio=false.\n"
        "Ojo: viene de una transcripción de voz, así que puede tener palabras mal escuchadas. Si la\n"
        "frase no se entiende o es puro ruido, devolvela igual con cambio=false — no inventes.\n"
        'Devolvé SOLO JSON: {"corregida": "...", "cambio": true|false}'
    )
    try:
        out = await _gemini_complete(prompt, texto)
    except Exception as e:
        log.warning("frase_corregida falló: %s", e)
        return {"corregida": texto, "cambio": False, "error": str(e)[:120]}
    corr = (out or {}).get("corregida") or texto
    return {"corregida": corr, "cambio": bool((out or {}).get("cambio")) and corr.strip() != texto}


@router.get("/postclase/ultima")
async def postclase_ultima(student_id: int, db: AsyncSession = Depends(get_db)):
    """Lo que el POST-CLASE sacó de la última clase de este alumno.

    Se pide por alumno y no por session_id para no tocar el WebSocket de voz: el camino de la
    charla queda exactamente igual. Los dos destiladores corren en background al cerrar, así
    que esto se pregunta unos segundos después y puede venir a medias — cada bloque avisa si
    todavía no está.
    """
    s = (await db.execute(text(
        "SELECT id, topic_id, cefr_at_start, status, score, report, metrics, duration_seconds, "
        "created_at FROM sessions WHERE user_id = :u ORDER BY id DESC LIMIT 1"),
        {"u": student_id})).mappings().first()
    if not s:
        return {"hay": False, "motivo": "este alumno todavía no tiene clases guardadas"}

    import json as _json

    def _j(v):
        if not v:
            return None
        if isinstance(v, (dict, list)):
            return v
        try:
            return _json.loads(v)
        except Exception:
            return None

    hist = (await db.execute(text(
        "SELECT materia, top_error, interests, mastered, review, updated_at FROM learner_state "
        "WHERE student_id = :u ORDER BY updated_at DESC"), {"u": student_id})).mappings().all()
    return {
        "hay": True,
        "session": {"id": s["id"], "topic_id": s["topic_id"], "nivel": s["cefr_at_start"],
                    "status": s["status"], "duracion_s": s["duration_seconds"],
                    "cuando": str(s["created_at"])},
        # El ANÁLISIS de la clase (session_analyzer): score interno + dimensiones + devolución.
        "analisis": {"score": s["score"], "reporte": _j(s["report"]), "metricas": _j(s["metrics"]),
                     "listo": s["score"] is not None},
        # La MEMORIA destilada (learner_state_writer), por materia.
        "memoria": [{"materia": h["materia"], "top_error": h["top_error"],
                     "interests": _j(h["interests"]) or [], "mastered": _j(h["mastered"]) or [],
                     "review": h["review"], "cuando": str(h["updated_at"])} for h in hist],
    }

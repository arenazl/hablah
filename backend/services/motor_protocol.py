"""PROTOCOLO: convierte texto libre de una clase en PRESETS canónicos.

Doctrina (charlada con el usuario):
- learned_state = ESTADO, no narrativa. La salida SIEMPRE es preset estructurado,
  NUNCA texto libre. El texto libre entra; sale encasillado.
- Lista de presets DINÁMICA (no catálogo fijo): el protocolo canonicaliza
  (mismo error/chunk -> mismo canonical_key) => dedupe => converge.
- Lo nuevo entra como status='candidate'; el profe lo bendice (-> 'active').

Motor LLM PLUGGABLE:
- provider='claude'  -> Claude headless (`claude -p`). SOLO para CONSTRUIR las
  orquestaciones (back-office /motor, diseño/post-proceso). Usa la sub Max, sin API tokens.
- provider='gemini'  -> la APP en producción (alumnos reales). Seam para cablear.

Tablas: learned_preset (dinámica) + learner_preset (estado por alumno).
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import unicodedata
from typing import Optional

import httpx

from core.config import settings
from services import motor_engine  # reutiliza _connect() -> MotorDB (Aiven SSL)

_CLAUDE_MODEL = "claude-haiku-4-5-20251001"
_ERR_PATTERNS = ("Failed to authenticate", "API Error:", "401", "403",
                 "authentication_error", "rate_limit_error", "Internal Server Error")


# ───────────────────────── motores LLM (pluggable) ─────────────────────────
async def _claude_headless(prompt: str, timeout: float = 120.0) -> Optional[str]:
    """Claude Code CLI headless. SOLO construcción/prueba de orquestaciones.
    Por SHELL + prompt por STDIN: multiplataforma (en Windows `claude` es un shim
    .CMD de Volta que create_subprocess_exec no resuelve) y sin quoting frágil."""
    clean_env = {k: v for k, v in os.environ.items() if k != "CLAUDECODE"}
    try:
        proc = await asyncio.create_subprocess_shell(
            f"claude -p --model {_CLAUDE_MODEL}",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=clean_env)
        out, _ = await asyncio.wait_for(proc.communicate(prompt.encode("utf-8")), timeout=timeout)
        text = out.decode("utf-8", errors="replace").strip()
        if not text:
            return None
        if any(p.lower() in text.lower() for p in _ERR_PATTERNS) and len(text) < 400:
            return None
        return text
    except (asyncio.TimeoutError, Exception):
        return None


async def _gemini(prompt: str, timeout: float = 60.0) -> Optional[str]:
    """Gemini 2.5 Flash por REST (anda en Heroku con GEMINI_API_KEY). La APP en
    producción categoriza acá. responseMimeType=json => salida JSON pura."""
    key = settings.GEMINI_API_KEY
    if not key:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={key}"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 1500, "responseMimeType": "application/json"},
    }
    try:
        async with httpx.AsyncClient(timeout=timeout) as cli:
            r = await cli.post(url, json=body)
            r.raise_for_status()
            data = r.json()
        raw = "".join(p.get("text", "") for c in data.get("candidates", [])
                      for p in (c.get("content") or {}).get("parts", []))
        return raw.strip() or None
    except Exception:
        return None


async def _run_llm(prompt: str, provider: str) -> Optional[str]:
    """provider: 'claude' (construcción local) · 'gemini' (app/prod) · 'auto' (claude→gemini)."""
    if provider == "gemini":
        return await _gemini(prompt)
    if provider == "claude":
        return await _claude_headless(prompt)
    # auto: probar Claude headless (construcción local); si no está el CLI, caer a Gemini (prod)
    return (await _claude_headless(prompt)) or (await _gemini(prompt))


# ───────────────────────── el protocolo ─────────────────────────
_PROMPT = """Sos un analizador pedagógico (inglés como L2, alumno hispanohablante). Convertís
observaciones en TEXTO LIBRE de una clase en PRESETS canónicos y estructurados.

REGLAS DURAS:
- Salida = SOLO un JSON válido. Nada de prosa, ni markdown, ni explicaciones.
- Cada observación se reduce a su PATRÓN, no a la frase puntual.
  "I have 20 years" y "she has 30 years" => MISMO patrón (canonical_key "AGE_HAVE").
- canonical_key: MAYÚSCULAS_CON_GUION_BAJO, estable y reutilizable.
- DEDUPE: si el patrón YA está en PRESETS_EXISTENTES, reusá su canonical_key y poné "match":"existing".
  Si es nuevo, "match":"new".
- kind: "error" (algo que el alumno hace mal) o "chunk" (vocabulario/frase que usó o necesita).
- label: en castellano, claro para un profe (no técnico).
- Para errores: example_wrong y example_right. Para chunks: example_right = la frase en inglés; example_wrong = null.
- category: gramática | vocabulario | preposición | orden | concordancia | falso_amigo | comportamiento | motivación | otro.
- level_hint: nivel CEFR donde típicamente aparece (A1..C1) o null.
- ANATOMÍA de cada patrón (obligatoria):
  - polarity: "positive" (fortaleza / lo que aprovechás) | "negative" (lo que hay que trabajar) | "neutral".
  - directive: instrucción CORTA al coach de qué hacer con esto en la próxima clase.
      positivo -> aprovechá/reforzá ; negativo -> andamiá/repasá.
  - confidence: 0..1, qué tan seguro estás de que el patrón es REAL según la evidencia (1=clarísimo, <0.5=dudoso).
- kind admite, además de error/chunk: "comportamiento" (cómo actúa el alumno) y "motivación" (qué lo mueve/traba).

ADEMÁS devolvé "objectives": de OBJETIVOS_DEL_NIVEL, cuáles se PRACTICARON en la clase y con qué
desempeño. Usá SOLO objective_id de esa lista. score: "good" | "partial" | "fail".

ADEMÁS devolvé "stage_analysis": un análisis recorriendo las 9 ETAPAS del motor, una nota CORTA
por etapa de qué mostró ESTA clase (qué se cumplió, qué falló, qué ajustar). Si no hay datos, "sin datos".
Las 9 etapas:
  1 Contexto · 2 Quién enseña · 3 Cómo enseña · 4 La dinámica · 5 Memoria del alumno ·
  6 Reglas/rieles · 7 Qué aprende · 8 Fases y ritmo · 9 Arranque/cierre

NIVEL DE LA CLASE: {level}

PRESETS_EXISTENTES (para dedupe):
{existing}

OBJETIVOS_DEL_NIVEL (para marcar desempeño; usá estos objective_id):
{objectives}

OBSERVACIONES (texto libre):
{observations}

Devolvé EXACTAMENTE este formato (sin nada más):
{{"presets":[{{"kind":"error","canonical_key":"AGE_HAVE","label":"Dice la edad con 'have'","category":"gramática","polarity":"negative","directive":"Recast suave; modelá 'I am X' sin señalar el error.","confidence":0.95,"level_hint":"A1","example_wrong":"I have 20 years","example_right":"I am 20","match":"new"}}],
"objectives":[{{"objective_id":12,"score":"good"}}],
"stage_analysis":[{{"stage":7,"name":"Qué aprende","note":"Practicó pasado simple, falló en present perfect."}}]}}"""


def _build_prompt(observations: list[str], level_code: str, existing: list[dict], objectives: list[dict]) -> str:
    ex = "\n".join(f"- [{e['kind']}] {e['canonical_key']}: {e['label']}" for e in existing) or "(ninguno todavía)"
    ob = "\n".join(f"- id={o['objective_id']} [{o.get('code', '')}] {o['description']}" for o in objectives) or "(ninguno)"
    obs = "\n".join(f"- {o}" for o in observations if o and o.strip()) or "(ninguna)"
    return _PROMPT.format(level=level_code, existing=ex, objectives=ob, observations=obs)


def _parse_json(raw: str) -> Optional[dict]:
    """Claude a veces envuelve en ```json o agrega texto: extraigo el primer objeto."""
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


# ───────────────────────── BD (sync, corre en thread) ─────────────────────────
def _load_existing_sync() -> list[dict]:
    db = motor_engine._connect()
    try:
        return db.q("SELECT kind, canonical_key, label FROM learned_preset WHERE status IN ('candidate','active') ORDER BY kind, canonical_key")
    finally:
        db.conn.close()


def _load_objectives_sync(level_code: str) -> list[dict]:
    db = motor_engine._connect()
    try:
        return db.q("SELECT objective_id, code, description FROM language_objective WHERE cefr_level=%s ORDER BY sort_order", (level_code,))
    finally:
        db.conn.close()


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s)).strip()


def _tokens(s: str) -> set:
    return {t for t in _norm(s).split() if len(t) > 2}


_KINDS = ("error", "chunk", "comportamiento", "motivacion")
_POLARITIES = ("positive", "negative", "neutral")
_CONF_AUTO = 0.75  # >= se aplica solo (active); por debajo queda candidate para revisar


def _norm_kind(k) -> str:
    return _norm(k or "").replace(" ", "")  # "motivación" -> "motivacion"


def _looks_same(p: dict, ex: dict) -> bool:
    """Capa 2: ¿el preset nuevo del LLM es en realidad uno que ya existe?
    Determinístico: misma kind, label casi igual (Jaccard de tokens >= 0.6) o
    una key contenida en la otra. No depende de que el LLM no se equivoque."""
    if p["kind"] != ex["kind"]:
        return False
    la, lb = _norm(p.get("label", "")), _norm(ex.get("label", ""))
    if la and la == lb:
        return True
    ta, tb = _tokens(p.get("label", "")), _tokens(ex.get("label", ""))
    if ta and tb:
        jac = len(ta & tb) / len(ta | tb)
        if jac >= 0.6:
            return True
    ka, kb = _norm(p.get("canonical_key", "")).replace(" ", ""), _norm(ex.get("canonical_key", "")).replace(" ", "")
    return bool(ka and kb and (ka in kb or kb in ka))


def _apply_sync(student_id: int, presets: list[dict]) -> dict:
    db = motor_engine._connect()
    rep = {"new_presets": [], "reinforced": [], "merged": [], "applied": 0}
    # snapshot de lo que ya existe (para la red determinística de la capa 2)
    existing = db.q("SELECT preset_id, kind, canonical_key, label FROM learned_preset")
    try:
        with db.conn.cursor() as cur:
            for p in presets:
                kind = _norm_kind(p.get("kind")); ckey = (p.get("canonical_key") or "").strip().upper()[:60]
                if kind not in _KINDS or not ckey:
                    continue
                pp = {"kind": kind, "canonical_key": ckey, "label": p.get("label") or ckey}
                # 1) match exacto por canonical_key  2) red determinística por parecido
                hit = next((e for e in existing if e["kind"] == kind and e["canonical_key"] == ckey), None)
                if not hit:
                    hit = next((e for e in existing if _looks_same(pp, e)), None)
                    if hit:
                        rep["merged"].append({"propuesto": ckey, "fusionado_en": hit["canonical_key"]})
                if hit:
                    pid = hit["preset_id"]
                else:
                    pol = _norm(p.get("polarity"))
                    polarity = pol if pol in _POLARITIES else "neutral"
                    conf = p.get("confidence")
                    # AUTONOMÍA: alta confianza entra como 'active' (se aplica solo); baja, 'candidate'
                    status = "active" if isinstance(conf, (int, float)) and conf >= _CONF_AUTO else "candidate"
                    cur.execute(
                        """INSERT INTO learned_preset
                           (kind, canonical_key, label, category, polarity, directive, level_hint, example_wrong, example_right, source, status)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'protocol',%s)""",
                        (kind, ckey, pp["label"][:180], (p.get("category") or None), polarity,
                         (p.get("directive") or None), (p.get("level_hint") or None),
                         (p.get("example_wrong") or None), (p.get("example_right") or None), status))
                    pid = cur.lastrowid
                    existing.append({"preset_id": pid, "kind": kind, "canonical_key": ckey, "label": pp["label"]})
                    rep["new_presets"].append({"preset_id": pid, "kind": kind, "canonical_key": ckey, "label": p.get("label"), "status": status})
                # estado del alumno: refuerza ocurrencia o lo crea (active = a trabajar)
                exists = db.q1("SELECT 1 FROM learner_preset WHERE student_id=%s AND preset_id=%s", (student_id, pid))
                if exists:
                    cur.execute("UPDATE learner_preset SET occurrences=occurrences+1, last_seen=NOW() WHERE student_id=%s AND preset_id=%s", (student_id, pid))
                    rep["reinforced"].append(ckey)
                else:
                    cur.execute("INSERT INTO learner_preset (student_id, preset_id, state, occurrences, last_seen) VALUES (%s,%s,'active',1,NOW())", (student_id, pid))
                rep["applied"] += 1
        db.conn.commit()
        return rep
    finally:
        db.conn.close()


def _apply_objectives_sync(student_id: int, objectives: list[dict], valid_ids: set) -> dict:
    """La MANO (SRS) sobre los objetivos del catálogo: la escalera que YA converge,
    intacta. Reusa motor_postclass.record_objective. Solo objective_id válidos del nivel."""
    db = motor_engine._connect()
    out = {"objectives_applied": {}}
    try:
        for o in objectives or []:
            try:
                oid = int(o.get("objective_id"))
            except (TypeError, ValueError):
                continue
            score = o.get("score")
            if oid not in valid_ids or score not in ("good", "partial", "fail"):
                continue
            out["objectives_applied"][oid] = motor_engine.motor_postclass.record_objective(db, student_id, oid, score)
        db.conn.commit()
        return out
    finally:
        db.conn.close()


# ───────────────────────── API del protocolo ─────────────────────────
def _student_presets_sync(student_id: int) -> list[dict]:
    db = motor_engine._connect()
    try:
        return db.q(
            """SELECT lp.preset_id, lp.kind, lp.canonical_key, lp.label, lp.category,
                      lp.polarity, lp.directive, lp.level_hint, lp.example_wrong, lp.example_right, lp.status,
                      lpe.state, lpe.occurrences
               FROM learner_preset lpe JOIN learned_preset lp ON lp.preset_id=lpe.preset_id
               WHERE lpe.student_id=%s ORDER BY lpe.occurrences DESC, lpe.last_seen DESC""",
            (student_id,))
    finally:
        db.conn.close()


async def student_presets(student_id: int) -> list[dict]:
    """Presets que el alumno arrastra (para mostrarlos en la etapa 5 del editor)."""
    return await asyncio.to_thread(_student_presets_sync, student_id)


# ───────────────────────── perfiles por edad×nivel (banco de pruebas) ─────────────────────────
_BAND_AGE = {"early_child": 5, "child": 10, "teen": 15, "adult": 30}


def _get_or_create_profile_sync(band_code: str, level_code: str) -> dict:
    """Un alumno-molde por (edad, nivel). Acumula su propio learned_state."""
    key = f"{band_code}:{level_code}"
    db = motor_engine._connect()
    try:
        row = db.q1("SELECT student_id, name FROM student WHERE profile_key=%s", (key,))
        if row:
            return {"student_id": row["student_id"], "name": row["name"], "profile_key": key}
        name = f"Perfil · {band_code} · {level_code}"
        with db.conn.cursor() as cur:
            cur.execute("INSERT INTO student (name, profile_key, age, level_code) VALUES (%s,%s,%s,%s)",
                        (name, key, _BAND_AGE.get(band_code, 18), level_code))
            sid = cur.lastrowid
        db.conn.commit()
        return {"student_id": sid, "name": name, "profile_key": key}
    finally:
        db.conn.close()


def _wipe_sync(student_id: int) -> dict:
    """Borra TODO el learned_state del perfil/alumno (para ver la clase sin historial)."""
    db = motor_engine._connect()
    try:
        with db.conn.cursor() as cur:
            cur.execute("DELETE FROM learner_preset WHERE student_id=%s", (student_id,)); n1 = cur.rowcount
            cur.execute("DELETE FROM learner_objective WHERE student_id=%s", (student_id,)); n2 = cur.rowcount
            cur.execute("DELETE FROM learner_item WHERE student_id=%s", (student_id,)); n3 = cur.rowcount
        db.conn.commit()
        return {"wiped": {"presets": n1, "objectives": n2, "items": n3}}
    finally:
        db.conn.close()


async def get_or_create_profile(band_code: str, level_code: str) -> dict:
    return await asyncio.to_thread(_get_or_create_profile_sync, band_code, level_code)


async def wipe_learned_state(student_id: int) -> dict:
    return await asyncio.to_thread(_wipe_sync, student_id)


async def categorize(observations: list[str], level_code: str, *, objectives_catalog: Optional[list] = None, provider: str = "auto") -> dict:
    """Texto libre -> presets canónicos + objetivos practicados + análisis (sin tocar BD)."""
    existing = await asyncio.to_thread(_load_existing_sync)
    if objectives_catalog is None:
        objectives_catalog = await asyncio.to_thread(_load_objectives_sync, level_code)
    raw = await _run_llm(_build_prompt(observations, level_code, existing, objectives_catalog), provider)
    if not raw:
        return {"presets": [], "error": "llm_sin_respuesta"}
    parsed = _parse_json(raw)
    if not parsed or "presets" not in parsed:
        return {"presets": [], "error": "json_invalido", "raw": raw[:300]}
    return {"presets": parsed["presets"], "objectives": parsed.get("objectives", []),
            "stage_analysis": parsed.get("stage_analysis", [])}


async def process(student_id: int, observations: list[str], level_code: str, *, provider: str = "auto") -> dict:
    """MOTOR POST-CLASE unificado: texto libre -> classify (ojos) -> SRS (mano).
    - patrones (error/chunk/comportamiento/motivación) -> learner_preset (escalera de patrones).
    - objetivos del catálogo -> record_objective (la escalera que YA converge, intacta).
    - errores como PATRONES, nunca texto libre. + análisis por etapa.
    Corre solo (autonomía): alta confianza se aplica; el resto queda candidate."""
    objectives_catalog = await asyncio.to_thread(_load_objectives_sync, level_code)
    cat = await categorize(observations, level_code, objectives_catalog=objectives_catalog, provider=provider)
    if cat.get("error"):
        return cat
    rep = await asyncio.to_thread(_apply_sync, student_id, cat["presets"])
    valid_ids = {o["objective_id"] for o in objectives_catalog}
    objrep = await asyncio.to_thread(_apply_objectives_sync, student_id, cat.get("objectives", []), valid_ids)
    return {"presets": cat["presets"], "objectives": cat.get("objectives", []),
            "stage_analysis": cat.get("stage_analysis", []), **rep, **objrep}

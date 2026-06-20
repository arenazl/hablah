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
- category: gramática | vocabulario | preposición | orden | concordancia | falso_amigo | otro.
- level_hint: nivel CEFR donde típicamente aparece (A1..C1) o null.

NIVEL DE LA CLASE: {level}

PRESETS_EXISTENTES (para dedupe):
{existing}

OBSERVACIONES (texto libre):
{observations}

Devolvé EXACTAMENTE este formato:
{{"presets":[{{"kind":"error","canonical_key":"AGE_HAVE","label":"Dice la edad con 'have'","category":"gramática","level_hint":"A1","example_wrong":"I have 20 years","example_right":"I am 20","match":"new"}}]}}"""


def _build_prompt(observations: list[str], level_code: str, existing: list[dict]) -> str:
    ex = "\n".join(f"- [{e['kind']}] {e['canonical_key']}: {e['label']}" for e in existing) or "(ninguno todavía)"
    obs = "\n".join(f"- {o}" for o in observations if o and o.strip()) or "(ninguna)"
    return _PROMPT.format(level=level_code, existing=ex, observations=obs)


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


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", s)).strip()


def _tokens(s: str) -> set:
    return {t for t in _norm(s).split() if len(t) > 2}


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
                kind = p.get("kind"); ckey = (p.get("canonical_key") or "").strip().upper()[:60]
                if kind not in ("error", "chunk") or not ckey:
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
                    cur.execute(
                        """INSERT INTO learned_preset
                           (kind, canonical_key, label, category, level_hint, example_wrong, example_right, source, status)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,'protocol','candidate')""",
                        (kind, ckey, pp["label"][:180], (p.get("category") or None),
                         (p.get("level_hint") or None), (p.get("example_wrong") or None), (p.get("example_right") or None)))
                    pid = cur.lastrowid
                    existing.append({"preset_id": pid, "kind": kind, "canonical_key": ckey, "label": pp["label"]})
                    rep["new_presets"].append({"preset_id": pid, "kind": kind, "canonical_key": ckey, "label": p.get("label")})
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


# ───────────────────────── API del protocolo ─────────────────────────
def _student_presets_sync(student_id: int) -> list[dict]:
    db = motor_engine._connect()
    try:
        return db.q(
            """SELECT lp.preset_id, lp.kind, lp.canonical_key, lp.label, lp.category,
                      lp.level_hint, lp.example_wrong, lp.example_right, lp.status,
                      lpe.state, lpe.occurrences
               FROM learner_preset lpe JOIN learned_preset lp ON lp.preset_id=lpe.preset_id
               WHERE lpe.student_id=%s ORDER BY lpe.occurrences DESC, lpe.last_seen DESC""",
            (student_id,))
    finally:
        db.conn.close()


async def student_presets(student_id: int) -> list[dict]:
    """Presets que el alumno arrastra (para mostrarlos en la etapa 5 del editor)."""
    return await asyncio.to_thread(_student_presets_sync, student_id)


async def categorize(observations: list[str], level_code: str, *, provider: str = "auto") -> dict:
    """Texto libre -> presets canónicos (sin tocar BD). Devuelve {'presets':[...]} o {'error':...}."""
    existing = await asyncio.to_thread(_load_existing_sync)
    raw = await _run_llm(_build_prompt(observations, level_code, existing), provider)
    if not raw:
        return {"presets": [], "error": "llm_sin_respuesta"}
    parsed = _parse_json(raw)
    if not parsed or "presets" not in parsed:
        return {"presets": [], "error": "json_invalido", "raw": raw[:300]}
    return {"presets": parsed["presets"]}


async def process(student_id: int, observations: list[str], level_code: str, *, provider: str = "auto") -> dict:
    """Pipeline completo: texto libre -> presets -> estado del alumno (learner_preset)."""
    cat = await categorize(observations, level_code, provider=provider)
    if cat.get("error"):
        return cat
    rep = await asyncio.to_thread(_apply_sync, student_id, cat["presets"])
    return {"presets": cat["presets"], **rep}

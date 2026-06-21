"""Aplica las propuestas del especialista (catalog_proposal) al catálogo real.

Seguro: snapshot previo (#1) ya existe. Por grupo (nivel/edad) la IA convierte las
propuestas en OPERACIONES concretas (insert/update) con las filas reales como contexto;
se VALIDAN contra el schema (tablas/columnas permitidas) y se ejecutan en transacción.
Después corre un smoke (15 combos resuelven con 9 etapas); si algo rompe -> ROLLBACK.
"""
from __future__ import annotations
import asyncio
import json
import os
import re
import ssl
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402
from services import motor_protocol as mp  # noqa: E402

_HERE = os.path.dirname(__file__)
for _p in (os.path.normpath(os.path.join(_HERE, "..", "..", "Motor-Learning")),
           os.path.normpath(os.path.join(_HERE, "..", "motor_core"))):
    if os.path.exists(os.path.join(_p, "motor_prompt.py")):
        sys.path.insert(0, _p); break
import motor_prompt  # noqa: E402
sys.path.insert(0, _HERE)
from snapshot_catalog import restore  # noqa: E402

import pymysql
from pymysql.cursors import DictCursor

# tablas que la IA puede tocar (whitelist)
ALLOWED = {"level", "level_policy", "behavioral_guard", "band_policy", "language_objective",
           "tutor_identity", "pedagogy", "activity_type", "reward", "phase", "trigger_template"}

SCHEMA = """Tablas y columnas (respetá enums):
- language_objective(objective_id PK auto, cefr_level CHAR2, code VARCHAR20 UNICO, kind ENUM[vocabulary,grammar,function,discourse], description VARCHAR200, sort_order INT)
- `level`(level_code PK, spanish_mirror ENUM[always,frequent,on_stall,never], vocab_depth ENUM[minimal,full], pacing_bonus_min INT, modifier VARCHAR255)
- level_policy(policy_id PK auto, level_code CHAR2, kind ENUM[hint_policy,error_policy], body VARCHAR300)
- behavioral_guard(guard_id PK auto, band_id INT, ord INT, body VARCHAR300)
- band_policy(policy_id PK auto, band_id INT, kind VARCHAR60[etiqueta corta libre], body VARCHAR300)
  OJO: tutor_identity, pedagogy, activity_type, reward tienen UNA fila por band_id -> para esas usá op "update" (no insert).
- tutor_identity(tutor_id PK auto, band_id INT, name, persona, tone)
- pedagogy(pedagogy_id PK auto, band_id INT, methodology VARCHAR400)
- activity_type(activity_id PK auto, band_id INT, description VARCHAR300)
- reward(reward_id PK auto, band_id INT, description VARCHAR300)
- phase(phase_id PK auto, band_group ENUM[kid,teen,adult], name, ord INT)
- trigger_template(template_id PK auto, band_group ENUM[kid,teen,adult], kind ENUM[opening,continuation,closing], body VARCHAR500, level_code CHAR2 NULL)"""

PROMPT = """Sos un ingeniero de datos pedagógico. Convertí estas PROPUESTAS aprobadas en OPERACIONES
de base concretas y válidas. Tenés las filas ACTUALES como contexto (usá sus ids/codes reales para update).

{schema}

CONTEXTO ({scope_label}):
{context}

PROPUESTAS A APLICAR:
{proposals}

Reglas:
- 'add' -> op "insert" con todas las columnas necesarias (para code de language_objective generá uno único tipo "A1-FUN-09").
- 'change' -> op "update" con "where" por la PK real de la fila que corresponde (mirá el contexto).
- 'remove' -> op "delete" con "where" por PK.
- 'keep' -> ignorala (no generes op).
- NO inventes columnas. Respetá los enums. Valores cortos y válidos.

Devolvé SOLO JSON:
{{"ops":[{{"table":"language_objective","op":"insert","values":{{"cefr_level":"A1","code":"A1-FUN-09","kind":"function","description":"...","sort_order":20}}}},
        {{"table":"level","op":"update","where":{{"level_code":"A1"}},"values":{{"spanish_mirror":"always"}}}}]}}"""


def _connect():
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                           password=settings.DB_PASSWORD, database=settings.DB_NAME,
                           ssl=ctx, cursorclass=DictCursor, charset="utf8mb4", autocommit=False)


def _cols(cur, table):
    cur.execute("SELECT COLUMN_NAME AS n FROM information_schema.columns WHERE table_schema=%s AND table_name=%s",
                (settings.DB_NAME, table))
    return {r["n"] for r in cur.fetchall()}


def _context_for(cur, level_code, band_code):
    """Filas actuales relevantes al grupo, para que la IA targetee bien."""
    out = []
    if level_code:
        cur.execute("SELECT objective_id, code, kind, description FROM language_objective WHERE cefr_level=%s", (level_code,))
        out.append("language_objective: " + json.dumps(cur.fetchall(), ensure_ascii=False, default=str))
        cur.execute("SELECT level_code, spanish_mirror, vocab_depth, pacing_bonus_min FROM `level` WHERE level_code=%s", (level_code,))
        out.append("level: " + json.dumps(cur.fetchall(), ensure_ascii=False, default=str))
        cur.execute("SELECT policy_id, kind, body FROM level_policy WHERE level_code=%s", (level_code,))
        out.append("level_policy: " + json.dumps(cur.fetchall(), ensure_ascii=False, default=str))
    if band_code:
        cur.execute("SELECT band_id, phase_group FROM age_band WHERE code=%s", (band_code,))
        b = cur.fetchone(); bid = b["band_id"]; pg = b["phase_group"]
        out.append(f"band_id={bid} phase_group={pg}")
        for tb, q in [("tutor_identity", "SELECT tutor_id, name, persona, tone FROM tutor_identity WHERE band_id=%s"),
                      ("pedagogy", "SELECT pedagogy_id, methodology FROM pedagogy WHERE band_id=%s"),
                      ("band_policy", "SELECT policy_id, kind, body FROM band_policy WHERE band_id=%s"),
                      ("activity_type", "SELECT activity_id, description FROM activity_type WHERE band_id=%s"),
                      ("reward", "SELECT reward_id, description FROM reward WHERE band_id=%s")]:
            cur.execute(q, (bid,)); out.append(f"{tb}: " + json.dumps(cur.fetchall(), ensure_ascii=False, default=str))
        cur.execute("SELECT phase_id, name, ord FROM phase WHERE band_group=%s ORDER BY ord", (pg,))
        out.append("phase: " + json.dumps(cur.fetchall(), ensure_ascii=False, default=str))
        return "\n".join(out), bid, pg
    return "\n".join(out), None, None


def _valid_op(cur, op, colcache):
    t = op.get("table")
    if t not in ALLOWED or op.get("op") not in ("insert", "update", "delete"):
        return False
    if t not in colcache:
        colcache[t] = _cols(cur, t)
    cols = colcache[t]
    for d in (op.get("values") or {}), (op.get("where") or {}):
        for k in d:
            if k not in cols:
                return False
    if op["op"] in ("update", "delete") and not op.get("where"):
        return False
    if op["op"] in ("insert", "update") and not op.get("values"):
        return False
    return True


_ONE_PER_BAND = {"activity_type", "reward", "pedagogy", "tutor_identity"}


def _exec_op(cur, op, bid, pg):
    t = op["table"]; vals = dict(op.get("values") or {})
    if op["op"] == "insert":
        cols = list(vals.keys()); ph = ",".join(["%s"] * len(cols))
        try:
            cur.execute(f"INSERT INTO `{t}` ({','.join('`'+c+'`' for c in cols)}) VALUES ({ph})", [vals[c] for c in cols])
        except pymysql.err.IntegrityError as e:
            # tabla de UNA fila por banda: si choca, lo convertimos en UPDATE (es un "cambiar", no "agregar")
            if e.args[0] == 1062 and t in _ONE_PER_BAND:
                b = vals.get("band_id") or bid
                upd = {k: v for k, v in vals.items() if k != "band_id"}
                sets = ",".join(f"`{c}`=%s" for c in upd)
                cur.execute(f"UPDATE `{t}` SET {sets} WHERE band_id=%s", [*upd.values(), b])
            else:
                raise
    elif op["op"] == "update":
        wh = op["where"]; sets = ",".join(f"`{c}`=%s" for c in vals); whs = " AND ".join(f"`{c}`=%s" for c in wh)
        cur.execute(f"UPDATE `{t}` SET {sets} WHERE {whs}", [*vals.values(), *wh.values()])
    elif op["op"] == "delete":
        wh = op["where"]; whs = " AND ".join(f"`{c}`=%s" for c in wh)
        cur.execute(f"DELETE FROM `{t}` WHERE {whs}", list(wh.values()))


def _smoke():
    """15 combos válidas resuelven con etapas clave no vacías -> True."""
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    db = motor_prompt.MotorDB(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                              password=settings.DB_PASSWORD, database=settings.DB_NAME, ssl=ctx)
    try:
        bands = db.q("SELECT code, max_level_order FROM age_band ORDER BY band_id")
        levels = db.q("SELECT level_code, sort_order FROM `level` ORDER BY sort_order")
        req = ("tutor_identity", "pedagogical_framework", "behavioral_guards", "lesson_objectives", "execution_trigger")
        for b in bands:
            for lv in levels:
                if lv["sort_order"] > b["max_level_order"]:
                    continue
                try:
                    p = motor_prompt.render_prompt(motor_prompt.build_stack_params(db, b["code"], lv["level_code"], None, None, None))
                except Exception as e:
                    print(f"   smoke FAIL {b['code']} {lv['level_code']}: {e}"); return False
                inner = re.sub(r"</?system_instruction_stack>", "", p)
                for tag in req:
                    m = re.search(rf"<{tag}>([\s\S]*?)</{tag}>", inner)
                    if not m or len(m.group(1).strip()) < 10:
                        print(f"   smoke FAIL {b['code']} {lv['level_code']}: <{tag}> vacío"); return False
        return True
    finally:
        db.conn.close()


async def main():
    conn = _connect(); cur = conn.cursor()
    cur.execute("SELECT proposal_id, level_code, band_code, scope, area, action, current_value, proposed_value FROM catalog_proposal WHERE status='proposed'")
    props = cur.fetchall()
    groups: dict = {}
    for p in props:
        groups.setdefault((p["level_code"], p["band_code"]), []).append(p)
    colcache = {}
    applied = skipped = 0
    for (level_code, band_code), gp in groups.items():
        label = f"nivel {level_code}" if level_code else f"edad {band_code}"
        context, bid, pg = _context_for(cur, level_code, band_code)
        prompt = PROMPT.format(schema=SCHEMA, scope_label=label, context=context,
                               proposals=json.dumps([{k: p[k] for k in ("scope", "area", "action", "current_value", "proposed_value")} for p in gp], ensure_ascii=False))
        raw = await mp._run_llm(prompt, "claude")
        ops = (mp._parse_json(raw or "") or {}).get("ops", [])
        for op in ops:
            if _valid_op(cur, op, colcache):
                try:
                    _exec_op(cur, op, bid, pg); applied += 1
                except Exception as e:
                    print(f"   op falló ({op.get('table')}/{op.get('op')}): {str(e)[:90]}"); skipped += 1
            else:
                skipped += 1
        print(f"  {label}: {len(ops)} ops propuestas")
    print(f"\nTOTAL: {applied} aplicadas, {skipped} descartadas/falladas. Corriendo smoke...")
    if _smoke():
        cur.execute("UPDATE catalog_proposal SET status='adopted' WHERE status='proposed'")
        conn.commit()
        print("SMOKE OK -> COMMIT. Propuestas adoptadas. (rollback: snapshot_catalog.py restore 1)")
    else:
        conn.rollback()
        cur.close(); conn.close()
        print("SMOKE FALLÓ -> ROLLBACK de la transacción. Restaurando snapshot 1 por las dudas...")
        restore(1)
        return
    cur.close(); conn.close()


if __name__ == "__main__":
    asyncio.run(main())

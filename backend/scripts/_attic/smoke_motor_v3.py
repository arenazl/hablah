"""Smoke test integral del motor v3: resuelve TODAS las combos edad x nivel y
chequea invariantes estructurales de las 9 etapas. No juzga pedagogía (esa es la
vara del profe); juzga que el ensamblado esté COMPLETO y COHERENTE por nivel.

Salida: por combo PASS/FAIL + lista de problemas + resumen. Exit 0 si todo PASA.
"""
from __future__ import annotations
import os
import re
import ssl
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

_HERE = os.path.dirname(__file__)
for _p in (os.path.normpath(os.path.join(_HERE, "..", "..", "Motor-Learning")),
           os.path.normpath(os.path.join(_HERE, "..", "motor_core"))):
    if os.path.exists(os.path.join(_p, "motor_prompt.py")):
        sys.path.insert(0, _p)
        break
import motor_prompt  # noqa: E402


def _db():
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    return motor_prompt.MotorDB(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                                password=settings.DB_PASSWORD, database=settings.DB_NAME, ssl=ctx)


# tags que SIEMPRE deben venir con contenido sustantivo (no [vacío])
REQUIRED = {
    "runtime_context": 20, "tutor_identity": 10, "pedagogical_framework": 20,
    "behavioral_guards": 20, "lesson_objectives": 10, "narrative_spine": 10,
    "execution_trigger": 10,
}


def _blocks(prompt: str) -> dict:
    inner = re.sub(r"</?system_instruction_stack>", "", prompt)  # sacar el wrapper o se traga todo
    out = {}
    for m in re.finditer(r"<([a-z_]+)>([\s\S]*?)</\1>", inner):
        out[m.group(1)] = m.group(2).strip()
    return out


def check(db, band: str, level: str) -> list[str]:
    issues = []
    try:
        stack = motor_prompt.build_stack_params(db, band, level, None, None, None)
        prompt = motor_prompt.render_prompt(stack)
    except Exception as e:
        return [f"resolve EXPLOTO: {type(e).__name__}: {e}"]
    blocks = _blocks(prompt)
    for tag, minlen in REQUIRED.items():
        body = blocks.get(tag, "")
        if not body or body == "(vacío)":
            issues.append(f"falta/vacío <{tag}>")
        elif len(body) < minlen:
            issues.append(f"<{tag}> muy corto ({len(body)} chars)")
    # invariantes de meta
    ns = stack.get("narrative_spine", {})
    if not ns.get("phases"):
        issues.append("sin fases (narrative_spine.phases)")
    if (ns.get("target_min") or 0) <= 0:
        issues.append("pacing <= 0")
    if not stack.get("lesson_objectives"):
        issues.append("0 objetivos en el nivel")
    # rieles: tiene que haber por-edad Y por-nivel
    bg = blocks.get("behavioral_guards", "")
    if "Rule" not in bg and len(bg) < 40:
        issues.append("behavioral_guards sin reglas reales")
    return issues


def main() -> None:
    db = _db()
    bands = db.q("SELECT code, max_level_order FROM age_band ORDER BY band_id")
    levels = db.q("SELECT level_code, sort_order FROM `level` ORDER BY sort_order")
    total = ok = 0
    fails = []
    print("SMOKE motor v3 — solo combos VÁLIDOS por edad (tope de nivel)\n")
    for bd in bands:
        b = bd["code"]
        for lvl in levels:
            if lvl["sort_order"] > bd["max_level_order"]:
                continue  # nivel fuera del rango de esa edad (no se ofrece)
            lv = lvl["level_code"]
            total += 1
            issues = check(db, b, lv)
            if issues:
                fails.append((b, lv, issues))
                print(f"  FAIL {b:12} {lv}  -> {'; '.join(issues)}")
            else:
                ok += 1
                print(f"  ok   {b:12} {lv}")
    print(f"\nRESUMEN: {ok}/{total} OK · {len(fails)} con problemas")
    db.conn.close()
    sys.exit(0 if not fails else 1)


if __name__ == "__main__":
    main()

"""Auditoría pedagógica del CATÁLOGO POR NIVEL (no tópicos): variables del nivel,
objetivos (lo que se aprende) y reglas. El especialista (Claude + SLA/CEFR) propone
mejoras con justificación; se PERSISTEN en catalog_proposal (status 'proposed', no
pisa lo vivo) y se arma un HTML comparativo (actual vs propuesto).
"""
from __future__ import annotations
import asyncio
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services import motor_engine, motor_protocol as mp  # noqa: E402

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "auditoria_niveles.html"))

PROMPT = """Sos un especialista en pedagogía de idiomas y adquisición de segundas lenguas (SLA),
auditando el CURRÍCULUM de inglés (alumno hispanohablante) para el nivel CEFR {level}.

Aplicá (no los nombres, usalos): CLT/TBLT (competencia comunicativa, tareas reales), Krashen
(input comprensible i+1, filtro afectivo), descriptores CEFR "can-do" del nivel, corrección por
evidencia (recast vs explícito). Pensá en el GRADIENTE: {level} respecto de los niveles vecinos.

ESTADO ACTUAL del nivel {level}:
- Variables: espejo_en_español={mirror} · profundidad_vocab={vocab} · pacing_bonus={pacing} min
  (descriptor: {modifier})
- Objetivos que se aprenden hoy:
{objectives}
- Reglas del nivel (corrección/ayuda):
{policies}

Auditá con criterio profesional:
1. ¿Los objetivos cubren las funciones comunicativas + gramática + discurso CLAVE del nivel CEFR {level}? ¿Qué FALTA? ¿Algo sobra o está mal ubicado?
2. ¿El gradiente español/vocab/pacing es apropiado para {level}?
3. ¿Las reglas de corrección/ayuda son las correctas para {level} según la evidencia?

Devolvé SOLO un JSON (sin prosa):
{{"proposals":[{{"scope":"objective|level_var|level_policy","area":"texto corto","action":"add|change|remove|keep","current":"qué hay hoy (o '-')","proposed":"qué proponés","rationale":"por qué, basado en evidencia/CEFR"}}]}}
Incluí solo cambios con VALOR real (máx ~6). Usá 'keep' solo para destacar algo bien hecho."""


def _fmt_objs(rows):
    return "\n".join(f"  - ({r['kind']}) {r['description']}" for r in rows) or "  (ninguno)"


def _fmt_pol(rows):
    return "\n".join(f"  - {r['kind']}: {r['body']}" for r in rows) or "  (ninguna)"


async def audit_level(lv: dict) -> dict:
    db = motor_engine._connect()
    try:
        objs = db.q("SELECT kind, description FROM language_objective WHERE cefr_level=%s ORDER BY sort_order", (lv["level_code"],))
        pol = db.q("SELECT kind, body FROM level_policy WHERE level_code=%s", (lv["level_code"],))
    finally:
        db.conn.close()
    prompt = PROMPT.format(level=lv["level_code"], mirror=lv["spanish_mirror"], vocab=lv["vocab_depth"],
                           pacing=lv["pacing_bonus_min"], modifier=lv["modifier"],
                           objectives=_fmt_objs(objs), policies=_fmt_pol(pol))
    raw = await mp._run_llm(prompt, "claude")
    parsed = mp._parse_json(raw or "") or {}
    props = parsed.get("proposals", [])
    return {"level": lv, "objs": objs, "pol": pol, "props": props}


def _persist(results):
    db = motor_engine._connect()
    n = 0
    try:
        with db.conn.cursor() as cur:
            for r in results:
                for p in r["props"]:
                    sc = p.get("scope", "other")
                    if sc not in ("objective", "level_var", "level_policy", "other"):
                        sc = "other"
                    act = p.get("action", "change")
                    if act not in ("add", "change", "remove", "keep"):
                        act = "change"
                    cur.execute(
                        """INSERT INTO catalog_proposal (level_code, scope, area, action, current_value, proposed_value, rationale, status)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,'proposed')""",
                        (r["level"]["level_code"], sc, (p.get("area") or "")[:40], act,
                         (p.get("current") or "")[:500], (p.get("proposed") or "")[:500], (p.get("rationale") or "")[:600]))
                    n += 1
        db.conn.commit()
    finally:
        db.conn.close()
    return n


def build_html(results):
    css = """body{font-family:system-ui,Segoe UI,sans-serif;background:#0b0e14;color:#e6e8ec;margin:0;padding:24px;line-height:1.45}
    h1{font-size:23px;margin:0 0 4px}.sub{color:#9aa3af;font-size:13px;max-width:1000px;margin:0 0 22px}
    .lv{background:#11151d;border:1px solid #232936;border-radius:14px;padding:18px;margin-bottom:22px}
    .lvh{font-size:19px;margin:0 0 4px}.vars{color:#9aa3af;font-size:12.5px;margin-bottom:12px}
    .cur{font-size:12px;color:#7b8694;margin-bottom:14px;border-left:2px solid #2a3340;padding-left:10px}
    .cur b{color:#9aa3af}
    table{width:100%;border-collapse:collapse;font-size:12.5px}
    th{text-align:left;color:#6b7686;font-size:10px;text-transform:uppercase;letter-spacing:.5px;padding:6px 8px;border-bottom:1px solid #232936}
    td{padding:8px;border-bottom:1px solid #1a1f2a;vertical-align:top}
    .act{font-size:9px;font-weight:800;padding:2px 7px;border-radius:5px;white-space:nowrap}
    .add{background:rgba(34,197,94,.14);color:#22c55e}.change{background:rgba(251,191,36,.14);color:#fbbf24}
    .remove{background:rgba(248,113,113,.14);color:#f87171}.keep{background:#1c2230;color:#9aa3af}
    .prop{color:#e6e8ec}.rat{color:#8b95a3;font-size:11.5px;margin-top:3px}"""
    out = [f"<!doctype html><meta charset=utf-8><title>Auditoría pedagógica por nivel</title><style>{css}</style>"]
    out.append("<h1>Auditoría pedagógica del catálogo por nivel</h1>")
    out.append('<p class="sub">Especialista en SLA/CEFR auditando las variables, objetivos y reglas de CADA nivel '
               '(no los tópicos). Propuestas <b>persistidas</b> en catalog_proposal (status proposed) — adoptás las que quieras. '
               '<span style="color:#22c55e">agregar</span> · <span style="color:#fbbf24">cambiar</span> · '
               '<span style="color:#f87171">sacar</span> · <span style="color:#9aa3af">mantener</span></p>')
    AC = {"add": "agregar", "change": "cambiar", "remove": "sacar", "keep": "mantener"}
    for r in results:
        lv = r["level"]
        out.append('<div class="lv">')
        out.append(f'<h2 class="lvh">Nivel {lv["level_code"]} — {lv["label"]}</h2>')
        out.append(f'<div class="vars">español: {lv["spanish_mirror"]} · vocab: {lv["vocab_depth"]} · pacing +{lv["pacing_bonus_min"]}min</div>')
        cur_objs = ", ".join(f"{o['kind']}: {o['description']}" for o in r["objs"]) or "—"
        out.append(f'<div class="cur"><b>Objetivos hoy:</b> {html.escape(cur_objs)}</div>')
        out.append('<table><tr><th>acción</th><th>área</th><th>propuesta</th></tr>')
        for p in r["props"]:
            act = p.get("action", "change"); act = act if act in AC else "change"
            out.append('<tr>')
            out.append(f'<td><span class="act {act}">{AC[act]}</span></td>')
            out.append(f'<td>{html.escape(p.get("scope",""))}<br><span style="color:#7b8694">{html.escape(p.get("area",""))}</span></td>')
            cur = html.escape(p.get("current") or "—"); prop = html.escape(p.get("proposed") or "")
            out.append(f'<td><div class="prop"><span style="color:#7b8694">actual:</span> {cur}<br><span style="color:#22c55e">→</span> {prop}</div><div class="rat">{html.escape(p.get("rationale") or "")}</div></td>')
            out.append('</tr>')
        out.append('</table></div>')
    return "\n".join(out)


async def main():
    db = motor_engine._connect()
    levels = db.q("SELECT level_code, label, spanish_mirror, vocab_depth, pacing_bonus_min, modifier FROM `level` ORDER BY sort_order")
    db.conn.close()
    results = []
    for lv in levels:
        print(f"auditando {lv['level_code']} ...")
        results.append(await audit_level(lv))
    n = _persist(results)
    print(f"persistidas {n} propuestas en catalog_proposal")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(build_html(results))
    print("HTML:", OUT)


if __name__ == "__main__":
    asyncio.run(main())

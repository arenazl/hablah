"""Compara la orquestación ANTES (snapshot 1) vs DESPUÉS (catálogo aplicado) en las
15 combos válidas, etapa por etapa. Arma un HTML para ver qué cambió el especialista.

Snapshotea el estado actual (#2 = aplicado), restaura #1 para capturar el 'antes',
vuelve a #2 (deja el catálogo aplicado vivo), y diffea.
"""
from __future__ import annotations
import html
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
        sys.path.insert(0, _p); break
import motor_prompt  # noqa: E402
sys.path.insert(0, _HERE)
from snapshot_catalog import make_snapshot, restore  # noqa: E402

OUT = os.path.normpath(os.path.join(_HERE, "..", "..", "frontend", "dist", "comparacion", "index.html"))
TAGS = [("tutor_identity", "2 · Quién enseña"), ("pedagogical_framework", "3 · Cómo enseña"),
        ("behavioral_guards", "6 · Reglas"), ("lesson_objectives", "7 · Qué aprende"),
        ("execution_trigger", "9 · Arranque/cierre")]


def _db():
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    return motor_prompt.MotorDB(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                               password=settings.DB_PASSWORD, database=settings.DB_NAME, ssl=ctx)


def _blk(p, tag):
    inner = re.sub(r"</?system_instruction_stack>", "", p or "")
    m = re.search(rf"<{tag}>([\s\S]*?)</{tag}>", inner)
    return m.group(1).strip() if m else ""


def capture():
    db = _db()
    out = {}
    bands = db.q("SELECT code, max_level_order FROM age_band ORDER BY band_id")
    levels = db.q("SELECT level_code, sort_order FROM `level` ORDER BY sort_order")
    for b in bands:
        for lv in levels:
            if lv["sort_order"] > b["max_level_order"]:
                continue
            p = motor_prompt.render_prompt(motor_prompt.build_stack_params(db, b["code"], lv["level_code"], None, None, None))
            out[(b["code"], lv["level_code"])] = {t: _blk(p, t) for t, _ in TAGS}
    db.conn.close()
    return out


def build_html(antes, despues):
    css = """body{font-family:system-ui,Segoe UI,sans-serif;background:#0b0e14;color:#e6e8ec;margin:0;padding:22px;line-height:1.4}
    h1{font-size:22px;margin:0 0 4px}.sub{color:#9aa3af;font-size:13px;margin:0 0 18px}
    .combo{background:#11151d;border:1px solid #232936;border-radius:12px;padding:14px;margin-bottom:16px}
    .ch{font-size:16px;margin:0 0 10px}
    .et{margin:9px 0;border-top:1px solid #1a1f2a;padding-top:9px}
    .ett{font-size:10px;font-weight:800;color:#6b7686;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .a,.b{font-size:11.5px;white-space:pre-wrap;border-radius:8px;padding:8px;max-height:150px;overflow:auto}
    .a{background:#0b0e14;border:1px solid #232936;color:#7b8694}
    .b{background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.3);color:#cbd5e1}
    .vh{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
    .same{color:#3a4250;font-size:11px;font-style:italic;padding:6px}"""
    out = [f"<!doctype html><meta charset=utf-8><title>Comparación antes/después</title><style>{css}</style>"]
    out.append("<h1>Orquestación: antes vs después del especialista</h1>")
    out.append('<p class="sub">15 combos. <span style="color:#7b8694">Izquierda = ANTES (snapshot 1)</span> · '
               '<span style="color:#22c55e">Derecha = DESPUÉS (aplicado)</span>. Solo se muestran las etapas que cambiaron.</p>')
    for k in antes:
        b, lv = k
        diffs = [(t, title) for t, title in TAGS if antes[k].get(t, "") != despues.get(k, {}).get(t, "")]
        out.append('<div class="combo">')
        out.append(f'<h2 class="ch">{b} · {lv} <span style="color:#6b7686;font-size:12px">({len(diffs)} etapas cambiaron)</span></h2>')
        if not diffs:
            out.append('<div class="same">sin cambios</div>')
        for t, title in diffs:
            out.append(f'<div class="et"><div class="ett">{title}</div><div class="row">')
            out.append(f'<div class="a"><div class="vh">antes</div>{html.escape(antes[k].get(t,"") or "(vacío)")}</div>')
            out.append(f'<div class="b"><div class="vh">después</div>{html.escape(despues.get(k,{}).get(t,"") or "(vacío)")}</div>')
            out.append('</div></div>')
        out.append('</div>')
    return "\n".join(out)


def _persist(antes, despues):
    """Guarda la comparación como JSON en comparison_result (para servirla por API/React)."""
    import json
    rows = []
    for k in antes:
        b, lv = k
        etapas = [{"tag": t, "title": title, "antes": antes[k].get(t, ""), "despues": despues.get(k, {}).get(t, "")}
                  for t, title in TAGS if antes[k].get(t, "") != despues.get(k, {}).get(t, "")]
        rows.append({"band": b, "level": lv, "etapas": etapas})
    db = _db()
    with db.conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS comparison_result (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, data LONGTEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
        cur.execute("DELETE FROM comparison_result")  # solo la última
        cur.execute("INSERT INTO comparison_result (data) VALUES (%s)", (json.dumps(rows, ensure_ascii=False),))
    db.conn.commit(); db.conn.close()


def main():
    print("snapshot del estado aplicado (#2)...")
    sid2 = make_snapshot("post-aplicacion especialista")
    print("capturando DESPUÉS (aplicado)...")
    despues = capture()
    print("restaurando #1 para capturar ANTES...")
    restore(1)
    antes = capture()
    print(f"volviendo al estado aplicado (#{sid2})...")
    restore(sid2)
    _persist(antes, despues)
    changed = sum(1 for k in antes if any(antes[k].get(t) != despues.get(k, {}).get(t) for t, _ in TAGS))
    print(f"comparación persistida ({changed}/{len(antes)} combos con cambios)")


if __name__ == "__main__":
    main()

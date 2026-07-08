"""
Genera un HTML con todas las combinaciones (banda × nivel × tópico)
para revisión pedagógica. Si existen evaluaciones, muestra el score.
"""
from __future__ import annotations
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
import pymysql
from pymysql.cursors import DictCursor

EVAL_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "docs", "evaluaciones_lote")
)
OUT_FILE = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "docs", "combinaciones.html")
)

BAND_NAMES = {1: "Mini (4–7 años)", 2: "Junior (8–12 años)", 3: "Tween (13+ años)", 4: "Adulto (18+ años)"}
BAND_COLORS = {1: "#7c3aed", 2: "#2563eb", 3: "#0891b2", 4: "#059669"}


def get_conn():
    return pymysql.connect(
        host=os.environ["DB_HOST"], port=int(os.environ.get("DB_PORT", 3306)),
        user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"],
        db=os.environ["DB_NAME"], ssl={"ca": None}, cursorclass=DictCursor, charset="utf8mb4"
    )


def load_scores() -> dict:
    """Carga scores de evaluaciones existentes. Clave: (band_slug, level, topic_id)."""
    SLUG = {1: "mini", 2: "junior", 3: "teen", 4: "adult"}
    scores = {}
    if not os.path.exists(EVAL_DIR):
        return scores
    for fn in os.listdir(EVAL_DIR):
        if fn.startswith("_") or not fn.endswith("_eval.json"):
            continue
        try:
            d = json.load(open(os.path.join(EVAL_DIR, fn), encoding="utf-8"))
            key = (d.get("band"), d.get("nivel"), d.get("topic_id"))
            scores[key] = d.get("score_global")
        except Exception:
            pass
    return scores


def score_badge(score) -> str:
    if score is None:
        return '<span class="badge gray">-</span>'
    color = "#22c55e" if score >= 8 else ("#f59e0b" if score >= 6.5 else "#ef4444")
    return f'<span class="badge" style="background:{color}">{score:.1f}</span>'


def main():
    conn = get_conn()
    scores = load_scores()

    with conn.cursor() as cur:
        cur.execute("""
            SELECT tbl.band_id, tbl.level_code, tbl.topic_id,
                   t.title, t.segmento, t.audience,
                   st.name as band_name, st.slug as band_slug
            FROM topic_band_level tbl
            JOIN topics t ON t.id = tbl.topic_id
            JOIN student_types st ON st.id = tbl.band_id
            ORDER BY tbl.band_id, tbl.level_code, t.segmento, t.title
        """)
        rows = cur.fetchall()
    conn.close()

    # Organizar: band_id -> level_code -> list of topics
    data: dict[int, dict[str, list]] = {}
    for r in rows:
        b = r["band_id"]
        lv = r["level_code"]
        data.setdefault(b, {}).setdefault(lv, []).append(r)

    # Contar por banda
    totals = {b: sum(len(topics) for topics in levels.values()) for b, levels in data.items()}

    html_parts = ["""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Combinaciones tópico × banda × nivel</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f1117; color: #e2e8f0; padding: 24px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; color: #f8fafc; }
  .meta { font-size: 13px; color: #64748b; margin-bottom: 28px; }
  .band-section { margin-bottom: 40px; }
  .band-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .band-pill { font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; color: #fff; }
  .band-title { font-size: 17px; font-weight: 600; }
  .band-count { font-size: 13px; color: #64748b; }
  .levels { display: flex; flex-wrap: wrap; gap: 16px; }
  .level-box { background: #1e2130; border: 1px solid #2d3148; border-radius: 10px; padding: 14px; min-width: 220px; flex: 1; }
  .level-label { font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #94a3b8; margin-bottom: 10px; }
  .topic-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #1a1e2e; font-size: 13px; }
  .topic-row:last-child { border-bottom: none; }
  .topic-name { flex: 1; }
  .seg-tag { font-size: 10px; padding: 1px 6px; border-radius: 10px; background: #334155; color: #94a3b8; }
  .seg-tag.mismatch { background: #7f1d1d; color: #fca5a5; }
  .badge { font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 10px; color: #fff; }
  .badge.gray { background: #334155; color: #64748b; }
  .summary { background: #1e2130; border: 1px solid #2d3148; border-radius: 10px; padding: 16px; margin-bottom: 28px; display: flex; gap: 24px; flex-wrap: wrap; }
  .sum-item { text-align: center; }
  .sum-num { font-size: 26px; font-weight: 800; color: #f8fafc; }
  .sum-label { font-size: 12px; color: #64748b; margin-top: 2px; }
  .warn { color: #f59e0b; font-size: 11px; margin-left: 4px; }
</style>
</head>
<body>
<h1>Combinaciones tópico × banda × nivel</h1>
<p class="meta">Generado desde topic_band_level. Los scores son del panel de 3 jueces (Juez1+Juez2+Juez3 / 3).</p>
"""]

    total_combos = sum(totals.values())
    evals_count = len(scores)
    html_parts.append(f"""
<div class="summary">
  <div class="sum-item"><div class="sum-num">{total_combos}</div><div class="sum-label">combinaciones totales</div></div>
  <div class="sum-item"><div class="sum-num">{evals_count}</div><div class="sum-label">evaluadas</div></div>
  <div class="sum-item"><div class="sum-num">{total_combos - evals_count}</div><div class="sum-label">pendientes</div></div>
  <div class="sum-item"><div class="sum-num">785</div><div class="sum-label">objetivo final</div></div>
</div>
""")

    SLUG_MAP = {1: "mini", 2: "junior", 3: "teen", 4: "adult"}

    for band_id in sorted(data.keys()):
        color = BAND_COLORS[band_id]
        bname = BAND_NAMES[band_id]
        slug = SLUG_MAP[band_id]
        total = totals[band_id]
        html_parts.append(f"""
<div class="band-section">
  <div class="band-header">
    <span class="band-pill" style="background:{color}">{slug.upper()}</span>
    <span class="band-title">{bname}</span>
    <span class="band-count">{total} combinaciones</span>
  </div>
  <div class="levels">
""")
        for level_code in sorted(data[band_id].keys()):
            topics = data[band_id][level_code]
            html_parts.append(f'<div class="level-box"><div class="level-label">{level_code}</div>')
            for t in topics:
                seg = t["segmento"] or t["audience"] or "?"
                tid = t["topic_id"]
                # Detectar mismatch: tópico de segmento distinto a la banda
                is_mismatch = (
                    (band_id == 1 and seg not in ("mini",)) or
                    (band_id == 2 and seg not in ("junior", "mini")) or
                    (band_id == 3 and seg not in ("teen", "junior")) or
                    (band_id == 4 and t["audience"] != "adult")
                )
                mismatch_class = " mismatch" if is_mismatch else ""
                mismatch_warn = '<span class="warn">⚠</span>' if is_mismatch else ""
                score = scores.get((slug, level_code, tid))
                badge = score_badge(score)
                title_esc = t["title"].replace("<", "&lt;").replace(">", "&gt;")
                html_parts.append(
                    f'<div class="topic-row">'
                    f'<span class="topic-name">{title_esc}{mismatch_warn}</span>'
                    f'<span class="seg-tag{mismatch_class}">{seg}</span>'
                    f'{badge}'
                    f'</div>'
                )
            html_parts.append("</div>")  # level-box
        html_parts.append("</div></div>")  # levels + band-section

    html_parts.append("</body></html>")

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(html_parts))

    print(f"HTML generado: {OUT_FILE}")
    print(f"Total combinaciones: {total_combos}")
    mismatches = sum(
        1 for r in rows
        if (r["band_id"] == 1 and r["segmento"] not in ("mini",))
        or (r["band_id"] == 2 and r["segmento"] not in ("junior", "mini"))
        or (r["band_id"] == 3 and r["segmento"] not in ("teen", "junior"))
        or (r["band_id"] == 4 and r["audience"] != "adult")
    )
    print(f"Topicos fuera de banda (marcados con triangulo): {mismatches}")


if __name__ == "__main__":
    main()

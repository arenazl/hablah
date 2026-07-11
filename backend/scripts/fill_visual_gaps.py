"""Rellena los huecos de la biblioteca visual kids (asset_file NULL/vacío) descargando
SVGs de Iconify (twemoji → fluent-emoji-flat → noto) UNA sola vez a
frontend/public/emoji-svg/ (first-party, mismo patrón existente) y actualizando la BD.

Uso: python scripts/fill_visual_gaps.py [--apply]   (sin --apply = dry-run)
"""
from __future__ import annotations
import os
import sys
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
import pymysql  # noqa: E402
from pymysql.cursors import DictCursor  # noqa: E402
from core.config import settings  # noqa: E402

APPLY = "--apply" in sys.argv
OUT_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "emoji-svg"))
PREFIXES = ["twemoji", "fluent-emoji-flat", "noto", "emojione", "openmoji", "streamline-emojis"]


def fetch_svg(word: str) -> str | None:
    name = word.lower().strip().replace(" ", "-").replace("_", "-")
    for prefix in PREFIXES:
        url = f"https://api.iconify.design/{prefix}/{name}.svg"
        try:
            # Iconify devuelve 403 al User-Agent default de Python -- header de browser.
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (hablah-asset-fill)"})
            with urllib.request.urlopen(req, timeout=10) as r:
                body = r.read().decode("utf-8", errors="replace")
                if r.status == 200 and body.lstrip().startswith("<svg"):
                    return body
        except Exception:
            continue
    return None


def main() -> None:
    conn = pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                           password=settings.DB_PASSWORD, database=settings.DB_NAME,
                           cursorclass=DictCursor, ssl={"ssl": True})
    cur = conn.cursor()
    cur.execute("SELECT id, word_en, word_es FROM kids_visual_vocab WHERE asset_file IS NULL OR asset_file = ''")
    rows = cur.fetchall()
    print(f"faltantes: {len(rows)}  (modo: {'APPLY' if APPLY else 'dry-run'})")
    os.makedirs(OUT_DIR, exist_ok=True)
    ok, miss = 0, []
    for r in rows:
        svg = fetch_svg(r["word_en"])
        if not svg:
            miss.append(r["word_en"])
            continue
        fname = r["word_en"].lower().strip().replace(" ", "-") + ".svg"
        rel = f"/emoji-svg/{fname}"
        if APPLY:
            with open(os.path.join(OUT_DIR, fname), "w", encoding="utf-8") as f:
                f.write(svg)
            cur.execute("UPDATE kids_visual_vocab SET asset_file=%s WHERE id=%s", (rel, r["id"]))
        ok += 1
        print(f"  OK {r['word_en']} -> {rel}")
    if APPLY:
        conn.commit()
    print(f"\nresueltas: {ok}/{len(rows)}  · sin icono en Iconify: {len(miss)}")
    if miss:
        print("sin match:", ", ".join(miss[:30]))
    conn.close()


if __name__ == "__main__":
    main()

"""Batch de descarga de imágenes para el vocab visual kids.

Fuente: Google Noto Animated Emoji (Lottie, licencia abierta). Por cada palabra de
kids_visual_vocab sin Lottie custom, intenta bajar el Lottie animado de Noto (mejor que
el emoji). Cobertura parcial: lo que Noto no animó queda con emoji (red de seguridad).

Guarda los Lottie en frontend/public/emoji-lottie/{slug}.json y setea asset_file.
"""
from __future__ import annotations
import json
import os
import re
import ssl
import sys
import urllib.request

import pymysql
from pymysql.cursors import DictCursor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from core.config import settings  # noqa: E402

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "emoji-lottie")
OUT_SVG = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "emoji-svg")
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE
BASE = "https://fonts.gstatic.com/s/e/notoemoji/latest/{}/lottie.json"
# 3ra fuente (fallback): Noto static SVG (mismo estilo que el Lottie animado, cobertura total)
SVG_BASE = "https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u{}.svg"


def slug(word: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", word.lower()).strip("-")


def codepoint_candidates(emoji: str) -> list[str]:
    cps = [f"{ord(c):04x}" for c in emoji]
    cand = []
    no_vs = [c for c in cps if c != "fe0f"]
    for seq in (no_vs, cps):
        s = "_".join(seq)
        if s and s not in cand:
            cand.append(s)
    return cand


def fetch_lottie(emoji: str) -> bytes | None:
    for cp in codepoint_candidates(emoji):
        try:
            data = urllib.request.urlopen(BASE.format(cp), context=CTX, timeout=20).read()
            obj = json.loads(data)
            if isinstance(obj, dict) and obj.get("layers"):
                return data
        except Exception:
            continue
    return None


def fetch_svg(emoji: str) -> bytes | None:
    for cp in codepoint_candidates(emoji):
        try:
            data = urllib.request.urlopen(SVG_BASE.format(cp), context=CTX, timeout=20).read()
            if b"<svg" in data[:600]:
                return data
        except Exception:
            continue
    return None


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(OUT_SVG, exist_ok=True)
    conn = pymysql.connect(host=settings.DB_HOST, port=settings.DB_PORT, user=settings.DB_USER,
                           password=settings.DB_PASSWORD, database=settings.DB_NAME, ssl=CTX,
                           cursorclass=DictCursor, charset="utf8mb4", autocommit=True)
    cur = conn.cursor()
    cur.execute("SET SESSION innodb_lock_wait_timeout=5")  # filas trabadas por el zombie: saltear, no colgar
    # incremental: solo las que aún no tienen asset (palabras nuevas del batch)
    cur.execute("SELECT word_en, emoji, asset_file FROM kids_visual_vocab WHERE asset_file IS NULL ORDER BY id")
    rows = cur.fetchall()
    lottie, svg, miss, kept, locked = [], [], [], [], []
    for r in rows:
        if r["asset_file"] and r["asset_file"].startswith("/animals/"):
            kept.append(r["word_en"]); continue  # Lottie custom, no tocar
        try:
            data = fetch_lottie(r["emoji"])
            if data:
                fn = f"{slug(r['word_en'])}.json"
                with open(os.path.join(OUT_DIR, fn), "wb") as f:
                    f.write(data)
                cur.execute("UPDATE kids_visual_vocab SET asset_file=%s WHERE word_en=%s",
                            (f"/emoji-lottie/{fn}", r["word_en"]))
                lottie.append(r["word_en"]); continue
            data = fetch_svg(r["emoji"])  # 3ra fuente: SVG estático de Noto
            if data:
                fn = f"{slug(r['word_en'])}.svg"
                with open(os.path.join(OUT_SVG, fn), "wb") as f:
                    f.write(data)
                cur.execute("UPDATE kids_visual_vocab SET asset_file=%s WHERE word_en=%s",
                            (f"/emoji-svg/{fn}", r["word_en"]))
                svg.append(r["word_en"])
            else:
                miss.append(r["word_en"])  # sin emoji/Noto: queda sin asset (gap, 4ta fuente después)
        except pymysql.err.OperationalError:
            locked.append(r["word_en"])  # fila trabada por el zombie; se recupera en otra corrida
    print(f"Lottie animado: {len(lottie)} (Noto) + {len(kept)} (custom) | SVG estático: {len(svg)} | sin emoji: {len(miss)} | trabados: {len(locked)}")
    print(f"procesadas: {len(lottie) + len(svg)}/{len(rows)} con imagen nueva")
    if miss:
        print("sin emoji (gap, 4ta fuente):", ", ".join(miss[:40]))
    cur.close(); conn.close()


if __name__ == "__main__":
    main()

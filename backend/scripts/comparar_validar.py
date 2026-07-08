"""Compara dos corridas del circuito de validación (mismo band/level, distinto tag) y muestra
el delta por historia y global. Sirve para decidir si un cambio MEJORÓ de verdad sobre 5 muestreos.

Uso: python scripts/comparar_validar.py <band> <level> <tagA> <tagB>
     (ej. ... early_child A1 baseline iter1)
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
OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "multi-llm-v3"))


def _load(band, level, tag):
    path = os.path.join(OUT, f"_validar_{band}_{level}_{tag}.json")
    if not os.path.exists(path):
        print(f"[falta] {path}"); return None
    return json.load(open(path, encoding="utf-8"))


def _fmt(v):
    return f"{v:.2f}" if isinstance(v, (int, float)) else "—"


def _delta(a, b):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        d = b - a
        return f"{'+' if d >= 0 else ''}{d:.2f}"
    return "—"


def main():
    band, level, ta, tb = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    A, B = _load(band, level, ta), _load(band, level, tb)
    if not A or not B:
        return
    print(f"=== {band} {level} · {ta} vs {tb} ===\n")
    nh = max(len(A["by_hist"]), len(B["by_hist"]))
    print("           " + "".join(f"h{c}".ljust(9) for c in range(nh)) + "GLOBAL")
    print(f"{ta:<10} " + "".join(_fmt(A['by_hist'][c] if c < len(A['by_hist']) else None).ljust(9) for c in range(nh)) + _fmt(A["overall"]))
    print(f"{tb:<10} " + "".join(_fmt(B['by_hist'][c] if c < len(B['by_hist']) else None).ljust(9) for c in range(nh)) + _fmt(B["overall"]))
    print(f"{'Δ':<10} " + "".join(_delta(A['by_hist'][c] if c < len(A['by_hist']) else None,
                                          B['by_hist'][c] if c < len(B['by_hist']) else None).ljust(9) for c in range(nh))
          + _delta(A["overall"], B["overall"]))
    d = (B["overall"] or 0) - (A["overall"] or 0)
    verdict = "MEJORÓ" if d >= 0.3 else ("REGRESÓ" if d <= -0.3 else "RUIDO (Δ<0.3, no concluyente)")
    print(f"\nVeredicto global: {verdict}  (Δ={d:+.2f} sobre {len(A['models'])} muestreos × {len(A['by_hist'])} historias)")


if __name__ == "__main__":
    main()
